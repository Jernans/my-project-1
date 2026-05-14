import { json } from './_lib/auth.js';

export default async function handler(req, res) {
  return json(res, 200, {
    ok: true,
    message: 'KatsuStore API Bot is online',
    endpoints: {
      home: '/api',
      health: '/api/health',
      telegramWebhook: '/api/telegram-webhook',
      setupWebhook: '/api/setup-webhook',
      fix: '/api/fix',
      checkReplies: '/api/check-replies'
    }
  });
}
