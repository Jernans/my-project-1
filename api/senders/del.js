import { requireApiKey, json, onlyMethods } from '../_lib/auth.js';
import { getBody } from '../_lib/request.js';
import { deleteSender } from '../_lib/senders.js';

export async function deleteSenderAction(body) {
  const id = String(body.id || body.sender_id || '').trim();
  if (!id) {
    const err = new Error('Missing id');
    err.status = 400;
    throw err;
  }
  const ok = await deleteSender(id);
  if (!ok) {
    const err = new Error('Sender not found');
    err.status = 404;
    throw err;
  }
  return { ok: true, deleted: true };
}

export default async function handler(req, res) {
  if (!onlyMethods(req, res, ['POST'])) return;
  const auth = requireApiKey(req);
  if (!auth.ok) return json(res, auth.status, { ok: false, error: auth.error });

  let body;
  try { body = await getBody(req); }
  catch (err) { return json(res, 400, { ok: false, error: err.message }); }

  try { return json(res, 200, await deleteSenderAction(body)); }
  catch (err) { return json(res, err.status || 500, { ok: false, error: err.message }); }
}
