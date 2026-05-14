export function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data, null, 2));
}

export function onlyMethods(req, res, methods) {
  if (!methods.includes(req.method)) {
    res.statusCode = 405;
    res.setHeader('Allow', methods.join(', '));
    res.end('Method Not Allowed');
    return false;
  }
  return true;
}

export function getHeader(req, name) {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (key.toLowerCase() === lower) return Array.isArray(value) ? value[0] : value;
  }
  return undefined;
}

export function requireApiKey(req) {
  const expected = process.env.API_KEY;
  if (!expected) return { ok: false, status: 500, error: 'API_KEY env not set' };

  const provided = getHeader(req, 'x-api-key') || req.query?.api_key || req.query?.apikey || req.query?.key;
  if (!provided || String(provided) !== String(expected)) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  return { ok: true };
}

export function requireCronOrApiKey(req) {
  const api = requireApiKey(req);
  if (api.ok) return { ok: true, via: 'api_key' };

  const secret = process.env.CRON_SECRET;
  const auth = getHeader(req, 'authorization') || '';
  if (secret && auth === `Bearer ${secret}`) return { ok: true, via: 'cron_secret' };

  if (process.env.ALLOW_VERCEL_CRON_WITHOUT_SECRET === 'true' && String(getHeader(req, 'user-agent') || '').includes('vercel-cron/1.0')) {
    return { ok: true, via: 'vercel_cron_ua' };
  }

  return { ok: false, status: 401, error: 'Unauthorized cron/API request' };
}

export function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return '***';
  const [user, domain] = email.split('@');
  return `${user.slice(0, 2)}${'*'.repeat(Math.max(2, Math.min(10, user.length - 2)))}@${domain}`;
}

export function maskNumber(number) {
  const raw = String(number || '').replace(/\D+/g, '');
  if (!raw) return '***';
  if (raw.length <= 6) return `${raw.slice(0, 2)}***`;
  return `+${raw.slice(0, 3)}***${raw.slice(-3)}`;
}
