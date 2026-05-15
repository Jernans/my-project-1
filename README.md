# KatsuStore Final Full Rebuild

Ini versi final full rebuild dari nol, bukan tester.

## Fitur

- Vercel Hobby-safe: total 12 API functions
- Telegram Bot Webhook
- Tombol bot:
  - Fix WhatsApp
  - Tambah Gmail
  - Hapus Gmail
  - List Gmail
  - Test Gmail
  - Stats
- API endpoint:
  - `/api/fix`
  - `/api/check-replies`
  - `/api/senders/add`
  - `/api/senders/list`
  - `/api/senders/del`
  - `/api/senders/set-active`
  - `/api/senders/test`
  - `/api/stats`
- Redis memakai `REDIS_URL`
- Button state tersimpan di Redis
- Limit user biasa 1x per 1 jam
- Admin unlimited
- Multi Gmail fallback
- App Password disimpan terenkripsi jika `MASTER_KEY` diisi
- Auto cek balasan via external cron
- Balasan WhatsApp dikirim ke Telegram sebagai `.txt`
- Nomor global/E.164 semua negara

## ENV wajib

```env
API_KEY=katsu_api_2026_secure
TELEGRAM_BOT_TOKEN=isi_token_bot
TELEGRAM_ADMIN_IDS=6117415855
PUBLIC_BASE_URL=https://domain.vercel.app
REDIS_URL=redis_url_dari_vercel
MASTER_KEY=katsu_master_secure
WHATSAPP_SUPPORT_EMAIL=support@support.whatsapp.com
SMTP_MODE=587
```

Opsional:

```env
TELEGRAM_WEBHOOK_SECRET=katsu_webhook_secure
STRICT_TELEGRAM_SECRET=false
NON_ADMIN_RESET_MS=3600000
REPLY_SCAN_MAX=25
PENDING_DAYS=7
```

## Setelah deploy

### Test health

```txt
https://DOMAIN/api/health
```

### Set webhook

```bash
curl -X POST "https://DOMAIN/api/setup-webhook?key=katsu_api_2026_secure"
```

Atau browser:

```txt
https://api.telegram.org/botTOKEN/setWebhook?url=https://DOMAIN/api/telegram-webhook
```

### Cron external

Pakai cron-job.org:

```txt
URL: https://DOMAIN/api/check-replies?key=katsu_api_2026_secure
Method: GET
Interval: 1-15 menit
```

## Catatan

Vercel Hobby tidak mendukung cron tiap menit dari `vercel.json`, jadi file `vercel.json` sengaja tidak dipakai.


## ProcessFix

Fix bug runtime Vercel:

`TypeError: Cannot read properties of undefined (reading 'TELEGRAM_WEBHOOK_SECRET')`

Penyebab:
- Ada function lokal bernama `process(...)`
- Nama itu menimpa global `process.env`
- Sudah diganti menjadi `processFlow(...)`
