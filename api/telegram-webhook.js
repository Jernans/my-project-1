import { json, method, body, escapeHtml, maskEmail } from './_lib/http.js';
import { sendMsg } from './_lib/telegram.js';
import { normalizePhone, validPhone } from './_lib/phone.js';
import { createFix } from './fix.js';
import { addSenderAction } from './senders/add.js';
import { listSendersAction } from './senders/list.js';
import { delSenderAction } from './senders/del.js';
import { testSendersAction } from './senders/test.js';
import { statsAction } from './stats.js';
import { getState, setState, clearState, checkLimit, markUse, fmt } from './_lib/bot-state.js';

function admin(id) { return String(process.env.TELEGRAM_ADMIN_IDS || '').split(',').map(x=>x.trim()).filter(Boolean).includes(String(id)); }
function allowed(id) {
  if (admin(id)) return true;
  const list = String(process.env.ALLOWED_TELEGRAM_USER_IDS || '').split(',').map(x=>x.trim()).filter(Boolean);
  return list.length ? list.includes(String(id)) : true;
}
function keyboard(id) {
  if (admin(id)) return { keyboard: [[{text:'🔧 Fix WhatsApp'}, {text:'📧 List Gmail'}], [{text:'➕ Tambah Gmail'}, {text:'🗑️ Hapus Gmail'}], [{text:'🧪 Test Gmail'}, {text:'📊 Stats'}], [{text:'❌ Batal'}, {text:'ℹ️ Bantuan'}]], resize_keyboard: true };
  return { keyboard: [[{text:'🔧 Fix WhatsApp'}], [{text:'❌ Batal'}, {text:'ℹ️ Bantuan'}]], resize_keyboard: true };
}
async function reply(chat, text, id) { return sendMsg(chat, text, { reply_markup: keyboard(id) }); }
async function askFix(chat,id) { await setState(chat,{step:'phone'}); return reply(chat,'🔧 <b>Fix WhatsApp</b>\n\nKirim nomor global, contoh:\n<code>+237620643413</code>\n<code>+6281234567890</code>',id); }
async function askEmail(chat,id) { if(!admin(id)) return reply(chat,'❌ Khusus admin.',id); await setState(chat,{step:'email'}); return reply(chat,'➕ Kirim alamat Gmail.',id); }
async function askDel(chat,id) {
  if(!admin(id)) return reply(chat,'❌ Khusus admin.',id);
  const l = await listSendersAction();
  if(!l.senders.length) return reply(chat,'Belum ada Gmail.',id);
  await setState(chat,{step:'del',senders:l.senders});
  return reply(chat,'🗑️ Kirim index Gmail yang mau dihapus:\n\n'+l.senders.map((s,i)=>`${i+1}. ${escapeHtml(s.email)}`).join('\n'),id);
}
async function process(chat,id,from,text) {
  const s = await getState(chat);
  if(!s) return false;
  if(/^batal|❌ batal$/i.test(text)) { await clearState(chat); await reply(chat,'✅ Dibatalkan.',id); return true; }

  if(s.step==='phone') {
    await clearState(chat);
    const phone = normalizePhone(text);
    if(!validPhone(phone)) { await reply(chat,'❌ Format salah. Contoh: <code>+6281234567890</code>',id); return true; }
    if(!admin(id)) {
      const lim = await checkLimit(id, Number(process.env.NON_ADMIN_RESET_MS || 3600000));
      if(!lim.ok) { await reply(chat,`⏳ Limit. Coba lagi dalam ${fmt(lim.left)}.`,id); return true; }
    }
    await reply(chat,'⏳ Mengirim request...',id);
    try {
      const r = await createFix({ number: phone, telegramChatId: chat, telegramUserId: id, username: from.username });
      if(!admin(id)) await markUse(id);
      await reply(chat,`✅ <b>Request terkirim</b>\n\nFix ID: <code>${escapeHtml(r.fixId)}</code>\nNomor: <code>${escapeHtml(phone)}</code>\nSender: <code>${escapeHtml(r.senderEmailMasked)}</code>`,id);
    } catch(e) { await reply(chat,`❌ Gagal:\n${escapeHtml(e.message)}`,id); }
    return true;
  }

  if(s.step==='email') {
    if(!admin(id)) { await clearState(chat); return true; }
    if(!text.includes('@')) { await reply(chat,'❌ Email tidak valid.',id); return true; }
    await setState(chat,{step:'pass',email:text.trim()});
    await reply(chat,`✅ Gmail: <code>${escapeHtml(maskEmail(text.trim()))}</code>\n\nKirim App Password Gmail.`,id);
    return true;
  }

  if(s.step==='pass') {
    if(!admin(id)) { await clearState(chat); return true; }
    await clearState(chat);
    try {
      const r = await addSenderAction({ email: s.email, app_password: text.trim() });
      await reply(chat,`✅ Gmail ditambahkan:\n<code>${escapeHtml(r.email)}</code>`,id);
    } catch(e) { await reply(chat,`❌ Gagal tambah Gmail:\n${escapeHtml(e.message)}`,id); }
    return true;
  }

  if(s.step==='del') {
    if(!admin(id)) { await clearState(chat); return true; }
    await clearState(chat);
    const item = s.senders[Number(text.trim())-1];
    if(!item) { await reply(chat,'❌ Index tidak valid.',id); return true; }
    try { await delSenderAction({ id: item.id }); await reply(chat,`✅ Dihapus: <code>${escapeHtml(item.email)}</code>`,id); }
    catch(e) { await reply(chat,`❌ Gagal hapus:\n${escapeHtml(e.message)}`,id); }
    return true;
  }
  await clearState(chat);
  return false;
}

export default async function handler(req,res) {
  if(!method(req,res,['POST'])) return;

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const got = req.headers['x-telegram-bot-api-secret-token'];
  if(process.env.STRICT_TELEGRAM_SECRET === 'true' && secret && got !== secret) return json(res,401,{ok:false,error:'Bad Telegram secret'});
  if(secret && got && got !== secret) return json(res,401,{ok:false,error:'Bad Telegram secret'});

  const u = await body(req);
  const m = u.message || u.edited_message;
  if(!m || !m.chat || !m.from) return json(res,200,{ok:true,ignored:true});
  const chat = m.chat.id, id = m.from.id, text = String(m.text || '').trim();
  if(!allowed(id)) { await sendMsg(chat,'❌ Kamu tidak punya akses.',{reply_markup:{remove_keyboard:true}}); return json(res,200,{ok:true}); }
  if(!text) return json(res,200,{ok:true});

  try {
    if(await process(chat,id,m.from,text)) return json(res,200,{ok:true});
    if(text==='/start') { await clearState(chat); await reply(chat,'🐾 <b>KatsuStore API Bot</b>\n\nKlik tombol di bawah.',id); }
    else if(text==='🔧 Fix WhatsApp' || text==='/fix') await askFix(chat,id);
    else if(/^\/fix\s+/.test(text)) { await setState(chat,{step:'phone'}); await process(chat,id,m.from,text.replace(/^\/fix\s+/,'')); }
    else if(text==='➕ Tambah Gmail' || text==='/addemail') await askEmail(chat,id);
    else if(text==='🗑️ Hapus Gmail' || text==='/delemail') await askDel(chat,id);
    else if(text==='📧 List Gmail' || text==='/listemail') {
      if(!admin(id)) await reply(chat,'❌ Khusus admin.',id);
      else { const l=await listSendersAction(); await reply(chat,l.senders.length ? l.senders.map((s,i)=>`${i+1}. ${escapeHtml(s.email)} ${s.isActive?'✅':''}`).join('\n') : 'Belum ada Gmail.',id); }
    }
    else if(text==='🧪 Test Gmail' || text==='/testemail') {
      if(!admin(id)) await reply(chat,'❌ Khusus admin.',id);
      else { await reply(chat,'⏳ Test Gmail...',id); const t=await testSendersAction(); await reply(chat,t.results.map(x=>x.ok?`✅ ${escapeHtml(x.email)} OK`:`❌ ${escapeHtml(x.email)} ${escapeHtml(x.error)}`).join('\n') || 'Tidak ada Gmail.',id); }
    }
    else if(text==='📊 Stats' || text==='/stats') {
      if(!admin(id)) await reply(chat,'❌ Khusus admin.',id);
      else { const s=await statsAction(); await reply(chat,`📊 Sent: ${s.stats.sent||0}\nFailed: ${s.stats.failed||0}\nReplied: ${s.stats.replied||0}\nPending: ${s.pendingCount}`,id); }
    }
    else if(text==='ℹ️ Bantuan' || text==='/help') await reply(chat,'Tekan tombol 🔧 Fix WhatsApp lalu kirim nomor global.',id);
    else if(text==='❌ Batal') { await clearState(chat); await reply(chat,'✅ Tidak ada proses aktif.',id); }
    else await reply(chat,'Pakai tombol di bawah ya.',id);
  } catch(e) {
    await reply(chat,`❌ Error:\n${escapeHtml(e.message)}`,id);
  }
  return json(res,200,{ok:true});
}
