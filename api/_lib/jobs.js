import { kv } from './kv.js';
import crypto from 'crypto';

const JOB = 'katsu:job:';
const MSG = 'katsu:msg:';
const PENDING = 'katsu:pending';
const PROCESSED = 'katsu:processed';
const STATS = 'katsu:stats';

export function fixId() { return 'KATSU' + Date.now() + crypto.randomInt(100000,999999); }
export function msgId(v) { return String(v || '').replace(/[<>]/g,'').trim().toLowerCase(); }
export function jobKey(id) { return JOB + id; }
export function msgKey(id) { return MSG + msgId(id); }

export async function stat(name) {
  const s = await kv.get(STATS) || {};
  s[name] = Number(s[name] || 0) + 1;
  s.updatedAt = new Date().toISOString();
  await kv.set(STATS, s);
  return s;
}

export async function stats() { return await kv.get(STATS) || {}; }

export async function saveJob(job) {
  const now = new Date().toISOString();
  const full = { status: 'sent', createdAt: now, updatedAt: now, ...job };
  await kv.set(jobKey(full.fixId), full);
  await kv.sadd(PENDING, full.fixId);
  if (full.outboundMessageId) await kv.set(msgKey(full.outboundMessageId), full.fixId);
  await stat('sent');
  return full;
}

export async function getJob(id) { return await kv.get(jobKey(id)); }

export async function updateJob(id, patch) {
  const cur = await getJob(id);
  if (!cur) return null;
  const next = { ...cur, ...patch, updatedAt: new Date().toISOString() };
  await kv.set(jobKey(id), next);
  if (['success','failed','replied'].includes(next.status)) await kv.srem(PENDING, id);
  else await kv.sadd(PENDING, id);
  return next;
}

export async function pendingJobs() {
  const ids = await kv.smembers(PENDING);
  const jobs = await Promise.all((ids || []).map(getJob));
  const days = Number(process.env.PENDING_DAYS || 7);
  const min = Date.now() - days * 86400000;
  return jobs.filter(j => j && new Date(j.createdAt).getTime() >= min);
}

export async function jobByMessage(messageId) {
  const id = await kv.get(msgKey(messageId));
  return id ? await getJob(id) : null;
}

export async function processed(id) { return await kv.sismember(PROCESSED, msgId(id)); }
export async function markProcessed(id) { await kv.sadd(PROCESSED, msgId(id)); }

export function classify(text) {
  const s = String(text || '').toLowerCase();
  if (['try again','restored','access has been restored','you can log in again','coba lagi'].some(x => s.includes(x))) return 'success';
  if (['cannot restore',"can't restore",'unable to restore','violated','we cannot','ditolak'].some(x => s.includes(x))) return 'failed';
  return 'replied';
}
