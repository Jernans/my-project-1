import { requireApiKey, json, onlyMethods, maskEmail } from '../_lib/auth.js';
import { getBody } from '../_lib/request.js';
import { addSender, validateEmail, validateAppPass } from '../_lib/senders.js';

export async function addSenderAction(body) {
  const email = body.email;
  const appPass = body.app_password || body.appPass || body.pass || body.password;
  const label = body.label || null;

  if (!validateEmail(email)) {
    const err = new Error('Invalid email');
    err.status = 400;
    throw err;
  }
  if (!validateAppPass(appPass)) {
    const err = new Error('Invalid app password');
    err.status = 400;
    throw err;
  }

  const item = await addSender({ email, appPass, label });
  return { ok: true, id: item.id, email: maskEmail(item.email), note: process.env.MASTER_KEY ? 'stored_encrypted' : 'stored_plain_set_MASTER_KEY_to_encrypt' };
}

export default async function handler(req, res) {
  if (!onlyMethods(req, res, ['POST'])) return;
  const auth = requireApiKey(req);
  if (!auth.ok) return json(res, auth.status, { ok: false, error: auth.error });

  let body;
  try { body = await getBody(req); }
  catch (err) { return json(res, 400, { ok: false, error: err.message }); }

  try { return json(res, 200, await addSenderAction(body)); }
  catch (err) { return json(res, err.status || 400, { ok: false, error: err.message }); }
}
