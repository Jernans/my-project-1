import crypto from 'crypto';

function getKey() {
  const raw = process.env.MASTER_KEY;
  if (!raw) return null;
  const isHex = /^[0-9a-fA-F]{64}$/.test(raw);
  return isHex ? Buffer.from(raw, 'hex') : crypto.createHash('sha256').update(raw, 'utf8').digest();
}

export function encryptIfPossible(plain) {
  const key = getKey();
  if (!key) return { scheme: 'plain', value: String(plain || '') };

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plain || ''), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return { scheme: 'aes-256-gcm', value: Buffer.concat([iv, tag, ciphertext]).toString('base64') };
}

export function decryptIfNeeded(packed) {
  if (!packed) return '';
  if (typeof packed === 'string') return packed;
  if (packed.scheme === 'plain') return packed.value || '';
  if (packed.scheme !== 'aes-256-gcm') throw new Error('Unsupported password encryption scheme');

  const key = getKey();
  if (!key) throw new Error('MASTER_KEY missing: cannot decrypt stored password');

  const buf = Buffer.from(packed.value, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
