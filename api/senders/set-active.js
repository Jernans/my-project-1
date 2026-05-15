import { json, method, auth, body } from '../_lib/http.js';
import { setActive, allSenders } from '../_lib/senders.js';

export default async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  const a = auth(req);
  if (!a.ok) return json(res, a.status, { ok: false, error: a.error });
  const b = await body(req);
  const id = b.id || b.sender_id;
  const list = await allSenders();
  if (!list.some(x => x.id === id)) return json(res, 404, { ok: false, error: 'Sender not found' });
  await setActive(id);
  return json(res, 200, { ok: true, active_sender_id: id });
}
