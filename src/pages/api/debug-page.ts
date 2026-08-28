export const prerender = false;

import type { APIRoute } from 'astro';
import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from 'astro:env/server';

type PageDebugEvent = 'P1' | 'P2' | 'P3' | 'P4' | 'P-PAYMENT' | 'P-SUCCESS';

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

function telegramConfig() {
  return {
    token: TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '',
  };
}

async function telegramApi(method: string, payload: Record<string, unknown>) {
  const { token } = telegramConfig();
  if (!token) return { ok: false, skipped: 'telegram-env-missing' };
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { ok: response.ok, status: response.status };
}

async function sendPageEvent(event: PageDebugEvent) {
  const { chatId } = telegramConfig();
  if (!chatId) return { sent: false, skipped: 'telegram-env-missing' };
  const result = await telegramApi('sendMessage', {
    chat_id: chatId,
    text: event,
    disable_web_page_preview: true,
  });
  return result.ok ? { sent: true } : { sent: false, error: `telegram-${result.status || 'unknown'}` };
}

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON invalido' }, { status: 400 });
  }

  const event = String(body.event || '') as PageDebugEvent;
  const allowed = new Set<PageDebugEvent>(['P1', 'P2', 'P3', 'P4', 'P-PAYMENT', 'P-SUCCESS']);
  if (!allowed.has(event)) return json({ error: 'Evento page debug invalido' }, { status: 400 });

  console.info('[debug-page-api:body]', body);
  const telegram = await sendPageEvent(event);
  return json({ event, telegram });
};
