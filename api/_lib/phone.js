export function normalizePhone(input) {
  let value = String(input || '').trim().replace(/[^\d+]/g, '');
  if (!value) return '';
  if (!value.startsWith('+')) value = `+${value}`;
  return value;
}

export function isValidE164(phone) {
  return /^\+[1-9]\d{7,14}$/.test(String(phone || ''));
}

export function extractPhones(text) {
  const src = String(text || '');
  const candidates = new Set();
  for (const match of src.matchAll(/\+[1-9]\d[\d\s().-]{6,20}\d/g)) {
    const normalized = normalizePhone(match[0]);
    if (isValidE164(normalized)) candidates.add(normalized);
  }
  return [...candidates];
}
