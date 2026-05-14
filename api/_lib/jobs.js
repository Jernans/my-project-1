import { kv } from '@vercel/kv';
import crypto from 'crypto';
import { maskNumber } from './auth.js';

const JOB_PREFIX = 'katsustore:fixjob:';
const MSG_PREFIX = 'katsustore:fixmsg:';
const PENDING_SET = 'katsustore:pending_jobs';
const PROCESSED_SET = 'katsustore:processed_replies';
const STATS_KEY = 'katsustore:stats';

export function buildFixId(prefix = 'KATSU') {
  return `${prefix}${Date.now()}${crypto.randomInt(100000, 999999)}`;
}

export function normalizeMessageId(value) {
  return String(value || '').trim().replace(/[<>]/g, '').toLowerCase();
}

export function jobKey(id) { return `${JOB_PREFIX}${id}`; }
export function msgKey(messageId) { return `${MSG_PREFIX}${normalizeMessageId(messageId)}`; }

export async function saveJob(job) {
  const now = new Date().toISOString();
  const full = { status: 'sent', notified: false, createdAt: now, updatedAt: now, ...job, maskedNumber: job.maskedNumber || maskNumber(job.phone) };
  await kv.set(jobKey(full.fixId), full);
  await kv.sadd(PENDING_SET, full.fixId);
  if (full.outboundMessageId) await kv.set(msgKey(full.outboundMessageId), full.fixId);
  await incrStats('sent');
  return full;
}

export async function getJob(id) { return kv.get(jobKey(id)); }

export async function updateJob(id, patch) {
  const current = await getJob(id);
  if (!current) return null;
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await kv.set(jobKey(id), next);
  if (next.outboundMessageId) await kv.set(msgKey(next.outboundMessageId), next.fixId);
  if (['success', 'failed', 'replied'].includes(next.status)) await kv.srem(PENDING_SET, next.fixId);
  else await kv.sadd(PENDING_SET, next.fixId);
  return next;
}

export async function listPendingJobs() {
  const ids = await kv.smembers(PENDING_SET);
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const jobs = await Promise.all(ids.map(id => getJob(id)));
  const days = Number(process.env.PENDING_DAYS || 7);
  const minTime = Date.now() - days * 24 * 60 * 60 * 1000;
  return jobs.filter(job => job && new Date(job.createdAt).getTime() >= minTime);
}

export async function findJobByMessageId(messageId) {
  const id = await kv.get(msgKey(messageId));
  return id ? getJob(id) : null;
}

export async function isReplyProcessed(messageId) {
  const normalized = normalizeMessageId(messageId);
  if (!normalized) return false;
  return Boolean(await kv.sismember(PROCESSED_SET, normalized));
}

export async function markReplyProcessed(messageId) {
  const normalized = normalizeMessageId(messageId);
  if (normalized) await kv.sadd(PROCESSED_SET, normalized);
}

export function classifyReply(text) {
  const body = String(text || '').toLowerCase();
  const success = ['try again', 'you can log in again', 'restored', 'access has been restored', 'review completed', 'silakan coba lagi', 'coba lagi'];
  const failed = ['cannot restore', "can't restore", 'unable to restore', 'violated', 'not enough information', 'we cannot', 'ditolak', 'tidak dapat'];
  if (success.some(x => body.includes(x))) return 'success';
  if (failed.some(x => body.includes(x))) return 'failed';
  return 'replied';
}

export async function incrStats(key) {
  const current = await kv.get(STATS_KEY) || {};
  current[key] = Number(current[key] || 0) + 1;
  current.updatedAt = new Date().toISOString();
  await kv.set(STATS_KEY, current);
  return current;
}

export async function getStats() { return await kv.get(STATS_KEY) || {}; }
