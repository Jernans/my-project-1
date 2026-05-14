import { requireApiKey, json, onlyMethods } from '../_lib/auth.js';
import { getFallbackSenders } from '../_lib/senders.js';
import { verifySender } from '../_lib/mail.js';

export async function testSendersAction() {
  const senders = await getFallbackSenders({});
  const results = [];
  for (const sender of senders) {
    try {
      await verifySender(sender);
      results.push({ email: `${sender.email.slice(0, 2)}***@${sender.email.split('@')[1]}`, ok: true });
    } catch (err) {
      results.push({ email: `${sender.email.slice(0, 2)}***@${sender.email.split('@')[1]}`, ok: false, error: err.message });
    }
  }
  return { ok: true, results };
}

export default async function handler(req, res) {
  if (!onlyMethods(req, res, ['GET', 'POST'])) return;
  const auth = requireApiKey(req);
  if (!auth.ok) return json(res, auth.status, { ok: false, error: auth.error });
  return json(res, 200, await testSendersAction());
}
