const FM = { min: 87.5, max: 108, win: 0.34, turn: 6 };
const AM = { min: 520, max: 1620, win: 18, turn: 170 };

const SPEC = [
  { hz: 63, label: '63Hz' },
  { hz: 125, label: '125Hz' },
  { hz: 250, label: '250Hz' },
  { hz: 400, label: '' },
  { hz: 500, label: '500Hz' },
  { hz: 800, label: '' },
  { hz: 1000, label: '1kHz' },
  { hz: 1600, label: '' },
  { hz: 2000, label: '2kHz' },
  { hz: 3000, label: '' },
  { hz: 4000, label: '4kHz' },
  { hz: 6000, label: '' },
  { hz: 8000, label: '8kHz' },
  { hz: 10000, label: '' },
  { hz: 12000, label: '' },
  { hz: 16000, label: '16kHz' }
];

const FALLBACK = {
  fm: [
    { name: 'Radio 105 Network', url: 'http://icecast.unitedradio.it/Radio105.mp3', freq: 98.1 },
    { name: 'Virgin Radio Classic Rock', url: 'http://icy.unitedradio.it/VirginRockClassics.mp3', freq: 100.7 },
    { name: 'Rai Radio 3', url: 'http://icestreaming.rai.it/3.mp3', freq: 102.5 },
    { name: 'Virgin Radio Rock 70', url: 'http://icy.unitedradio.it/VirginRock70.mp3', freq: 96.2 },
    { name: 'Virgin Radio Rock 80', url: 'http://icy.unitedradio.it/VirginRock80.mp3', freq: 94.4 },
    { name: 'Radio 80', url: 'http://str01.fluidstream.net:7020/;stream.mp3', freq: 91.7 }
  ],
  am: [
    { name: 'Rai Radio 1', url: 'http://icestreaming.rai.it/1.mp3', freq: 810 },
    { name: 'Radio 24', url: 'http://shoutcast2.radio24.it:8000/;', freq: 900 }
  ]
};

const radio = document.getElementById('radio');
const glass = document.getElementById('glass');
const stationLine = document.getElementById('stationLine');
const freqFm = document.getElementById('freqFm');
const freqAm = document.getElementById('freqAm');
const needleFm = document.getElementById('needleFm');
const needleAm = document.getElementById('needleAm');
const bandFm = document.getElementById('bandFm');
const bandAm = document.getElementById('bandAm');
const tuneKnob = document.getElementById('tuneKnob');
const volKnob = document.getElementById('volKnob');
const bassKnob = document.getElementById('bassKnob');
const trebleKnob = document.getElementById('trebleKnob');
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
const lblBand = document.getElementById('lblBand');
const lblStereo = document.getElementById('lblStereo');
const lblAuto = document.getElementById('lblAuto');
const lblCast = document.getElementById('lblCast');
const audio = document.getElementById('player');

const castUi = {
  ready: false,
  casting: false,
  contentUrl: ''
};

const saved = readJSON('radio-face-v1', null);
const state = {
  // All'apertura parte sempre spenta: si accende solo con POWER
  power: false,
  stopped: false,
  band: saved?.band === 'am' ? 'am' : 'fm',
  fm: clamp(Number(saved?.fm) || 98.1, FM.min, FM.max),
  am: clamp(Number(saved?.am) || 810, AM.min, AM.max),
  volume: clamp(Number(saved?.volume ?? 5), 0, 10),
  bass: clamp(Number(saved?.bass) || 0, -12, 12),
  treble: clamp(Number(saved?.treble) || 0, -12, 12),
  stereo: saved?.stereo !== false,
  auto: saved?.auto === true,
  locked: null
};

const stations = { fm: [], am: [] };
const presets = readJSON('radio-presets-v1', { fm: [], am: [] });
const presetIndex = { fm: -1, am: -1 };
let afcToken = 0;
let dwellTimer = 0;
let autoAccum = 0;
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
    noiseLevel: 0
  };
  let splitter;
  let merger;
  let gL;
  let gR;
  let noiseTimer = 0;

  function ensure() {
    if (eng.ready) {
      if (eng.ctx.state === 'suspended') eng.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    eng.ctx = ctx;
    const source = ctx.createMediaElementSource(media);
    const signal = ctx.createGain();
    const noiseGain = ctx.createGain();
    const mix = ctx.createGain();
    const bass = ctx.createBiquadFilter();
    const treble = ctx.createBiquadFilter();
    const volume = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    const analyser = ctx.createAnalyser();

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
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.78;

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

    source.connect(signal);
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
    const tap = ctx.createGain();
    tap.gain.value = 0;
    analyser.connect(tap);
    tap.connect(ctx.destination);
    eng.tap = tap;

    eng.signal = signal;
    eng.noise = noiseGain;
    eng.volume = volume;
    eng.bass = bass;
    eng.treble = treble;
    eng.analyser = analyser;
    eng.bins = new Uint8Array(analyser.frequencyBinCount);
    eng.ready = true;
    routeMode();
    noise.start();
    ctx.resume();
  }

  function routeMode() {
    if (!eng.ready) return;
    try { eng.treble.disconnect(); } catch (e) { /* prima connessione */ }
    try { merger.disconnect(); } catch (e) { /* prima connessione */ }
    try { eng.analyser.disconnect(); } catch (e) { /* prima connessione */ }
    if (state.stereo) {
      eng.treble.connect(eng.volume);
      eng.treble.connect(eng.analyser);
    } else {
      eng.treble.connect(splitter);
      merger.connect(eng.volume);
      merger.connect(eng.analyser);
    }
    eng.analyser.connect(eng.tap);
  }

  function setMix(signalLevel, noiseLevel) {
    eng.noiseLevel = Math.max(0, noiseLevel);
    if (!eng.ready) return;
    const now = eng.ctx.currentTime;
    eng.signal.gain.setTargetAtTime(Math.max(0, signalLevel), now, 0.07);
    eng.noise.gain.setTargetAtTime(eng.noiseLevel * 0.18, now, 0.06);
  }

  return {
    get ready() { return eng.ready; },
    get currentUrl() { return eng.currentUrl; },
    get analyser() { return eng.analyser; },
    get bins() { return eng.bins; },
    get ctx() { return eng.ctx; },
    start: ensure,
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
      if (eng.currentUrl === url && !media.paused && media.readyState >= 2) return;
      eng.currentUrl = url;
      eng.blocked = false;
      if (castUi.casting) {
        muteTabletAudio(true);
        syncCastMedia(true);
        return;
      }
      media.src = `/stream?u=${encodeURIComponent(url)}`;
      const pending = media.play();
      if (pending) {
        pending.catch(() => {
          eng.blocked = true;
        });
      }
    },
    pause() {
      media.pause();
    },
    silence() {
      setMix(0, 0);
    },
    flutter(now) {
      if (!eng.ready || eng.noiseLevel < 0.04) return;
      if (now - noiseTimer < 90) return;
      noiseTimer = now;
      const wobble = 0.78 + Math.random() * 0.4;
      eng.noise.gain.setTargetAtTime(eng.noiseLevel * 0.18 * wobble, eng.ctx.currentTime, 0.05);
    }
  };
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
  stationLine.textContent = text;
  stationLine.classList.toggle('is-gold', Boolean(gold));
  flashTimer = window.setTimeout(() => {
    stationLine.classList.remove('is-gold');
    paintStation();
  }, 1300);
}

function paintStation() {
  if (!state.power) {
    stationLine.textContent = '';
    return;
  }
  stationLine.textContent = state.locked ? state.locked.name : '';
}

function paintDial() {
  const fmP = ((state.fm - FM.min) / (FM.max - FM.min)) * 100;
  const amP = ((state.am - AM.min) / (AM.max - AM.min)) * 100;
  needleFm.style.left = `${clamp(fmP, 0, 100)}%`;
  needleAm.style.left = `${clamp(amP, 0, 100)}%`;
  freqFm.textContent = state.fm.toFixed(1);
  freqAm.textContent = String(Math.round(state.am));
  bandFm.classList.toggle('is-active', state.power && state.band === 'fm');
  bandAm.classList.toggle('is-active', state.power && state.band === 'am');
  const spec = bandSpec();
  const turns = (currentFreq() - spec.min) / spec.turn;
  tuneKnob.style.transform = `rotate(${turns * 360}deg)`;
  tuneKnob.setAttribute('aria-valuenow', state.band === 'fm' ? state.fm.toFixed(1) : String(Math.round(state.am)));
  tuneKnob.setAttribute('aria-valuemin', String(spec.min));
  tuneKnob.setAttribute('aria-valuemax', String(spec.max));
  paintStation();
}

function paintVolume() {
  const deg = -150 + (state.volume / 10) * 300;
  volKnob.style.transform = `rotate(${deg}deg)`;
  volKnob.setAttribute('aria-valuenow', state.volume.toFixed(1));
}

function paintEq() {
  bassKnob.style.transform = `rotate(${(state.bass / 12) * 135}deg)`;
  trebleKnob.style.transform = `rotate(${(state.treble / 12) * 135}deg)`;
  bassKnob.setAttribute('aria-valuenow', state.bass.toFixed(1));
  trebleKnob.setAttribute('aria-valuenow', state.treble.toFixed(1));
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
  btnBand.classList.toggle('is-lit', state.band === 'am');
  btnMono.classList.toggle('is-lit', !state.stereo);
  btnAuto.classList.toggle('is-lit', state.auto);
}

function cancelAfc() {
  afcToken += 1;
}

function setFreq(value, opts = {}) {
  const spec = bandSpec();
  const freq = clamp(value, spec.min, spec.max);
  if (state.band === 'fm') state.fm = freq;
  else state.am = freq;
  paintDial();
  if (opts.jump) {
    const { station } = nearest();
    state.locked = station;
    paintStation();
    if (state.power && !state.stopped && station) catchStation(station);
    persistFace();
    return;
  }
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
  state.locked = lock > 0.78 ? station : null;
  paintStation();
  const loaded = station && engine.currentUrl === station.url;
  if (loaded) engine.setMix(lock, 1 - lock);
  else engine.setMix(0, 1);

  window.clearTimeout(dwellTimer);
  if (dragging && station && lock > 0.42) {
    dwellTimer = window.setTimeout(() => {
      if (!state.power || state.stopped) return;
      engine.play(station.url);
      const again = lockOf(Math.abs(station.freq - currentFreq()));
      engine.setMix(again, 1 - again);
      state.locked = again > 0.78 ? station : null;
      paintStation();
    }, 220);
  }
}

function catchStation(station) {
  if (castUi.casting) {
    engine.play(station.url);
    return;
  }
  engine.play(station.url);
  engine.setMix(0.15, 0.85);
  window.setTimeout(() => {
    if (!state.power || state.stopped) return;
    if (audio.paused) engine.setMix(0, 1);
    else engine.setMix(1, 0);
  }, 170);
}

function streamAbsolute(url) {
  return `${window.location.origin}/stream?u=${encodeURIComponent(url)}`;
}

function muteTabletAudio(on) {
  if (on) {
    try { audio.pause(); } catch (e) { /* ignore */ }
    audio.muted = true;
    audio.volume = 0;
    engine.silence();
    if (engine.ready) engine.setVolume(0);
  } else {
    audio.muted = false;
    audio.volume = 1;
    if (engine.ready) engine.setVolume(state.volume / 10);
  }
}

function setCastVolume(unit) {
  if (!castUi.casting) return;
  try {
    cast.framework.CastContext.getInstance().getCurrentSession()?.setVolume(clamp(unit, 0, 1));
  } catch (e) { /* ignore */ }
}

function paintCast() {
  if (!btnCast) return;
  btnCast.classList.toggle('is-ready', castUi.ready);
  btnCast.classList.toggle('is-lit', castUi.casting);
  btnCast.setAttribute('aria-pressed', String(castUi.casting));
  if (lblCast) {
    lblCast.textContent = castUi.casting ? 'CAST ON' : 'CAST';
    lblCast.classList.toggle('is-active', castUi.casting);
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
      castUi.casting = event.castState === cast.framework.CastState.CONNECTED;
      paintCast();
      if (castUi.casting) {
        muteTabletAudio(true);
        syncCastMedia(true);
      } else {
        castUi.contentUrl = '';
        muteTabletAudio(false);
        if (state.power && !state.stopped) settleTune();
      }
    });
    castUi.ready = true;
    castUi.casting = context.getCurrentSession() != null;
    paintCast();
  } catch (e) {
    castUi.ready = false;
    paintCast();
  }
}

async function syncCastMedia(force = false) {
  const session = window.cast?.framework?.CastContext?.getInstance()?.getCurrentSession?.();
  if (!session || !state.power || state.stopped) return;
  const station = state.locked || nearest().station;
  if (!station) {
    flash('NO SIGNAL', true);
    return;
  }
  const contentUrl = streamAbsolute(station.url);
  // Evita di ricaricare lo stesso flusso: un tocco sul tablet non deve interrompere il Cast
  if (!force && castUi.contentUrl === contentUrl && session.getMediaSession()) {
    muteTabletAudio(true);
    setCastVolume(state.volume / 10);
    return;
  }
  try {
    const mediaInfo = new chrome.cast.media.MediaInfo(contentUrl, 'audio/mpeg');
    mediaInfo.streamType = chrome.cast.media.StreamType.LIVE;
    mediaInfo.metadata = new chrome.cast.media.MusicTrackMediaMetadata();
    mediaInfo.metadata.title = station.name;
    mediaInfo.metadata.artist = 'MyTuner';
    const request = new chrome.cast.media.LoadRequest(mediaInfo);
    muteTabletAudio(true);
    await session.loadMedia(request);
    castUi.contentUrl = contentUrl;
    muteTabletAudio(true);
    setCastVolume(state.volume / 10);
    flash(`CAST  ${station.name}`, true);
  } catch (e) {
    flash('CAST FAIL', true);
  }
}

async function toggleCast() {
  if (!castUi.ready) {
    flash('APRI IN CHROME', true);
    return;
  }
  const context = cast.framework.CastContext.getInstance();
  if (castUi.casting) {
    castUi.contentUrl = '';
    context.endCurrentSession(true);
    flash('CAST OFF', true);
    return;
  }
  if (!state.power || state.stopped) {
    flash('ACCENDI RADIO', true);
    return;
  }
  try {
    await context.requestSession();
    await syncCastMedia();
  } catch (e) {
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
  if (station && lock > 0.48) {
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
  const t0 = performance.now();
  const token = ++afcToken;
  engine.play(station.url);
  engine.setMix(0.2, 0.8);
  const step = (now) => {
    if (token !== afcToken) return;
    const t = Math.min(1, (now - t0) / 220);
    const e = t * t * (3 - 2 * t);
    const freq = from + (to - from) * e;
    if (state.band === 'fm') state.fm = freq;
    else state.am = freq;
    paintDial();
    if (t < 1) {
      requestAnimationFrame(step);
      return;
    }
    state.locked = station;
    if (audio.paused) engine.setMix(0, 1);
    else engine.setMix(1, 0);
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
  paintDial();
  persistFace();
  if (!state.power || state.stopped) return;
  if (state.auto) {
    const { station } = nearest();
    if (station) setFreq(station.freq, { jump: true });
    else settleTune();
    return;
  }
  settleTune();
}

let switchClickCtx = null;
function playSwitchClick() {
  try {
    switchClickCtx = switchClickCtx || new AudioContext();
    const ac = switchClickCtx;
    if (ac.state === 'suspended') ac.resume();
    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const filter = ac.createBiquadFilter();
    osc.type = 'square';
    osc.frequency.setValueAtTime(190, t0);
    osc.frequency.exponentialRampToValueAtTime(65, t0 + 0.045);
    filter.type = 'bandpass';
    filter.frequency.value = 850;
    filter.Q.value = 0.8;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.14, t0 + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.055);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + 0.07);
  } catch (e) { /* click non essenziale */ }
}

function setPower(on) {
  const was = state.power;
  state.power = on;
  state.stopped = false;
  radio.classList.toggle('is-on', on);
  radio.classList.remove('is-stopped');
  btnPower.setAttribute('aria-pressed', String(on));
  btnStop.setAttribute('aria-pressed', 'false');
  cancelAfc();
  if (was !== on) playSwitchClick();
  if (!on) {
    state.locked = null;
    engine.silence();
    engine.pause();
    try { audio.pause(); } catch (e) { /* ignore */ }
    if (castUi.casting) {
      try { cast.framework.CastContext.getInstance().endCurrentSession(true); } catch (e) { /* ignore */ }
    }
    paintDial();
    persistFace();
    return;
  }
  engine.start();
  engine.setVolume(state.volume / 10);
  engine.setTone(state.bass, state.treble);
  glass.classList.remove('flick');
  void glass.offsetWidth;
  glass.classList.add('flick');
  paintDial();
  settleTune();
  persistFace();
}

function toggleStop() {
  if (!state.power) return;
  state.stopped = !state.stopped;
  radio.classList.toggle('is-stopped', state.stopped);
  btnStop.setAttribute('aria-pressed', String(state.stopped));
  cancelAfc();
  if (state.stopped) {
    state.locked = null;
    engine.silence();
    engine.pause();
    if (castUi.casting) {
      try {
        const media = cast.framework.CastContext.getInstance().getCurrentSession()?.getMediaSession();
        media?.stop();
      } catch (e) { /* ignore */ }
    }
    paintStation();
    return;
  }
  if (castUi.casting) syncCastMedia();
  else settleTune();
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
  el.addEventListener('pointerdown', (event) => {
    cancelAfc();
    el.setPointerCapture(event.pointerId);
    last = pointerAngle(event, el);
    moved = false;
    el.classList.add('is-grab');
  });
  el.addEventListener('pointermove', (event) => {
    if (last == null || !el.hasPointerCapture(event.pointerId)) return;
    const angle = pointerAngle(event, el);
    let delta = angle - last;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    last = angle;
    if (Math.abs(delta) < 0.001) return;
    moved = true;
    onDelta(delta);
  });
  const end = () => {
    if (last == null) return;
    last = null;
    el.classList.remove('is-grab');
    if (onEnd) onEnd(moved);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
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
    if (state.band !== band) setBand(band);
    cancelAfc();
    dragging = true;
    lastX = event.clientX;
    el.setPointerCapture(event.pointerId);
    if (!state.auto) tuneFromX(el, event.clientX);
  });
  el.addEventListener('pointermove', (event) => {
    if (!dragging) return;
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

function drawScale(svg, { min, max, step, labels }) {
  const ns = 'http://www.w3.org/2000/svg';
  const width = 1000;
  const height = 52;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.replaceChildren();
  const xOf = (freq) => ((freq - min) / (max - min)) * width;
  for (let freq = min; freq <= max + 1e-6; freq += step) {
    const rounded = Math.round(freq * 10) / 10;
    const major = labels.some((label) => Math.abs(label - rounded) < step * 0.45);
    const x = xOf(rounded);
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', x);
    line.setAttribute('x2', x);
    line.setAttribute('y1', '0');
    line.setAttribute('y2', major ? '16' : '8');
    line.setAttribute('stroke', major ? '#d8fff8' : '#79d5cc');
    line.setAttribute('stroke-width', major ? '2.2' : '1.1');
    line.setAttribute('opacity', major ? '0.95' : '0.4');
    svg.appendChild(line);
    if (!major) continue;
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', '38');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#d7fff8');
    text.setAttribute('font-size', '20');
    text.setAttribute('font-family', 'Oswald, sans-serif');
    text.textContent = String(Math.round(rounded));
    svg.appendChild(text);
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
  const half = hz * 0.35;
  const i0 = clamp(Math.floor(((hz - half) / nyquist) * bins.length), 0, bins.length - 1);
  const i1 = clamp(Math.ceil(((hz + half) / nyquist) * bins.length), i0, bins.length - 1);
  let sum = 0;
  for (let i = i0; i <= i1; i += 1) sum += bins[i];
  const avg = sum / ((i1 - i0 + 1) * 255);
  return Math.pow(avg, 0.7);
}

function frame(now) {
  requestAnimationFrame(frame);
  if (!castUi.casting) engine.flutter(now);
  const powered = state.power && !state.stopped && !castUi.casting;
  if (engine.ready && powered) engine.analyser.getByteFrequencyData(engine.bins);
  for (let i = 0; i < SPEC.length; i += 1) {
    let level = powered ? 0.045 : 0;
    if (powered && engine.ready && engine.bins) {
      const heard = bandEnergy(engine.bins, SPEC[i].hz, engine.ctx.sampleRate);
      level = Math.max(0.045, Math.min(1, heard * 1.55));
    }
    peaks[i] = Math.max(level, peaks[i] * 0.97);
    fills[i].style.transform = `scaleY(${level})`;
    caps[i].style.bottom = `calc(${peaks[i] * 100}% - 2px)`;
  }
}

function placeVolumeNumbers() {
  for (let i = 0; i <= 10; i += 1) {
    const deg = -150 + (i / 10) * 300;
    const rad = (deg * Math.PI) / 180;
    const span = document.createElement('span');
    span.textContent = String(i);
    span.style.left = `${50 + Math.sin(rad) * 46}%`;
    span.style.top = `${50 - Math.cos(rad) * 46}%`;
    volNums.append(span);
  }
}

function ensurePlaying() {
  if (!state.power || state.stopped) return;
  // Durante Cast non riagganciare/ricaricare a ogni tocco: interrompeva Google Home
  if (castUi.casting) {
    muteTabletAudio(true);
    return;
  }
  if (engine.currentUrl && !audio.paused) return;
  settleTune();
}

function showLockedName() {
  const { station, dist } = nearest();
  state.locked = station && dist < bandSpec().win * 0.45 ? station : null;
  paintStation();
}

async function loadStations() {
  try {
    const response = await fetch('/api/stations');
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json();
    stations.fm = Array.isArray(data.fm) ? data.fm : [];
    stations.am = Array.isArray(data.am) ? data.am : [];
  } catch (e) {
    stations.fm = FALLBACK.fm;
    stations.am = FALLBACK.am;
  }
  if (!stations.fm.length) stations.fm = FALLBACK.fm;
  if (!stations.am.length) stations.am = FALLBACK.am;
  showLockedName();
  if (engine.ready && state.power && !state.stopped) settleTune();
}

document.addEventListener('pointerdown', (event) => {
  const turningOff = event.target.closest('#btnPower') && state.power;
  const stopping = event.target.closest('#btnStop') && state.power && !state.stopped;
  if (castUi.casting) {
    muteTabletAudio(true);
    if (turningOff || stopping) return;
    if (event.target.closest('#btnCast, #btnPower, #btnStop, #btnChUp, #btnChDown, #volKnob, #tuneKnob, .band-body')) return;
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
  if (castUi.casting) muteTabletAudio(true);
});

bindKnob(tuneKnob, (delta) => {
  if (state.auto) {
    autoAccum += delta;
    if (autoAccum > 0.42) {
      autoAccum = 0;
      stepStation(1);
    } else if (autoAccum < -0.42) {
      autoAccum = 0;
      stepStation(-1);
    }
    return;
  }
  const spec = bandSpec();
  setFreq(currentFreq() + (delta / (Math.PI * 2)) * spec.turn, { drag: true });
}, () => {
  autoAccum = 0;
  if (!state.auto) settleTune();
});

bindKnob(volKnob, (delta) => {
  const full = (300 * Math.PI) / 180;
  state.volume = clamp(state.volume + (delta / full) * 10, 0, 10);
  paintVolume();
  if (castUi.casting) {
    muteTabletAudio(true);
    setCastVolume(state.volume / 10);
  } else {
    engine.setVolume(state.volume / 10);
  }
}, () => persistFace());

bindKnob(bassKnob, (delta) => {
  const full = (270 * Math.PI) / 180;
  state.bass = clamp(state.bass + (delta / full) * 24, -12, 12);
  paintEq();
  engine.setTone(state.bass, state.treble);
}, (moved) => {
  if (moved && Math.abs(state.bass) < 0.6) {
    state.bass = 0;
    paintEq();
    engine.setTone(state.bass, state.treble);
  }
  persistFace();
});

bindKnob(trebleKnob, (delta) => {
  const full = (270 * Math.PI) / 180;
  state.treble = clamp(state.treble + (delta / full) * 24, -12, 12);
  paintEq();
  engine.setTone(state.bass, state.treble);
}, (moved) => {
  if (moved && Math.abs(state.treble) < 0.6) {
    state.treble = 0;
    paintEq();
    engine.setTone(state.bass, state.treble);
  }
  persistFace();
});

for (const scale of document.querySelectorAll('.band-body')) bindScale(scale);

tuneKnob.addEventListener('wheel', (event) => {
  event.preventDefault();
  engine.start();
  const dir = Math.sign(event.deltaY || event.deltaX);
  if (!dir) return;
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
  state.volume = clamp(state.volume - dir * 0.25, 0, 10);
  paintVolume();
  if (castUi.casting) {
    muteTabletAudio(true);
    setCastVolume(state.volume / 10);
  } else {
    engine.start();
    engine.setVolume(state.volume / 10);
  }
  persistFace();
}, { passive: false });

btnPower.addEventListener('click', (event) => {
  if (event.target.closest('.rocker-half.on')) setPower(true);
  else if (event.target.closest('.rocker-half.off')) setPower(false);
  else setPower(!state.power);
});
btnStop.addEventListener('click', () => toggleStop());
btnCast?.addEventListener('click', () => toggleCast());
document.getElementById('btnChUp')?.addEventListener('click', () => {
  engine.start();
  stepStation(1);
});
document.getElementById('btnChDown')?.addEventListener('click', () => {
  engine.start();
  stepStation(-1);
});
btnBand.addEventListener('click', () => setBand(state.band === 'fm' ? 'am' : 'fm'));
btnMono.addEventListener('click', () => {
  engine.start();
  engine.setMono(state.stereo);
  paintModes();
  persistFace();
  ensurePlaying();
});
btnAuto.addEventListener('click', () => {
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
    toggleStop();
  } else if (event.key === 'p' || event.key === 'P') {
    setPower(!state.power);
  } else if (event.key === 'b' || event.key === 'B') {
    setBand(state.band === 'fm' ? 'am' : 'fm');
  } else if (event.key === 'm' || event.key === 'M') {
    engine.start();
    engine.setMono(state.stereo);
    paintModes();
    persistFace();
  } else if (event.key === 'a' || event.key === 'A') {
    btnAuto.click();
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
  labels: [88, 92, 96, 100, 104, 108]
});
drawScale(document.getElementById('scaleAm'), {
  min: AM.min,
  max: AM.max,
  step: 10,
  labels: [530, 700, 900, 1100, 1300, 1500, 1600]
});

placeVolumeNumbers();
buildSpectrum();
paintVolume();
paintEq();
paintModes();
paintDial();
radio.classList.toggle('is-on', state.power);
paintCast();
if (window.__castApiAvailable) initCast();
window.addEventListener('cast-api', () => {
  if (window.__castApiAvailable) initCast();
});
requestAnimationFrame(frame);
loadStations();
