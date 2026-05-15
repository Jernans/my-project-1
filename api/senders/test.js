import { json, method, auth, maskEmail } from '../_lib/http.js';
import { fallbackSenders } from '../_lib/senders.js';
import { testSender } from '../_lib/mail.js';

export async function testSendersAction() {
  const results = [];
  for (const s of await fallbackSenders()) {
    try { await testSender(s); results.push({ email: maskEmail(s.email), ok: true }); }
    catch(e) { results.push({ email: maskEmail(s.email), ok: false, error: e.message }); }
  }
  return { ok: true, results };
}

export default async function handler(req, res) {
  if (!method(req, res, ['GET','POST'])) return;
  const a = auth(req);
  if (!a.ok) return json(res, a.status, { ok: false, error: a.error });
  return json(res, 200, await testSendersAction());
}
