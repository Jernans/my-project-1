import nodemailer from 'nodemailer';
import { updateSender } from './senders.js';

export function createTransport(sender) {
  const mode = process.env.SMTP_MODE || '587';

  if (mode === '465') {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: sender.email, pass: sender.appPass },
      connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 45000),
      greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 45000),
      socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 90000)
    });
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: sender.email, pass: sender.appPass },
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 45000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 45000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 90000)
  });
}

export async function sendTextMail({ sender, to, subject, text }) {
  const transport = createTransport(sender);
  const info = await transport.sendMail({ from: sender.email, to, subject, text, headers: { 'X-KatsuStore-Fix': '1' } });

  if (sender.id) await updateSender(sender.id, { lastUsedAt: new Date().toISOString(), lastError: null });
  return info;
}

export async function verifySender(sender) {
  const transport = createTransport(sender);
  await transport.verify();
  return true;
}
