import { kv } from './kv.js';
import { encrypt, decrypt } from './crypto.js';
import crypto from 'crypto';

const LIST = 'katsu:senders';
const ACTIVE = 'katsu:active_sender';

export async function allSenders() {
  const v = await kv.get(LIST);
  return Array.isArray(v) ? v : [];
}

async function save(list) { await kv.set(LIST, list); }

export async function activeId() { return await kv.get(ACTIVE); }
export async function setActive(id) { await kv.set(ACTIVE, String(id)); }

export async function addSender({ email, appPass, label }) {
  email = String(email || '').trim().toLowerCase();
  appPass = String(appPass || '').replace(/\s+/g, '');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email');
  if (appPass.length < 12) throw new Error('Invalid app password');

  const list = await allSenders();
  if (list.some(x => x.email === email)) throw new Error('Email already exists');

  const item = {
    id: crypto.randomBytes(6).toString('hex') + Date.now().toString(36),
    email,
    label: label || null,
    appPass: encrypt(appPass),
    enabled: true,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    lastError: null
  };

  list.push(item);
  await save(list);
  if (!(await activeId())) await setActive(item.id);
  return item;
}

export async function delSender(id) {
  const list = await allSenders();
  const next = list.filter(x => x.id !== String(id));
  if (next.length === list.length) return false;
  await save(next);
  if ((await activeId()) === String(id) && next[0]) await setActive(next[0].id);
  return true;
}

export async function updateSender(id, patch) {
  const list = await allSenders();
  const i = list.findIndex(x => x.id === String(id));
  if (i < 0) return null;
  list[i] = { ...list[i], ...patch };
  await save(list);
  return list[i];
}

export async function publicSenders() {
  const a = await activeId();
  return (await allSenders()).map(s => ({
    id: s.id,
    email: `${s.email.slice(0,2)}***@${s.email.split('@')[1]}`,
    label: s.label,
    enabled: s.enabled !== false,
    isActive: s.id === a,
    lastUsedAt: s.lastUsedAt,
    lastError: s.lastError
  }));
}

export async function fallbackSenders(senderId = null) {
  const list = (await allSenders()).filter(x => x.enabled !== false);
  const out = [];

  if (senderId) {
    const s = list.find(x => x.id === String(senderId));
    if (!s) throw new Error('sender_id not found');
    out.push(s);
  } else {
    const a = await activeId();
    const active = list.find(x => x.id === a);
    if (active) out.push(active);
    for (const s of list) if (!active || s.id !== active.id) out.push(s);
  }

  if (!out.length && process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    return [{ id: null, email: process.env.GMAIL_USER, appPass: process.env.GMAIL_PASS.replace(/\s+/g,''), source: 'env' }];
  }

  return out.map(s => ({
    id: s.id,
    email: s.email,
    appPass: decrypt(s.appPass).replace(/\s+/g, ''),
    source: 'redis'
  }));
}
