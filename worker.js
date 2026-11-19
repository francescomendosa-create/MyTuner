import { RemoteHub } from './remote-hub.js';

export { RemoteHub };

const UA = 'MyTuner/1.0 (cloudflare)';
const API = 'https://de1.api.radio-browser.info/json/stations/search';

/* Solo rete principale — niente video ereditato dagli spin-off */
const VIDEO_BY_NAME = [
  { re: /^(radio\s*)?105(\s+network)?$/i, video: 'https://live02-col.msr.cdn.mediaset.net/live/ch-ec/ec-clr.isml/index.m3u8' },
  { re: /^virgin\s*radio(\s+italia)?$/i, video: 'https://live02-col.msr.cdn.mediaset.net/live/ch-ew/ew-clr.isml/index.m3u8' },
  { re: /^(r\s*101|radio\s*101)(\s*(fm|radio))?$/i, video: 'https://live02-col.msr.cdn.mediaset.net/live/ch-er/er-clr.isml/index.m3u8' },
  { re: /^(rmc\s+)?radio\s*monte\s*carlo(\s+fm)?$|^rmc$/i, video: 'https://live02-col.msr.cdn.mediaset.net/live/ch-bb/bb-clr.isml/index.m3u8' },
  { re: /^radio\s*deejay$/i, video: 'https://4c4b867c89244861ac216426883d1ad0.msvdn.net/live/S85984808/sMO0tz9Sr2Rk/playlist.m3u8' },
  { re: /^m\s*2\s*o(\s+radio)?$|^m2o$/i, video: 'https://4c4b867c89244861ac216426883d1ad0.msvdn.net/live/S62628868/uhdWBlkC1AoO/playlist.m3u8' },
  { re: /^(gedi\s*[-–]\s*)?radio\s*capital$/i, video: 'https://4c4b867c89244861ac216426883d1ad0.msvdn.net/live/S35394734/Z6U2wGoDYANk/playlist.m3u8' },
  { re: /^rtl\s*102\.?\s*5$/i, video: 'https://dd782ed59e2a4e86aabf6fc508674b59.msvdn.net/live/S97044836/tbbP8T1ZRPBL/playlist_video.m3u8' },
  { re: /^radio\s*freccia$/i, video: 'https://dd782ed59e2a4e86aabf6fc508674b59.msvdn.net/live/S3160845/0tuSetc8UFkF/playlist_video.m3u8' },
  { re: /^radio\s*zeta$/i, video: 'https://dd782ed59e2a4e86aabf6fc508674b59.msvdn.net/live/S9346184/XEx1LqlYbNic/playlist_video.m3u8' },
  { re: /^rds(\s*100%?\s*grandi\s*successi)?(\s+social(\s+tv)?)?$|^rds\s*[-–]\s*radio\s*dimensione\s*suono$/i, video: 'https://stream.rdstv.radio/index.m3u8' },
  { re: /^radio\s*italia(\s+solo\s+musica\s+italiana)?$/i, video: 'https://radioitaliatv.akamaized.net/hls/live/2093117/RadioitaliaTV/master.m3u8' },
  { re: /^radio\s*kiss\s*kiss$/i, video: 'https://kk.fluid.stream/KKMulti/smil:KissKissTV.smil/playlist.m3u8' },
  { re: /^radio\s*ibiza$/i, video: 'https://5929b138b139d.streamlock.net/RadioIbizaTV/livestream/playlist.m3u8' }
];

const VIDEO_ZOO = 'https://live02-col.msr.cdn.mediaset.net/live/ch-r1/r1-clr.isml/index.m3u8';
const VIDEO_SPINOFF_RE = /\b(classic|ballads?|hits?|hip\s*hop|r'?n'?b|rock\s*'?\d{2}|love\s*songs?|buddha|dance|italia\s*\d|relax|next|napoli|originals|funky|disco|miami|rap|anni\s*\d|sanremo|trend|history|latina|groove|news|best)\b|\brmc\s+(?!radio\b)|\bradio\s*monte\s*carlo\s+(?!fm\b)\S|105\s*[-–]\s*(?!zoo)/i;

function videoForStation(name) {
  const n = String(name || '').replace(/\s+/g, ' ').trim();
  if (!n) return '';
  if (/105/i.test(n) && /zoo/i.test(n)) return VIDEO_ZOO;
  if (VIDEO_SPINOFF_RE.test(n)) return '';
  for (const row of VIDEO_BY_NAME) {
    if (row.re.test(n)) return row.video;
  }
  return '';
}

const AUDIO_BY_NAME = [
  { re: /^(radio\s*)?105(\s+network)?$/i, url: 'https://icecast.unitedradio.it/Radio105.mp3' },
  { re: /^virgin\s*radio(\s+italia)?$/i, url: 'https://icecast.unitedradio.it/Virgin.mp3' },
  { re: /^(r\s*101|radio\s*101)(\s*(fm|radio))?$/i, url: 'https://icecast.unitedradio.it/r101' },
  { re: /^(rmc\s+)?radio\s*monte\s*carlo(\s+fm)?$|^rmc$/i, url: 'https://icecast.unitedradio.it/RMC.mp3' },
  { re: /^radio\s*kiss\s*kiss$/i, url: 'https://ice07.fluidstream.net/KissKiss.aac' },
  { re: /^radio\s*ibiza$/i, url: 'http://wma08.fluidstream.net:5010/;stream.aac' },
  { re: /^rds(\s*100%?\s*grandi\s*successi)?(\s+social(\s+tv)?)?$|^rds\s*[-–]\s*radio\s*dimensione\s*suono$/i, url: 'https://stream.rds.radio/audio/rds.stream_aac64/playlist.m3u8' },
  { re: /^rtl\s*102\.?\s*5$/i, url: 'https://stream.rcast.net/210096' },
  { re: /^radio\s*freccia$/i, url: 'https://dd782ed59e2a4e86aabf6fc508674b59.msvdn.net/live/S3160845/0tuSetc8UFkF/playlist_audio.m3u8' },
  { re: /^radio\s*zeta$/i, url: 'https://streamcdnb1-dd782ed59e2a4e86aabf6fc508674b59.msvdn.net/live/S9346184/XEx1LqlYbNic/playlist_audio.m3u8' },
  { re: /^radio\s*marte$/i, url: 'https://stream1.xdevel.com/audio0s975753-313/stream/icecast.audio' },
  { re: /^fm\s*italia$/i, url: 'https://stream5.xdevel.com/audio1s975817-360/stream/icecast.audio' },
  { re: /^(rsc|r\.?\s*s\.?\s*c\.?)(\s*[-–]\s*)?(radio\s*)?studio\s*centrale$/i, url: 'https://stream.studiocentrale.it/radio/8020/radio.mp3' },
  { re: /^radio\s*studio\s*centrale$/i, url: 'https://stream.studiocentrale.it/radio/8020/radio.mp3' }
];

function audioForStation(name) {
  const n = String(name || '').replace(/\s+/g, ' ').trim();
  if (!n || VIDEO_SPINOFF_RE.test(n)) return '';
  if (/105/i.test(n) && /zoo/i.test(n)) return '';
  for (const row of AUDIO_BY_NAME) {
    if (row.re.test(n)) return row.url;
  }
  return '';
}

/* Default Siracusa/Augusta (il client può rimappare con GPS) */
const FREQ_BY_BRAND = [
  { re: /^(radio\s*)?105(\s+network)?$/i, freq: 100.3 },
  { re: /^virgin\s*radio(\s+italia)?$/i, freq: 88.8 },
  { re: /^(r\s*101|radio\s*101)(\s*(fm|radio))?$/i, freq: 92.7 },
  { re: /^(rmc\s+)?radio\s*monte\s*carlo(\s+fm)?$|^rmc$/i, freq: 91.8 },
  { re: /^radio\s*deejay$/i, freq: 95.6 },
  { re: /^(gedi\s*[-–]\s*)?radio\s*capital$/i, freq: 100.4 },
  { re: /^m\s*2\s*o(\s+radio)?$|^m2o$/i, freq: 97.7 },
  { re: /^rtl\s*102\.?\s*5$/i, freq: 102.7 },
  { re: /^radio\s*freccia$/i, freq: 103.0 },
  { re: /^radio\s*zeta$/i, freq: 101.4 },
  { re: /^rds(\s*100%?\s*grandi\s*successi)?(\s+social(\s+tv)?)?$|^rds\s*[-–]\s*radio\s*dimensione\s*suono$/i, freq: 100.5 },
  { re: /^radio\s*italia(\s+solo\s+musica\s+italiana)?$/i, freq: 93.5 },
  { re: /^radio\s*kiss\s*kiss$/i, freq: 98.4 },
  { re: /^radio\s*ibiza$/i, freq: 96.3 },
  { re: /^radio\s*marte$/i, freq: 93.6 },
  { re: /^fm\s*italia$/i, freq: 99.5 },
  { re: /^(rsc|r\.?\s*s\.?\s*c\.?)(\s*[-–]\s*)?(radio\s*)?studio\s*centrale$/i, freq: 104.3 },
  { re: /^radio\s*studio\s*centrale$/i, freq: 104.3 }
];

function brandFreq(name) {
  const n = String(name || '').replace(/\s+/g, ' ').trim();
  if (!n || VIDEO_SPINOFF_RE.test(n)) return null;
  if (/105/i.test(n) && /zoo/i.test(n)) return 99.0;
  for (const row of FREQ_BY_BRAND) {
    if (row.re.test(n)) return row.freq;
  }
  return null;
}

/* Reti con radiovisione: forzate sul dial (API spesso dà solo spin-off o HLS) */
const SEED_MAINS = [
  { name: 'Radio 105 Network', url: 'https://icecast.unitedradio.it/Radio105.mp3', bitrate: 128, codec: 'MP3', votes: 2e9 },
  { name: 'Virgin Radio', url: 'https://icecast.unitedradio.it/Virgin.mp3', bitrate: 128, codec: 'MP3', votes: 2e9 },
  { name: 'R101', url: 'https://icecast.unitedradio.it/r101', bitrate: 128, codec: 'AAC', votes: 2e9 },
  { name: 'Radio Monte Carlo', url: 'https://icecast.unitedradio.it/RMC.mp3', bitrate: 128, codec: 'MP3', votes: 2e9 },
  { name: 'Radio Kiss Kiss', url: 'https://ice07.fluidstream.net/KissKiss.aac', bitrate: 128, codec: 'AAC', votes: 2e9 },
  { name: 'Radio Ibiza', url: 'http://wma08.fluidstream.net:5010/;stream.aac', bitrate: 128, codec: 'AAC', votes: 2e9 },
  { name: 'RDS', url: 'https://stream.rds.radio/audio/rds.stream_aac64/playlist.m3u8', bitrate: 64, codec: 'AAC', votes: 2e9 },
  { name: 'RTL 102.5', url: 'https://stream.rcast.net/210096', bitrate: 256, codec: 'MP3', votes: 2e9 },
  { name: 'Radio Freccia', url: 'https://dd782ed59e2a4e86aabf6fc508674b59.msvdn.net/live/S3160845/0tuSetc8UFkF/playlist_audio.m3u8', bitrate: 192, codec: 'AAC', votes: 2e9 },
  { name: 'Radio Zeta', url: 'https://streamcdnb1-dd782ed59e2a4e86aabf6fc508674b59.msvdn.net/live/S9346184/XEx1LqlYbNic/playlist_audio.m3u8', bitrate: 192, codec: 'AAC', votes: 2e9 },
  { name: 'Radio Marte', url: 'https://stream1.xdevel.com/audio0s975753-313/stream/icecast.audio', bitrate: 128, codec: 'MP3', votes: 2e9 },
  { name: 'FM Italia', url: 'https://stream5.xdevel.com/audio1s975817-360/stream/icecast.audio', bitrate: 128, codec: 'MP3', votes: 2e9 },
  { name: 'RSC - Radio Studio Centrale', url: 'https://stream.studiocentrale.it/radio/8020/radio.mp3', bitrate: 192, codec: 'MP3', votes: 2e9 }
].map((s) => ({ ...s, freq: brandFreq(s.name) }));

function withVideo(station) {
  if (!station) return station;
  const audio = audioForStation(station.name);
  const video = station.video || videoForStation(station.name);
  const next = audio ? { ...station, url: audio } : { ...station };
  return video ? { ...next, video } : next;
}

const FALLBACK = {
  fm: SEED_MAINS.map((s) => withVideo({ ...s })),
  am: [
    { name: 'Rai Radio 1', url: 'http://icestreaming.rai.it/1.mp3', freq: 810, bitrate: 256, codec: 'MP3' },
    { name: 'Radio 24', url: 'http://shoutcast2.radio24.it:8000/;', freq: 900, bitrate: 64, codec: 'MP3' }
  ].map(withVideo)
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

const FM_SLOTS = [...new Set([
  ...slots(88.1, 107.5, 0.9, 100.3),
  ...FREQ_BY_BRAND.map((r) => r.freq),
  99.0
])].sort((a, b) => a - b);
const AM_SLOTS = slots(567, 1602, 81, 810);

function applyBrandFreqs(list) {
  return list.map((s) => {
    const f = brandFreq(s.name);
    return f != null ? { ...s, freq: f } : s;
  }).sort((a, b) => a.freq - b.freq);
}

function hintedFreq(name, band) {
  if (band === 'fm') {
    const brand = brandFreq(name);
    if (brand != null) return brand;
    /* Non usare 105/101/102.5 del brand come MHz sul dial */
    const cleaned = String(name)
      .replace(/\bradio\s*105\b/ig, ' ')
      .replace(/\b105\s+network\b/ig, ' ')
      .replace(/\br\s*101\b/ig, ' ')
      .replace(/\bradio\s*101\b/ig, ' ')
      .replace(/\brtl\s*102\.?\s*5\b/ig, ' ');
    const m = cleaned.match(/\b(8[7-9]|9\d|10[0-8])(?:[.,](\d))?\b/);
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
  /* Solo progressivi: niente m3u8 nel percorso radio/spettro */
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
  const favicon = String(station.favicon || '').trim();
  const homepage = String(station.homepage || '').trim();
  return {
    name: String(station.name || 'Stazione').replace(/\s+/g, ' ').trim(),
    url,
    bitrate: Number(station.bitrate) || 0,
    codec: codec || 'MP3',
    votes: Number(station.votes) || 0,
    tags: station.tags || '',
    favicon: isPublicHttp(favicon) ? favicon : '',
    homepage: isPublicHttp(homepage) ? homepage : ''
  };
}

function place(list, bandSlots, band, pinFreq, pinTest) {
  const used = new Set();
  const out = [];
  /* Prima le reti con radiovisione, poi il resto */
  const pool = list.slice().sort((a, b) => {
    const va = videoForStation(a.name) ? 1 : 0;
    const vb = videoForStation(b.name) ? 1 : 0;
    if (vb !== va) return vb - va;
    return (b.votes || 0) - (a.votes || 0);
  });

  function push(station, freq) {
    used.add(freq);
    out.push(withVideo({
      name: station.name,
      url: station.url,
      freq,
      bitrate: station.bitrate || 0,
      codec: station.codec || 'MP3',
      favicon: station.favicon || '',
      homepage: station.homepage || ''
    }));
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
    const vidIdx = later.findIndex((s) => videoForStation(s.name));
    push(later.splice(vidIdx >= 0 ? vidIdx : 0, 1)[0], pinFreq);
  }
  /* Riempi gli slot liberi preferendo ancora chi ha video */
  later.sort((a, b) => {
    const va = videoForStation(a.name) ? 1 : 0;
    const vb = videoForStation(b.name) ? 1 : 0;
    return vb - va;
  });
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
    `${API}?countrycode=IT&tag=talk&hidebroken=true&order=votes&reverse=true&limit=20&lastcheckok=1`,
    /* Forza in pool le reti con radiovisione */
    `${API}?countrycode=IT&name=Virgin%20Radio&hidebroken=true&order=votes&reverse=true&limit=15&lastcheckok=1`,
    `${API}?countrycode=IT&name=Radio%20Monte%20Carlo&hidebroken=true&order=votes&reverse=true&limit=10&lastcheckok=1`,
    `${API}?countrycode=IT&name=Radio%20Deejay&hidebroken=true&order=votes&reverse=true&limit=8&lastcheckok=1`,
    `${API}?countrycode=IT&name=RTL%20102.5&hidebroken=true&order=votes&reverse=true&limit=8&lastcheckok=1`,
    `${API}?countrycode=IT&name=Radio%20Capital&hidebroken=true&order=votes&reverse=true&limit=8&lastcheckok=1`,
    `${API}?countrycode=IT&name=m2o&hidebroken=true&order=votes&reverse=true&limit=8&lastcheckok=1`,
    `${API}?countrycode=IT&name=RDS&hidebroken=true&order=votes&reverse=true&limit=8&lastcheckok=1`,
    `${API}?countrycode=IT&name=Radio%20Italia&hidebroken=true&order=votes&reverse=true&limit=8&lastcheckok=1`,
    `${API}?countrycode=IT&name=Radio%20Freccia&hidebroken=true&order=votes&reverse=true&limit=6&lastcheckok=1`,
    `${API}?countrycode=IT&name=Radio%20Zeta&hidebroken=true&order=votes&reverse=true&limit=6&lastcheckok=1`
  ];
  const batches = await Promise.all(queries.map((q) => fetchJSON(q).catch(() => [])));
  const raw = batches.flat().filter((s) => s && (s.lastcheckok === 1 || s.lastcheckok === true || s.lastcheckok == null));
  raw.sort((a, b) => {
    const va = videoForStation(a.name || '') ? 1 : 0;
    const vb = videoForStation(b.name || '') ? 1 : 0;
    if (vb !== va) return vb - va;
    return (b.votes || 0) - (a.votes || 0);
  });

  const resolved = [];
  const seenUrl = new Set();
  const seenName = new Set();
  const queue = raw.slice(0, 70);
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

  /* Seed reti radiovisione: sostituiscono eventuali URL API sbagliati (stesso brand) */
  for (const seed of SEED_MAINS) {
    const key = nameKey(seed.name);
    if (!key) continue;
    const vid = videoForStation(seed.name);
    let favicon = seed.favicon || '';
    let homepage = seed.homepage || '';
    for (let i = resolved.length - 1; i >= 0; i--) {
      const cur = resolved[i];
      const sameName = nameKey(cur.name) === key;
      const sameVid = vid && videoForStation(cur.name) === vid;
      if (!sameName && !sameVid) continue;
      if (!favicon && cur.favicon) favicon = cur.favicon;
      if (!homepage && cur.homepage) homepage = cur.homepage;
      seenName.delete(nameKey(cur.name));
      seenUrl.delete(cur.url);
      resolved.splice(i, 1);
    }
    seenName.add(key);
    seenUrl.add(seed.url);
    resolved.push({ ...seed, tags: 'seed', favicon, homepage });
  }

  /* Una sola stazione per ciascun flusso radiovisione */
  const byVideo = new Map();
  const noVideo = [];
  for (const s of resolved) {
    const v = videoForStation(s.name);
    if (!v) {
      noVideo.push(s);
      continue;
    }
    const prev = byVideo.get(v);
    if (!prev) {
      byVideo.set(v, s);
      continue;
    }
    const score = (x) => (x.tags === 'seed' ? 1e12 : 0) + (x.votes || 0) - String(x.name || '').length;
    if (score(s) > score(prev)) byVideo.set(v, s);
  }
  const unique = [...byVideo.values(), ...noVideo];

  const talk = unique.filter(isTalk);
  const music = unique.filter((s) => !isTalk(s));
  const fm = applyBrandFreqs(
    place(music.length ? music : unique, FM_SLOTS, 'fm', 100.3, (s) => /radio 105/i.test(s.name))
  );
  const am = place(talk.length ? talk : unique, AM_SLOTS, 'am', 810, (s) => /rai radio 1/i.test(s.name));
  if (fm.length < 4 || am.length < 1) return FALLBACK;
  return { fm: fm.map(withVideo), am: am.map(withVideo) };
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

function isHlsUrl(target) {
  return /\.m3u8(\?|#|$)/i.test(String(target || ''));
}

/* Master/media HLS → flusso AAC continuo (ADTS) per <audio> / MediaElement */
async function resolveHlsMediaPlaylist(url, depth = 0) {
  if (depth > 3) throw new Error('HLS troppo annidato');
  const text = await fetchText(url, 10000);
  if (/#EXT-X-STREAM-INF/i.test(text)) {
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      if (!/#EXT-X-STREAM-INF/i.test(lines[i])) continue;
      const next = String(lines[i + 1] || '').trim();
      if (!next || next.startsWith('#')) continue;
      return resolveHlsMediaPlaylist(new URL(next, url).href, depth + 1);
    }
    throw new Error('Nessuna variante HLS');
  }
  return { url, text };
}

function proxyHlsAsAac(masterUrl) {
  let cancelled = false;
  const stream = new ReadableStream({
    async start(controller) {
      const seen = [];
      const remember = (seg) => {
        seen.push(seg);
        if (seen.length > 48) seen.splice(0, seen.length - 48);
      };
      const known = () => new Set(seen);
      try {
        let first = true;
        while (!cancelled) {
          const media = await resolveHlsMediaPlaylist(masterUrl);
          const have = known();
          const lines = media.text.split(/\r?\n/);
          const pending = [];
          for (const line of lines) {
            const t = String(line || '').trim();
            if (!t || t.startsWith('#')) continue;
            const seg = new URL(t, media.url).href;
            if (have.has(seg)) continue;
            pending.push(seg);
          }
          /* Prima passata: salta i segmenti vecchi, suona solo gli ultimi → latch più rapido */
          let batch = pending;
          if (first && pending.length > 3) {
            for (const old of pending.slice(0, -3)) remember(old);
            batch = pending.slice(-3);
          }
          first = false;
          for (const seg of batch) {
            if (cancelled) break;
            remember(seg);
            const res = await fetch(seg, {
              headers: { 'User-Agent': UA, Accept: '*/*' },
              redirect: 'follow'
            });
            if (!res.ok) continue;
            const buf = new Uint8Array(await res.arrayBuffer());
            if (buf.length) controller.enqueue(buf);
          }
          await new Promise((r) => setTimeout(r, batch.length ? 700 : 400));
        }
      } catch (e) {
        try { controller.error(e); } catch (err) { /* già chiuso */ }
        return;
      }
      try { controller.close(); } catch (e) { /* ignore */ }
    },
    cancel() {
      cancelled = true;
    }
  });
  const headers = new Headers();
  headers.set('Content-Type', 'audio/aac');
  headers.set('Cache-Control', 'no-store');
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Headers', 'Range, Icy-MetaData');
  return new Response(stream, { status: 200, headers });
}

async function proxyStream(target, hops = 0) {
  if (hops > 5 || !isPublicHttp(target)) {
    return new Response('URL non consentito', { status: 400 });
  }
  if (isHlsUrl(target)) {
    try {
      return proxyHlsAsAac(target);
    } catch (e) {
      return new Response('HLS non raggiungibile', { status: 502 });
    }
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

  if (/application\/vnd\.apple\.mpegurl|application\/x-mpegURL|audio\/mpegurl/i.test(ct)) {
    try {
      return proxyHlsAsAac(target);
    } catch (e) {
      return new Response('HLS non raggiungibile', { status: 502 });
    }
  }

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
  headers.set('Access-Control-Allow-Headers', 'Range, Icy-MetaData');
  headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
  if (up.headers.get('accept-ranges')) headers.set('Accept-Ranges', up.headers.get('accept-ranges'));
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

function concatBytes(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function parseStreamTitle(metaText) {
  const m = String(metaText || '').match(/StreamTitle='([^']*)'/i);
  if (!m) return '';
  return m[1].replace(/\s+/g, ' ').trim();
}

async function sniffNowPlaying(target, hops = 0) {
  if (hops > 5 || !isPublicHttp(target) || isHlsUrl(target)) {
    return { title: '' };
  }
  let up;
  try {
    up = await fetch(target, {
      headers: {
        'User-Agent': UA,
        Accept: '*/*',
        'Accept-Encoding': 'identity',
        'Icy-MetaData': '1'
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(4500)
    });
  } catch (e) {
    return { title: '' };
  }

  if ([301, 302, 303, 307, 308].includes(up.status)) {
    const loc = up.headers.get('location');
    if (!loc) return { title: '' };
    return sniffNowPlaying(new URL(loc, target).href, hops + 1);
  }
  if (up.status >= 400 || !up.body) return { title: '' };

  const ct = String(up.headers.get('content-type') || '');
  if (/mpegurl|m3u8|text\/html|json|xml/i.test(ct)) {
    try { await up.body.cancel(); } catch (e) { /* ignore */ }
    return { title: '' };
  }

  const metaint = parseInt(up.headers.get('icy-metaint') || '0', 10);
  if (!Number.isFinite(metaint) || metaint < 16 || metaint > 128000) {
    try { await up.body.cancel(); } catch (e) { /* ignore */ }
    return { title: '' };
  }

  const reader = up.body.getReader();
  let buf = new Uint8Array(0);
  const hardCap = metaint + 1 + 4096;
  try {
    while (buf.length < hardCap) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      buf = concatBytes(buf, value);
      if (buf.length > metaint) {
        const metaLen = buf[metaint] * 16;
        if (buf.length >= metaint + 1 + metaLen) break;
      }
    }
  } catch (e) {
    return { title: '' };
  } finally {
    try { await reader.cancel(); } catch (e) { /* ignore */ }
  }

  if (buf.length <= metaint) return { title: '' };
  const metaLen = buf[metaint] * 16;
  if (!metaLen || buf.length < metaint + 1 + metaLen) return { title: '' };
  const metaBytes = buf.subarray(metaint + 1, metaint + 1 + metaLen);
  const metaText = new TextDecoder('latin1').decode(metaBytes);
  return { title: parseStreamTitle(metaText) };
}

async function proxyLogo(target) {
  if (!isPublicHttp(target) || target.length > 2000) {
    return new Response('Logo non consentito', { status: 400 });
  }
  let up;
  try {
    up = await fetch(target, {
      headers: { 'User-Agent': UA, Accept: 'image/*,*/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000)
    });
  } catch (e) {
    return new Response('Logo non raggiungibile', { status: 502 });
  }
  if (!up.ok) return new Response('Logo non raggiungibile', { status: 502 });
  const ct = String(up.headers.get('content-type') || '');
  if (ct && !/^image\//i.test(ct) && !/octet-stream/i.test(ct)) {
    return new Response('Non è un’immagine', { status: 415 });
  }
  const headers = new Headers();
  headers.set('Content-Type', ct || 'image/png');
  headers.set('Cache-Control', 'public, max-age=86400');
  headers.set('Access-Control-Allow-Origin', '*');
  return new Response(up.body, { status: 200, headers });
}

function remoteStub(env) {
  return env.REMOTE_HUB.get(env.REMOTE_HUB.idFromName('mytuner-global'));
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

    if (url.pathname === '/api/remote/radios') {
      return remoteStub(env).fetch(new Request('https://remote/list', request));
    }

    if (url.pathname === '/api/remote/vapid' || url.pathname === '/api/remote/vapid-public') {
      return json({ publicKey: env.VAPID_PUBLIC_KEY || '' });
    }

    if (url.pathname === '/api/remote/ws') {
      return remoteStub(env).fetch(request);
    }

    if (url.pathname === '/control' || url.pathname === '/control/') {
      return env.ASSETS.fetch(new Request(new URL('/control/index.html', url), request));
    }

    if (url.pathname === '/api/stations') {
      const dial = await getDial(env);
      return json(dial);
    }

    if (url.pathname === '/api/nowplaying') {
      const target = url.searchParams.get('u') || '';
      if (!target || target.length > 2000) return json({ title: '' });
      const data = await sniffNowPlaying(target, 0);
      return json(data);
    }

    if (url.pathname === '/api/artwork') {
      const q = String(url.searchParams.get('q') || '').trim().slice(0, 120);
      if (!q) return json({ art: '' });
      const hdr = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json'
      };
      let art = '';
      try {
        const itunes = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=5&country=IT`;
        const res = await fetch(itunes, { headers: hdr, signal: AbortSignal.timeout(8000) });
        if (res.ok) {
          const data = await res.json();
          const hit = (data?.results || []).find((r) => r?.artworkUrl100 || r?.artworkUrl60);
          const raw = hit?.artworkUrl100 || hit?.artworkUrl60 || '';
          art = String(raw || '').replace(/\/\d+x\d+bb(\.[a-z]+)$/i, '/200x200bb$1');
        }
      } catch (e) { /* prova Deezer */ }
      if (!art) {
        try {
          const deezer = `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=3`;
          const res = await fetch(deezer, { headers: hdr, signal: AbortSignal.timeout(8000) });
          if (res.ok) {
            const data = await res.json();
            const hit = (data?.data || []).find((r) => r?.album?.cover_medium || r?.album?.cover);
            art = String(hit?.album?.cover_medium || hit?.album?.cover || hit?.album?.cover_big || '');
          }
        } catch (e) { /* ignore */ }
      }
      return json({ art: isPublicHttp(art) ? art : '' });
    }

    if (url.pathname === '/logo') {
      const target = url.searchParams.get('u') || '';
      return proxyLogo(target);
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
