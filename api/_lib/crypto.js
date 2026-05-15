import crypto from 'crypto';

function key() {
  const raw = process.env.MASTER_KEY;
  if (!raw) return null;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  return crypto.createHash('sha256').update(raw).digest();
}

export function encrypt(value) {
  const k = key();
  if (!k) return { scheme: 'plain', value: String(value || '') };

  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', k, iv);
  const ct = Buffer.concat([c.update(String(value || ''), 'utf8'), c.final()]);
  const tag = c.getAuthTag();

  return { scheme: 'aes-256-gcm', value: Buffer.concat([iv, tag, ct]).toString('base64') };
}

export function decrypt(packed) {
  if (!packed) return '';
  if (typeof packed === 'string') return packed;
  if (packed.scheme === 'plain') return packed.value || '';
  if (packed.scheme !== 'aes-256-gcm') throw new Error('Unsupported encryption');

  const k = key();
  if (!k) throw new Error('MASTER_KEY missing');

  const b = Buffer.from(packed.value, 'base64');
  const iv = b.subarray(0, 12);
  const tag = b.subarray(12, 28);
  const ct = b.subarray(28);

  const d = crypto.createDecipheriv('aes-256-gcm', k, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
}
