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


## AppStyle Update

Perubahan:
- Subject default menjadi `Question about WhatsApp (Beta) for Android`.
- Body email mengikuti format report dari aplikasi WhatsApp.
- Support Info full tidak dirapikan/dipotong.
- Flow bot Fix WhatsApp:
  1. Kirim nomor
  2. Kirim Support Info full
  3. Upload `logs.zip` dan screenshot
  4. Ketik `KIRIM`
- Attachment dikirim via email ke WhatsApp support.


## WhatsApp App Template Update

Perubahan terbaru:
- Subject default: `Question about WhatsApp for Android`
- Body default memakai template bahasa Inggris yang sudah terbukti work.
- Support Info full dari aplikasi dikirim raw, tidak dirapikan, tidak dipotong.
- Attachment `logs.zip` dan screenshot tetap dikirim.
- Flow Telegram:
  1. Klik Fix WhatsApp
  2. Kirim nomor
  3. Kirim Support Info full
  4. Upload `logs.zip` dan screenshot
  5. Ketik `KIRIM`


## Support Info Base Update

Perubahan:
- Default Support Info memakai base milik user yang sudah terbukti work.
- Bot hanya mengganti:
  - `CCode:`
  - `pn:`
- Field lain seperti App, Build, Carrier, Model, Version, Diagnostic Codes, Context, dan useragent tetap dipertahankan.
- Jika user mengirim Support Info manual, bot tetap menjaga format raw dan hanya sync CCode/pn.


## Auto Support Info + Logs Update

Perubahan:
- User tidak perlu lagi mengirim Support Info.
- User tidak perlu lagi upload `logs.zip`.
- Bot otomatis memakai Support Info base milik owner.
- Bot otomatis attach `assets/logs.zip`.
- User cukup klik `Fix WhatsApp` lalu kirim nomor.
- Bot hanya mengganti `CCode:` dan `pn:` sesuai nomor user.
