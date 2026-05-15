export function normalizePhone(input) {
  let s = String(input || '').trim().replace(/[^\d+]/g, '');
  if (!s) return '';
  if (!s.startsWith('+')) s = '+' + s;
  return s;
}

export function validPhone(phone) {
  return /^\+[1-9]\d{7,14}$/.test(String(phone || ''));
}

export function phonesFrom(text) {
  const out = new Set();
  for (const m of String(text || '').matchAll(/\+[1-9]\d[\d\s().-]{6,20}\d/g)) {
    const p = normalizePhone(m[0]);
    if (validPhone(p)) out.add(p);
  }
  return [...out];
}
