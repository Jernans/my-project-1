export function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data, null, 2));
}

export function method(req, res, allowed) {
  if (!allowed.includes(req.method)) {
    res.statusCode = 405;
    res.setHeader('allow', allowed.join(', '));
    res.end('Method Not Allowed');
    return false;
  }
  return true;
}

export async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return req.body.trim() ? JSON.parse(req.body) : {};

  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

export function header(req, name) {
  const target = name.toLowerCase();
  for (const [k, v] of Object.entries(req.headers || {})) {
    if (k.toLowerCase() === target) return Array.isArray(v) ? v[0] : v;
  }
  return undefined;
}

export function auth(req) {
  const expected = process.env.API_KEY;
  if (!expected) return { ok: false, status: 500, error: 'API_KEY env not set' };

  const got = header(req, 'x-api-key') || req.query?.key || req.query?.api_key || req.query?.apikey;
  if (String(got || '') !== String(expected)) return { ok: false, status: 401, error: 'Unauthorized' };

  return { ok: true };
}

export function maskEmail(email) {
  if (!email || !String(email).includes('@')) return '***';
  const [u, d] = String(email).split('@');
  return `${u.slice(0, 2)}${'*'.repeat(Math.max(2, u.length - 2))}@${d}`;
}

export function escapeHtml(s) {
  return String(s || '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}
