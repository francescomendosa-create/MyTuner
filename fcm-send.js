/* FCM HTTP v1 — service account (Legacy Server key non serve) */

const enc = new TextEncoder();

function toB64u(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem) {
  const b64 = String(pem || '')
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out.buffer;
}

async function importPrivateKey(pem) {
  return crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function googleAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };
  const unsigned = `${toB64u(enc.encode(JSON.stringify(header)))}.${toB64u(enc.encode(JSON.stringify(claim)))}`;
  const key = await importPrivateKey(serviceAccount.private_key);
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(unsigned)));
  const jwt = `${unsigned}.${toB64u(sig)}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${encodeURIComponent(jwt)}`
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new Error(`oauth ${res.status}: ${JSON.stringify(json)}`);
  }
  return json.access_token;
}

function parseServiceAccount(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(String(raw));
  } catch (e) {
    return null;
  }
}

export async function sendFcmDataMessage(envOrKey, token, data = {}) {
  if (!token) return { ok: false, reason: 'missing_token' };

  /* Preferisci V1 (service account). Fallback legacy se c’è ancora FCM_SERVER_KEY. */
  const sa = parseServiceAccount(envOrKey?.FCM_SERVICE_ACCOUNT || envOrKey);
  if (sa?.client_email && sa?.private_key && sa?.project_id) {
    try {
      const access = await googleAccessToken(sa);
      const body = {
        message: {
          token: String(token),
          android: {
            priority: 'HIGH',
            ttl: '120s'
          },
          data: {
            action: String(data.action || 'power'),
            value: String(data.value ?? 'fcm')
          }
        }
      };
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(sa.project_id)}/messages:send`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${access}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      );
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch (e) { /* ignore */ }
      return { ok: res.ok, status: res.status, body: json || text, api: 'v1' };
    } catch (e) {
      return { ok: false, reason: String(e?.message || e), api: 'v1' };
    }
  }

  const serverKey = typeof envOrKey === 'string'
    ? envOrKey
    : (envOrKey?.FCM_SERVER_KEY || '');
  if (!serverKey) return { ok: false, reason: 'missing_credentials' };

  try {
    const res = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        Authorization: `key=${serverKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: token,
        priority: 'high',
        content_available: true,
        data: {
          action: String(data.action || 'power'),
          value: String(data.value ?? 'fcm')
        }
      })
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { /* ignore */ }
    const ok = res.ok && (!json || json.success !== 0);
    return { ok, status: res.status, body: json || text, api: 'legacy' };
  } catch (e) {
    return { ok: false, reason: String(e?.message || e), api: 'legacy' };
  }
}
