/* Web Push (RFC 8291/8292) — solo Web Crypto, ok su Cloudflare Workers */

const enc = new TextEncoder();
export const MAX_PLAINTEXT = 3993;

export function toB64u(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64u(s) {
  return Uint8Array.from(atob(String(s || '').replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
}

function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
}

async function signVapidJwt(claims, vapid) {
  const pub = fromB64u(vapid.publicKey);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error('VAPID public key invalid');
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x: toB64u(pub.slice(1, 33)), y: toB64u(pub.slice(33)), d: vapid.privateKey },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  const unsigned = `${toB64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))}.${toB64u(enc.encode(JSON.stringify(claims)))}`;
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(unsigned));
  return `${unsigned}.${toB64u(new Uint8Array(sig))}`;
}

async function vapidAuthorization(endpoint, vapid) {
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  const jwt = await signVapidJwt({ aud: new URL(endpoint).origin, exp, sub: vapid.subject }, vapid);
  return `vapid t=${jwt}, k=${vapid.publicKey}`;
}

async function hkdf(salt, ikm, info, bytes) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8));
}

async function encryptPayload(plaintext, sub) {
  if (plaintext.length > MAX_PLAINTEXT) throw new Error('payload troppo grande');
  const uaPublic = fromB64u(sub.keys.p256dh);
  const authSecret = fromB64u(sub.keys.auth);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const ikm = await hkdf(authSecret, ecdhSecret, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, concat(plaintext, new Uint8Array([2])));
  const header = new Uint8Array(86);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = 65;
  header.set(asPublic, 21);
  return concat(header, new Uint8Array(ciphertext));
}

export async function sendPush(sub, payload, vapid, opts = {}) {
  const headers = {
    Authorization: await vapidAuthorization(sub.endpoint, vapid),
    TTL: String(opts.ttl ?? 86400)
  };
  if (opts.urgency) headers.Urgency = opts.urgency;
  if (opts.topic) headers.Topic = opts.topic;
  let body = null;
  if (payload != null) {
    body = await encryptPayload(enc.encode(typeof payload === 'string' ? payload : JSON.stringify(payload)), sub);
    headers['Content-Encoding'] = 'aes128gcm';
    headers['Content-Type'] = 'application/octet-stream';
  }
  return fetch(sub.endpoint, { method: 'POST', headers, body });
}

export function isPushSubscription(x) {
  if (!x || typeof x.endpoint !== 'string') return false;
  if (!x.keys || typeof x.keys.p256dh !== 'string' || typeof x.keys.auth !== 'string') return false;
  try {
    const u = new URL(x.endpoint);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname;
    return (
      h === 'fcm.googleapis.com' ||
      h.endsWith('.notify.windows.com') ||
      h.endsWith('.push.apple.com') ||
      h === 'updates.push.services.mozilla.com' ||
      h.endsWith('.googleapis.com')
    );
  } catch (e) {
    return false;
  }
}
