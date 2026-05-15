import { json, method, auth } from './_lib/http.js';
import { stats, pendingJobs } from './_lib/jobs.js';

export async function statsAction() {
  const p = await pendingJobs();
  return { ok: true, stats: await stats(), pendingCount: p.length, pending: p.slice(0,20).map(j => ({ fixId: j.fixId, phone: j.phone, status: j.status, createdAt: j.createdAt })) };
}

export default async function handler(req, res) {
  if (!method(req, res, ['GET'])) return;
  const a = auth(req);
  if (!a.ok) return json(res, a.status, { ok: false, error: a.error });
  return json(res, 200, await statsAction());
}
