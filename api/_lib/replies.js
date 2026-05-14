import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { getSenders } from './senders.js';
import { decryptIfNeeded } from './crypto.js';
import { extractPhones } from './phone.js';

function cleanText(value) { return String(value || '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim(); }
function htmlToText(html) {
  return cleanText(String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
}
export function parsedText(parsed) { return cleanText(parsed.text || '') || htmlToText(parsed.html || ''); }

export function isLikelyWhatsAppReply(item) {
  const from = String(item.from || '').toLowerCase();
  const subject = String(item.subject || '').toLowerCase();
  const text = String(item.text || '').toLowerCase();
  return from.includes('whatsapp') || subject.includes('whatsapp') || subject.includes('unable to login') || text.includes('whatsapp support') || text.includes('login not available right now');
}

export async function getInboxAccounts() {
  const accounts = [];
  for (const sender of await getSenders()) {
    if (sender.enabled === false) continue;
    try {
      accounts.push({ email: sender.email, appPass: decryptIfNeeded(sender.appPass).replace(/\s+/g, ''), senderId: sender.id, source: 'kv' });
    } catch {}
  }
  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    accounts.push({ email: process.env.GMAIL_USER, appPass: String(process.env.GMAIL_PASS).replace(/\s+/g, ''), senderId: null, source: 'env_default' });
  }
  const seen = new Set();
  return accounts.filter(acc => {
    const key = `${acc.email}:${acc.appPass}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function fetchRecentReplies(account, options = {}) {
  const max = Number(options.max || process.env.REPLY_SCAN_MAX || 25);
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: account.email, pass: account.appPass },
    connectionTimeout: Number(process.env.IMAP_CONNECTION_TIMEOUT_MS || 30000),
    logger: false
  });

  const items = [];
  try {
    await client.connect();
    await client.mailboxOpen('INBOX');
    const total = client.mailbox.exists || 0;
    if (!total) return [];
    const start = Math.max(1, total - max + 1);

    for await (const msg of client.fetch(`${start}:${total}`, { uid: true, envelope: true, source: true })) {
      const parsed = await simpleParser(msg.source);
      const text = parsedText(parsed);
      const subject = parsed.subject || msg.envelope?.subject || '';
      const from = parsed.from?.text || '';
      const messageId = parsed.messageId || msg.envelope?.messageId || `${account.email}:${msg.uid}`;
      const references = Array.isArray(parsed.references) ? parsed.references : parsed.references ? [parsed.references] : [];
      const full = `${from}\n${subject}\n${text}`;

      items.push({
        uid: msg.uid,
        inboxEmail: account.email,
        senderId: account.senderId,
        messageId,
        inReplyTo: parsed.inReplyTo || null,
        references,
        from,
        subject,
        date: parsed.date ? parsed.date.toISOString() : null,
        text,
        phones: extractPhones(full)
      });
    }
  } finally {
    try { await client.logout(); } catch {}
  }
  return items;
}
