import { json, method, auth } from '../_lib/http.js';
import { publicSenders, activeId } from '../_lib/senders.js';

export async function listSendersAction() {
  return { ok: true, active_sender_id: await activeId(), senders: await publicSenders() };
}

export default async function handler(req, res) {
  if (!method(req, res, ['GET'])) return;
  const a = auth(req);
  if (!a.ok) return json(res, a.status, { ok: false, error: a.error });
  return json(res, 200, await listSendersAction());
}
