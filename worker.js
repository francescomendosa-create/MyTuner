const UA = 'MyTuner/1.0 (cloudflare)';
const API = 'https://de1.api.radio-browser.info/json/stations/search';

const FALLBACK = {
  fm: [
    { name: 'Radio 105 Network', url: 'http://icecast.unitedradio.it/Radio105.mp3', freq: 98.1, bitrate: 128, codec: 'MP3' },
    { name: 'Virgin Radio Classic Rock', url: 'http://icy.unitedradio.it/VirginRockClassics.mp3', freq: 100.7, bitrate: 128, codec: 'MP3' },
    { name: 'Rai Radio 3', url: 'http://icestreaming.rai.it/3.mp3', freq: 102.5, bitrate: 320, codec: 'MP3' },
    { name: 'Virgin Radio Rock 70', url: 'http://icy.unitedradio.it/VirginRock70.mp3', freq: 96.2, bitrate: 128, codec: 'MP3' },
    { name: 'Virgin Radio Rock 80', url: 'http://icy.unitedradio.it/VirginRock80.mp3', freq: 94.4, bitrate: 128, codec: 'MP3' },
    { name: 'Radio 80', url: 'http://str01.fluidstream.net:7020/;stream.mp3', freq: 91.7, bitrate: 128, codec: 'MP3' }
  ],
  am: [
    { name: 'Rai Radio 1', url: 'http://icestreaming.rai.it/1.mp3', freq: 810, bitrate: 256, codec: 'MP3' },
    { name: 'Radio 24', url: 'http://shoutcast2.radio24.it:8000/;', freq: 900, bitrate: 64, codec: 'MP3' }
  ]
};

function slots(start, end, step, pin) {
  const list = [];
  for (let f = start; f <= end + 1e-6; f += step) list.push(Math.round(f * 10) / 10);
  if (pin != null) {
    let idx = 0;
    let best = Infinity;
    list.forEach((s, i) => {
      const d = Math.abs(s - pin);
      if (d < best) {
        best = d;
        idx = i;
      }
    });
    list[idx] = pin;
  }
  return list;
}

const FM_SLOTS = slots(88.1, 107.5, 0.9, 98.1);
const AM_SLOTS = slots(567, 1602, 81, 810);

function hintedFreq(name, band) {
  if (band === 'fm') {
    const m = String(name).match(/\b(8[7-9]|9\d|10[0-8])(?:[.,](\d))?\b/);
    if (!m) return null;
    const v = parseFloat(m[1] + '.' + (m[2] || '0'));
    return v >= 87.5 && v <= 108 ? v : null;
  }
  const m = String(name).match(/\b(5\d{2}|6\d{2}|7\d{2}|8\d{2}|9\d{2}|1[0-6]\d{2})\b/);
  if (!m) return null;
  const v = parseInt(m[1], 10);
  return v >= 520 && v <= 1620 ? v : null;
}

function nameKey(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\b\d{2,3}\s*kbps\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isTalk(station) {
  const blob = `${station.name || ''} ${station.tags || ''}`.toLowerCase();
  return /news|talk|notizie|giornale|informa|sport|parl|attualita|rai radio 1|radio 24|gr parlamento/.test(blob);
}

function isPublicHttp(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch (e) {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  const host = u.hostname.toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.localhost')) return false;
  if (host === '0.0.0.0' || host === '::1') return false;
  if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(host)) return false;
  const m = host.match(/^172\.(\d+)\./);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return false;
  return true;
}

async function fetchText(url, ms = 8000) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: '*/*' },
    signal: AbortSignal.timeout(ms),
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.text();
}

async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(9000),
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

async function resolveEntry(station) {
  let url = station.url_resolved || station.url || '';
  if (!url || /\.m3u8(\?|$)/i.test(url)) return null;
  const codec = String(station.codec || '').toUpperCase();
  if (codec && !/MP3|AAC|OGG|OPUS|MPEG|UNKNOWN/.test(codec)) return null;
  if (/\.(pls|m3u)(\?|$)/i.test(url) || /listen\.pls/i.test(url)) {
    try {
      const text = await fetchText(url);
      const found = text.match(/https?:\/\/[^\s"'<>]+/i);
      if (!found) return null;
      url = found[0].replace(/[;,]+$/, '');
      if (/\.m3u8(\?|$)/i.test(url)) return null;
    } catch (e) {
      return null;
    }
  }
  if (!isPublicHttp(url)) return null;
  return {
    name: String(station.name || 'Stazione').replace(/\s+/g, ' ').trim(),
    url,
    bitrate: Number(station.bitrate) || 0,
    codec: codec || 'MP3',
    votes: Number(station.votes) || 0,
    tags: station.tags || ''
  };
}

function place(list, bandSlots, band, pinFreq, pinTest) {
  const used = new Set();
  const out = [];
  const pool = list.slice();

  function push(station, freq) {
    used.add(freq);
    out.push({
      name: station.name,
      url: station.url,
      freq,
      bitrate: station.bitrate || 0,
      codec: station.codec || 'MP3'
    });
  }

  const pinIdx = pool.findIndex(pinTest);
  if (pinIdx >= 0 && bandSlots.includes(pinFreq)) {
    push(pool.splice(pinIdx, 1)[0], pinFreq);
  }

  const later = [];
  const tol = band === 'fm' ? 0.55 : 45;
  for (const station of pool) {
    const hint = hintedFreq(station.name, band);
    if (hint == null) {
      later.push(station);
      continue;
    }
    let best = null;
    let bd = Infinity;
    for (const slot of bandSlots) {
      if (used.has(slot)) continue;
      const d = Math.abs(slot - hint);
      if (d < bd) {
        bd = d;
        best = slot;
      }
    }
    if (best != null && bd <= tol) push(station, best);
    else later.push(station);
  }

  if (!used.has(pinFreq) && later.length && bandSlots.includes(pinFreq)) {
    push(later.shift(), pinFreq);
  }
  for (const station of later) {
    const slot = bandSlots.find((s) => !used.has(s));
    if (slot == null) break;
    push(station, slot);
  }
  out.sort((a, b) => a.freq - b.freq);
  return out;
}

async function buildDial() {
  const queries = [
    `${API}?countrycode=IT&hidebroken=true&order=votes&reverse=true&limit=80&lastcheckok=1`,
    `${API}?countrycode=IT&tag=news&hidebroken=true&order=votes&reverse=true&limit=25&lastcheckok=1`,
    `${API}?countrycode=IT&tag=talk&hidebroken=true&order=votes&reverse=true&limit=20&lastcheckok=1`
  ];
  const batches = await Promise.all(queries.map((q) => fetchJSON(q).catch(() => [])));
  const raw = batches.flat().filter((s) => s && (s.lastcheckok === 1 || s.lastcheckok === true || s.lastcheckok == null));
  raw.sort((a, b) => (b.votes || 0) - (a.votes || 0));

  const resolved = [];
  const seenUrl = new Set();
  const seenName = new Set();
  const queue = raw.slice(0, 55);
  const workers = new Array(5).fill(0).map(async () => {
    while (queue.length) {
      const item = queue.shift();
      const entry = await resolveEntry(item);
      if (!entry) continue;
      if (seenUrl.has(entry.url)) continue;
      const key = nameKey(entry.name);
      if (!key || seenName.has(key)) continue;
      seenUrl.add(entry.url);
      seenName.add(key);
      resolved.push(entry);
    }
  });
  await Promise.all(workers);

  const talk = resolved.filter(isTalk);
  const music = resolved.filter((s) => !isTalk(s));
  const fm = place(music.length ? music : resolved, FM_SLOTS, 'fm', 98.1, (s) => /radio 105/i.test(s.name));
  const am = place(talk.length ? talk : resolved, AM_SLOTS, 'am', 810, (s) => /rai radio 1/i.test(s.name));
  if (fm.length < 4 || am.length < 1) return FALLBACK;
  return { fm, am };
}

async function getDial(env) {
  const now = Date.now();
  if (!env.__dial) env.__dial = { at: 0, data: null };
  if (env.__dial.data && now - env.__dial.at < 10 * 60 * 1000) return env.__dial.data;
  try {
    const dial = await buildDial();
    env.__dial = { at: now, data: dial };
    return dial;
  } catch (e) {
    env.__dial = { at: now, data: FALLBACK };
    return FALLBACK;
  }
}

async function proxyStream(target, hops = 0) {
  if (hops > 5 || !isPublicHttp(target)) {
    return new Response('URL non consentito', { status: 400 });
  }
  const up = await fetch(target, {
    headers: {
      'User-Agent': UA,
      Accept: '*/*',
      'Accept-Encoding': 'identity',
      'Icy-MetaData': '0'
    },
    redirect: 'manual'
  });

  if ([301, 302, 303, 307, 308].includes(up.status)) {
    const loc = up.headers.get('location');
    if (!loc) return new Response('Redirect senza destinazione', { status: 502 });
    return proxyStream(new URL(loc, target).href, hops + 1);
  }

  const ct = String(up.headers.get('content-type') || '');
  if (up.status >= 400) return new Response('Stazione non raggiungibile', { status: 502 });

  if (/text\/html/i.test(ct) && !target.includes('/;') && hops < 3) {
    const next = target.endsWith('/') ? `${target};` : `${target}/;`;
    return proxyStream(next, hops + 1);
  }
  if (/text\/html|json|xml/i.test(ct)) {
    return new Response('Flusso non audio', { status: 502 });
  }

  const headers = new Headers();
  headers.set('Content-Type', ct || 'audio/mpeg');
  headers.set('Cache-Control', 'no-store');
  headers.set('Access-Control-Allow-Origin', '*');
  return new Response(up.body, { status: 200, headers });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,OPTIONS',
          'Access-Control-Allow-Headers': '*'
        }
      });
    }

    if (url.pathname === '/api/stations') {
      const dial = await getDial(env);
      return json(dial);
    }

    if (url.pathname === '/stream') {
      const target = url.searchParams.get('u') || '';
      if (!target || target.length > 2000) {
        return new Response('Manca il flusso', { status: 400 });
      }
      return proxyStream(target, 0);
    }

    return env.ASSETS.fetch(request);
  }
};
