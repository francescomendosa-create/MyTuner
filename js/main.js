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
  { re: /^radio\s*zeta$/i, video: 'https://dd782ed59e2a4e86aabf6fc508674b59.msvdn.net/live/S9346184/XEx1LqlYbNic/playlist_video.m3u8' },
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
  { re: /^rds(\s*100%?\s*grandi\s*successi)?(\s+social(\s+tv)?)?$|^rds\s*[-–]\s*radio\s*dimensione\s*suono$/i, url: 'https://icstream.rds.radio/rds' },
  { re: /^rtl\s*102\.?\s*5$/i, url: 'https://stream.rcast.net/210096' },
  { re: /^radio\s*freccia$/i, url: 'https://dd782ed59e2a4e86aabf6fc508674b59.msvdn.net/live/S3160845/0tuSetc8UFkF/playlist_audio.m3u8' },
  /* MP3 Shoutcast: su iOS lo spettro HLS non ha frame MP3; Android ok anche con HLS */
  { re: /^radio\s*zeta$/i, url: 'https://streamingv2.shoutcast.com/radio-zeta' },
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
    { re: /^radio\s*zeta$/i, freq: 101.3 },
    { re: /^rds(\s*100%?\s*grandi\s*successi)?(\s+social(\s+tv)?)?$|^rds\s*[-–]\s*radio\s*dimensione\s*suono$/i, freq: 101.0 },
    { re: /^radio\s*italia(\s+solo\s+musica\s+italiana)?$/i, freq: 93.5 },
    { re: /^radio\s*kiss\s*kiss$/i, freq: 98.4 },
    { re: /^radio\s*ibiza$/i, freq: 96.3 },
    { re: /^radio\s*marte$/i, freq: 93.6 },
    { re: /^fm\s*italia$/i, freq: 101.1 },
    { re: /^(rsc|r\.?\s*s\.?\s*c\.?)(\s*[-–]\s*)?(radio\s*)?studio\s*centrale$/i, freq: 104.3 },
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
    { re: /^radio\s*zeta$/i, freq: 103.0 },
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
  next = ensureNamedStation(next, RADIO_RSC, /studio\s*centrale|^rsc\b/i);
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
    return;
  }
  cityEl.textContent = name;
  condEl.textContent = String(label || '').trim();
  if (dateEl) dateEl.textContent = localeDateLabel();
  glyph.classList.remove('is-bob');
  cityEl.classList.remove('is-drift');
  glyph.innerHTML = WX_SVG[icon] || WX_SVG.cloud;
  root.hidden = false;
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
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current=weather_code,is_day&timezone=auto`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(String(res.status));
  const data = await res.json();
  return {
    code: data?.current?.weather_code,
    isDay: data?.current?.is_day === 1
  };
}

async function refreshLocaleWeather(lat, lon, cityHint) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
  localeWxCoords = { lat, lon };
  window.clearTimeout(localeWxTimer);
  localeWxTimer = window.setTimeout(() => {
    if (localeWxCoords) refreshLocaleWeather(localeWxCoords.lat, localeWxCoords.lon);
  }, 30 * 60 * 1000);
  try {
    const [city, wx] = await Promise.all([
      cityHint ? Promise.resolve(cityHint) : resolvePlaceName(lat, lon),
      fetchOpenMeteo(lat, lon)
    ]);
    const mapped = wxFromCode(wx.code, wx.isDay);
    const place = city || nearestTownName(lat, lon, 40) || '';
    paintLocaleWx(place, mapped.icon, mapped.label);
  } catch (e) {
    const place = cityHint || nearestTownName(lat, lon, 40) || '';
    if (place) paintLocaleWx(place, 'cloud', '');
  }
}

function refreshLocaleFromZone() {
  const z = ZONE_CENTERS.find((row) => row.id === activeZoneId) || ZONE_CENTERS[0];
  if (!z) return;
  /* Niente etichetta zona forzata: aspetta GPS o comune più vicino alle coord */
  refreshLocaleWeather(z.lat, z.lon);
}

const FALLBACK = {
  fm: applyBrandFreqs(ensureLocalStations([
    { name: 'Radio 105 Network', url: 'https://icecast.unitedradio.it/Radio105.mp3' },
    { name: 'Virgin Radio', url: 'https://icecast.unitedradio.it/Virgin.mp3' },
    { name: 'R101', url: 'https://icecast.unitedradio.it/r101' },
    { name: 'Radio Monte Carlo', url: 'https://icecast.unitedradio.it/RMC.mp3' },
    { name: 'Radio Kiss Kiss', url: 'https://ice07.fluidstream.net/KissKiss.aac' },
    { name: 'Radio Ibiza', url: 'http://wma08.fluidstream.net:5010/;stream.aac' },
    { name: 'RDS', url: 'https://icstream.rds.radio/rds' },
    { name: 'RTL 102.5', url: 'https://stream.rcast.net/210096' },
    { name: 'Radio Freccia', url: 'https://dd782ed59e2a4e86aabf6fc508674b59.msvdn.net/live/S3160845/0tuSetc8UFkF/playlist_audio.m3u8' },
    { name: 'Radio Zeta', url: 'https://streamingv2.shoutcast.com/radio-zeta' },
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
const bandFm = document.getElementById('bandFm');
const bandAm = document.getElementById('bandAm');
const tuneKnob = document.getElementById('tuneKnob');
const tuneSpin = document.getElementById('tuneSpin');
const volKnob = document.getElementById('volKnob');
const volNums = document.getElementById('volNums');
const barsHost = document.getElementById('bars');
const specLabels = document.getElementById('specLabels');
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
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
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
    const res = await fetch(`/api/artwork?q=${encodeURIComponent(q)}`, {
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
    const res = await fetch(`/api/nowplaying?u=${encodeURIComponent(station.url)}`, {
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
  return `/stream?u=${encodeURIComponent(url)}`;
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
      const res = await fetch(`/stream?u=${encodeURIComponent(url)}`, {
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
        media.src = `/stream?u=${encodeURIComponent(url)}`;
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
        if (media.paused) {
          const pending = media.play();
          if (pending) pending.catch(() => { eng.blocked = true; });
        }
        return;
      }
      eng.currentUrl = url;
      media.muted = false;
      media.volume = 1;
      media.src = `/stream?u=${encodeURIComponent(url)}`;
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

function paintStation() {
  const locked = Boolean(state.power && !state.stopped && state.locked);
  radio.classList.toggle('is-locked', locked);
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

function toggleViewMode() {
  const prev = state.locked || nearest().station;
  const goingTv = state.viewMode !== 'video';
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
    dialNeedle.style.left = `${from + (to - from) * e}%`;
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
  if (!animate) {
    if (volAnim) cancelAnimationFrame(volAnim);
    volAnim = 0;
    volDegShown = target;
    volKnob.style.transform = `rotate(${target}deg)`;
    return;
  }
  const from = volDegShown;
  const to = target;
  if (Math.abs(to - from) < 0.08) {
    volDegShown = to;
    volKnob.style.transform = `rotate(${to}deg)`;
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
    volKnob.style.transform = `rotate(${d}deg)`;
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

/* Salto stazione / AUTO: scan Casio sul dial (anche in TV), poi lock */
function seekFreqTo(target) {
  const spec = bandSpec();
  const to = clamp(target, spec.min, spec.max);
  const from = currentFreq();
  const dist = Math.abs(to - from);
  const fine = state.band === 'fm' ? 0.04 : 1.5;
  cancelAfc();
  const token = ++seekToken;
  const targetStation = stationAtFreq(to);

  /* Solo salti cortissimi: latch diretto (TV inclusa nell’animazione sotto) */
  if (dist <= fine) {
    seekActive = false;
    if (state.band === 'fm') state.fm = targetStation ? targetStation.freq : to;
    else state.am = targetStation ? targetStation.freq : to;
    paintDial();
    /* Audio prima del poll ICY (paintStation) */
    if (state.power && !state.stopped && targetStation) catchStation(targetStation);
    else {
      state.locked = targetStation || null;
      paintStation();
    }
    persistFace();
    return;
  }

  /* Velocità tipo scan: FM ~22 MHz/s, AM ~1200 kHz/s, durata clampata */
  const speed = state.band === 'fm' ? 22 : 1200;
  const dur = clamp((dist / speed) * 1000, 240, 1200);
  const t0 = performance.now();
  seekActive = true;
  state.locked = null;
  /* Non ripulire nome/logo a metà scan: evita salti verticali head/meteo */
  radio.classList.remove('is-locked');
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
    return;
  }
  seekToken += 1;
  if (state.band === 'fm') state.fm = freq;
  else state.am = freq;
  paintDial();
  followTune(Boolean(opts.drag));
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
    const { station, dist } = nearest();
    const lock = station ? lockOf(dist) : 0;
    state.locked = lock > 0.78 ? station : null;
    paintStation();
    return;
  }
  const { station, dist } = nearest();
  const lock = station ? lockOf(dist) : 0;

  /* Modalità TV: niente MP3 radio — solo lock + HLS A/V (isteresi anti stop/start) */
  if (isTvMode()) {
    window.clearTimeout(dwellTimer);
    dwellTimer = 0;
    dwellTarget = null;
    engine.silence();
    if (station && lock > 0.55) {
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

  /* Pallino verde = segnale: avvia subito lo stream, niente LED a vuoto */
  if (station && lock > 0.72) {
    state.locked = station;
    window.clearTimeout(dwellTimer);
    dwellTimer = 0;
    dwellTarget = null;
    if (!loaded) engine.play(station.url);
    const mix = Math.max(lock, 0.92);
    engine.setMix(mix, 1 - mix);
    paintStation();
    return;
  }

  state.locked = null;
  paintStation();
  if (loaded) engine.setMix(lock, 1 - lock);
  else engine.setMix(0, 1);

  /* Precarica in avvicinamento, senza riavviare il timer sulla stessa URL */
  if (dragging && station && lock > 0.32) {
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
      engine.setMix(again, 1 - again);
    }, 70);
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
  return `${window.location.origin}/stream?u=${encodeURIComponent(url)}`;
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

function settleTune() {
  if (!state.power || state.stopped) return;
  if (castUi.casting) {
    muteTabletAudio(true);
    const { station, dist } = nearest();
    const lock = station ? lockOf(dist) : 0;
    state.locked = station && lock > 0.48 ? station : state.locked;
    paintStation();
    syncCastMedia(false);
    persistFace();
    return;
  }
  const { station, dist } = nearest();
  const lock = station ? lockOf(dist) : 0;
  /* TV: se c’è un canale nel dial, vai subito sulla sua frequenza e agganci l’HLS */
  if (isTvMode()) {
    if (station && lock > 0.12) {
      snapToStation(station);
      return;
    }
    state.locked = null;
    engine.silence();
    paintStation();
    persistFace();
    return;
  }
  if (station && lock > 0.28) {
    /* Vicino: snap sulla frequenza reale e musica senza riavvii inutili */
    if (lock > 0.55 || Math.abs(currentFreq() - station.freq) < (state.band === 'fm' ? 0.12 : 4)) {
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
  /* Un filo più lungo: il Casio si vede scorrere verso la stazione */
  const dur = clamp(Math.abs(to - from) / (state.band === 'fm' ? 6 : 280) * 1000, 180, 520);
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

function playSwitchClick() {
  playKeyClick();
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

function setPower(on) {
  const was = state.power;
  state.power = on;
  state.stopped = false;
  radio.classList.toggle('is-on', on);
  radio.classList.toggle('is-stereo', Boolean(state.stereo));
  radio.classList.remove('is-stopped');
  btnPower.setAttribute('aria-pressed', String(on));
  syncDialLamp();
  cancelAfc();
  if (!on) {
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
    try { window.MyTunerNative?.keepAwake?.(false); } catch (e) { /* ignore */ }
    paintDial();
    paintTransport();
    updateMediaSession();
    persistFace();
    /* Socket al SW solo quando lo schermo diventa nascosto (vedi visibilitychange) */
    return;
  }
  dismissAlarm();
  askRemoteNotifyPermission();
  stopRemoteGuard();
  try { window.MyTunerNative?.keepAwake?.(true); } catch (e) { /* ignore */ }
  engine.start();
  armMediaPlaybackSession();
  if (engine.ctx?.state === 'suspended') engine.ctx.resume().catch(() => {});
  engine.setVolume(state.volume / 10);
  engine.setTone(state.bass, state.treble);
  if (!isIOS && dialFlickNodes().length) {
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
  scheduleNameSweep(3500 + Math.random() * 5500);
  paintDial();
  paintTransport();
  settleTune();
  persistFace();
  /* Telecomando collegato + radio accesa → niente standby */
  if (remoteLinked) syncRemoteWakeLock();
}

let tvZoomDock = null;
let tvZoomDockTimer = 0;
let zoomVolHoldTimer = 0;
let zoomVolHoldDir = 0;

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
let clockTimer = 0;

function pad2(n) {
  return n < 10 ? `0${n}` : String(n);
}

function tickCasioClock() {
  if (!clockHoursEl || !clockMinsEl) return;
  const now = new Date();
  clockHoursEl.textContent = pad2(now.getHours());
  clockMinsEl.textContent = pad2(now.getMinutes());
}

function initCasioClock() {
  if (!clockHoursEl || !clockMinsEl) return;
  tickCasioClock();
  window.clearInterval(clockTimer);
  /* Allinea al cambio minuto + refresh ogni secondo per i due punti */
  clockTimer = window.setInterval(tickCasioClock, 1000);
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

/* Android: avviso WhatsApp sul dial (niente testo messaggio) */
const waAlertEl = document.getElementById('waAlert');
let waHideTimer = 0;
let waAccessAsked = false;

function hideWaAlert() {
  if (!waAlertEl || waAlertEl.hidden) return;
  waAlertEl.classList.remove('is-in');
  waAlertEl.classList.add('is-out');
  window.setTimeout(() => {
    waAlertEl.hidden = true;
    waAlertEl.classList.remove('is-out');
  }, 360);
}

function showWaAlert() {
  if (!waAlertEl) return;
  window.clearTimeout(waHideTimer);
  waAlertEl.hidden = false;
  waAlertEl.classList.remove('is-out');
  waAlertEl.classList.remove('is-in');
  void waAlertEl.offsetWidth;
  waAlertEl.classList.add('is-in');
  waHideTimer = window.setTimeout(hideWaAlert, 10000);
}

function initWhatsAppDialAlert() {
  const native = window.MyTunerNative;
  if (!native?.hasWhatsAppNotify?.() || !waAlertEl) return;

  waAlertEl.addEventListener('click', () => {
    hideWaAlert();
    try { native.openWhatsApp?.(); } catch (e) { /* ignore */ }
  });

  native.onWhatsAppNotify?.((ev) => {
    if (ev?.kind && ev.kind !== 'message') return;
    showWaAlert();
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
    const response = await fetch('/api/stations');
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
  /* Dopo il primo paint: evita splash PWA bloccata su HLS/audio all’avvio */
  window.setTimeout(() => {
    if (state.power && !state.stopped) settleTune();
    syncVideoView();
    requestZoneFromGps();
  }, 0);
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
  /* Continuo + fruscio; ~40% del volume così non scatta via */
  const spec = bandSpec();
  const full = (300 * Math.PI) / 180;
  const span = spec.max - spec.min;
  setFreq(currentFreq() + (delta / full) * span * 0.4, { drag: true });
}, () => {
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
  if (!tvZoomDock) return;
  tvZoomDock.classList.remove('is-on');
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
  /* Stesse dimensioni fisse (viewport) per TV e dial — non dipendono dall’altezza del quadro */
  const dockH = Math.round(clamp(window.innerHeight * 0.09, 60, 72));
  const btn = Math.round(clamp(dockH * 0.72, 44, 52));
  let dockTop = Math.round(top + height - 3);
  if (dockTop + dockH > window.innerHeight - 4) {
    dockTop = Math.max(4, window.innerHeight - dockH - 4);
  }
  tvZoomDock.style.left = `${Math.round(left)}px`;
  tvZoomDock.style.top = `${dockTop}px`;
  tvZoomDock.style.width = `${Math.round(width)}px`;
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
      cur.style.transform = 'translate(0px, 0px) scale(1)';
      window.setTimeout(() => {
        restoreAllZoomPanels();
        radio.classList.remove('is-panel-zooming');
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
    radio.classList.remove('is-panel-zooming');
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

  /* TV: quasi tutto schermo; dial/spec: grandezza chassis radio */
  let boxW = host.width;
  let boxH = host.height;
  let boxLeft = host.left;
  let boxTop = host.top;
  let pad = 10;
  const chin = Math.round(clamp(window.innerHeight * 0.09, 60, 72));
  if (next === 'tv' || next === 'dial') {
    /* Stesso riquadro + mentoniera identica (TV e dial) */
    boxW = window.innerWidth;
    boxH = window.innerHeight - chin;
    boxLeft = 0;
    boxTop = 0;
    pad = Math.max(8, Math.round(Math.min(boxW, boxH) * 0.018));
  }
  const scale = Math.min(
    (boxW - pad * 2) / w,
    (boxH - pad * 2) / h
  );
  const finalW = w * scale;
  const finalH = h * scale;
  const dx = boxLeft + (boxW - finalW) / 2 - left;
  const dy = boxTop + (boxH - finalH) / 2 - top;
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
  if (panelZoomMode && tvZoomDock && !tvZoomDock.hidden) {
    placeTvZoomDock();
  }
});

tuneKnob.addEventListener('wheel', (event) => {
  event.preventDefault();
  engine.start();
  const dir = Math.sign(event.deltaY || event.deltaX);
  if (!dir) return;
  playRatchetClick();
  if (state.auto) stepStation(dir);
  else {
    const step = state.band === 'fm' ? 0.1 : 9;
    setFreq(currentFreq() + dir * step * Math.min(3, Math.abs(event.deltaY) / 80), { drag: true });
    window.clearTimeout(dwellTimer);
    dwellTimer = window.setTimeout(() => settleTune(), 180);
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
  settingsFocus = 0;
  paintSettingsFocus();
  openDeviceNameEditor(true);
});
document.getElementById('btnAlarmSettings')?.addEventListener('click', (event) => {
  event.stopPropagation();
  playKeyClick();
  settingsFocus = 1;
  paintSettingsFocus();
  openAlarmEditor(true);
});
document.getElementById('btnStationsSettings')?.addEventListener('click', (event) => {
  event.stopPropagation();
  playKeyClick();
  settingsFocus = 2;
  paintSettingsFocus();
  openStationsPane(true, 'browse');
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
document.getElementById('btnAlarmCancel')?.addEventListener('click', (event) => {
  event.stopPropagation();
  openAlarmEditor(false);
});
document.getElementById('monitorAlarmEditor')?.addEventListener('submit', (event) => {
  event.preventDefault();
  saveAlarmFromEditor();
  openAlarmEditor(false);
});
document.getElementById('alarmPowerBtn')?.addEventListener('click', (event) => {
  event.stopPropagation();
  playKeyClick();
  alarmDraft.enabled = !alarmDraft.enabled;
  paintAlarmWheels();
});
document.querySelectorAll('input[name="alarmMode"]').forEach((el) => {
  el.addEventListener('change', () => {
    const mode = document.querySelector('input[name="alarmMode"]:checked')?.value || 'sound';
    alarmDraft.mode = mode === 'music' ? 'music' : 'sound';
    if (alarmDraft.mode === 'music') {
      openStationsPane(true, 'alarm');
      return;
    }
    syncAlarmModeUi();
  });
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
/* CH ±: sul tablet (nativo) subito alla pressione; in web app al rilascio (click) */
function bindChannelStep(btn, dir) {
  if (!btn) return;
  const onStep = () => {
    engine.start();
    stepStation(dir);
  };
  const nativeTablet = Boolean(
    window.MyTunerNative?.isNative?.()
    && (window.MyTunerNative?.platform?.() === 'android' || window.Capacitor?.getPlatform?.() === 'android')
  );
  if (nativeTablet) {
    let fromPointer = false;
    btn.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      fromPointer = true;
      onStep();
    });
    btn.addEventListener('click', (event) => {
      if (fromPointer) {
        fromPointer = false;
        event.preventDefault();
        return;
      }
      onStep();
    });
    return;
  }
  btn.addEventListener('click', onStep);
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
  if (!presetHeld) cyclePreset();
});
btnPreset.addEventListener('pointercancel', () => window.clearTimeout(presetTimer));

window.addEventListener('keydown', (event) => {
  if (event.repeat && (event.key === ' ' || event.key === 'p' || event.key === 'P')) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    engine.start();
    const dir = event.key === 'ArrowRight' ? 1 : -1;
    if (state.auto) stepStation(dir);
    else {
      setFreq(currentFreq() + dir * (state.band === 'fm' ? 0.1 : 9), { drag: true });
      window.clearTimeout(dwellTimer);
      dwellTimer = window.setTimeout(() => settleTune(), 160);
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
      dwellTimer = window.setTimeout(() => settleTune(), 120);
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
let remoteStateTimer = 0;

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

function stationKeyOf(st) {
  if (!st) return '';
  return `${st.band || 'fm'}|${Number(st.freq)}|${String(st.name || '')}`;
}

function allCatalogStations() {
  const fm = (catalog.fm || []).map((s) => ({ ...s, band: 'fm' }));
  const am = (catalog.am || []).map((s) => ({ ...s, band: 'am' }));
  return fm.concat(am);
}

function findStationByKey(key) {
  if (!key) return null;
  return allCatalogStations().find((s) => stationKeyOf(s) === key) || null;
}

function paintDeviceNameLabel() {
  const input = document.getElementById('deviceNameInput');
  if (input && document.activeElement !== input) input.value = guessDeviceName();
}

function settingsIconButtons() {
  return [...document.querySelectorAll('#monitorSettingsBody .monitor-set-ico-btn')];
}

function isMonitorSettingsOpen() {
  const panel = document.getElementById('monitorSettings');
  return Boolean(panel && !panel.classList.contains('is-hidden'));
}

function isDeviceNameEditorOpen() {
  const editor = document.getElementById('monitorNameEditor');
  return Boolean(editor && !editor.classList.contains('is-hidden'));
}

function isAlarmEditorOpen() {
  const editor = document.getElementById('monitorAlarmEditor');
  return Boolean(editor && !editor.classList.contains('is-hidden'));
}

function isStationsPaneOpen() {
  const pane = document.getElementById('monitorStationsPane');
  return Boolean(pane && !pane.classList.contains('is-hidden'));
}

function hideSettingsSubpanes() {
  document.getElementById('monitorSettingsBody')?.classList.remove('is-hidden');
  document.getElementById('monitorNameEditor')?.classList.add('is-hidden');
  document.getElementById('monitorAlarmEditor')?.classList.add('is-hidden');
  document.getElementById('monitorStationsPane')?.classList.add('is-hidden');
}

function paintSettingsFocus() {
  const buttons = settingsIconButtons();
  if (!buttons.length) return;
  settingsFocus = ((settingsFocus % buttons.length) + buttons.length) % buttons.length;
  buttons.forEach((btn, i) => {
    const on = i === settingsFocus;
    btn.classList.toggle('is-selected', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
}

function openMonitorSettings(on) {
  const panel = document.getElementById('monitorSettings');
  const btn = document.getElementById('btnSpecSettings');
  if (!panel) return;
  if (on) {
    try { openCastPicker(false); } catch (e) { /* ignore */ }
  }
  panel.classList.toggle('is-hidden', !on);
  btn?.classList.toggle('is-open', Boolean(on));
  if (on) {
    settingsFocus = 0;
    paintDeviceNameLabel();
    paintSettingsFocus();
    hideSettingsSubpanes();
  } else {
    hideSettingsSubpanes();
  }
  scheduleRemoteState();
}

function openDeviceNameEditor(on) {
  const body = document.getElementById('monitorSettingsBody');
  const editor = document.getElementById('monitorNameEditor');
  const input = document.getElementById('deviceNameInput');
  if (!editor) return;
  if (on) {
    document.getElementById('monitorAlarmEditor')?.classList.add('is-hidden');
    document.getElementById('monitorStationsPane')?.classList.add('is-hidden');
  }
  body?.classList.toggle('is-hidden', on);
  editor.classList.toggle('is-hidden', !on);
  if (on && input) {
    input.value = guessDeviceName();
    window.setTimeout(() => {
      try {
        input.focus();
        input.select();
      } catch (e) { /* ignore */ }
    }, 40);
  }
  scheduleRemoteState();
}

let stationsPickMode = null; /* null | 'browse' | 'alarm' */
let stationsFocus = 0;
let alarmWheelFocus = 0;
let alarmDraft = { enabled: false, time: '07:00', mode: 'sound', soundId: 'leggera', stationKey: '' };

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

function paintAlarmWheels() {
  const digits = alarmDigitsFromTime(alarmDraft.time);
  for (let i = 0; i < 4; i += 1) {
    const el = document.getElementById(`alarmDigit${i}`);
    if (el) el.textContent = String(digits[i]);
    const wheel = document.querySelector(`.alarm-wheel[data-idx="${i}"]`);
    wheel?.classList.toggle('is-focus', i === alarmWheelFocus);
  }
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
    chip.textContent = '';
    return;
  }
  const mhz = st.band === 'am' ? `${Math.round(st.freq)} kHz` : `${Number(st.freq).toFixed(1)} MHz`;
  chip.textContent = `${st.name || 'Stazione'} · ${mhz}`;
  chip.classList.remove('is-hidden');
}

function syncAlarmModeUi() {
  const mode = alarmDraft.mode === 'music' ? 'music' : 'sound';
  document.getElementById('alarmSoundWrap')?.classList.toggle('is-hidden', mode !== 'sound');
  paintAlarmStationChip();
}

function nudgeAlarmDigit(idx, dir) {
  const digits = alarmDigitsFromTime(alarmDraft.time);
  const i = Math.max(0, Math.min(3, idx | 0));
  const step = dir < 0 ? -1 : 1;
  if (i === 0) digits[0] = (digits[0] + step + 3) % 3;
  else if (i === 1) {
    const max = digits[0] === 2 ? 3 : 9;
    digits[1] = (digits[1] + step + (max + 1)) % (max + 1);
  } else if (i === 2) digits[2] = (digits[2] + step + 6) % 6;
  else digits[3] = (digits[3] + step + 10) % 10;
  if (digits[0] === 2 && digits[1] > 3) digits[1] = 3;
  alarmDraft.time = alarmTimeFromDigits(digits);
  paintAlarmWheels();
}

function bindAlarmWheelInteractions() {
  const wheels = document.getElementById('alarmWheels');
  if (!wheels || wheels.dataset.bound === '1') return;
  wheels.dataset.bound = '1';
  wheels.addEventListener('click', (event) => {
    const btn = event.target.closest('.alarm-wheel-btn');
    const wheel = event.target.closest('.alarm-wheel');
    if (!wheel) return;
    const idx = Number(wheel.getAttribute('data-idx') || 0);
    alarmWheelFocus = idx;
    if (btn) {
      event.preventDefault();
      nudgeAlarmDigit(idx, btn.classList.contains('up') ? 1 : -1);
      playKeyClick();
    } else {
      paintAlarmWheels();
    }
  });
  /* Drag verticale sulla cifra */
  let drag = null;
  wheels.addEventListener('pointerdown', (event) => {
    const digit = event.target.closest('.alarm-wheel-digit');
    const wheel = event.target.closest('.alarm-wheel');
    if (!digit || !wheel) return;
    const idx = Number(wheel.getAttribute('data-idx') || 0);
    alarmWheelFocus = idx;
    paintAlarmWheels();
    drag = { id: event.pointerId, idx, y: event.clientY, acc: 0 };
    try { digit.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ }
  });
  wheels.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dy = drag.y - event.clientY;
    drag.y = event.clientY;
    drag.acc += dy;
    while (drag.acc >= 18) {
      drag.acc -= 18;
      nudgeAlarmDigit(drag.idx, 1);
    }
    while (drag.acc <= -18) {
      drag.acc += 18;
      nudgeAlarmDigit(drag.idx, -1);
    }
  });
  const endDrag = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    drag = null;
  };
  wheels.addEventListener('pointerup', endDrag);
  wheels.addEventListener('pointercancel', endDrag);
}

function openAlarmEditor(on) {
  const body = document.getElementById('monitorSettingsBody');
  const editor = document.getElementById('monitorAlarmEditor');
  if (!editor) return;
  if (on) {
    document.getElementById('monitorNameEditor')?.classList.add('is-hidden');
    document.getElementById('monitorStationsPane')?.classList.add('is-hidden');
    stationsPickMode = null;
    alarmSettings = readAlarmSettings();
    alarmDraft = { ...alarmSettings };
    alarmWheelFocus = 0;
    const sound = document.getElementById('alarmSoundSelect');
    if (sound) sound.value = normalizeAlarmSoundId(alarmDraft.soundId);
    const mode = alarmDraft.mode === 'music' ? 'music' : 'sound';
    for (const el of document.querySelectorAll('input[name="alarmMode"]')) {
      el.checked = el.value === mode;
    }
    bindAlarmWheelInteractions();
    paintAlarmWheels();
    syncAlarmModeUi();
  }
  body?.classList.toggle('is-hidden', on);
  editor.classList.toggle('is-hidden', !on);
  scheduleRemoteState();
}

function saveAlarmFromEditor() {
  const sound = document.getElementById('alarmSoundSelect');
  const mode = document.querySelector('input[name="alarmMode"]:checked')?.value || alarmDraft.mode || 'sound';
  alarmDraft.mode = mode === 'music' ? 'music' : 'sound';
  alarmDraft.soundId = normalizeAlarmSoundId(sound?.value);
  alarmSettings = { ...alarmDraft };
  try { localStorage.setItem(ALARM_KEY, JSON.stringify(alarmSettings)); } catch (e) { /* ignore */ }
  flash(alarmSettings.enabled ? `SVEGLIA ${alarmSettings.time}` : 'SVEGLIA OFF', true);
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
    btn.textContent = st.name || (st.band === 'am' ? `${Math.round(st.freq)}` : Number(st.freq).toFixed(1));
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
    for (const el of document.querySelectorAll('input[name="alarmMode"]')) {
      el.checked = el.value === 'music';
    }
    openStationsPane(false);
    openAlarmEditor(true);
    paintAlarmStationChip();
    return;
  }
  tuneToStation(st);
  openMonitorSettings(false);
}

function openStationsPane(on, mode = 'browse') {
  const body = document.getElementById('monitorSettingsBody');
  const pane = document.getElementById('monitorStationsPane');
  if (!pane) return;
  if (on) {
    document.getElementById('monitorNameEditor')?.classList.add('is-hidden');
    document.getElementById('monitorAlarmEditor')?.classList.add('is-hidden');
    stationsPickMode = mode === 'alarm' ? 'alarm' : 'browse';
    stationsFocus = 0;
    paintSettingsStationsGrid();
  } else {
    stationsPickMode = null;
  }
  body?.classList.toggle('is-hidden', on);
  pane.classList.toggle('is-hidden', !on);
  scheduleRemoteState();
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

function tuneToStation(st) {
  if (!st) return;
  const band = st.band === 'am' ? 'am' : 'fm';
  if (state.viewMode === 'video') {
    try { /* resta in radio se possibile */ } catch (e) { /* ignore */ }
  }
  if (state.band !== band) setBand(band);
  if (!state.power) setPower(true);
  else if (state.stopped) toggleStop();
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

function startAlarmMp3Sound() {
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
  alarmAudioEl.volume = 0.9;
  const play = () => {
    try {
      const p = alarmAudioEl.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) { /* ignore */ }
  };
  if (alarmAudioEl.readyState >= 2) play();
  else alarmAudioEl.addEventListener('canplay', play, { once: true });
  try { alarmAudioEl.load(); } catch (e) { /* ignore */ }
}

function dismissAlarm() {
  if (!alarmRinging) return;
  alarmRinging = false;
  stopAlarmSound();
}

function fireAlarm() {
  if (alarmRinging) return;
  alarmRinging = true;
  try { window.MyTunerNative?.wakeDisplay?.({ reason: 'alarm' }); } catch (e) { /* ignore */ }
  try { window.MyTunerNative?.keepAwake?.(true); } catch (e) { /* ignore */ }
  flash('SVEGLIA', true);
  if (alarmSettings.mode === 'music') {
    const st = findStationByKey(alarmSettings.stationKey) || allCatalogStations()[0];
    if (st) tuneToStation(st);
    else if (!state.power) setPower(true);
  } else {
    startAlarmMp3Sound();
  }
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

function settingsNav(dir) {
  if (!isMonitorSettingsOpen()) return;
  if (isStationsPaneOpen()) {
    navStationsGrid(dir);
    return;
  }
  if (isAlarmEditorOpen()) {
    const d = String(dir || '').toLowerCase();
    if (d === 'left') {
      alarmWheelFocus = (alarmWheelFocus + 3) % 4;
      paintAlarmWheels();
    } else if (d === 'right') {
      alarmWheelFocus = (alarmWheelFocus + 1) % 4;
      paintAlarmWheels();
    } else if (d === 'up') {
      nudgeAlarmDigit(alarmWheelFocus, 1);
    } else if (d === 'down') {
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

function settingsBack() {
  if (!isMonitorSettingsOpen()) return;
  if (isDeviceNameEditorOpen()) {
    openDeviceNameEditor(false);
    return;
  }
  if (isStationsPaneOpen()) {
    const backToAlarm = stationsPickMode === 'alarm';
    openStationsPane(false);
    if (backToAlarm) openAlarmEditor(true);
    return;
  }
  if (isAlarmEditorOpen()) {
    openAlarmEditor(false);
    return;
  }
  openMonitorSettings(false);
}

function settingsEnter() {
  if (!isMonitorSettingsOpen()) return;
  if (isDeviceNameEditorOpen()) {
    const input = document.getElementById('deviceNameInput');
    setDeviceName(input?.value || '');
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
  if (isAlarmEditorOpen()) {
    saveAlarmFromEditor();
    openAlarmEditor(false);
    return;
  }
  const btn = settingsIconButtons()[settingsFocus];
  if (!btn) return;
  if (btn.dataset.set === 'user') openDeviceNameEditor(true);
  else if (btn.dataset.set === 'alarm') openAlarmEditor(true);
  else if (btn.dataset.set === 'stations') openStationsPane(true, 'browse');
}

/* Swipe da sinistra verso destra = indietro nelle impostazioni */
(function bindSettingsSwipeBack() {
  const panel = document.getElementById('monitorSettings');
  if (!panel) return;
  let startX = 0;
  let startY = 0;
  let tracking = false;
  panel.addEventListener('pointerdown', (event) => {
    if (!isMonitorSettingsOpen()) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    tracking = true;
    startX = event.clientX;
    startY = event.clientY;
  }, { passive: true });
  panel.addEventListener('pointerup', (event) => {
    if (!tracking) return;
    tracking = false;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (dx > 56 && Math.abs(dx) > Math.abs(dy) * 1.25) settingsBack();
  }, { passive: true });
  panel.addEventListener('pointercancel', () => { tracking = false; }, { passive: true });
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
    settingsOpen: isMonitorSettingsOpen(),
    settingsEditor: isDeviceNameEditorOpen() || isAlarmEditorOpen() || isStationsPaneOpen(),
    settingsFocus,
    panelZoom: panelZoomMode || '',
    displayWakePending: Boolean(pendingDisplayWake),
    station: state.locked?.name || ''
  };
}

function publishRemoteState() {
  if (!remoteWs || remoteWs.readyState !== WebSocket.OPEN) return;
  try {
    remoteWs.send(JSON.stringify({ type: 'state', state: remoteSnapshot() }));
  } catch (e) { /* ignore */ }
}

function scheduleRemoteState() {
  window.clearTimeout(remoteStateTimer);
  remoteStateTimer = window.setTimeout(publishRemoteState, 80);
}

let screenWakeLock = null;
let screenWakeGen = 0;
let lastRemoteWakeNotify = 0;
let remoteLinked = false;
let remoteGuardActive = false;
let pendingDisplayWake = false;
let wakeNagTimer = 0;

function shouldHoldRemoteWake() {
  /* Schermo acceso solo con telecomando collegato E radio accesa */
  return Boolean(remoteLinked && state.power && !document.hidden);
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
  if (state.power && !pendingDisplayWake && document.visibilityState === 'visible') return;
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
        state: { ...remoteSnapshot(), power: false, standby: true, displayWakePending: Boolean(pendingDisplayWake) }
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
    origin: location.origin
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
  stopWakeNag();
  remoteLinked = true;
  stopRemoteGuard();
  clearRemoteUiChrome();
  try { window.focus(); } catch (e) { /* ignore */ }
  try { window.MyTunerNative?.wakeDisplay?.({ reason: 'complete' }); } catch (e) { /* ignore */ }
  try { window.MyTunerNative?.keepAwake?.(true); } catch (e) { /* ignore */ }
  engine.start();
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
  /* Preferisci SW: heads-up affidabile anche in background (niente solo badge “1”) */
  if (navigator.serviceWorker?.controller && Notification.permission === 'granted') {
    postToServiceWorker({
      type: 'remote-show-note',
      title: 'MyTuner',
      body,
      tag: tag || 'mytuner-remote-wake'
    });
    return;
  }
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  try {
    const n = new Notification('MyTuner', {
      body,
      tag: tag || 'mytuner-remote',
      icon: '/icons/icon-192.png',
      badge: '/icons/favicon-32.png',
      renotify: true,
      silent: false
    });
    n.onclick = () => {
      try { window.focus(); } catch (e) { /* ignore */ }
      try { n.close(); } catch (e) { /* ignore */ }
      clearRemoteUiChrome();
    };
  } catch (e) { /* ignore */ }
}

function pingRemoteWakeNotification() {
  if (!document.hidden) return;
  const now = Date.now();
  if (now - lastRemoteWakeNotify < 4000) return;
  lastRemoteWakeNotify = now;
  showRemoteNotification('Telecomando attivo — tocca per aprire', 'mytuner-remote-wake');
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
        const res = await fetch('/api/remote/vapid', { cache: 'no-store' });
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
  showRemoteNotification('Telecomando disconnesso', 'mytuner-remote-unlink');
  flash('REMOTE OFF', true);
  scheduleRemoteState();
}

function onTabletResume() {
  if (document.visibilityState !== 'visible') return;
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
  if (remoteGuardActive && state.power) stopRemoteGuard();
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
    return;
  }
  /* Schermo in standby con radio spenta (o in attesa di tap) → SW tiene il socket */
  if (remoteLinked && (!state.power || pendingDisplayWake)) {
    startRemoteGuard();
    return;
  }
  if (shouldHoldRemoteWake()) ensureScreenAwakeHeld();
});
window.addEventListener('pageshow', onTabletResume);
window.addEventListener('online', onTabletResume);

function applyRemoteCommand(action, value) {
  const act = String(action || '');
  if (act === 'unlink' || act === 'disconnect') {
    unlinkFromRemote(value);
    return;
  }
  if (act === 'wake') {
    try { window.MyTunerNative?.wakeDisplay?.({ reason: 'wake' }); } catch (e) { /* ignore */ }
    wakeFromRemote(act);
    scheduleRemoteState();
    return;
  }
  /* Power con value on/off esplicito (telecomando) oppure toggle legacy */
  if (act === 'power') {
    const v = String(value ?? '').toLowerCase();
    const forceOff = v === 'off' || v === '0' || v === 'false';
    const forceOn = v === 'on' || v === '1' || v === 'true';
    const turningOff = forceOff || (!forceOn && Boolean(state.power) && !pendingDisplayWake);
    if (turningOff) {
      pendingDisplayWake = false;
      stopWakeNag();
      remoteLinked = true;
      setPower(false);
      releaseScreenAwake();
      /* Solo rilascia keep-screen-on — l'app resta aperta, niente “esci” */
      try { window.MyTunerNative?.allowStandby?.(); } catch (e) { /* ignore */ }
      try { window.MyTunerNative?.keepAwake?.(false); } catch (e) { /* ignore */ }
      startRemoteGuard();
      scheduleRemoteState();
      return;
    }
    if (pendingDisplayWake) {
      scheduleRemoteState();
      return;
    }
    if (document.hidden) {
      requestDisplayWakeAndPower(value || 'on');
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
    case 'tune_up':
    case 'tune_down': {
      const dir = action === 'tune_up' ? 1 : -1;
      const step = state.band === 'fm' ? 0.1 : 9;
      setFreq(currentFreq() + dir * step, { drag: true });
      window.clearTimeout(dwellTimer);
      dwellTimer = window.setTimeout(() => settleTune(), 180);
      break;
    }
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
  const u = new URL('/api/remote/ws', location.origin);
  u.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
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
