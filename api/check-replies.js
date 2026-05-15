import { json, method, auth, escapeHtml } from './_lib/http.js';
import { inboxAccounts, fetchInbox, isWa } from './_lib/replies.js';
import { pendingJobs, jobByMessage, processed, markProcessed, updateJob, classify, stat, msgId } from './_lib/jobs.js';
import { sendMsg, sendTxt } from './_lib/telegram.js';

function snippet(t) { return String(t || '').replace(/\s+/g, ' ').trim().slice(0, 700); }
function safe(s) { return String(s || 'reply').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80); }

async function match(item, jobs) {
  const refs = [item.inReplyTo, ...(item.references || [])].map(msgId).filter(Boolean);
  for (const r of refs) {
    const j = await jobByMessage(r);
    if (j) return j;
  }
  const phones = new Set(item.phones || []);
  for (const j of jobs) {
    if (j.senderEmail && item.inboxEmail && j.senderEmail.toLowerCase() !== item.inboxEmail.toLowerCase()) continue;
    if (phones.has(j.phone)) return j;
    if (item.subject?.includes(j.fixId) || item.text?.includes(j.fixId)) return j;
  }
  return null;
}

export default async function handler(req, res) {
  if (!method(req, res, ['GET','POST'])) return;
  const a = auth(req);
  if (!a.ok) return json(res, a.status, { ok: false, error: a.error });

  const accounts = await inboxAccounts();
  const jobs = await pendingJobs();
  const results = [];
  const errors = [];

  for (const acc of accounts) {
    try {
      for (const item of await fetchInbox(acc)) {
        if (!isWa(item)) continue;
        if (await processed(item.messageId)) continue;

        const job = await match(item, jobs);
        if (!job) continue;

        const status = classify(item.text);
        await updateJob(job.fixId, { status, repliedAt: new Date().toISOString(), replySubject: item.subject, replyFrom: item.from, replyMessageId: item.messageId, replySnippet: snippet(item.text) });
        await markProcessed(item.messageId);
        await stat('replied');

        const txt = `KatsuStore WhatsApp Reply

Fix ID: ${job.fixId}
Status: ${status}
Phone: ${job.phone}
Sender Gmail: ${job.senderEmail}
Inbox Gmail: ${item.inboxEmail}
From: ${item.from}
Date: ${item.date || ''}
Subject: ${item.subject}

==============================
EMAIL CONTENT
==============================

${item.text || ''}
`;
        const file = `KatsuStore_${job.fixId}_${safe(item.subject)}.txt`;

        if (job.telegramChatId) {
          await sendMsg(job.telegramChatId, `✅ <b>KatsuStore WhatsApp Reply</b>\n\nFix ID: <code>${escapeHtml(job.fixId)}</code>\nNomor: <code>${escapeHtml(job.phone)}</code>\nStatus: <b>${escapeHtml(status.toUpperCase())}</b>\n\n${escapeHtml(snippet(item.text))}`);
          await sendTxt(job.telegramChatId, file, txt, `KatsuStore reply ${job.fixId}`);
        }

        results.push({ fixId: job.fixId, status, inboxEmail: item.inboxEmail });
      }
    } catch(e) {
      errors.push({ email: acc.email, error: e.message });
    }
  }

  return json(res, errors.length ? 207 : 200, { ok: errors.length === 0, checkedAccounts: accounts.length, pendingJobs: jobs.length, results, errors });
}
