import { kv } from './kv.js';
const S = 'katsu:botstate:';
const L = 'katsu:limit:';

export async function getState(chat) { return await kv.get(S + chat); }
export async function setState(chat, state) { await kv.set(S + chat, { ...state, updatedAt: new Date().toISOString() }); }
export async function clearState(chat) { await kv.del(S + chat); }

export async function checkLimit(user, ms=3600000) {
  const last = Number(await kv.get(L + user) || 0);
  if (!last) return { ok: true, left: 0 };
  const diff = Date.now() - last;
  if (diff >= ms) return { ok: true, left: 0 };
  return { ok: false, left: ms - diff };
}
export async function markUse(user) { await kv.set(L + user, Date.now()); }
export function fmt(ms) {
  const s = Math.ceil(ms/1000);
  return `${Math.floor(s/60)} menit ${s%60} detik`;
}
