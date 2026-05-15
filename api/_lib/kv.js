import { createClient } from 'redis';

let promise = null;

async function client() {
  if (!process.env.REDIS_URL) throw new Error('REDIS_URL env not set');
  if (!promise) {
    const c = createClient({ url: process.env.REDIS_URL });
    c.on('error', err => console.error('[Redis]', err.message));
    promise = c.connect().then(() => c);
  }
  return promise;
}

function enc(v) { return JSON.stringify(v); }
function dec(v) {
  if (v === null || v === undefined) return null;
  try { return JSON.parse(v); } catch { return v; }
}

export const kv = {
  async get(k) { return dec(await (await client()).get(String(k))); },
  async set(k, v) { await (await client()).set(String(k), enc(v)); return true; },
  async del(k) { return (await client()).del(String(k)); },
  async sadd(k, ...m) {
    const arr = m.flat().filter(x => x !== undefined && x !== null).map(String);
    if (!arr.length) return 0;
    return (await client()).sAdd(String(k), arr);
  },
  async srem(k, ...m) {
    const arr = m.flat().filter(x => x !== undefined && x !== null).map(String);
    if (!arr.length) return 0;
    return (await client()).sRem(String(k), arr);
  },
  async smembers(k) { return (await client()).sMembers(String(k)); },
  async sismember(k, m) { return (await client()).sIsMember(String(k), String(m)); }
};
