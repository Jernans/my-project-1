export async function tg(method, payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN env not set');

  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.ok === false) throw new Error(d.description || `Telegram ${method} failed`);
  return d;
}

export async function sendMsg(chatId, text, extra={}) {
  return tg('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra });
}

export async function sendTxt(chatId, filename, content, caption='') {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
  if (!token || !chatId) return { ok: false, skipped: true };

  const form = new FormData();
  form.append('chat_id', String(chatId));
  if (caption) form.append('caption', caption);
  form.append('document', new Blob([content], { type: 'text/plain;charset=utf-8' }), filename);

  const r = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: 'POST', body: form });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.ok === false) throw new Error(d.description || 'sendDocument failed');
  return d;
}


export async function getTelegramFile(fileId) {
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN env not set');

  const metaRes = await fetch(`https://api.telegram.org/bot${token}/getFile`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ file_id: fileId })
  });
  const meta = await metaRes.json().catch(() => ({}));
  if (!metaRes.ok || meta.ok === false) throw new Error(meta.description || 'getFile failed');

  const filePath = meta.result.file_path;
  const dataRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  if (!dataRes.ok) throw new Error('download Telegram file failed');

  const buf = Buffer.from(await dataRes.arrayBuffer());
  return { buffer: buf, filePath };
}
