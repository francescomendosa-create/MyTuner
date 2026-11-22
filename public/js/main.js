const APP_VERSION = 'v227';

/* Hub remoto: in APK/offline gli asset sono locali (Capacitor), API/stream restano sul worker */
const HUB_ORIGIN = (() => {
  try {
    const h = String(location.hostname || '').toLowerCase();
    if (h === 'mytuner.mytunerfr.workers.dev' || h.endsWith('.mytunerfr.workers.dev')) {
      return location.origin;
    }
  } catch (e) { /* ignore */ }
  return 'https://mytuner.mytunerfr.workers.dev';
})();

function hubUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  try {
    if (location.origin === HUB_ORIGIN) return p;
  } catch (e) { /* ignore */ }
  return HUB_ORIGIN + p;
}

const FM = { min: 87.5, max: 108, win: 0.34, turn: 6 };
const AM = { min: 520, max: 1620, win: 18, turn: 170 };

const SPEC = [
  { hz: 63, label: '63Hz' },
  { hz: 100, label: '100Hz' },
  { hz: 160, label: '160Hz' },
  { hz: 250, label: '250Hz' },
  { hz: 500, label: '500Hz' },
  { hz: 1000, label: '1kHz' },
  { hz: 2000, label: '2kHz' },
  { hz: 4000, label: '4kHz' },
  { hz: 8000, label: '8kHz' },
  { hz: 16000, label: '16kHz' }
];

/*
  Radiovisione = stesso segnale HLS (A+V) della rete principale.
  Spin-off (Rock 70, Hits, HipHop, RMC 80…) esclusi.
*/
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
  { re: /^radio\s*zeta\b/i, video: 'https://dd782ed59e2a4e86aabf6fc508674b59.msvdn.net/live/S9346184/XEx1LqlYbNic/playlist_video.m3u8' },
  { re: /^rds(\s*100%?\s*grandi\s*successi)?(\s+social(\s+tv)?)?$|^rds\s*[-–]\s*radio\s*dimensione\s*suono$/i, video: 'https://stream.rdstv.radio/index.m3u8' },
  { re: /^radio\s*italia(\s+solo\s+musica\s+italiana)?$/i, video: 'https://radioitaliatv.akamaized.net/hls/live/2093117/RadioitaliaTV/master.m3u8' },
  { re: /^radio\s*kiss\s*kiss$/i, video: 'https://kk.fluid.stream/KKMulti/smil:KissKissTV.smil/playlist.m3u8' },
  { re: /^radio\s*ibiza$/i, video: 'https://5929b138b139d.streamlock.net/RadioIbizaTV/livestream/playlist.m3u8' }
];

const VIDEO_ZOO = 'https://live02-col.msr.cdn.mediaset.net/live/ch-r1/r1-clr.isml/index.m3u8';
/* rock '70/'80: \d{2} altrimenti \b dopo una cifra fallisce su "70" */
const VIDEO_SPINOFF_RE = /\b(classic|ballads?|hits?|hip\s*hop|r'?n'?b|rock\s*'?\d{2}|love\s*songs?|buddha|dance|italia\s*\d|relax|next|napoli|originals|funky|disco|miami|rap|anni\s*\d|sanremo|trend|history|latina|groove|news|best)\b|\brmc\s+(?!radio\b)|\bradio\s*monte\s*carlo\s+(?!fm\b)\S|105\s*[-–]\s*(?!zoo)/i;

function videoForStation(name) {
  const n = String(name || '').replace(/\s+/g, ' ').trim();
  if (!n) return '';
  /* Lo Zoo: stream dedicato (non 105 TV videoclip) */
  if (/105/i.test(n) && /zoo/i.test(n)) return VIDEO_ZOO;
  if (VIDEO_SPINOFF_RE.test(n)) return '';
  for (const row of VIDEO_BY_NAME) {
    if (row.re.test(n)) return row.video;
  }
  return '';
}

/* Audio ufficiale rete principale (mai URL API/spin-off appiccicati al nome) */
const AUDIO_BY_NAME = [
  { re: /^(radio\s*)?105(\s+network)?$/i, url: 'https://icecast.unitedradio.it/Radio105.mp3' },
  { re: /^virgin\s*radio(\s+italia)?$/i, url: 'https://icecast.unitedradio.it/Virgin.mp3' },
  { re: /^(r\s*101|radio\s*101)(\s*(fm|radio))?$/i, url: 'https://icecast.unitedradio.it/r101' },
  { re: /^(rmc\s+)?radio\s*monte\s*carlo(\s+fm)?$|^rmc$/i, url: 'https://icecast.unitedradio.it/RMC.mp3' },
  { re: /^radio\s*kiss\s*kiss$/i, url: 'https://ice07.fluidstream.net/KissKiss.aac' },
  { re: /^radio\s*ibiza$/i, url: 'http://wma08.fluidstream.net:5010/;stream.aac' },
  /* RDS: AAC64 HLS (leggero) — l’Icecast 256k apriva troppo lento */
  { re: /^rds(\s*100%?\s*grandi\s*successi)?(\s+social(\s+tv)?)?$|^rds\s*[-–]\s*radio\s*dimensione\s*suono$/i, url: 'https://stream.rds.radio/audio/rds.stream_aac64/playlist.m3u8' },
  { re: /^rtl\s*102\.?\s*5$/i, url: 'https://stream.rcast.net/210096' },
  { re: /^radio\s*freccia$/i, url: 'https://dd782ed59e2a4e86aabf6fc508674b59.msvdn.net/live/S3160845/0tuSetc8UFkF/playlist_audio.m3u8' },
  /* Zeta: HLS CDN (Shoutcast da worker spesso non apre) */
  { re: /^radio\s*zeta\b/i, url: 'https://streamcdnb1-dd782ed59e2a4e86aabf6fc508674b59.msvdn.net/live/S9346184/XEx1LqlYbNic/playlist_audio.m3u8' },
  { re: /^radio\s*marte$/i, url: 'https://stream1.xdevel.com/audio0s975753-313/stream/icecast.audio' },
  { re: /^fm\s*italia$/i, url: 'https://stream5.xdevel.com/audio1s975817-360/stream/icecast.audio' },
  { re: /^(rsc|r\.?\s*s\.?\s*c\.?|rts)(\s*[-–]\s*)?(radio\s*)?studio\s*centrale$/i, url: 'https://stream.studiocentrale.it/radio/8020/radio.mp3' },
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

function withVideo(station) {
  if (!station) return station;
  const audio = audioForStation(station.name);
  const video = station.video || videoForStation(station.name);
  const next = audio ? { ...station, url: audio } : { ...station };
  return video ? { ...next, video } : next;
}

/* MHz locali: Siracusa/Augusta di default; Milano se GPS/zona lo dicono */
const ZONE_FREQ_ROWS = {
  siracusa: [
    { re: /^(radio\s*)?105(\s+network)?$/i, freq: 100.3 },
    { re: /^virgin\s*radio(\s+italia)?$/i, freq: 88.8 },
    { re: /^(r\s*101|radio\s*101)(\s*(fm|radio))?$/i, freq: 92.7 },
    { re: /^(rmc\s+)?radio\s*monte\s*carlo(\s+fm)?$|^rmc$/i, freq: 91.8 },
    { re: /^radio\s*deejay$/i, freq: 95.6 },
    { re: /^(gedi\s*[-–]\s*)?radio\s*capital$/i, freq: 100.4 },
    { re: /^m\s*2\s*o(\s+radio)?$|^m2o$/i, freq: 97.7 },
    { re: /^rtl\s*102\.?\s*5$/i, freq: 102.7 },
    { re: /^radio\s*freccia$/i, freq: 103.0 },
    /* Zeta e RDS più distanti: con win 0.34 a ~0.5 MHz c’era zona morta */
    { re: /^radio\s*zeta\b/i, freq: 101.4 },
    { re: /^rds(\s*100%?\s*grandi\s*successi)?(\s+social(\s+tv)?)?$|^rds\s*[-–]\s*radio\s*dimensione\s*suono$/i, freq: 100.5 },
    { re: /^radio\s*italia(\s+solo\s+musica\s+italiana)?$/i, freq: 93.5 },
    { re: /^radio\s*kiss\s*kiss$/i, freq: 98.4 },
    { re: /^radio\s*ibiza$/i, freq: 96.3 },
    { re: /^radio\s*marte$/i, freq: 93.6 },
    /* Lontana da Zeta: prima a 101.1 rubava il lock */
    { re: /^fm\s*italia$/i, freq: 99.5 },
    { re: /^(rsc|r\.?\s*s\.?\s*c\.?|rts)(\s*[-–]\s*)?(radio\s*)?studio\s*centrale$/i, freq: 104.3 },
    { re: /^radio\s*studio\s*centrale$/i, freq: 104.3 }
  ],
  milano: [
    { re: /^(radio\s*)?105(\s+network)?$/i, freq: 98.1 },
    { re: /^virgin\s*radio(\s+italia)?$/i, freq: 104.5 },
    { re: /^(r\s*101|radio\s*101)(\s*(fm|radio))?$/i, freq: 101.0 },
    { re: /^(rmc\s+)?radio\s*monte\s*carlo(\s+fm)?$|^rmc$/i, freq: 105.3 },
    { re: /^radio\s*deejay$/i, freq: 99.7 },
    { re: /^(gedi\s*[-–]\s*)?radio\s*capital$/i, freq: 90.1 },
    { re: /^m\s*2\s*o(\s+radio)?$|^m2o$/i, freq: 91.7 },
    { re: /^rtl\s*102\.?\s*5$/i, freq: 102.5 },
    { re: /^radio\s*freccia$/i, freq: 91.0 },
    { re: /^radio\s*zeta\b/i, freq: 103.0 },
    { re: /^rds(\s*100%?\s*grandi\s*successi)?(\s+social(\s+tv)?)?$|^rds\s*[-–]\s*radio\s*dimensione\s*suono$/i, freq: 94.4 },
    { re: /^radio\s*italia(\s+solo\s+musica\s+italiana)?$/i, freq: 106.5 },
    { re: /^radio\s*kiss\s*kiss$/i, freq: 97.6 },
    { re: /^radio\s*ibiza$/i, freq: 95.5 }
  ]
};

const ZONE_CENTERS = [
  { id: 'siracusa', label: 'Siracusa', lat: 37.0755, lon: 15.2866 },
  { id: 'milano', label: 'Milano', lat: 45.4642, lon: 9.1900 }
];

const ZONE_KEY = 'radio-zone-v1';
const GEO_ASKED_KEY = 'radio-geo-asked-v1';
const RADIO_MARTE = {
  name: 'Radio Marte',
  url: 'https://stream1.xdevel.com/audio0s975753-313/stream/icecast.audio',
  bitrate: 128,
  codec: 'MP3'
};
const FM_ITALIA = {
  name: 'FM Italia',
  url: 'https://stream5.xdevel.com/audio1s975817-360/stream/icecast.audio',
  bitrate: 128,
  codec: 'MP3'
};
const RADIO_RSC = {
  name: 'RSC - Radio Studio Centrale',
  url: 'https://stream.studiocentrale.it/radio/8020/radio.mp3',
  bitrate: 192,
  codec: 'MP3'
};

function readSavedZone() {
  try {
    const id = localStorage.getItem(ZONE_KEY);
    if (id && ZONE_FREQ_ROWS[id]) return id;
  } catch (e) { /* ignore */ }
  return 'siracusa';
}

let activeZoneId = readSavedZone();

function zoneFreqRows() {
  return ZONE_FREQ_ROWS[activeZoneId] || ZONE_FREQ_ROWS.siracusa;
}

function brandFreq(name) {
  const n = String(name || '').replace(/\s+/g, ' ').trim();
  if (!n || VIDEO_SPINOFF_RE.test(n)) return null;
  if (/105/i.test(n) && /zoo/i.test(n)) return 99.0;
  for (const row of zoneFreqRows()) {
    if (row.re.test(n)) return row.freq;
  }
  return null;
}

function applyBrandFreqs(list) {
  return list.map((s) => {
    const f = brandFreq(s.name);
    return f != null ? { ...s, freq: f } : s;
  }).sort((a, b) => a.freq - b.freq);
}

function ensureNamedStation(list, station, re) {
  const has = (list || []).some((s) => re.test(String(s.name || '').replace(/\s+/g, ' ').trim()));
  if (has) return list;
  return [...list, withVideo({ ...station })];
}

function ensureLocalStations(list) {
  let next = ensureNamedStation(list, RADIO_MARTE, /^radio\s*marte$/i);
  next = ensureNamedStation(next, FM_ITALIA, /^fm\s*italia$/i);
  next = ensureNamedStation(next, RADIO_RSC, /studio\s*centrale|^rsc\b|^rts\b/i);
  return next;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function nearestZoneId(lat, lon) {
  let best = ZONE_CENTERS[0];
  let dist = Infinity;
  for (const z of ZONE_CENTERS) {
    const d = haversineKm(lat, lon, z.lat, z.lon);
    if (d < dist) {
      dist = d;
      best = z;
    }
  }
  return best;
}

function setZone(id, { announce } = {}) {
  if (!ZONE_FREQ_ROWS[id] || id === activeZoneId) return false;
  const prev = state.locked || nearest().station;
  activeZoneId = id;
  try { localStorage.setItem(ZONE_KEY, id); } catch (e) { /* ignore */ }
  catalog.fm = applyBrandFreqs(ensureLocalStations(catalog.fm.map((s) => withVideo({ ...s }))));
  rebuildDialForMode();
  const match = findDialMatch(prev) || stations.fm[0] || null;
  if (match) {
    state.band = 'fm';
    state.fm = match.freq;
    state.locked = state.power && !state.stopped ? match : null;
  } else {
    state.locked = null;
  }
  paintDial();
  showLockedName();
  if (state.power && !state.stopped && match && !isTvMode()) catchStation(match);
  else if (state.power && !state.stopped) settleTune();
  if (announce) {
    const label = ZONE_CENTERS.find((z) => z.id === id)?.label || id;
    flash(label, true);
  }
  return true;
}

function requestZoneFromGps() {
  if (!navigator.geolocation) {
    refreshLocaleFromZone();
    return;
  }
  let asked = false;
  try { asked = localStorage.getItem(GEO_ASKED_KEY) === '1'; } catch (e) { /* ignore */ }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      try { localStorage.setItem(GEO_ASKED_KEY, '1'); } catch (e) { /* ignore */ }
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const z = nearestZoneId(lat, lon);
      if (z?.id) setZone(z.id, { announce: true });
      /* Città meteo = GPS reale (Augusta), non etichetta zona dial “Siracusa” */
      refreshLocaleWeather(lat, lon);
    },
    () => {
      try { localStorage.setItem(GEO_ASKED_KEY, '1'); } catch (e) { /* ignore */ }
      refreshLocaleFromZone();
    },
    { enableHighAccuracy: true, maximumAge: 5 * 60 * 1000, timeout: asked ? 8000 : 12000 }
  );
}

const WX_SVG = {
  sun: '<svg viewBox="0 0 24 24" fill="none"><g class="wx-orb"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><g stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/></g></g></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="currentColor"><g class="wx-orb"><path d="M15.2 3.1a8.6 8.6 0 1 0 5.7 14.8A7.2 7.2 0 0 1 15.2 3.1z"/></g></svg>',
  cloud: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.2 18.4h9.1a4.1 4.1 0 0 0 .4-8.2 5.5 5.5 0 0 0-10.5 1.6A3.6 3.6 0 0 0 8.2 18.4z"/></svg>',
  'part-sun': '<svg viewBox="0 0 24 24" fill="none"><g class="wx-orb"><circle cx="9.2" cy="9" r="3.1" fill="currentColor"/><g stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M9.2 2.8v1.7M2.8 9h1.7M4.4 4.4l1.2 1.2M14 4.4l-1.2 1.2"/></g></g><path fill="currentColor" d="M9.4 19h8.4a3.7 3.7 0 0 0 .3-7.4 4.9 4.9 0 0 0-9.2 1.2A3.3 3.3 0 0 0 9.4 19z"/></svg>',
  'part-moon': '<svg viewBox="0 0 24 24" fill="currentColor"><g class="wx-orb"><path d="M13.6 3.4a6.4 6.4 0 0 0 4.4 11.1 5.4 5.4 0 1 1-4.4-11.1z"/></g><path d="M9.2 19h8.4a3.7 3.7 0 0 0 .3-7.4 4.6 4.6 0 0 0-2.8-4.1 6.6 6.6 0 0 1-1.4 7.2A3.3 3.3 0 0 0 9.2 19z"/></svg>',
  rain: '<svg viewBox="0 0 24 24" fill="none"><path fill="currentColor" d="M7.8 14.2h9a3.7 3.7 0 0 0 .3-7.4A5 5 0 0 0 7.6 8a3.3 3.3 0 0 0 .2 6.2z"/><g stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M9 16.4v2.4M12.2 16.8v2.6M15.4 16.4v2.4"/></g></svg>',
  storm: '<svg viewBox="0 0 24 24" fill="none"><path fill="currentColor" d="M7.8 13.6h9a3.7 3.7 0 0 0 .3-7.4A5 5 0 0 0 7.6 7.4a3.3 3.3 0 0 0 .2 6.2z"/><path fill="currentColor" d="M13.1 12.8 10 18.2h2.2l-1.1 3.6 4.1-5.8h-2.3z"/></svg>',
  snow: '<svg viewBox="0 0 24 24" fill="none"><path fill="currentColor" d="M7.8 14h9a3.7 3.7 0 0 0 .3-7.4A5 5 0 0 0 7.6 7.8a3.3 3.3 0 0 0 .2 6.2z"/><g stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M9.2 16.2v2.2M12.2 16.6v2.4M15.2 16.2v2.2M8.4 17.4h1.6M11.4 18h1.6M14.4 17.4h1.6"/></g></svg>',
  fog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 9.2h12.5M6.2 12h13M4.8 14.8h11.2M7.5 17.5h9"/></svg>'
};

function wxFromCode(code, isDay) {
  const c = Number(code);
  const day = Boolean(isDay);
  if (c === 0) return { icon: day ? 'sun' : 'moon', label: day ? 'Soleggiato' : 'Sereno' };
  if (c === 1) return { icon: day ? 'sun' : 'moon', label: day ? 'Preval. sereno' : 'Poco nuvoloso' };
  if (c === 2) return { icon: day ? 'part-sun' : 'part-moon', label: 'Parz. nuvoloso' };
  if (c === 3) return { icon: 'cloud', label: 'Nuvoloso' };
  if (c === 45 || c === 48) return { icon: 'fog', label: 'Nebbia' };
  if (c >= 51 && c <= 57) return { icon: 'rain', label: 'Pioviggine' };
  if (c >= 61 && c <= 67) return { icon: 'rain', label: 'Pioggia' };
  if (c >= 71 && c <= 77) return { icon: 'snow', label: 'Neve' };
  if (c >= 80 && c <= 82) return { icon: 'rain', label: 'Rovesci' };
  if (c >= 85 && c <= 86) return { icon: 'snow', label: 'Neve' };
  if (c >= 95 && c <= 99) return { icon: 'storm', label: 'Temporale' };
  return { icon: day ? 'part-sun' : 'part-moon', label: 'Variabile' };
}

let localeWxTimer = 0;
let localeWxCoords = null;
let localeWxTempC = null;
let wxFlairTimer = 0;
let wxFlairClearTimer = 0;

function localeDateLabel(now = new Date()) {
  const days = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  return `${days[now.getDay()]} ${now.getDate()}`;
}

function stopWxFlair() {
  window.clearTimeout(wxFlairTimer);
  window.clearTimeout(wxFlairClearTimer);
  wxFlairTimer = 0;
  wxFlairClearTimer = 0;
  const glyph = document.getElementById('wxGlyph');
  const cityEl = document.getElementById('wxCity');
  glyph?.classList.remove('is-bob');
  cityEl?.classList.remove('is-drift');
}

function playWxFlair() {
  if (!state.power || document.hidden) return;
  const root = document.getElementById('localeWx');
  const glyph = document.getElementById('wxGlyph');
  const cityEl = document.getElementById('wxCity');
  if (!root || root.hidden) return;
  const hasOrb = Boolean(glyph?.querySelector('.wx-orb'));
  const doBob = hasOrb && Math.random() < 0.78;
  const doCity = Boolean(cityEl) && Math.random() < 0.72;
  if (!doBob && !doCity) return;
  if (doBob && glyph) {
    glyph.classList.remove('is-bob');
    void glyph.offsetWidth;
    glyph.classList.add('is-bob');
  }
  if (doCity && cityEl) {
    cityEl.classList.remove('is-drift');
    void cityEl.offsetWidth;
    cityEl.classList.add('is-drift');
  }
  window.clearTimeout(wxFlairClearTimer);
  wxFlairClearTimer = window.setTimeout(() => {
    glyph?.classList.remove('is-bob');
    cityEl?.classList.remove('is-drift');
  }, 1600);
}

function scheduleWxFlair(afterMs) {
  window.clearTimeout(wxFlairTimer);
  if (!state.power || isIOS) {
    wxFlairTimer = 0;
    return;
  }
  const wait = afterMs != null ? afterMs : (6000 + Math.random() * 12000);
  wxFlairTimer = window.setTimeout(() => {
    wxFlairTimer = 0;
    if (!state.power) return;
    playWxFlair();
    scheduleWxFlair();
  }, wait);
}

const CITY_ABBR = {
  siracusa: 'SR',
  augusta: 'AG',
  melilli: 'ME',
  'priolo gargallo': 'PG',
  priolo: 'PG',
  catania: 'CT',
  milano: 'MI'
};

function abbreviateCityName(name) {
  const n = String(name || '').trim();
  if (!n) return '';
  const key = n.toLowerCase().replace(/\s+/g, ' ');
  if (CITY_ABBR[key]) return CITY_ABBR[key];
  const parts = key.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return n.slice(0, 2).toUpperCase();
}

function syncDigitalClockCity(name) {
  const el = document.getElementById('digitalClockCity');
  if (!el) return;
  const full = String(name || '').trim();
  const abbr = abbreviateCityName(full);
  /* Slot fisso: se manca la città resta il placeholder, non si compatta la riga */
  el.textContent = abbr || '——';
  el.title = full || '';
  el.hidden = false;
  el.classList.toggle('is-empty', !abbr);
}

function syncDigitalClockDate(now = new Date()) {
  const el = document.getElementById('digitalClockDate');
  if (!el) return;
  el.textContent = formatDigitalClockDate(now);
}

function paintLocaleWx(city, icon, label) {
  const root = document.getElementById('localeWx');
  const glyph = document.getElementById('wxGlyph');
  const cityEl = document.getElementById('wxCity');
  const condEl = document.getElementById('wxCond');
  const dateEl = document.getElementById('wxDate');
  if (!root || !glyph || !cityEl || !condEl) return;
  const name = String(city || '').trim();
  if (!name) {
    root.hidden = true;
    syncDigitalClockCity('');
    return;
  }
  cityEl.textContent = name;
  syncDigitalClockCity(name);
  condEl.textContent = String(label || '').trim();
  if (dateEl) dateEl.textContent = localeDateLabel();
  glyph.classList.remove('is-bob');
  cityEl.classList.remove('is-drift');
  glyph.innerHTML = WX_SVG[icon] || WX_SVG.cloud;
  root.hidden = false;
  try {
    const el = document.getElementById('digitalTemp');
    if (el && Number.isFinite(localeWxTempC)) {
      el.textContent = formatDigitalTemp(localeWxTempC);
    }
  } catch (e) { /* ignore */ }
}

/* Comuni locali: la zona dial “siracusa” serve alle MHz, non al nome meteo */
const LOCALE_TOWNS = [
  { name: 'Augusta', lat: 37.2308, lon: 15.2213 },
  { name: 'Siracusa', lat: 37.0755, lon: 15.2866 },
  { name: 'Melilli', lat: 37.179, lon: 15.123 },
  { name: 'Priolo Gargallo', lat: 37.158, lon: 15.183 },
  { name: 'Catania', lat: 37.5079, lon: 15.083 },
  { name: 'Milano', lat: 45.4642, lon: 9.19 }
];

function nearestTownName(lat, lon, maxKm = 24) {
  let best = null;
  let dist = Infinity;
  for (const t of LOCALE_TOWNS) {
    const d = haversineKm(lat, lon, t.lat, t.lon);
    if (d < dist) {
      dist = d;
      best = t;
    }
  }
  return best && dist <= maxKm ? best.name : '';
}

async function reverseCityName(lat, lon) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=it`;
    const res = await fetch(url, { cache: 'default' });
    if (!res.ok) return '';
    const data = await res.json();
    const admins = data?.localityInfo?.administrative || [];
    const comune = [...admins].reverse().find((a) =>
      a?.adminLevel === 8 || /comune/i.test(String(a?.description || ''))
    );
    return String(
      comune?.name
      || data?.locality
      || data?.city
      || data?.principalSubdivision
      || ''
    ).trim();
  } catch (e) {
    return '';
  }
}

async function resolvePlaceName(lat, lon) {
  const near = nearestTownName(lat, lon);
  const remote = await reverseCityName(lat, lon);
  /* Preferisci il comune vicino (Augusta) se l’API dà solo la provincia Siracusa */
  if (near && (!remote || /^siracusa$/i.test(remote) && !/^siracusa$/i.test(near))) return near;
  return remote || near || '';
}

async function fetchOpenMeteo(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current=weather_code,is_day,temperature_2m&timezone=auto`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(String(res.status));
  const data = await res.json();
  return {
    code: data?.current?.weather_code,
    isDay: data?.current?.is_day === 1,
    tempC: Number(data?.current?.temperature_2m)
  };
}

function localeFallbackPlace(lat, lon, cityHint) {
  const hint = String(cityHint || '').trim();
  if (hint) return hint;
  const near = nearestTownName(lat, lon, 80);
  if (near) return near;
  const z = ZONE_CENTERS.find((row) => row.id === activeZoneId) || ZONE_CENTERS[0];
  return String(z?.label || LOCALE_TOWNS[0]?.name || '').trim();
}

async function refreshLocaleWeather(lat, lon, cityHint) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
  localeWxCoords = { lat, lon };
  window.clearTimeout(localeWxTimer);
  localeWxTimer = window.setTimeout(() => {
    if (localeWxCoords) refreshLocaleWeather(localeWxCoords.lat, localeWxCoords.lon);
  }, 30 * 60 * 1000);
  /* Mostra subito un placeholder così non resta nascosto se l’API è lenta/fail */
  const early = localeFallbackPlace(lat, lon, cityHint);
  if (early) paintLocaleWx(early, 'cloud', '…');
  try {
    const [city, wx] = await Promise.all([
      cityHint ? Promise.resolve(cityHint) : resolvePlaceName(lat, lon),
      fetchOpenMeteo(lat, lon)
    ]);
    const mapped = wxFromCode(wx.code, wx.isDay);
    const place = localeFallbackPlace(lat, lon, city || cityHint);
    localeWxTempC = Number.isFinite(wx.tempC) ? wx.tempC : null;
    window.__mytunerWxTempC = localeWxTempC;
    paintLocaleWx(place, mapped.icon, mapped.label);
    try { tickRadioClock(); } catch (e2) { /* ignore */ }
  } catch (e) {
    const place = localeFallbackPlace(lat, lon, cityHint);
    if (place) paintLocaleWx(place, 'cloud', '');
  }
}

function refreshLocaleFromZone() {
  const z = ZONE_CENTERS.find((row) => row.id === activeZoneId) || ZONE_CENTERS[0];
  if (!z) return;
  /* Niente etichetta zona forzata: aspetta GPS o comune più vicino alle coord */
  refreshLocaleWeather(z.lat, z.lon, z.label);
}

const FALLBACK = {
  fm: applyBrandFreqs(ensureLocalStations([
    { name: 'Radio 105 Network', url: 'https://icecast.unitedradio.it/Radio105.mp3' },
    { name: 'Virgin Radio', url: 'https://icecast.unitedradio.it/Virgin.mp3' },
    { name: 'R101', url: 'https://icecast.unitedradio.it/r101' },
    { name: 'Radio Monte Carlo', url: 'https://icecast.unitedradio.it/RMC.mp3' },
    { name: 'Radio Kiss Kiss', url: 'https://ice07.fluidstream.net/KissKiss.aac' },
    { name: 'Radio Ibiza', url: 'http://wma08.fluidstream.net:5010/;stream.aac' },
    { name: 'RDS', url: 'https://stream.rds.radio/audio/rds.stream_aac64/playlist.m3u8' },
    { name: 'RTL 102.5', url: 'https://stream.rcast.net/210096' },
    { name: 'Radio Freccia', url: 'https://dd782ed59e2a4e86aabf6fc508674b59.msvdn.net/live/S3160845/0tuSetc8UFkF/playlist_audio.m3u8' },
    { name: 'Radio Zeta', url: 'https://streamcdnb1-dd782ed59e2a4e86aabf6fc508674b59.msvdn.net/live/S9346184/XEx1LqlYbNic/playlist_audio.m3u8' },
    { ...RADIO_MARTE },
    { ...FM_ITALIA },
    { ...RADIO_RSC }
  ].map(withVideo))),
  am: [
    { name: 'Rai Radio 1', url: 'http://icestreaming.rai.it/1.mp3', freq: 810 },
    { name: 'Radio 24', url: 'http://shoutcast2.radio24.it:8000/;', freq: 900 }
  ].map(withVideo)
};
/*
  Dial TV = stesse MHz del gemello radio nella zona attiva.
*/
const TV_CHANNEL_DEFS = [
  { name: 'Radio Capital TV', video: 'https://4c4b867c89244861ac216426883d1ad0.msvdn.net/live/S35394734/Z6U2wGoDYANk/playlist.m3u8' },
  { name: 'Radio Freccia TV', video: 'https://dd782ed59e2a4e86aabf6fc508674b59.msvdn.net/live/S3160845/0tuSetc8UFkF/playlist_video.m3u8' },
  { name: 'm2o TV', video: 'https://4c4b867c89244861ac216426883d1ad0.msvdn.net/live/S62628868/uhdWBlkC1AoO/playlist.m3u8' },
  { name: 'RDS Social TV', video: 'https://stream.rdstv.radio/index.m3u8' },
  { name: 'Radio Ibiza TV', video: 'https://5929b138b139d.streamlock.net/RadioIbizaTV/livestream/playlist.m3u8' },
  { name: 'Radio Kiss Kiss TV', video: 'https://kk.fluid.stream/KKMulti/smil:KissKissTV.smil/playlist.m3u8' },
  { name: 'Radio 105 TV', video: 'https://live02-col.msr.cdn.mediaset.net/live/ch-ec/ec-clr.isml/index.m3u8' },
  { name: '105 Zoo TV', video: VIDEO_ZOO },
  { name: 'Radio Deejay TV', video: 'https://4c4b867c89244861ac216426883d1ad0.msvdn.net/live/S85984808/sMO0tz9Sr2Rk/playlist.m3u8' },
  { name: 'R101 TV', video: 'https://live02-col.msr.cdn.mediaset.net/live/ch-er/er-clr.isml/index.m3u8' },
  { name: 'RTL 102.5 TV', video: 'https://dd782ed59e2a4e86aabf6fc508674b59.msvdn.net/live/S97044836/tbbP8T1ZRPBL/playlist_video.m3u8' },
  { name: 'Radio Zeta TV', video: 'https://dd782ed59e2a4e86aabf6fc508674b59.msvdn.net/live/S9346184/XEx1LqlYbNic/playlist_video.m3u8' },
  { name: 'Virgin Radio TV', video: 'https://live02-col.msr.cdn.mediaset.net/live/ch-ew/ew-clr.isml/index.m3u8' },
  { name: 'Radio Monte Carlo TV', video: 'https://live02-col.msr.cdn.mediaset.net/live/ch-bb/bb-clr.isml/index.m3u8' },
  { name: 'Radio Italia TV', video: 'https://radioitaliatv.akamaized.net/hls/live/2093117/RadioitaliaTV/master.m3u8' }
];

function tvDial() {
  return TV_CHANNEL_DEFS.map((s) => {
    const base = String(s.name || '').replace(/\s+TV$/i, '').trim();
    const freq = brandFreq(base) ?? brandFreq(s.name) ?? 99.0;
    return { ...s, freq, url: s.video, codec: 'HLS', bitrate: 0 };
  }).sort((a, b) => a.freq - b.freq);
}

const radio = document.getElementById('radio');
const chassis = document.querySelector('.chassis');
const dialEl = document.querySelector('.dial');
const glass = document.getElementById('glass');
const stationName = document.getElementById('stationName');
const nameMarquee = document.getElementById('nameMarquee');
const nameSegA = document.getElementById('nameSegA');
const nameSegB = document.getElementById('nameSegB');
const stationLogo = document.getElementById('stationLogo');
const trackLine = document.getElementById('trackLine');
const trackArtistRow = document.getElementById('trackArtistRow');
const artistMarquee = document.getElementById('artistMarquee');
const artistSegA = document.getElementById('artistSegA');
const artistSegB = document.getElementById('artistSegB');
const artistGapA = document.getElementById('artistGapA');
const trackMarquee = document.getElementById('trackMarquee');
const trackSegA = document.getElementById('trackSegA');
const trackSegB = document.getElementById('trackSegB');
const trackGapA = document.getElementById('trackGapA');
const albumArt = document.getElementById('albumArt');
const albumArtImg = document.getElementById('albumArtImg');
const modeTag = document.getElementById('modeTag');
const freqFm = document.getElementById('freqFm');
const freqAm = document.getElementById('freqAm');
const dialNeedle = document.getElementById('dialNeedle');
const vintageNeedle = document.getElementById('vintageNeedle');
const bandFm = document.getElementById('bandFm');
const bandAm = document.getElementById('bandAm');
const tuneKnob = document.getElementById('tuneKnob');
const tuneSpin = document.getElementById('tuneSpin');
const volKnob = document.getElementById('volKnob');
const volSpin = document.getElementById('volSpin');
const volNums = document.getElementById('volNums');
const barsHost = document.getElementById('bars');
const specLabels = document.getElementById('specLabels');
const specPause = document.getElementById('specPause');
const specPauseChars = specPause
  ? [...specPause.querySelectorAll('.spec-pause-ch')]
  : [];
const btnPower = document.getElementById('btnPower');
const btnStop = document.getElementById('btnStop');
const btnBand = document.getElementById('btnBand');
const btnMono = document.getElementById('btnMono');
const btnAuto = document.getElementById('btnAuto');
const btnPreset = document.getElementById('btnPreset');
const btnCast = document.getElementById('btnCast');
const btnViewMode = document.getElementById('btnViewMode');
const specPanel = document.getElementById('specPanel');
const videoPanel = document.getElementById('videoPanel');
const stationVideo = document.getElementById('stationVideo');
const crtStatic = document.getElementById('crtStatic');
const crtHud = document.getElementById('crtHud');
const videoWell = videoPanel?.querySelector('.video-well');
const crtFrame = videoWell?.querySelector('.crt');
let crtStaticRaf = 0;
let crtRevealTok = 0;

function syncCrtAspect() {
  if (!crtFrame || !stationVideo) return;
  const w = stationVideo.videoWidth;
  const h = stationVideo.videoHeight;
  /* Default = 16:9 come gli stream; aggiorna solo se diverso */
  if (!w || !h) {
    crtFrame.style.setProperty('--crt-ar', '16 / 9');
    return;
  }
  const next = `${w} / ${h}`;
  if (crtFrame.style.getPropertyValue('--crt-ar') !== next) {
    crtFrame.style.setProperty('--crt-ar', next);
  }
}

function startCrtStatic() {
  videoWell?.classList.remove('has-signal');
  if (!crtStatic) return;
  if (crtStaticRaf) return;
  const ctx = crtStatic.getContext('2d', { alpha: false });
  if (!ctx) return;
  let t = 0;
  const paint = () => {
    t += 1;
    const cw = Math.max(1, Math.floor((crtStatic.clientWidth || 160) * 0.55));
    const ch = Math.max(1, Math.floor((crtStatic.clientHeight || 90) * 0.55));
    if (crtStatic.width !== cw) crtStatic.width = cw;
    if (crtStatic.height !== ch) crtStatic.height = ch;
    const img = ctx.createImageData(cw, ch);
    const d = img.data;
    /* Sabbia CRT più spenta (leggibile sotto il testo) */
    for (let i = 0; i < d.length; i += 4) {
      const n = Math.random();
      const v = (n * n * 95 + 18) | 0;
      d[i] = v;
      d[i + 1] = Math.min(255, v + 2);
      d[i + 2] = Math.min(255, v + 10);
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    ctx.fillStyle = 'rgba(160,180,210,0.04)';
    const y1 = ((t * 3) % (ch + 20)) - 10;
    ctx.fillRect(0, y1, cw, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    const y2 = ((t * 5 + ch / 2) % (ch + 30)) - 15;
    ctx.fillRect(0, y2, cw, 9);
    if ((t % 41) === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(0, (Math.random() * ch) | 0, cw, 2);
    }
    crtStaticRaf = requestAnimationFrame(paint);
  };
  crtStaticRaf = requestAnimationFrame(paint);
}

function stopCrtStatic() {
  if (crtStaticRaf) {
    cancelAnimationFrame(crtStaticRaf);
    crtStaticRaf = 0;
  }
}

function showCrtSignal() {
  stopCrtStatic();
  videoWell?.classList.add('has-signal');
  videoWell?.classList.remove('no-signal', 'is-paused');
  setCrtHud('');
  syncCrtAspect();
}

function hideCrtSignal() {
  crtRevealTok += 1;
  videoWell?.classList.remove('has-signal');
  startCrtStatic();
}

/* Rivela il video solo dopo frame reali — evita il nero pre-immagine */
function armCrtReveal() {
  if (!stationVideo) return;
  const tok = ++crtRevealTok;
  const reveal = () => {
    if (tok !== crtRevealTok) return;
    if (state.viewMode !== 'video' || !state.power || state.stopped) return;
    if (stationVideo.paused || stationVideo.readyState < 2) return;
    showCrtSignal();
  };
  if (typeof stationVideo.requestVideoFrameCallback === 'function') {
    stationVideo.requestVideoFrameCallback(() => {
      if (tok !== crtRevealTok) return;
      stationVideo.requestVideoFrameCallback(reveal);
    });
    return;
  }
  const onTu = () => {
    if (tok !== crtRevealTok) {
      stationVideo.removeEventListener('timeupdate', onTu);
      return;
    }
    if (stationVideo.currentTime > 0.08 && stationVideo.readyState >= 2) {
      stationVideo.removeEventListener('timeupdate', onTu);
      reveal();
    }
  };
  stationVideo.addEventListener('timeupdate', onTu);
}
const lblBand = document.getElementById('lblBand');
const lblTune = document.getElementById('lblTune');
const tuneBridge = document.getElementById('tuneBridge');
const lblStereo = document.getElementById('lblStereo');
const lblAuto = document.getElementById('lblAuto');
const lblCast = document.getElementById('lblCast');
const controlsEl = document.querySelector('.controls');
const audio = document.getElementById('player');
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /Android/i.test(navigator.userAgent);
if (isIOS) document.documentElement.classList.add('is-ios');
if (isAndroid) document.documentElement.classList.add('is-android');
try { audio.crossOrigin = 'anonymous'; } catch (e) { /* ignore */ }

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  /* APK: shell già in assets locali — niente SW che maschera il bundle */
  try {
    if (window.Capacitor?.isNativePlatform?.()) return;
  } catch (e) { /* ignore */ }
  navigator.serviceWorker.register('/sw.js?v=200', { scope: '/' }).catch(() => {});
}

const castUi = {
  ready: false,
  casting: false,
  pending: false,
  arming: false,
  loading: false,
  loadSeq: 0,
  contentUrl: '',
  native: false,
  pickerOpen: false,
  routes: [],
  focus: 0
};

const CAST_SPEAKER_SVG = `<svg viewBox="0 0 64 64" focusable="false" aria-hidden="true">
  <path d="M18 26h10l12-10v32L28 38H18z" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="M44 24c3.2 3 3.2 13 0 16M50 18c6 6 6 22 0 28" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
</svg>`;

/* iOS: Web Audio muore in background. Keepalive muto su <audio> (avviato col gesto),
   poi in background solo unmute — senza nuovo play() bloccato dal sistema. */
let iosBgHandoff = false;
let iosBgUrl = '';

function armMediaPlaybackSession() {
  try {
    if ('audioSession' in navigator) navigator.audioSession.type = 'playback';
  } catch (e) { /* ignore */ }
}

function updateMediaSession() {
  if (!('mediaSession' in navigator)) return;
  try {
    const station = state.locked || null;
    const track = String(currentTrackTitle || '').trim();
    const artist = String(currentTrackArtist || '').trim();
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track || station?.name || 'MyTuner',
      artist: artist || (track ? (station?.name || 'MyTuner Radio') : 'MyTuner Radio'),
      album: state.band === 'am' ? 'AM' : 'FM'
    });
    navigator.mediaSession.playbackState =
      state.power && !state.stopped ? 'playing' : 'paused';
  } catch (e) { /* ignore */ }
}

/* Domini brand → favicon (Google s2) se l’API non ha logo */
const LOGO_DOMAIN_BY_NAME = [
  { re: /^(radio\s*)?105(\s+network)?$/i, domain: '105.net' },
  { re: /^virgin\s*radio/i, domain: 'virginradio.it' },
  { re: /^(r\s*101|radio\s*101)/i, domain: 'r101.it' },
  { re: /radio\s*monte\s*carlo|^rmc$/i, domain: 'radiomontecarlo.net' },
  { re: /radio\s*kiss\s*kiss/i, domain: 'kisskiss.it' },
  { re: /radio\s*ibiza/i, domain: 'radioibiza.it' },
  { re: /^rds\b/i, domain: 'rds.it' },
  { re: /^rtl\s*102/i, domain: 'rtl.it' },
  { re: /radio\s*freccia/i, domain: 'radiofreccia.it' },
  { re: /radio\s*zeta/i, domain: 'radiozeta.it' },
  { re: /radio\s*marte/i, domain: 'radiomarte.it' },
  { re: /fm\s*italia/i, domain: 'fmitalia.it' },
  { re: /studio\s*centrale|^rsc\b/i, domain: 'studiocentrale.it' },
  { re: /radio\s*deejay/i, domain: 'deejay.it' },
  { re: /radio\s*capital/i, domain: 'radiocapital.it' },
  { re: /^m\s*2\s*o\b|^m2o/i, domain: 'm2o.it' },
  { re: /radio\s*italia/i, domain: 'radioitalia.it' },
  { re: /rai\s*radio/i, domain: 'rai.it' },
  { re: /radio\s*24/i, domain: 'radio24.it' }
];

function logoUrlForStation(station) {
  if (!station) return '';
  const raw = String(station.favicon || '').trim();
  if (/^https?:\/\//i.test(raw)) return `/logo?u=${encodeURIComponent(raw)}`;
  const home = String(station.homepage || '').trim();
  if (home) {
    try {
      const host = new URL(home).hostname;
      if (host) return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
    } catch (e) { /* ignore */ }
  }
  const n = String(station.name || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+TV$/i, '')
    .trim();
  for (const row of LOGO_DOMAIN_BY_NAME) {
    if (row.re.test(n)) {
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(row.domain)}&sz=64`;
    }
  }
  return '';
}

let currentTrackArtist = '';
let currentTrackTitle = '';
let currentStationNameText = '';
let trackPollTimer = 0;
let trackPollSeq = 0;
let trackPollAbort = null;
let trackPollBusy = false;
let trackResizeObs = null;
let marqueeResizeTimer = 0;
let lastTrackShift = '';
let lastArtistShift = '';
let lastNameShift = '';
let nowPlayingSeq = 0;
let albumArtSeq = 0;
let albumArtAbort = null;

function restartMarquee(el) {
  if (!el) return;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
}

function syncTrackMarquee() {
  if (!trackLine || !trackMarquee || !trackSegA) return;
  const text = (trackSegA.textContent || '').trim();
  if (!text || trackLine.classList.contains('is-empty')) {
    trackLine.classList.remove('is-scroll');
    lastTrackShift = '';
    return;
  }
  const gapW = trackGapA ? trackGapA.offsetWidth : 0;
  const unit = trackSegA.offsetWidth + gapW;
  if (unit < 4) return;
  const shift = `${unit}px`;
  /* Più fluido: scorrimento più lento e continuo (~px/22) */
  const dur = `${Math.max(12, Math.min(28, unit / 22))}s`;
  const same = trackLine.classList.contains('is-scroll') && lastTrackShift === shift;
  trackMarquee.style.setProperty('--marquee-shift', shift);
  trackMarquee.style.setProperty('--marquee-dur', dur);
  trackLine.classList.add('is-scroll');
  if (!same) {
    lastTrackShift = shift;
    restartMarquee(trackMarquee);
  }
}

function syncArtistMarquee() {
  if (!trackArtistRow || !artistMarquee || !artistSegA) return;
  trackArtistRow.classList.remove('is-scroll');
  artistMarquee.style.removeProperty('--marquee-dur');
  artistMarquee.style.removeProperty('--marquee-shift');
  const text = (artistSegA.textContent || '').trim();
  if (!text || trackLine?.classList.contains('is-empty')) {
    lastArtistShift = '';
    return;
  }
  const need = artistSegA.scrollWidth > trackArtistRow.clientWidth + 2;
  if (!need) {
    lastArtistShift = '';
    return;
  }
  trackArtistRow.classList.add('is-scroll');
  requestAnimationFrame(() => {
    if (!trackArtistRow.classList.contains('is-scroll')) return;
    const gapW = artistGapA ? artistGapA.offsetWidth : 0;
    const unit = artistSegA.offsetWidth + gapW;
    if (unit < 4) {
      trackArtistRow.classList.remove('is-scroll');
      lastArtistShift = '';
      return;
    }
    const shift = `${unit}px`;
    const dur = `${Math.max(7, Math.min(16, unit / 38))}s`;
    artistMarquee.style.setProperty('--marquee-shift', shift);
    artistMarquee.style.setProperty('--marquee-dur', dur);
    if (lastArtistShift !== shift) {
      lastArtistShift = shift;
      restartMarquee(artistMarquee);
    }
  });
}

let albumFlipTimer = 0;
let albumFlipClearTimer = 0;

function stopAlbumArtFlip() {
  window.clearTimeout(albumFlipTimer);
  window.clearTimeout(albumFlipClearTimer);
  albumFlipTimer = 0;
  albumFlipClearTimer = 0;
  albumArt?.classList.remove('is-flip');
}

function playAlbumArtFlip() {
  if (!state.power || document.hidden || !albumArt || albumArt.hidden) return;
  if (!albumArtImg?.getAttribute('src')) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
  albumArt.classList.remove('is-flip');
  void albumArt.offsetWidth;
  albumArt.classList.add('is-flip');
  window.clearTimeout(albumFlipClearTimer);
  albumFlipClearTimer = window.setTimeout(() => {
    albumArt?.classList.remove('is-flip');
  }, 1500);
}

function scheduleAlbumArtFlip(afterMs) {
  window.clearTimeout(albumFlipTimer);
  if (!state.power || isIOS) {
    albumFlipTimer = 0;
    return;
  }
  const wait = afterMs != null ? afterMs : (8000 + Math.random() * 18000);
  albumFlipTimer = window.setTimeout(() => {
    albumFlipTimer = 0;
    if (!state.power) return;
    playAlbumArtFlip();
    scheduleAlbumArtFlip();
  }, wait);
}

function clearAlbumArt() {
  albumArtSeq += 1;
  if (albumArtAbort) {
    try { albumArtAbort.abort(); } catch (e) { /* ignore */ }
    albumArtAbort = null;
  }
  stopAlbumArtFlip();
  if (albumArt) albumArt.hidden = true;
  if (albumArtImg) {
    albumArtImg.removeAttribute('src');
    albumArtImg.dataset.key = '';
  }
}

async function lookupArtworkUrl(query, signal) {
  const q = String(query || '').trim().slice(0, 100);
  if (!q) return '';
  try {
    const res = await fetch(hubUrl(`/api/artwork?q=${encodeURIComponent(q)}`), {
      signal,
      cache: 'default'
    });
    if (res.ok) {
      const data = await res.json();
      const art = String(data?.art || '').trim();
      if (art) return art;
    }
  } catch (e) { /* fallback */ }
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=3&country=IT`;
    const res = await fetch(url, { signal, cache: 'default' });
    if (!res.ok) return '';
    const data = await res.json();
    const hit = (data?.results || []).find((r) => r?.artworkUrl100 || r?.artworkUrl60);
    const raw = hit?.artworkUrl100 || hit?.artworkUrl60 || '';
    return String(raw || '').replace(/\/\d+x\d+bb(\.[a-z]+)$/i, '/200x200bb$1');
  } catch (e) {
    return '';
  }
}

function preloadArtImage(url, signal) {
  return new Promise((resolve) => {
    if (!url) {
      resolve('');
      return;
    }
    const direct = String(url);
    const src = direct.startsWith('http') ? `/logo?u=${encodeURIComponent(direct)}` : direct;
    const img = new Image();
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      resolve(ok ? { src, direct } : '');
    };
    const timer = window.setTimeout(() => finish(true), 700);
    if (signal) {
      signal.addEventListener('abort', () => {
        window.clearTimeout(timer);
        finish(false);
      }, { once: true });
    }
    img.onload = () => {
      window.clearTimeout(timer);
      finish(true);
    };
    img.onerror = () => {
      /* prova diretto */
      const img2 = new Image();
      img2.onload = () => {
        window.clearTimeout(timer);
        resolve({ src: direct, direct });
      };
      img2.onerror = () => {
        window.clearTimeout(timer);
        finish(false);
      };
      img2.src = direct;
    };
    img.src = src;
  });
}

async function resolveAlbumArt(artist, title, signal) {
  const primary = [artist, title].filter(Boolean).join(' ');
  if (!primary) return '';
  let art = await lookupArtworkUrl(primary, signal);
  if (!art && artist && title) {
    art = await lookupArtworkUrl(title, signal);
  }
  if (!art && artist) art = await lookupArtworkUrl(artist, signal);
  return art;
}

function applyAlbumArt(packed, key) {
  if (!albumArt || !albumArtImg) return;
  if (!packed || !packed.src) {
    albumArt.hidden = true;
    albumArtImg.removeAttribute('src');
    albumArtImg.dataset.key = '';
    return;
  }
  albumArtImg.dataset.key = key;
  albumArtImg.src = packed.src;
  albumArt.hidden = false;
  if (state.power && !isIOS) scheduleAlbumArtFlip(10000 + Math.random() * 16000);
}

let metaEnterClearTimer = 0;

function playMetaEnter() {
  if (!trackLine) return;
  window.clearTimeout(metaEnterClearTimer);
  trackLine.classList.remove('is-scroll');
  trackArtistRow?.classList.remove('is-scroll');
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
    requestAnimationFrame(() => {
      syncTrackMarquee();
      syncArtistMarquee();
    });
    return;
  }
  trackLine.classList.remove('is-meta-enter');
  void trackLine.offsetWidth;
  trackLine.classList.add('is-meta-enter');
  metaEnterClearTimer = window.setTimeout(() => {
    trackLine?.classList.remove('is-meta-enter');
    syncTrackMarquee();
    syncArtistMarquee();
  }, 720);
}

async function setNowPlaying(artist, title) {
  let a = String(artist || '').replace(/\s+/g, ' ').trim();
  let t = String(title || '').replace(/\s+/g, ' ').trim();
  if (a.length > 80) a = `${a.slice(0, 77)}...`;
  if (t.length > 120) t = `${t.slice(0, 117)}...`;
  if (a === currentTrackArtist && t === currentTrackTitle && trackLine && !trackLine.classList.contains('is-empty')) {
    return;
  }
  currentTrackArtist = a;
  currentTrackTitle = t;
  updateMediaSession();

  if (!a && !t) {
    nowPlayingSeq += 1;
    clearAlbumArt();
    if (artistSegA) artistSegA.textContent = '';
    if (artistSegB) artistSegB.textContent = '';
    if (trackSegA) trackSegA.textContent = '';
    if (trackSegB) trackSegB.textContent = '';
    if (trackLine) trackLine.classList.add('is-empty');
    lastTrackShift = '';
    lastArtistShift = '';
    return;
  }

  const seq = ++nowPlayingSeq;
  const key = `${a}\n${t}`.toLowerCase();

  if (albumArtAbort) {
    try { albumArtAbort.abort(); } catch (e) { /* ignore */ }
  }
  albumArtAbort = new AbortController();
  const signal = albumArtAbort.signal;
  albumArtSeq += 1;

  /* Testo + cover pronti insieme: il pezzo precedente resta finché non c’è il pacchetto */
  let packed = '';
  try {
    const artUrl = await Promise.race([
      resolveAlbumArt(a, t, signal),
      new Promise((resolve) => window.setTimeout(() => resolve(''), 850))
    ]);
    if (seq !== nowPlayingSeq) return;
    if (artUrl) packed = await preloadArtImage(artUrl, signal);
  } catch (e) {
    packed = '';
  }
  if (seq !== nowPlayingSeq) return;

  if (artistSegA) artistSegA.textContent = a;
  if (artistSegB) artistSegB.textContent = a;
  if (trackSegA) trackSegA.textContent = t;
  if (trackSegB) trackSegB.textContent = t;
  applyAlbumArt(packed, key);
  if (trackLine) trackLine.classList.remove('is-empty');
  lastTrackShift = '';
  lastArtistShift = '';
  playMetaEnter();
}

function setTrackTitle(text) {
  setNowPlaying('', text);
}

function syncNameMarquee() {
  if (!stationName || !nameMarquee || !nameSegA) return;
  const text = (nameSegA.textContent || '').trim();
  if (!text) {
    stationName.classList.remove('is-scroll');
    lastNameShift = '';
    return;
  }
  const wasScroll = stationName.classList.contains('is-scroll');
  stationName.classList.remove('is-scroll');
  const avail = stationName.clientWidth;
  const need = avail > 0 && nameSegA.scrollWidth > avail + 1;
  if (!need) {
    lastNameShift = '';
    return;
  }
  stationName.classList.add('is-scroll');
  requestAnimationFrame(() => {
    if (!stationName.classList.contains('is-scroll')) return;
    const gap = nameMarquee.querySelector('.name-gap');
    const gapW = gap ? gap.offsetWidth : 0;
    const unit = nameSegA.offsetWidth + gapW;
    if (unit < 4) {
      stationName.classList.remove('is-scroll');
      lastNameShift = '';
      return;
    }
    const shift = `${unit}px`;
    const dur = `${Math.max(8, Math.min(26, unit / 26))}s`;
    nameMarquee.style.setProperty('--marquee-shift', shift);
    nameMarquee.style.setProperty('--marquee-dur', dur);
    if (!wasScroll || lastNameShift !== shift) {
      lastNameShift = shift;
      restartMarquee(nameMarquee);
    }
  });
}

let nameSweepTimer = 0;
let nameSweepClearTimer = 0;

function clearNameAnimClasses() {
  stationName?.classList.remove('is-name-sweep', 'is-sweep-right', 'is-name-enter', 'is-name-sweep-slow');
}

function stopNameSweepAnim() {
  window.clearTimeout(nameSweepClearTimer);
  nameSweepClearTimer = 0;
  clearNameAnimClasses();
}

function stopNameSweep() {
  window.clearTimeout(nameSweepTimer);
  nameSweepTimer = 0;
  stopNameSweepAnim();
}

function playNameEnterFromRight() {
  if (!state.power || document.hidden || !stationName || !nameMarquee) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
  const text = (nameSegA?.textContent || '').trim();
  if (!text) return;
  stopNameSweepAnim();
  void stationName.offsetWidth;
  stationName.classList.add('is-name-enter');
  nameSweepClearTimer = window.setTimeout(() => {
    stationName?.classList.remove('is-name-enter');
    requestAnimationFrame(() => syncNameMarquee());
  }, 780);
}

function playNameSweep() {
  if (!state.power || document.hidden || !stationName || !nameMarquee) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
  if (stationName.classList.contains('is-name-enter')) return;
  const text = (nameSegA?.textContent || '').trim();
  if (!text) return;
  stopNameSweepAnim();
  void stationName.offsetWidth;
  const toRight = Math.random() < 0.5;
  const slow = Math.random() < 0.4;
  stationName.classList.add('is-name-sweep');
  stationName.classList.toggle('is-sweep-right', toRight);
  stationName.classList.toggle('is-name-sweep-slow', slow);
  nameSweepClearTimer = window.setTimeout(() => {
    clearNameAnimClasses();
    requestAnimationFrame(() => syncNameMarquee());
  }, slow ? 5800 : 2700);
}

function scheduleNameSweep(afterMs) {
  window.clearTimeout(nameSweepTimer);
  if (!state.power) {
    nameSweepTimer = 0;
    return;
  }
  const wait = afterMs != null ? afterMs : (5000 + Math.random() * 10000);
  nameSweepTimer = window.setTimeout(() => {
    nameSweepTimer = 0;
    if (!state.power) return;
    playNameSweep();
    scheduleNameSweep();
  }, wait);
}

function setStationNameText(text, { gold = false } = {}) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  const goldOn = Boolean(gold);
  if (stationName) stationName.classList.toggle('is-gold', goldOn);
  if (clean === currentStationNameText && nameSegA?.textContent === clean) {
    if (!goldOn) requestAnimationFrame(() => syncNameMarquee());
    return;
  }
  currentStationNameText = clean;
  stopNameSweepAnim();
  if (nameSegA) nameSegA.textContent = clean;
  if (nameSegB) nameSegB.textContent = clean;
  lastNameShift = '';
  requestAnimationFrame(() => {
    syncNameMarquee();
    if (clean && state.power && !goldOn) {
      playNameEnterFromRight();
      if (!nameSweepTimer) scheduleNameSweep(4000 + Math.random() * 7000);
    }
  });
}

function paintStationLogo(station) {
  if (!stationLogo) return;
  const src = state.power && station ? logoUrlForStation(station) : '';
  if (!src) {
    stationLogo.hidden = true;
    stationLogo.removeAttribute('src');
    stationLogo.dataset.src = '';
    return;
  }
  if (stationLogo.dataset.src === src) {
    stationLogo.hidden = false;
    return;
  }
  stationLogo.dataset.src = src;
  stationLogo.onload = () => { stationLogo.hidden = false; };
  stationLogo.onerror = () => {
    stationLogo.hidden = true;
    stationLogo.removeAttribute('src');
    stationLogo.dataset.src = '';
  };
  stationLogo.src = src;
}

function stopTrackPoll() {
  window.clearTimeout(trackPollTimer);
  trackPollTimer = 0;
  if (trackPollAbort) {
    try { trackPollAbort.abort(); } catch (e) { /* ignore */ }
    trackPollAbort = null;
  }
  trackPollBusy = false;
}

function trackPollInterval() {
  /* Su telefono più raro: lo sniff ICY non deve contendere lo stream audio */
  return window.matchMedia('(max-width: 700px)').matches ? 32000 : 18000;
}

function scheduleTrackPoll(delay) {
  stopTrackPoll();
  const ms = delay == null ? trackPollInterval() : delay;
  trackPollTimer = window.setTimeout(() => {
    pollNowPlaying();
  }, ms);
}

/* Prima lettura ICY dopo l’aggancio audio: evita 2° socket Icecast in gara con /stream (RDS 256k) */
function scheduleFirstTrackPoll() {
  stopTrackPoll();
  const url = state.locked?.url || '';
  if (!url) return;
  const seq = ++trackPollSeq;
  const kick = () => {
    if (seq !== trackPollSeq) return;
    if (!state.power || state.stopped) return;
    if (state.locked?.url !== url) return;
    if (trackPollBusy) return;
    stopTrackPoll();
    pollNowPlaying();
  };
  const onAudio = () => {
    if (seq !== trackPollSeq) return;
    window.clearTimeout(trackPollTimer);
    trackPollTimer = window.setTimeout(kick, 280);
  };
  audio.addEventListener('playing', onAudio, { once: true });
  audio.addEventListener('canplay', onAudio, { once: true });
  /* Fallback: iOS Web Audio non emette canplay sul percorso spettro */
  trackPollTimer = window.setTimeout(kick, isIOS ? 2400 : 1700);
}

function parseNowPlaying(raw, stationName) {
  let t = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!t) return { artist: '', title: '' };
  const sta = String(stationName || '').replace(/\s+/g, ' ').trim().toLowerCase();
  let artist = '';
  let title = '';

  if (t.includes('~')) {
    const rawParts = t.split('~').map((p) => p.trim());
    const parts = rawParts.filter(Boolean);
    /* Unitedradio/Mediaset: ARTIST~TITLE~~YEAR~ISRC~… (album vuoto) */
    const mediaset = rawParts.length >= 4
      && rawParts[0]
      && rawParts[1]
      && rawParts[2] === ''
      && /^\d{4}$/.test(rawParts[3] || '');
    if (mediaset) {
      artist = rawParts[0];
      title = rawParts[1];
    } else if (parts.length >= 3 && /^\d{4}$/.test(parts[2])) {
      /* TITLE~ARTIST~YEAR… */
      title = parts[0] || '';
      artist = parts[1] || '';
    } else {
      /* ARTIST~TITLE~ALBUM… */
      artist = parts[0] || '';
      title = parts[1] || '';
    }
  } else if (t.includes('*')) {
    const parts = t.split('*').map((p) => p.trim()).filter((p) => p && p !== '-1');
    const useful = parts.filter((p) => !/^(rds|radio\b)/i.test(p));
    const pair = useful.length ? useful : parts;
    artist = pair[0] || '';
    title = pair[1] || '';
  } else if (/\s[-–—]\s/.test(t)) {
    const parts = t.split(/\s[-–—]\s/).map((p) => p.trim()).filter(Boolean);
    artist = parts[0] || '';
    title = parts.slice(1).join(' - ');
  } else {
    title = t;
  }

  artist = artist.replace(/\s+/g, ' ').trim();
  title = title.replace(/\s+/g, ' ').trim();
  if (sta) {
    if (artist.toLowerCase() === sta) artist = '';
    if (title.toLowerCase() === sta) title = '';
  }
  if (!artist && !title) return { artist: '', title: '' };
  return { artist, title };
}

async function pollNowPlaying() {
  window.clearTimeout(trackPollTimer);
  trackPollTimer = 0;
  const station = state.locked;
  if (!state.power || state.stopped || !station?.url || isTvMode()) {
    setNowPlaying('', '');
    trackPollBusy = false;
    return;
  }
  if (isHlsAudioUrl(station.url)) {
    setNowPlaying('', '');
    scheduleTrackPoll(trackPollInterval());
    return;
  }
  if (trackPollBusy) {
    scheduleTrackPoll(trackPollInterval());
    return;
  }
  const seq = ++trackPollSeq;
  trackPollBusy = true;
  if (trackPollAbort) {
    try { trackPollAbort.abort(); } catch (e) { /* ignore */ }
  }
  trackPollAbort = new AbortController();
  const timer = window.setTimeout(() => {
    try { trackPollAbort.abort(); } catch (e) { /* ignore */ }
  }, 4500);
  try {
    const res = await fetch(hubUrl(`/api/nowplaying?u=${encodeURIComponent(station.url)}`), {
      cache: 'no-store',
      signal: trackPollAbort.signal
    });
    if (seq !== trackPollSeq) return;
    if (!res.ok) {
      scheduleTrackPoll(trackPollInterval() + 6000);
      return;
    }
    const data = await res.json();
    if (seq !== trackPollSeq) return;
    const parsed = parseNowPlaying(data?.title, station.name);
    setNowPlaying(parsed.artist, parsed.title);
  } catch (e) {
    if (seq === trackPollSeq) scheduleTrackPoll(trackPollInterval() + 8000);
    return;
  } finally {
    window.clearTimeout(timer);
    if (seq === trackPollSeq) {
      trackPollBusy = false;
      trackPollAbort = null;
    }
  }
  if (seq === trackPollSeq) scheduleTrackPoll(trackPollInterval());
}

function iosStreamSrc(url) {
  return hubUrl(`/stream?u=${encodeURIComponent(url)}`);
}

function isHlsAudioUrl(url) {
  return /\.m3u8(\?|#|$)/i.test(String(url || ''));
}

function warmIosMediaKeepalive(url) {
  if (!isIOS || !url || castUi.casting) return;
  if (!state.power || state.stopped) return;
  armMediaPlaybackSession();
  iosBgUrl = url;
  const src = iosStreamSrc(url);
  const same = audio.getAttribute('src') === src;
  if (!same) audio.src = src;
  /* In primo piano resta muto: suona il percorso Web Audio */
  if (!iosBgHandoff) {
    audio.muted = true;
    audio.volume = 0;
  }
  if (audio.paused || !same) {
    const pending = audio.play();
    if (pending) pending.catch(() => {});
  }
}

function clearIosBackgroundAudio() {
  iosBgHandoff = false;
  iosBgUrl = '';
  /* Solo iOS: su Android non toccare <audio> (rompe il rientro dopo Cast) */
  if (!isIOS) return;
  try { audio.pause(); } catch (e) { /* ignore */ }
  try {
    audio.removeAttribute('src');
    audio.load();
  } catch (e) { /* ignore */ }
}

function enterIosBackgroundAudio() {
  if (!isIOS || castUi.casting) return;
  if (!state.power || state.stopped) return;
  const url = engine.currentUrl || state.locked?.url || iosBgUrl || nearest().station?.url;
  if (!url) return;
  iosBgUrl = url;
  iosBgHandoff = true;
  armMediaPlaybackSession();
  /* Ferma solo lo spettro Web Audio, NON mettere in pause l'<audio> già caldo */
  try { engine.suspendIosSpectrum(); } catch (e) { /* ignore */ }
  audio.muted = false;
  audio.volume = clamp(state.volume / 10, 0, 1);
  if (audio.getAttribute('src') !== iosStreamSrc(url)) audio.src = iosStreamSrc(url);
  if (audio.paused) {
    const pending = audio.play();
    if (pending) pending.catch(() => {});
  }
  updateMediaSession();
}

function leaveIosBackgroundAudio() {
  if (!isIOS) return;
  if (!iosBgHandoff) {
    if (state.power && !state.stopped && !castUi.casting) {
      if (engine.ctx?.state === 'suspended') engine.ctx.resume().catch(() => {});
    }
    return;
  }
  const url = iosBgUrl || state.locked?.url || engine.currentUrl;
  iosBgHandoff = false;
  /* Torna muto ma resta in play come keepalive */
  audio.muted = true;
  audio.volume = 0;
  if (!state.power || state.stopped || castUi.casting) {
    clearIosBackgroundAudio();
    updateMediaSession();
    return;
  }
  if (url) {
    if (engine.ctx?.state === 'suspended') engine.ctx.resume().catch(() => {});
    engine.play(url);
    engine.setVolume(state.volume / 10);
    warmIosMediaKeepalive(url);
  }
  updateMediaSession();
}

const saved = readJSON('radio-face-v1', null);
const state = {
  // All'apertura parte sempre spenta: si accende solo con POWER
  power: false,
  stopped: false,
  band: saved?.band === 'am' ? 'am' : 'fm',
  fm: clamp(Number(saved?.fm) || brandFreq('Radio 105 Network') || 100.3, FM.min, FM.max),
  am: clamp(Number(saved?.am) || 810, AM.min, AM.max),
  volume: clamp(Number(saved?.volume ?? 5), 0, 10),
  bass: clamp(Number(saved?.bass) || 0, -12, 12),
  treble: clamp(Number(saved?.treble) || 0, -12, 12),
  stereo: saved?.stereo !== false,
  auto: saved?.auto === true,
  locked: null,
  viewMode: 'spectrum'
};

/* Catalogo completo API; `stations` = dial attivo (RADIO oppure TV) */
const catalog = {
  fm: FALLBACK.fm.map((s) => withVideo({ ...s })),
  am: FALLBACK.am.map((s) => withVideo({ ...s }))
};
const stations = {
  fm: catalog.fm.slice(),
  am: catalog.am.slice()
};

let hlsPlayer = null;
const presets = readJSON('radio-presets-v1', { fm: [], am: [] });
const presetIndex = { fm: -1, am: -1 };
let afcToken = 0;
let seekToken = 0;
let dwellTimer = 0;
let dwellTarget = null;
let flashTimer = 0;
/* Telecomando: stazione che stai lasciando (niente risucchio finché giri dalla stessa parte) */
let remoteTuneLeave = null; /* { key, sign, origin } */
let remoteTuneSettleTimer = 0;
let remoteTuneTarget = null; /* { band, station, at } */
let remoteStateTimer = 0;
let remoteExitGuardUntil = 0; /* dopo exit: blocca power-on fantasma */

const fills = [];
const caps = [];
const peaks = SPEC.map(() => 0.04);

const engine = createEngine(audio);

function createEngine(media) {
  const eng = {
    ready: false,
    currentUrl: '',
    ctx: null,
    analyser: null,
    bins: null,
    signal: null,
    noise: null,
    volume: null,
    bass: null,
    treble: null,
    noiseLevel: 0,
    blocked: false
  };
  let splitter;
  let merger;
  let gL;
  let gR;
  let noiseTimer = 0;
  /* iOS: un solo ascolto via <audio>; spettro da tap silenzioso (niente doppio volume) */
  let iosAbort = null;
  let iosPending = new Uint8Array(0);
  let iosNext = 0;
  let iosSpecActive = false;
  let iosToken = 0;
  let iosDecoder = null;
  let iosUseCodecs = null;
  let iosTimestamp = 0;
  let iosLock = 0;
  let iosSpecUrl = '';
  const iosSources = new Set();

  function prime() {
    if (!eng.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      eng.ctx = new AC();
    }
    if (eng.ctx.state === 'suspended') eng.ctx.resume().catch(() => {});
  }

  function ensure() {
    if (eng.ready) {
      if (eng.ctx.state === 'suspended') eng.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    /* riusa il context già sbloccato dal gesto (iOS) */
    const ctx = eng.ctx || new AC();
    eng.ctx = ctx;
    try { media.crossOrigin = 'anonymous'; } catch (e) { /* ignore */ }
    const signal = ctx.createGain();
    const noiseGain = ctx.createGain();
    const mix = ctx.createGain();
    const bass = ctx.createBiquadFilter();
    const treble = ctx.createBiquadFilter();
    const volume = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    const analyser = ctx.createAnalyser();
    const specTap = ctx.createGain();
    const specMute = ctx.createGain();

    bass.type = 'lowshelf';
    bass.frequency.value = 160;
    bass.gain.value = state.bass;
    treble.type = 'highshelf';
    treble.frequency.value = 5200;
    treble.gain.value = state.treble;
    signal.gain.value = 0;
    noiseGain.gain.value = 0;
    volume.gain.value = volToGain(state.volume / 10);
    comp.threshold.value = -12;
    comp.knee.value = 18;
    comp.ratio.value = 2.4;
    comp.attack.value = 0.012;
    comp.release.value = 0.22;
    analyser.fftSize = isIOS ? 1024 : 2048;
    analyser.smoothingTimeConstant = isIOS ? 0.5 : 0.52;
    analyser.minDecibels = -90;
    analyser.maxDecibels = -20;
    specTap.gain.value = 1;
    specMute.gain.value = 0.0001;

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(ctx);
    noise.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 850;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 6800;
    noise.connect(hp);
    hp.connect(lp);
    lp.connect(noiseGain);

    if (!isIOS) {
      const source = ctx.createMediaElementSource(media);
      source.connect(signal);
    }

    signal.connect(mix);
    noiseGain.connect(mix);
    mix.connect(bass);
    bass.connect(treble);

    splitter = ctx.createChannelSplitter(2);
    merger = ctx.createChannelMerger(2);
    gL = ctx.createGain();
    gR = ctx.createGain();
    gL.gain.value = 0.5;
    gR.gain.value = 0.5;
    splitter.connect(gL, 0);
    splitter.connect(gR, 1);
    gL.connect(merger, 0, 0);
    gL.connect(merger, 0, 1);
    gR.connect(merger, 0, 0);
    gR.connect(merger, 0, 1);

    volume.connect(comp);
    comp.connect(ctx.destination);

    eng.signal = signal;
    eng.noise = noiseGain;
    eng.volume = volume;
    eng.bass = bass;
    eng.treble = treble;
    eng.comp = comp;
    eng.analyser = analyser;
    eng.specTap = specTap;
    eng.specMute = specMute;
    eng.bins = new Uint8Array(analyser.frequencyBinCount);
    eng.ready = true;
    routeMode();
    noise.start();
    ctx.resume().catch(() => {});
    armMediaPlaybackSession();
  }

  function routeMode() {
    if (!eng.ready) return;
    try { eng.treble.disconnect(); } catch (e) { /* prima connessione */ }
    try { merger.disconnect(); } catch (e) { /* prima connessione */ }
    try { eng.analyser.disconnect(); } catch (e) { /* prima connessione */ }
    try { eng.volume.disconnect(); } catch (e) { /* ignore */ }
    try { eng.specTap.disconnect(); } catch (e) { /* ignore */ }
    try { eng.specMute.disconnect(); } catch (e) { /* ignore */ }

    if (state.stereo) eng.treble.connect(eng.analyser);
    else {
      eng.treble.connect(splitter);
      merger.connect(eng.analyser);
    }
    eng.analyser.connect(eng.volume);
    eng.volume.connect(eng.comp);
  }

  function setMix(signalLevel, noiseLevel) {
    eng.noiseLevel = Math.max(0, noiseLevel);
    iosLock = Math.max(0, Math.min(1, signalLevel));
    if (!eng.ready) return;
    const now = eng.ctx.currentTime;
    eng.signal.gain.setTargetAtTime(Math.max(0, signalLevel), now, 0.07);
    eng.noise.gain.setTargetAtTime(eng.noiseLevel * 0.18, now, 0.06);
  }

  function stopIosBuffers() {
    for (const src of iosSources) {
      try { src.stop(); } catch (e) { /* già fermato */ }
    }
    iosSources.clear();
    iosNext = 0;
  }

  function closeIosDecoder() {
    if (!iosDecoder) return;
    try { iosDecoder.close(); } catch (e) { /* ignore */ }
    iosDecoder = null;
  }

  function stopIosSpectrum() {
    iosSpecActive = false;
    iosToken += 1;
    iosTimestamp = 0;
    if (iosAbort) {
      try { iosAbort.abort(); } catch (e) { /* ignore */ }
      iosAbort = null;
    }
    iosPending = new Uint8Array(0);
    iosSpecUrl = '';
    closeIosDecoder();
    stopIosBuffers();
  }

  function scheduleIosBuffer(audioBuf) {
    if (!eng.ready || !iosSpecActive || !audioBuf || audioBuf.length < 32) return;
    const src = eng.ctx.createBufferSource();
    src.buffer = audioBuf;
    src.connect(eng.signal);
    const now = eng.ctx.currentTime;
    if (!iosNext || iosNext < now + 0.03) iosNext = now + 0.05;
    try { src.start(iosNext); } catch (e) { return; }
    iosNext += audioBuf.duration;
    iosSources.add(src);
    src.onended = () => iosSources.delete(src);
  }

  function ensureIosDecoder(sampleRate, channels) {
    if (iosDecoder) return iosDecoder;
    iosDecoder = new AudioDecoder({
      output: (audioData) => {
        if (!iosSpecActive || !eng.ready) {
          try { audioData.close(); } catch (e) { /* ignore */ }
          return;
        }
        try {
          scheduleIosBuffer(audioDataToBuffer(eng.ctx, audioData));
        } catch (e) {
          try { audioData.close(); } catch (err) { /* ignore */ }
        }
      },
      error: () => {}
    });
    iosDecoder.configure({
      codec: 'mp3',
      sampleRate: sampleRate || 44100,
      numberOfChannels: channels || 2
    });
    return iosDecoder;
  }

  async function decodeIosChunk(chunk) {
    if (iosUseCodecs == null) iosUseCodecs = await canUseMp3AudioDecoder();
    if (iosUseCodecs) {
      ensureIosDecoder(chunk.sampleRate, chunk.channels);
      let offset = 0;
      while (offset + 4 < chunk.bytes.length) {
        const h = mp3HeaderAt(chunk.bytes, offset);
        if (!h || offset + h.length > chunk.bytes.length) break;
        const data = chunk.bytes.subarray(offset, offset + h.length).slice().buffer;
        const samples = h.layer === 1 ? 384 : 1152;
        const duration = Math.floor((samples * 1_000_000) / h.sampleRate);
        try {
          iosDecoder.decode(new EncodedAudioChunk({
            type: 'key',
            timestamp: iosTimestamp,
            duration,
            data
          }));
        } catch (e) { break; }
        iosTimestamp += duration;
        offset += h.length;
      }
      return;
    }
    scheduleIosBuffer(await eng.ctx.decodeAudioData(chunk.bytes.slice().buffer));
  }

  async function pumpIosSpectrum(url, token) {
    try {
      const res = await fetch(hubUrl(`/stream?u=${encodeURIComponent(url)}`), {
        signal: iosAbort.signal,
        cache: 'no-store',
        credentials: 'omit',
        headers: { Accept: 'audio/*,*/*;q=0.9' }
      });
      if (!res.ok || !res.body) return;
      const reader = res.body.getReader();
      while (iosSpecActive && token === iosToken) {
        while (iosSpecActive && token === iosToken && iosNext - eng.ctx.currentTime > 1.2) {
          await sleep(80);
        }
        if (!iosSpecActive || token !== iosToken) break;
        const { done, value } = await reader.read();
        if (done) break;
        iosPending = concatBytes(iosPending, value);
        let guard = 0;
        const primed = iosNext > eng.ctx.currentTime + 0.2;
        while (iosSpecActive && token === iosToken && guard < (primed ? 2 : 3)) {
          guard += 1;
          if (primed && iosNext - eng.ctx.currentTime > 0.65) break;
          const chunk = takeMp3Chunk(iosPending, primed ? 10 : 4, primed ? 20 : 8);
          if (!chunk) {
            if (iosPending.length > 280 * 1024) {
              const again = findMp3Frame(iosPending, 1);
              iosPending = again ? iosPending.subarray(again.index) : iosPending.subarray(iosPending.length >> 1);
            }
            break;
          }
          iosPending = chunk.rest.length ? chunk.rest.slice() : new Uint8Array(0);
          try { await decodeIosChunk(chunk); } catch (e) { /* prossimo blocco */ }
        }
      }
    } catch (e) {
      if (e?.name === 'AbortError') return;
    }
  }

  function startIosSpectrum(url) {
    if (!url || !isIOS) return;
    if (iosSpecActive && iosSpecUrl === url) return;
    stopIosSpectrum();
    iosSpecUrl = url;
    iosSpecActive = true;
    iosAbort = new AbortController();
    const token = ++iosToken;
    if (eng.ctx?.state === 'suspended') eng.ctx.resume().catch(() => {});
    pumpIosSpectrum(url, token);
  }

  return {
    get ready() { return eng.ready; },
    get currentUrl() { return eng.currentUrl; },
    get analyser() { return eng.analyser; },
    get bins() { return eng.bins; },
    get ctx() { return eng.ctx; },
    get streaming() {
      if (isIOS) return iosSpecActive || iosBgHandoff;
      return Boolean(eng.currentUrl) && !media.paused;
    },
    get programLive() {
      return Boolean(eng.currentUrl) && !media.paused && media.readyState >= 2;
    },
    start: ensure,
    prime,
    setVolume(unit) {
      if (!eng.ready) return;
      eng.volume.gain.setTargetAtTime(volToGain(unit), eng.ctx.currentTime, 0.03);
    },
    setTone(bassDb, trebleDb) {
      if (!eng.ready) return;
      const now = eng.ctx.currentTime;
      eng.bass.gain.setTargetAtTime(bassDb, now, 0.04);
      eng.treble.gain.setTargetAtTime(trebleDb, now, 0.04);
    },
    setMono(isMono) {
      state.stereo = !isMono;
      routeMode();
    },
    setMix,
    play(url) {
      if (!url) return;
      ensure();
      eng.blocked = false;
      if (castUi.casting) {
        /* Cassa: Cast. Tablet: stream muto ancora acceso → spettro vivo + rientro immediato */
        syncCastMedia(true);
        if (isIOS) {
          stopIosSpectrum();
          eng.currentUrl = url;
          muteTabletAudio(true);
          return;
        }
        muteTabletAudio(true);
        setMix(1, 0);
        if (eng.currentUrl === url) {
          if (eng.ctx.state === 'suspended') eng.ctx.resume().catch(() => {});
          if (media.paused) {
            const pending = media.play();
            if (pending) pending.catch(() => { eng.blocked = true; });
          }
          return;
        }
        eng.currentUrl = url;
        media.muted = true;
        media.volume = 0;
        media.src = hubUrl(`/stream?u=${encodeURIComponent(url)}`);
        const pending = media.play();
        if (pending) {
          pending.then(() => {
            if (eng.ctx?.state === 'suspended') eng.ctx.resume().catch(() => {});
          }).catch(() => { eng.blocked = true; });
        }
        return;
      }
      if (isIOS) {
        /* HLS/AAC ufficiale (Zeta/Freccia…): niente frame MP3 → audio nativo sull’<audio> */
        if (isHlsAudioUrl(url)) {
          if (eng.currentUrl === url && iosBgHandoff && !media.paused) {
            if (eng.ctx.state === 'suspended') eng.ctx.resume().catch(() => {});
            return;
          }
          stopIosSpectrum();
          eng.currentUrl = url;
          iosBgUrl = url;
          iosBgHandoff = true;
          armMediaPlaybackSession();
          media.muted = Boolean(castUi.casting || videoAudioLatched);
          media.volume = media.muted ? 0 : clamp(state.volume / 10, 0, 1);
          const src = iosStreamSrc(url);
          if (media.getAttribute('src') !== src) media.src = src;
          const pending = media.play();
          if (pending) pending.catch(() => { eng.blocked = true; });
          return;
        }
        if (iosBgHandoff) {
          iosBgHandoff = false;
          media.muted = true;
          media.volume = 0;
        }
        if (iosSpecActive && iosSpecUrl === url) {
          if (eng.ctx.state === 'suspended') eng.ctx.resume().catch(() => {});
          warmIosMediaKeepalive(url);
          return;
        }
        eng.currentUrl = url;
        startIosSpectrum(url);
        /* Keepalive muto: serve al background (play già concesso dal gesto) */
        warmIosMediaKeepalive(url);
        return;
      }
      /* Stessa URL già aperta (anche in buffering): non resettare src */
      if (eng.currentUrl === url) {
        if (eng.ctx.state === 'suspended') eng.ctx.resume().catch(() => {});
        media.muted = false;
        media.volume = 1;
        const broken = Boolean(media.error)
          || media.networkState === 3 /* NETWORK_NO_SOURCE */
          || (media.readyState === 0 && media.paused);
        if (broken) {
          try { media.removeAttribute('src'); media.load(); } catch (e) { /* ignore */ }
          media.src = hubUrl(`/stream?u=${encodeURIComponent(url)}`);
        }
        if (media.paused || broken) {
          const pending = media.play();
          if (pending) pending.catch(() => { eng.blocked = true; });
        }
        return;
      }
      eng.currentUrl = url;
      media.muted = false;
      media.volume = 1;
      media.src = hubUrl(`/stream?u=${encodeURIComponent(url)}`);
      const pending = media.play();
      if (pending) {
        pending.then(() => {
          if (eng.ctx?.state === 'suspended') eng.ctx.resume().catch(() => {});
        }).catch(() => { eng.blocked = true; });
      }
    },
    suspendIosSpectrum() {
      if (isIOS) stopIosSpectrum();
    },
    halt() {
      if (isIOS) stopIosSpectrum();
      if (!iosBgHandoff) {
        try { media.pause(); } catch (e) { /* ignore */ }
      }
    },
    pause() {
      if (isIOS) stopIosSpectrum();
      try { media.pause(); } catch (e) { /* ignore */ }
      eng.currentUrl = '';
    },
    silence() {
      setMix(0, 0);
    },
    flutter(now) {
      if (!eng.ready || eng.noiseLevel < 0.04) return;
      if (isIOS && now - noiseTimer < 140) return;
      if (now - noiseTimer < 90) return;
      noiseTimer = now;
      const wobble = 0.78 + Math.random() * 0.4;
      eng.noise.gain.setTargetAtTime(eng.noiseLevel * 0.18 * wobble, eng.ctx.currentTime, 0.05);
    }
  };
}

function concatBytes(a, b) {
  if (!a.length) return b ? b.slice() : a;
  if (!b || !b.length) return a;
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/* MP3 frame parser (stile Phonograph): su iOS decodeAudioData accetta solo pezzi tagliati sui frame */
const MP3_BITRATE = {
  11: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
  12: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
  13: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  21: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
  22: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  23: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
};
const MP3_SR = {
  1: [44100, 48000, 32000],
  2: [22050, 24000, 16000]
};

function mp3HeaderAt(data, i) {
  if (i + 3 >= data.length) return null;
  if (data[i] !== 0xff || (data[i + 1] & 0xe0) !== 0xe0) return null;
  if ((data[i + 1] & 0x06) === 0) return null;
  if ((data[i + 2] & 0xf0) === 0xf0) return null;
  if ((data[i + 2] & 0x0c) === 0x0c) return null;
  const verBits = (data[i + 1] >> 3) & 0x03;
  const layerBits = (data[i + 1] >> 1) & 0x03;
  if (verBits === 1 || layerBits === 0) return null;
  const mpegVersion = verBits === 3 ? 1 : 2;
  const mpegLayer = 4 - layerBits;
  const brCode = (data[i + 2] >> 4) & 0x0f;
  const srCode = (data[i + 2] >> 2) & 0x03;
  if (!brCode || brCode === 0x0f || srCode === 0x03) return null;
  const table = MP3_BITRATE[`${mpegVersion}${mpegLayer}`];
  const rates = MP3_SR[mpegVersion];
  if (!table || !rates) return null;
  const bitrate = table[brCode] * 1000;
  const sampleRate = rates[srCode];
  if (!bitrate || !sampleRate) return null;
  const padding = (data[i + 2] >> 1) & 0x01;
  const length = mpegLayer === 1
    ? Math.floor((12 * bitrate) / sampleRate + padding) * 4
    : Math.floor((144 * bitrate) / sampleRate) + padding;
  if (length < 24) return null;
  return {
    length,
    sampleRate,
    layer: mpegLayer,
    channels: ((data[i + 3] >> 6) & 0x03) === 3 ? 1 : 2,
    mpegVersion: data[i + 1] & 0x08,
    mpegLayer: data[i + 1] & 0x06,
    sampleRateBits: data[i + 2] & 0x0c,
    channelMode: data[i + 3] & 0xc0
  };
}

function findMp3Frame(data, from = 0) {
  for (let i = from; i < data.length - 4; i += 1) {
    const h = mp3HeaderAt(data, i);
    if (!h) continue;
    if (i + h.length <= data.length) {
      const next = mp3HeaderAt(data, i + h.length);
      if (next || i + h.length + 4 >= data.length) return { index: i, header: h };
    } else if (i === from || data[i] === 0xff) {
      return { index: i, header: h, incomplete: true };
    }
  }
  return null;
}

function takeMp3Chunk(data, minFrames = 40, maxFrames = 72) {
  const first = findMp3Frame(data, 0);
  if (!first || first.incomplete) return null;
  let i = first.index;
  let frames = 0;
  let lastEnd = i;
  while (frames < maxFrames) {
    const h = mp3HeaderAt(data, i);
    if (!h) break;
    if (i + h.length > data.length) break;
    i += h.length;
    lastEnd = i;
    frames += 1;
    if (frames >= minFrames && data.length - lastEnd < 2048) break;
  }
  if (frames < Math.min(12, minFrames)) return null;
  return {
    bytes: data.subarray(first.index, lastEnd),
    rest: data.subarray(lastEnd),
    frames,
    sampleRate: first.header.sampleRate,
    channels: first.header.channels
  };
}

function audioDataToBuffer(ctx, audioData) {
  const buffer = ctx.createBuffer(
    audioData.numberOfChannels,
    audioData.numberOfFrames,
    audioData.sampleRate
  );
  for (let ch = 0; ch < audioData.numberOfChannels; ch += 1) {
    const dest = buffer.getChannelData(ch);
    try {
      audioData.copyTo(dest, { planeIndex: ch, format: 'f32-planar' });
    } catch (e) {
      try {
        audioData.copyTo(dest, { planeIndex: ch });
      } catch (err) {
        /* canale non copiabile */
      }
    }
  }
  try { audioData.close(); } catch (e) { /* ignore */ }
  return buffer;
}

async function canUseMp3AudioDecoder() {
  if (typeof AudioDecoder === 'undefined' || typeof EncodedAudioChunk === 'undefined') return false;
  try {
    const info = await AudioDecoder.isConfigSupported({
      codec: 'mp3',
      sampleRate: 44100,
      numberOfChannels: 2
    });
    return Boolean(info?.supported);
  } catch (e) {
    return false;
  }
}

function noiseBuffer(ctx) {
  const len = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < len; i += 1) {
    const white = Math.random() * 2 - 1;
    brown = (brown + 0.02 * white) / 1.02;
    data[i] = white * 0.55 + brown * 2.4;
  }
  return buffer;
}

function volToGain(unit) {
  if (unit <= 0.001) return 0;
  return Math.pow(unit, 1.75) * 0.92;
}

function clamp(n, a, b) {
  return Math.min(b, Math.max(a, n));
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function bandSpec() {
  return state.band === 'fm' ? FM : AM;
}

function currentFreq() {
  return state.band === 'fm' ? state.fm : state.am;
}

function smoothstep(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function nearest() {
  const list = stations[state.band];
  const freq = currentFreq();
  let station = null;
  let dist = Infinity;
  for (const item of list) {
    const d = Math.abs(item.freq - freq);
    if (d < dist) {
      dist = d;
      station = item;
    }
  }
  return { station, dist };
}

function remoteLeavingKey(key) {
  return Boolean(key && remoteTuneLeave && remoteTuneLeave.key === key);
}

function remoteLeavingStation(station) {
  return Boolean(station && remoteLeavingKey(stationKeyOf(station)));
}

/* Fuori da questa distanza la calamita non può più risucchiare la stazione lasciata */
function remoteLeaveEscapeDist() {
  return state.band === 'fm' ? bandSpec().win : 16;
}

function remoteLeaveClearedByDistance() {
  const leave = remoteTuneLeave;
  if (!leave) return false;
  const origin = Number(leave.origin);
  if (!Number.isFinite(origin)) return false;
  const dist = Math.abs(currentFreq() - origin);
  const travel = Number(leave.travel) || 0;
  /* Sgancio solo quando sei fuori finestra magnetica, o hai accumulato abbastanza micro-step */
  if (dist >= remoteLeaveEscapeDist() || travel >= remoteLeaveEscapeDist()) {
    remoteTuneLeave = null;
    return true;
  }
  return false;
}

/* Tiene l’aggancio se sei ancora vicino: evita che Zeta/RSC saltino a una vicina */
function nearestSticky() {
  const near = nearest();
  if (!state.locked) return near;
  const lockedKey = stationKeyOf(state.locked);
  /* Telecomando in uscita: non restare calamitati sulla stazione che stai lasciando */
  if (remoteLeavingKey(lockedKey)) return near;
  const still = (stations[state.band] || []).find((s) => stationKeyOf(s) === lockedKey) || state.locked;
  const lockedDist = Math.abs(Number(still.freq) - currentFreq());
  const stick = state.band === 'fm' ? 0.2 : 9;
  if (lockedDist <= stick) {
    if (!near.station || near.dist + 0.05 >= lockedDist) {
      return { station: still, dist: lockedDist };
    }
  }
  return near;
}

function isTvMode() {
  return state.viewMode === 'video';
}

/* RADIO = catalogo audio; TV = mappa fissa (stessi MHz del brand) */
function rebuildDialForMode() {
  const fmAll = applyBrandFreqs(catalog.fm.map((s) => withVideo({ ...s })));
  const amAll = catalog.am.map((s) => withVideo({ ...s }));
  if (isTvMode()) {
    stations.fm = tvDial();
    stations.am = [];
    if (state.band === 'am') state.band = 'fm';
  } else {
    stations.fm = fmAll;
    stations.am = amAll;
  }
}

function paintModeTag() {
  if (!modeTag) return;
  const tv = isTvMode();
  modeTag.textContent = tv ? 'TV' : 'RADIO';
  modeTag.classList.toggle('is-tv', tv);
}

function findDialMatch(prev) {
  if (!prev) return null;
  const list = stations[state.band] || [];
  const prevVid = prev.video || videoForStation(prev.name);
  if (prevVid) {
    const byVid = list.find((s) => (s.video || videoForStation(s.name)) === prevVid);
    if (byVid) return byVid;
  }
  /* Stessa frequenza se il brand c’è ancora sul dial */
  const byFreq = list.find((s) => Math.abs(s.freq - prev.freq) < 0.05);
  if (byFreq) return byFreq;
  const key = String(prev.name || '').toLowerCase().replace(/\s+/g, ' ').trim()
    .replace(/\s+tv$/i, '').replace(/\s+network$/i, '');
  return list.find((s) => {
    const n = String(s.name || '').toLowerCase().replace(/\s+/g, ' ').trim()
      .replace(/\s+tv$/i, '').replace(/\s+network$/i, '');
    return n === key || n.includes(key) || key.includes(n);
  }) || null;
}

function lockOf(dist) {
  const win = bandSpec().win;
  if (!Number.isFinite(dist) || dist >= win) return 0;
  return smoothstep(1 - dist / win);
}

function persistFace() {
  try {
    localStorage.setItem('radio-face-v1', JSON.stringify({
      band: state.band,
      fm: state.fm,
      am: state.am,
      volume: state.volume,
      bass: state.bass,
      treble: state.treble,
      stereo: state.stereo,
      auto: state.auto
    }));
  } catch (e) { /* memoria non disponibile */ }
}

function flash(text, gold) {
  window.clearTimeout(flashTimer);
  setStationNameText(text, { gold: Boolean(gold) });
  flashTimer = window.setTimeout(() => {
    if (stationName) stationName.classList.remove('is-gold');
    paintStation();
  }, 1300);
}

let lastTrackStationUrl = '';

let dialLampRaf = 0;
let dialLampWarm = 0;
let dialLampLevel = 0.55;
let dialLampPhase = Math.random() * Math.PI * 2;
let dialLampPhase2 = Math.random() * Math.PI * 2;

function dialLampTuneTarget() {
  if (!state.power) return 0;
  const { station, dist } = nearest();
  const lock = station ? lockOf(dist) : 0;
  /* Densità luce con la sintonia (solo opacità, niente layout) */
  let t = 0.22 + lock * 0.28;
  if (state.locked && !state.stopped) t += 0.06;
  if (state.stopped) t *= 0.7;
  return clamp(t, 0.14, 0.58);
}

function syncDialLamp() {
  const lamp = document.getElementById('dialLamp');
  if (!lamp) return;
  const on = Boolean(state.power);
  if (on && !dialLampRaf) {
    const tick = () => {
      if (!state.power) {
        dialLampRaf = 0;
        dialLampWarm = 0;
        dialLampLevel = 0;
        lamp.style.opacity = '0';
        return;
      }
      const target = dialLampTuneTarget();
      dialLampWarm += (1 - dialLampWarm) * 0.07;
      dialLampLevel += (target - dialLampLevel) * 0.1;
      /* Micro-hum elettrico: solo densità luce */
      dialLampPhase += 0.012 + Math.random() * 0.008;
      dialLampPhase2 += 0.02 + Math.random() * 0.01;
      const wave = Math.sin(dialLampPhase) * 0.028 + Math.sin(dialLampPhase2 * 1.6) * 0.016;
      const jitter = (Math.random() - 0.5) * 0.03;
      const live = clamp(dialLampLevel * dialLampWarm * (1 + wave + jitter), 0.08, 0.62);
      lamp.style.opacity = live.toFixed(3);
      dialLampRaf = requestAnimationFrame(tick);
    };
    dialLampRaf = requestAnimationFrame(tick);
  }
  if (!on && dialLampRaf) {
    cancelAnimationFrame(dialLampRaf);
    dialLampRaf = 0;
    dialLampWarm = 0;
    dialLampLevel = 0;
    lamp.style.opacity = '0';
  }
}

function paintStereoPilot() {
  /* Spia STEREO (display sinistro):
     - niente segnale → lampeggio
     - fruscio / avvicinamento → rosso fisso
     - stazione agganciata → verde fisso
     (anche in pausa sulla frequenza: verde, non lampeggio) */
  if (!state.power) {
    radio.classList.remove('is-locked', 'is-noise');
    return;
  }
  const { station, dist } = nearest();
  const lock = station ? lockOf(dist) : 0;
  const receiving = Boolean(state.locked && !state.stopped);
  const onStation = Boolean(station && lock > 0.55);
  const showLock = receiving || (state.stopped && onStation);
  const showNoise = !showLock && Boolean(station && lock > 0.15);
  radio.classList.toggle('is-locked', showLock);
  radio.classList.toggle('is-noise', showNoise);
}

function paintStation() {
  paintStereoPilot();
  radio.classList.toggle('is-stereo', Boolean(state.stereo));
  paintViewAvail();
  paintModeTag();
  syncDialLamp();
  if (!state.power) {
    setStationNameText('');
    paintStationLogo(null);
    setNowPlaying('', '');
    stopTrackPoll();
    lastTrackStationUrl = '';
    updateMediaSession();
    syncVideoView();
    return;
  }
  /* Durante eventuale seek residuo: non azzerare nome/logo (evita salti head/meteo) */
  if (seekActive && !state.locked) {
    updateMediaSession();
    syncVideoView();
    return;
  }
  const station = state.locked || null;
  setStationNameText(station ? station.name : '');
  paintStationLogo(station);
  const url = station && !state.stopped ? station.url : '';
  if (url !== lastTrackStationUrl) {
    lastTrackStationUrl = url;
    setNowPlaying('', '');
    if (url) scheduleFirstTrackPoll();
    else stopTrackPoll();
  } else if (!url) {
    setNowPlaying('', '');
    stopTrackPoll();
  } else if (!trackPollTimer) {
    scheduleTrackPoll(10000);
  }
  updateMediaSession();
  syncVideoView();
}

function stationVideoUrl(station) {
  if (!station) return '';
  return station.video || videoForStation(station.name) || '';
}

let videoLoadGen = 0;
let videoAudioLatched = false;
let seekActive = false;
let holdVideoUrl = '';
/* CH± tenuti premuti: scan continuo che accelera, al rilascio aggancio stazione */
const chFastSeek = {
  held: false,
  active: false,
  dir: 0,
  raf: 0,
  holdTimer: 0,
  speed: 0,
  lastT: 0
};

function activeVideoStation() {
  if (!state.power) return null;
  /* Durante lo scan del dial in TV non agganciare canali di passaggio */
  if (seekActive && isTvMode()) return null;
  /* Stessa soglia del lock audio: niente verde “a vuoto” */
  let station = state.locked;
  if (!station) {
    const near = nearest();
    /* In TV soglia più bassa: non perdere l’HLS tra un tick e l’altro */
    const need = isTvMode() ? 0.42 : 0.78;
    if (near.station && lockOf(near.dist) > need) station = near.station;
  }
  if (!station) return null;
  const full = withVideo(station);
  return full?.video ? full : null;
}

function stationHasVideo() {
  return Boolean(activeVideoStation());
}

function paintViewAvail() {
  /* In TV il dial è già solo radiovisione; in RADIO verde = esiste versione TV */
  let has = false;
  if (state.power) {
    if (state.viewMode === 'video') {
      const near = nearest();
      has = Boolean(state.locked || (near.station && lockOf(near.dist) > 0.78));
    } else {
      has = stationHasVideo();
    }
  }
  btnViewMode?.classList.toggle('has-video', has);
  btnViewMode?.setAttribute('data-has-video', has ? '1' : '0');
}

function paintViewMode() {
  const video = state.viewMode === 'video';
  glass?.classList.toggle('is-video', video);
  btnViewMode?.classList.toggle('is-video', video);
  btnViewMode?.setAttribute('aria-pressed', String(video));
  paintModeTag();
  paintViewAvail();
  if (specPanel) specPanel.hidden = video;
  if (videoPanel) videoPanel.hidden = !video;
  syncVideoView();
}

function setCrtHud(text) {
  if (!crtHud) return;
  if (!text) {
    crtHud.hidden = true;
    crtHud.textContent = '';
    return;
  }
  crtHud.textContent = text;
  crtHud.hidden = false;
}

/*
  RADIO: audio MP3/AAC dello SPECTRUM.
  TV: audio+video dallo stesso HLS (radiovisione) — allineati.
*/
function setStationVideoGain() {
  if (!stationVideo) return;
  stationVideo.volume = clamp(state.volume / 10, 0, 1);
}

function latchVideoAudio(on) {
  if (!stationVideo) return;
  if (on) {
    if (castUi.casting) {
      stationVideo.muted = true;
      stationVideo.volume = 0;
      return;
    }
    muteTabletAudio(true);
    stationVideo.muted = false;
    setStationVideoGain();
    videoAudioLatched = true;
    return;
  }
  stationVideo.muted = true;
  stationVideo.volume = 0;
  if (!videoAudioLatched) return;
  videoAudioLatched = false;
  if (castUi.casting) return;
  muteTabletAudio(false);
  if (state.power && !state.stopped && engine.ready && !isTvMode()) {
    const { station, dist } = nearest();
    const lock = station ? lockOf(dist) : 0;
    engine.setMix(lock, 1 - lock);
  }
}

function stopStationVideo({ snow = true } = {}) {
  videoLoadGen += 1;
  crtRevealTok += 1;
  latchVideoAudio(false);
  if (snow) hideCrtSignal();
  else {
    videoWell?.classList.remove('has-signal');
    stopCrtStatic();
  }
  if (hlsPlayer) {
    try { hlsPlayer.destroy(); } catch (e) { /* ignore */ }
    hlsPlayer = null;
  }
  if (!stationVideo) return;
  try {
    stationVideo.pause();
    stationVideo.removeAttribute('src');
    stationVideo.removeAttribute('srcObject');
  } catch (e) { /* ignore */ }
  delete stationVideo.dataset.url;
  syncCrtAspect();
}

function playStationVideo(url) {
  if (!stationVideo || !url) return;
  if (stationVideo.dataset.url === url && (hlsPlayer || !stationVideo.error)) {
    if (stationVideo.paused) {
      hideCrtSignal();
      stationVideo.play().then(() => {
        latchVideoAudio(true);
        armCrtReveal();
      }).catch(() => {});
    } else if (stationVideo.readyState >= 2 && stationVideo.currentTime > 0.05) {
      latchVideoAudio(true);
      showCrtSignal();
    } else {
      hideCrtSignal();
      armCrtReveal();
    }
    return;
  }

  const loadGen = ++videoLoadGen;
  if (hlsPlayer) {
    try { hlsPlayer.destroy(); } catch (e) { /* ignore */ }
    hlsPlayer = null;
  }
  try {
    stationVideo.pause();
    stationVideo.removeAttribute('src');
  } catch (e) { /* ignore */ }

  stationVideo.dataset.url = url;
  stationVideo.playsInline = true;
  /* Muto finché non c’è play: poi audio HLS (= canzone TV) */
  stationVideo.muted = true;
  stationVideo.volume = 0;
  hideCrtSignal();

  const alive = () => loadGen === videoLoadGen
    && state.viewMode === 'video'
    && state.power
    && !state.stopped
    && stationVideo.dataset.url === url;

  const onFail = () => {
    if (loadGen !== videoLoadGen) return;
    stopStationVideo();
    videoWell?.classList.add('no-signal');
    setCrtHud('NO SIGNAL');
  };

  const startReveal = () => {
    if (!alive()) return;
    latchVideoAudio(true);
    armCrtReveal();
  };

  stationVideo.preload = 'auto';

  if (stationVideo.canPlayType('application/vnd.apple.mpegurl')) {
    stationVideo.src = url;
    stationVideo.play().then(startReveal).catch(onFail);
    return;
  }
  if (window.Hls?.isSupported()) {
    /*
      Live radiovisione: stabile ma avvio rapido sul cambio canale.
      (Buffer enorme + testBandwidth ritardavano troppo il play.)
    */
    hlsPlayer = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 30,
      maxBufferLength: 24,
      maxMaxBufferLength: 48,
      maxBufferSize: 60 * 1000 * 1000,
      maxBufferHole: 0.5,
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 10,
      liveDurationInfinity: true,
      liveSyncOnStallIncrease: 1,
      maxLiveSyncPlaybackRate: 1.0,
      testBandwidth: false,
      abrEwmaDefaultEstimate: 1800000,
      abrBandWidthFactor: 0.9,
      abrBandWidthUpFactor: 0.7,
      fragLoadingTimeOut: 12000,
      fragLoadingMaxRetry: 5,
      fragLoadingRetryDelay: 500,
      manifestLoadingTimeOut: 10000,
      manifestLoadingMaxRetry: 4,
      manifestLoadingRetryDelay: 500,
      levelLoadingTimeOut: 10000,
      levelLoadingMaxRetry: 4,
      levelLoadingRetryDelay: 500,
      xhrSetup(xhr) {
        try { xhr.withCredentials = false; } catch (e) { /* ignore */ }
      }
    });
    hlsPlayer.loadSource(url);
    hlsPlayer.attachMedia(stationVideo);
    hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
      if (!alive()) return;
      stationVideo.play().then(startReveal).catch(onFail);
    });
    let mediaRecoveries = 0;
    hlsPlayer.on(Hls.Events.ERROR, (_ev, data) => {
      if (loadGen !== videoLoadGen || !data) return;
      if (!data.fatal) return;
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        try { hlsPlayer.startLoad(); } catch (e) { onFail(); }
        return;
      }
      if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        mediaRecoveries += 1;
        if (mediaRecoveries <= 3) {
          try { hlsPlayer.recoverMediaError(); } catch (e) { onFail(); }
          return;
        }
      }
      onFail();
    });
    return;
  }
  onFail();
}

if (stationVideo) {
  stationVideo.addEventListener('loadedmetadata', syncCrtAspect);
  stationVideo.addEventListener('loadeddata', syncCrtAspect);
  stationVideo.addEventListener('resize', syncCrtAspect);
  stationVideo.addEventListener('playing', () => {
    if (state.viewMode === 'video' && state.power && !state.stopped) {
      latchVideoAudio(true);
      armCrtReveal();
    }
  });
}

function syncVideoView() {
  if (!stationVideo || !videoPanel) return;
  if (state.viewMode !== 'video' || !state.power) {
    holdVideoUrl = '';
    stopStationVideo({ snow: false });
    stopCrtStatic();
    videoWell?.classList.remove('has-signal', 'is-paused', 'no-signal');
    setCrtHud('');
    return;
  }
  if (state.stopped) {
    holdVideoUrl = '';
    stopStationVideo({ snow: false });
    videoWell?.classList.remove('has-signal', 'no-signal');
    videoWell?.classList.add('is-paused');
    setCrtHud('PAUSE');
    return;
  }
  videoWell?.classList.remove('is-paused');
  let station = activeVideoStation();
  let url = stationVideoUrl(station);
  /* Non spegnere l’HLS a metà salto o tra due lock: tiene l’ultimo stream valido */
  if (!url && isTvMode()) {
    if (seekActive) {
      /* Durante lo scan: tieni ciò che sta già caricando (target o ultimo) */
      url = stationVideo.dataset.url || holdVideoUrl || '';
    } else {
      const near = nearest();
      if (near.station && stationVideoUrl(near.station) && lockOf(near.dist) > 0.12) {
        station = near.station;
        url = stationVideoUrl(near.station);
      }
    }
  }
  if (!url) {
    holdVideoUrl = '';
    stopStationVideo({ snow: false });
    videoWell?.classList.add('no-signal');
    setCrtHud('NO SIGNAL');
    hideCrtSignal();
    return;
  }
  holdVideoUrl = url;
  videoWell?.classList.remove('no-signal');
  if (!videoWell?.classList.contains('has-signal')) setCrtHud('');
  playStationVideo(url);
}

function snapToStation(station, { announce } = {}) {
  if (!station) return;
  cancelAfc();
  seekActive = false;
  if (state.band === 'fm') state.fm = station.freq;
  else state.am = station.freq;
  state.locked = state.power && !state.stopped ? station : null;
  paintDial();
  paintStation();
  if (state.power && !state.stopped) catchStation(station);
  persistFace();
  if (announce) flash(announce, true);
}

let settingsSuspendedForVideo = false;

function toggleViewMode() {
  const prev = state.locked || nearest().station;
  const goingTv = state.viewMode !== 'video';
  /* Tasto video ha priorità: chiude subito le impostazioni, poi le ripristina al ritorno */
  if (goingTv) {
    if (isMonitorSettingsOpen()) {
      settingsSuspendedForVideo = true;
      openMonitorSettings(false, { preservePage: true });
    } else {
      settingsSuspendedForVideo = false;
    }
  }
  state.viewMode = goingTv ? 'video' : 'spectrum';
  rebuildDialForMode();
  /* TV: solo canali con radiovisione; RADIO: gemello audio sulla stessa frequenza */
  let match = findDialMatch(prev);
  if (!match && prev) {
    const list = stations.fm || [];
    let best = null;
    let dist = Infinity;
    for (const s of list) {
      const d = Math.abs(s.freq - prev.freq);
      if (d < dist) {
        dist = d;
        best = s;
      }
    }
    match = best;
  }
  match = match || stations.fm[0] || null;
  if (match) {
    state.band = 'fm';
    state.fm = match.freq;
    state.locked = state.power && !state.stopped ? match : null;
    if (goingTv) {
      engine.silence();
      holdVideoUrl = stationVideoUrl(match) || '';
    }
  } else {
    state.locked = null;
  }
  /* Lock già sulla frequenza giusta prima del paint → HLS subito, senza NO SIGNAL */
  paintViewMode();
  paintDial();
  if (state.power && !state.stopped && match) catchStation(match);
  else if (state.power && !state.stopped) settleTune();
  flash(goingTv ? 'TV' : 'RADIO', true);
  if (!goingTv && settingsSuspendedForVideo) {
    settingsSuspendedForVideo = false;
    openMonitorSettings(true, { preservePage: true });
  }
}

let lastNeedlePct = null;
let needleAnimToken = 0;

function needlePctForBand(band) {
  const pad = 2.2;
  if (band === 'am') {
    return pad + ((state.am - AM.min) / (AM.max - AM.min)) * (100 - pad * 2);
  }
  return pad + ((state.fm - FM.min) / (FM.max - FM.min)) * (100 - pad * 2);
}

function setNeedlePosition(pct, { animate = false } = {}) {
  if (!dialNeedle) return;
  const to = clamp(pct, 2.2, 97.8);
  if (!animate || lastNeedlePct == null) {
    needleAnimToken += 1;
    dialNeedle.style.left = `${to}%`;
    if (vintageNeedle) vintageNeedle.style.left = `${to}%`;
    lastNeedlePct = to;
    return;
  }
  const from = lastNeedlePct;
  const token = ++needleAnimToken;
  const t0 = performance.now();
  const dur = 340;
  const step = (now) => {
    if (token !== needleAnimToken) return;
    const t = Math.min(1, (now - t0) / dur);
    const e = t * t * (3 - 2 * t);
    const needleLeft = `${from + (to - from) * e}%`;
    dialNeedle.style.left = needleLeft;
    if (vintageNeedle) vintageNeedle.style.left = needleLeft;
    if (t < 1) {
      requestAnimationFrame(step);
      return;
    }
    lastNeedlePct = to;
  };
  requestAnimationFrame(step);
}

function paintDial() {
  /* Un solo ago: posizione della banda attiva (animato su cambio FM/AM) */
  const animateNeedle = Boolean(paintDial._animateTune);
  setNeedlePosition(needlePctForBand(state.band), { animate: animateNeedle });
  /* Formato fisso stile Casio: allinea agli “8” fantasma sotto */
  freqFm.textContent = state.fm.toFixed(1).padStart(5, ' ');
  freqAm.textContent = String(Math.round(state.am)).padStart(4, ' ');
  bandFm.classList.toggle('is-active', state.power && state.band === 'fm');
  bandAm.classList.toggle('is-active', state.power && state.band === 'am');
  const spec = bandSpec();
  setTuneRotation(tuneAngle(), { animate: animateNeedle });
  paintDial._animateTune = false;
  tuneKnob.setAttribute('aria-valuenow', state.band === 'fm' ? state.fm.toFixed(1) : String(Math.round(state.am)));
  tuneKnob.setAttribute('aria-valuemin', String(spec.min));
  tuneKnob.setAttribute('aria-valuemax', String(spec.max));
  paintTuneIndicated();
  paintStation();
  scheduleRemoteState();
}

function paintTuneIndicated() {
  const nums = document.getElementById('tuneNums');
  if (!nums) return;
  const band = state.band;
  const freq = currentFreq();
  let best = null;
  let bestDist = Infinity;
  for (const el of nums.querySelectorAll(`.tune-lab.is-${band}[data-freq]`)) {
    el.classList.remove('is-indicated');
    const v = Number(el.dataset.freq);
    if (!Number.isFinite(v)) continue;
    const d = Math.abs(v - freq);
    if (d < bestDist) {
      bestDist = d;
      best = el;
    }
  }
  for (const el of nums.querySelectorAll(`.tune-lab.is-${band === 'fm' ? 'am' : 'fm'}[data-freq]`)) {
    el.classList.remove('is-indicated');
  }
  if (best) best.classList.add('is-indicated');
}

function tuneAngle() {
  const spec = bandSpec();
  const p = (currentFreq() - spec.min) / (spec.max - spec.min);
  return -150 + clamp(p, 0, 1) * 300;
}

let lastTuneDeg = tuneAngle();
let tuneAnimToken = 0;

function setTuneRotation(deg, { animate = false } = {}) {
  const rotor = tuneSpin || tuneKnob;
  if (!rotor) return;
  if (!animate) {
    tuneAnimToken += 1;
    rotor.style.transition = 'none';
    rotor.style.transform = `rotate(${deg}deg)`;
    lastTuneDeg = deg;
    return;
  }
  const from = lastTuneDeg;
  const to = deg;
  const token = ++tuneAnimToken;
  const t0 = performance.now();
  const dur = 340;
  const step = (now) => {
    if (token !== tuneAnimToken) return;
    const t = Math.min(1, (now - t0) / dur);
    const e = t * t * (3 - 2 * t);
    const d = from + (to - from) * e;
    rotor.style.transform = `rotate(${d}deg)`;
    if (t < 1) {
      requestAnimationFrame(step);
      return;
    }
    lastTuneDeg = to;
  };
  requestAnimationFrame(step);
}

let volDegShown = -150 + (5 / 10) * 300;
let volAnim = 0;

function paintVolume(opts = {}) {
  const animate = opts.animate !== false;
  const target = -150 + (state.volume / 10) * 300;
  volKnob.setAttribute('aria-valuenow', state.volume.toFixed(1));
  if (panelZoomMode) showZoomHudVol();
  if (!animate) {
    if (volAnim) cancelAnimationFrame(volAnim);
    volAnim = 0;
    volDegShown = target;
    volSpin.style.transform = `rotate(${target}deg)`;
    return;
  }
  const from = volDegShown;
  const to = target;
  if (Math.abs(to - from) < 0.08) {
    volDegShown = to;
    volSpin.style.transform = `rotate(${to}deg)`;
    return;
  }
  if (volAnim) cancelAnimationFrame(volAnim);
  const t0 = performance.now();
  const dur = Math.min(520, 200 + Math.abs(to - from) * 1.6);
  const step = (now) => {
    const t = Math.min(1, (now - t0) / dur);
    const e = t * t * (3 - 2 * t);
    const d = from + (to - from) * e;
    volDegShown = d;
    volSpin.style.transform = `rotate(${d}deg)`;
    if (t < 1) volAnim = requestAnimationFrame(step);
    else volAnim = 0;
  };
  volAnim = requestAnimationFrame(step);
}

function paintEq() {
  /* Bass/Treble UI rimossa: resta solo il tono nel motore audio */
}

function markActive(root, value) {
  for (const span of root.querySelectorAll('[data-v]')) {
    span.classList.toggle('is-active', span.dataset.v === value);
  }
}

function paintModes() {
  markActive(lblBand, state.band === 'am' ? 'am' : 'fm');
  markActive(lblStereo, state.stereo ? 'st' : 'mo');
  markActive(lblAuto, state.auto ? 'auto' : 'man');
  btnBand.classList.toggle('is-right', state.band === 'am');
  btnMono.classList.toggle('is-right', state.stereo);
  btnAuto.classList.toggle('is-right', !state.auto);
  radio.classList.toggle('band-fm', state.band === 'fm');
  radio.classList.toggle('band-am', state.band === 'am');
  radio.classList.toggle('is-stereo', Boolean(state.stereo));
  syncDialLamp();
}

function cancelAfc() {
  afcToken += 1;
  seekToken += 1;
  seekActive = false;
  window.clearTimeout(chFastSeek.holdTimer);
  chFastSeek.holdTimer = 0;
  chFastSeek.held = false;
  chFastSeek.active = false;
  if (chFastSeek.raf) {
    cancelAnimationFrame(chFastSeek.raf);
    chFastSeek.raf = 0;
  }
}

function stationAtFreq(freq) {
  const list = stations[state.band] || [];
  let best = null;
  let dist = Infinity;
  for (const s of list) {
    const d = Math.abs(s.freq - freq);
    if (d < dist) {
      dist = d;
      best = s;
    }
  }
  return best;
}

/* Salto stazione / AUTO: scan Casio sul dial (anche in TV), poi lock.
   opts.pace = 'remote' → scorrimento più lento/leggibile (telecomando). */
function seekFreqTo(target, opts = {}) {
  const spec = bandSpec();
  const to = clamp(target, spec.min, spec.max);
  const from = currentFreq();
  const dist = Math.abs(to - from);
  const fine = state.band === 'fm' ? 0.04 : 1.5;
  cancelAfc();
  const token = ++seekToken;
  const targetStation = stationAtFreq(to);
  const remotePace = opts.pace === 'remote';

  /* Solo salti cortissimi: latch diretto (TV inclusa nell’animazione sotto) */
  if (dist <= fine) {
    seekActive = false;
    if (state.band === 'fm') state.fm = targetStation ? targetStation.freq : to;
    else state.am = targetStation ? targetStation.freq : to;
    paintDial();
    if (panelZoomMode) showZoomHudFreq();
    /* Audio prima del poll ICY (paintStation) */
    if (state.power && !state.stopped && targetStation) catchStation(targetStation);
    else {
      state.locked = targetStation || null;
      paintStation();
    }
    persistFace();
    return;
  }

  /* Velocità tipo scan; remote più lento così i MHz scorrono leggibili */
  const speed = remotePace
    ? (state.band === 'fm' ? 9 : 480)
    : (state.band === 'fm' ? 22 : 1200);
  const dur = clamp((dist / speed) * 1000, remotePace ? 380 : 240, remotePace ? 1600 : 1200);
  const t0 = performance.now();
  seekActive = true;
  state.locked = null;
  /* Non ripulire nome/logo a metà scan: evita salti verticali head/meteo */
  paintStereoPilot();
  paintViewAvail();
  paintModeTag();
  syncDialLamp();
  if (!isTvMode() && state.power && !state.stopped && !castUi.casting) {
    engine.setMix(0, 1);
  }

  const step = (now) => {
    /* Non toccare seekActive: un nuovo seek può essere già partito */
    if (token !== seekToken) return;
    const t = Math.min(1, (now - t0) / dur);
    /* Quasi lineare: i segmenti Casio scorrono in modo leggibile */
    const e = t < 0.85 ? t / 0.85 * 0.92 : 0.92 + (t - 0.85) / 0.15 * 0.08;
    const freq = from + (to - from) * Math.min(1, e);
    if (state.band === 'fm') state.fm = freq;
    else state.am = freq;
    paintDial();
    if (panelZoomMode) showZoomHudFreq();
    if (!isTvMode() && engine.ready && state.power && !state.stopped && !castUi.casting) {
      engine.flutter(now);
      /* Durante lo scan: apri già lo stream sotto al rumore → all’arrivo è bufferizzato */
      if (t > 0.42 && targetStation?.url && engine.currentUrl !== targetStation.url) {
        engine.play(targetStation.url);
      }
    } else if (isTvMode() && t > 0.22 && targetStation && state.power && !state.stopped) {
      /* Precarica HLS del canale target mentre il dial scorre */
      const vurl = stationVideoUrl(targetStation);
      if (vurl && stationVideo?.dataset.url !== vurl) {
        holdVideoUrl = vurl;
        playStationVideo(vurl);
      }
    }
    if (t < 1) {
      requestAnimationFrame(step);
      return;
    }
    if (token !== seekToken) return;
    seekActive = false;
    const landed = targetStation || stationAtFreq(to);
    if (state.band === 'fm') state.fm = landed ? landed.freq : to;
    else state.am = landed ? landed.freq : to;
    paintDial();
    if (state.power && !state.stopped && landed) catchStation(landed);
    else {
      state.locked = landed;
      paintStation();
      if (state.power && !state.stopped) settleTune();
    }
    persistFace();
  };
  requestAnimationFrame(step);
}

function setFreq(value, opts = {}) {
  const spec = bandSpec();
  const freq = clamp(value, spec.min, spec.max);
  if (opts.jump) {
    seekFreqTo(freq);
    if (panelZoomMode) showZoomHudFreq();
    return;
  }
  seekToken += 1;
  if (state.band === 'fm') state.fm = freq;
  else state.am = freq;
  paintDial();
  followTune(Boolean(opts.drag));
  if (panelZoomMode) showZoomHudFreq();
}

function followTune(dragging) {
  if (!state.power || state.stopped) {
    engine.silence();
    state.locked = null;
    paintStation();
    return;
  }
  if (castUi.casting) {
    muteTabletAudio(true);
    const { station, dist } = nearestSticky();
    const lock = station ? lockOf(dist) : 0;
    state.locked = lock > 0.72 && !remoteLeavingStation(station) ? station : null;
    paintStation();
    return;
  }
  const { station, dist } = nearestSticky();
  const lock = station ? lockOf(dist) : 0;

  /* Modalità TV: niente MP3 radio — solo lock + HLS A/V (isteresi anti stop/start) */
  if (isTvMode()) {
    window.clearTimeout(dwellTimer);
    dwellTimer = 0;
    dwellTarget = null;
    engine.silence();
    if (station && lock > 0.55 && !remoteLeavingStation(station)) {
      const prevUrl = stationVideoUrl(state.locked) || holdVideoUrl;
      const nextUrl = stationVideoUrl(station);
      state.locked = station;
      /* Aggiorna UI/video solo se cambia canale o non era in lock */
      if (prevUrl !== nextUrl || !radio.classList.contains('is-locked')) paintStation();
      else {
        paintViewAvail();
        paintModeTag();
      }
      return;
    }
    if (station && lock > 0.2 && state.locked && stationVideoUrl(state.locked) === stationVideoUrl(station)) {
      return;
    }
    if (lock < 0.18) {
      state.locked = null;
      paintStation();
    }
    return;
  }

  const loaded = station && engine.currentUrl === station.url;

  /* Pallino verde = segnale: avvia subito lo stream (soglia più bassa = ricezione più snella) */
  if (station && lock > 0.55 && !remoteLeavingStation(station)) {
    state.locked = station;
    window.clearTimeout(dwellTimer);
    dwellTimer = 0;
    dwellTarget = null;
    if (!loaded) engine.play(station.url);
    const mix = Math.max(lock, 0.9);
    engine.setMix(mix, 1 - mix);
    paintStation();
    return;
  }

  if (
    remoteLeavingStation(station)
    || !(state.locked && station && stationKeyOf(state.locked) === stationKeyOf(station) && lock > 0.28)
  ) {
    state.locked = null;
    paintStation();
  }
  if (loaded) engine.setMix(lock, 1 - lock);
  else engine.setMix(0, 1);

  /* Precarica in avvicinamento, senza riavviare il timer sulla stessa URL */
  if (dragging && station && lock > 0.22) {
    if (loaded || dwellTarget === station.url) return;
    window.clearTimeout(dwellTimer);
    dwellTarget = station.url;
    dwellTimer = window.setTimeout(() => {
      dwellTimer = 0;
      dwellTarget = null;
      if (!state.power || state.stopped || isTvMode()) return;
      if (engine.currentUrl === station.url) return;
      engine.play(station.url);
      const again = lockOf(Math.abs(station.freq - currentFreq()));
      engine.setMix(Math.max(again, 0.35), 1 - Math.max(again, 0.35));
    }, 40);
  } else {
    window.clearTimeout(dwellTimer);
    dwellTimer = 0;
    dwellTarget = null;
  }
}

function catchStation(station) {
  if (!station) return;
  if (isTvMode()) {
    engine.silence();
    state.locked = station;
    if (state.band === 'fm') state.fm = station.freq;
    else state.am = station.freq;
    holdVideoUrl = stationVideoUrl(station) || holdVideoUrl;
    paintStation();
    /* Forza subito l’HLS sul canale target (niente attesa soglia) */
    const url = stationVideoUrl(station);
    if (url && state.viewMode === 'video' && state.power && !state.stopped) {
      videoWell?.classList.remove('no-signal', 'is-paused');
      playStationVideo(url);
    }
    return;
  }
  if (castUi.casting) {
    state.locked = station;
    engine.play(station.url);
    engine.setMix(1, 0);
    paintStation();
    return;
  }
  state.locked = station;
  /* Stessa URL già aperta in scan/buffer: non riavviare, solo lock pieno */
  if (engine.currentUrl === station.url) {
    engine.play(station.url);
    engine.setMix(1, 0);
    paintStation();
    return;
  }
  engine.play(station.url);
  /* Latch subito: volume pieno al primo byte utile, senza fade lungo */
  engine.setMix(1, 0);
  paintStation();
  const arm = () => {
    if (!state.power || state.stopped) return;
    if (state.locked?.url !== station.url && engine.currentUrl !== station.url) return;
    engine.setMix(1, 0);
  };
  audio.addEventListener('playing', arm, { once: true });
  audio.addEventListener('canplay', arm, { once: true });
  audio.addEventListener('loadeddata', arm, { once: true });
}

function streamAbsolute(url) {
  return hubUrl(`/stream?u=${encodeURIComponent(url)}`);
}

/* Cast: URL diretto alla cassa (niente hop Worker = più veloce). Proxy solo se URL non valido. */
function castContentUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
  } catch (e) { /* ignore */ }
  return streamAbsolute(url);
}

function muteTabletAudio(on) {
  if (on) {
    /* Non mettere in pausa: spegne solo l’uscita tablet, lo stream resta per lo spettro */
    audio.muted = true;
    audio.volume = 0;
    if (engine.ready) engine.setVolume(0);
  } else {
    audio.muted = false;
    audio.volume = 1;
    if (engine.ready) engine.setVolume(state.volume / 10);
  }
}

/* Dopo Cast OFF: audio sul tablet subito (stream spesso già caldo e muto) */
function resumeTabletAfterCast() {
  castUi.contentUrl = '';
  castUi.loading = false;
  castUi.loadSeq += 1;
  /* Unmute immediato — prima di qualsiasi await sulla cassa */
  muteTabletAudio(false);
  try {
    audio.muted = false;
    audio.volume = 1;
  } catch (e) { /* ignore */ }
  /* Non clearIosBackgroundAudio qui: su Android spegneva lo stream al rientro Cast */
  if (isIOS) {
    try { leaveIosBackgroundAudio(); } catch (e) { /* ignore */ }
  }
  if (!state.power || state.stopped) {
    updateMediaSession();
    return;
  }
  engine.start();
  armMediaPlaybackSession();
  if (engine.ctx?.state === 'suspended') engine.ctx.resume().catch(() => {});
  try { engine.setMix(1, 0); } catch (e) { /* ignore */ }
  engine.setVolume(state.volume / 10);
  engine.setTone(state.bass, state.treble);
  const station = state.locked || nearest().station;
  const nearOk = station && lockOf(Math.abs(station.freq - currentFreq())) > 0.35;
  if (nearOk) {
    state.locked = station;
    /* Stesso URL: riparti subito; se paused/blocked forza play */
    if (engine.currentUrl === station.url) {
      engine.setMix(1, 0);
      audio.muted = false;
      audio.volume = 1;
      if (engine.ready) engine.setVolume(state.volume / 10);
      if (audio.paused || engine.blocked) {
        try {
          const pending = audio.play();
          if (pending) pending.catch(() => { engine.play(station.url); });
        } catch (e) {
          try { engine.play(station.url); } catch (e2) { /* ignore */ }
        }
      }
      paintStation();
      updateMediaSession();
      return;
    }
    paintStation();
    catchStation(station);
  } else {
    settleTune();
  }
  updateMediaSession();
}

function setCastVolume(unit) {
  if (!castUi.casting) return;
  const v = clamp(unit, 0, 1);
  if (castUi.native) {
    try { window.MyTunerNative?.castSetVolume?.(v); } catch (e) { /* ignore */ }
    return;
  }
  try {
    cast.framework.CastContext.getInstance().getCurrentSession()?.setVolume(v);
  } catch (e) { /* ignore */ }
}

function paintCast() {
  if (!btnCast) return;
  /* Su iOS il Web Sender Cast non esiste: il tasto resta utilizzabile per il messaggio */
  const ready = castUi.ready || isIOS;
  const active = castUi.casting || castUi.pending || castUi.arming || castUi.pickerOpen;
  btnCast.classList.toggle('is-ready', ready);
  btnCast.classList.toggle('is-lit', active);
  btnCast.classList.toggle('is-ios-cast', isIOS);
  btnCast.setAttribute('aria-pressed', String(active));
  if (lblCast) {
    lblCast.textContent = active ? 'CAST ON' : 'CAST';
    lblCast.classList.toggle('is-active', active);
  }
}

function initCast() {
  if (!window.cast?.framework || !window.chrome?.cast) return;
  try {
    const context = cast.framework.CastContext.getInstance();
    context.setOptions({
      receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
    });
    context.addEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, (event) => {
      const connected = event.castState === cast.framework.CastState.CONNECTED;
      const wasCasting = castUi.casting;
      castUi.casting = connected;
      if (connected) {
        castUi.pending = false;
        paintCast();
        muteTabletAudio(true);
        /* Auto-join / sessione già aperta: carica senza aspettare toggle */
        if (!castUi.loading) syncCastMedia(true);
      } else {
        castUi.pending = false;
        paintCast();
        if (wasCasting) resumeTabletAfterCast();
      }
    });
    castUi.ready = true;
    castUi.casting = context.getCurrentSession() != null;
    castUi.pending = false;
    paintCast();
  } catch (e) {
    castUi.ready = false;
    paintCast();
  }
}

async function syncNativeCastMedia(force = false) {
  if (!castUi.native || !castUi.casting || !state.power || state.stopped) return;
  const station = state.locked || nearest().station;
  if (!station) {
    flash('NO SIGNAL', true);
    return;
  }
  const contentUrl = castContentUrl(station.url);
  if (!force && castUi.contentUrl === contentUrl) {
    muteTabletAudio(true);
    setCastVolume(state.volume / 10);
    return;
  }
  if (castUi.loading && !force) return;
  const seq = ++castUi.loadSeq;
  castUi.loading = true;
  try {
    muteTabletAudio(true);
    await window.MyTunerNative.castLoadMedia({
      url: contentUrl,
      title: station.name || 'MyTuner',
      contentType: 'audio/mpeg',
      image: logoUrlForStation(station) || undefined
    });
    if (seq !== castUi.loadSeq) return;
    castUi.contentUrl = contentUrl;
    setCastVolume(state.volume / 10);
    flash(`CAST  ${station.name}`, true);
  } catch (e) {
    if (seq !== castUi.loadSeq) return;
    if (contentUrl !== streamAbsolute(station.url)) {
      try {
        const proxyUrl = streamAbsolute(station.url);
        await window.MyTunerNative.castLoadMedia({
          url: proxyUrl,
          title: station.name || 'MyTuner',
          contentType: 'audio/mpeg'
        });
        if (seq !== castUi.loadSeq) return;
        castUi.contentUrl = proxyUrl;
        muteTabletAudio(true);
        setCastVolume(state.volume / 10);
        flash(`CAST  ${station.name}`, true);
        return;
      } catch (e2) { /* fall through */ }
    }
    flash('CAST FAIL', true);
  } finally {
    if (seq === castUi.loadSeq) castUi.loading = false;
  }
}

async function syncCastMedia(force = false) {
  if (castUi.native) {
    await syncNativeCastMedia(force);
    return;
  }
  const session = window.cast?.framework?.CastContext?.getInstance()?.getCurrentSession?.();
  if (!session || !state.power || state.stopped) return;
  const station = state.locked || nearest().station;
  if (!station) {
    flash('NO SIGNAL', true);
    return;
  }
  const contentUrl = castContentUrl(station.url);
  if (!force && castUi.contentUrl === contentUrl && session.getMediaSession()) {
    muteTabletAudio(true);
    setCastVolume(state.volume / 10);
    return;
  }
  if (castUi.loading && !force) return;
  const seq = ++castUi.loadSeq;
  castUi.loading = true;
  try {
    const mediaInfo = new chrome.cast.media.MediaInfo(contentUrl, 'audio/mpeg');
    mediaInfo.streamType = chrome.cast.media.StreamType.LIVE;
    mediaInfo.metadata = new chrome.cast.media.MusicTrackMediaMetadata();
    mediaInfo.metadata.title = station.name;
    mediaInfo.metadata.artist = 'MyTuner';
    const request = new chrome.cast.media.LoadRequest(mediaInfo);
    /* Load subito sulla cassa; mute tablet non blocca */
    const loading = session.loadMedia(request);
    muteTabletAudio(true);
    await loading;
    if (seq !== castUi.loadSeq) return;
    castUi.contentUrl = contentUrl;
    setCastVolume(state.volume / 10);
    flash(`CAST  ${station.name}`, true);
  } catch (e) {
    if (seq !== castUi.loadSeq) return;
    /* Fallback: proxy Worker se l’URL diretto non va */
    if (contentUrl !== streamAbsolute(station.url)) {
      try {
        const proxyUrl = streamAbsolute(station.url);
        const mediaInfo = new chrome.cast.media.MediaInfo(proxyUrl, 'audio/mpeg');
        mediaInfo.streamType = chrome.cast.media.StreamType.LIVE;
        mediaInfo.metadata = new chrome.cast.media.MusicTrackMediaMetadata();
        mediaInfo.metadata.title = station.name;
        mediaInfo.metadata.artist = 'MyTuner';
        await session.loadMedia(new chrome.cast.media.LoadRequest(mediaInfo));
        if (seq !== castUi.loadSeq) return;
        castUi.contentUrl = proxyUrl;
        muteTabletAudio(true);
        setCastVolume(state.volume / 10);
        flash(`CAST  ${station.name}`, true);
        return;
      } catch (e2) { /* fall through */ }
    }
    flash('CAST FAIL', true);
  } finally {
    if (seq === castUi.loadSeq) castUi.loading = false;
  }
}

function showCastRemoteGate(on) {
  const gate = document.getElementById('castRemoteGate');
  if (!gate) return;
  gate.classList.toggle('is-hidden', !on);
  castUi.arming = Boolean(on) && !castUi.casting && !castUi.pending;
  paintCast();
  try { if (typeof publishRemoteState === 'function') publishRemoteState(); } catch (e) { /* ignore */ }
}

function isCastPickerOpen() {
  const panel = document.getElementById('monitorCast');
  return Boolean(panel && !panel.classList.contains('is-hidden'));
}

function paintCastFocus() {
  const list = document.getElementById('monitorCastList');
  if (!list) return;
  const buttons = [...list.querySelectorAll('.monitor-cast-item')];
  if (!buttons.length) return;
  castUi.focus = ((castUi.focus % buttons.length) + buttons.length) % buttons.length;
  buttons.forEach((btn, i) => {
    const on = i === castUi.focus;
    btn.classList.toggle('is-selected', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
    if (on) {
      try { btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* ignore */ }
    }
  });
}

function paintCastRoutes(routes) {
  castUi.routes = Array.isArray(routes) ? routes : [];
  const list = document.getElementById('monitorCastList');
  const empty = document.getElementById('monitorCastEmpty');
  if (!list) return;
  if (!castUi.routes.length) {
    list.innerHTML = '';
    empty?.classList.remove('is-hidden');
    if (empty) empty.textContent = 'Cerca dispositivi…';
    scheduleRemoteState();
    return;
  }
  empty?.classList.add('is-hidden');
  if (castUi.focus >= castUi.routes.length) castUi.focus = 0;
  list.innerHTML = castUi.routes.map((r, i) => {
    const name = String(r?.name || 'Cast').replace(/[<>&"]/g, '');
    const sub = r?.connecting ? 'Connessione…' : (r?.selected ? 'Selezionato' : (r?.description || 'Chromecast'));
    const subSafe = String(sub).replace(/[<>&"]/g, '');
    const sel = i === castUi.focus ? ' is-selected' : '';
    return `<button type="button" class="monitor-cast-item${sel}" data-cast-id="${String(r.id || '').replace(/"/g, '')}" role="option" aria-selected="${i === castUi.focus ? 'true' : 'false'}">
      <span class="monitor-cast-ico">${CAST_SPEAKER_SVG}</span>
      <span class="monitor-cast-meta">
        <span class="monitor-cast-name">${name}</span>
        <span class="monitor-cast-sub">${subSafe}</span>
      </span>
    </button>`;
  }).join('');
  paintCastFocus();
  scheduleRemoteState();
}

async function refreshCastRoutes() {
  if (!castUi.native) return;
  try {
    const res = await window.MyTunerNative.castListRoutes();
    paintCastRoutes(res?.routes || []);
  } catch (e) {
    paintCastRoutes([]);
  }
}

function openCastPicker(on) {
  const panel = document.getElementById('monitorCast');
  if (!panel) return;
  if (on) {
    try { openMonitorSettings(false); } catch (e) { /* ignore */ }
    showCastRemoteGate(false);
    panel.classList.remove('is-hidden');
    castUi.pickerOpen = true;
    castUi.arming = true;
    castUi.focus = 0;
    paintCast();
    paintCastRoutes(castUi.routes);
    window.MyTunerNative?.castStartScan?.().then((res) => {
      if (res?.routes) paintCastRoutes(res.routes);
      else refreshCastRoutes();
    }).catch(() => refreshCastRoutes());
  } else {
    panel.classList.add('is-hidden');
    castUi.pickerOpen = false;
    if (!castUi.pending && !castUi.casting) castUi.arming = false;
    try { window.MyTunerNative?.castStopScan?.(); } catch (e) { /* ignore */ }
    paintCast();
  }
  scheduleRemoteState();
}

function castPickerNav(dir) {
  if (!isCastPickerOpen()) return;
  const n = castUi.routes.length;
  if (n <= 0) return;
  const d = String(dir || '').toLowerCase();
  const step = (d === 'down' || d === 'right' || d === '1' || d === '+') ? 1 : -1;
  castUi.focus = (castUi.focus + step + n) % n;
  paintCastFocus();
  scheduleRemoteState();
}

async function castPickerEnter() {
  if (!isCastPickerOpen()) return;
  const route = castUi.routes[castUi.focus];
  if (!route?.id) {
    flash('NO DEVICE', true);
    return;
  }
  await castPickerSelectRoute(route);
}

async function castPickerSelectById(id) {
  const want = String(id || '');
  if (!want) {
    flash('NO DEVICE', true);
    return;
  }
  if (!isCastPickerOpen()) openCastPicker(true);
  const idx = castUi.routes.findIndex((r) => String(r?.id || '') === want);
  if (idx < 0) {
    flash('NO DEVICE', true);
    scheduleRemoteState();
    return;
  }
  castUi.focus = idx;
  paintCastFocus();
  await castPickerSelectRoute(castUi.routes[idx]);
}

async function castPickerSelectRoute(route) {
  if (!route?.id) {
    flash('NO DEVICE', true);
    return;
  }
  castUi.pending = true;
  castUi.arming = false;
  paintCast();
  scheduleRemoteState();
  flash(`CAST  ${route.name || ''}`, true);
  try {
    await window.MyTunerNative.castSelectRoute(route.id);
  } catch (e) {
    castUi.pending = false;
    paintCast();
    flash('CAST FAIL', true);
    scheduleRemoteState();
  }
}

function openCastFromRemote() {
  if (isIOS) {
    flash('CAST SOLO ANDROID', true);
    return;
  }
  /* APK nativo: lista custom nello schermo destro */
  if (castUi.native && castUi.ready) {
    toggleCast();
    return;
  }
  /* Web Chrome: requestSession() richiede gesto utente sul tablet */
  if (!castUi.ready) {
    flash('APRI IN CHROME', true);
    return;
  }
  if (castUi.casting || castUi.pending) {
    showCastRemoteGate(false);
    toggleCast();
    return;
  }
  if (!state.power || state.stopped) {
    flash('ACCENDI RADIO', true);
    return;
  }
  if (!state.locked && !nearest().station) {
    flash('NO SIGNAL', true);
    return;
  }
  showCastRemoteGate(true);
  flash('TOCCA CAST', true);
}

async function toggleNativeCast() {
  /* Secondo CAST: spegni se in cast, oppure chiudi lista */
  if (castUi.casting) {
    castUi.pending = false;
    castUi.arming = false;
    castUi.contentUrl = '';
    castUi.loadSeq += 1;
    castUi.loading = false;
    castUi.casting = false;
    openCastPicker(false);
    showCastRemoteGate(false);
    paintCast();
    /* Tablet SUBITO; endSession cassa in background (niente await) */
    resumeTabletAfterCast();
    flash('CAST OFF', true);
    scheduleRemoteState();
    try { window.MyTunerNative.castEndSession(); } catch (e) { /* ignore */ }
    return;
  }
  if (isCastPickerOpen()) {
    openCastPicker(false);
    castUi.pending = false;
    flash('CAST', true);
    return;
  }
  if (!state.power || state.stopped) {
    castUi.arming = false;
    showCastRemoteGate(false);
    paintCast();
    flash('ACCENDI RADIO', true);
    return;
  }
  if (!state.locked && !nearest().station) {
    castUi.arming = false;
    showCastRemoteGate(false);
    paintCast();
    flash('NO SIGNAL', true);
    return;
  }
  openCastPicker(true);
  flash('CAST', true);
}

async function toggleCast() {
  /* Google: Cast Web Sender non supportato su iOS (Safari né Chrome iOS) */
  if (isIOS) {
    flash('CAST SOLO ANDROID', true);
    showCastRemoteGate(false);
    return;
  }
  if (castUi.native && castUi.ready) {
    await toggleNativeCast();
    return;
  }
  if (!castUi.ready) {
    flash('APRI IN CHROME', true);
    showCastRemoteGate(false);
    return;
  }
  const context = cast.framework.CastContext.getInstance();
  if (castUi.casting || castUi.pending) {
    /* Secondo tocco / annulla: audio tablet subito, poi stacca cassa */
    castUi.pending = false;
    castUi.arming = false;
    castUi.contentUrl = '';
    castUi.loadSeq += 1;
    castUi.loading = false;
    const was = castUi.casting;
    castUi.casting = false;
    showCastRemoteGate(false);
    paintCast();
    if (was) resumeTabletAfterCast();
    else muteTabletAudio(false);
    flash('CAST OFF', true);
    try {
      context.getCurrentSession()?.getMediaSession()?.stop(null, () => {}, () => {});
    } catch (e) { /* ignore */ }
    try { context.endCurrentSession(true); } catch (e) { /* ignore */ }
    return;
  }
  if (!state.power || state.stopped) {
    castUi.arming = false;
    showCastRemoteGate(false);
    paintCast();
    flash('ACCENDI RADIO', true);
    return;
  }
  if (!state.locked && !nearest().station) {
    castUi.arming = false;
    showCastRemoteGate(false);
    paintCast();
    flash('NO SIGNAL', true);
    return;
  }
  /* Tasto già premuto durante la scelta casse */
  castUi.arming = false;
  castUi.pending = true;
  showCastRemoteGate(false);
  paintCast();
  try { if (typeof publishRemoteState === 'function') publishRemoteState(); } catch (e) { /* ignore */ }
  try {
    await context.requestSession();
    if (!context.getCurrentSession()) {
      castUi.pending = false;
      castUi.arming = false;
      paintCast();
      flash('NO DEVICE', true);
      return;
    }
    castUi.casting = true;
    castUi.pending = false;
    castUi.arming = false;
    paintCast();
    muteTabletAudio(true);
    /* Come prima: load esplicito dopo la sessione (affidabile + veloce) */
    await syncCastMedia(true);
  } catch (e) {
    castUi.pending = false;
    castUi.arming = false;
    castUi.casting = false;
    paintCast();
    flash('NO DEVICE', true);
  }
}

/* Telecomando: ogni scatto del rullo = stazione successiva (mai micro-step 0.1 che
   lo settle risucchia sulla stessa). Catena lunga per giri lenti. */
const REMOTE_TUNE_CHAIN_MS = 4500;
const REMOTE_TUNE_LATCH_MS = 220;

function remoteTuneStep(dir) {
  if (!state.power) setPower(true);
  if (state.stopped) toggleStop();
  const sign = dir < 0 ? -1 : 1;
  const now = performance.now();
  const chain = remoteTuneTarget
    && remoteTuneTarget.band === state.band
    && now - remoteTuneTarget.at < REMOTE_TUNE_CHAIN_MS;
  const locked = state.locked;
  const baseFreq = chain
    ? Number(remoteTuneTarget.station.freq)
    : Number(locked?.freq ?? currentFreq());
  const next = nextStationFromFreq(sign, baseFreq);
  if (!next) return;
  if (locked && stationKeyOf(next) === stationKeyOf(locked) && !chain) {
    /* Già agganciati: salta comunque alla successiva nel senso di marcia */
    const again = nextStationFromFreq(sign, Number(next.freq));
    if (!again || stationKeyOf(again) === stationKeyOf(next)) return;
    return remoteTuneStepApply(sign, again, now);
  }
  remoteTuneStepApply(sign, next, now);
}

function remoteTuneStepApply(sign, next, now) {
  cancelAfc();
  const left = state.locked || remoteTuneTarget?.station;
  if (left && stationKeyOf(left) !== stationKeyOf(next)) {
    remoteTuneLeave = {
      key: stationKeyOf(left),
      sign,
      origin: Number(left.freq),
      travel: 0
    };
  } else {
    remoteTuneLeave = null;
  }
  window.clearTimeout(dwellTimer);
  dwellTimer = 0;
  dwellTarget = null;
  remoteTuneTarget = { band: state.band, station: next, at: now || performance.now() };

  /* Frequenza progressiva sul dial (niente salto); all’arrivo catchStation */
  window.clearTimeout(remoteTuneSettleTimer);
  remoteTuneSettleTimer = 0;
  state.locked = null;
  paintStation();
  seekFreqTo(next.freq, { pace: 'remote' });
  /* Al termine dello scroll, sblocca leave e aggiorna catena */
  window.clearTimeout(remoteTuneSettleTimer);
  remoteTuneSettleTimer = window.setTimeout(() => {
    remoteTuneSettleTimer = 0;
    if (!remoteTuneTarget || stationKeyOf(remoteTuneTarget.station) !== stationKeyOf(next)) return;
    remoteTuneLeave = null;
    remoteTuneTarget.at = performance.now();
  }, 1700);
}

/*
  Rullo continuo del telecomando: ogni grado sposta la frequenza (come il dial a mano).
  Al rilascio: stazione dentro la finestra di ricezione → aggancio, altrimenti
  scorre fino alla prossima nel senso di marcia (senza fare il giro della banda).
*/
const REMOTE_DRAG_FM_PER_DEG = 0.02;
const REMOTE_DRAG_AM_PER_DEG = 1;
let remoteDragActive = false;
let remoteDragLastDir = 1;
let remoteDragSafetyTimer = 0;

function remoteTuneDrag(deg) {
  const d = Number(deg);
  if (!Number.isFinite(d) || !d) return;
  if (!state.power) setPower(true);
  if (state.stopped) toggleStop();
  if (!remoteDragActive) {
    remoteDragActive = true;
    cancelAfc();
    window.clearTimeout(remoteTuneSettleTimer);
    remoteTuneSettleTimer = 0;
    remoteTuneTarget = null;
    remoteTuneLeave = null;
  }
  remoteDragLastDir = d > 0 ? 1 : -1;
  const per = state.band === 'fm' ? REMOTE_DRAG_FM_PER_DEG : REMOTE_DRAG_AM_PER_DEG;
  setFreq(currentFreq() + d * per, { drag: true });
  /* Rilascio perso (rete): aggancia comunque */
  window.clearTimeout(remoteDragSafetyTimer);
  remoteDragSafetyTimer = window.setTimeout(() => remoteTuneRelease(remoteDragLastDir), 1200);
}

function remoteTuneRelease(dir) {
  window.clearTimeout(remoteDragSafetyTimer);
  remoteDragSafetyTimer = 0;
  if (!remoteDragActive) return;
  remoteDragActive = false;
  const sign = Number(dir) < 0 ? -1 : 1;
  const freq = currentFreq();
  const list = (stations[state.band] || []).slice().sort((a, b) => a.freq - b.freq);
  if (!list.length) {
    settleTune();
    return;
  }
  const near = stationAtFreq(freq);
  let target = near && Math.abs(near.freq - freq) <= bandSpec().win ? near : null;
  if (!target) {
    target = sign > 0
      ? list.find((s) => s.freq > freq)
      : list.slice().reverse().find((s) => s.freq < freq);
  }
  if (!target) target = near;
  if (!target) {
    settleTune();
    return;
  }
  remoteTuneTarget = { band: state.band, station: target, at: performance.now() };
  seekFreqTo(target.freq, { pace: 'remote' });
}

function settleTune() {
  if (!state.power || state.stopped) return;
  if (castUi.casting) {
    muteTabletAudio(true);
    const { station, dist } = nearest();
    const lock = station ? lockOf(dist) : 0;
    state.locked = station && lock > 0.48 && !remoteLeavingStation(station) ? station : state.locked;
    if (remoteLeavingStation(station)) state.locked = null;
    paintStation();
    syncCastMedia(false);
    persistFace();
    return;
  }
  const { station, dist } = nearestSticky();
  const lock = station ? lockOf(dist) : 0;
  /* Telecomando: mentre leave è attivo non risucchiare MAI sulla stazione lasciata */
  if (remoteLeavingStation(station)) {
    state.locked = null;
    paintStation();
    engine.pause();
    engine.setMix(0, 1);
    remoteLeaveClearedByDistance();
    persistFace();
    return;
  }
  /* TV: se c’è un canale nel dial, vai subito sulla sua frequenza e agganci l’HLS */
  if (isTvMode()) {
    if (station && lock > 0.12 && !remoteLeavingStation(station)) {
      snapToStation(station);
      return;
    }
    state.locked = null;
    engine.silence();
    paintStation();
    persistFace();
    return;
  }
  if (station && lock > 0.18 && !remoteLeavingStation(station)) {
    /* Vicino: snap sulla frequenza reale e musica senza riavvii inutili */
    if (lock > 0.38 || Math.abs(currentFreq() - station.freq) < (state.band === 'fm' ? 0.18 : 5)) {
      state.locked = station;
      if (state.band === 'fm') state.fm = station.freq;
      else state.am = station.freq;
      paintDial();
      paintStation();
      if (engine.currentUrl !== station.url) catchStation(station);
      else engine.setMix(1, 0);
      persistFace();
      return;
    }
    pullTo(station);
    return;
  }
  state.locked = null;
  paintStation();
  engine.pause();
  engine.setMix(0, 1);
  persistFace();
}

function pullTo(station) {
  if (!station || remoteLeavingStation(station)) return;
  const from = currentFreq();
  const to = station.freq;
  /* TV: nessun AFC animato — latch diretto */
  if (isTvMode()) {
    snapToStation(station);
    return;
  }
  const t0 = performance.now();
  const token = ++afcToken;
  seekToken += 1;
  seekActive = true;
  if (engine.currentUrl !== station.url) engine.play(station.url);
  engine.setMix(0.2, 0.8);
  /* AFC più snello: meno attesa prima del latch audio */
  const dur = clamp(Math.abs(to - from) / (state.band === 'fm' ? 9 : 320) * 1000, 90, 320);
  const step = (now) => {
    if (token !== afcToken) {
      seekActive = false;
      return;
    }
    const t = Math.min(1, (now - t0) / dur);
    const e = t * t * (3 - 2 * t);
    const freq = from + (to - from) * e;
    if (state.band === 'fm') state.fm = freq;
    else state.am = freq;
    paintDial();
    if (t < 1) {
      requestAnimationFrame(step);
      return;
    }
    seekActive = false;
    state.locked = station;
    if (state.band === 'fm') state.fm = station.freq;
    else state.am = station.freq;
    engine.setMix(1, 0);
    paintDial();
    paintStation();
    persistFace();
  };
  requestAnimationFrame(step);
}

function stepStation(dir) {
  const list = stations[state.band].slice().sort((a, b) => a.freq - b.freq);
  if (!list.length) return;
  const freq = currentFreq();
  const eps = state.band === 'fm' ? 0.08 : 3;
  let next = null;
  if (dir > 0) next = list.find((s) => s.freq > freq + eps) || list[0];
  else next = list.slice().reverse().find((s) => s.freq < freq - eps) || list[list.length - 1];
  cancelAfc();
  setFreq(next.freq, { jump: true });
}

function nextStationFromFreq(dir, freq) {
  const list = stations[state.band].slice().sort((a, b) => a.freq - b.freq);
  if (!list.length) return null;
  const eps = state.band === 'fm' ? 0.06 : 2.5;
  if (dir > 0) return list.find((s) => s.freq > freq + eps) || list[0];
  return list.slice().reverse().find((s) => s.freq < freq - eps) || list[list.length - 1];
}

/* Hold SEEK: la lancetta scorre e accelera; al rilascio si ferma sulla prossima stazione */
function startChannelFastSeek(dir) {
  if (!state.power) return;
  cancelAfc();
  const token = ++seekToken;
  const spec = bandSpec();
  chFastSeek.held = true;
  chFastSeek.active = true;
  chFastSeek.dir = dir < 0 ? -1 : 1;
  chFastSeek.speed = state.band === 'fm' ? 7 : 350;
  chFastSeek.lastT = performance.now();
  seekActive = true;
  state.locked = null;
  paintStereoPilot();
  paintViewAvail();
  paintModeTag();
  syncDialLamp();
  if (!isTvMode() && state.power && !state.stopped && !castUi.casting) {
    engine.setMix(0, 1);
  }

  const maxSpeed = state.band === 'fm' ? 48 : 2800;
  const accel = state.band === 'fm' ? 22 : 1100;

  const tick = (now) => {
    if (token !== seekToken || !chFastSeek.held) return;
    const dt = Math.min(0.05, Math.max(0, (now - chFastSeek.lastT) / 1000));
    chFastSeek.lastT = now;
    chFastSeek.speed = Math.min(maxSpeed, chFastSeek.speed + accel * dt);
    let freq = currentFreq() + chFastSeek.dir * chFastSeek.speed * dt;
    const span = spec.max - spec.min;
    if (freq > spec.max) freq = spec.min + ((freq - spec.max) % span);
    if (freq < spec.min) freq = spec.max - ((spec.min - freq) % span);
    if (state.band === 'fm') state.fm = freq;
    else state.am = freq;
    paintDial();
    if (panelZoomMode) showZoomHudFreq();
    if (!isTvMode() && engine.ready && state.power && !state.stopped && !castUi.casting) {
      engine.flutter(now);
    }
    chFastSeek.raf = requestAnimationFrame(tick);
  };
  chFastSeek.raf = requestAnimationFrame(tick);
}

function stopChannelFastSeek() {
  if (!chFastSeek.active && !chFastSeek.held) return;
  chFastSeek.held = false;
  if (chFastSeek.raf) {
    cancelAnimationFrame(chFastSeek.raf);
    chFastSeek.raf = 0;
  }
  const dir = chFastSeek.dir || 1;
  chFastSeek.active = false;
  const freq = currentFreq();
  const next = nextStationFromFreq(dir, freq);
  if (next) {
    setFreq(next.freq, { jump: true });
    return;
  }
  seekActive = false;
  settleTune();
}

function setBand(band) {
  if (state.band === band) return;
  state.band = band;
  cancelAfc();
  paintModes();
  paintDial._animateTune = true;
  paintDial();
  persistFace();
  if (!state.power || state.stopped) return;
  /* Dopo lo snap della linguetta, così l’animazione non viene tagliata */
  window.setTimeout(() => {
    if (state.band !== band || !state.power || state.stopped) return;
    if (state.auto) {
      const { station } = nearest();
      if (station) setFreq(station.freq, { jump: true });
      else settleTune();
      return;
    }
    settleTune();
  }, 360);
}

function playKeyClick() {
  try {
    engine.start();
    const ac = engine.ctx;
    if (!ac) return;
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    const t0 = ac.currentTime;
    const n = Math.max(1, Math.floor(ac.sampleRate * 0.028));
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.16));
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1850;
    filter.Q.value = 1.1;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.05, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.038);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    src.start(t0);
    src.stop(t0 + 0.04);
  } catch (e) { /* click non essenziale */ }
}

/* One-shot su destination (come playKeyClick): non tocca il grafo stream/analyser */
function playPowerOnHiss() {
  try {
    engine.start();
    const ac = engine.ctx;
    if (!ac) return;
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    const t0 = ac.currentTime;
    const dur = 0.48;
    const n = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const data = buf.getChannelData(0);
    let pink = 0;
    for (let i = 0; i < n; i += 1) {
      const t = i / n;
      const env = Math.sin(Math.PI * Math.min(1, t / 0.12)) * Math.exp(-t * 2.4);
      const white = Math.random() * 2 - 1;
      pink = pink * 0.92 + white * 0.08;
      let sample = pink * 0.72 + white * 0.28;
      if (Math.random() < 0.012) sample += (Math.random() * 2 - 1) * 1.4;
      data[i] = sample * env;
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 280;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400;
    bp.Q.value = 0.55;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.28, t0 + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(hp);
    hp.connect(bp);
    bp.connect(gain);
    gain.connect(ac.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  } catch (e) { /* fx non essenziale */ }
}

function playPowerOffPop() {
  try {
    engine.start();
    const ac = engine.ctx;
    if (!ac) return;
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    const t0 = ac.currentTime;
    const dur = 0.22;
    const n = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i += 1) {
      const t = i / n;
      const thump = Math.sin(2 * Math.PI * 55 * t) * Math.exp(-t * 28) * 0.7;
      const crack = (Math.random() * 2 - 1) * Math.exp(-t * 18) * (t < 0.08 ? 0.85 : 0.25);
      const spit = Math.random() < 0.04 ? (Math.random() * 2 - 1) * Math.exp(-t * 12) * 0.9 : 0;
      data[i] = thump + crack + spit;
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.32, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(lp);
    lp.connect(gain);
    gain.connect(ac.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  } catch (e) { /* fx non essenziale */ }
}

function playSwitchClick() {
  playKeyClick();
}

/* Bip soft in uscita (radio già spenta): one-shot su destination, non tocca il grafo stream */
function playExitBeep() {
  try {
    engine.start();
    const ac = engine.ctx;
    if (!ac) return;
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    const t0 = ac.currentTime;
    const tones = [
      { f: 880, at: 0, dur: 0.09 },
      { f: 660, at: 0.11, dur: 0.12 }
    ];
    for (const tone of tones) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = tone.f;
      const a = t0 + tone.at;
      gain.gain.setValueAtTime(0.0001, a);
      gain.gain.exponentialRampToValueAtTime(0.085, a + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, a + tone.dur);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(a);
      osc.stop(a + tone.dur + 0.02);
    }
  } catch (e) { /* bip non essenziale */ }
}

function showSpecFarewell() {
  const el = document.getElementById('specFarewell');
  if (!el) return;
  /* Mostra il pannello LED a destra anche se eri in TV */
  if (specPanel) specPanel.hidden = false;
  const videoPanel = document.getElementById('videoPanel');
  if (videoPanel) videoPanel.hidden = true;
  el.classList.remove('is-hidden');
  el.setAttribute('aria-hidden', 'false');
  /* Riavvia l’animazione lettere */
  el.querySelectorAll('.spec-farewell-ch').forEach((ch) => {
    ch.style.animation = 'none';
    void ch.offsetWidth;
    ch.style.animation = '';
  });
}

function hideSpecFarewell() {
  const el = document.getElementById('specFarewell');
  if (!el) return;
  el.classList.add('is-hidden');
  el.setAttribute('aria-hidden', 'true');
}

/* Long-press Power: saluto LED, poi chiude l’app. Se già spenta → bip, niente rumore cassa. */
function beginRemoteExit() {
  remoteExitGuardUntil = performance.now() + 4000;
  pendingDisplayWake = false;
  idleStandbyActive = false;
  idleStandbyWasPlaying = false;
  stopWakeNag();
  remoteLinked = true;
  const wasOn = Boolean(state.power);
  if (wasOn) {
    try { setPower(false); } catch (e) { /* ignore */ }
  } else {
    /* Già spenta: niente playPowerOffPop / hiss */
    try { engine.silence(); } catch (e) { /* ignore */ }
    try { engine.pause(); } catch (e) { /* ignore */ }
    playExitBeep();
  }
  showSpecFarewell();
  releaseScreenAwake();
  try { window.MyTunerNative?.keepAwake?.(false); } catch (e) { /* ignore */ }
  publishRemoteState();
  startRemoteGuard();
  window.setTimeout(() => {
    hideSpecFarewell();
    try { window.MyTunerNative?.exitApp?.(); } catch (e) { /* ignore */ }
  }, wasOn ? 900 : 1100);
}

let lastRatchetAt = 0;
function playRatchetClick() {
  try {
    const now = performance.now();
    if (now - lastRatchetAt < 16) return;
    lastRatchetAt = now;
    engine.start();
    const ac = engine.ctx;
    if (!ac) return;
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    const t0 = ac.currentTime;
    const n = Math.max(1, Math.floor(ac.sampleRate * 0.01));
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.2));
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2700 + Math.random() * 900;
    bp.Q.value = 3.2;
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.032, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.014);
    src.connect(bp);
    bp.connect(hp);
    hp.connect(gain);
    gain.connect(ac.destination);
    src.start(t0);
    src.stop(t0 + 0.016);
  } catch (e) { /* click non essenziale */ }
}

/* Brillamento ambient: un colpo solo, leggero (random + picchi di basso) */
let glassAmbientFlickTimer = 0;
let glassBassFlickCoolUntil = 0;
let glassBassEma = 0.18;
let glassFlickBusyUntil = 0;

/* Solo striscia scale FM/AM + neon — mai Casio / testa / meteo / spettro */
function dialFlickNodes() {
  return [
    document.getElementById('scaleFm'),
    document.getElementById('scaleAm'),
    document.getElementById('dialLamp')
  ].filter(Boolean);
}

function setDialFlickClass(cls, on) {
  for (const node of dialFlickNodes()) {
    node.classList.toggle(cls, on);
    if (!on) node.style.filter = '';
  }
}

/* Spegnimento immediato del filter (niente flash a metà keyframe) */
function killDialFlickNow(holdMs = 900) {
  window.clearTimeout(glassAmbientFlickTimer);
  glassAmbientFlickTimer = 0;
  glass?.classList.remove('flick', 'flick-soft');
  dialEl?.classList.remove('flick', 'flick-soft');
  for (const node of dialFlickNodes()) {
    node.classList.remove('flick', 'flick-soft');
    node.style.filter = 'none';
  }
  requestAnimationFrame(() => {
    for (const node of dialFlickNodes()) {
      if (node.style.filter === 'none') node.style.filter = '';
    }
  });
  glassFlickBusyUntil = performance.now() + holdMs;
}

function clearGlassFlickClasses() {
  glass?.classList.remove('flick', 'flick-soft');
  dialEl?.classList.remove('flick', 'flick-soft');
  if (dialEl) dialEl.style.filter = '';
  setDialFlickClass('flick', false);
  setDialFlickClass('flick-soft', false);
}

function stopGlassAmbientFlick() {
  window.clearTimeout(glassAmbientFlickTimer);
  glassAmbientFlickTimer = 0;
  glassBassFlickCoolUntil = 0;
  glassFlickBusyUntil = 0;
  clearGlassFlickClasses();
}

function canGlassAmbientFlick() {
  if (!state.power || isIOS) return false;
  if (document.hidden) return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return false;
  if (!dialFlickNodes().length) return false;
  if (panelZoomBusy) return false;
  if (dialFlickNodes().some((n) => n.classList.contains('flick') || n.classList.contains('flick-soft'))) {
    return false;
  }
  if (performance.now() < glassFlickBusyUntil) return false;
  return true;
}

function armGlassFlickCleanup() {
  for (const node of dialFlickNodes()) {
    if (node._flickCleanupBound) continue;
    node._flickCleanupBound = true;
    node.addEventListener('animationend', (ev) => {
      const name = String(ev.animationName || '');
      if (!name.startsWith('flicker')) return;
      node.classList.remove('flick', 'flick-soft');
    });
  }
}

function triggerGlassAmbientFlick() {
  if (!canGlassAmbientFlick()) return false;
  armGlassFlickCleanup();
  const nodes = dialFlickNodes();
  for (const node of nodes) {
    node.classList.remove('flick-soft');
    void node.offsetWidth;
    node.classList.add('flick-soft');
  }
  glassFlickBusyUntil = performance.now() + 520;
  return true;
}

function scheduleGlassAmbientFlick(afterMs) {
  window.clearTimeout(glassAmbientFlickTimer);
  if (!state.power || isIOS) {
    glassAmbientFlickTimer = 0;
    return;
  }
  /* Random più frequente; il grosso resta sui picchi audio */
  const wait = afterMs != null
    ? afterMs
    : (18000 + Math.random() * 28000); /* ~18–46 s */
  glassAmbientFlickTimer = window.setTimeout(() => {
    glassAmbientFlickTimer = 0;
    if (!state.power) return;
    if (Math.random() < 0.45) triggerGlassAmbientFlick();
    scheduleGlassAmbientFlick();
  }, wait);
}

/* Consumo energia: colpo luce su audio più forte (spettro già calcolato) */
function maybeBassGlassFlick(now, frameMax) {
  if (!state.power || state.stopped || isIOS) return;
  if (castUi.casting) return;
  if (now < glassBassFlickCoolUntil) return;
  const bass = (rawLevels[0] + rawLevels[1] + rawLevels[2]) / 3;
  const loud = Math.max(frameMax, bass);
  glassBassEma += (loud - glassBassEma) * 0.035;
  const punch = loud - glassBassEma;
  if (loud < 0.52 || punch < 0.14) return;
  if (Math.random() > 0.22) {
    glassBassFlickCoolUntil = now + 400;
    return;
  }
  if (!triggerGlassAmbientFlick()) return;
  glassBassFlickCoolUntil = now + 7000 + Math.random() * 9000; /* 7–16 s */
}

function setPower(on, opts = {}) {
  const fromAlarm = Boolean(opts.fromAlarm);
  const quiet = Boolean(opts.quiet);
  state.power = on;
  state.stopped = Boolean(on && quiet);
  radio.classList.toggle('is-on', on);
  radio.classList.toggle('is-stereo', Boolean(state.stereo));
  radio.classList.toggle('is-stopped', state.stopped);
  btnPower.setAttribute('aria-pressed', String(on));
  syncDialLamp();
  cancelAfc();
  if (!on) {
    /* Spegnimento esplicito: esci da idle-standby, poi timer “radio spenta” */
    idleStandbyActive = false;
    idleStandbyWasPlaying = false;
    idleStandbyVideoHandoff = false;
    stopIdleStandbyAudioKeepAlive();
    radio?.classList.remove('is-idle-standby');
    if (!quiet) playPowerOffPop();
    try { openMonitorSettings(false); } catch (e) { /* ignore */ }
    try { openCastPicker(false); } catch (e) { /* ignore */ }
    dismissAlarm();
    stopGlassAmbientFlick();
    stopWxFlair();
    stopAlbumArtFlip();
    stopNameSweep();
    clearGlassFlickClasses();
    state.locked = null;
    clearIosBackgroundAudio();
    engine.silence();
    engine.pause();
    stopStationVideo();
    if (castUi.casting) {
      try { cast.framework.CastContext.getInstance().endCurrentSession(true); } catch (e) { /* ignore */ }
    }
    releaseScreenAwake();
    clearIdlePowerTimers();
    clearIdleDimUi();
    paintDial();
    paintTransport();
    updateMediaSession();
    persistFace();
    bumpIdleActivity();
    scheduleRemoteState();
    return;
  }
  idleStandbyActive = false;
  idleStandbyWasPlaying = false;
  stopIdleStandbyAudioKeepAlive();
  radio?.classList.remove('is-idle-standby');
  if (!fromAlarm) dismissAlarm();
  askRemoteNotifyPermission();
  stopRemoteGuard();
  syncNativeKeepAwake();
  engine.start();
  armMediaPlaybackSession();
  if (engine.ctx?.state === 'suspended') engine.ctx.resume().catch(() => {});
  engine.setVolume(state.volume / 10);
  engine.setTone(state.bass, state.treble);
  if (!quiet) playPowerOnHiss();
  if (!quiet && !isIOS && dialFlickNodes().length) {
    armGlassFlickCleanup();
    clearGlassFlickClasses();
    for (const node of dialFlickNodes()) {
      void node.offsetWidth;
      node.classList.add('flick');
    }
    scheduleGlassAmbientFlick(6000 + Math.random() * 10000);
    scheduleWxFlair(4000 + Math.random() * 7000);
    scheduleAlbumArtFlip(6000 + Math.random() * 10000);
  }
  if (!quiet) scheduleNameSweep(3500 + Math.random() * 5500);
  paintDial();
  paintTransport();
  if (quiet) {
    state.locked = null;
    clearIosBackgroundAudio();
    engine.silence();
    engine.pause();
    updateMediaSession();
    persistFace();
    if (remoteLinked) syncRemoteWakeLock();
    return;
  }
  settleTune();
  persistFace();
  /* Telecomando collegato + radio accesa → tieni schermo; idle dim/standby a parte */
  if (remoteLinked) syncRemoteWakeLock();
  bumpIdleActivity();
}

let tvZoomDock = null;
let tvZoomDockTimer = 0;
let zoomVolHoldTimer = 0;
let zoomVolHoldDir = 0;
let zoomHud = null;
let zoomHudTimer = 0;

function paintZoomDockPause() {
  const btn = tvZoomDock?.querySelector('[data-act="pause"]');
  if (!btn) return;
  const held = Boolean(state.power && state.stopped);
  btn.classList.toggle('is-held', held);
  btn.setAttribute('aria-pressed', String(held));
  btn.setAttribute('aria-label', held ? 'Riprendi' : 'Pausa');
}

function paintTransport() {
  const stopped = state.power && state.stopped;
  btnStop?.setAttribute('aria-label', stopped ? 'Riprendi' : 'Pausa');
  btnStop?.setAttribute('aria-pressed', String(Boolean(state.stopped)));
  paintZoomDockPause();
}

function toggleStop() {
  dismissAlarm();
  if (!state.power) return;
  state.stopped = !state.stopped;
  radio.classList.toggle('is-stopped', state.stopped);
  paintTransport();
  cancelAfc();
  if (state.stopped) {
    state.locked = null;
    resetSpecPauseWord();
    pauseWordActive = true;
    clearIosBackgroundAudio();
    engine.silence();
    engine.pause();
    if (castUi.casting) {
      try {
        const media = cast.framework.CastContext.getInstance().getCurrentSession()?.getMediaSession();
        media?.stop();
      } catch (e) { /* ignore */ }
    }
    paintStation();
    updateMediaSession();
    return;
  }
  resetSpecPauseWord();
  armMediaPlaybackSession();
  if (castUi.casting) syncCastMedia(true);
  else settleTune();
  updateMediaSession();
}

function savePreset() {
  const found = state.locked || (nearest().station && lockOf(nearest().dist) > 0.5 ? nearest().station : null);
  if (!found) {
    flash('NO SIGNAL', true);
    return;
  }
  const list = presets[state.band];
  if (!list.some((item) => item.url === found.url)) {
    if (list.length >= 8) list.shift();
    list.push({ name: found.name, url: found.url, freq: found.freq });
  }
  try { localStorage.setItem('radio-presets-v1', JSON.stringify(presets)); } catch (e) { /* memoria non disponibile */ }
  const index = list.findIndex((item) => item.url === found.url);
  flash(`P${index + 1}  ${found.name}`, true);
}

function cyclePreset() {
  const list = presets[state.band];
  if (!list.length) {
    flash('EMPTY', true);
    return;
  }
  presetIndex[state.band] = (presetIndex[state.band] + 1) % list.length;
  const item = list[presetIndex[state.band]];
  cancelAfc();
  if (state.band === 'fm') state.fm = clamp(item.freq, FM.min, FM.max);
  else state.am = clamp(item.freq, AM.min, AM.max);
  state.locked = item;
  paintDial();
  if (state.power && !state.stopped) catchStation(item);
  flash(`P${presetIndex[state.band] + 1}  ${item.name}`, true);
  persistFace();
}

function pointerAngle(event, el) {
  const rect = el.getBoundingClientRect();
  return Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2));
}

function bindKnob(el, onDelta, onEnd) {
  let last = null;
  let moved = false;
  let active = false;
  let ratchet = 0;
  let pid = null;
  const STEP = 0.105;

  const detachWin = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
  };

  const onMove = (event) => {
    if (!active || last == null) return;
    if (pid != null && event.pointerId !== pid) return;
    event.preventDefault();
    const angle = pointerAngle(event, el);
    let delta = angle - last;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    last = angle;
    if (Math.abs(delta) < 0.0008) return;
    moved = true;
    ratchet += Math.abs(delta);
    while (ratchet >= STEP) {
      ratchet -= STEP;
      playRatchetClick();
    }
    onDelta(delta);
  };

  const onUp = (event) => {
    if (!active) return;
    if (pid != null && event.pointerId != null && event.pointerId !== pid) return;
    active = false;
    last = null;
    ratchet = 0;
    el.classList.remove('is-grab');
    detachWin();
    if (pid != null) {
      try { el.releasePointerCapture(pid); } catch (e) { /* ignore */ }
    }
    pid = null;
    if (onEnd) onEnd(moved);
  };

  const onDown = (event) => {
    event.preventDefault();
    cancelAfc();
    active = true;
    moved = false;
    ratchet = 0;
    pid = event.pointerId;
    last = pointerAngle(event, el);
    el.classList.add('is-grab');
    try { el.setPointerCapture(event.pointerId); } catch (e) { /* iOS a volte rifiuta */ }
    /* move su window: su iOS al primo tocco la capture spesso fallisce */
    detachWin();
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp, { passive: false });
    window.addEventListener('pointercancel', onUp, { passive: false });
    engine.start();
  };

  el.addEventListener('pointerdown', onDown);
}

function tuneFromX(el, clientX) {
  const rect = el.getBoundingClientRect();
  const span = bandSpec();
  const p = clamp((clientX - rect.left) / rect.width, 0, 1);
  setFreq(span.min + p * (span.max - span.min), { drag: true });
}

function bindScale(el) {
  const band = el.dataset.band;
  let dragging = false;
  let lastX = 0;
  el.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    if (state.band !== band) setBand(band);
    cancelAfc();
    dragging = true;
    lastX = event.clientX;
    try { el.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ }
    engine.start();
    if (!state.auto) tuneFromX(el, event.clientX);
  });
  el.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    event.preventDefault();
    if (state.auto) {
      const dx = event.clientX - lastX;
      if (Math.abs(dx) > 26) {
        stepStation(dx > 0 ? 1 : -1);
        lastX = event.clientX;
      }
      return;
    }
    tuneFromX(el, event.clientX);
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    if (!state.auto) settleTune();
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

function drawScale(svg, { min, max, step, labels, unit, align = 'bottom' }) {
  const ns = 'http://www.w3.org/2000/svg';
  const width = 1000;
  const height = 100;
  /* Scala spostata a sinistra (verso FM/AM); a destra più aria per MHz/kHz. */
  const baseY = align === 'top' ? 28 : 90;
  const labelY = align === 'top' ? 14 : 72;
  const padL = 14;
  const padR = 88; /* ultima cifra più a sinistra → unità staccata */
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  /* Proporzioni fisse: l’altezza CSS della scala segue il viewBox (niente stiramento) */
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.dataset.align = align;
  svg.replaceChildren();
  const xOf = (freq) => padL + ((freq - min) / (max - min)) * (width - padL - padR);

  const baseline = document.createElementNS(ns, 'line');
  baseline.setAttribute('class', 'scale-base');
  baseline.setAttribute('x1', String(padL));
  baseline.setAttribute('x2', String(width - padR + 12));
  baseline.setAttribute('y1', String(baseY));
  baseline.setAttribute('y2', String(baseY));
  baseline.setAttribute('stroke-width', '1');
  svg.appendChild(baseline);

  for (let freq = min; freq <= max + 1e-6; freq += step) {
    const rounded = Math.round(freq * 10) / 10;
    const major = labels.some((label) => Math.abs(label - rounded) < step * 0.45);
    const x = xOf(rounded);
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('class', major ? 'scale-tick major' : 'scale-tick');
    line.setAttribute('x1', x);
    line.setAttribute('x2', x);
    line.setAttribute('y1', String(major ? baseY - 12 : baseY - 6));
    line.setAttribute('y2', String(baseY));
    line.setAttribute('stroke-width', major ? '1.2' : '0.7');
    line.setAttribute('opacity', major ? '0.85' : '0.35');
    svg.appendChild(line);
    if (!major) continue;
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('class', 'scale-label');
    text.setAttribute('x', x);
    text.setAttribute('y', String(labelY));
    const atStart = Math.abs(rounded - min) < step * 0.45;
    text.setAttribute('text-anchor', atStart ? 'start' : 'middle');
    text.setAttribute('font-family', 'Share Tech Mono, monospace');
    text.setAttribute('font-weight', '500');
    /* User unit (viewBox): su iPhone un filo più grandi */
    text.setAttribute('font-size', isIOS ? '33' : '28');
    text.textContent = String(Math.round(rounded));
    svg.appendChild(text);
  }
  if (unit) {
    const end = document.createElementNS(ns, 'text');
    end.setAttribute('class', 'scale-unit');
    /* Ben a destra, staccata dal numero finale */
    end.setAttribute('x', String(width - 2));
    end.setAttribute('y', String(labelY));
    end.setAttribute('text-anchor', 'end');
    end.setAttribute('font-family', 'Share Tech Mono, monospace');
    end.setAttribute('font-weight', '500');
    end.setAttribute('font-size', isIOS ? '25' : '21');
    end.textContent = unit;
    svg.appendChild(end);
  }
}

function buildSpectrum() {
  SPEC.forEach((band, index) => {
    const bar = document.createElement('div');
    bar.className = 'bar';
    const fill = document.createElement('i');
    fill.className = 'fill';
    const cap = document.createElement('i');
    cap.className = 'cap';
    bar.append(fill, cap);
    barsHost.append(bar);
    fills.push(fill);
    caps.push(cap);
    if (!band.label) return;
    const label = document.createElement('span');
    label.textContent = band.label;
    label.style.left = `${((index + 0.5) / SPEC.length) * 100}%`;
    specLabels.append(label);
  });
}

function bandEnergy(bins, hz, sampleRate) {
  const nyquist = sampleRate / 2;
  const half = Math.max(hz * 0.28, 40);
  const i0 = clamp(Math.floor(((hz - half) / nyquist) * bins.length), 0, bins.length - 1);
  const i1 = clamp(Math.ceil(((hz + half) / nyquist) * bins.length), i0, bins.length - 1);
  let sum = 0;
  let peak = 0;
  for (let i = i0; i <= i1; i += 1) {
    const v = bins[i];
    sum += v;
    if (v > peak) peak = v;
  }
  const avg = sum / ((i1 - i0 + 1) * 255);
  const pk = peak / 255;
  return avg * 0.55 + pk * 0.45;
}

const rawLevels = new Float32Array(SPEC.length);
const sNeedle = document.getElementById('sNeedle');
let sMeterSmooth = 0;

const clockHoursEl = document.getElementById('clockHours');
const clockMinsEl = document.getElementById('clockMins');
const coronaHoursEl = document.getElementById('coronaHours');
const coronaMinsEl = document.getElementById('coronaMins');
const coronaSecsEl = document.getElementById('coronaSecs');
const coronaDateEl = document.getElementById('coronaClockDate');
const coronaCrownEl = document.getElementById('coronaCrown');
const digitalHoursEl = document.getElementById('digitalHours');
const digitalMinsEl = document.getElementById('digitalMins');
const digitalSecsEl = document.getElementById('digitalSecs');
const digitalTempEl = document.getElementById('digitalTemp');
const radioClockSlot = document.getElementById('radioClockSlot');
let clockTimer = 0;
let coronaRaf = 0;
let coronaSegs = [];

const CLOCK_THEME_KEY = 'mytuner-clock-theme-v1';
const CLOCK_TINT_KEY = 'mytuner-clock-tint-v1';
const CLOCK_THEMES = [
  { id: 'casio', name: 'Casio LCD', preview: 'casio' },
  { id: 'digital', name: 'Digital clock', preview: 'digital' },
  { id: 'corona', name: 'Corona spettro', preview: 'corona' }
];
const CLOCK_TINTS = [
  { id: 'cyan', name: 'CIANO' },
  { id: 'white', name: 'BIANCO' },
  { id: 'red', name: 'ROSSO' }
];
let clockThemeId = 'casio';
let clockThemeFocus = 0;
let clockTintId = 'cyan';

const IT_DAYS = ['DOMENICA', 'LUNEDÌ', 'MARTEDÌ', 'MERCOLEDÌ', 'GIOVEDÌ', 'VENERDÌ', 'SABATO'];
const IT_DAYS_SHORT = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
const IT_MONTHS = ['GENNAIO', 'FEBBRAIO', 'MARZO', 'APRILE', 'MAGGIO', 'GIUGNO', 'LUGLIO', 'AGOSTO', 'SETTEMBRE', 'OTTOBRE', 'NOVEMBRE', 'DICEMBRE'];

function pad2(n) {
  return n < 10 ? `0${n}` : String(n);
}

function formatDigitalClockDate(now = new Date()) {
  const dow = IT_DAYS_SHORT[now.getDay()] || '——';
  return `${dow} ${pad2(now.getDate())}`;
}

/* Allinea al fantasma Casio "-88": spazio al posto del meno se positiva */
function formatDigitalTemp(t) {
  if (!(typeof t === 'number' && Number.isFinite(t))) return ' --';
  const n = Math.round(t);
  const abs = Math.min(99, Math.abs(n));
  const digits = abs < 10 ? ` ${abs}` : String(abs);
  return `${n < 0 ? '-' : ' '}${digits}`;
}

function readClockThemeId() {
  try {
    const id = String(localStorage.getItem(CLOCK_THEME_KEY) || 'casio');
    return CLOCK_THEMES.some((t) => t.id === id) ? id : 'casio';
  } catch (e) {
    return 'casio';
  }
}

function persistClockThemeId() {
  try {
    localStorage.setItem(CLOCK_THEME_KEY, clockThemeId);
  } catch (e) { /* ignore */ }
}

function readClockTintId() {
  try {
    const id = String(localStorage.getItem(CLOCK_TINT_KEY) || 'cyan');
    return CLOCK_TINTS.some((t) => t.id === id) ? id : 'cyan';
  } catch (e) {
    return 'cyan';
  }
}

function persistClockTintId() {
  try {
    localStorage.setItem(CLOCK_TINT_KEY, clockTintId);
  } catch (e) { /* ignore */ }
}

function applyClockTint() {
  const tint = CLOCK_TINTS.find((t) => t.id === clockTintId) || CLOCK_TINTS[0];
  clockTintId = tint.id;
  if (radioClockSlot) radioClockSlot.dataset.clockTint = clockTintId;
}

function cycleClockTint() {
  const i = CLOCK_TINTS.findIndex((t) => t.id === clockTintId);
  const next = CLOCK_TINTS[(i + 1 + CLOCK_TINTS.length) % CLOCK_TINTS.length] || CLOCK_TINTS[0];
  clockTintId = next.id;
  persistClockTintId();
  applyClockTint();
  flash(next.name, true);
  scheduleRemoteState();
}

function ensureCoronaCrown() {
  if (!coronaCrownEl) return;
  if (coronaSegs.length && coronaCrownEl.querySelector('path.seg')) return;
  coronaCrownEl.innerHTML = '';
  coronaSegs = [];
  const n = 36;
  const ns = 'http://www.w3.org/2000/svg';
  const cx = 100;
  const cy = 58;
  const r0 = 46;
  const r1 = 54;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < n; i += 1) {
    /* Mezza corona superiore: π → 0 */
    const t0 = i / n;
    const t1 = (i + 0.72) / n;
    const a0 = Math.PI - t0 * Math.PI;
    const a1 = Math.PI - t1 * Math.PI;
    const x0o = cx + Math.cos(a0) * r1;
    const y0o = cy - Math.sin(a0) * r1;
    const x1o = cx + Math.cos(a1) * r1;
    const y1o = cy - Math.sin(a1) * r1;
    const x1i = cx + Math.cos(a1) * r0;
    const y1i = cy - Math.sin(a1) * r0;
    const x0i = cx + Math.cos(a0) * r0;
    const y0i = cy - Math.sin(a0) * r0;
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('class', 'seg');
    path.setAttribute(
      'd',
      `M${x0o.toFixed(2)} ${y0o.toFixed(2)} L${x1o.toFixed(2)} ${y1o.toFixed(2)} L${x1i.toFixed(2)} ${y1i.toFixed(2)} L${x0i.toFixed(2)} ${y0i.toFixed(2)} Z`
    );
    frag.appendChild(path);
  }
  coronaCrownEl.appendChild(frag);
  coronaSegs = [...coronaCrownEl.querySelectorAll('.seg')];
}

function paintCoronaCrown(now) {
  if (!coronaSegs.length) ensureCoronaCrown();
  if (!coronaSegs.length) return;
  const n = coronaSegs.length;
  const powered = Boolean(state?.power);
  const sec = now.getSeconds() + now.getMilliseconds() / 1000;
  const head = (sec / 60) * n;
  const trail = Math.max(6, Math.round(n * 0.38));
  for (let i = 0; i < n; i += 1) {
    const d = (head - i + n) % n;
    const bright = d < trail ? 1 - d / trail : 0;
    const el = coronaSegs[i];
    const lit = powered && bright > 0.05;
    el.classList.toggle('is-lit', lit);
    el.style.fill = lit
      ? `rgba(255, ${Math.round(110 + 50 * bright)}, ${Math.round(20 + 20 * bright)}, ${0.35 + bright * 0.65})`
      : 'rgba(70,70,70,0.55)';
    el.style.filter = lit ? `drop-shadow(0 0 ${2 + bright * 3}px rgba(255,140,40,${0.35 + bright * 0.55}))` : 'none';
  }
}

function tickRadioClock() {
  const now = new Date();
  if (clockHoursEl && clockMinsEl) {
    clockHoursEl.textContent = pad2(now.getHours());
    clockMinsEl.textContent = pad2(now.getMinutes());
  }
  if (coronaHoursEl) coronaHoursEl.textContent = pad2(now.getHours());
  if (coronaMinsEl) coronaMinsEl.textContent = pad2(now.getMinutes());
  if (coronaSecsEl) coronaSecsEl.textContent = pad2(now.getSeconds());
  if (coronaDateEl) {
    coronaDateEl.textContent = `${IT_DAYS[now.getDay()]}, ${now.getDate()} ${IT_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  }
  if (digitalHoursEl && digitalMinsEl) {
    digitalHoursEl.textContent = pad2(now.getHours());
    digitalMinsEl.textContent = pad2(now.getMinutes());
  }
  if (digitalSecsEl) digitalSecsEl.textContent = pad2(now.getSeconds());
  syncDigitalClockDate(now);
  if (digitalTempEl) {
    const t = Number.isFinite(localeWxTempC) ? localeWxTempC : window.__mytunerWxTempC;
    digitalTempEl.textContent = formatDigitalTemp(t);
  }
  if (clockThemeId === 'corona') paintCoronaCrown(now);
}

function stopCoronaAnim() {
  if (coronaRaf) {
    cancelAnimationFrame(coronaRaf);
    coronaRaf = 0;
  }
}

function startCoronaAnim() {
  stopCoronaAnim();
  if (clockThemeId !== 'corona') return;
  const loop = () => {
    paintCoronaCrown(new Date());
    coronaRaf = requestAnimationFrame(loop);
  };
  coronaRaf = requestAnimationFrame(loop);
}

function applyClockTheme() {
  const theme = CLOCK_THEMES.find((t) => t.id === clockThemeId) || CLOCK_THEMES[0];
  clockThemeId = theme.id;
  if (radioClockSlot) radioClockSlot.dataset.clock = clockThemeId;
  document.querySelectorAll('.radio-clock-slot .clock-skin').forEach((el) => {
    const on = el.dataset.clock === clockThemeId;
    el.classList.toggle('is-active', on);
    if (on) el.removeAttribute('hidden');
    else el.setAttribute('hidden', '');
  });
  if (clockThemeId === 'corona') {
    ensureCoronaCrown();
    startCoronaAnim();
  } else {
    stopCoronaAnim();
  }
  tickRadioClock();
}

function paintClockThemeList() {
  const list = document.getElementById('clockThemeList');
  if (!list) return;
  list.innerHTML = '';
  CLOCK_THEMES.forEach((theme, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'clock-theme-item';
    btn.dataset.id = theme.id;
    btn.setAttribute('role', 'option');
    if (theme.id === clockThemeId) {
      btn.classList.add('is-active');
      clockThemeFocus = idx;
    }
    const prev = document.createElement('span');
    prev.className = `clock-theme-preview is-${theme.preview}`;
    prev.setAttribute('aria-hidden', 'true');
    if (theme.preview === 'casio') {
      prev.innerHTML = '<span class="pv-lcd">12:45</span>';
    } else if (theme.preview === 'digital') {
      prev.innerHTML = '<span class="pv-digital"><b>10:09</b><i>FM</i></span>';
    } else {
      prev.innerHTML = '<span class="pv-corona-half"><i class="pv-arc"></i><b>15:42</b></span>';
    }
    const name = document.createElement('span');
    name.className = 'clock-theme-name';
    name.textContent = theme.name;
    btn.append(prev, name);
    list.append(btn);
  });
  paintClockThemeFocus();
}

function paintClockThemeFocus() {
  const items = [...document.querySelectorAll('#clockThemeList .clock-theme-item')];
  items.forEach((el, i) => {
    el.classList.toggle('is-focus', i === clockThemeFocus);
    el.setAttribute('aria-selected', String(i === clockThemeFocus));
  });
  items[clockThemeFocus]?.scrollIntoView?.({ block: 'nearest' });
}

function selectClockTheme(id) {
  const next = CLOCK_THEMES.some((t) => t.id === id) ? id : 'casio';
  clockThemeId = next;
  persistClockThemeId();
  applyClockTheme();
  paintClockThemeList();
  flash(CLOCK_THEMES.find((t) => t.id === next)?.name || 'CLOCK', true);
  scheduleRemoteState();
}

function openClockPane(on, opts = {}) {
  const pane = document.getElementById('monitorClockPane');
  if (!pane) return;
  if (on) {
    paintClockThemeList();
    showSettingsPage('clock', { dir: opts.dir || 'forward', instant: opts.instant });
  } else {
    showSettingsPage('home', { dir: opts.dir || 'back', instant: opts.instant });
  }
  scheduleRemoteState();
}

function isClockPaneOpen() {
  return isMonitorSettingsOpen() && settingsPage === 'clock';
}

function tickCasioClock() {
  tickRadioClock();
}

function initCasioClock() {
  try {
    clockThemeId = readClockThemeId();
    clockTintId = readClockTintId();
    ensureCoronaCrown();
    applyClockTheme();
    applyClockTint();
    window.clearInterval(clockTimer);
    clockTimer = window.setInterval(() => {
      try { tickRadioClock(); } catch (e) { /* ignore */ }
    }, 1000);
    if (radioClockSlot && !radioClockSlot.dataset.tintBound) {
      radioClockSlot.dataset.tintBound = '1';
      radioClockSlot.setAttribute('role', 'button');
      radioClockSlot.setAttribute('tabindex', '0');
      radioClockSlot.setAttribute('aria-label', 'Cambia colore orologio');
      radioClockSlot.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        try { cycleClockTint(); } catch (e) { /* ignore */ }
      });
      radioClockSlot.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        try { cycleClockTint(); } catch (e) { /* ignore */ }
      });
    }
  } catch (e) {
    console.warn('initCasioClock', e);
  }
}

function buildSMeterScale() {
  const ticks = document.querySelector('.smeter-ticks');
  if (!ticks) return;
  const ns = 'http://www.w3.org/2000/svg';
  const cx = 100;
  const cy = 108;
  const r0 = 78;
  /* 0 → S1 … ~0.60 → S9 … 1 → +60dB — più tacche = più definizione */
  const marks = [
    { t: 0.00, label: '1', major: true },
    { t: 0.06, label: '', major: false },
    { t: 0.12, label: '', major: false },
    { t: 0.17, label: '', major: false },
    { t: 0.22, label: '3', major: true },
    { t: 0.27, label: '', major: false },
    { t: 0.32, label: '', major: false },
    { t: 0.36, label: '', major: false },
    { t: 0.40, label: '5', major: true },
    { t: 0.44, label: '', major: false },
    { t: 0.48, label: '', major: false },
    { t: 0.52, label: '7', major: true },
    { t: 0.56, label: '', major: false },
    { t: 0.60, label: '9', major: true },
    { t: 0.66, label: '', major: false },
    { t: 0.72, label: '+20dB', major: true, db: true },
    { t: 0.79, label: '', major: false },
    { t: 0.86, label: '+40dB', major: true, db: true, red: true },
    { t: 0.93, label: '', major: false },
    { t: 1.00, label: '+60dB', major: true, db: true }
  ];
  for (const mark of marks) {
    const ang = (-48 + mark.t * 96) * (Math.PI / 180);
    const len = mark.major ? (mark.db ? 11 : 12) : 7;
    const x1 = cx + Math.sin(ang) * (r0 - len);
    const y1 = cy - Math.cos(ang) * (r0 - len);
    const x2 = cx + Math.sin(ang) * r0;
    const y2 = cy - Math.cos(ang) * r0;
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('class', mark.major ? 'smeter-tick' : 'smeter-tick is-minor');
    line.setAttribute('x1', x1.toFixed(2));
    line.setAttribute('y1', y1.toFixed(2));
    line.setAttribute('x2', x2.toFixed(2));
    line.setAttribute('y2', y2.toFixed(2));
    ticks.appendChild(line);
    if (!mark.label) continue;
    const tx = cx + Math.sin(ang) * (r0 - (mark.db ? 21 : 24));
    const ty = cy - Math.cos(ang) * (r0 - (mark.db ? 21 : 24));
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('class', `smeter-num${mark.db ? ' is-db' : ''}${mark.red ? ' is-red' : ''}`);
    text.setAttribute('x', tx.toFixed(2));
    text.setAttribute('y', ty.toFixed(2));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.textContent = mark.label;
    ticks.appendChild(text);
  }
}

function signalMeterTarget(frameMax) {
  if (!state.power || state.stopped) return 0;
  const { station, dist } = nearest();
  const lock = station ? lockOf(dist) : 0;
  const tuned = Boolean(state.locked) || lock > 0.72;
  if (castUi.casting && tuned) {
    return clamp(0.55 + lock * 0.35, 0.4, 0.95);
  }
  if (!engine.ready) return lock * 0.35;
  const audio = clamp(frameMax, 0, 1);
  if (tuned) {
    return clamp(0.42 + audio * 0.5 + lock * 0.12, 0.28, 1);
  }
  if (lock > 0.2) return clamp(lock * 0.55 + audio * 0.1, 0, 0.48);
  return clamp(audio * 0.12, 0, 0.12);
}

function paintSMeter(frameMax) {
  if (!sNeedle) return;
  const target = signalMeterTarget(frameMax);
  sMeterSmooth += (target - sMeterSmooth) * (target > sMeterSmooth ? 0.22 : 0.12);
  const wobble = state.power && !state.stopped && sMeterSmooth > 0.2
    ? Math.sin(performance.now() / 180) * 0.012 * sMeterSmooth
    : 0;
  const ang = -48 + clamp(sMeterSmooth + wobble, 0, 1) * 96;
  sNeedle.style.transform = `translateX(-50%) rotate(${ang.toFixed(2)}deg)`;
}

const PAUSE_WORD_TOP = 0.92;
/* Centro verticale dello spettro (punto di riposo della scritta) */
const PAUSE_WORD_MID = 0.50;
const pauseWordY = [PAUSE_WORD_TOP, PAUSE_WORD_TOP, PAUSE_WORD_TOP, PAUSE_WORD_TOP, PAUSE_WORD_TOP];
let pauseWordActive = false;

function resetSpecPauseWord() {
  pauseWordActive = false;
  for (let i = 0; i < pauseWordY.length; i += 1) pauseWordY[i] = PAUSE_WORD_TOP;
}

function nearestBarIndexForX(targetX) {
  let best = 0;
  let bestDist = Infinity;
  for (let bi = 0; bi < fills.length; bi += 1) {
    const bar = fills[bi]?.parentElement;
    if (!bar) continue;
    const r = bar.getBoundingClientRect();
    const cx = (r.left + r.right) * 0.5;
    const d = Math.abs(cx - targetX);
    if (d < bestDist) {
      bestDist = d;
      best = bi;
    }
  }
  return best;
}

function paintSpecPauseWord() {
  if (!specPause || !specPauseChars.length || !barsHost) return;
  const show = Boolean(
    state.power
    && state.stopped
    && state.viewMode !== 'video'
    && !specPanel?.hidden
  );
  if (!show) {
    if (pauseWordActive) resetSpecPauseWord();
    specPause.classList.add('is-hidden');
    specPause.setAttribute('aria-hidden', 'true');
    return;
  }
  if (!pauseWordActive) {
    pauseWordActive = true;
    for (let i = 0; i < pauseWordY.length; i += 1) pauseWordY[i] = PAUSE_WORD_TOP;
  }
  specPause.classList.remove('is-hidden');
  specPause.setAttribute('aria-hidden', 'false');

  const hostRect = barsHost.getBoundingClientRect();
  const hostW = Math.max(1, hostRect.width);
  const n = specPauseChars.length;
  /*
    Come la PAUSA video: parola stretta al centro (non sparsa su tutto lo spettro).
    Il gate verticale usa la barra LED più vicina sotto ogni lettera.
  */
  const wordSpan = 0.34;
  const wordStart = (1 - wordSpan) / 2;
  for (let li = 0; li < n; li += 1) {
    const slot = wordStart + ((li + 0.5) / n) * wordSpan;
    const leftPct = slot * 100;
    const targetX = hostRect.left + hostW * slot;
    const bi = nearestBarIndexForX(targetX);
    const rowPeak = peaks[bi] || 0;
    const gate = Math.max(PAUSE_WORD_MID, rowPeak);
    const drop = 0.018 + Math.max(0, pauseWordY[li] - gate) * 0.05;
    pauseWordY[li] = Math.max(gate, pauseWordY[li] - drop);
    const el = specPauseChars[li];
    el.style.left = `${leftPct.toFixed(2)}%`;
    el.style.bottom = `${(pauseWordY[li] * 100).toFixed(1)}%`;
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  /* Flutter rumore solo in ascolto locale; spettro anche in Cast (stream muto) */
  if (!castUi.casting) engine.flutter(now);
  const powered = state.power && !state.stopped;
  if (engine.ready && powered) {
    if (engine.ctx.state === 'suspended') engine.ctx.resume().catch(() => {});
    engine.analyser.getByteFrequencyData(engine.bins);
  }
  let frameMax = 0.08;
  if (powered && engine.ready && engine.bins) {
    for (let i = 0; i < SPEC.length; i += 1) {
      rawLevels[i] = bandEnergy(engine.bins, SPEC[i].hz, engine.ctx.sampleRate);
      if (rawLevels[i] > frameMax) frameMax = rawLevels[i];
    }
  } else {
    rawLevels.fill(0);
    frameMax = 0;
  }
  for (let i = 0; i < SPEC.length; i += 1) {
    let level = 0;
    if (powered && engine.ready && engine.bins) {
      const relative = rawLevels[i] / Math.max(frameMax, 0.08);
      const shaped = Math.pow(Math.max(0, relative), 1.25);
      level = Math.max(0.03, Math.min(0.94, shaped * 0.75 + rawLevels[i] * 0.55));
    }
    peaks[i] = Math.max(level, peaks[i] * 0.96);
    fills[i].style.transform = `scaleY(${level})`;
    caps[i].style.bottom = `${(peaks[i] * 100).toFixed(1)}%`;
  }
  paintSpecPauseWord();
  paintSMeter(frameMax);
  if (powered && engine.ready) maybeBassGlassFlick(now, frameMax);
}

function resumeDialZoomFlair() {
  if (!state.power) return;
  /* In zoom le stesse animazioni del dial devono ripartire subito */
  scheduleNameSweep(600 + Math.random() * 900);
  scheduleWxFlair(900 + Math.random() * 1200);
  scheduleAlbumArtFlip(1100 + Math.random() * 1600);
  if (!isIOS) scheduleGlassAmbientFlick(1400 + Math.random() * 1600);
  window.setTimeout(() => {
    if (panelZoomMode !== 'dial' || !state.power) return;
    playNameSweep();
  }, 700);
}

/* Android: icona WhatsApp a destra sul dial, subito prima della sveglia */
const dialWaIco = document.getElementById('dialWaIco');
const dialWaCount = document.getElementById('dialWaCount');
let waMsgCount = 0;
let waAccessAsked = false;

function paintDialWaIco() {
  if (!dialWaIco) return;
  const n = Math.max(0, waMsgCount | 0);
  const lit = n > 0;
  dialWaIco.classList.toggle('is-lit', lit);
  dialWaIco.setAttribute('aria-pressed', String(lit));
  if (lit) {
    const label = n === 1 ? '1 messaggio WhatsApp' : `${n} messaggi WhatsApp`;
    dialWaIco.title = label;
    dialWaIco.setAttribute('aria-label', label);
  } else {
    dialWaIco.title = 'WhatsApp';
    dialWaIco.setAttribute('aria-label', 'WhatsApp');
  }
  if (dialWaCount) {
    if (lit) {
      dialWaCount.hidden = false;
      dialWaCount.textContent = n > 9 ? '9+' : String(n);
    } else {
      dialWaCount.hidden = true;
      dialWaCount.textContent = '0';
    }
  }
}

function bumpWaMessage(count) {
  const add = Number.isFinite(Number(count)) && Number(count) > 0 ? Math.floor(Number(count)) : 1;
  waMsgCount = Math.min(99, waMsgCount + add);
  paintDialWaIco();
}

function clearWaMessages() {
  waMsgCount = 0;
  paintDialWaIco();
}

function initWhatsAppDialAlert() {
  const native = window.MyTunerNative;
  if (!dialWaIco) return;
  paintDialWaIco();
  if (!native?.hasWhatsAppNotify?.()) return;

  dialWaIco.addEventListener('click', (event) => {
    event.stopPropagation();
    clearWaMessages();
    try { native.openWhatsApp?.(); } catch (e) { /* ignore */ }
  });

  native.onWhatsAppNotify?.((ev) => {
    if (ev?.kind && ev.kind !== 'message') return;
    bumpWaMessage(ev?.count);
  });

  /* Una sola volta: se manca il permesso, apri le impostazioni di sistema */
  native.whatsAppAccessEnabled?.().then((ok) => {
    if (ok || waAccessAsked) return;
    waAccessAsked = true;
    try {
      const key = 'mytuner-wa-access-asked';
      if (localStorage.getItem(key) === '1') return;
      localStorage.setItem(key, '1');
    } catch (e) { /* ignore */ }
    window.setTimeout(() => {
      try { native.openWhatsAppAccessSettings?.(); } catch (e) { /* ignore */ }
    }, 1200);
  }).catch(() => {});
}

initWhatsAppDialAlert();

function placeVolumeNumbers() {
  const ticks = document.getElementById('volTicks');
  for (let i = 0; i <= 10; i += 1) {
    const deg = -150 + (i / 10) * 300;
    const rad = (deg * Math.PI) / 180;
    const span = document.createElement('span');
    span.textContent = String(i);
    span.style.left = `${50 + Math.sin(rad) * 47}%`;
    span.style.top = `${50 - Math.cos(rad) * 47}%`;
    volNums.append(span);

    if (!ticks) continue;
    for (let t = 0; t < 5; t += 1) {
      if (i === 10 && t > 0) break;
      const tickDeg = deg + (t / 5) * 30;
      const tickRad = (tickDeg * Math.PI) / 180;
      const major = t === 0;
      const r = major ? 39.5 : 38.2;
      const tick = document.createElement('i');
      tick.className = major ? 'tick major' : 'tick';
      tick.style.left = `${50 + Math.sin(tickRad) * r}%`;
      tick.style.top = `${50 - Math.cos(tickRad) * r}%`;
      tick.style.transform = `translate(-50%, -50%) rotate(${tickDeg}deg)`;
      ticks.append(tick);
    }
  }
}

function placeTuneBridge() {
  if (!tuneBridge || !controlsEl || !lblTune || !lblBand || !btnBand) return;
  const portrait = window.matchMedia('(orientation: portrait)').matches;
  if (portrait) {
    tuneBridge.style.display = 'none';
    return;
  }

  const box = controlsEl.getBoundingClientRect();
  const tune = lblTune.getBoundingClientRect();
  const fm = lblBand.getBoundingClientRect();
  const well = btnBand.closest('.key-well') || btnBand;
  const wellBox = well.getBoundingClientRect();

  const startX = tune.right - box.left + 5;
  /* iOS stretto: fino a poco prima del tasto; altrimenti fino alla scritta FM */
  let endX = fm.left - box.left - 2;
  if (isIOS) {
    endX = Math.min(endX, wellBox.left - box.left - 8);
  }
  /* stessa altezza delle due scritte TUNING / FM */
  const y = ((tune.top + tune.bottom) / 2 + (fm.top + fm.bottom) / 2) / 2 - box.top;

  const width = endX - startX;
  if (width < 12) {
    tuneBridge.style.display = 'none';
    return;
  }

  tuneBridge.style.display = 'block';
  tuneBridge.style.left = `${startX}px`;
  tuneBridge.style.top = `${y}px`;
  tuneBridge.style.width = `${width}px`;
  tuneBridge.style.right = 'auto';
}

function placeTuneScale() {
  const ticks = document.getElementById('tuneTicks');
  const nums = document.getElementById('tuneNums');
  if (!ticks || !nums) return;
  ticks.replaceChildren();
  nums.replaceChildren();

  /* Due anelli fissi (incisi): FM fuori, AM dentro — non si ricostruiscono al cambio banda */
  const rings = [
    {
      band: 'fm',
      min: FM.min,
      max: FM.max,
      labels: [88, 90, 92, 94, 96, 98, 100, 102, 104, 106, 108],
      steps: 4,
      numR: 47,
      majorR: 39.5,
      minorR: 38.2
    },
    {
      band: 'am',
      min: AM.min,
      max: AM.max,
      labels: [530, 600, 700, 800, 900, 1000, 1200, 1400, 1600],
      steps: 2,
      numR: 43.2,
      majorR: 36.2,
      minorR: 35.2
    }
  ];

  const placeAt = (deg, r) => {
    const rad = (deg * Math.PI) / 180;
    return {
      left: `${50 + Math.sin(rad) * r}%`,
      top: `${50 - Math.cos(rad) * r}%`
    };
  };

  for (const ring of rings) {
    const span = ring.max - ring.min;
    for (let i = 0; i < ring.labels.length; i += 1) {
      const p = (ring.labels[i] - ring.min) / span;
      const deg = -150 + clamp(p, 0, 1) * 300;
      const pos = placeAt(deg, ring.numR);
      const spanEl = document.createElement('span');
      spanEl.className = `tune-lab is-${ring.band}`;
      spanEl.dataset.freq = String(ring.labels[i]);
      spanEl.textContent = String(ring.labels[i]);
      spanEl.style.left = pos.left;
      spanEl.style.top = pos.top;
      nums.append(spanEl);

      const mpos = placeAt(deg, ring.majorR);
      const major = document.createElement('i');
      /* niente is-fm/is-am sui tacchi: aspetto meccanico fisso */
      major.className = ring.band === 'am' ? 'tick major tick-inner' : 'tick major';
      major.style.left = mpos.left;
      major.style.top = mpos.top;
      major.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;
      ticks.append(major);

      if (i >= ring.labels.length - 1) continue;
      const next = ring.labels[i + 1];
      for (let t = 1; t < ring.steps; t += 1) {
        const mid = ring.labels[i] + ((next - ring.labels[i]) * t) / ring.steps;
        const mp = (mid - ring.min) / span;
        const mdeg = -150 + clamp(mp, 0, 1) * 300;
        const tpos = placeAt(mdeg, ring.minorR);
        const tick = document.createElement('i');
        tick.className = ring.band === 'am' ? 'tick tick-inner' : 'tick';
        tick.style.left = tpos.left;
        tick.style.top = tpos.top;
        tick.style.transform = `translate(-50%, -50%) rotate(${mdeg}deg)`;
        ticks.append(tick);
      }
    }
  }

  /* Legende bilanciate: FM a sinistra (inizio scala), AM a destra vicino al 108 */
  const tagFm = document.createElement('span');
  tagFm.className = 'tune-lab tune-band-tag is-fm';
  tagFm.textContent = 'FM';
  Object.assign(tagFm.style, placeAt(-158, 48.2));
  nums.append(tagFm);
  const tagAm = document.createElement('span');
  tagAm.className = 'tune-lab tune-band-tag is-am';
  tagAm.textContent = 'AM';
  /* Stessa r (altezza) di FM; angolo un filo prima del 108 per non sovrapporsi */
  Object.assign(tagAm.style, placeAt(146, 48.2));
  nums.append(tagAm);
}

function ensurePlaying() {
  if (!state.power || state.stopped) return;
  if (castUi.casting) {
    muteTabletAudio(true);
    return;
  }
  if (engine.streaming) {
    if (engine.ctx?.state === 'suspended') engine.ctx.resume().catch(() => {});
    return;
  }
  settleTune();
}

function showLockedName() {
  const { station, dist } = nearest();
  state.locked = station && dist < bandSpec().win * 0.45 ? station : null;
  paintStation();
  paintViewAvail();
}

async function loadStations() {
  try {
    const response = await fetch(hubUrl('/api/stations'));
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json();
    const fm = Array.isArray(data.fm) ? data.fm : [];
    const am = Array.isArray(data.am) ? data.am : [];
    if (fm.length) catalog.fm = applyBrandFreqs(ensureLocalStations(fm.map(withVideo)));
    if (am.length) catalog.am = am.map(withVideo);
  } catch (e) {
    if (!catalog.fm.length) catalog.fm = FALLBACK.fm.map((s) => withVideo({ ...s }));
    if (!catalog.am.length) catalog.am = FALLBACK.am.map((s) => withVideo({ ...s }));
  }
  if (!catalog.fm.length) catalog.fm = FALLBACK.fm.map((s) => withVideo({ ...s }));
  if (!catalog.am.length) catalog.am = FALLBACK.am.map((s) => withVideo({ ...s }));
  catalog.fm = applyBrandFreqs(ensureLocalStations(catalog.fm.map((s) => withVideo({ ...s }))));
  rebuildDialForMode();
  showLockedName();
  paintModeTag();
  refreshLocaleFromZone();
  try {
    if (isStationsPaneOpen()) paintSettingsStationsGrid();
  } catch (e) { /* ignore */ }
  /* Dopo il primo paint: evita splash PWA bloccata su HLS/audio all’avvio */
  window.setTimeout(() => {
    paintOnlineStatus();
    if (navigator.onLine) {
      if (state.power && !state.stopped) settleTune();
      syncVideoView();
      requestZoneFromGps();
    } else if (state.power && !state.stopped) {
      /* Offline: UI ok, niente stream — resta sulla stazione/catalogo locale */
      try { showLockedName(); } catch (e) { /* ignore */ }
    }
  }, 0);
}

let wasOnline = typeof navigator.onLine === 'boolean' ? navigator.onLine : true;

function paintOnlineStatus() {
  const online = typeof navigator.onLine === 'boolean' ? navigator.onLine : true;
  radio?.classList.toggle('is-offline', !online);
  const badge = document.getElementById('dialOffline');
  if (badge) badge.hidden = online;
  if (!online && wasOnline) {
    try { flash('RADIO OFFLINE', true); } catch (e) { /* ignore */ }
  }
  wasOnline = online;
}

function onNetworkOnline() {
  paintOnlineStatus();
  try { onTabletResume(); } catch (e) { /* ignore */ }
  if (state.power && !state.stopped) {
    try { settleTune(); } catch (e) { /* ignore */ }
  }
}

function onNetworkOffline() {
  paintOnlineStatus();
}

document.addEventListener('pointerdown', (event) => {
  const turningOff = event.target.closest('#btnPower') && state.power;
  const stopping = event.target.closest('#btnStop') && state.power && !state.stopped;
  if (castUi.casting) {
    muteTabletAudio(true);
    if (turningOff || stopping) return;
    if (event.target.closest('#btnCast, #btnPower, #btnStop, #btnChUp, #btnChDown, #volKnob, #tuneKnob, #btnSpecSettings, #btnViewMode, .band-body, .monitor-settings, .monitor-cast')) return;
    return;
  }
  engine.start();
  engine.setVolume(state.volume / 10);
  engine.setTone(state.bass, state.treble);
  if (turningOff || stopping) return;
  if (event.target.closest('#tuneKnob, .band-body, #btnBand, #btnAuto, #btnPreset, #btnMono, #btnCast, #btnChUp, #btnChDown')) return;
  ensurePlaying();
}, true);

document.addEventListener('contextmenu', (event) => event.preventDefault());

document.addEventListener('visibilitychange', () => {
  if (castUi.casting) {
    muteTabletAudio(true);
    return;
  }
  if (document.visibilityState === 'hidden') {
    stopGlassAmbientFlick();
    stopWxFlair();
    stopAlbumArtFlip();
    stopNameSweep();
    /* Non passare ad audio “solo background” se stiamo aspettando il tap per lo schermo */
    if (!pendingDisplayWake) enterIosBackgroundAudio();
    return;
  }
  leaveIosBackgroundAudio();
  if (pendingDisplayWake) {
    completeRemotePowerOn('visible');
    return;
  }
  if (!state.power || state.stopped) return;
  if (engine.ctx?.state === 'suspended') engine.ctx.resume().catch(() => {});
  if (isIOS && !engine.streaming) settleTune();
  if (remoteLinked) syncRemoteWakeLock();
  if (!isIOS) {
    scheduleGlassAmbientFlick(5000 + Math.random() * 8000);
    scheduleWxFlair(3500 + Math.random() * 6000);
    scheduleAlbumArtFlip(5000 + Math.random() * 9000);
    scheduleNameSweep(3000 + Math.random() * 5000);
  }
});

window.addEventListener('pagehide', () => {
  if (!castUi.casting) enterIosBackgroundAudio();
});

window.addEventListener('pageshow', () => {
  if (!castUi.casting) leaveIosBackgroundAudio();
});

bindKnob(tuneKnob, (delta) => {
  /* Continuo + fruscio; sensibilità ridotta per centrare meglio le stazioni */
  remoteTuneLeave = null;
  const spec = bandSpec();
  const full = (300 * Math.PI) / 180;
  const span = spec.max - spec.min;
  setFreq(currentFreq() + (delta / full) * span * 0.16, { drag: true });
}, () => {
  remoteTuneLeave = null;
  settleTune();
});

bindKnob(volKnob, (delta) => {
  const full = (300 * Math.PI) / 180;
  state.volume = clamp(state.volume + (delta / full) * 10, 0, 10);
  paintVolume({ animate: false });
  if (videoAudioLatched) setStationVideoGain();
  if (castUi.casting) {
    muteTabletAudio(true);
    setCastVolume(state.volume / 10);
  } else if (iosBgHandoff) {
    audio.volume = clamp(state.volume / 10, 0, 1);
  } else if (!videoAudioLatched) {
    engine.setVolume(state.volume / 10);
  }
}, () => persistFace());

/* Scale FM/AM: niente bindScale.
   Zoom: STESSO nodo sotto #radio (stili .radio.is-on intatti), solo translate+scale */

let panelZoomMode = ''; /* '' | 'dial' | 'spec' | 'tv' */
let panelZoomBusy = false;
let panelZoomBackdrop = null;
let panelZoomMotion = null;
let panelZoomGesture = null;
let panelZoomSuppressClick = false;

function zoomTargetEl(mode) {
  if (mode === 'spec') return specPanel;
  /* video-well = solo TV grigia, senza la colonna “TV” */
  if (mode === 'tv') return videoWell || videoPanel;
  return dialEl;
}

function resumeZoomVideo() {
  if (!stationVideo?.dataset?.url) return;
  try {
    if (stationVideo.paused) stationVideo.play().catch(() => {});
  } catch (e) { /* ignore */ }
}

function bumpZoomVolume(dir, step = 0.06) {
  try { playRatchetClick(); } catch (e) { /* ignore */ }
  state.volume = clamp(state.volume + dir * step, 0, 10);
  paintVolume();
  if (videoAudioLatched) setStationVideoGain();
  if (castUi.casting) {
    muteTabletAudio(true);
    setCastVolume(state.volume / 10);
  } else if (iosBgHandoff) {
    audio.volume = clamp(state.volume / 10, 0, 1);
  } else if (!videoAudioLatched) {
    engine.setVolume(state.volume / 10);
  }
  persistFace();
}

function ensureZoomHud() {
  if (zoomHud) return zoomHud;
  zoomHud = document.createElement('div');
  zoomHud.className = 'zoom-hud';
  zoomHud.hidden = true;
  zoomHud.setAttribute('aria-live', 'polite');
  zoomHud.innerHTML = '<span class="zoom-hud-val"></span><span class="zoom-hud-unit"></span>';
  document.body.appendChild(zoomHud);
  return zoomHud;
}

function placeZoomHud() {
  if (!zoomHud || !panelZoomMode) return;
  const panel = zoomTargetEl(panelZoomMode);
  if (!panel) return;
  const r = panel.getBoundingClientRect();
  if (r.width < 8 || r.height < 8) return;
  const x = Math.round(r.left + Math.max(12, Math.min(36, r.width * 0.035)));
  const y = Math.round(r.top + r.height * 0.45);
  zoomHud.style.left = `${x}px`;
  zoomHud.style.top = `${y}px`;
}

function hideZoomHud() {
  window.clearTimeout(zoomHudTimer);
  zoomHudTimer = 0;
  if (!zoomHud) return;
  zoomHud.classList.remove('is-on');
  zoomHud.hidden = true;
}

function showZoomHud(kind, valueText, unitText = '') {
  if (!panelZoomMode) return;
  const el = ensureZoomHud();
  placeZoomHud();
  el.dataset.kind = kind;
  const val = el.querySelector('.zoom-hud-val');
  const unit = el.querySelector('.zoom-hud-unit');
  if (val) val.textContent = valueText;
  if (unit) unit.textContent = unitText;
  el.hidden = false;
  el.classList.add('is-on');
  window.clearTimeout(zoomHudTimer);
  zoomHudTimer = window.setTimeout(() => {
    el.classList.remove('is-on');
    zoomHudTimer = window.setTimeout(() => {
      if (!el.classList.contains('is-on')) el.hidden = true;
      zoomHudTimer = 0;
    }, 200);
  }, 1000);
}

function showZoomHudVol() {
  const n = Math.round(state.volume * 10) / 10;
  const text = Number.isInteger(n) ? String(n) : n.toFixed(1);
  showZoomHud('vol', text, '');
}

function showZoomHudFreq() {
  const f = currentFreq();
  if (state.band === 'am') showZoomHud('freq', String(Math.round(f)), 'kHz');
  else showZoomHud('freq', Number(f).toFixed(1), 'MHz');
}

function stopZoomVolHold() {
  window.clearTimeout(zoomVolHoldTimer);
  zoomVolHoldTimer = 0;
  zoomVolHoldDir = 0;
}

function startZoomVolHold(dir) {
  stopZoomVolHold();
  zoomVolHoldDir = dir;
  bumpZoomVolume(dir, 0.08);
  const tick = () => {
    if (zoomVolHoldDir !== dir || panelZoomBusy || !panelZoomMode) {
      stopZoomVolHold();
      return;
    }
    bumpZoomVolume(dir, 0.05);
    zoomVolHoldTimer = window.setTimeout(tick, 45);
  };
  zoomVolHoldTimer = window.setTimeout(tick, 160);
}

function hideTvZoomDock() {
  window.clearTimeout(tvZoomDockTimer);
  tvZoomDockTimer = 0;
  stopZoomVolHold();
  hideZoomHud();
  if (!tvZoomDock) return;
  tvZoomDock.classList.remove('is-on', 'is-frame-unified');
  tvZoomDock.hidden = true;
}

function placeTvZoomDock(finalBox) {
  if (!tvZoomDock) return;
  if (!panelZoomMode) return;
  let left;
  let top;
  let width;
  let height;
  if (finalBox) {
    left = finalBox.left;
    top = finalBox.top;
    width = finalBox.width;
    height = finalBox.height;
  } else {
    const el = zoomTargetEl(panelZoomMode);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return;
    left = r.left;
    top = r.top;
    width = r.width;
    height = r.height;
  }
  const unify = radio?.classList.contains('is-fit-fullscreen') && panelZoomMode === 'tv';
  /* Mentoniera unificata: un filo più bassa → più video; tasti restano ≥42px */
  const dockH = unify
    ? Math.round(clamp(window.innerHeight * 0.072, 52, 60))
    : Math.round(clamp(window.innerHeight * 0.09, 60, 72));
  const btn = Math.round(clamp(dockH * (unify ? 0.8 : 0.72), unify ? 42 : 44, unify ? 48 : 52));
  let dockTop;
  let dockLeft;
  let dockW;
  if (unify) {
    /* Un pezzo col bordo: mentoniera più bassa di ~1mm (altezza già ridotta) */
    dockLeft = 0;
    dockW = window.innerWidth;
    dockTop = Math.max(0, window.innerHeight - dockH);
    tvZoomDock.classList.add('is-frame-unified');
  } else {
    tvZoomDock.classList.remove('is-frame-unified');
    dockLeft = left;
    dockW = width;
    dockTop = Math.round(top + height - 3);
    if (dockTop + dockH > window.innerHeight - 4) {
      dockTop = Math.max(4, window.innerHeight - dockH - 4);
    }
  }
  tvZoomDock.style.left = `${Math.round(dockLeft)}px`;
  tvZoomDock.style.top = `${dockTop}px`;
  tvZoomDock.style.width = `${Math.round(dockW)}px`;
  tvZoomDock.style.height = `${dockH}px`;
  tvZoomDock.style.setProperty('--tv-zoom-btn', `${btn}px`);
  tvZoomDock.style.fontSize = `${Math.round(clamp(btn * 0.38, 15, 20))}px`;
}

function ensureTvZoomDock() {
  if (tvZoomDock?.dataset.layout === 'bottom-v3') return tvZoomDock;
  try { tvZoomDock?.remove(); } catch (e) { /* ignore */ }
  tvZoomDock = document.createElement('div');
  tvZoomDock.className = 'tv-zoom-dock';
  tvZoomDock.dataset.layout = 'bottom-v3';
  tvZoomDock.hidden = true;
  const mk = (act, label, inner, extra = '') =>
    `<button type="button" class="tv-zoom-btn${extra}" data-act="${act}" aria-label="${label}"><span class="tv-zoom-cap">${inner}</span></button>`;
  tvZoomDock.innerHTML = `<div class="tv-zoom-keys">${[
    mk('vol-down', 'Volume meno', '<span class="tv-zoom-glyph is-minus">−</span>'),
    mk('vol-up', 'Volume più', '<span class="tv-zoom-glyph is-plus">+</span>'),
    mk('ch-prev', 'Canale precedente', '<i class="tv-zoom-tri prev" aria-hidden="true"></i>'),
    mk('ch-next', 'Canale successivo', '<i class="tv-zoom-tri next" aria-hidden="true"></i>'),
    mk('pause', 'Pausa', '<i class="tv-zoom-pause" aria-hidden="true"></i>'),
    mk('power', 'Esci dallo zoom', '', ' is-power')
  ].join('')}</div>`;
  tvZoomDock.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    const btn = event.target.closest('[data-act]');
    if (!btn || panelZoomBusy) return;
    const act = btn.getAttribute('data-act');
    if (act === 'vol-up') {
      event.preventDefault();
      startZoomVolHold(1);
      return;
    }
    if (act === 'vol-down') {
      event.preventDefault();
      startZoomVolHold(-1);
    }
  });
  const endVol = () => stopZoomVolHold();
  tvZoomDock.addEventListener('pointerup', endVol);
  tvZoomDock.addEventListener('pointercancel', endVol);
  tvZoomDock.addEventListener('pointerleave', endVol);
  tvZoomDock.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const btn = event.target.closest('[data-act]');
    if (!btn || panelZoomBusy) return;
    const act = btn.getAttribute('data-act');
    if (act === 'vol-up' || act === 'vol-down') return;
    if (act === 'ch-next') zoomNudgeStation(1);
    else if (act === 'ch-prev') zoomNudgeStation(-1);
    else if (act === 'pause') {
      if (state.power) toggleStop();
    } else if (act === 'power') setPanelZoom('');
  });
  radio.appendChild(tvZoomDock);
  paintZoomDockPause();
  return tvZoomDock;
}

function showTvZoomDock(finalBox) {
  if (!panelZoomMode) return;
  ensureTvZoomDock();
  placeTvZoomDock(finalBox);
  tvZoomDock.hidden = false;
  tvZoomDock.classList.add('is-on');
  paintZoomDockPause();
}

function flashZoomDockAct(act) {
  if (!act || !tvZoomDock || tvZoomDock.hidden) return;
  const btn = tvZoomDock.querySelector(`[data-act="${act}"]`);
  if (!btn) return;
  btn.classList.add('is-held', 'is-remote-press');
  window.setTimeout(() => {
    btn.classList.remove('is-held', 'is-remote-press');
  }, 200);
}

function remoteFlashZoomDock(action, value) {
  if (!panelZoomMode) return;
  const act = String(action || '');
  if (act === 'vol_up') flashZoomDockAct('vol-up');
  else if (act === 'vol_down') flashZoomDockAct('vol-down');
  else if (act === 'ch_up' || act === 'nav_right') flashZoomDockAct('ch-next');
  else if (act === 'ch_down' || act === 'nav_left') flashZoomDockAct('ch-prev');
  else if (act === 'pause') flashZoomDockAct('pause');
  else if (act === 'tune_up') flashZoomDockAct('ch-next');
  else if (act === 'tune_down') flashZoomDockAct('ch-prev');
}

function togglePanelZoom(mode) {
  const next = mode === 'dial' || mode === 'spec' || mode === 'tv' ? mode : '';
  if (!next) {
    setPanelZoom('');
    return;
  }
  if (panelZoomMode === next) setPanelZoom('');
  else setPanelZoom(next);
}

function ensureZoomBackdrop() {
  if (panelZoomBackdrop) return panelZoomBackdrop;
  panelZoomBackdrop = document.createElement('div');
  panelZoomBackdrop.className = 'panel-zoom-backdrop';
  panelZoomBackdrop.addEventListener('click', () => {
    if (!panelZoomBusy && panelZoomMode) setPanelZoom('');
  });
  radio.appendChild(panelZoomBackdrop);
  return panelZoomBackdrop;
}

function clearZoomInline(node) {
  if (!node) return;
  node.classList.remove('is-panel-zoom', 'flick', 'flick-soft');
  for (const n of dialFlickNodes()) n.classList.remove('flick', 'flick-soft');
  node.style.position = '';
  node.style.left = '';
  node.style.top = '';
  node.style.width = '';
  node.style.height = '';
  node.style.minWidth = '';
  node.style.minHeight = '';
  node.style.maxWidth = '';
  node.style.maxHeight = '';
  node.style.transform = '';
  node.style.zIndex = '';
  node.style.transition = '';
  node.style.overflow = '';
  node.style.fontSize = '';
  node.style.padding = '';
  node.style.paddingTop = '';
  node.style.paddingRight = '';
  node.style.paddingBottom = '';
  node.style.paddingLeft = '';
  node.style.boxSizing = '';
  node.style.gap = '';
}

function restoreZoomPanel(node) {
  if (!node?.dataset.zoomHome) return;
  clearZoomInline(node);
  const ph = node._zoomPlaceholder;
  if (ph?.parentNode) ph.parentNode.insertBefore(node, ph);
  ph?.remove();
  node._zoomPlaceholder = null;
  delete node.dataset.zoomHome;
}

function restoreAllZoomPanels() {
  restoreZoomPanel(dialEl);
  restoreZoomPanel(specPanel);
  restoreZoomPanel(videoWell);
  restoreZoomPanel(videoPanel);
  resumeZoomVideo();
}

function setPanelZoom(mode) {
  if (!radio || !chassis || panelZoomBusy) return;
  const next = mode === 'dial' || mode === 'spec' || mode === 'tv' ? mode : '';
  if (next === panelZoomMode) return;
  if (next === 'spec' && (!specPanel || specPanel.hidden || glass?.classList.contains('is-video'))) return;
  if (next === 'tv' && (!videoPanel || videoPanel.hidden || !glass?.classList.contains('is-video') || !zoomTargetEl('tv'))) return;
  if (next === 'dial' && !dialEl) return;

  const backdrop = ensureZoomBackdrop();

  /* USCITA: solo scale inverso → stesso nodo nello slot, senza ricalcoli layout */
  if (panelZoomMode && !next) {
    const cur = zoomTargetEl(panelZoomMode);
    const wasDial = panelZoomMode === 'dial';
    panelZoomBusy = true;
    panelZoomGesture = null;
    hideTvZoomDock();
    /* Niente brillamento sul rientro: spegni filter subito */
    if (wasDial) killDialFlickNow(1200);
    if (cur && panelZoomMotion) {
      /* Togli backdrop subito: evita flash “radio sparita” durante lo scale-back */
      radio.classList.remove('is-panel-zooming', 'is-tv-zoom');
      cur.style.transform = 'translate(0px, 0px) scale(1)';
      window.setTimeout(() => {
        restoreAllZoomPanels();
        panelZoomMode = '';
        panelZoomMotion = null;
        panelZoomBusy = false;
        if (wasDial) {
          killDialFlickNow(1400);
          if (state.power && !isIOS) scheduleGlassAmbientFlick(2200 + Math.random() * 1800);
        }
        scheduleRemoteState();
      }, 430);
      return;
    }
    restoreAllZoomPanels();
    radio.classList.remove('is-panel-zooming', 'is-tv-zoom');
    panelZoomMode = '';
    panelZoomMotion = null;
    panelZoomBusy = false;
    if (wasDial) killDialFlickNow(1400);
    scheduleRemoteState();
    return;
  }

  hideTvZoomDock();
  if (panelZoomMode === 'dial' || next === 'dial') killDialFlickNow(800);
  restoreAllZoomPanels();
  panelZoomMode = next;

  const el = zoomTargetEl(next);
  if (!el) {
    panelZoomMode = '';
    return;
  }

  const first = el.getBoundingClientRect();
  const host = chassis.getBoundingClientRect();
  if (first.width < 8 || first.height < 8 || host.width < 8) {
    panelZoomMode = '';
    return;
  }

  /*
    Congela il box ESATTO prima di position:fixed.
    Critico per il dial: padding in % con fixed si ricalcola sul viewport
    e abbassa FM/meteo — lo spettro usa già px/vh quindi non succede.
  */
  const cs = getComputedStyle(el);
  const w = first.width;
  const h = first.height;
  const left = first.left;
  const top = first.top;
  const frozen = {
    fontSize: cs.fontSize,
    paddingTop: cs.paddingTop,
    paddingRight: cs.paddingRight,
    paddingBottom: cs.paddingBottom,
    paddingLeft: cs.paddingLeft,
    gap: cs.gap
  };

  /* Zoom: su Schermo intero tutto (dial/spec/TV) va a viewport; altrimenti TV/dial full, spec = chassis */
  const fitFs = radio.classList.contains('is-fit-fullscreen');
  let boxW = host.width;
  let boxH = host.height;
  let boxLeft = host.left;
  let boxTop = host.top;
  let pad = 10;
  const mm = Math.max(3, Math.round(96 / 25.4)); /* ≈1mm */
  /* Mentoniera TV FS più bassa (allineata a placeTvZoomDock unify) */
  const chin = (fitFs && next === 'tv')
    ? Math.round(clamp(window.innerHeight * 0.072, 52, 60))
    : Math.round(clamp(window.innerHeight * 0.09, 60, 72));
  if (fitFs || next === 'tv' || next === 'dial') {
    boxW = window.innerWidth;
    boxH = window.innerHeight - chin;
    boxLeft = 0;
    boxTop = 0;
    pad = fitFs
      ? Math.max(4, Math.round(Math.min(boxW, boxH) * 0.01))
      : Math.max(8, Math.round(Math.min(boxW, boxH) * 0.018));
    /* Solo VIDEO zoom + Schermo intero: 1mm sopra/lati (continua nella mentoniera sotto) */
    if (fitFs && next === 'tv') {
      boxLeft = mm;
      boxTop = mm; /* bordatura sopra */
      boxW = window.innerWidth - mm * 2;
      /* mentoniera più bassa → chin minore → più video sotto */
      boxH = Math.max(1, window.innerHeight - chin - mm);
      pad = 0;
    }
  }
  /* TV FS: cover quasi pieno (solo ~1mm di telaio fuori) */
  let scale = (fitFs && next === 'tv')
    ? Math.max(boxW / w, boxH / h) * 0.99
    : Math.min((boxW - pad * 2) / w, (boxH - pad * 2) / h);
  const finalW = w * scale;
  const finalH = h * scale;
  const dx = boxLeft + (boxW - finalW) / 2 - left;
  /* TV FS: bias verso l’alto così il basso del video non finisce sotto la mentoniera */
  const dy = (fitFs && next === 'tv' && finalH > boxH)
    ? boxTop - top + Math.min(0, (boxH - finalH) * 0.22)
    : boxTop + (boxH - finalH) / 2 - top;
  panelZoomMotion = { dx, dy, scale };
  const finalBox = {
    left: left + dx,
    top: top + dy,
    width: finalW,
    height: finalH
  };

  const ph = document.createElement('div');
  ph.className = 'zoom-slot';
  ph.style.width = `${w}px`;
  ph.style.height = `${h}px`;
  el._zoomPlaceholder = ph;
  el.parentNode?.insertBefore(ph, el);
  el.dataset.zoomHome = '1';

  el.style.boxSizing = 'border-box';
  el.style.position = 'fixed';
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.style.minWidth = `${w}px`;
  el.style.minHeight = `${h}px`;
  el.style.maxWidth = `${w}px`;
  el.style.maxHeight = `${h}px`;
  el.style.fontSize = frozen.fontSize;
  el.style.paddingTop = frozen.paddingTop;
  el.style.paddingRight = frozen.paddingRight;
  el.style.paddingBottom = frozen.paddingBottom;
  el.style.paddingLeft = frozen.paddingLeft;
  if (frozen.gap && frozen.gap !== 'normal') el.style.gap = frozen.gap;
  el.style.transform = 'translate(0px, 0px) scale(1)';
  el.style.zIndex = '50';
  el.style.overflow = next === 'tv' ? 'hidden' : 'visible';
  el.classList.add('is-panel-zoom');
  radio.appendChild(el);
  if (next === 'tv') resumeZoomVideo();

  radio.classList.add('is-panel-zooming');
  radio.classList.toggle('is-tv-zoom', next === 'tv');
  panelZoomGesture = null;
  panelZoomSuppressClick = false;

  /* Mentoniera comandi anche in zoom spettro/TV/dial */
  window.clearTimeout(tvZoomDockTimer);
  showTvZoomDock(finalBox);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      if (next === 'tv') resumeZoomVideo();
      if (next === 'dial') {
        window.setTimeout(() => resumeDialZoomFlair(), 480);
      }
    });
  });
  scheduleRemoteState();
}

function zoomNudgeStation(dir) {
  engine.start();
  try { playRatchetClick(); } catch (e) { /* ignore */ }
  if (!state.power) setPower(true);
  if (state.stopped) toggleStop();
  stepStation(dir);
}

function zoomDialDragBy(dxPx, panelWidth) {
  if (!dxPx) return;
  engine.start();
  if (!state.power) setPower(true);
  if (state.stopped) toggleStop();
  cancelAfc();
  remoteTuneLeave = null;
  const w = Math.max(120, panelWidth || 300);
  const spec = bandSpec();
  const span = spec.max - spec.min;
  /* Drag lento: tutta la larghezza ≈ ~25% della banda */
  setFreq(currentFreq() + (dxPx / w) * span * 0.25, { drag: true });
}

function zoomGestureVelocityX(g, clientX) {
  const now = performance.now();
  const samples = g.samples || [];
  samples.push({ t: now, x: clientX });
  while (samples.length > 1 && now - samples[0].t > 90) samples.shift();
  g.samples = samples;
  if (samples.length < 2) return 0;
  const a = samples[0];
  const b = samples[samples.length - 1];
  const dt = b.t - a.t;
  if (dt < 12) return 0;
  return (b.x - a.x) / dt; /* px/ms */
}

function endZoomGesture(event) {
  const g = panelZoomGesture;
  if (!g || event.pointerId !== g.id) return;
  panelZoomGesture = null;
  panelZoomSuppressClick = true;
  window.setTimeout(() => { panelZoomSuppressClick = false; }, 320);
  if (panelZoomBusy || !panelZoomMode) return;

  const dx = event.clientX - g.x0;
  const dy = event.clientY - g.y0;
  const dist = Math.hypot(dx, dy);
  const vx = zoomGestureVelocityX(g, event.clientX);

  /* Tap semplice → esci dallo zoom */
  if (!g.moved || dist < 16) {
    setPanelZoom('');
    return;
  }

  if (g.mode === 'tv') {
    /* Swipe orizzontale → un canale per gesto */
    if (Math.abs(dx) >= 42 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      zoomNudgeStation(dx > 0 ? 1 : -1);
    }
    return;
  }

  if (g.mode === 'dial') {
    const fast =
      Math.abs(vx) >= 0.62
      && Math.abs(dx) >= 36
      && Math.abs(dx) > Math.abs(dy) * 1.05;
    if (fast) {
      /* Sweep veloce: come AUTO +/- → stazione successiva, niente mezza strada */
      if (state.band === 'fm') state.fm = g.freq0;
      else state.am = g.freq0;
      paintDial();
      zoomNudgeStation(vx > 0 || dx > 0 ? 1 : -1);
      return;
    }
    settleTune();
  }
}

document.addEventListener('pointerdown', (event) => {
  if (!panelZoomMode || panelZoomBusy || event.button) return;
  if (event.target.closest('.tv-zoom-dock')) return;
  const el = zoomTargetEl(panelZoomMode);
  if (!el || !el.contains(event.target)) return;
  const now = performance.now();
  panelZoomGesture = {
    id: event.pointerId,
    mode: panelZoomMode,
    x0: event.clientX,
    y0: event.clientY,
    lastX: event.clientX,
    moved: false,
    freq0: currentFreq(),
    samples: [{ t: now, x: event.clientX }]
  };
  try { el.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ }
  event.preventDefault();
}, true);

document.addEventListener('pointermove', (event) => {
  const g = panelZoomGesture;
  if (!g || event.pointerId !== g.id || !panelZoomMode) return;
  const dx = event.clientX - g.x0;
  const dy = event.clientY - g.y0;
  if (Math.hypot(dx, dy) > 12) g.moved = true;
  zoomGestureVelocityX(g, event.clientX);

  if (g.mode === 'dial' && g.moved) {
    const step = event.clientX - g.lastX;
    g.lastX = event.clientX;
    const el = zoomTargetEl('dial');
    const w = el?.getBoundingClientRect().width || 300;
    zoomDialDragBy(step, w);
    event.preventDefault();
  }
}, { passive: false, capture: true });

document.addEventListener('pointerup', endZoomGesture, true);
document.addEventListener('pointercancel', endZoomGesture, true);

document.addEventListener('click', (event) => {
  if (panelZoomBusy) return;
  if (panelZoomSuppressClick) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  /* In zoom i gesti sono su pointer; il click sul quadro non fa altro */
  if (panelZoomMode) {
    const el = zoomTargetEl(panelZoomMode);
    if (el?.contains(event.target)) return;
  }

  if (event.target.closest('#tuneKnob, #volKnob, #btnViewMode, #btnSpecSettings, #btnPower, #btnStop, #btnCast, #btnBand, #btnAuto, #btnPreset, #btnMono, #btnChUp, #btnChDown, .key, .lamp, .controls, .monitor-settings, .monitor-cast')) {
    return;
  }
  if (!event.target.closest('#radio')) return;
  if (event.target.closest('.dial')) {
    setPanelZoom('dial');
    return;
  }
  if (event.target.closest('.crt, .video-well') && glass?.classList.contains('is-video')) {
    setPanelZoom('tv');
    return;
  }
  if (event.target.closest('.spec') && !glass?.classList.contains('is-video')) {
    setPanelZoom('spec');
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && panelZoomMode) setPanelZoom('');
});

window.addEventListener('resize', () => {
  if (!panelZoomMode) return;
  if (tvZoomDock && !tvZoomDock.hidden) placeTvZoomDock();
  if (zoomHud && !zoomHud.hidden) placeZoomHud();
});

tuneKnob.addEventListener('wheel', (event) => {
  event.preventDefault();
  engine.start();
  const dir = Math.sign(event.deltaY || event.deltaX);
  if (!dir) return;
  playRatchetClick();
  remoteTuneLeave = null;
  if (state.auto) stepStation(dir);
  else {
    const step = state.band === 'fm' ? 0.1 : 9;
    setFreq(currentFreq() + dir * step * Math.min(3, Math.abs(event.deltaY) / 80), { drag: true });
    window.clearTimeout(dwellTimer);
    dwellTimer = window.setTimeout(() => settleTune(), 90);
  }
}, { passive: false });

volKnob.addEventListener('wheel', (event) => {
  event.preventDefault();
  const dir = Math.sign(event.deltaY);
  playRatchetClick();
  state.volume = clamp(state.volume - dir * 0.25, 0, 10);
  paintVolume({ animate: false });
  if (videoAudioLatched) setStationVideoGain();
  if (castUi.casting) {
    muteTabletAudio(true);
    setCastVolume(state.volume / 10);
  } else if (iosBgHandoff) {
    audio.volume = clamp(state.volume / 10, 0, 1);
  } else if (!videoAudioLatched) {
    engine.start();
    engine.setVolume(state.volume / 10);
  }
  persistFace();
}, { passive: false });

document.addEventListener('pointerdown', (event) => {
  if (event.button != null && event.button !== 0) return;
  if (event.target.closest('button.lamp, button.key')) playKeyClick();
}, true);

btnPower.addEventListener('click', () => setPower(!state.power));
btnStop.addEventListener('click', () => toggleStop());
btnViewMode?.addEventListener('click', () => {
  playKeyClick();
  toggleViewMode();
});
document.getElementById('btnSpecSettings')?.addEventListener('click', (event) => {
  event.stopPropagation();
  playKeyClick();
  const panel = document.getElementById('monitorSettings');
  const opening = panel?.classList.contains('is-hidden');
  openMonitorSettings(Boolean(opening));
});
document.getElementById('btnMonitorCastClose')?.addEventListener('click', (event) => {
  event.stopPropagation();
  openCastPicker(false);
});
document.getElementById('monitorCastList')?.addEventListener('click', (event) => {
  const btn = event.target.closest('.monitor-cast-item');
  if (!btn) return;
  event.stopPropagation();
  const buttons = [...document.querySelectorAll('#monitorCastList .monitor-cast-item')];
  const idx = buttons.indexOf(btn);
  if (idx >= 0) castUi.focus = idx;
  paintCastFocus();
  castPickerEnter();
});
document.getElementById('btnDeviceName')?.addEventListener('click', (event) => {
  event.stopPropagation();
  playKeyClick();
  settingsTrail = false;
  settingsFocus = 0;
  paintSettingsFocus();
  openDeviceNameEditor(true);
});
document.getElementById('btnAlarmSettings')?.addEventListener('click', (event) => {
  event.stopPropagation();
  playKeyClick();
  settingsTrail = false;
  settingsFocus = 1;
  paintSettingsFocus();
  openAlarmEditor(true);
});
document.getElementById('btnAlarmHush')?.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  playKeyClick();
  dismissAlarm();
});
document.getElementById('btnStationsSettings')?.addEventListener('click', (event) => {
  event.stopPropagation();
  playKeyClick();
  settingsTrail = false;
  settingsFocus = 2;
  paintSettingsFocus();
  openStationsPane(true, 'browse');
});
document.getElementById('btnStandbySettings')?.addEventListener('click', (event) => {
  event.stopPropagation();
  playKeyClick();
  settingsTrail = false;
  settingsFocus = 3;
  paintSettingsFocus();
  openStandbyEditor(true);
});
document.getElementById('btnClockSettings')?.addEventListener('click', (event) => {
  event.stopPropagation();
  playKeyClick();
  settingsTrail = false;
  settingsFocus = 4;
  paintSettingsFocus();
  openClockPane(true);
});
document.getElementById('clockThemeList')?.addEventListener('click', (event) => {
  const btn = event.target.closest('.clock-theme-item');
  if (!btn) return;
  event.stopPropagation();
  playKeyClick();
  selectClockTheme(btn.dataset.id || 'casio');
});
document.getElementById('btnBgSettings')?.addEventListener('click', (event) => {
  event.stopPropagation();
  playKeyClick();
  settingsTrail = false;
  settingsFocus = 5;
  paintSettingsFocus();
  openBgPane(true);
});
document.getElementById('btnRadioModels')?.addEventListener('click', (event) => {
  event.stopPropagation();
  playKeyClick();
  settingsTrail = false;
  openRadiosPane(true);
});
document.getElementById('monitorRadiosBody')?.addEventListener('click', (event) => {
  const btn = event.target.closest('.monitor-set-ico-btn');
  if (!btn || !btn.closest('#monitorRadiosBody')) return;
  event.stopPropagation();
  playKeyClick();
  selectRadioSkin(btn.dataset.radio || '');
});
document.getElementById('bgThemeList')?.addEventListener('click', (event) => {
  const btn = event.target.closest('.bg-theme-item');
  if (!btn) return;
  event.stopPropagation();
  playKeyClick();
  selectBgTheme(btn.dataset.id || '');
});
document.getElementById('monitorStandbyEditor')?.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-idle-field]');
  if (!btn) return;
  event.stopPropagation();
  playKeyClick();
  openStandbyMinsPick(btn.getAttribute('data-idle-field') || 'onDim');
});
document.getElementById('monitorStandbyEditor')?.addEventListener('submit', (event) => {
  event.preventDefault();
});
document.getElementById('standbyMinsList')?.addEventListener('click', (event) => {
  const btn = event.target.closest('.standby-min-item');
  if (!btn) return;
  event.stopPropagation();
  playKeyClick();
  selectStandbyMin(Number(btn.dataset.sec ?? btn.dataset.min));
});
document.getElementById('btnDeviceNameCancel')?.addEventListener('click', (event) => {
  event.stopPropagation();
  openDeviceNameEditor(false);
});
document.getElementById('monitorNameEditor')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.getElementById('deviceNameInput');
  setDeviceName(input?.value || '');
  openDeviceNameEditor(false);
});
document.getElementById('monitorAlarmEditor')?.addEventListener('submit', (event) => {
  event.preventDefault();
});
document.getElementById('alarmPowerBtn')?.addEventListener('click', (event) => {
  event.stopPropagation();
  playKeyClick();
  alarmDraft.enabled = !alarmDraft.enabled;
  paintAlarmWheels();
  commitAlarmDraft({ flash: true });
});
document.getElementById('alarmSoundSelect')?.addEventListener('change', () => {
  commitAlarmDraft({ quiet: true });
});
document.querySelectorAll('input[name="alarmMode"]').forEach((el) => {
  el.addEventListener('change', () => {
    const mode = document.querySelector('input[name="alarmMode"]:checked')?.value || 'sound';
    alarmDraft.mode = mode === 'music' ? 'music' : 'sound';
    syncAlarmModeUi();
    commitAlarmDraft({ quiet: true });
    if (alarmDraft.mode === 'music') openStationsPane(true, 'alarm');
  });
});
document.getElementById('alarmModeMusicLab')?.addEventListener('click', () => {
  /* Se Musica è già attiva, riapri la scelta stazione */
  if (alarmDraft.mode === 'music') {
    openStationsPane(true, 'alarm');
  }
});
document.getElementById('dialAlarmIco')?.addEventListener('click', (event) => {
  event.stopPropagation();
  playKeyClick();
  /* Secondo tap: chiude impostazioni e torna a spettro/TV dove si era */
  if (isAlarmEditorOpen() || (isMonitorSettingsOpen() && settingsPage === 'alarm')) {
    try { commitAlarmDraft({ quiet: true }); } catch (e) { /* ignore */ }
    settingsTrail = false;
    openMonitorSettings(false);
    return;
  }
  settingsTrail = false;
  openMonitorSettings(true);
  openAlarmEditor(true, { dir: 'forward' });
});
paintDeviceNameLabel();
/* Premi il CAST subito al tocco (anche mentre apre il picker casse) */
btnCast?.addEventListener('pointerdown', (event) => {
  if (event.button != null && event.button !== 0) return;
  if (isIOS || !castUi.ready) return;
  if (castUi.casting || castUi.pending) return;
  if (!state.power || state.stopped) return;
  if (!state.locked && !nearest().station) return;
  castUi.arming = true;
  paintCast();
});
btnCast?.addEventListener('pointercancel', () => {
  if (castUi.arming && !castUi.pending && !castUi.casting) {
    castUi.arming = false;
    paintCast();
  }
});
btnCast?.addEventListener('click', () => toggleCast());
document.getElementById('castRemoteGateBtn')?.addEventListener('click', () => {
  showCastRemoteGate(false);
  toggleCast();
});
document.getElementById('castRemoteGate')?.addEventListener('click', (event) => {
  if (event.target?.id === 'castRemoteGate') showCastRemoteGate(false);
});
/* CH ±: tap = prossima stazione; tieni premuto = Fast Seek (accelera), al rilascio aggancio */
function bindChannelStep(btn, dir) {
  if (!btn) return;
  const HOLD_MS = 340;
  let pressId = null;
  let didHold = false;

  const endPress = (event) => {
    if (pressId == null) return;
    if (event.pointerId != null && event.pointerId !== pressId) return;
    window.clearTimeout(chFastSeek.holdTimer);
    chFastSeek.holdTimer = 0;
    const wasHold = didHold;
    didHold = false;
    pressId = null;
    if (wasHold) stopChannelFastSeek();
    else {
      engine.start();
      stepStation(dir);
    }
  };

  btn.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (!state.power) return;
    event.preventDefault();
    engine.start();
    playKeyClick();
    didHold = false;
    pressId = event.pointerId;
    try { btn.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ }
    window.clearTimeout(chFastSeek.holdTimer);
    chFastSeek.holdTimer = window.setTimeout(() => {
      if (pressId == null) return;
      didHold = true;
      startChannelFastSeek(dir);
    }, HOLD_MS);
  });

  btn.addEventListener('pointerup', endPress);
  btn.addEventListener('pointercancel', endPress);
  btn.addEventListener('lostpointercapture', endPress);
  btn.addEventListener('click', (event) => {
    event.preventDefault();
  });
}
bindChannelStep(document.getElementById('btnChUp'), 1);
bindChannelStep(document.getElementById('btnChDown'), -1);
/* Switch faccia: tap sulla sede vuota o drag del pallino */
function bindFaceSwitch(btn, { isRight, setRight }) {
  if (!btn) return;
  const well = btn.closest('.switch-well') || btn.parentElement;
  if (!well) return;
  try { btn.tabIndex = -1; } catch (e) { /* ignore */ }
  let dragging = false;
  let moved = false;
  let startX = 0;
  let pid = null;

  const pad = 4;
  const travel = () => Math.max(1, well.clientWidth - btn.offsetWidth - pad * 2);

  const placeKnob = (clientX) => {
    const rect = well.getBoundingClientRect();
    const x = clientX - rect.left - pad - btn.offsetWidth / 2;
    const pct = Math.max(0, Math.min(1, x / travel()));
    btn.classList.add('is-dragging');
    btn.classList.remove('is-right');
    btn.style.left = `${pad + pct * travel()}px`;
  };

  const clearDragStyle = () => {
    btn.classList.remove('is-dragging');
    btn.style.left = '';
  };

  const finish = (clientX) => {
    if (!dragging) return;
    dragging = false;
    pid = null;
    clearDragStyle();
    let wantRight;
    if (moved) {
      /* Drag: posizione di rilascio */
      const rect = well.getBoundingClientRect();
      wantRight = clientX >= rect.left + rect.width / 2;
    } else {
      /* Pressione semplice: cambia sempre (toggle) */
      wantRight = !isRight();
    }
    if (wantRight === isRight()) {
      paintModes();
      return;
    }
    playKeyClick();
    setRight(wantRight);
  };

  well.addEventListener('pointerdown', (event) => {
    if (event.button != null && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    try { btn.blur(); } catch (e) { /* ignore */ }
    try { if (document.activeElement?.blur) document.activeElement.blur(); } catch (e) { /* ignore */ }
    dragging = true;
    moved = false;
    startX = event.clientX;
    pid = event.pointerId;
    try { well.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ }
    placeKnob(event.clientX);
  });

  well.addEventListener('pointermove', (event) => {
    if (!dragging || (pid != null && event.pointerId !== pid)) return;
    if (Math.abs(event.clientX - startX) > 3) moved = true;
    placeKnob(event.clientX);
  });

  well.addEventListener('pointerup', (event) => {
    if (pid != null && event.pointerId !== pid) return;
    finish(event.clientX);
  });
  well.addEventListener('pointercancel', (event) => {
    if (pid != null && event.pointerId !== pid) return;
    finish(event.clientX);
  });

  btn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
}

bindFaceSwitch(btnBand, {
  isRight: () => state.band === 'am',
  setRight: (right) => setBand(right ? 'am' : 'fm')
});

bindFaceSwitch(btnMono, {
  isRight: () => state.stereo,
  setRight: (right) => {
    if (right === state.stereo) return;
    engine.start();
    engine.setMono(!right);
    paintModes();
    persistFace();
    ensurePlaying();
  }
});

bindFaceSwitch(btnAuto, {
  isRight: () => !state.auto,
  setRight: (right) => {
    const wantAuto = !right;
    if (state.auto === wantAuto) return;
    state.auto = wantAuto;
    paintModes();
    persistFace();
    if (state.power && !state.stopped) {
      if (state.auto) {
        const { station } = nearest();
        if (station) setFreq(station.freq, { jump: true });
        else ensurePlaying();
      } else ensurePlaying();
    }
  }
});

let presetHeld = false;
let presetTimer = 0;
btnPreset.addEventListener('pointerdown', (event) => {
  presetHeld = false;
  btnPreset.classList.add('is-down');
  btnPreset.setPointerCapture(event.pointerId);
  presetTimer = window.setTimeout(() => {
    presetHeld = true;
    savePreset();
    btnPreset.classList.add('is-lit');
    window.setTimeout(() => btnPreset.classList.remove('is-lit'), 280);
  }, 520);
});
btnPreset.addEventListener('pointerup', () => {
  window.clearTimeout(presetTimer);
  btnPreset.classList.remove('is-down');
  if (!presetHeld) cyclePreset();
});
btnPreset.addEventListener('pointercancel', () => {
  window.clearTimeout(presetTimer);
  btnPreset.classList.remove('is-down');
});

window.addEventListener('keydown', (event) => {
  if (event.repeat && (event.key === ' ' || event.key === 'p' || event.key === 'P')) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    engine.start();
    const dir = event.key === 'ArrowRight' ? 1 : -1;
    remoteTuneLeave = null;
    if (state.auto) stepStation(dir);
    else {
      setFreq(currentFreq() + dir * (state.band === 'fm' ? 0.1 : 9), { drag: true });
      window.clearTimeout(dwellTimer);
      dwellTimer = window.setTimeout(() => settleTune(), 70);
    }
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    state.volume = clamp(state.volume + (event.key === 'ArrowUp' ? 0.3 : -0.3), 0, 10);
    paintVolume();
    engine.start();
    engine.setVolume(state.volume / 10);
    persistFace();
  } else if (event.key === ' ') {
    event.preventDefault();
    playKeyClick();
    toggleStop();
  } else if (event.key === 'p' || event.key === 'P') {
    playKeyClick();
    setPower(!state.power);
  } else if (event.key === 'b' || event.key === 'B') {
    playKeyClick();
    setBand(state.band === 'fm' ? 'am' : 'fm');
  } else if (event.key === 'm' || event.key === 'M') {
    playKeyClick();
    engine.start();
    engine.setMono(state.stereo);
    paintModes();
    persistFace();
  } else if (event.key === 'a' || event.key === 'A') {
    playKeyClick();
    state.auto = !state.auto;
    paintModes();
    persistFace();
    if (state.power && !state.stopped) {
      if (state.auto) {
        const { station } = nearest();
        if (station) setFreq(station.freq, { jump: true });
        else ensurePlaying();
      } else ensurePlaying();
    }
  }
});

audio.addEventListener('error', () => {
  if (!audio.error || audio.error.code === 1) return;
  if (!state.power || state.stopped) return;
  engine.setMix(0, 1);
  flash('NO SIGNAL', true);
});

drawScale(document.getElementById('scaleFm'), {
  min: FM.min,
  max: FM.max,
  step: 0.5,
  labels: [88, 90, 92, 94, 96, 98, 100, 102, 104, 106, 108],
  unit: 'MHz',
  align: 'bottom'
});
drawScale(document.getElementById('scaleAm'), {
  min: AM.min,
  max: AM.max,
  step: 10,
  labels: [530, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600],
  unit: 'kHz',
  align: 'top'
});

placeVolumeNumbers();
placeTuneScale();
placeTuneBridge();
buildSMeterScale();
initCasioClock();
buildSpectrum();
paintVolume();
paintEq();
paintModes();
paintDial();
paintTransport();
paintViewMode();
radio.classList.toggle('is-on', state.power);
paintCast();
async function initNativeCast() {
  const native = window.MyTunerNative;
  if (!native?.isNative?.() || !native.hasNativeCast?.()) return false;
  const ok = await native.castAvailable();
  if (!ok) return false;
  castUi.native = true;
  castUi.ready = true;
  try {
    const st = await native.castGetState();
    if (st?.connected) {
      castUi.casting = true;
      muteTabletAudio(true);
    }
  } catch (e) { /* ignore */ }
  paintCast();
  native.onCastState((ev) => {
    const connected = Boolean(ev?.connected);
    const was = castUi.casting;
    if (connected) {
      castUi.casting = true;
      castUi.pending = false;
      castUi.arming = false;
      openCastPicker(false);
      paintCast();
      muteTabletAudio(true);
      if (!castUi.loading) syncCastMedia(true);
      try { if (typeof publishRemoteState === 'function') publishRemoteState(); } catch (e) { /* ignore */ }
      return;
    }
    castUi.casting = false;
    castUi.pending = false;
    if (!isCastPickerOpen()) castUi.arming = false;
    paintCast();
    if (was) resumeTabletAfterCast();
    try { if (typeof publishRemoteState === 'function') publishRemoteState(); } catch (e) { /* ignore */ }
  });
  native.onCastRoutes((ev) => {
    if (!isCastPickerOpen() && !castUi.pickerOpen) return;
    paintCastRoutes(ev?.routes || []);
  });
  return true;
}
initNativeCast().then((usedNative) => {
  if (usedNative) return;
  if (window.__castApiAvailable) initCast();
}).catch(() => {
  if (window.__castApiAvailable) initCast();
});
window.addEventListener('cast-api', () => {
  if (castUi.native) return;
  if (window.__castApiAvailable) initCast();
});
window.addEventListener('resize', () => {
  placeTuneScale();
  placeTuneBridge();
});
window.addEventListener('orientationchange', () => {
  requestAnimationFrame(() => {
    placeTuneScale();
    placeTuneBridge();
  });
});

registerServiceWorker();
if ('mediaSession' in navigator) {
  /* Bluetooth auto / auricolari: next/prev = stazioni, play/pause = centrale */
  const bindMedia = (action, handler) => {
    try { navigator.mediaSession.setActionHandler(action, handler); } catch (e) { /* non supportato */ }
  };
  const mediaStepStation = (dir) => {
    if (!state.power) return;
    armMediaPlaybackSession();
    engine.start();
    stepStation(dir);
    if (!state.stopped) {
      window.clearTimeout(dwellTimer);
      dwellTimer = window.setTimeout(() => settleTune(), 60);
    }
  };
  bindMedia('play', () => {
    armMediaPlaybackSession();
    if (!state.power) return;
    if (state.stopped) toggleStop();
  });
  bindMedia('pause', () => {
    if (state.power && !state.stopped) toggleStop();
  });
  bindMedia('stop', () => {
    if (state.power && !state.stopped) toggleStop();
  });
  bindMedia('nexttrack', () => mediaStepStation(1));
  bindMedia('previoustrack', () => mediaStepStation(-1));
  /* Alcune auto mappano +/- su seek invece che next/prev */
  bindMedia('seekforward', () => mediaStepStation(1));
  bindMedia('seekbackward', () => mediaStepStation(-1));
}
requestAnimationFrame(() => {
  placeTuneBridge();
  requestAnimationFrame(() => {
    placeTuneBridge();
    window.setTimeout(placeTuneBridge, 120);
    window.setTimeout(placeTuneBridge, 400);
  });
});
function scheduleMarqueeSync() {
  window.clearTimeout(marqueeResizeTimer);
  marqueeResizeTimer = window.setTimeout(() => {
    syncTrackMarquee();
    syncArtistMarquee();
    syncNameMarquee();
  }, 180);
}
if (typeof ResizeObserver === 'function') {
  trackResizeObs = new ResizeObserver(() => scheduleMarqueeSync());
  if (trackLine) trackResizeObs.observe(trackLine);
  if (trackArtistRow) trackResizeObs.observe(trackArtistRow);
  if (stationName) trackResizeObs.observe(stationName);
}
window.addEventListener('resize', scheduleMarqueeSync);
requestAnimationFrame(frame);
loadStations();

/* ——— MyTuner Control: la radio si annuncia e riceve i comandi ——— */
const REMOTE_ID_KEY = 'mytuner-remote-device-id';
const REMOTE_NAME_KEY = 'mytuner-remote-device-name';
let remoteWs = null;
let remoteWsTimer = 0;
function guessDeviceKind() {
  const ua = navigator.userAgent || '';
  if (/iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'tablet';
  if (/iPhone|iPod/.test(ua)) return 'phone';
  if (/Android/i.test(ua) && /Mobile/i.test(ua)) return 'phone';
  if (/Android/i.test(ua)) return 'tablet';
  if (/Windows|Macintosh|Linux/i.test(ua)) return 'desktop';
  return 'device';
}

function guessDeviceName() {
  try {
    const saved = localStorage.getItem(REMOTE_NAME_KEY);
    if (saved) return saved.slice(0, 48);
  } catch (e) { /* ignore */ }
  const kind = guessDeviceKind();
  if (kind === 'tablet') return 'Tablet MyTuner';
  if (kind === 'phone') return 'Telefono MyTuner';
  if (kind === 'desktop') return 'PC MyTuner';
  return 'MyTuner';
}

function setDeviceName(name) {
  const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 48);
  try {
    if (clean) localStorage.setItem(REMOTE_NAME_KEY, clean);
    else localStorage.removeItem(REMOTE_NAME_KEY);
  } catch (e) { /* ignore */ }
  const finalName = guessDeviceName();
  paintDeviceNameLabel();
  if (remoteWs?.readyState === WebSocket.OPEN) {
    try {
      remoteWs.send(JSON.stringify({
        type: 'hello',
        name: finalName,
        kind: guessDeviceKind()
      }));
    } catch (e) { /* ignore */ }
  }
  flash(finalName.toUpperCase().slice(0, 18), true);
  return finalName;
}

let settingsFocus = 0;
let volPersistTimer = 0;
const ALARM_KEY = 'mytuner-alarm-v1';
const ALARM_SOUNDS = [
  { id: 'leggera', label: 'Leggera musicale', src: '/audio/alarm-leggera-musicale.mp3' }
];

function defaultAlarmSettings() {
  return {
    enabled: false,
    time: '07:00',
    mode: 'sound',
    soundId: 'leggera',
    stationKey: ''
  };
}

function normalizeAlarmSoundId(id) {
  if (id === 'casio') return 'leggera'; /* vecchio bip Casio → nuovo MP3 */
  if (ALARM_SOUNDS.some((s) => s.id === id)) return id;
  return 'leggera';
}

function readAlarmSettings() {
  const base = defaultAlarmSettings();
  try {
    const raw = JSON.parse(localStorage.getItem(ALARM_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return base;
    return {
      enabled: Boolean(raw.enabled),
      time: String(raw.time || base.time).slice(0, 5),
      mode: raw.mode === 'music' ? 'music' : 'sound',
      soundId: normalizeAlarmSoundId(raw.soundId),
      stationKey: String(raw.stationKey || '')
    };
  } catch (e) {
    return base;
  }
}

let alarmSettings = readAlarmSettings();
let alarmLastFiredKey = '';
let alarmRinging = false;
let alarmAudioEl = null;
let alarmVolRampTimer = 0;
let alarmVolRampToken = 0;
paintDialAlarmIco();

function stationKeyOf(st) {
  if (!st) return '';
  return `${st.band || 'fm'}|${Number(st.freq)}|${String(st.name || '')}`;
}

function allCatalogStations() {
  /* Stesso catalogo del dial RADIO: locali incluse, frequenze zona, ordinate */
  const fm = applyBrandFreqs(ensureLocalStations((catalog.fm || []).map((s) => withVideo({ ...s }))))
    .map((s) => ({ ...s, band: 'fm' }));
  const am = (catalog.am || [])
    .map((s) => withVideo({ ...s }))
    .slice()
    .sort((a, b) => a.freq - b.freq)
    .map((s) => ({ ...s, band: 'am' }));
  return fm.concat(am);
}

function findStationByKey(key) {
  if (!key) return null;
  return allCatalogStations().find((s) => stationKeyOf(s) === key) || null;
}

function tvStationsForRemote() {
  return tvDial().map((s) => ({ ...s, band: 'fm' }));
}

function findTvStationByKey(key) {
  if (!key) return null;
  return tvStationsForRemote().find((s) => stationKeyOf(s) === key) || null;
}

function stationsPayloadForRemote(list) {
  return (list || []).slice(0, 80).map((s) => ({
    key: stationKeyOf(s),
    name: String(s.name || ''),
    band: s.band === 'am' ? 'am' : 'fm',
    freq: Number(s.freq) || 0,
    logo: logoUrlForStation(s) || ''
  }));
}

/* Elenco completo al telecomando solo su richiesta (lo salva in locale) */
function sendStationsToRemote() {
  if (!remoteWs || remoteWs.readyState !== WebSocket.OPEN) return;
  try {
    remoteWs.send(JSON.stringify({
      type: 'stations',
      radio: stationsPayloadForRemote(allCatalogStations()),
      tv: stationsPayloadForRemote(tvStationsForRemote())
    }));
  } catch (e) { /* ignore */ }
}

/* Impostazioni per il telecomando (landscape destra): solo su richiesta, mai nello stato */
function settingsPayloadForRemote() {
  const alarmStation = alarmSettings?.stationKey
    ? allCatalogStations().find((s) => stationKeyOf(s) === alarmSettings.stationKey)
    : null;
  return {
    version: APP_VERSION,
    name: guessDeviceName(),
    alarm: {
      enabled: Boolean(alarmSettings?.enabled),
      time: String(alarmSettings?.time || '07:00'),
      mode: alarmSettings?.mode === 'music' ? 'music' : 'sound',
      stationKey: String(alarmSettings?.stationKey || ''),
      stationName: alarmStation?.name || ''
    },
    idle: {
      on: { ...idleSettings.on },
      off: { ...idleSettings.off }
    },
    idleChoices: IDLE_SEC_CHOICES.slice(),
    clockId: clockThemeId,
    clockThemes: CLOCK_THEMES.map((t) => ({ id: t.id, name: t.name, preview: t.preview || t.id })),
    bgId: bgThemeId,
    bgThemes: BG_THEMES.map((t) => ({ id: t.id, name: t.name, thumb: t.thumb || '' }))
  };
}

function sendSettingsToRemote() {
  if (!remoteWs || remoteWs.readyState !== WebSocket.OPEN) return;
  try {
    remoteWs.send(JSON.stringify({ type: 'settings', settings: settingsPayloadForRemote() }));
  } catch (e) { /* ignore */ }
}

function remoteSetAlarm(v) {
  const time = /^\d{2}:\d{2}$/.test(String(v?.time || '')) ? String(v.time) : (alarmSettings?.time || '07:00');
  const [hh, mm] = time.split(':').map(Number);
  if (!(hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59)) return;
  const next = {
    ...alarmSettings,
    enabled: v?.enabled == null ? Boolean(alarmSettings?.enabled) : Boolean(v.enabled),
    time,
    mode: v?.mode === 'music' ? 'music' : (v?.mode === 'sound' ? 'sound' : (alarmSettings?.mode || 'sound')),
    stationKey: v?.stationKey == null ? String(alarmSettings?.stationKey || '') : String(v.stationKey)
  };
  alarmSettings = next;
  alarmDraft = { ...next };
  try { localStorage.setItem(ALARM_KEY, JSON.stringify(alarmSettings)); } catch (e) { /* ignore */ }
  paintDialAlarmIco();
  syncNativeAlarmClock();
  flash(alarmSettings.enabled ? `SVEGLIA ${alarmSettings.time}` : 'SVEGLIA OFF', true);
}

function remoteSetIdle(v) {
  const field = String(v?.field || '');
  const sec = Number(v?.sec);
  if (!IDLE_SEC_CHOICES.includes(sec)) return;
  const next = { on: { ...idleSettings.on }, off: { ...idleSettings.off } };
  if (field === 'onDim') next.on.dimSec = sec;
  else if (field === 'onStandby') next.on.standbySec = sec;
  else if (field === 'offDim') next.off.dimSec = sec;
  else if (field === 'offStandby') next.off.standbySec = sec;
  else return;
  commitIdleSettings(next, { flash: true });
}

function remoteApplySetting(value) {
  const section = String(value?.section || '');
  if (section === 'user') {
    const name = String(value?.name || '').trim();
    if (name) setDeviceName(name);
  } else if (section === 'alarm') {
    remoteSetAlarm(value);
  } else if (section === 'idle') {
    remoteSetIdle(value);
  } else if (section === 'clock') {
    selectClockTheme(String(value?.id || ''));
  } else if (section === 'bg') {
    selectBgTheme(String(value?.id ?? ''));
  }
  sendSettingsToRemote();
}

/* Telecomando landscape: tap su stazione radio o canale TV */
function remotePickStation(value) {
  let mode = 'radio';
  let key = '';
  if (value && typeof value === 'object') {
    mode = value.mode === 'tv' ? 'tv' : 'radio';
    key = String(value.key || '');
  } else {
    key = String(value || '');
  }
  if (!key) return;
  if (mode === 'tv') {
    if (!isTvMode()) toggleViewMode();
    const st = findTvStationByKey(key);
    if (!st) {
      flash('NO TV', true);
      return;
    }
    if (!state.power) setPower(true);
    else if (state.stopped) toggleStop();
    window.setTimeout(() => {
      cancelAfc();
      setFreq(st.freq, { jump: true });
    }, 120);
    return;
  }
  if (isTvMode()) toggleViewMode();
  const st = findStationByKey(key);
  if (!st) {
    flash('NO STATION', true);
    return;
  }
  tuneToStation(st);
}

function paintDeviceNameLabel() {
  const input = document.getElementById('deviceNameInput');
  if (input) input.value = guessDeviceName();
  const verEl = document.getElementById('deviceVersionLab');
  if (verEl) verEl.textContent = APP_VERSION;
}

function settingsIconButtons() {
  const root = settingsPage === 'home2'
    ? '#monitorHome2Body'
    : settingsPage === 'radios'
      ? '#monitorRadiosBody'
      : '#monitorSettingsBody';
  return [...document.querySelectorAll(`${root} .monitor-set-ico-btn`)];
}

const SETTINGS_PAGES = {
  home: 'monitorSettingsBody',
  home2: 'monitorHome2Body',
  radios: 'monitorRadiosBody',
  user: 'monitorNameEditor',
  alarm: 'monitorAlarmEditor',
  stations: 'monitorStationsPane',
  standby: 'monitorStandbyEditor',
  standbyMins: 'monitorStandbyMinsPane',
  clock: 'monitorClockPane',
  bg: 'monitorBgPane'
};
let settingsPage = 'home';
let settingsSlideTimer = 0;
let settingsTrail = false; /* true = navigazione swipe a catena */
let settingsSwipeLock = false; /* swipe orizzontale in corso: ignora tap tasti */
let deviceKbShift = false;

function settingsPageEl(id) {
  return document.getElementById(SETTINGS_PAGES[id] || id);
}

function clearSettingsPageAnimClasses(el) {
  if (!el) return;
  el.classList.remove(
    'is-on',
    'is-prep-left', 'is-prep-right', 'is-out-left', 'is-out-right',
    'is-prep-top', 'is-prep-bottom', 'is-out-top', 'is-out-bottom'
  );
}

function showSettingsPage(next, opts = {}) {
  const page = SETTINGS_PAGES[next] ? next : 'home';
  const instant = Boolean(opts.instant);
  const rawDir = String(opts.dir || 'forward');
  const vertical = rawDir === 'up' || rawDir === 'down' || opts.axis === 'y';
  const dir = rawDir === 'back' || rawDir === 'down' ? 'back' : 'forward';
  const to = settingsPageEl(page);
  if (!to) return;

  if (instant || page === settingsPage) {
    window.clearTimeout(settingsSlideTimer);
    Object.keys(SETTINGS_PAGES).forEach((key) => {
      const el = settingsPageEl(key);
      clearSettingsPageAnimClasses(el);
      if (key === page) el?.classList.add('is-on');
    });
    settingsPage = page;
    scheduleRemoteState();
    return;
  }

  const from = settingsPageEl(settingsPage);
  window.clearTimeout(settingsSlideTimer);
  Object.keys(SETTINGS_PAGES).forEach((key) => {
    if (key === settingsPage || key === page) return;
    clearSettingsPageAnimClasses(settingsPageEl(key));
  });

  clearSettingsPageAnimClasses(to);
  const prep = vertical
    ? (dir === 'forward' ? 'is-prep-bottom' : 'is-prep-top')
    : (dir === 'forward' ? 'is-prep-right' : 'is-prep-left');
  const leave = vertical
    ? (dir === 'forward' ? 'is-out-top' : 'is-out-bottom')
    : (dir === 'forward' ? 'is-out-left' : 'is-out-right');
  to.classList.add(prep);
  void to.offsetWidth;
  if (from) {
    from.classList.remove('is-on', 'is-prep-left', 'is-prep-right', 'is-prep-top', 'is-prep-bottom');
    from.classList.add(leave);
  }
  to.classList.remove('is-prep-left', 'is-prep-right', 'is-prep-top', 'is-prep-bottom');
  to.classList.add('is-on');
  settingsPage = page;

  settingsSlideTimer = window.setTimeout(() => {
    Object.keys(SETTINGS_PAGES).forEach((key) => {
      if (key === settingsPage) return;
      const el = settingsPageEl(key);
      if (el && !el.classList.contains('is-on')) clearSettingsPageAnimClasses(el);
    });
  }, 380);
  scheduleRemoteState();
}

function isMonitorSettingsOpen() {
  const panel = document.getElementById('monitorSettings');
  return Boolean(panel && !panel.classList.contains('is-hidden'));
}

function isDeviceNameEditorOpen() {
  return isMonitorSettingsOpen() && settingsPage === 'user';
}

function isAlarmEditorOpen() {
  return isMonitorSettingsOpen() && settingsPage === 'alarm';
}

function isStationsPaneOpen() {
  return isMonitorSettingsOpen() && settingsPage === 'stations';
}

function isStandbyEditorOpen() {
  return isMonitorSettingsOpen() && settingsPage === 'standby';
}

function isStandbyMinsOpen() {
  return isMonitorSettingsOpen() && settingsPage === 'standbyMins';
}

function isBgPaneOpen() {
  return isMonitorSettingsOpen() && settingsPage === 'bg';
}

const BG_THEME_KEY = 'mytuner-bg-theme-v1';
const BG_THEMES = [
  { id: '', name: 'Nessuno', thumb: '' },
  {
    id: 'schermo-intero',
    name: 'Schermo intero',
    thumb: '',
    thumbClass: 'is-fullscreen',
    fit: 'fullscreen'
  },
  {
    id: 'scaffale-legno-noce',
    name: 'Scaffale in legno noce',
    thumb: '/img/bg/scaffale-legno-noce.png',
    image: '/img/bg/scaffale-legno-noce.png'
  },
  {
    id: 'laccata-grigia',
    name: 'Laccata grigia',
    thumb: '/img/bg/laccata-grigia.png',
    image: '/img/bg/laccata-grigia.png'
  },
  {
    id: 'acciaio-incassato',
    name: 'Acciaio incassato',
    thumb: '/img/bg/acciaio-incassato.png',
    image: '/img/bg/acciaio-incassato.png',
    skin: 'acciaio'
  },
  {
    id: 'soggiorno-chiaro',
    name: 'Soggiorno chiaro',
    thumb: '/img/bg/soggiorno-chiaro.png',
    image: '/img/bg/soggiorno-chiaro.png'
  },
  {
    id: 'banco-falegname',
    name: 'Banco falegname',
    thumb: '/img/bg/banco-falegname.jpg',
    image: '/img/bg/banco-falegname.jpg'
  }
];
let bgThemeId = '';
let bgThemeFocus = 0;
let fitLayoutTimer = 0;

function readBgThemeId() {
  try {
    const id = String(localStorage.getItem(BG_THEME_KEY) || '');
    return BG_THEMES.some((t) => t.id === id) ? id : '';
  } catch (e) {
    return '';
  }
}

function persistBgThemeId() {
  try {
    localStorage.setItem(BG_THEME_KEY, bgThemeId);
  } catch (e) { /* ignore */ }
}

function viewportFitBox() {
  const vv = window.visualViewport;
  const w = Math.max(1, Math.round(vv?.width || window.innerWidth || document.documentElement.clientWidth || 1));
  const h = Math.max(1, Math.round(vv?.height || window.innerHeight || document.documentElement.clientHeight || 1));
  return { w, h };
}

function layoutFullscreenFit() {
  if (!radio) return;
  if (!radio.classList.contains('is-fit-fullscreen')) {
    radio.style.removeProperty('--fit-w');
    radio.style.removeProperty('--fit-h');
    radio.style.removeProperty('--fit-pad');
    return;
  }
  /* Riempie il viewport: solo schermi + tasti, senza letterbox della cassa */
  const { w, h } = viewportFitBox();
  const margin = 0;
  const aw = Math.max(1, w - margin * 2);
  const ah = Math.max(1, h - margin * 2);
  radio.style.setProperty('--fit-pad', `${margin}px`);
  radio.style.setProperty('--fit-w', `${Math.floor(aw)}px`);
  radio.style.setProperty('--fit-h', `${Math.floor(ah)}px`);
}

function scheduleFullscreenFit() {
  window.clearTimeout(fitLayoutTimer);
  fitLayoutTimer = window.setTimeout(layoutFullscreenFit, 40);
}

function applySceneBg() {
  const theme = BG_THEMES.find((t) => t.id === bgThemeId) || BG_THEMES[0];
  const has = Boolean(theme?.image);
  const fitFs = theme?.fit === 'fullscreen';
  if (!radio) return;
  radio.classList.toggle('has-scene-bg', has);
  radio.classList.toggle('is-fit-fullscreen', fitFs);
  /* Skin radio (colore/materiale chassis) opzionale per tema */
  [...radio.classList].forEach((cls) => {
    if (cls.startsWith('skin-') && cls !== 'skin-vintage50') radio.classList.remove(cls);
  });
  if (theme?.skin) radio.classList.add(`skin-${theme.skin}`);
  if (has) radio.style.setProperty('--scene-bg', `url("${theme.image}?v=${APP_VERSION}")`);
  else radio.style.removeProperty('--scene-bg');
  layoutFullscreenFit();
}

function paintBgThemeList() {
  const list = document.getElementById('bgThemeList');
  if (!list) return;
  list.innerHTML = '';
  BG_THEMES.forEach((theme, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bg-theme-item';
    btn.dataset.id = theme.id;
    btn.setAttribute('role', 'option');
    if (theme.id === bgThemeId) {
      btn.classList.add('is-active');
      bgThemeFocus = idx;
    }
    const thumb = document.createElement('span');
    const thumbExtra = theme.thumbClass ? ` ${theme.thumbClass}` : '';
    thumb.className = 'bg-theme-thumb' + (theme.thumb || theme.thumbClass ? '' : ' is-none') + thumbExtra;
    thumb.setAttribute('aria-hidden', 'true');
    if (theme.thumb) thumb.style.backgroundImage = `url("${theme.thumb}?v=${APP_VERSION}")`;
    const name = document.createElement('span');
    name.className = 'bg-theme-name';
    name.textContent = theme.name;
    btn.append(thumb, name);
    list.append(btn);
  });
  paintBgThemeFocus();
}

function paintBgThemeFocus() {
  const items = [...document.querySelectorAll('#bgThemeList .bg-theme-item')];
  items.forEach((el, i) => {
    el.classList.toggle('is-focus', i === bgThemeFocus);
    el.setAttribute('aria-selected', String(i === bgThemeFocus));
  });
  items[bgThemeFocus]?.scrollIntoView?.({ block: 'nearest' });
}

function selectBgTheme(id) {
  const next = BG_THEMES.some((t) => t.id === id) ? id : '';
  bgThemeId = next;
  persistBgThemeId();
  applySceneBg();
  paintBgThemeList();
  scheduleRemoteState();
  flash(next ? (BG_THEMES.find((t) => t.id === next)?.name || 'SFONDO') : 'SFONDO OFF', true);
}

function openBgPane(on, opts = {}) {
  const pane = document.getElementById('monitorBgPane');
  if (!pane) return;
  if (on) {
    paintBgThemeList();
    showSettingsPage('bg', { dir: opts.dir || 'forward', instant: opts.instant });
  } else {
    showSettingsPage('home', { dir: opts.dir || 'back', instant: opts.instant });
  }
  scheduleRemoteState();
}

const RADIO_SKIN_KEY = 'mytuner-radio-skin-v1';
let radioSkinId = '';

function readRadioSkinId() {
  try {
    const id = String(localStorage.getItem(RADIO_SKIN_KEY) || '');
    return id === 'vintage50' ? id : '';
  } catch (e) {
    return '';
  }
}

function applyRadioSkin() {
  if (!radio) return;
  radio.classList.toggle('skin-vintage50', radioSkinId === 'vintage50');
}

function paintRadioSkinList() {
  document.querySelectorAll('#monitorRadiosBody .monitor-set-ico-btn').forEach((btn) => {
    const on = (btn.dataset.radio || '') === radioSkinId;
    btn.classList.toggle('is-selected', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
}

function selectRadioSkin(id) {
  radioSkinId = id === 'vintage50' ? 'vintage50' : '';
  try { localStorage.setItem(RADIO_SKIN_KEY, radioSkinId); } catch (e) { /* ignore */ }
  applyRadioSkin();
  paintRadioSkinList();
  flash(radioSkinId === 'vintage50' ? 'VINTAGE 50' : 'CLASSIC 70/80', true);
  scheduleRemoteState();
}

function openHome2Pane(on, opts = {}) {
  const pane = document.getElementById('monitorHome2Body');
  if (!pane) return;
  if (on) {
    showSettingsPage('home2', { dir: opts.dir || 'up', instant: opts.instant });
    paintSettingsFocus();
  } else {
    showSettingsPage('home', { dir: opts.dir || 'down', instant: opts.instant });
    paintSettingsFocus();
  }
  scheduleRemoteState();
}

function openRadiosPane(on, opts = {}) {
  const pane = document.getElementById('monitorRadiosBody');
  if (!pane) return;
  if (on) {
    paintRadioSkinList();
    showSettingsPage('radios', { dir: opts.dir || 'forward', instant: opts.instant });
    paintSettingsFocus();
  } else {
    showSettingsPage('home2', { dir: opts.dir || 'back', instant: opts.instant });
    paintSettingsFocus();
  }
  scheduleRemoteState();
}

radioSkinId = readRadioSkinId();
applyRadioSkin();

bgThemeId = readBgThemeId();
applySceneBg();
window.addEventListener('resize', scheduleFullscreenFit, { passive: true });
window.addEventListener('orientationchange', scheduleFullscreenFit, { passive: true });
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', scheduleFullscreenFit, { passive: true });
  window.visualViewport.addEventListener('scroll', scheduleFullscreenFit, { passive: true });
}

function hideSettingsSubpanes() {
  showSettingsPage('home', { instant: true });
}

function paintSettingsFocus() {
  const buttons = settingsIconButtons();
  if (!buttons.length) return;
  settingsFocus = ((settingsFocus % buttons.length) + buttons.length) % buttons.length;
  /* Cerchio focus solo con telecomando collegato (navigazione da remote) */
  const showRing = Boolean(remoteLinked);
  buttons.forEach((btn, i) => {
    const on = showRing && i === settingsFocus;
    btn.classList.toggle('is-selected', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
}

function openMonitorSettings(on, opts = {}) {
  const panel = document.getElementById('monitorSettings');
  const btn = document.getElementById('btnSpecSettings');
  if (!panel) return;
  const preservePage = Boolean(opts.preservePage);
  if (on) {
    try { openCastPicker(false); } catch (e) { /* ignore */ }
    /* Nuova apertura manuale: non ripristinare una sospensione video */
    if (!preservePage) settingsSuspendedForVideo = false;
  }
  panel.classList.toggle('is-hidden', !on);
  btn?.classList.toggle('is-open', Boolean(on));
  if (on) {
    if (!preservePage) {
      settingsFocus = 0;
      settingsTrail = false;
      showSettingsPage('home', { instant: true });
    }
    paintDeviceNameLabel();
    paintSettingsFocus();
  } else if (!preservePage) {
    settingsTrail = false;
    showSettingsPage('home', { instant: true });
  }
  scheduleRemoteState();
}

function appendDeviceNameChar(ch) {
  const input = document.getElementById('deviceNameInput');
  if (!input) return;
  const max = Number(input.maxLength) > 0 ? Number(input.maxLength) : 48;
  const cur = String(input.value || '');
  if (cur.length >= max) return;
  input.value = cur + ch;
}

function deleteDeviceNameChar() {
  const input = document.getElementById('deviceNameInput');
  if (!input) return;
  input.value = String(input.value || '').slice(0, -1);
}

function paintDeviceKbShift() {
  const kb = document.getElementById('deviceNameKb');
  if (!kb) return;
  kb.querySelectorAll('[data-key]').forEach((btn) => {
    const key = btn.getAttribute('data-key') || '';
    if (key === 'shift') {
      btn.classList.toggle('is-shift-on', deviceKbShift);
      return;
    }
    if (key.length === 1 && /[a-z]/i.test(key)) {
      btn.textContent = deviceKbShift ? key.toUpperCase() : key.toLowerCase();
    }
  });
}

function bindDeviceNameKeyboard() {
  const kb = document.getElementById('deviceNameKb');
  const input = document.getElementById('deviceNameInput');
  if (!kb || kb.dataset.bound === '1') return;
  kb.dataset.bound = '1';

  const rows = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'back'],
    ['space']
  ];
  kb.innerHTML = '';
  rows.forEach((row) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'device-kb-row';
    row.forEach((key) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'device-kb-key';
      btn.dataset.key = key;
      if (key === 'shift') {
        btn.classList.add('util');
        btn.textContent = '⇧';
        btn.setAttribute('aria-label', 'Maiuscolo');
      } else if (key === 'back') {
        btn.classList.add('util', 'back');
        btn.textContent = '⌫';
        btn.setAttribute('aria-label', 'Cancella');
      } else if (key === 'space') {
        btn.classList.add('space');
        btn.textContent = 'spazio';
        btn.setAttribute('aria-label', 'Spazio');
      } else {
        btn.textContent = key;
      }
      rowEl.appendChild(btn);
    });
    kb.appendChild(rowEl);
  });

  const press = (btn) => {
    const key = btn?.dataset?.key;
    if (!key) return;
    if (key === 'shift') {
      deviceKbShift = !deviceKbShift;
      paintDeviceKbShift();
      return;
    }
    if (key === 'back') {
      deleteDeviceNameChar();
      return;
    }
    if (key === 'space') {
      appendDeviceNameChar(' ');
      return;
    }
    const ch = deviceKbShift ? key.toUpperCase() : key.toLowerCase();
    appendDeviceNameChar(ch);
    if (deviceKbShift) {
      deviceKbShift = false;
      paintDeviceKbShift();
    }
  };

  /* Tap vs swipe: il tasto scatta solo se il dito non ha percorso lo schermo */
  let keyPending = null;
  kb.addEventListener('pointerdown', (event) => {
    const btn = event.target.closest('.device-kb-key');
    if (!btn || !kb.contains(btn)) return;
    if (settingsSwipeLock) return;
    event.preventDefault();
    keyPending = {
      id: event.pointerId,
      btn,
      x: event.clientX,
      y: event.clientY,
      cancelled: false
    };
    btn.classList.add('is-down');
  });
  kb.addEventListener('pointermove', (event) => {
    if (!keyPending || event.pointerId !== keyPending.id) return;
    const dx = event.clientX - keyPending.x;
    const dy = event.clientY - keyPending.y;
    if (Math.abs(dx) > 12 || Math.abs(dy) > 12) {
      keyPending.cancelled = true;
      keyPending.btn.classList.remove('is-down');
    }
  });
  const liftKey = (event) => {
    if (!keyPending || (event.pointerId != null && event.pointerId !== keyPending.id)) {
      kb.querySelectorAll('.device-kb-key.is-down').forEach((el) => el.classList.remove('is-down'));
      return;
    }
    const pending = keyPending;
    keyPending = null;
    pending.btn.classList.remove('is-down');
    if (pending.cancelled || settingsSwipeLock) return;
    playKeyClick();
    press(pending.btn);
  };
  kb.addEventListener('pointerup', liftKey);
  kb.addEventListener('pointercancel', liftKey);

  if (input) {
    input.addEventListener('focus', () => {
      /* Niente tastiera di sistema: restiamo sulla custom */
      try { input.blur(); } catch (e) { /* ignore */ }
    });
    input.addEventListener('keydown', (event) => {
      event.preventDefault();
    });
  }
  paintDeviceKbShift();
}

function openDeviceNameEditor(on, opts = {}) {
  const editor = document.getElementById('monitorNameEditor');
  const input = document.getElementById('deviceNameInput');
  if (!editor) return;
  if (on) {
    bindDeviceNameKeyboard();
    deviceKbShift = false;
    paintDeviceKbShift();
    if (input) input.value = guessDeviceName();
    showSettingsPage('user', { dir: opts.dir || 'forward', instant: opts.instant });
  } else {
    showSettingsPage('home', { dir: opts.dir || 'back', instant: opts.instant });
  }
  scheduleRemoteState();
}

let stationsPickMode = null; /* null | 'browse' | 'alarm' */
let stationsFocus = 0;
let alarmWheelFocus = 0;
let alarmFocusTimer = 0;
let alarmDraft = { enabled: false, time: '07:00', mode: 'sound', soundId: 'leggera', stationKey: '' };

function flashAlarmWheelFocus(idx) {
  alarmWheelFocus = Math.max(0, Math.min(3, idx | 0));
  document.querySelectorAll('.alarm-wheel').forEach((el) => {
    const i = Number(el.getAttribute('data-idx') || -1);
    el.classList.toggle('is-focus', i === alarmWheelFocus);
  });
  window.clearTimeout(alarmFocusTimer);
  alarmFocusTimer = window.setTimeout(() => {
    document.querySelectorAll('.alarm-wheel.is-focus').forEach((el) => el.classList.remove('is-focus'));
  }, 500);
}

function alarmDigitsFromTime(time) {
  const m = String(time || '07:00').match(/^(\d{1,2}):(\d{2})$/);
  let hh = m ? Number(m[1]) : 7;
  let mm = m ? Number(m[2]) : 0;
  hh = Math.max(0, Math.min(23, hh | 0));
  mm = Math.max(0, Math.min(59, mm | 0));
  return [
    Math.floor(hh / 10),
    hh % 10,
    Math.floor(mm / 10),
    mm % 10
  ];
}

function alarmTimeFromDigits(d) {
  const digits = d.slice();
  let hh = digits[0] * 10 + digits[1];
  let mm = digits[2] * 10 + digits[3];
  if (hh > 23) {
    digits[0] = 2;
    digits[1] = Math.min(digits[1], 3);
    hh = digits[0] * 10 + digits[1];
  }
  if (digits[2] > 5) digits[2] = 5;
  mm = digits[2] * 10 + digits[3];
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function alarmDigitMax(idx, digits) {
  if (idx === 0) return 2;
  if (idx === 1) return digits[0] === 2 ? 3 : 9;
  if (idx === 2) return 5;
  return 9;
}

function stepAlarmDigitValue(idx, digits, dir) {
  const next = digits.slice();
  const step = dir < 0 ? -1 : 1;
  const max = alarmDigitMax(idx, next);
  next[idx] = (next[idx] + step + (max + 1)) % (max + 1);
  if (idx === 0 && next[0] === 2 && next[1] > 3) next[1] = 3;
  if (idx === 1 && next[0] === 2 && next[1] > 3) next[1] = 3;
  return next;
}

function alarmDigitNeighbor(idx, dir) {
  const digits = alarmDigitsFromTime(alarmDraft.time);
  return stepAlarmDigitValue(idx, digits, dir)[idx];
}

function paintAlarmWheelStrip(idx, { keepOffset = false } = {}) {
  const digits = alarmDigitsFromTime(alarmDraft.time);
  const strip = document.getElementById(`alarmStrip${idx}`);
  const wheel = document.querySelector(`.alarm-wheel[data-idx="${idx}"]`);
  if (!strip || !wheel) return;
  const prev = strip.querySelector('[data-slot="prev"]');
  const cur = strip.querySelector('[data-slot="cur"]');
  const next = strip.querySelector('[data-slot="next"]');
  if (prev) prev.textContent = String(alarmDigitNeighbor(idx, -1));
  if (cur) cur.textContent = String(digits[idx]);
  if (next) next.textContent = String(alarmDigitNeighbor(idx, 1));
  if (!keepOffset) {
    wheel.classList.remove('is-rolling', 'is-snapping');
    strip.style.transform = '';
  }
}

function paintAlarmWheels() {
  for (let i = 0; i < 4; i += 1) paintAlarmWheelStrip(i);
  const power = document.getElementById('alarmPowerBtn');
  power?.classList.toggle('is-on', Boolean(alarmDraft.enabled));
  power?.setAttribute('aria-pressed', alarmDraft.enabled ? 'true' : 'false');
}

function paintAlarmStationChip() {
  const chip = document.getElementById('alarmStationChip');
  if (!chip) return;
  const st = findStationByKey(alarmDraft.stationKey);
  if (alarmDraft.mode !== 'music' || !st) {
    chip.classList.add('is-hidden');
    chip.innerHTML = '';
    return;
  }
  const label = st.name || 'Stazione';
  const mhz = st.band === 'am' ? `${Math.round(st.freq)} kHz` : `${Number(st.freq).toFixed(1)} MHz`;
  const logo = logoUrlForStation(st);
  chip.innerHTML = '';
  const ico = document.createElement('span');
  ico.className = 'alarm-station-logo-wrap';
  ico.setAttribute('aria-hidden', 'true');
  if (logo) {
    const img = document.createElement('img');
    img.className = 'alarm-station-logo';
    img.alt = '';
    img.decoding = 'async';
    img.width = 44;
    img.height = 44;
    img.src = logo;
    img.onerror = () => {
      img.remove();
      ico.classList.add('is-empty');
      ico.textContent = label.slice(0, 1).toUpperCase();
    };
    ico.appendChild(img);
  } else {
    ico.classList.add('is-empty');
    ico.textContent = label.slice(0, 1).toUpperCase();
  }
  const meta = document.createElement('div');
  meta.className = 'alarm-station-meta';
  const nameEl = document.createElement('div');
  nameEl.className = 'alarm-station-name';
  nameEl.textContent = label;
  const freqEl = document.createElement('div');
  freqEl.className = 'alarm-station-freq';
  freqEl.textContent = mhz;
  meta.appendChild(nameEl);
  meta.appendChild(freqEl);
  chip.appendChild(ico);
  chip.appendChild(meta);
  chip.classList.remove('is-hidden');
}

function syncAlarmModeUi() {
  const mode = alarmDraft.mode === 'music' ? 'music' : 'sound';
  for (const el of document.querySelectorAll('input[name="alarmMode"]')) {
    el.checked = el.value === mode;
  }
  document.getElementById('alarmSoundWrap')?.classList.toggle('is-hidden', mode !== 'sound');
  paintAlarmStationChip();
}

function nudgeAlarmDigit(idx, dir, opts = {}) {
  const i = Math.max(0, Math.min(3, idx | 0));
  const digits = stepAlarmDigitValue(i, alarmDigitsFromTime(alarmDraft.time), dir);
  alarmDraft.time = alarmTimeFromDigits(digits);
  paintAlarmWheelStrip(i, { keepOffset: Boolean(opts.keepOffset) });
  if (i === 0) paintAlarmWheelStrip(1, { keepOffset: Boolean(opts.keepOffset) });
  if (!opts.silent) commitAlarmDraft({ quiet: true });
}

function bindAlarmWheelInteractions() {
  const wheels = document.getElementById('alarmWheels');
  if (!wheels || wheels.dataset.bound === '1') return;
  wheels.dataset.bound = '1';
  let drag = null;

  function stripHeight(wheel) {
    const vp = wheel?.querySelector('.alarm-wheel-viewport');
    const h = vp?.getBoundingClientRect().height || 0;
    if (h > 8) return h;
    const raw = getComputedStyle(wheel).getPropertyValue('--alarm-digit-h').trim();
    const px = Number.parseFloat(raw);
    return Math.max(40, Number.isFinite(px) ? px : 56);
  }

  function applyStripOffset(wheel, offsetY) {
    const strip = wheel?.querySelector('.alarm-wheel-strip');
    if (!strip) return;
    const h = stripHeight(wheel);
    strip.style.transform = `translate3d(0, ${-h + offsetY}px, 0)`;
  }

  function stepOnce(dragState, dir) {
    nudgeAlarmDigit(dragState.idx, dir, { keepOffset: true, silent: true });
    playKeyClick();
    paintAlarmWheelStrip(dragState.idx, { keepOffset: true });
  }

  const detachWin = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
  };

  const onMove = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    event.preventDefault();
    if (!drag.axis) {
      const adx = Math.abs(event.clientX - drag.x);
      const ady = Math.abs(event.clientY - drag.y);
      if (adx < 6 && ady < 6) return;
      drag.axis = ady >= adx * 0.85 ? 'y' : 'x';
      if (drag.axis === 'x') {
        /* Lascia lo swipe orizzontale del menu */
        const wheel = drag.wheel;
        drag = null;
        detachWin();
        wheel?.classList.remove('is-rolling');
        applyStripOffset(wheel, 0);
        return;
      }
    }
    if (drag.axis !== 'y') return;

    const now = performance.now();
    const dy = event.clientY - drag.lastY; /* giù = + → diminuisce; su = − → aumenta */
    const dt = Math.max(8, now - (drag.lastT || now));
    drag.lastY = event.clientY;
    drag.lastT = now;
    drag.offset += dy;
    drag.h = stripHeight(drag.wheel);
    /* Quasi un’intera cifra per tick: meno salti per scorrimento corto */
    const step = Math.max(36, drag.h * 0.88);
    /* Normale = 1 cifra; gesto veloce (~0.55 px/ms) = max 2 */
    const speed = Math.abs(dy) / dt;
    const maxSteps = speed >= 0.55 ? 2 : 1;
    let stepped = 0;

    while (drag.offset >= step && stepped < maxSteps) {
      drag.offset -= step;
      drag.moved = true;
      stepped += 1;
      stepOnce(drag, -1);
    }
    while (drag.offset <= -step && stepped < maxSteps) {
      drag.offset += step;
      drag.moved = true;
      stepped += 1;
      stepOnce(drag, 1);
    }
    /* Scarta l’eccesso: niente burst di 5–6 cifre al frame successivo */
    if (drag.offset >= step) drag.offset = step * 0.45;
    if (drag.offset <= -step) drag.offset = -step * 0.45;
    /* Limita l’offset visuale a ±step così si vedono sempre due cifre */
    const visual = Math.max(-step, Math.min(step, drag.offset));
    applyStripOffset(drag.wheel, visual * (drag.h / step));
  };

  const onUp = (event) => {
    if (!drag || (event.pointerId != null && event.pointerId !== drag.id)) return;
    const cur = drag;
    drag = null;
    detachWin();
    const wheel = cur.wheel;
    const strip = wheel?.querySelector('.alarm-wheel-strip');
    const h = stripHeight(wheel);
    const step = Math.max(36, h * 0.88);
    if (cur.axis === 'y' && Math.abs(cur.offset) >= step * 0.35) {
      stepOnce(cur, cur.offset > 0 ? -1 : 1);
    }
    if (cur.moved || cur.axis === 'y') commitAlarmDraft({ quiet: true });
    wheel?.classList.remove('is-rolling');
    wheel?.classList.add('is-snapping');
    if (strip) {
      strip.style.transition = '';
      strip.style.transform = `translate3d(0, ${-h}px, 0)`;
    }
    window.setTimeout(() => {
      wheel?.classList.remove('is-snapping');
      paintAlarmWheelStrip(cur.idx);
    }, 180);
  };

  wheels.addEventListener('pointerdown', (event) => {
    if (event.button != null && event.button !== 0) return;
    const wheel = event.target.closest('.alarm-wheel');
    if (!wheel) return;
    /* Non far partire lo swipe pagine del menu */
    event.preventDefault();
    event.stopPropagation();
    const idx = Number(wheel.getAttribute('data-idx') || 0);
    flashAlarmWheelFocus(idx);
    const strip = wheel.querySelector('.alarm-wheel-strip');
    wheel.classList.remove('is-snapping');
    wheel.classList.add('is-rolling');
    if (strip) {
      strip.style.transition = 'none';
    }
    drag = {
      id: event.pointerId,
      idx,
      x: event.clientX,
      y: event.clientY,
      lastY: event.clientY,
      lastT: performance.now(),
      offset: 0,
      moved: false,
      axis: null,
      wheel,
      h: stripHeight(wheel)
    };
    applyStripOffset(wheel, 0);
    try { wheel.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ }
    detachWin();
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp, { passive: false });
    window.addEventListener('pointercancel', onUp, { passive: false });
  }, { passive: false });
}

function openAlarmEditor(on, opts = {}) {
  const editor = document.getElementById('monitorAlarmEditor');
  if (!editor) return;
  if (on) {
    if (!opts.preserveDraft) {
      stationsPickMode = null;
      alarmSettings = readAlarmSettings();
      alarmDraft = { ...alarmSettings };
      alarmWheelFocus = 0;
    }
    const sound = document.getElementById('alarmSoundSelect');
    if (sound) sound.value = normalizeAlarmSoundId(alarmDraft.soundId);
    bindAlarmWheelInteractions();
    paintAlarmWheels();
    syncAlarmModeUi();
    const dir = opts.dir || (settingsPage === 'stations' ? 'back' : 'forward');
    showSettingsPage('alarm', { dir, instant: opts.instant });
  } else {
    showSettingsPage('home', { dir: opts.dir || 'back', instant: opts.instant });
  }
  scheduleRemoteState();
}

function syncNativeAlarmClock() {
  try {
    if (!window.MyTunerNative?.scheduleAlarmClock) return;
    if (alarmSettings?.enabled && alarmSettings.time) {
      window.MyTunerNative.scheduleAlarmClock({
        enabled: true,
        time: alarmSettings.time
      }).then((res) => {
        if (res && res.canExact === false) {
          flash('CONSENTI SVEGLIE', true);
        }
      }).catch(() => {});
    } else {
      window.MyTunerNative.cancelAlarmClock?.().catch(() => {});
    }
  } catch (e) { /* ignore */ }
}

function commitAlarmDraft(opts = {}) {
  const sound = document.getElementById('alarmSoundSelect');
  const mode = document.querySelector('input[name="alarmMode"]:checked')?.value || alarmDraft.mode || 'sound';
  alarmDraft.mode = mode === 'music' ? 'music' : 'sound';
  alarmDraft.soundId = normalizeAlarmSoundId(sound?.value);
  alarmSettings = { ...alarmDraft };
  try { localStorage.setItem(ALARM_KEY, JSON.stringify(alarmSettings)); } catch (e) { /* ignore */ }
  paintDialAlarmIco();
  syncNativeAlarmClock();
  if (opts.flash) {
    flash(alarmSettings.enabled ? `SVEGLIA ${alarmSettings.time}` : 'SVEGLIA OFF', true);
  }
}

function saveAlarmFromEditor() {
  commitAlarmDraft({ flash: true });
}

function paintDialAlarmIco() {
  const ico = document.getElementById('dialAlarmIco');
  const armed = Boolean(alarmSettings?.enabled);
  if (ico) {
    ico.hidden = false;
    ico.classList.toggle('is-armed', armed);
    if (armed) {
      ico.title = `Sveglia ${alarmSettings.time || ''}`.trim();
      ico.setAttribute('aria-label', `Sveglia attiva ${alarmSettings.time || ''}`.trim());
    } else {
      ico.title = 'Sveglia spenta';
      ico.setAttribute('aria-label', 'Sveglia spenta');
    }
  }
  const alarmTag = document.getElementById('digitalAlarmTag');
  if (alarmTag) {
    alarmTag.classList.toggle('is-armed', armed);
    alarmTag.setAttribute('aria-label', armed
      ? `Sveglia attiva ${alarmSettings.time || ''}`.trim()
      : 'Sveglia spenta');
  }
}

/* One-shot: dopo che ha suonato non ripete. NON cancellare subito AlarmManager:
   altrimenti si annulla l’intent che deve portare l’app a schermo. */
function disarmAlarmAfterRing() {
  if (!alarmSettings?.enabled) {
    paintDialAlarmIco();
    window.setTimeout(() => {
      try { window.MyTunerNative?.cancelAlarmClock?.(); } catch (e) { /* ignore */ }
    }, 12000);
    return;
  }
  alarmSettings = { ...alarmSettings, enabled: false };
  alarmDraft = { ...alarmDraft, enabled: false };
  try { localStorage.setItem(ALARM_KEY, JSON.stringify(alarmSettings)); } catch (e) { /* ignore */ }
  paintDialAlarmIco();
  paintAlarmWheels();
  window.setTimeout(() => {
    try { window.MyTunerNative?.cancelAlarmClock?.(); } catch (e) { /* ignore */ }
  }, 12000);
}

function paintStationsFocus() {
  const items = [...document.querySelectorAll('#settingsStationsGrid .monitor-station-item')];
  items.forEach((el, i) => {
    el.classList.toggle('is-focus', i === stationsFocus);
  });
  const cur = items[stationsFocus];
  if (cur) {
    try { cur.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { /* ignore */ }
  }
}

function paintSettingsStationsGrid() {
  const grid = document.getElementById('settingsStationsGrid');
  if (!grid) return;
  const list = allCatalogStations();
  const cur = state.locked || nearest().station;
  const highlightKey = stationsPickMode === 'alarm'
    ? alarmDraft.stationKey
    : (cur ? stationKeyOf({ ...cur, band: cur.band || state.band }) : '');
  grid.innerHTML = '';
  list.forEach((st, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'monitor-station-item';
    btn.setAttribute('role', 'option');
    const key = stationKeyOf(st);
    if (key && key === highlightKey) btn.classList.add('is-active');
    const label = st.name || (st.band === 'am' ? `${Math.round(st.freq)}` : Number(st.freq).toFixed(1));
    const logo = logoUrlForStation(st);
    const ico = document.createElement('span');
    ico.className = 'monitor-station-ico';
    ico.setAttribute('aria-hidden', 'true');
    if (logo) {
      const img = document.createElement('img');
      img.className = 'monitor-station-logo';
      img.alt = '';
      img.decoding = 'async';
      img.loading = 'lazy';
      img.width = 32;
      img.height = 32;
      img.src = logo;
      img.onerror = () => {
        img.remove();
        ico.classList.add('is-empty');
        ico.textContent = (label || '?').slice(0, 1).toUpperCase();
      };
      ico.appendChild(img);
    } else {
      ico.classList.add('is-empty');
      ico.textContent = (label || '?').slice(0, 1).toUpperCase();
    }
    const nameEl = document.createElement('span');
    nameEl.className = 'monitor-station-name';
    nameEl.textContent = label;
    btn.appendChild(ico);
    btn.appendChild(nameEl);
    btn.title = st.name || '';
    btn.dataset.key = key;
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      playKeyClick();
      stationsFocus = i;
      selectSettingsStation(st);
    });
    grid.appendChild(btn);
  });
  if (stationsFocus >= list.length) stationsFocus = 0;
  paintStationsFocus();
}

function selectSettingsStation(st) {
  if (!st) return;
  if (stationsPickMode === 'alarm') {
    alarmDraft.stationKey = stationKeyOf(st);
    alarmDraft.mode = 'music';
    stationsPickMode = null;
    commitAlarmDraft({ quiet: true });
    openAlarmEditor(true, { preserveDraft: true, dir: 'back' });
    return;
  }
  tuneToStation(st);
  openMonitorSettings(false);
}

function openStationsPane(on, mode = 'browse', opts = {}) {
  const pane = document.getElementById('monitorStationsPane');
  if (!pane) return;
  if (on) {
    stationsPickMode = mode === 'alarm' ? 'alarm' : 'browse';
    stationsFocus = 0;
    paintSettingsStationsGrid();
    showSettingsPage('stations', {
      dir: opts.dir || 'forward',
      instant: opts.instant
    });
  } else if (settingsPage === 'stations') {
    stationsPickMode = null;
    showSettingsPage('home', { dir: opts.dir || 'back', instant: opts.instant });
  } else {
    stationsPickMode = null;
  }
  scheduleRemoteState();
}

/* Idle: tempi on/off separati (anche 30s). Standby = spegne schermo, non lo riaccende. */
const IDLE_SETTINGS_KEY = 'mytuner-idle-v2';
const IDLE_SEC_CHOICES = [30, 60, 120, 180, 300, 600, 900, 1200, 1800];
const IDLE_DEFAULTS = {
  on: { dimSec: 120, standbySec: 300 },
  off: { dimSec: 60, standbySec: 300 }
};

function clampIdleSec(sec, fallback) {
  const n = Number(sec);
  return IDLE_SEC_CHOICES.includes(n) ? n : fallback;
}

function normalizeIdlePair(raw, fallback) {
  return {
    dimSec: clampIdleSec(raw?.dimSec ?? (Number(raw?.dimMin) > 0 ? Number(raw.dimMin) * 60 : NaN), fallback.dimSec),
    standbySec: clampIdleSec(raw?.standbySec ?? (Number(raw?.standbyMin) > 0 ? Number(raw.standbyMin) * 60 : NaN), fallback.standbySec)
  };
}

function readIdleSettings() {
  try {
    const v2 = JSON.parse(localStorage.getItem(IDLE_SETTINGS_KEY) || 'null');
    if (v2 && typeof v2 === 'object') {
      return {
        on: normalizeIdlePair(v2.on || v2, IDLE_DEFAULTS.on),
        off: normalizeIdlePair(v2.off || {}, IDLE_DEFAULTS.off)
      };
    }
    const v1 = JSON.parse(localStorage.getItem('mytuner-idle-v1') || 'null');
    if (v1 && typeof v1 === 'object') {
      return {
        on: normalizeIdlePair({
          dimSec: Number(v1.dimMin) * 60,
          standbySec: Number(v1.standbyMin) * 60
        }, IDLE_DEFAULTS.on),
        off: { ...IDLE_DEFAULTS.off }
      };
    }
  } catch (e) { /* ignore */ }
  return {
    on: { ...IDLE_DEFAULTS.on },
    off: { ...IDLE_DEFAULTS.off }
  };
}

function persistIdleSettings() {
  try {
    localStorage.setItem(IDLE_SETTINGS_KEY, JSON.stringify(idleSettings));
  } catch (e) { /* ignore */ }
}

let idleSettings = readIdleSettings();
/* null | 'onDim' | 'onStandby' | 'offDim' | 'offStandby' */
let standbyPickField = null;
let standbyMinsFocus = 0;

function idleSecLabel(sec) {
  const n = Number(sec);
  if (n < 60) return `${n} secondi`;
  const m = n / 60;
  return m === 1 ? '1 minuto' : `${m} minuti`;
}

function activeIdleProfile() {
  return state.power ? idleSettings.on : idleSettings.off;
}

function syncStandbyEditor() {
  const map = {
    btnIdleDim: idleSettings.on.dimSec,
    btnIdleStandby: idleSettings.on.standbySec,
    btnIdleDimOff: idleSettings.off.dimSec,
    btnIdleStandbyOff: idleSettings.off.standbySec
  };
  Object.entries(map).forEach(([id, sec]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = idleSecLabel(sec);
  });
  document.querySelectorAll('.standby-mode-block').forEach((el) => {
    const mode = el.getAttribute('data-idle-mode');
    el.classList.toggle('is-active', state.power ? mode === 'on' : mode === 'off');
  });
  paintIdleCountdowns();
}

function commitIdleSettings(next, opts = {}) {
  idleSettings = {
    on: normalizeIdlePair(next?.on || idleSettings.on, IDLE_DEFAULTS.on),
    off: normalizeIdlePair(next?.off || idleSettings.off, IDLE_DEFAULTS.off)
  };
  persistIdleSettings();
  syncStandbyEditor();
  bumpIdleActivity();
  if (opts.flash) {
    const p = activeIdleProfile();
    flash(`SCURO ${idleSecLabel(p.dimSec)} · STBY ${idleSecLabel(p.standbySec)}`, true);
  }
}

function paintStandbyMinsList() {
  const list = document.getElementById('standbyMinsList');
  if (!list) return;
  let current = idleSettings.on.dimSec;
  if (standbyPickField === 'onStandby') current = idleSettings.on.standbySec;
  else if (standbyPickField === 'offDim') current = idleSettings.off.dimSec;
  else if (standbyPickField === 'offStandby') current = idleSettings.off.standbySec;
  list.innerHTML = '';
  IDLE_SEC_CHOICES.forEach((sec, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'standby-min-item';
    btn.dataset.sec = String(sec);
    btn.setAttribute('role', 'option');
    btn.textContent = idleSecLabel(sec);
    if (sec === current) {
      btn.classList.add('is-active');
      standbyMinsFocus = idx;
    }
    list.append(btn);
  });
  paintStandbyMinsFocus();
}

function paintStandbyMinsFocus() {
  const items = [...document.querySelectorAll('#standbyMinsList .standby-min-item')];
  items.forEach((el, i) => {
    el.classList.toggle('is-focus', i === standbyMinsFocus);
    el.setAttribute('aria-selected', String(i === standbyMinsFocus));
  });
  items[standbyMinsFocus]?.scrollIntoView?.({ block: 'nearest' });
}

function openStandbyEditor(on, opts = {}) {
  const editor = document.getElementById('monitorStandbyEditor');
  if (!editor) return;
  if (on) {
    standbyPickField = null;
    syncStandbyEditor();
    showSettingsPage('standby', { dir: opts.dir || 'forward', instant: opts.instant });
  } else {
    standbyPickField = null;
    showSettingsPage('home', { dir: opts.dir || 'back', instant: opts.instant });
  }
  scheduleRemoteState();
}

function openStandbyMinsPick(field, opts = {}) {
  const ok = ['onDim', 'onStandby', 'offDim', 'offStandby'];
  /* Retrocompat: 'dim' / 'standby' = radio accesa */
  if (field === 'dim') field = 'onDim';
  if (field === 'standby') field = 'onStandby';
  standbyPickField = ok.includes(field) ? field : 'onDim';
  paintStandbyMinsList();
  showSettingsPage('standbyMins', { dir: opts.dir || 'forward', instant: opts.instant });
  scheduleRemoteState();
}

function selectStandbyMin(sec) {
  const value = Number(sec);
  if (!IDLE_SEC_CHOICES.includes(value)) return;
  const next = {
    on: { ...idleSettings.on },
    off: { ...idleSettings.off }
  };
  if (standbyPickField === 'onStandby') next.on.standbySec = value;
  else if (standbyPickField === 'offDim') next.off.dimSec = value;
  else if (standbyPickField === 'offStandby') next.off.standbySec = value;
  else next.on.dimSec = value;
  commitIdleSettings(next, { flash: true });
  standbyPickField = null;
  openStandbyEditor(true, { dir: 'back' });
}

function navStationsGrid(dir) {
  const items = [...document.querySelectorAll('#settingsStationsGrid .monitor-station-item')];
  const n = items.length;
  if (!n) return;
  const cols = 3;
  const d = String(dir || '').toLowerCase();
  let i = stationsFocus;
  if (d === 'left') i = (i - 1 + n) % n;
  else if (d === 'right') i = (i + 1) % n;
  else if (d === 'up') i = (i - cols + n * 4) % n;
  else if (d === 'down') i = (i + cols) % n;
  else return;
  stationsFocus = i;
  paintStationsFocus();
  scheduleRemoteState();
}

function tuneToStation(st, opts = {}) {
  if (!st) return;
  const fromAlarm = Boolean(opts.fromAlarm);
  const band = st.band === 'am' ? 'am' : 'fm';
  if (state.viewMode === 'video') {
    try { /* resta in radio se possibile */ } catch (e) { /* ignore */ }
  }
  if (state.band !== band) setBand(band);
  if (!state.power) setPower(true, { fromAlarm });
  else if (state.stopped) {
    if (fromAlarm) {
      state.stopped = false;
      radio.classList.remove('is-stopped');
      paintTransport();
      cancelAfc();
      armMediaPlaybackSession();
      if (castUi.casting) syncCastMedia(true);
      updateMediaSession();
    } else {
      toggleStop();
    }
  }
  window.setTimeout(() => {
    cancelAfc();
    setFreq(st.freq, { jump: true });
  }, state.band === band ? 40 : 380);
}

function stopAlarmSound() {
  if (!alarmAudioEl) return;
  try {
    alarmAudioEl.pause();
    alarmAudioEl.currentTime = 0;
  } catch (e) { /* ignore */ }
}

function alarmWasInStandbyOrBackground() {
  /* Catturare PRIMA di wakeDisplay/setPower: standby = spenta / wake pending; background = hidden */
  return Boolean(document.hidden || !state.power || pendingDisplayWake);
}

function stopAlarmVolumeRamp() {
  if (alarmVolRampTimer) {
    window.clearInterval(alarmVolRampTimer);
    alarmVolRampTimer = 0;
  }
  alarmVolRampToken += 1;
}

function applyAlarmMusicVolume(unit) {
  const u = clamp(unit, 0, 1);
  state.volume = u * 10;
  paintVolume({ animate: false });
  if (castUi.casting) {
    setCastVolume(u);
  } else if (iosBgHandoff) {
    audio.volume = u;
  } else if (!videoAudioLatched) {
    engine.setVolume(u);
  }
}

function startAlarmVolumeRamp({ mode, onMp3 } = {}) {
  stopAlarmVolumeRamp();
  const token = alarmVolRampToken;
  const from = 0.5;
  const to = 1;
  const durMs = 10000;
  const t0 = performance.now();
  const tick = () => {
    if (token !== alarmVolRampToken || !alarmRinging) {
      stopAlarmVolumeRamp();
      return;
    }
    const p = Math.min(1, (performance.now() - t0) / durMs);
    const unit = from + (to - from) * p;
    if (mode === 'music') applyAlarmMusicVolume(unit);
    else if (onMp3 && alarmAudioEl) alarmAudioEl.volume = unit;
    if (p >= 1) {
      stopAlarmVolumeRamp();
      if (mode === 'music') persistFace();
    }
  };
  if (mode === 'music') applyAlarmMusicVolume(from);
  else if (onMp3 && alarmAudioEl) alarmAudioEl.volume = from;
  alarmVolRampTimer = window.setInterval(tick, 100);
}

function startAlarmMp3Sound({ ramp = false } = {}) {
  stopAlarmSound();
  const id = normalizeAlarmSoundId(alarmSettings.soundId);
  const pack = ALARM_SOUNDS.find((s) => s.id === id) || ALARM_SOUNDS[0];
  if (!pack?.src) return;
  if (!alarmAudioEl) {
    alarmAudioEl = new Audio();
    alarmAudioEl.preload = 'auto';
  }
  alarmAudioEl.loop = true;
  alarmAudioEl.src = pack.src;
  /* Schermo attivo: volume già impostato; standby/bg: parte a 0.5 e sale */
  alarmAudioEl.volume = ramp ? 0.5 : clamp(state.volume / 10, 0, 1);
  const play = () => {
    try {
      const p = alarmAudioEl.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) { /* ignore */ }
  };
  if (alarmAudioEl.readyState >= 2) play();
  else alarmAudioEl.addEventListener('canplay', play, { once: true });
  try { alarmAudioEl.load(); } catch (e) { /* ignore */ }
  if (ramp) startAlarmVolumeRamp({ mode: 'sound', onMp3: true });
}

function paintAlarmHush(show) {
  const btn = document.getElementById('btnAlarmHush');
  if (!btn) return;
  if (show) {
    try { openMonitorSettings(false); } catch (e) { /* ignore */ }
    try { openCastPicker(false); } catch (e) { /* ignore */ }
    btn.classList.remove('is-out');
    btn.classList.remove('is-hidden');
    return;
  }
  if (btn.classList.contains('is-hidden')) return;
  btn.classList.add('is-out');
  window.setTimeout(() => {
    btn.classList.add('is-hidden');
    btn.classList.remove('is-out');
  }, 280);
}

function forcePauseForAlarm() {
  if (!state.power || state.stopped) return;
  state.stopped = true;
  radio.classList.add('is-stopped');
  paintTransport();
  cancelAfc();
  state.locked = null;
  clearIosBackgroundAudio();
  engine.silence();
  engine.pause();
  if (castUi.casting) {
    try {
      const media = cast.framework.CastContext.getInstance().getCurrentSession()?.getMediaSession();
      media?.stop();
    } catch (e) { /* ignore */ }
  }
  paintStation();
  updateMediaSession();
}

function dismissAlarm() {
  if (!alarmRinging) return;
  alarmRinging = false;
  stopAlarmVolumeRamp();
  stopAlarmSound();
  paintAlarmHush(false);
  scheduleRemoteState();
}

function fireAlarm() {
  if (alarmRinging) return;
  /* Prima di wakeDisplay/setPower: decide se soft-ramp volume */
  const softRamp = alarmWasInStandbyOrBackground();
  alarmRinging = true;
  /* Accendi schermo + riporta l’app in primo piano (notifica silenziosa nativa se in recent) */
  try {
    window.MyTunerNative?.wakeDisplay?.({ reason: 'alarm', reveal: true });
  } catch (e) { /* ignore */ }
  try { window.MyTunerNative?.keepAwake?.(true); } catch (e) { /* ignore */ }
  try { window.focus(); } catch (e) { /* ignore */ }
  flash('SVEGLIA', true);
  if (alarmSettings.mode === 'music') {
    if (softRamp) applyAlarmMusicVolume(0.5);
    const st = findStationByKey(alarmSettings.stationKey) || allCatalogStations()[0];
    if (st) tuneToStation(st, { fromAlarm: true });
    else if (!state.power) setPower(true, { fromAlarm: true });
    if (softRamp) startAlarmVolumeRamp({ mode: 'music' });
  } else {
    /* Suono: accende in pausa — solo la sveglia MP3, niente radio */
    if (!state.power) setPower(true, { fromAlarm: true, quiet: true });
    else forcePauseForAlarm();
    startAlarmMp3Sound({ ramp: softRamp });
  }
  paintAlarmHush(true);
  disarmAlarmAfterRing();
  scheduleRemoteState();
  bumpIdleActivity();
}

function checkAlarmTick() {
  if (!alarmSettings?.enabled || !alarmSettings.time) return;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const stamp = `${hh}:${mm}`;
  if (stamp !== alarmSettings.time) return;
  const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${stamp}`;
  if (alarmLastFiredKey === dayKey) return;
  alarmLastFiredKey = dayKey;
  fireAlarm();
}

window.setInterval(checkAlarmTick, 1000);

/* AlarmManager nativo: apre l’UI e chiede il fire (dedup con alarmLastFiredKey) */
window.addEventListener('mytuner-alarm-fire', () => {
  try {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const stamp = `${hh}:${mm}`;
    const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${stamp}`;
    if (alarmLastFiredKey === dayKey) return;
    alarmLastFiredKey = dayKey;
    fireAlarm();
  } catch (e) { /* ignore */ }
});

try { syncNativeAlarmClock(); } catch (e) { /* ignore */ }

function settingsNav(dir) {
  if (!isMonitorSettingsOpen()) return;
  if (isStationsPaneOpen()) {
    navStationsGrid(dir);
    return;
  }
  if (isStandbyMinsOpen()) {
    const items = [...document.querySelectorAll('#standbyMinsList .standby-min-item')];
    const n = items.length;
    if (!n) return;
    const d = String(dir || '').toLowerCase();
    if (d === 'up' || d === 'left') standbyMinsFocus = (standbyMinsFocus - 1 + n) % n;
    else if (d === 'down' || d === 'right') standbyMinsFocus = (standbyMinsFocus + 1) % n;
    else return;
    paintStandbyMinsFocus();
    scheduleRemoteState();
    return;
  }
  if (isClockPaneOpen()) {
    const items = [...document.querySelectorAll('#clockThemeList .clock-theme-item')];
    const n = items.length;
    if (!n) return;
    const d = String(dir || '').toLowerCase();
    if (d === 'up' || d === 'left') clockThemeFocus = (clockThemeFocus - 1 + n) % n;
    else if (d === 'down' || d === 'right') clockThemeFocus = (clockThemeFocus + 1) % n;
    else return;
    paintClockThemeFocus();
    scheduleRemoteState();
    return;
  }
  if (isBgPaneOpen()) {
    const items = [...document.querySelectorAll('#bgThemeList .bg-theme-item')];
    const n = items.length;
    if (!n) return;
    const d = String(dir || '').toLowerCase();
    if (d === 'up' || d === 'left') bgThemeFocus = (bgThemeFocus - 1 + n) % n;
    else if (d === 'down' || d === 'right') bgThemeFocus = (bgThemeFocus + 1) % n;
    else return;
    paintBgThemeFocus();
    scheduleRemoteState();
    return;
  }
  if (isAlarmEditorOpen()) {
    const d = String(dir || '').toLowerCase();
    if (d === 'left') {
      flashAlarmWheelFocus((alarmWheelFocus + 3) % 4);
    } else if (d === 'right') {
      flashAlarmWheelFocus((alarmWheelFocus + 1) % 4);
    } else if (d === 'up') {
      flashAlarmWheelFocus(alarmWheelFocus);
      nudgeAlarmDigit(alarmWheelFocus, 1);
    } else if (d === 'down') {
      flashAlarmWheelFocus(alarmWheelFocus);
      nudgeAlarmDigit(alarmWheelFocus, -1);
    }
    scheduleRemoteState();
    return;
  }
  if (isDeviceNameEditorOpen()) return;
  const n = settingsIconButtons().length;
  if (n <= 0) return;
  const step = String(dir).toLowerCase() === 'right' ? 1 : -1;
  settingsFocus = (settingsFocus + step + n) % n;
  paintSettingsFocus();
  scheduleRemoteState();
}

function settingsNeighbor(dir) {
  const forward = dir === 'forward';
  /* home2 ↔ home solo verticale (nudgeHomeIcons), non swipe orizzontale */
  if (settingsPage === 'home2') return null;
  if (settingsPage === 'radios') return forward ? null : 'home2';
  if (forward) {
    if (settingsPage === 'home') return 'user';
    if (settingsPage === 'user') return 'alarm';
    if (settingsPage === 'alarm') return 'stations';
    if (settingsPage === 'stations' && stationsPickMode !== 'alarm') return 'standby';
    if (settingsPage === 'standby') return 'clock';
    if (settingsPage === 'clock') return 'bg';
    return null;
  }
  /* Home: swipe sx→dx chiude impostazioni */
  if (settingsPage === 'home') return '__close__';
  /* Sottopagine speciali */
  if (settingsPage === 'standbyMins') return 'standby';
  if (settingsPage === 'stations' && stationsPickMode === 'alarm') return 'alarm';
  /* Catena swipe: sempre un passo indietro */
  if (settingsTrail) {
    if (settingsPage === 'bg') return 'clock';
    if (settingsPage === 'clock') return 'standby';
    if (settingsPage === 'standby') return 'stations';
    if (settingsPage === 'stations') return 'alarm';
    if (settingsPage === 'alarm') return 'user';
    if (settingsPage === 'user') return 'home';
  }
  /* Apertura diretta da icona (CLOCK/SFONDI/…): gesture indietro → menu */
  if (settingsPage && settingsPage !== 'home') return 'home';
  return null;
}

function prepareSettingsPeek(id) {
  if (id === 'user') {
    bindDeviceNameKeyboard();
    const input = document.getElementById('deviceNameInput');
    if (input) input.value = guessDeviceName();
    return;
  }
  if (id === 'alarm') {
    if (settingsPage !== 'stations') {
      alarmSettings = readAlarmSettings();
      alarmDraft = { ...alarmSettings };
      alarmWheelFocus = 0;
    }
    const sound = document.getElementById('alarmSoundSelect');
    if (sound) sound.value = normalizeAlarmSoundId(alarmDraft.soundId);
    bindAlarmWheelInteractions();
    paintAlarmWheels();
    syncAlarmModeUi();
    return;
  }
  if (id === 'stations') {
    paintSettingsStationsGrid();
    return;
  }
  if (id === 'standby') {
    syncStandbyEditor();
    return;
  }
  if (id === 'standbyMins') {
    paintStandbyMinsList();
    return;
  }
  if (id === 'clock') {
    paintClockThemeList();
    return;
  }
  if (id === 'bg') paintBgThemeList();
}

function settingsForward(opts = {}) {
  if (!isMonitorSettingsOpen()) return;
  if (settingsPage === 'bg' || settingsPage === 'standbyMins') return;
  const instant = Boolean(opts.instant);
  settingsTrail = true;
  if (settingsPage === 'home') {
    openDeviceNameEditor(true, { dir: 'forward', instant });
    return;
  }
  if (settingsPage === 'user') {
    const input = document.getElementById('deviceNameInput');
    setDeviceName(input?.value || '');
    openAlarmEditor(true, { dir: 'forward', instant });
    return;
  }
  if (settingsPage === 'alarm') {
    commitAlarmDraft({ quiet: true });
    openStationsPane(true, 'browse', { dir: 'forward', instant });
    return;
  }
  if (settingsPage === 'stations') {
    if (stationsPickMode === 'alarm') return;
    stationsPickMode = null;
    openStandbyEditor(true, { dir: 'forward', instant });
    return;
  }
  if (settingsPage === 'standby') {
    openClockPane(true, { dir: 'forward', instant });
    return;
  }
  if (settingsPage === 'clock') {
    openBgPane(true, { dir: 'forward', instant });
  }
}

function settingsBack(opts = {}) {
  if (!isMonitorSettingsOpen()) return;
  const instant = Boolean(opts.instant);

  /* Picker minuti: sempre torna a STANDBY */
  if (settingsPage === 'standbyMins') {
    standbyPickField = null;
    openStandbyEditor(true, { dir: 'back', instant });
    return;
  }

  /* Scelta stazione per sveglia: sempre torna a sveglia */
  if (settingsPage === 'stations' && stationsPickMode === 'alarm') {
    stationsPickMode = null;
    openAlarmEditor(true, { preserveDraft: true, dir: 'back', instant });
    return;
  }

  if (settingsTrail) {
    if (settingsPage === 'bg') {
      openClockPane(true, { dir: 'back', instant });
      return;
    }
    if (settingsPage === 'clock') {
      openStandbyEditor(true, { dir: 'back', instant });
      return;
    }
    if (settingsPage === 'standby') {
      openStationsPane(true, 'browse', { dir: 'back', instant });
      return;
    }
    if (settingsPage === 'stations') {
      stationsPickMode = null;
      openAlarmEditor(true, { dir: 'back', instant });
      return;
    }
    if (settingsPage === 'alarm') {
      openDeviceNameEditor(true, { dir: 'back', instant });
      return;
    }
    if (settingsPage === 'user') {
      settingsTrail = false;
      openDeviceNameEditor(false, { dir: 'back', instant });
      return;
    }
    settingsTrail = false;
    openMonitorSettings(false);
    return;
  }

  /* Apertura diretta da icona: indietro = menu iniziale */
  if (settingsPage === 'user') {
    openDeviceNameEditor(false, { dir: 'back', instant });
    return;
  }
  if (settingsPage === 'alarm') {
    openAlarmEditor(false, { dir: 'back', instant });
    return;
  }
  if (settingsPage === 'stations') {
    stationsPickMode = null;
    showSettingsPage('home', { dir: 'back', instant });
    return;
  }
  if (settingsPage === 'standby') {
    openStandbyEditor(false, { dir: 'back', instant });
    return;
  }
  if (settingsPage === 'clock') {
    openClockPane(false, { dir: 'back', instant });
    return;
  }
  if (settingsPage === 'bg') {
    openBgPane(false, { dir: 'back', instant });
    return;
  }
  if (settingsPage === 'radios') {
    openRadiosPane(false, { dir: 'back', instant });
    return;
  }
  if (settingsPage === 'home2') {
    openHome2Pane(false, { dir: 'down', instant });
    return;
  }
  openMonitorSettings(false);
}

function settingsEnter() {
  if (!isMonitorSettingsOpen()) return;
  if (isDeviceNameEditorOpen()) {
    const input = document.getElementById('deviceNameInput');
    setDeviceName(input?.value || '');
    settingsTrail = false;
    openDeviceNameEditor(false);
    return;
  }
  if (isStationsPaneOpen()) {
    const items = [...document.querySelectorAll('#settingsStationsGrid .monitor-station-item')];
    const btn = items[stationsFocus];
    const key = btn?.dataset?.key || '';
    const st = findStationByKey(key) || allCatalogStations()[stationsFocus];
    if (st) selectSettingsStation(st);
    return;
  }
  if (isStandbyMinsOpen()) {
    const items = [...document.querySelectorAll('#standbyMinsList .standby-min-item')];
    const sec = Number(items[standbyMinsFocus]?.dataset?.sec ?? items[standbyMinsFocus]?.dataset?.min);
    if (Number.isFinite(sec)) selectStandbyMin(sec);
    return;
  }
  if (isClockPaneOpen()) {
    const items = [...document.querySelectorAll('#clockThemeList .clock-theme-item')];
    const id = items[clockThemeFocus]?.dataset?.id;
    if (id) selectClockTheme(id);
    return;
  }
  if (isBgPaneOpen()) {
    const items = [...document.querySelectorAll('#bgThemeList .bg-theme-item')];
    const id = items[bgThemeFocus]?.dataset?.id;
    if (id !== undefined) selectBgTheme(id);
    return;
  }
  if (isAlarmEditorOpen()) {
    commitAlarmDraft({ quiet: true });
    settingsTrail = false;
    openAlarmEditor(false);
    return;
  }
  if (isStandbyEditorOpen()) {
    settingsTrail = false;
    openStandbyEditor(false);
    return;
  }
  const btn = settingsIconButtons()[settingsFocus];
  if (!btn) return;
  settingsTrail = false;
  if (btn.dataset.set === 'user') openDeviceNameEditor(true);
  else if (btn.dataset.set === 'alarm') openAlarmEditor(true);
  else if (btn.dataset.set === 'stations') openStationsPane(true, 'browse');
  else if (btn.dataset.set === 'standby') openStandbyEditor(true);
  else if (btn.dataset.set === 'clock') openClockPane(true);
  else if (btn.dataset.set === 'bg') openBgPane(true);
  else if (btn.dataset.set === 'radio') openRadiosPane(true);
  else if (btn.dataset.radio !== undefined) selectRadioSkin(btn.dataset.radio || '');
}

/* Swipe pagine interattivo: la prossima schermata segue il dito, poi scatta al rilascio */
(function bindSettingsSwipeNav() {
  const panel = document.getElementById('monitorSettings');
  if (!panel) return;
  const SNAP = 0.28;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastT = 0;
  let tracking = false;
  let axis = null;
  let dragging = false;
  let dir = null;
  let peekId = null;
  let width = 1;
  let fromEl = null;
  let toEl = null;
  let snapTimer = 0;

  function clearInline(el) {
    if (!el) return;
    el.style.transition = '';
    el.style.transform = '';
    el.classList.remove('is-drag-peek');
  }

  function stopDragVisual() {
    panel.classList.remove('is-finger-drag', 'is-finger-snap');
    clearInline(fromEl);
    clearInline(toEl);
    fromEl = null;
    toEl = null;
    peekId = null;
    dir = null;
    dragging = false;
  }

  function beginPeek(nextDir) {
    const nextId = settingsNeighbor(nextDir);
    if (!nextId) return false;
    /* Home → spettro: scorre via tutto il pannello impostazioni */
    if (nextId === '__close__') {
      fromEl = panel;
      toEl = null;
      peekId = '__close__';
      dir = nextDir;
      width = Math.max(1, panel.getBoundingClientRect().width || 1);
      panel.classList.add('is-finger-drag');
      window.clearTimeout(settingsSlideTimer);
      panel.style.transition = 'none';
      panel.style.transform = 'translate3d(0,0,0)';
      return true;
    }
    fromEl = settingsPageEl(settingsPage);
    toEl = settingsPageEl(nextId);
    if (!fromEl || !toEl) return false;
    peekId = nextId;
    dir = nextDir;
    width = Math.max(1, panel.getBoundingClientRect().width || 1);
    prepareSettingsPeek(nextId);
    panel.classList.add('is-finger-drag');
    window.clearTimeout(settingsSlideTimer);
    clearSettingsPageAnimClasses(toEl);
    toEl.classList.add('is-drag-peek');
    toEl.style.transform = nextDir === 'forward'
      ? `translate3d(${width}px,0,0)`
      : `translate3d(${-width}px,0,0)`;
    fromEl.style.transform = 'translate3d(0,0,0)';
    return true;
  }

  function applyDrag(dx) {
    if (!dir) return;
    if (peekId === '__close__') {
      const clamped = Math.max(0, Math.min(width, dx));
      panel.style.transform = `translate3d(${clamped}px,0,0)`;
      return;
    }
    if (!fromEl || !toEl) return;
    const clamped = dir === 'forward'
      ? Math.max(-width, Math.min(0, dx))
      : Math.max(0, Math.min(width, dx));
    fromEl.style.transform = `translate3d(${clamped}px,0,0)`;
    toEl.style.transform = dir === 'forward'
      ? `translate3d(${width + clamped}px,0,0)`
      : `translate3d(${-width + clamped}px,0,0)`;
  }

  function finishDrag(commit, dx, velocity) {
    if (!dragging || !dir) {
      stopDragVisual();
      panel.style.transition = '';
      panel.style.transform = '';
      settingsSwipeLock = false;
      return;
    }
    if (peekId === '__close__') {
      const progress = Math.abs(dx) / width;
      const fast = Math.abs(velocity) > 0.55;
      const shouldCommit = commit && (progress >= SNAP || (fast && progress > 0.08));
      panel.classList.remove('is-finger-drag');
      panel.classList.add('is-finger-snap');
      panel.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
      panel.style.transform = shouldCommit
        ? 'translate3d(100%,0,0)'
        : 'translate3d(0,0,0)';
      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(() => {
        panel.classList.remove('is-finger-snap');
        panel.style.transition = '';
        panel.style.transform = '';
        stopDragVisual();
        settingsSwipeLock = false;
        if (shouldCommit) openMonitorSettings(false);
      }, 290);
      return;
    }
    if (!fromEl || !toEl) {
      stopDragVisual();
      settingsSwipeLock = false;
      return;
    }
    const progress = Math.abs(dx) / width;
    const fast = Math.abs(velocity) > 0.55;
    const shouldCommit = commit && (progress >= SNAP || (fast && progress > 0.08));
    const goDir = dir;
    const goPeek = peekId;
    panel.classList.remove('is-finger-drag');
    panel.classList.add('is-finger-snap');

    if (shouldCommit) {
      fromEl.style.transform = goDir === 'forward'
        ? 'translate3d(-100%,0,0)'
        : 'translate3d(100%,0,0)';
      toEl.style.transform = 'translate3d(0,0,0)';
    } else {
      fromEl.style.transform = 'translate3d(0,0,0)';
      toEl.style.transform = goDir === 'forward'
        ? 'translate3d(100%,0,0)'
        : 'translate3d(-100%,0,0)';
    }

    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(() => {
      const commitNow = shouldCommit;
      stopDragVisual();
      settingsSwipeLock = false;
      if (!commitNow) {
        showSettingsPage(settingsPage, { instant: true });
        return;
      }
      if (goDir === 'forward') settingsForward({ instant: true });
      else settingsBack({ instant: true });
      /* sicurezza: allinea allo stato atteso */
      if (goPeek && settingsPage !== goPeek) {
        /* open* già aggiorna settingsPage */
      }
    }, 290);
  }

  function nudgeHomeIcons(dy) {
    if (Math.abs(dy) < 36) return;
    /* Home → swipe su: seconda home con RADIO */
    if (settingsPage === 'home' && dy < 0) {
      settingsTrail = false;
      openHome2Pane(true, { dir: 'up' });
      return;
    }
    /* Home2 → swipe giù: torna alle 6 icone */
    if (settingsPage === 'home2' && dy > 0) {
      settingsTrail = false;
      openHome2Pane(false, { dir: 'down' });
    }
  }

  function pickAxis(dx, dy) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return null;
    /* Preferisci orizzontale: su CLOCK/SFONDI le liste scrollano in verticale */
    if (Math.abs(dx) >= 10 && Math.abs(dx) >= Math.abs(dy) * 0.75) return 'x';
    if (Math.abs(dy) > Math.abs(dx) * 1.15) return 'y';
    return Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
  }

  function onSwipeMove(clientX, clientY, pointerId) {
    if (!tracking) return false;
    const dx = clientX - startX;
    const dy = clientY - startY;
    const now = performance.now();
    const dt = Math.max(1, now - lastT);
    const vx = (clientX - lastX) / dt;
    lastX = clientX;
    lastT = now;

    if (!axis) {
      axis = pickAxis(dx, dy);
      if (!axis) return false;
      if (axis !== 'x') return false;
    }
    if (axis !== 'x') return false;

    const wantDir = dx < 0 ? 'forward' : 'back';
    if (!dragging) {
      if (Math.abs(dx) < 10) return true;
      if (!beginPeek(wantDir)) {
        tracking = false;
        return false;
      }
      dragging = true;
      settingsSwipeLock = true;
      if (pointerId != null) {
        try { panel.setPointerCapture(pointerId); } catch (e) { /* ignore */ }
      }
    } else if (dir && wantDir !== dir && Math.abs(dx) < 12) {
      stopDragVisual();
      if (!beginPeek(wantDir)) {
        tracking = false;
        settingsSwipeLock = false;
        return false;
      }
      dragging = true;
      settingsSwipeLock = true;
    }
    applyDrag(dx);
    panel.dataset.vx = String(vx);
    return true;
  }

  panel.addEventListener('pointerdown', (event) => {
    /* Touch: gestito da touchstart/touchmove (passive:false) per il ritorno gesture */
    if (event.pointerType === 'touch') return;
    if (!isMonitorSettingsOpen()) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (panel.classList.contains('is-finger-snap')) return;
    if (event.target.closest?.('.alarm-wheel, #alarmWheels')) return;
    tracking = true;
    axis = null;
    dragging = false;
    settingsSwipeLock = false;
    startX = event.clientX;
    startY = event.clientY;
    lastX = event.clientX;
    lastT = performance.now();
  }, { passive: true });

  panel.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    onSwipeMove(event.clientX, event.clientY, event.pointerId);
  }, { passive: true });

  /* touchmove non-passive: blocca lo scroll lista quando il gesto è orizzontale (ritorno) */
  panel.addEventListener('touchstart', (event) => {
    if (!isMonitorSettingsOpen()) return;
    if (panel.classList.contains('is-finger-snap')) return;
    if (event.target.closest?.('.alarm-wheel, #alarmWheels')) return;
    const t = event.touches?.[0];
    if (!t) return;
    tracking = true;
    axis = null;
    dragging = false;
    settingsSwipeLock = false;
    startX = t.clientX;
    startY = t.clientY;
    lastX = t.clientX;
    lastT = performance.now();
  }, { passive: true });

  panel.addEventListener('touchmove', (event) => {
    if (!tracking) return;
    const t = event.touches?.[0];
    if (!t) return;
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (!axis) axis = pickAxis(dx, dy);
    if (axis === 'x' || (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 0.85)) {
      event.preventDefault();
      axis = 'x';
      onSwipeMove(t.clientX, t.clientY, null);
    }
  }, { passive: false });

  panel.addEventListener('touchend', (event) => {
    if (!tracking) return;
    const t = event.changedTouches?.[0];
    const dx = t ? t.clientX - startX : 0;
    const velocity = Number(panel.dataset.vx || 0);
    delete panel.dataset.vx;
    const wasDragging = dragging;
    tracking = false;
    if (!wasDragging) {
      if (axis === 'y') nudgeHomeIcons((t ? t.clientY - startY : 0));
      settingsSwipeLock = false;
      axis = null;
      return;
    }
    finishDrag(true, dx, velocity);
    axis = null;
  }, { passive: true });

  panel.addEventListener('touchcancel', () => {
    if (!tracking && !dragging) return;
    tracking = false;
    if (dragging) finishDrag(false, 0, 0);
    else {
      stopDragVisual();
      settingsSwipeLock = false;
    }
    axis = null;
  }, { passive: true });

  const endSwipe = (event) => {
    if (!tracking) return;
    tracking = false;
    const dx = event.clientX - startX;
    const velocity = Number(panel.dataset.vx || 0);
    delete panel.dataset.vx;
    if (!dragging) {
      if (axis === 'y') nudgeHomeIcons(event.clientY - startY);
      settingsSwipeLock = false;
      axis = null;
      return;
    }
    finishDrag(true, dx, velocity);
    axis = null;
  };

  panel.addEventListener('pointerup', endSwipe, { passive: true });
  panel.addEventListener('pointercancel', () => {
    if (!tracking && !dragging) return;
    tracking = false;
    if (dragging) finishDrag(false, 0, 0);
    else {
      stopDragVisual();
      settingsSwipeLock = false;
    }
    axis = null;
  }, { passive: true });
})();

function remoteDeviceId() {
  try {
    let id = localStorage.getItem(REMOTE_ID_KEY);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || `mt-${Date.now().toString(36)}`;
      localStorage.setItem(REMOTE_ID_KEY, id);
    }
    return id;
  } catch (e) {
    return `mt-${Date.now().toString(36)}`;
  }
}

function remoteSnapshot() {
  const theme = BG_THEMES.find((t) => t.id === bgThemeId) || BG_THEMES[0];
  return {
    power: Boolean(state.power || pendingDisplayWake),
    stopped: state.stopped,
    band: state.band,
    fm: state.fm,
    am: state.am,
    volume: state.volume,
    stereo: state.stereo,
    auto: state.auto,
    viewMode: state.viewMode,
    casting: Boolean(castUi.casting),
    castPending: Boolean(castUi.pending),
    castArming: Boolean(castUi.arming || castUi.pickerOpen),
    castPickerOpen: Boolean(castUi.pickerOpen || isCastPickerOpen()),
    castFocus: castUi.focus,
    castCount: castUi.routes.length,
    /* Lista casse/gruppi per popup telecomando (click diretto) */
    castRoutes: (castUi.routes || []).slice(0, 40).map((r) => ({
      id: String(r?.id || ''),
      name: String(r?.name || 'Cast'),
      description: String(r?.description || ''),
      selected: Boolean(r?.selected),
      connecting: Boolean(r?.connecting),
      group: Boolean(r?.group)
    })),
    settingsOpen: isMonitorSettingsOpen(),
    settingsEditor: isDeviceNameEditorOpen() || isAlarmEditorOpen() || isStationsPaneOpen(),
    settingsFocus,
    panelZoom: panelZoomMode || '',
    displayWakePending: Boolean(pendingDisplayWake),
    alarmRinging: Boolean(alarmRinging),
    station: state.locked?.name || '',
    bgTheme: theme?.id || '',
    skin: theme?.skin || '',
    standby: Boolean(idleStandbyActive || pendingDisplayWake),
    clockTheme: clockThemeId || 'casio'
  };
}

function publishRemoteState() {
  if (!remoteWs || remoteWs.readyState !== WebSocket.OPEN) return;
  try {
    remoteWs.send(JSON.stringify({ type: 'state', state: remoteSnapshot() }));
  } catch (e) { /* ignore */ }
}

/* Throttle (non debounce): durante tuning continuo il telecomando riceve la frequenza che scorre */
function scheduleRemoteState() {
  if (remoteStateTimer) return;
  remoteStateTimer = window.setTimeout(() => {
    remoteStateTimer = 0;
    publishRemoteState();
  }, 80);
}

let screenWakeLock = null;
let screenWakeGen = 0;
let lastRemoteWakeNotify = 0;
let remoteLinked = false;
let remoteGuardActive = false;
let pendingDisplayWake = false;
let wakeNagTimer = 0;

function idleDimMs() {
  return Math.max(30, Number(activeIdleProfile().dimSec) || 120) * 1000;
}

function idleStandbyAfterDimMs() {
  return Math.max(30, Number(activeIdleProfile().standbySec) || 300) * 1000;
}

let idleDimTimer = 0;
let idleStandbyTimer = 0;
let idleDimmed = false;
let idleDimDeadline = 0;
let idleStandbyDeadline = 0;
let idleCountdownTimer = 0;
/* Standby idle: SOLO schermo (mai setPower off). Radio resta accesa. */
let idleStandbyActive = false;
let idleStandbyWasPlaying = false;
/* TV: a schermo spento il WebView pausa <video> → audio passa allo stream radio */
let idleStandbyVideoHandoff = false;
let idleStandbyAudioKeepTimer = 0;

function stopIdleStandbyAudioKeepAlive() {
  window.clearTimeout(idleStandbyAudioKeepTimer);
  idleStandbyAudioKeepTimer = 0;
}

/* Android: a schermo off l’AudioContext può sospendersi — riprendi finché soft-standby */
function startIdleStandbyAudioKeepAlive() {
  stopIdleStandbyAudioKeepAlive();
  const tick = () => {
    if (!idleStandbyActive || !state.power || state.stopped || castUi.casting) {
      stopIdleStandbyAudioKeepAlive();
      return;
    }
    try {
      if (engine.ctx?.state === 'suspended') engine.ctx.resume().catch(() => {});
      const url = engine.currentUrl || state.locked?.url || nearest().station?.url;
      if (url) {
        engine.play(url);
        engine.setMix(1, 0);
        engine.setVolume(state.volume / 10);
      }
      armMediaPlaybackSession();
      updateMediaSession();
    } catch (e) { /* ignore */ }
    idleStandbyAudioKeepTimer = window.setTimeout(tick, 2500);
  };
  idleStandbyAudioKeepTimer = window.setTimeout(tick, 350);
}

function handoffTvAudioForStandby() {
  if (!isTvMode() || !state.power || state.stopped || castUi.casting) return;
  const station = state.locked || nearest().station;
  const url = station?.url;
  if (!url) return;
  idleStandbyVideoHandoff = true;
  try { stationVideo?.pause(); } catch (e) { /* ignore */ }
  if (videoAudioLatched) {
    try {
      stationVideo.muted = true;
      stationVideo.volume = 0;
    } catch (e) { /* ignore */ }
    videoAudioLatched = false;
  }
  muteTabletAudio(false);
  try {
    engine.start();
    if (engine.ctx?.state === 'suspended') engine.ctx.resume().catch(() => {});
    engine.play(url);
    engine.setMix(1, 0);
    engine.setVolume(state.volume / 10);
    armMediaPlaybackSession();
    updateMediaSession();
  } catch (e) { /* ignore */ }
  startIdleStandbyAudioKeepAlive();
}

function restoreTvAudioAfterStandby() {
  stopIdleStandbyAudioKeepAlive();
  if (!idleStandbyVideoHandoff) return;
  idleStandbyVideoHandoff = false;
  if (!isTvMode() || !state.power || state.stopped || castUi.casting) return;
  try { engine.silence(); } catch (e) { /* ignore */ }
  const url = stationVideo?.dataset?.url || stationVideoUrl(state.locked) || holdVideoUrl;
  if (!url) return;
  playStationVideo(url);
}

function formatIdleCountdown(ms) {
  const total = Math.max(0, Math.ceil(Number(ms) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function paintIdleCountdowns() {
  const dimOnEl = document.getElementById('idleDimCountdown');
  const stbyOnEl = document.getElementById('idleStandbyCountdown');
  const dimOffEl = document.getElementById('idleDimOffCountdown');
  const stbyOffEl = document.getElementById('idleStandbyOffCountdown');
  const dimEl = state.power ? dimOnEl : dimOffEl;
  const stbyEl = state.power ? stbyOnEl : stbyOffEl;
  const otherDim = state.power ? dimOffEl : dimOnEl;
  const otherStby = state.power ? stbyOffEl : stbyOnEl;
  const clearEl = (el) => {
    if (!el) return;
    el.textContent = '—';
    el.classList.remove('is-active');
  };
  clearEl(otherDim);
  clearEl(otherStby);
  document.querySelectorAll('.standby-mode-block').forEach((el) => {
    const mode = el.getAttribute('data-idle-mode');
    el.classList.toggle('is-active', state.power ? mode === 'on' : mode === 'off');
  });
  if (!dimEl && !stbyEl) return;
  const now = Date.now();
  if (pendingDisplayWake || alarmRinging) {
    clearEl(dimEl);
    clearEl(stbyEl);
    return;
  }
  if (idleStandbyActive) {
    if (dimEl) {
      dimEl.textContent = 'ON';
      dimEl.classList.add('is-active');
    }
    if (stbyEl) {
      stbyEl.textContent = 'STBY';
      stbyEl.classList.add('is-active');
    }
    return;
  }
  if (idleDimmed) {
    if (dimEl) {
      dimEl.textContent = 'ON';
      dimEl.classList.add('is-active');
    }
    if (stbyEl) {
      const left = idleStandbyDeadline ? idleStandbyDeadline - now : 0;
      stbyEl.textContent = formatIdleCountdown(left);
      stbyEl.classList.toggle('is-active', left > 0);
    }
    return;
  }
  if (dimEl) {
    const left = idleDimDeadline ? idleDimDeadline - now : 0;
    dimEl.textContent = idleDimDeadline ? formatIdleCountdown(left) : '—';
    dimEl.classList.toggle('is-active', Boolean(idleDimDeadline) && left > 0);
  }
  if (stbyEl) {
    stbyEl.textContent = '—';
    stbyEl.classList.remove('is-active');
  }
}

function startIdleCountdownTick() {
  if (idleCountdownTimer) return;
  idleCountdownTimer = window.setInterval(paintIdleCountdowns, 1000);
  paintIdleCountdowns();
}

function clearIdlePowerTimers() {
  window.clearTimeout(idleDimTimer);
  window.clearTimeout(idleStandbyTimer);
  idleDimTimer = 0;
  idleStandbyTimer = 0;
  idleDimDeadline = 0;
  idleStandbyDeadline = 0;
}

function clearIdleDimUi() {
  idleDimmed = false;
  radio?.classList.remove('is-idle-dim', 'is-idle-dim-sys');
  try { window.MyTunerNative?.restoreBrightness?.(); } catch (e) { /* ignore */ }
}

function syncNativeKeepAwake() {
  /* Soft-standby: spegne schermo; keepCpu solo se radio ancora in play */
  if (idleStandbyActive && !pendingDisplayWake) {
    const keepCpu = Boolean(state.power && !state.stopped);
    try { window.MyTunerNative?.allowStandby?.({ keepCpu }); } catch (e) { /* ignore */ }
    return;
  }
  /* Tieni schermo acceso durante dim/timer (anche a radio spenta), finché non è standby */
  const hold = Boolean(!idleStandbyActive && !pendingDisplayWake);
  try { window.MyTunerNative?.keepAwake?.(hold); } catch (e) { /* ignore */ }
}

function leaveIdleStandby(opts = {}) {
  if (!idleStandbyActive) return;
  idleStandbyActive = false;
  stopIdleStandbyAudioKeepAlive();
  radio?.classList.remove('is-idle-standby');
  try { window.MyTunerNative?.restoreBrightness?.(); } catch (e) { /* ignore */ }
  syncNativeKeepAwake();
  stopRemoteGuard();
  idleStandbyWasPlaying = false;
  restoreTvAudioAfterStandby();
  if (remoteLinked) syncRemoteWakeLock();
  paintIdleCountdowns();
  scheduleRemoteState();
}

function enterIdleStandby() {
  /* Standby SCHERMO: spegne il display. Radio ON resta in play (niente setPower). */
  if (alarmRinging || idleStandbyActive || pendingDisplayWake) return;
  clearIdlePowerTimers();
  /* NON restoreBrightness qui: era il bug che “riaccendeva” lo schermo */
  idleDimmed = false;
  radio?.classList.remove('is-idle-dim', 'is-idle-dim-sys');
  stopWakeNag();
  idleStandbyWasPlaying = Boolean(state.power && !state.stopped);
  idleStandbyActive = true;
  radio?.classList.add('is-idle-standby');
  if (state.power && !state.stopped) {
    /* TV: audio sul <video> → handoff allo stream radio a schermo off */
    handoffTvAudioForStandby();
    if (!idleStandbyVideoHandoff && !castUi.casting) {
      startIdleStandbyAudioKeepAlive();
    }
  }
  releaseScreenAwake();
  /* Nero + togli keep-on (nativo). keepCpu solo con audio attivo. */
  try { window.MyTunerNative?.setBrightness?.(0.01); } catch (e) { /* ignore */ }
  const keepCpu = Boolean(state.power && !state.stopped);
  try { window.MyTunerNative?.allowStandby?.({ keepCpu }); } catch (e) { /* ignore */ }
  syncNativeKeepAwake();
  if (remoteLinked) startRemoteGuard();
  paintIdleCountdowns();
  scheduleRemoteState();
}

function enterIdleDim() {
  if (document.hidden || idleStandbyActive || pendingDisplayWake || alarmRinging) return;
  idleDimmed = true;
  idleDimDeadline = 0;
  radio?.classList.add('is-idle-dim');
  /* APK con setBrightness nativo: luminosità di sistema. Altrimenti CSS fallback. */
  const canSysDim = Boolean(window.Capacitor?.Plugins?.RemoteWake?.setBrightness);
  if (canSysDim) {
    radio?.classList.add('is-idle-dim-sys');
    try { window.MyTunerNative?.setBrightness?.(0.06); } catch (e) { /* ignore */ }
  }
  /* Riafferma keep-screen-on: altrimenti il timeout OS spegne prima dei minuti impostati */
  syncNativeKeepAwake();
  window.clearTimeout(idleStandbyTimer);
  const after = idleStandbyAfterDimMs();
  idleStandbyDeadline = Date.now() + after;
  idleStandbyTimer = window.setTimeout(enterIdleStandby, after);
  paintIdleCountdowns();
}

function bumpIdleActivity() {
  clearIdlePowerTimers();
  if (idleStandbyActive && document.visibilityState === 'visible') {
    leaveIdleStandby();
  }
  if (idleDimmed) clearIdleDimUi();
  if (document.hidden || pendingDisplayWake || idleStandbyActive) {
    paintIdleCountdowns();
    return;
  }
  if (alarmRinging) {
    paintIdleCountdowns();
    return;
  }
  syncNativeKeepAwake();
  const wait = idleDimMs();
  idleDimDeadline = Date.now() + wait;
  idleStandbyDeadline = 0;
  idleDimTimer = window.setTimeout(enterIdleDim, wait);
  startIdleCountdownTick();
  paintIdleCountdowns();
}

function shouldHoldRemoteWake() {
  /* Wake Lock web: telecomando + radio; in idle-dim resta acceso (solo più scuro) */
  return Boolean(remoteLinked && state.power && !document.hidden && !idleStandbyActive);
}

function postToServiceWorker(msg) {
  const send = (sw) => {
    try { sw.postMessage(msg); } catch (e) { /* ignore */ }
  };
  if (navigator.serviceWorker?.controller) {
    send(navigator.serviceWorker.controller);
    return;
  }
  if (!navigator.serviceWorker?.ready) return;
  navigator.serviceWorker.ready.then((reg) => {
    if (reg.active) send(reg.active);
  }).catch(() => {});
}

function clearRemoteUiChrome() {
  try { navigator.clearAppBadge?.(); } catch (e) { /* ignore */ }
  postToServiceWorker({ type: 'remote-clear-notes' });
}

function startRemoteGuard() {
  /*
    Standby: NON chiudere il WebSocket pagina (è la presenza Connect).
    Il SW apre solo un ruolo "guard" di backup + notifiche, senza rubare il socket.
  */
  if (!remoteLinked) return;
  if (state.power && !pendingDisplayWake && !idleStandbyActive && document.visibilityState === 'visible') return;
  remoteGuardActive = true;
  askRemoteNotifyPermission(true);
  ensureRemotePushSubscription();
  /* Tieni / ripristina bridge pagina */
  if (!remoteWs || remoteWs.readyState === WebSocket.CLOSED || remoteWs.readyState === WebSocket.CLOSING) {
    connectRemoteBridge();
  } else if (remoteWs.readyState === WebSocket.OPEN) {
    try {
      remoteWs.send(JSON.stringify({
        type: 'state',
        state: {
          ...remoteSnapshot(),
          power: Boolean(state.power),
          standby: Boolean(idleStandbyActive || pendingDisplayWake || !state.power),
          displayWakePending: Boolean(pendingDisplayWake)
        }
      }));
      remoteWs.send(JSON.stringify({
        type: 'ping',
        name: guessDeviceName(),
        kind: guessDeviceKind()
      }));
    } catch (e) { /* ignore */ }
  }
  if (!('serviceWorker' in navigator)) return;
  const payload = {
    type: 'remote-guard-start',
    id: remoteDeviceId(),
    name: guessDeviceName(),
    kind: guessDeviceKind(),
    origin: HUB_ORIGIN
  };
  const go = () => postToServiceWorker(payload);
  if (navigator.serviceWorker.controller) go();
  else navigator.serviceWorker.ready.then(() => go()).catch(() => {});
}

function requestWakeFromStandby(action, value) {
  /* Notifica + focus solo alla riaccensione (unico modo di riaccendere il display dal web) */
  postToServiceWorker({
    type: 'remote-wake-now',
    action: action || 'power',
    value
  });
}

function stopWakeNag() {
  window.clearInterval(wakeNagTimer);
  wakeNagTimer = 0;
}

function startWakeNag() {
  /* Disabilitato: causava loop di notifiche. Una sola push dal hub basta. */
  stopWakeNag();
}

function completeRemotePowerOn(value) {
  /* Solo con display davvero usabile — altrimenti restiamo in pending + presenza SW */
  if (document.visibilityState !== 'visible') {
    requestDisplayWakeAndPower(value);
    return;
  }
  pendingDisplayWake = false;
  idleStandbyActive = false;
  stopWakeNag();
  remoteLinked = true;
  stopRemoteGuard();
  clearRemoteUiChrome();
  try { window.focus(); } catch (e) { /* ignore */ }
  try { window.MyTunerNative?.wakeDisplay?.({ reason: 'complete' }); } catch (e) { /* ignore */ }
  try { window.MyTunerNative?.restoreBrightness?.(); } catch (e) { /* ignore */ }
  try { window.MyTunerNative?.keepAwake?.(true); } catch (e) { /* ignore */ }
  engine.start();
  bumpIdleActivity();
  if (!state.power) setPower(true);
  else {
    leaveIosBackgroundAudio();
    if (engine.ctx?.state === 'suspended') engine.ctx.resume().catch(() => {});
    if (!state.stopped) {
      try { settleTune(); } catch (e) { /* ignore */ }
    }
  }
  syncRemoteWakeLock();
  scheduleRemoteState();
}

function requestDisplayWakeAndPower(value) {
  /*
    Nativo Android (Capacitor): tenta wake schermo reale.
    Web/PWA: non può riaccendere display spento → pending fino a visibile.
  */
  pendingDisplayWake = true;
  remoteLinked = true;
  askRemoteNotifyPermission(true);
  const native = window.MyTunerNative;
  if (native?.isNative?.()) {
    native.wakeDisplay({ reason: 'power' }).then((res) => {
      if (res?.ok && document.visibilityState === 'visible') {
        completeRemotePowerOn(value || 'native');
      }
    }).catch(() => {});
    /* keepAwake solo quando davvero accesa — non bloccare lo standby in pending */
  } else {
    requestWakeFromStandby('power', value);
    startWakeNag();
  }
  startRemoteGuard();
  scheduleRemoteState();
}

function stopRemoteGuard() {
  remoteGuardActive = false;
  postToServiceWorker({ type: 'remote-guard-stop' });
  clearRemoteUiChrome();
  if (!remoteWs || remoteWs.readyState === WebSocket.CLOSED || remoteWs.readyState === WebSocket.CLOSING) {
    connectRemoteBridge();
  }
}

async function ensureScreenAwakeHeld() {
  if (!shouldHoldRemoteWake()) {
    releaseScreenAwake();
    return;
  }
  if (!('wakeLock' in navigator)) return;
  if (screenWakeLock) return;
  const gen = ++screenWakeGen;
  try {
    const lock = await navigator.wakeLock.request('screen');
    if (gen !== screenWakeGen || !shouldHoldRemoteWake()) {
      try { await lock.release(); } catch (e) { /* ignore */ }
      return;
    }
    screenWakeLock = lock;
    screenWakeLock.addEventListener('release', () => {
      if (screenWakeLock === lock) screenWakeLock = null;
      /* OS può rilasciare il lock: se ancora collegati+accesi, riprendi appena visibili */
      if (shouldHoldRemoteWake() && document.visibilityState === 'visible') {
        ensureScreenAwakeHeld();
      }
    });
  } catch (e) { /* tab nascosta / policy OS */ }
}

function releaseScreenAwake() {
  /* Invalida richieste async in volo (evita re-lock dopo power off / unlink) */
  screenWakeGen += 1;
  const lock = screenWakeLock;
  screenWakeLock = null;
  if (lock) {
    try { lock.release(); } catch (e) { /* ignore */ }
  }
}

function syncRemoteWakeLock() {
  if (shouldHoldRemoteWake()) ensureScreenAwakeHeld();
  else releaseScreenAwake();
}

function showRemoteNotification(body, tag) {
  /* Wake/telecomando: niente banner. Solo unlink resta (silenzioso). */
  const t = String(tag || '');
  if (t.includes('wake') || t.includes('standby')) {
    clearRemoteUiChrome();
    return;
  }
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  try {
    const n = new Notification('\u200b', {
      body: body || '\u200b',
      tag: tag || 'mytuner-remote',
      icon: '/icons/icon-192.png',
      badge: '/icons/favicon-32.png',
      renotify: false,
      silent: true
    });
    window.setTimeout(() => {
      try { n.close(); } catch (e) { /* ignore */ }
    }, 200);
    n.onclick = () => {
      try { window.focus(); } catch (e) { /* ignore */ }
      try { n.close(); } catch (e) { /* ignore */ }
      clearRemoteUiChrome();
    };
  } catch (e) { /* ignore */ }
}

function pingRemoteWakeNotification() {
  /* Disabilitato: niente heads-up; FCM/nativo + client focus bastano */
  return;
}

function askRemoteNotifyPermission(forcePrompt) {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'granted') return;
  if (Notification.permission === 'denied') return;
  if (Notification.permission !== 'default' && !forcePrompt) return;
  try { Notification.requestPermission().catch(() => {}); } catch (e) { /* ignore */ }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

let remotePushBusy = false;
function sendFcmTokenToHub(token) {
  if (!token) return;
  const payload = { type: 'fcm_token', token: String(token).slice(0, 4096) };
  if (remoteWs?.readyState === WebSocket.OPEN) {
    try { remoteWs.send(JSON.stringify(payload)); } catch (e) { /* ignore */ }
  } else {
    try { sessionStorage.setItem('mytuner-fcm-token', JSON.stringify(payload)); } catch (e) { /* ignore */ }
  }
}

async function ensureRemotePushSubscription() {
  if (remotePushBusy) return;
  remotePushBusy = true;
  try {
    /* APK Android: token FCM nativo (sveglia schermo senza tap) */
    if (window.MyTunerNative?.isNative?.()) {
      await window.MyTunerNative.registerPushForRemote(sendFcmTokenToHub);
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch (e) { /* ignore */ }
    }
    if (Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      let publicKey = '';
      try {
        const res = await fetch(hubUrl('/api/remote/vapid'), { cache: 'no-store' });
        const data = await res.json();
        publicKey = String(data?.publicKey || '');
      } catch (e) { /* ignore */ }
      if (!publicKey) return;
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    }
    const json = sub.toJSON();
    if (!json?.endpoint || !json?.keys?.p256dh || !json?.keys?.auth) return;
    const payload = {
      type: 'push_sub',
      subscription: {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth }
      }
    };
    if (remoteWs?.readyState === WebSocket.OPEN) {
      try { remoteWs.send(JSON.stringify(payload)); } catch (e) { /* ignore */ }
    } else {
      try { sessionStorage.setItem('mytuner-push-sub', JSON.stringify(payload)); } catch (e) { /* ignore */ }
    }
  } catch (e) { /* push non disponibile su questo device */ }
  finally {
    remotePushBusy = false;
  }
}

window.addEventListener('mytuner-native-cmd', (event) => {
  const detail = event?.detail;
  if (!detail || detail.type !== 'remote-cmd') return;
  const act = String(detail.action || '');
  remoteLinked = true;
  try { window.MyTunerNative?.wakeDisplay?.({ reason: 'fcm' }); } catch (e) { /* ignore */ }
  /* wake = solo schermo; power = accendi radio */
  if (act === 'wake') {
    wakeFromRemote('wake');
    scheduleRemoteState();
    return;
  }
  if (act === 'power') {
    if (document.visibilityState === 'visible') completeRemotePowerOn(detail.value || 'native-fcm');
    else requestDisplayWakeAndPower(detail.value || 'native-fcm');
    return;
  }
  applyRemoteCommand(act, detail.value);
});

function wakeFromRemote(reason) {
  remoteLinked = true;
  if (isMonitorSettingsOpen()) paintSettingsFocus();
  askRemoteNotifyPermission();
  ensureRemotePushSubscription();
  /* Niente spam notifiche locali: la sveglia vera è FCM (APK) o una push hub */
  syncRemoteWakeLock();
  try {
    window.focus();
    document.documentElement.classList.add('is-remote-nudge');
    window.setTimeout(() => document.documentElement.classList.remove('is-remote-nudge'), 350);
  } catch (e) { /* ignore */ }
  if (!remoteWs || remoteWs.readyState !== WebSocket.OPEN) {
    connectRemoteBridge();
  }
}

function unlinkFromRemote(reason) {
  remoteLinked = false;
  stopRemoteGuard();
  releaseScreenAwake();
  if (!castUi.casting && !castUi.pending) {
    muteTabletAudio(false);
    if (state.power && !state.stopped) settleTune();
  }
  if (isMonitorSettingsOpen()) paintSettingsFocus();
  showRemoteNotification('Telecomando disconnesso', 'mytuner-remote-unlink');
  flash('REMOTE OFF', true);
  scheduleRemoteState();
}

function onTabletResume() {
  if (document.visibilityState !== 'visible') return;
  /* Standby schermo: riprendi senza spegnere/riaccendere */
  if (idleStandbyActive) {
    leaveIdleStandby();
    bumpIdleActivity();
    return;
  }
  if (pendingDisplayWake) {
    completeRemotePowerOn('visible');
    return;
  }
  if (shouldHoldRemoteWake()) ensureScreenAwakeHeld();
  if (state.power) {
    clearRemoteUiChrome();
    leaveIosBackgroundAudio();
    if (engine.ctx?.state === 'suspended') engine.ctx.resume().catch(() => {});
  }
  /* Standby: tieni bridge pagina + ping SW backup */
  if (remoteGuardActive && !state.power) {
    postToServiceWorker({ type: 'remote-guard-ping' });
  }
  if (remoteGuardActive && state.power && !idleStandbyActive) stopRemoteGuard();
  if (!remoteWs || remoteWs.readyState === WebSocket.CLOSED || remoteWs.readyState === WebSocket.CLOSING) {
    connectRemoteBridge();
  } else if (remoteWs.readyState === WebSocket.OPEN) {
    try {
      remoteWs.send(JSON.stringify({
        type: 'hello',
        name: guessDeviceName(),
        kind: guessDeviceKind()
      }));
    } catch (e) { /* ignore */ }
    publishRemoteState();
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'remote-guard-ready') {
      /* Backup SW pronto: la pagina resta primary, non chiudere il bridge */
      remoteGuardActive = true;
      if (!remoteWs || remoteWs.readyState !== WebSocket.OPEN) connectRemoteBridge();
      return;
    }
    if (data.type !== 'remote-cmd') return;
    const act = String(data.action || '');
    remoteLinked = true;
    if (act === 'exit') {
      applyRemoteCommand(act, data.value);
      return;
    }
    if (act === 'wake') {
      try { window.MyTunerNative?.wakeDisplay?.({ reason: 'sw-wake' }); } catch (e) { /* ignore */ }
      wakeFromRemote('wake');
      scheduleRemoteState();
      return;
    }
    if (act === 'power') {
      if (document.visibilityState !== 'visible') {
        requestDisplayWakeAndPower(data.value);
        return;
      }
      completeRemotePowerOn(data.value);
      return;
    }
    /* Qualsiasi altro tasto: sveglia schermo e applica comunque il comando */
    try { window.MyTunerNative?.wakeDisplay?.({ reason: act || 'remote' }); } catch (e) { /* ignore */ }
    if (remoteGuardActive && state.power) stopRemoteGuard();
    applyRemoteCommand(act, data.value);
  });
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    onTabletResume();
    syncNativeKeepAwake();
    bumpIdleActivity();
    return;
  }
  /* App in uscita (long-press Power): niente standby schermo, ma guard sì (per riaprirla) */
  const exiting = performance.now() < remoteExitGuardUntil;
  /* Schermo nascosto: passa a standby-schermo (on/off). Non ripristinare luminosità
     se siamo già in standby — altrimenti lo schermo si riaccende. */
  if (exiting) {
    clearIdlePowerTimers();
  } else if (!idleStandbyActive && !pendingDisplayWake && !alarmRinging) {
    enterIdleStandby();
  } else {
    clearIdlePowerTimers();
    if (!idleStandbyActive) clearIdleDimUi();
  }
  /* Schermo spento: tieni presenza remote (anche con radio ancora ON in idle-standby) */
  if (remoteLinked && (!state.power || pendingDisplayWake || idleStandbyActive)) {
    startRemoteGuard();
    return;
  }
  if (shouldHoldRemoteWake()) ensureScreenAwakeHeld();
});
window.addEventListener('pageshow', onTabletResume);
window.addEventListener('online', onNetworkOnline);
window.addEventListener('offline', onNetworkOffline);
paintOnlineStatus();

/* Idle dim/standby: qualsiasi interazione locale resetta i timer */
window.addEventListener('pointerdown', bumpIdleActivity, { passive: true, capture: true });
window.addEventListener('keydown', bumpIdleActivity, { capture: true });
window.addEventListener('wheel', bumpIdleActivity, { passive: true, capture: true });

function applyRemoteCommand(action, value) {
  const act = String(action || '');
  bumpIdleActivity();
  if (act === 'unlink' || act === 'disconnect') {
    unlinkFromRemote(value);
    return;
  }
  if (act === 'link') {
    remoteLinked = true;
    if (isMonitorSettingsOpen()) paintSettingsFocus();
    scheduleRemoteState();
    return;
  }
  if (act === 'wake') {
    try { window.MyTunerNative?.wakeDisplay?.({ reason: 'wake' }); } catch (e) { /* ignore */ }
    wakeFromRemote(act);
    scheduleRemoteState();
    return;
  }
  /* Long-press Power telecomando: saluto LED + chiude l’app (Android) */
  if (act === 'exit') {
    beginRemoteExit();
    return;
  }
  /* Power con value on/off esplicito (telecomando) oppure toggle legacy */
  if (act === 'power') {
    const v = String(value ?? '').toLowerCase();
    const forceOff = v === 'off' || v === '0' || v === 'false';
    const forceOn = v === 'on' || v === '1' || v === 'true';
    /* Dopo exit: ignora riaccensioni fantasma dal rilascio dito / FCM in coda */
    if (!forceOff && performance.now() < remoteExitGuardUntil) return;
    const inStandby = Boolean(pendingDisplayWake || idleStandbyActive);
    const turningOff = forceOff || (!forceOn && Boolean(state.power) && !inStandby);
    if (turningOff) {
      /* Spegnimento esplicito: solo radio OFF, schermo normale (niente nero/standby).
         Poi valgono i timer “Radio spenta” (schermo scuro / standby). */
      pendingDisplayWake = false;
      if (idleStandbyActive) leaveIdleStandby();
      idleStandbyActive = false;
      idleStandbyWasPlaying = false;
      stopWakeNag();
      remoteLinked = true;
      setPower(false);
      releaseScreenAwake();
      try { window.MyTunerNative?.restoreBrightness?.(); } catch (e) { /* ignore */ }
      bumpIdleActivity();
      syncNativeKeepAwake();
      startRemoteGuard();
      scheduleRemoteState();
      return;
    }
    /* Idle standby schermo: sveglia display, radio già ON */
    if (idleStandbyActive && state.power) {
      try { window.MyTunerNative?.wakeDisplay?.({ reason: 'power' }); } catch (e) { /* ignore */ }
      leaveIdleStandby();
      bumpIdleActivity();
      scheduleRemoteState();
      return;
    }
    if (document.hidden || pendingDisplayWake) {
      if (document.visibilityState !== 'visible') {
        requestDisplayWakeAndPower(value || 'on');
        return;
      }
      completeRemotePowerOn(value || 'on');
      return;
    }
    completeRemotePowerOn(value || 'on');
    return;
  }
  /* Qualsiasi tasto: togli standby / riaccendi schermo (senza forzare power) */
  if (document.hidden || pendingDisplayWake) {
    try { window.MyTunerNative?.wakeDisplay?.({ reason: act || 'remote' }); } catch (e) { /* ignore */ }
  }
  wakeFromRemote(act);
  engine.start();
  remoteFlashZoomDock(act, value);
  switch (act) {
    case 'zoom_left':
      togglePanelZoom('dial');
      break;
    case 'zoom_right':
      togglePanelZoom(state.viewMode === 'video' ? 'tv' : 'spec');
      break;
    case 'pause':
      /* Sveglia in corso: il centro del telecomando la tacita */
      if (alarmRinging) {
        dismissAlarm();
        break;
      }
      /* In lista Cast: enter sulla cassa selezionata */
      if (isCastPickerOpen()) {
        castPickerEnter();
        break;
      }
      /* Solo play/pausa a radio già accesa; se spenta basta lo wake schermo */
      if (state.power) toggleStop();
      break;
    case 'vol_up':
      state.volume = clamp(state.volume + (Number(value) > 0 ? Number(value) : 0.1), 0, 10);
      paintVolume({ animate: true });
      if (videoAudioLatched) setStationVideoGain();
      else if (!castUi.casting && !iosBgHandoff) engine.setVolume(state.volume / 10);
      if (castUi.casting) setCastVolume(state.volume / 10);
      persistFace();
      break;
    case 'vol_down':
      state.volume = clamp(state.volume - (Number(value) > 0 ? Number(value) : 0.1), 0, 10);
      paintVolume({ animate: true });
      if (videoAudioLatched) setStationVideoGain();
      else if (!castUi.casting && !iosBgHandoff) engine.setVolume(state.volume / 10);
      if (castUi.casting) setCastVolume(state.volume / 10);
      persistFace();
      break;
    case 'vol_set': {
      /* Drag continuo: la rondella segue senza scatti */
      state.volume = clamp(Number(value), 0, 10);
      paintVolume({ animate: false });
      if (videoAudioLatched) setStationVideoGain();
      else if (!castUi.casting && !iosBgHandoff) engine.setVolume(state.volume / 10);
      if (castUi.casting) setCastVolume(state.volume / 10);
      window.clearTimeout(volPersistTimer);
      volPersistTimer = window.setTimeout(() => persistFace(), 220);
      break;
    }
    case 'settings': {
      if (isMonitorSettingsOpen()) openMonitorSettings(false);
      else openMonitorSettings(true);
      break;
    }
    case 'settings_nav':
      settingsNav(value);
      break;
    case 'settings_enter':
      settingsEnter();
      break;
    case 'settings_back':
      settingsBack();
      break;
    case 'settings_forward':
      settingsForward();
      break;
    case 'tune_up':
    case 'tune_down': {
      remoteTuneStep(action === 'tune_up' ? 1 : -1);
      break;
    }
    case 'tune_drag':
      remoteTuneDrag(value);
      break;
    case 'tune_release':
      remoteTuneRelease(value);
      break;
    case 'ch_up':
      stepStation(1);
      break;
    case 'ch_down':
      stepStation(-1);
      break;
    case 'band':
      setBand(state.band === 'fm' ? 'am' : 'fm');
      break;
    case 'stereo':
      engine.setMono(state.stereo);
      paintModes();
      persistFace();
      break;
    case 'auto':
      state.auto = !state.auto;
      paintModes();
      persistFace();
      if (state.power && !state.stopped) {
        if (state.auto) {
          const { station } = nearest();
          if (station) setFreq(station.freq, { jump: true });
          else ensurePlaying();
        } else ensurePlaying();
      }
      break;
    case 'preset':
      cyclePreset();
      break;
    case 'view':
      toggleViewMode();
      break;
    case 'cast':
      openCastFromRemote();
      break;
    case 'cast_select':
      castPickerSelectById(value);
      break;
    case 'tune_station':
      remotePickStation(value);
      break;
    case 'stations_sync':
      sendStationsToRemote();
      break;
    case 'settings_sync':
      sendSettingsToRemote();
      break;
    case 'settings_set':
      remoteApplySetting(value);
      break;
    case 'cast_nav': {
      if (isCastPickerOpen()) {
        castPickerNav(value);
        break;
      }
      /* Fallback web Chrome: freccia al dialogo di sistema */
      const dir = String(value || '').toLowerCase();
      const key =
        dir === 'up' ? 'ArrowUp'
          : dir === 'down' ? 'ArrowDown'
            : dir === 'left' ? 'ArrowLeft'
              : dir === 'right' ? 'ArrowRight'
                : '';
      if (key) {
        const opts = { key, code: key, keyCode: key === 'ArrowUp' ? 38 : key === 'ArrowDown' ? 40 : key === 'ArrowLeft' ? 37 : 39, which: key === 'ArrowUp' ? 38 : key === 'ArrowDown' ? 40 : key === 'ArrowLeft' ? 37 : 39, bubbles: true, cancelable: true };
        try {
          window.dispatchEvent(new KeyboardEvent('keydown', opts));
          document.dispatchEvent(new KeyboardEvent('keydown', opts));
          window.dispatchEvent(new KeyboardEvent('keyup', opts));
        } catch (e) { /* ignore */ }
      }
      break;
    }
    default:
      break;
  }
  /* Dopo comandi che possono aver acceso la radio: tieni lo schermo acceso */
  syncRemoteWakeLock();
  scheduleRemoteState();
}

function connectRemoteBridge() {
  /* Sempre permesso: la pagina è la presenza Connect primaria anche in standby */
  if (remoteWs && (remoteWs.readyState === WebSocket.OPEN || remoteWs.readyState === WebSocket.CONNECTING)) return;
  const u = new URL('/api/remote/ws', HUB_ORIGIN);
  u.protocol = HUB_ORIGIN.startsWith('https:') ? 'wss:' : 'ws:';
  u.searchParams.set('role', 'radio');
  u.searchParams.set('id', remoteDeviceId());
  u.searchParams.set('name', guessDeviceName());
  u.searchParams.set('kind', guessDeviceKind());
  try {
    remoteWs = new WebSocket(u.toString());
  } catch (e) {
    window.clearTimeout(remoteWsTimer);
    remoteWsTimer = window.setTimeout(connectRemoteBridge, 2500);
    return;
  }
  remoteWs.addEventListener('open', () => {
    try {
      remoteWs.send(JSON.stringify({
        type: 'hello',
        name: guessDeviceName(),
        kind: guessDeviceKind()
      }));
    } catch (e) { /* ignore */ }
    try {
      const pendingPush = sessionStorage.getItem('mytuner-push-sub');
      if (pendingPush) {
        remoteWs.send(pendingPush);
        sessionStorage.removeItem('mytuner-push-sub');
      }
      const pendingFcm = sessionStorage.getItem('mytuner-fcm-token');
      if (pendingFcm) {
        remoteWs.send(pendingFcm);
        sessionStorage.removeItem('mytuner-fcm-token');
      }
    } catch (e) { /* ignore */ }
    ensureRemotePushSubscription();
    if (remoteGuardActive && !state.power) {
      try {
        remoteWs.send(JSON.stringify({
          type: 'state',
          state: { ...remoteSnapshot(), power: false, standby: true, displayWakePending: Boolean(pendingDisplayWake) }
        }));
      } catch (e) { /* ignore */ }
    } else {
      publishRemoteState();
    }
  });
  remoteWs.addEventListener('message', (event) => {
    let data = null;
    try { data = JSON.parse(String(event.data || '')); } catch (e) { return; }
    if (data?.type === 'cmd') applyRemoteCommand(data.action, data.value);
  });
  remoteWs.addEventListener('close', () => {
    window.clearTimeout(remoteWsTimer);
    remoteWsTimer = window.setTimeout(connectRemoteBridge, 1200);
  });
  remoteWs.addEventListener('error', () => {
    try { remoteWs.close(); } catch (e) { /* ignore */ }
  });
}

window.setTimeout(connectRemoteBridge, 400);
window.setInterval(() => {
  if (remoteWs?.readyState === WebSocket.OPEN) {
    if (remoteGuardActive && !state.power) {
      try {
        remoteWs.send(JSON.stringify({
          type: 'ping',
          name: guessDeviceName(),
          kind: guessDeviceKind()
        }));
        remoteWs.send(JSON.stringify({
          type: 'state',
          state: { ...remoteSnapshot(), power: false, standby: true, displayWakePending: Boolean(pendingDisplayWake) }
        }));
      } catch (e) { /* ignore */ }
    } else {
      publishRemoteState();
    }
  } else if (remoteLinked || remoteGuardActive) {
    connectRemoteBridge();
  }
}, 4000);

/* Apertura da notifica push (?wake=1) */
try {
  const wakeParams = new URLSearchParams(location.search);
  if (wakeParams.get('wake') === '1') {
    remoteLinked = true;
    window.setTimeout(() => {
      if (document.visibilityState === 'visible') completeRemotePowerOn('url-wake');
      else requestDisplayWakeAndPower('url-wake');
    }, 400);
  }
} catch (e) { /* ignore */ }

window.setTimeout(() => ensureRemotePushSubscription(), 1200);
