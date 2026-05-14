function botToken() {
  return process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';
}

export async function telegram(method, payload) {
  const token = botToken();
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN env not set');

  const resp = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data.ok === false) throw new Error(data.description || `Telegram ${method} failed ${resp.status}`);
  return data;
}

export async function sendTelegramMessage(chatId, text, extra = {}) {
  const token = botToken();
  if (!token || !chatId) return { ok: false, skipped: true };
  return telegram('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra });
}

export async function sendTelegramTxt(chatId, filename, content, caption = '') {
  const token = botToken();
  if (!token || !chatId) return { ok: false, skipped: true };

  const form = new FormData();
  form.append('chat_id', String(chatId));
  if (caption) form.append('caption', caption);
  form.append('document', new Blob([content], { type: 'text/plain;charset=utf-8' }), filename);

  const resp = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: 'POST', body: form });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data.ok === false) throw new Error(data.description || `Telegram sendDocument failed ${resp.status}`);
  return data;
}

export function escapeHtml(value) {
  return String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
