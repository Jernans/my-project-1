import { json, method, auth, body } from '../_lib/http.js';
import { delSender } from '../_lib/senders.js';

export async function delSenderAction(input) {
  const id = input.id || input.sender_id;
  if (!id) throw Object.assign(new Error('Missing id'), { status: 400 });
  const ok = await delSender(id);
  if (!ok) throw Object.assign(new Error('Sender not found'), { status: 404 });
  return { ok: true, deleted: true };
}

export default async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  const a = auth(req);
  if (!a.ok) return json(res, a.status, { ok: false, error: a.error });
  try { return json(res, 200, await delSenderAction(await body(req))); }
  catch(e) { return json(res, e.status || 500, { ok: false, error: e.message }); }
}
