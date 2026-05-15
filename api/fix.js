import { json, method, auth, body, maskEmail } from './_lib/http.js';
import { normalizePhone, validPhone } from './_lib/phone.js';
import { subject, message } from './_lib/template.js';
import { fallbackSenders, updateSender } from './_lib/senders.js';
import { sendMail } from './_lib/mail.js';
import { fixId, saveJob, stat } from './_lib/jobs.js';

export async function createFix(input) {
  const phone = normalizePhone(input.number || input.phone || input.nomor);
  if (!validPhone(phone)) throw Object.assign(new Error('Invalid phone format. Use +countrycodeNumber'), { status: 400 });

  const chatId = input.telegramChatId || input.telegram_chat_id || input.telegramUserId || input.telegram_user_id;
  if (!chatId) throw Object.assign(new Error('Missing telegramChatId'), { status: 400 });

  const to = input.to || process.env.WHATSAPP_SUPPORT_EMAIL || 'support@support.whatsapp.com';
  const subj = input.subject || subject(phone);
  const text = input.text || input.body || message(phone);
  const id = fixId();
  const senders = await fallbackSenders(input.senderId || input.sender_id);

  const errors = [];
  for (let i=0; i<senders.length; i++) {
    const s = senders[i];
    try {
      const info = await sendMail({ sender: s, to, subject: subj, text });
      const job = await saveJob({
        fixId: id,
        phone,
        telegramChatId: chatId,
        telegramUserId: input.telegramUserId || chatId,
        username: input.username || null,
        senderEmail: s.email,
        senderId: s.id,
        subject: subj,
        outboundMessageId: info.messageId || null
      });
      return { ok: true, fixId: id, phone, senderEmailMasked: maskEmail(s.email), senderAttempt: i+1, senderTotal: senders.length, job };
    } catch(e) {
      errors.push({ sender: maskEmail(s.email), error: e.message });
      if (s.id) await updateSender(s.id, { lastError: e.message, lastUsedAt: new Date().toISOString() });
    }
  }
  await stat('failed');
  throw Object.assign(new Error('All senders failed'), { status: 500, details: errors });
}

export default async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  const a = auth(req);
  if (!a.ok) return json(res, a.status, { ok: false, error: a.error });
  try {
    const b = await body(req);
    return json(res, 200, await createFix(b));
  } catch(e) {
    return json(res, e.status || 500, { ok: false, error: e.message, errors: e.details });
  }
}
