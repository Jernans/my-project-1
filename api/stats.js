import { requireApiKey, json, onlyMethods } from './_lib/auth.js';
import { getStats, listPendingJobs } from './_lib/jobs.js';

export async function statsAction() {
  const stats = await getStats();
  const pending = await listPendingJobs();
  return {
    ok: true,
    stats,
    pendingCount: pending.length,
    pending: pending.slice(0, 20).map(job => ({
      fixId: job.fixId,
      status: job.status,
      phoneMasked: job.maskedNumber,
      senderEmail: job.senderEmail ? `${job.senderEmail.slice(0, 2)}***@${job.senderEmail.split('@')[1]}` : null,
      createdAt: job.createdAt
    }))
  };
}

export default async function handler(req, res) {
  if (!onlyMethods(req, res, ['GET'])) return;
  const auth = requireApiKey(req);
  if (!auth.ok) return json(res, auth.status, { ok: false, error: auth.error });
  return json(res, 200, await statsAction());
}
