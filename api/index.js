import { json } from './_lib/http.js';

export default async function handler(req, res) {
  return json(res, 200, {
    ok: true,
    name: 'KatsuStore Final Full Rebuild',
    endpoints: [
      '/api/health',
      '/api/telegram-webhook',
      '/api/setup-webhook',
      '/api/fix',
      '/api/check-replies',
      '/api/stats',
      '/api/senders/add',
      '/api/senders/list',
      '/api/senders/del',
      '/api/senders/set-active',
      '/api/senders/test'
    ]
  });
}
