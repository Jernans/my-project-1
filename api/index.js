import { json } from './_lib/auth.js';

export default async function handler(req, res) {
  return json(res, 200, {
    ok: true,
    name: 'KatsuStore API + Telegram Bot',
    endpoints: [
      'POST /api/telegram-webhook',
      'POST /api/setup-webhook',
      'POST /api/fix',
      'GET  /api/check-replies',
      'GET  /api/senders/list',
      'POST /api/senders/add',
      'POST /api/senders/set-active',
      'POST /api/senders/del',
      'GET  /api/senders/test',
      'GET  /api/stats'
    ]
  });
}
