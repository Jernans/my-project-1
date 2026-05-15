import { json } from './_lib/http.js';

export default async function handler(req, res) {
  return json(res, 200, { ok: true, service: 'KatsuStore Final Full Rebuild' });
}
