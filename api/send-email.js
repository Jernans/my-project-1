import { requireApiKey, json, onlyMethods } from './_lib/auth.js';
import { getBody } from './_lib/request.js';
import { getFallbackSenders } from './_lib/senders.js';
import { sendTextMail } from './_lib/mail.js';

export default async function handler(req, res) {
  if (!onlyMethods(req, res, ['POST'])) return;
  const auth = requireApiKey(req);
  if (!auth.ok) return json(res, auth.status, { ok: false, error: auth.error });

  let body;
  try { body = await getBody(req); }
  catch (err) { return json(res, 400, { ok: false, error: err.message }); }

  const to = String(body.to || body.to_email || '').trim();
  const subject = String(body.subject || '').trim();
  const text = String(body.text || body.body || '').trim();
  if (!to || !subject || !text) return json(res, 400, { ok: false, error: 'Missing to/subject/text' });

  const senders = await getFallbackSenders({ senderId: body.sender_id || body.senderId });
  const errors = [];
  for (let i = 0; i < senders.length; i++) {
    try {
      const info = await sendTextMail({ sender: senders[i], to, subject, text });
      return json(res, 200, { ok: true, message: 'Email sent', messageId: info.messageId || null, senderAttempt: i + 1, fallbackUsed: i > 0 });
    } catch (err) { errors.push(err.message); }
  }
  return json(res, 500, { ok: false, error: 'All senders failed', errors });
}
