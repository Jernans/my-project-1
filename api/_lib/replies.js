import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { allSenders } from './senders.js';
import { decrypt } from './crypto.js';
import { phonesFrom } from './phone.js';

function clean(s) { return String(s || '').replace(/\r/g,'').replace(/\n{3,}/g,'\n\n').trim(); }
function html(s) {
  return clean(String(s || '').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'));
}
export function bodyText(parsed) { return clean(parsed.text || '') || html(parsed.html || ''); }

export async function inboxAccounts() {
  const out = [];
  for (const s of await allSenders()) {
    if (s.enabled === false) continue;
    try { out.push({ email: s.email, pass: decrypt(s.appPass).replace(/\s+/g,''), id: s.id }); } catch {}
  }
  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) out.push({ email: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS.replace(/\s+/g,''), id: null });
  return out;
}

export function isWa(item) {
  const x = `${item.from}\n${item.subject}\n${item.text}`.toLowerCase();
  return x.includes('whatsapp') || x.includes('login not available');
}

export async function fetchInbox(account) {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: account.email, pass: account.pass },
    connectionTimeout: Number(process.env.IMAP_CONNECTION_TIMEOUT_MS || 30000),
    logger: false
  });

  const result = [];
  try {
    await client.connect();
    await client.mailboxOpen('INBOX');
    const total = client.mailbox.exists || 0;
    if (!total) return [];
    const max = Number(process.env.REPLY_SCAN_MAX || 25);
    const start = Math.max(1, total - max + 1);

    for await (const m of client.fetch(`${start}:${total}`, { uid: true, envelope: true, source: true })) {
      const p = await simpleParser(m.source);
      const text = bodyText(p);
      const subject = p.subject || m.envelope?.subject || '';
      const from = p.from?.text || '';
      result.push({
        inboxEmail: account.email,
        messageId: p.messageId || m.envelope?.messageId || `${account.email}:${m.uid}`,
        inReplyTo: p.inReplyTo || null,
        references: Array.isArray(p.references) ? p.references : p.references ? [p.references] : [],
        from, subject,
        date: p.date ? p.date.toISOString() : null,
        text,
        phones: phonesFrom(`${from}\n${subject}\n${text}`)
      });
    }
  } finally {
    try { await client.logout(); } catch {}
  }
  return result;
}
