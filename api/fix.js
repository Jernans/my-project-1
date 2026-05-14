import { requireApiKey, json, onlyMethods, maskNumber } from './_lib/auth.js';
import { getBody } from './_lib/request.js';
import { normalizePhone, isValidE164 } from './_lib/phone.js';
import { buildWhatsAppSubject, buildWhatsAppBody } from './_lib/template.js';
import { getFallbackSenders, updateSender } from './_lib/senders.js';
import { sendTextMail } from './_lib/mail.js';
import { buildFixId, saveJob, incrStats } from './_lib/jobs.js';

export async function createFix(body) {
  const phone = normalizePhone(body.number || body.phone || body.nomor);
  if (!isValidE164(phone)) {
    const err = new Error('Invalid phone format. Use global format like +12025550123, +819012345678, +6581234567, +6281234567890');
    err.status = 400;
    throw err;
  }

  const telegramChatId = body.telegramChatId || body.telegram_chat_id || body.telegramUserId || body.telegram_user_id || null;
  const telegramUserId = body.telegramUserId || body.telegram_user_id || telegramChatId || null;
  if (!telegramChatId) {
    const err = new Error('Missing telegramChatId or telegramUserId');
    err.status = 400;
    throw err;
  }

  const subject = String(body.subject || '').trim() || buildWhatsAppSubject(phone);
  const text = String(body.body || body.text || '').trim() || buildWhatsAppBody(phone);
  const to = String(body.to || body.to_email || process.env.WHATSAPP_SUPPORT_EMAIL || 'support@support.whatsapp.com').trim();
  const fixId = buildFixId(body.fixPrefix || 'KATSU');

  const senders = await getFallbackSenders({ senderId: body.sender_id || body.senderId });
  if (!senders.length) throw new Error('No sender configured');

  const errors = [];
  for (let i = 0; i < senders.length; i++) {
    const sender = senders[i];
    try {
      const info = await sendTextMail({ sender, to, subject, text });
      const job = await saveJob({
        fixId,
        phone,
        maskedNumber: maskNumber(phone),
        toEmail: to,
        subject,
        text,
        telegramUserId,
        telegramChatId,
        username: body.username || null,
        displayName: body.displayName || body.display_name || null,
        senderEmail: sender.email,
        senderId: sender.id || null,
        senderSource: sender.source,
        outboundMessageId: info.messageId || null,
        status: 'sent'
      });

      return {
        ok: true,
        message: 'Fix email sent',
        fixId: job.fixId,
        status: job.status,
        phoneMasked: job.maskedNumber,
        senderEmailMasked: `${sender.email.slice(0, 2)}***@${sender.email.split('@')[1]}`,
        senderId: sender.id,
        senderSource: sender.source,
        messageId: info.messageId || null,
        fallbackUsed: i > 0,
        senderAttempt: i + 1,
        senderTotal: senders.length
      };
    } catch (err) {
      errors.push({ sender: `${sender.email.slice(0, 2)}***@${sender.email.split('@')[1]}`, error: err.message });
      if (sender.id) await updateSender(sender.id, { lastError: err.message, lastUsedAt: new Date().toISOString() });
    }
  }

  await incrStats('failed');
  const err = new Error('All senders failed');
  err.status = 500;
  err.details = errors;
  throw err;
}

export default async function handler(req, res) {
  if (!onlyMethods(req, res, ['POST'])) return;
  const auth = requireApiKey(req);
  if (!auth.ok) return json(res, auth.status, { ok: false, error: auth.error });

  let body;
  try { body = await getBody(req); }
  catch (err) { return json(res, 400, { ok: false, error: err.message }); }

  try {
    const result = await createFix(body);
    return json(res, 200, result);
  } catch (err) {
    return json(res, err.status || 500, { ok: false, error: err.message, errors: err.details || undefined });
  }
}
