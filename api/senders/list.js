import { requireApiKey, json, onlyMethods } from '../_lib/auth.js';
import { getSenders, getActiveSenderId, publicSender } from '../_lib/senders.js';

export async function listSendersAction() {
  const senders = await getSenders();
  const activeId = await getActiveSenderId();
  return { ok: true, active_sender_id: activeId, senders: senders.map(s => publicSender(s, activeId)) };
}

export default async function handler(req, res) {
  if (!onlyMethods(req, res, ['GET'])) return;
  const auth = requireApiKey(req);
  if (!auth.ok) return json(res, auth.status, { ok: false, error: auth.error });
  return json(res, 200, await listSendersAction());
}
