import { requireApiKey, json, onlyMethods } from '../_lib/auth.js';
import { getBody } from '../_lib/request.js';
import { getSenderById, setActiveSenderId } from '../_lib/senders.js';

export default async function handler(req, res) {
  if (!onlyMethods(req, res, ['POST'])) return;
  const auth = requireApiKey(req);
  if (!auth.ok) return json(res, auth.status, { ok: false, error: auth.error });

  let body;
  try { body = await getBody(req); }
  catch (err) { return json(res, 400, { ok: false, error: err.message }); }

  const id = String(body.id || body.sender_id || '').trim();
  if (!id) return json(res, 400, { ok: false, error: 'Missing id' });
  const sender = await getSenderById(id);
  if (!sender) return json(res, 404, { ok: false, error: 'Sender not found' });
  if (sender.enabled === false) return json(res, 400, { ok: false, error: 'Sender is disabled' });
  await setActiveSenderId(id);
  return json(res, 200, { ok: true, active_sender_id: id });
}
