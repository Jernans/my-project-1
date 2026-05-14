import { json, onlyMethods, maskEmail } from './_lib/auth.js';
import { getBody } from './_lib/request.js';
import { normalizePhone, isValidE164 } from './_lib/phone.js';
import { telegram, escapeHtml } from './_lib/telegram.js';
import { createFix } from './fix.js';
import { addSenderAction } from './senders/add.js';
import { listSendersAction } from './senders/list.js';
import { deleteSenderAction } from './senders/del.js';
import { testSendersAction } from './senders/test.js';
import { statsAction } from './stats.js';

const state = new Map();

function isAdmin(userId) {
  const ids = String(process.env.TELEGRAM_ADMIN_IDS || '').split(',').map(x => x.trim()).filter(Boolean);
  return ids.includes(String(userId));
}

function isUserAllowed(userId) {
  if (isAdmin(userId)) return true;
  const allowed = String(process.env.ALLOWED_TELEGRAM_USER_IDS || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!allowed.length) return true;
  return allowed.includes(String(userId));
}

function kb(userId) {
  if (isAdmin(userId)) {
    return {
      keyboard: [
        [{ text: '🔧 Fix WhatsApp' }, { text: '📧 List Gmail' }],
        [{ text: '➕ Tambah Gmail' }, { text: '🗑️ Hapus Gmail' }],
        [{ text: '🧪 Test Gmail' }, { text: '📊 Stats' }],
        [{ text: '❌ Batal' }, { text: 'ℹ️ Bantuan' }]
      ],
      resize_keyboard: true
    };
  }
  return {
    keyboard: [
      [{ text: '🔧 Fix WhatsApp' }],
      [{ text: '❌ Batal' }, { text: 'ℹ️ Bantuan' }]
    ],
    resize_keyboard: true
  };
}

async function send(chatId, text, userId, extra = {}) {
  return telegram('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: extra.reply_markup || kb(userId),
    ...extra
  });
}

async function start(chatId, userId) {
  const mode = isAdmin(userId) ? '👑 Admin mode\nLimit: unlimited' : '👤 User mode\nPakai tombol Fix WhatsApp';
  return send(chatId, `🐾 <b>KatsuStore API Bot</b>\n\n${mode}\n\nKlik tombol di bawah.`, userId);
}

async function help(chatId, userId) {
  const text = isAdmin(userId)
    ? `🐾 <b>KatsuStore Admin Help</b>\n\n🔧 Fix WhatsApp → isi nomor\n➕ Tambah Gmail → isi Gmail dan App Password\n🗑️ Hapus Gmail → pilih index\n📧 List Gmail\n🧪 Test Gmail\n📊 Stats\n\nFormat nomor global:\n<code>+12025550123</code>\n<code>+819012345678</code>\n<code>+6581234567</code>\n<code>+6281234567890</code>`
    : `🐾 <b>KatsuStore Help</b>\n\nKlik 🔧 Fix WhatsApp lalu kirim nomor global.\n\nContoh:\n<code>+12025550123</code>\n<code>+819012345678</code>`;
  return send(chatId, text, userId);
}

async function askFix(chatId, userId) {
  state.set(String(chatId), { step: 'WAIT_PHONE' });
  return send(chatId, `🔧 <b>Fix WhatsApp</b>\n\nKirim nomor format internasional saja.\nContoh:\n<code>+237620643413</code>\n<code>+6281234567890</code>\n\nKetik Batal untuk membatalkan.`, userId);
}

async function askEmail(chatId, userId) {
  if (!isAdmin(userId)) return send(chatId, '❌ Khusus admin.', userId);
  state.set(String(chatId), { step: 'WAIT_EMAIL' });
  return send(chatId, `➕ <b>Tambah Gmail</b>\n\nKirim alamat Gmail.`, userId);
}

async function askDelete(chatId, userId) {
  if (!isAdmin(userId)) return send(chatId, '❌ Khusus admin.', userId);
  const list = await listSendersAction();
  if (!list.senders.length) return send(chatId, 'Belum ada Gmail.', userId);
  state.set(String(chatId), { step: 'WAIT_DELETE_INDEX', senders: list.senders });
  const rows = list.senders.map((s, i) => `${i + 1}. ${escapeHtml(s.email)} ${s.isActive ? '(active)' : ''}`).join('\n');
  return send(chatId, `🗑️ <b>Hapus Gmail</b>\n\n${rows}\n\nKirim nomor index.`, userId);
}

async function doList(chatId, userId) {
  if (!isAdmin(userId)) return send(chatId, '❌ Khusus admin.', userId);
  const list = await listSendersAction();
  if (!list.senders.length) return send(chatId, 'Belum ada Gmail.', userId);
  const rows = list.senders.map((s, i) => `${i + 1}. ${escapeHtml(s.email)} ${s.isActive ? '✅ active' : ''}`).join('\n');
  return send(chatId, `📧 <b>Daftar Gmail</b>\n\n${rows}`, userId);
}

async function doStats(chatId, userId) {
  if (!isAdmin(userId)) return send(chatId, '❌ Khusus admin.', userId);
  const s = await statsAction();
  return send(chatId, `📊 <b>Stats</b>\n\nSent: ${s.stats.sent || 0}\nFailed: ${s.stats.failed || 0}\nReplied: ${s.stats.replied || 0}\nPending: ${s.pendingCount}`, userId);
}

async function doTest(chatId, userId) {
  if (!isAdmin(userId)) return send(chatId, '❌ Khusus admin.', userId);
  await send(chatId, '⏳ Test Gmail berjalan...', userId);
  const r = await testSendersAction();
  const rows = r.results.map(x => x.ok ? `✅ ${escapeHtml(x.email)} OK` : `❌ ${escapeHtml(x.email)} ERROR: ${escapeHtml(x.error)}`).join('\n');
  return send(chatId, rows || 'Tidak ada Gmail.', userId);
}

async function processState(chatId, userId, from, text) {
  const key = String(chatId);
  const s = state.get(key);
  if (!s) return false;

  if (/^(batal|❌ batal)$/i.test(text)) {
    state.delete(key);
    await send(chatId, '✅ Dibatalkan.', userId);
    return true;
  }

  if (s.step === 'WAIT_PHONE') {
    state.delete(key);
    const phone = normalizePhone(text);
    if (!isValidE164(phone)) {
      await send(chatId, `❌ Format nomor salah.\n\nContoh:\n<code>+12025550123</code>\n<code>+819012345678</code>`, userId);
      return true;
    }

    await send(chatId, '⏳ Mengirim request...', userId);
    try {
      const result = await createFix({
        number: phone,
        telegramChatId: chatId,
        telegramUserId: userId,
        username: from.username || null,
        displayName: [from.first_name, from.last_name].filter(Boolean).join(' ') || null
      });

      await send(chatId, `✅ <b>Request terkirim</b>\n\nFix ID: <code>${escapeHtml(result.fixId)}</code>\nNomor: <code>${escapeHtml(phone)}</code>\nSender: <code>${escapeHtml(result.senderEmailMasked)}</code>\n\nKalau WhatsApp membalas, bot akan kirim file .txt otomatis.`, userId);
    } catch (err) {
      await send(chatId, `❌ Gagal kirim.\n\n${escapeHtml(err.message)}`, userId);
    }
    return true;
  }

  if (s.step === 'WAIT_EMAIL') {
    if (!isAdmin(userId)) { state.delete(key); return true; }
    if (!text.includes('@')) {
      await send(chatId, '❌ Email tidak valid. Kirim Gmail yang benar.', userId);
      return true;
    }
    state.set(key, { step: 'WAIT_APP_PASS', email: text.trim() });
    await send(chatId, `✅ Gmail diterima: <code>${escapeHtml(maskEmail(text.trim()))}</code>\n\nSekarang kirim App Password Gmail.`, userId);
    return true;
  }

  if (s.step === 'WAIT_APP_PASS') {
    if (!isAdmin(userId)) { state.delete(key); return true; }
    state.delete(key);
    try {
      const result = await addSenderAction({ email: s.email, app_password: text.trim() });
      await send(chatId, `✅ Gmail ditambahkan.\n\nID: <code>${escapeHtml(result.id)}</code>\nEmail: <code>${escapeHtml(result.email)}</code>`, userId);
    } catch (err) {
      await send(chatId, `❌ Gagal tambah Gmail.\n\n${escapeHtml(err.message)}`, userId);
    }
    return true;
  }

  if (s.step === 'WAIT_DELETE_INDEX') {
    if (!isAdmin(userId)) { state.delete(key); return true; }
    const index = Number(text.trim()) - 1;
    const item = s.senders?.[index];
    state.delete(key);
    if (!item) {
      await send(chatId, '❌ Index tidak valid.', userId);
      return true;
    }
    try {
      await deleteSenderAction({ id: item.id });
      await send(chatId, `✅ Gmail dihapus: <code>${escapeHtml(item.email)}</code>`, userId);
    } catch (err) {
      await send(chatId, `❌ Gagal hapus.\n\n${escapeHtml(err.message)}`, userId);
    }
    return true;
  }

  return false;
}

export default async function handler(req, res) {
  if (!onlyMethods(req, res, ['POST'])) return;

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers['x-telegram-bot-api-secret-token'] !== secret) {
    return json(res, 401, { ok: false, error: 'Bad Telegram secret token' });
  }

  let update;
  try { update = await getBody(req); }
  catch (err) { return json(res, 400, { ok: false, error: err.message }); }

  const msg = update.message || update.edited_message;
  if (!msg || !msg.chat || !msg.from) return json(res, 200, { ok: true, ignored: true });

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = String(msg.text || '').trim();

  if (!isUserAllowed(userId)) {
    await send(chatId, '❌ Kamu tidak punya akses bot ini.', userId, { reply_markup: { remove_keyboard: true } });
    return json(res, 200, { ok: true, blocked: true });
  }

  if (!text) return json(res, 200, { ok: true });

  try {
    if (await processState(chatId, userId, msg.from, text)) return json(res, 200, { ok: true });

    if (text === '/start') await start(chatId, userId);
    else if (text === '/help' || text === 'ℹ️ Bantuan') await help(chatId, userId);
    else if (text === '🔧 Fix WhatsApp' || text === '/fix') await askFix(chatId, userId);
    else if (text === '➕ Tambah Gmail' || text === '/addemail') await askEmail(chatId, userId);
    else if (text === '🗑️ Hapus Gmail' || text === '/delemail') await askDelete(chatId, userId);
    else if (text === '📧 List Gmail' || text === '/listemail') await doList(chatId, userId);
    else if (text === '🧪 Test Gmail' || text === '/testemail') await doTest(chatId, userId);
    else if (text === '📊 Stats' || text === '/stats') await doStats(chatId, userId);
    else if (/^\/fix\s+/.test(text)) await processState(chatId, userId, msg.from, text.replace(/^\/fix\s+/, '')) || await askFix(chatId, userId);
    else if (text === '❌ Batal') { state.delete(String(chatId)); await send(chatId, '✅ Tidak ada proses aktif.', userId); }
    else await send(chatId, 'Pakai tombol di bawah ya.', userId);
  } catch (err) {
    await send(chatId, `❌ Error:\n${escapeHtml(err.message)}`, userId);
  }

  return json(res, 200, { ok: true });
}
