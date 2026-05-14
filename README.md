# KatsuStore API + Telegram Bot - One Deploy

Ini versi gabungan: **API + Telegram Bot** dalam 1 project Vercel.

## Isi fitur

- Telegram bot webhook, tidak perlu panel/VPS running bot.
- Tombol bot:
  - 🔧 Fix WhatsApp
  - ➕ Tambah Gmail
  - 🗑️ Hapus Gmail
  - 📧 List Gmail
  - 🧪 Test Gmail
  - 📊 Stats
- API endpoint tetap bisa dipakai dari website/panel/reseller.
- Multi Gmail fallback.
- Auto check reply via external cron gratis, misalnya cron-job.org tiap 1 menit.
- Reply WhatsApp dikirim ke Telegram sebagai pesan + file `.txt`.
- Nomor global/E.164: `+1`, `+81`, `+65`, `+62`, `+237`, dll.
- Data sender/job/stats disimpan di Vercel KV.
- App Password bisa terenkripsi dengan `MASTER_KEY`.

---

## Deploy Vercel

### 1. Upload ke GitHub

Extract ZIP ini, upload ke repo GitHub baru.

### 2. Import ke Vercel

Import repo ke Vercel lalu deploy.

### 3. Tambahkan Vercel KV

Vercel Project → Storage → Create KV/Redis → Connect.

Pastikan env ini otomatis masuk:
```env
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

### 4. Isi Environment Variables

Project Settings → Environment Variables:

```env
API_KEY=random_panjang
CRON_SECRET=random_panjang
TELEGRAM_BOT_TOKEN=token_bot_telegram
TELEGRAM_ADMIN_IDS=6117415855
TELEGRAM_WEBHOOK_SECRET=random_panjang
PUBLIC_BASE_URL=https://domain-vercel-kamu.vercel.app
MASTER_KEY=random_panjang
WHATSAPP_SUPPORT_EMAIL=support@support.whatsapp.com
SMTP_MODE=587
```

Opsional:
```env
ALLOWED_TELEGRAM_USER_IDS=
PENDING_DAYS=7
REPLY_SCAN_MAX=25
```

Kalau `ALLOWED_TELEGRAM_USER_IDS` kosong, semua user bisa pakai bot, tapi hanya admin yang bisa tambah/hapus Gmail.

### 5. Redeploy

Setelah env masuk, redeploy.

### 6. Test API

Buka:

```txt
https://DOMAIN-VERCEL/api/health
```

Kalau sukses akan muncul JSON `ok: true`.

### 7. Set webhook Telegram

Panggil:

```bash
curl -X POST "https://DOMAIN-VERCEL/api/setup-webhook" \
  -H "X-API-Key: API_KEY_KAMU" \
  -H "Content-Type: application/json" \
  -d '{"baseUrl":"https://DOMAIN-VERCEL"}'
```

Jika sukses, buka bot Telegram dan kirim:

```txt
/start
```

---

## Cara pakai bot

### Admin

Tekan:
```txt
➕ Tambah Gmail
```

Lalu kirim Gmail, kemudian kirim App Password Gmail.

Tekan:
```txt
🧪 Test Gmail
```

Kalau OK, lanjut.

Tekan:
```txt
🔧 Fix WhatsApp
```

Lalu kirim nomor:
```txt
+237620643413
```

### User biasa

User hanya perlu tekan:
```txt
🔧 Fix WhatsApp
```

Lalu kirim nomor global.

---

## Endpoint API

### Kirim fix via API

```bash
curl -X POST "https://DOMAIN-VERCEL/api/fix" \
  -H "X-API-Key: API_KEY_KAMU" \
  -H "Content-Type: application/json" \
  -d '{"number":"+237620643413","telegramChatId":"123456789","username":"test"}'
```

### Tambah Gmail via API

```bash
curl -X POST "https://DOMAIN-VERCEL/api/senders/add" \
  -H "X-API-Key: API_KEY_KAMU" \
  -H "Content-Type: application/json" \
  -d '{"email":"gmail@gmail.com","app_password":"abcd efgh ijkl mnop"}'
```

### List Gmail

```bash
curl "https://DOMAIN-VERCEL/api/senders/list" \
  -H "X-API-Key: API_KEY_KAMU"
```

### Test Gmail

```bash
curl "https://DOMAIN-VERCEL/api/senders/test" \
  -H "X-API-Key: API_KEY_KAMU"
```

### Check replies manual

```bash
curl "https://DOMAIN-VERCEL/api/check-replies" \
  -H "X-API-Key: API_KEY_KAMU"
```

### Stats

```bash
curl "https://DOMAIN-VERCEL/api/stats" \
  -H "X-API-Key: API_KEY_KAMU"
```

---

## Gmail setup

Untuk setiap Gmail:

1. Aktifkan 2-Step Verification.
2. Buat App Password.
3. Aktifkan IMAP di Gmail.
4. Tambahkan Gmail dari tombol bot atau API.

---

## Kalau SMTP timeout

Ubah env:

```env
SMTP_MODE=465
```

lalu redeploy.

Kalau masih timeout, kemungkinan VPS/serverless outbound SMTP sedang dibatasi, atau Gmail/App Password belum valid.


---

## Catatan Versi Fixed

Versi fixed ini:
- file project sudah flat di root ZIP
- `vercel.json` dihapus agar tidak kena limit Vercel Hobby Cron
- endpoint `/api/health` ditambahkan
- halaman `/` ditambahkan agar domain utama tidak 404

## Auto check reply gratis

Karena Vercel Hobby tidak bisa cron setiap menit, gunakan cron-job.org.

Create cron:

```txt
URL: https://DOMAIN-VERCEL/api/check-replies
Method: GET
Header:
X-API-Key: API_KEY_KAMU
Interval: Every 1 minute
```

## Endpoint penting

```txt
https://DOMAIN-VERCEL/
https://DOMAIN-VERCEL/api
https://DOMAIN-VERCEL/api/health
https://DOMAIN-VERCEL/api/setup-webhook
https://DOMAIN-VERCEL/api/telegram-webhook
```
