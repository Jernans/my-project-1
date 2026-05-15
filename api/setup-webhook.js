import { json, method, auth, body } from './_lib/http.js';

export default async function handler(req, res) {
  if (!method(req, res, ['GET','POST'])) return;
  const a = auth(req);
  if (!a.ok) return json(res, a.status, { ok: false, error: a.error });

  let b = {};
  try { if (req.method === 'POST') b = await body(req); } catch {}
  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
  const base = String(b.baseUrl || process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');

  if (!token) return json(res, 500, { ok: false, error: 'TELEGRAM_BOT_TOKEN env not set' });
  if (!base) return json(res, 400, { ok: false, error: 'PUBLIC_BASE_URL env not set' });

  const payload = { url: `${base}/api/telegram-webhook`, drop_pending_updates: true, allowed_updates: ['message','edited_message'] };
  if (process.env.TELEGRAM_WEBHOOK_SECRET) payload.secret_token = process.env.TELEGRAM_WEBHOOK_SECRET;

  const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  const d = await r.json().catch(() => ({}));
  return json(res, r.ok ? 200 : 500, { ok: r.ok && d.ok !== false, telegram: d, webhookUrl: payload.url });
}
