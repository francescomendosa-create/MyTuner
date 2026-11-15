'use strict';

if (!process.execArgv.includes('--use-system-ca')) {
  if (process.env.RADIO_CA_REEXEC === '1') {
    console.error('Impossibile usare i certificati di sistema.');
    process.exit(1);
  }
  const child = require('child_process').spawn(
    process.execPath,
    ['--use-system-ca', __filename, ...process.argv.slice(2)],
    { stdio: 'inherit', env: { ...process.env, RADIO_CA_REEXEC: '1' } }
  );
  child.on('exit', (code) => process.exit(code == null ? 1 : code));
  return;
}

const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { URL } = require('url');

const ROOT = __dirname;
const UA = 'MyTuner/1.0 (local web radio)';
const PORT0 = 4789;
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

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json'
};

let dialCache = null;
let dialAt = 0;

function slots(start, end, step, pin) {
  const list = [];
  for (let f = start; f <= end + 1e-6; f += step) {
    list.push(Math.round(f * 10) / 10);
  }
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
  if (/\.m3u8(\?|$)/i.test(url)) return null;
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
  const queue = raw.slice(0, 70);
  const workers = new Array(6).fill(0).map(async () => {
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

async function getDial() {
  const now = Date.now();
  if (dialCache && now - dialAt < 10 * 60 * 1000) return dialCache;
  try {
    const dial = await buildDial();
    dialCache = dial;
    dialAt = now;
    console.log(`[MyTuner] scala FM ${dial.fm.length} · AM ${dial.am.length}`);
    return dial;
  } catch (err) {
    console.error('[MyTuner] elenco stazioni non disponibile, uso la scala di riserva');
    dialCache = FALLBACK;
    dialAt = now;
    return FALLBACK;
  }
}

function send(res, status, body, headers) {
  res.writeHead(status, headers || {});
  res.end(body);
}

function serveStatic(req, res, pathname) {
  let rel = pathname === '/' ? '/index.html' : pathname;
  let file;
  try {
    file = path.resolve(ROOT, '.' + decodeURIComponent(rel));
  } catch (e) {
    send(res, 400, 'Bad request');
    return;
  }
  const relPath = path.relative(ROOT, file);
  if (relPath.startsWith('..') || path.isAbsolute(relPath)) {
    send(res, 403, 'Forbidden');
    return;
  }
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      send(res, 404, 'Not found');
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(file).pipe(res);
  });
}

function proxyStream(res, target, hops) {
  if (hops > 5 || !isPublicHttp(target)) {
    if (!res.headersSent) send(res, 400, 'URL non consentito');
    else res.end();
    return;
  }
  let u;
  try {
    u = new URL(target);
  } catch (e) {
    send(res, 400, 'URL non valido');
    return;
  }
  const lib = u.protocol === 'https:' ? https : http;
  const upstream = lib.request(
    {
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: `${u.pathname}${u.search}`,
      method: 'GET',
      headers: {
        'User-Agent': UA,
        Accept: '*/*',
        'Accept-Encoding': 'identity',
        'Icy-MetaData': '0'
      },
      timeout: 15000
    },
    (up) => {
      const loc = up.headers.location;
      if ([301, 302, 303, 307, 308].includes(up.statusCode) && loc) {
        up.resume();
        proxyStream(res, new URL(loc, target).href, hops + 1);
        return;
      }
      const ct = String(up.headers['content-type'] || '');
      if (up.statusCode >= 400) {
        up.resume();
        if (!res.headersSent) send(res, 502, 'Stazione non raggiungibile');
        return;
      }
      if (/text\/html/i.test(ct) && !target.includes('/;') && hops < 3) {
        up.resume();
        const next = target.endsWith('/') ? `${target};` : `${target}/;`;
        proxyStream(res, next, hops + 1);
        return;
      }
      if (/text\/html|json|xml/i.test(ct)) {
        up.resume();
        if (!res.headersSent) send(res, 502, 'Flusso non audio');
        return;
      }
      res.writeHead(200, {
        'Content-Type': ct || 'audio/mpeg',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      });
      up.pipe(res);
    }
  );
  const kill = () => {
    upstream.destroy();
  };
  res.on('close', kill);
  upstream.on('timeout', kill);
  upstream.on('error', () => {
    if (!res.headersSent) send(res, 502, 'Errore di flusso');
    else res.end();
  });
  upstream.end();
}

function lanAddresses() {
  const found = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    if (/virtual|vmware|vbox|hyper-v|loopback|docker|wsl/i.test(name)) continue;
    for (const item of list || []) {
      const v4 = item.family === 'IPv4' || item.family === 4;
      if (v4 && !item.internal) found.push(item.address);
    }
  }
  return found;
}

const server = http.createServer(async (req, res) => {
  const host = `http://${req.headers.host || 'localhost'}`;
  let url;
  try {
    url = new URL(req.url, host);
  } catch (e) {
    send(res, 400, 'Bad request');
    return;
  }
  if (url.pathname === '/api/stations') {
    const dial = await getDial();
    send(res, 200, JSON.stringify(dial), {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    });
    return;
  }
  if (url.pathname === '/stream') {
    const target = url.searchParams.get('u') || '';
    if (!target || target.length > 2000) {
      send(res, 400, 'Manca il flusso');
      return;
    }
    proxyStream(res, target, 0);
    return;
  }
  serveStatic(req, res, url.pathname);
});

function listen(port) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && port < PORT0 + 8) {
      listen(port + 1);
      return;
    }
    console.error(err);
    process.exit(1);
  });
  server.listen(port, '0.0.0.0', () => {
    console.log(`MyTuner acceso su http://localhost:${port}`);
    for (const ip of lanAddresses()) {
      console.log(`Dal telefono o dal tablet: http://${ip}:${port}`);
    }
  });
}

listen(PORT0);
