import { json, method, auth, body, maskEmail } from '../_lib/http.js';
import { addSender } from '../_lib/senders.js';

export async function addSenderAction(input) {
  const item = await addSender({ email: input.email, appPass: input.app_password || input.appPass || input.password || input.pass, label: input.label });
  return { ok: true, id: item.id, email: maskEmail(item.email) };
}

export default async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  const a = auth(req);
  if (!a.ok) return json(res, a.status, { ok: false, error: a.error });
  try { return json(res, 200, await addSenderAction(await body(req))); }
  catch(e) { return json(res, 400, { ok: false, error: e.message }); }
}
