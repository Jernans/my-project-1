import { json, onlyMethods, requireCronOrApiKey } from './_lib/auth.js';
import { fetchRecentReplies, getInboxAccounts, isLikelyWhatsAppReply } from './_lib/replies.js';
import { findJobByMessageId, listPendingJobs, updateJob, isReplyProcessed, markReplyProcessed, classifyReply, incrStats, normalizeMessageId } from './_lib/jobs.js';
import { sendTelegramMessage, sendTelegramTxt, escapeHtml } from './_lib/telegram.js';

function textSnippet(text, limit = 700) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}
function filenameSafe(value) {
  return String(value || 'reply').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 90);
}
function refList(item) {
  const refs = [];
  if (item.inReplyTo) refs.push(item.inReplyTo);
  for (const r of item.references || []) refs.push(r);
  return refs.map(normalizeMessageId).filter(Boolean);
}

async function matchJob(item, pendingJobs) {
  for (const ref of refList(item)) {
    const byMsg = await findJobByMessageId(ref);
    if (byMsg) return byMsg;
  }

  const itemPhones = new Set(item.phones || []);
  for (const job of pendingJobs) {
    if (job.senderEmail && item.inboxEmail && String(job.senderEmail).toLowerCase() !== String(item.inboxEmail).toLowerCase()) continue;
    if (itemPhones.has(job.phone)) return job;
    if ((item.subject && job.fixId && item.subject.includes(job.fixId)) || (item.text && job.fixId && item.text.includes(job.fixId))) return job;
  }
  return null;
}

export default async function handler(req, res) {
  if (!onlyMethods(req, res, ['GET', 'POST'])) return;
  const auth = requireCronOrApiKey(req);
  if (!auth.ok) return json(res, auth.status, { ok: false, error: auth.error });

  const accounts = await getInboxAccounts();
  const pendingJobs = await listPendingJobs();
  const results = [];
  const errors = [];

  for (const account of accounts) {
    try {
      const replies = await fetchRecentReplies(account);
      for (const item of replies) {
        if (!isLikelyWhatsAppReply(item)) continue;
        if (await isReplyProcessed(item.messageId)) continue;

        const job = await matchJob(item, pendingJobs);
        if (!job) continue;

        const status = classifyReply(item.text);
        const replyAt = new Date().toISOString();
        const snippet = textSnippet(item.text);
        const filename = `KatsuStore_${job.fixId}_${filenameSafe(item.subject)}.txt`;

        const txt = `KatsuStore WhatsApp Reply

Fix ID: ${job.fixId}
Status: ${status}
Phone: ${job.phone}
Masked Phone: ${job.maskedNumber || ''}
Sender Gmail: ${job.senderEmail || ''}
Inbox Gmail: ${item.inboxEmail}
From: ${item.from || ''}
Date: ${item.date || replyAt}
Subject: ${item.subject || ''}

==============================
EMAIL CONTENT
==============================

${item.text || ''}
`;

        const updated = await updateJob(job.fixId, {
          status,
          repliedAt: replyAt,
          replyFrom: item.from || null,
          replySubject: item.subject || null,
          replyDate: item.date || null,
          replySnippet: snippet,
          replyMessageId: item.messageId || null,
          notified: true
        });

        await markReplyProcessed(item.messageId);
        await incrStats('replied');

        let telegram = { ok: false, skipped: true };
        let document = { ok: false, skipped: true };

        if (job.telegramChatId) {
          const msg = [
            `✅ <b>KatsuStore WhatsApp Reply</b>`,
            '',
            `Fix ID: <code>${escapeHtml(job.fixId)}</code>`,
            `Nomor: <code>${escapeHtml(job.phone)}</code>`,
            `Status: <b>${escapeHtml(status.toUpperCase())}</b>`,
            item.from ? `From: ${escapeHtml(item.from)}` : '',
            '',
            snippet ? `<b>Preview:</b>\n${escapeHtml(snippet)}` : ''
          ].filter(Boolean).join('\n');

          telegram = await sendTelegramMessage(job.telegramChatId, msg);
          document = await sendTelegramTxt(job.telegramChatId, filename, txt, `KatsuStore reply ${job.fixId}`);
        }

        results.push({
          fixId: job.fixId,
          status,
          phoneMasked: updated?.maskedNumber || job.maskedNumber,
          inboxEmail: item.inboxEmail,
          telegramSent: telegram?.ok !== false,
          txtSent: document?.ok !== false
        });
      }
    } catch (err) {
      errors.push({ email: account.email, error: err.message });
    }
  }

  return json(res, errors.length ? 207 : 200, { ok: errors.length === 0, auth: auth.via, checkedAccounts: accounts.length, pendingJobs: pendingJobs.length, results, errors });
}
