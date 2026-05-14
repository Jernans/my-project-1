import { json, onlyMethods, requireApiKey } from './_lib/auth.js';
import { getBody } from './_lib/request.js';

export default async function handler(req, res) {
  if (!onlyMethods(req, res, ['POST'])) return;

  const auth = requireApiKey(req);
  if (!auth.ok) return json(res, auth.status, { ok: false, error: auth.error });

  const token = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
  if (!token) return json(res, 500, { ok: false, error: 'TELEGRAM_BOT_TOKEN env not set' });

  let body;
  try { body = await getBody(req); }
  catch { body = {}; }

  const baseUrl = String(body.baseUrl || body.base_url || process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  if (!baseUrl) return json(res, 400, { ok: false, error: 'Missing baseUrl or PUBLIC_BASE_URL env' });

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || '';
  const webhookUrl = `${baseUrl}/api/telegram-webhook`;

  const payload = {
    url: webhookUrl,
    drop_pending_updates: true,
    allowed_updates: ['message', 'edited_message']
  };

  if (secret) payload.secret_token = secret;

  const resp = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await resp.json().catch(() => ({}));
  return json(res, resp.ok ? 200 : 500, { ok: resp.ok && data.ok !== false, webhookUrl, telegram: data });
}
