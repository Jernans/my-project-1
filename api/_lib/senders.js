import { kv } from '@vercel/kv';
import crypto from 'crypto';
import { encryptIfPossible, decryptIfNeeded } from './crypto.js';

const KEY_SENDERS = 'katsustore:senders';
const KEY_ACTIVE = 'katsustore:active_sender_id';

export async function getSenders() {
  const list = await kv.get(KEY_SENDERS);
  return Array.isArray(list) ? list : [];
}

export async function saveSenders(list) {
  await kv.set(KEY_SENDERS, list);
}

export async function getActiveSenderId() {
  const id = await kv.get(KEY_ACTIVE);
  return typeof id === 'string' ? id : null;
}

export async function setActiveSenderId(id) {
  if (!id) return kv.del(KEY_ACTIVE);
  await kv.set(KEY_ACTIVE, String(id));
}

export function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validateAppPass(pass) {
  return typeof pass === 'string' && pass.replace(/\s+/g, '').length >= 12;
}

export function newId() {
  return `${crypto.randomBytes(5).toString('hex')}${Date.now().toString(36)}`;
}

export async function addSender({ email, appPass, label }) {
  const list = await getSenders();
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (list.some(s => String(s.email || '').toLowerCase() === cleanEmail)) throw new Error('Sender email already exists');

  const item = {
    id: newId(),
    email: cleanEmail,
    label: String(label || '').trim() || null,
    appPass: encryptIfPossible(String(appPass || '').replace(/\s+/g, '')),
    enabled: true,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    lastError: null
  };

  list.push(item);
  await saveSenders(list);
  if (!(await getActiveSenderId())) await setActiveSenderId(item.id);
  return item;
}

export async function deleteSender(id) {
  const list = await getSenders();
  const next = list.filter(s => s.id !== String(id));
  if (next.length === list.length) return false;
  await saveSenders(next);
  const active = await getActiveSenderId();
  if (active === String(id)) await setActiveSenderId(next[0]?.id || null);
  return true;
}

export async function updateSender(id, patch) {
  const list = await getSenders();
  const idx = list.findIndex(s => s.id === String(id));
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...patch };
  await saveSenders(list);
  return list[idx];
}

export async function getSenderById(id) {
  const list = await getSenders();
  return list.find(s => s.id === String(id)) || null;
}

export function publicSender(sender, activeId = null) {
  return {
    id: sender.id,
    email: sender.email ? `${sender.email.slice(0, 2)}***@${sender.email.split('@')[1]}` : '***',
    label: sender.label || null,
    enabled: sender.enabled !== false,
    createdAt: sender.createdAt,
    lastUsedAt: sender.lastUsedAt || null,
    lastError: sender.lastError || null,
    isActive: activeId ? sender.id === activeId : false
  };
}

export async function getFallbackSenders(options = {}) {
  const list = await getSenders();
  const result = [];

  if (options.senderId) {
    const selected = list.find(s => s.id === String(options.senderId) && s.enabled !== false);
    if (!selected) throw new Error('sender_id not found or disabled');
    result.push(selected);
  } else {
    const activeId = await getActiveSenderId();
    const active = activeId ? list.find(s => s.id === activeId && s.enabled !== false) : null;
    if (active) result.push(active);
    for (const item of list) {
      if (item.enabled === false) continue;
      if (active && item.id === active.id) continue;
      result.push(item);
    }
  }

  if (result.length === 0 && process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    return [{ id: null, email: process.env.GMAIL_USER, appPass: process.env.GMAIL_PASS, source: 'env_default' }];
  }

  return result.map(item => ({
    id: item.id || null,
    email: item.email,
    appPass: item.source === 'env_default' ? String(item.appPass).replace(/\s+/g, '') : decryptIfNeeded(item.appPass).replace(/\s+/g, ''),
    source: item.source || (item.id ? 'kv_sender' : 'env_default')
  }));
}
