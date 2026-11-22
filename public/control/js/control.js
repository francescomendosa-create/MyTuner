const pairPanel = document.getElementById('pairPanel');
const radioList = document.getElementById('radioList');
const pairStatus = document.getElementById('pairStatus');
const btnScan = document.getElementById('btnScan');
const btnPurge = document.getElementById('btnPurge');
const btnConnect = document.getElementById('btnConnect');
const btnPairClose = document.getElementById('btnPairClose');
const btnDisconnect = document.getElementById('btnDisconnect');
const btnPower = document.getElementById('btnPower');
const btnPause = document.getElementById('btnPause');
const btnBand = document.getElementById('btnBand');
const btnStereo = document.getElementById('btnStereo');
const btnAuto = document.getElementById('btnAuto');
const btnView = document.getElementById('btnView');
const btnCast = document.getElementById('btnCast');
const btnCastSheet = document.getElementById('btnCastSheet');
const castSheet = document.getElementById('castSheet');
const castSheetList = document.getElementById('castSheetList');
const castSheetEmpty = document.getElementById('castSheetEmpty');
const castSheetHint = document.getElementById('castSheetHint');
const stationBrowser = document.getElementById('stationBrowser');
const stationGridRadio = document.getElementById('stationGridRadio');
const stationGridTv = document.getElementById('stationGridTv');
const stationBrowserTitle = document.getElementById('stationBrowserTitle');
const btnSettings = document.getElementById('btnSettings');
const STATIONS_CACHE_KEY = 'mytuner-remote-stations-v1';
let stationBrowserMode = ''; /* '' | 'radio' | 'tv' */
let stationBrowserCache = loadStationsCache();
let stationsSyncRequested = false;
let stationsSyncTimer = null;
let activeStationName = '';

function loadStationsCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(STATIONS_CACHE_KEY) || 'null');
    return {
      radio: Array.isArray(raw?.radio) ? raw.radio : [],
      tv: Array.isArray(raw?.tv) ? raw.tv : []
    };
  } catch (e) {
    return { radio: [], tv: [] };
  }
}
const btnZoomL = document.getElementById('btnZoomL');
const btnZoomR = document.getElementById('btnZoomR');
const labBand = document.getElementById('labBand');
const labStereo = document.getElementById('labStereo');
const labAuto = document.getElementById('labAuto');
const labView = document.getElementById('labView');
const tuneWrap = document.getElementById('tuneWrap');
const tuneLab = document.getElementById('tuneLab');
const tuneWheel = document.getElementById('tuneWheel');
const tuneRing = document.getElementById('tuneRing');
const btnRemoteBack = document.getElementById('btnRemoteBack');
const pillRow = document.querySelector('.pill-row');
const volStrip = document.getElementById('volStrip');
const volTrack = document.getElementById('volTrack');
const volFill = document.getElementById('volFill');
const volThumb = document.getElementById('volThumb');
const btnVolDown = document.getElementById('btnVolDown');
const btnVolUp = document.getElementById('btnVolUp');

let ws = null;
let selectedId = '';
let selectedName = '';
let reconnectTimer = 0;
let lastState = null;
let localVolume = 5;
let volDrag = null;
let lastVolSent = -1;
let volHoldTimer = 0;
let volHoldDir = 0;
let tuneRot = 0;
let tuneDrag = null;
let tuneAcc = 0;
let tickAcc = 0;
let tuneMovedFlag = false;
let clickCtx = null;
let lastRatchetAt = 0;

function playTuneRatchet() {
  try {
    const now = performance.now();
    if (now - lastRatchetAt < 18) return;
    lastRatchetAt = now;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!clickCtx) clickCtx = new AC();
    if (clickCtx.state === 'suspended') clickCtx.resume().catch(() => {});
    const ac = clickCtx;
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
    gain.gain.setValueAtTime(0.045, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.014);
    src.connect(bp);
    bp.connect(hp);
    hp.connect(gain);
    gain.connect(ac.destination);
    src.start(t0);
    src.stop(t0 + 0.016);
  } catch (e) { /* click non essenziale */ }
}

function wsUrl() {
  const u = new URL('/api/remote/ws', location.origin);
  u.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  u.searchParams.set('role', 'control');
  if (selectedId) u.searchParams.set('target', selectedId);
  return u.toString();
}

function setStatus(text) {
  if (pairStatus) pairStatus.textContent = text;
}

function paintConnect() {
  if (!btnConnect) return;
  btnConnect.classList.remove('is-on', 'is-off', 'is-warn');
  if (selectedId && ws?.readyState === WebSocket.OPEN) {
    btnConnect.classList.add('is-on');
  } else if (ws?.readyState === WebSocket.OPEN) {
    btnConnect.classList.add('is-warn');
  } else {
    btnConnect.classList.add('is-off');
  }
}

function openPair(on) {
  pairPanel?.classList.toggle('is-hidden', !on);
  if (on) {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'list' }));
    else connect();
  }
}

const STICKY_RADIO_KEY = 'mytuner-control-sticky-radio';

function loadStickyRadio() {
  try {
    const raw = localStorage.getItem(STICKY_RADIO_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw);
    if (!r?.id && !r?.name) return null;
    return r;
  } catch (e) {
    return null;
  }
}

function saveStickyRadio(r) {
  if (!r?.id && !r?.name) return;
  try {
    localStorage.setItem(STICKY_RADIO_KEY, JSON.stringify({
      id: r.id || '',
      name: r.name || 'MyTuner',
      kind: r.kind || 'device',
      standby: true,
      live: false,
      push: Boolean(r.push)
    }));
  } catch (e) { /* ignore */ }
}

function clearStickyRadio() {
  try { localStorage.removeItem(STICKY_RADIO_KEY); } catch (e) { /* ignore */ }
}

function normalizeRadioName(n) {
  return String(n || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/* Preferisci id stabile; se cambia, riconnetti per nome (ultimo usato). */
function findStickyInList(list) {
  const sticky = loadStickyRadio();
  if (!sticky || !Array.isArray(list) || !list.length) return null;
  if (sticky.id) {
    const byId = list.find((r) => r && r.id === sticky.id);
    if (byId) return byId;
  }
  const want = normalizeRadioName(sticky.name);
  if (!want) return null;
  return list.find((r) => normalizeRadioName(r?.name) === want) || null;
}

function tryAutoLinkSticky(list) {
  const merged = Array.isArray(list) ? list : [];
  if (!merged.length) return false;
  /* Già collegati a una radio presente in lista */
  if (selectedId && merged.some((r) => r.id === selectedId)) {
    paintConnect();
    return true;
  }
  const match = findStickyInList(merged);
  if (!match?.id) return false;
  selectedId = match.id;
  selectedName = match.name || 'MyTuner';
  saveStickyRadio(match);
  paintConnect();
  if (ws?.readyState === WebSocket.OPEN) {
    try { ws.send(JSON.stringify({ type: 'select', target: selectedId })); } catch (e) { /* ignore */ }
  }
  if (match.state) paintState(match.state);
  setStatus(`Collegato a ${selectedName}`);
  return true;
}

function paintRadios(list) {
  if (!radioList) return;
  /* Solo lista hub: niente fantasmi locali che moltiplicano MyTuner */
  const merged = Array.isArray(list) ? list.slice() : [];
  radioList.replaceChildren();
  if (!merged.length) {
    setStatus('Nessuna radio in linea');
    return;
  }
  const linked = tryAutoLinkSticky(merged);
  setStatus(linked
    ? `Collegato a ${selectedName || 'MyTuner'}`
    : `${merged.length} radio trovata/e`);
  for (const r of merged) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    const online = selectedId && r.id === selectedId;
    const live = r.live === true;
    const standby = Boolean(r.standby) || !live;
    const shortId = String(r.id || '').slice(-4).toUpperCase();
    btn.innerHTML = '<div class="name"></div><div class="meta"></div>';
    const title = r.native
      ? `${r.name || 'MyTuner'} ★ APK`
      : (r.name || 'MyTuner');
    btn.querySelector('.name').textContent = title;
    if (r.native) btn.classList.add('is-native');
    if (online) btn.classList.add('is-selected');
    let meta = shortId ? `#${shortId}` : (r.kind || 'dispositivo');
    if (online) meta += ' · collegata';
    if (live) meta += ' · in linea';
    else if (standby) meta += ' · standby';
    if (r.push && !r.native) meta += ' · push';
    btn.querySelector('.meta').textContent = meta;
    btn.addEventListener('click', () => selectRadio(r));
    li.append(btn);
    radioList.append(li);
  }
}

function paintSettingsMode(on, { alarming = false } = {}) {
  const open = Boolean(on) && !alarming;
  tuneWrap?.classList.toggle('is-settings', open);
  btnPause?.classList.toggle('is-enter', open);
  btnRemoteBack?.classList.toggle('is-hidden', !open);
  pillRow?.classList.toggle('has-back', open);
  if (tuneLab) {
    if (alarming) tuneLab.textContent = 'SVEGLIA';
    else tuneLab.textContent = open ? 'MENU' : 'TUNING';
  }
  if (btnPause) {
    if (alarming) btnPause.setAttribute('aria-label', 'Taci sveglia');
    else btnPause.setAttribute('aria-label', open ? 'Enter' : 'Pausa o play');
    if (open) btnPause.setAttribute('data-act', 'pause'); /* enter via handleAct */
  }
  if (!open) clearTuneTilt();
}

function clearTuneTilt() {
  tuneWheel?.classList.remove('is-tilt-u', 'is-tilt-d', 'is-tilt-l', 'is-tilt-r');
  tuneWheel?.querySelectorAll('.dir.is-lit').forEach((el) => el.classList.remove('is-lit'));
}

function setTuneTiltFromAct(act) {
  clearTuneTilt();
  const map = {
    nav_up: 'is-tilt-u',
    nav_down: 'is-tilt-d',
    nav_left: 'is-tilt-l',
    nav_right: 'is-tilt-r'
  };
  const cls = map[act];
  if (cls) tuneWheel?.classList.add(cls);
  const btn = tuneWheel?.querySelector(`.dir[data-act="${act}"]`);
  btn?.classList.add('is-lit');
}

function paintDualLab(root, active) {
  if (!root) return;
  root.querySelectorAll('[data-v]').forEach((span) => {
    span.classList.toggle('is-on', span.getAttribute('data-v') === active);
  });
}

function applyRemoteSkin(skin) {
  const remote = document.getElementById('remotePanel');
  const stage = document.getElementById('app');
  if (!remote) return;
  [...remote.classList].forEach((cls) => {
    if (cls.startsWith('skin-')) remote.classList.remove(cls);
  });
  if (stage) {
    [...stage.classList].forEach((cls) => {
      if (cls.startsWith('skin-')) stage.classList.remove(cls);
    });
  }
  const id = String(skin || '').trim();
  if (!id) return;
  remote.classList.add(`skin-${id}`);
  stage?.classList.add(`skin-${id}`);
}

function paintState(st) {
  if (!st) return;
  lastState = st;
  syncCurtainFromState(st);
  const powered = Boolean(st.power);
  const paused = powered && Boolean(st.stopped);
  const playing = powered && !st.stopped;
  const settingsOpen = Boolean(st.settingsOpen);
  const alarming = Boolean(st.alarmRinging);
  const zoom = String(st.panelZoom || '');
  applyRemoteSkin(st.skin);
  btnPower?.classList.toggle('is-on', powered);
  btnPower?.classList.toggle('is-off', !powered);
  btnPause?.classList.toggle('is-alarm', alarming);
  btnPause?.classList.toggle('is-down', !settingsOpen && !alarming && paused);
  btnPause?.classList.toggle('is-play', !settingsOpen && !alarming && playing);
  btnBand?.classList.toggle('is-on', st.band === 'am');
  btnStereo?.classList.toggle('is-on', Boolean(st.stereo));
  btnAuto?.classList.toggle('is-on', Boolean(st.auto));
  btnView?.classList.toggle('is-on', st.viewMode === 'video');
  const castOpen = Boolean(st.castPickerOpen || st.castArming);
  const castingOn = Boolean(st.casting || st.castPending);
  btnCast?.classList.toggle('is-on', Boolean(castingOn || castOpen));
  btnCast?.classList.toggle('is-casting', castingOn);
  btnCastSheet?.classList.toggle('is-on', Boolean(castingOn || castOpen));
  btnCastSheet?.classList.toggle('is-casting', castingOn);
  btnSettings?.classList.toggle('is-on', settingsOpen);
  btnZoomL?.classList.toggle('is-on', zoom === 'dial');
  btnZoomR?.classList.toggle('is-on', zoom === 'spec' || zoom === 'tv');
  paintDualLab(labBand, st.band === 'am' ? 'am' : 'fm');
  paintDualLab(labStereo, st.stereo ? 'st' : 'mo');
  paintDualLab(labAuto, st.auto ? 'auto' : 'man');
  paintDualLab(labView, st.viewMode === 'video' ? 'tv' : 'radio');
  paintSettingsMode(settingsOpen, { alarming });
  if (typeof st.volume === 'number' && !volDrag && !volHoldDir) paintVolumeUI(st.volume);
  paintCastSheet(st);
  markActiveStation(st.station);
  /* Prima volta: niente elenco in memoria → scaricalo una sola volta */
  if (!stationsSyncRequested && !stationBrowserCache.radio.length && !stationBrowserCache.tv.length) {
    requestStationsSync();
  }
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paintCastSheet(st) {
  if (!castSheet) return;
  const open = Boolean(st?.castPickerOpen || st?.castArming);
  castSheet.classList.toggle('is-hidden', !open);
  castSheet.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (!open) return;
  const routes = Array.isArray(st?.castRoutes) ? st.castRoutes : [];
  if (castSheetHint) {
    castSheetHint.textContent = st?.casting
      ? 'In Cast · ripremi CAST per spegnere'
      : 'Scegli una cassa · ripremi CAST per chiudere';
  }
  if (!routes.length) {
    if (castSheetList) castSheetList.innerHTML = '';
    castSheetEmpty?.classList.remove('is-hidden');
    if (castSheetEmpty) {
      castSheetEmpty.textContent = st?.casting ? 'Collegato' : 'Cerca dispositivi…';
    }
    return;
  }
  castSheetEmpty?.classList.add('is-hidden');
  if (!castSheetList) return;
  castSheetList.innerHTML = routes.map((r, i) => {
    const sel = Boolean(r.selected) || i === Number(st.castFocus);
    const group = Boolean(r.group);
    const sub = r.connecting
      ? 'Connessione…'
      : (r.selected ? 'Selezionato' : (group ? 'Gruppo' : (r.description || 'Chromecast')));
    /* div (non button): su iOS i button bloccano lo scroll della lista */
    return `<div class="cast-sheet-item${sel ? ' is-selected' : ''}${group ? ' is-group' : ''}" data-cast-id="${escapeHtml(r.id)}" role="option" aria-selected="${sel ? 'true' : 'false'}" tabindex="0">
      <span class="cast-sheet-ico" aria-hidden="true"></span>
      <span class="cast-sheet-meta">
        <span class="cast-sheet-name">${escapeHtml(r.name || 'Cast')}</span>
        <span class="cast-sheet-sub">${escapeHtml(sub)}</span>
      </span>
    </div>`;
  }).join('');
}

function sendCmd(action, value) {
  if (!ws || ws.readyState !== WebSocket.OPEN || !selectedId) return;
  ws.send(JSON.stringify({ type: 'cmd', target: selectedId, action, value }));
}

function selectRadio(r) {
  selectedId = r.id;
  selectedName = r.name || 'MyTuner';
  saveStickyRadio(r);
  paintConnect();
  openPair(false);
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'select', target: selectedId }));
    /* Niente wake/FCM al semplice select: solo link */
  } else {
    connect();
  }
  if (r.state) paintState(r.state);
}

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'list' }));
      if (selectedId) ws.send(JSON.stringify({ type: 'select', target: selectedId }));
      paintConnect();
    }
    return;
  }
  setStatus('Connessione…');
  paintConnect();
  ws = new WebSocket(wsUrl());
  ws.addEventListener('open', () => {
    setStatus('In linea');
    paintConnect();
    ws.send(JSON.stringify({ type: 'list' }));
    if (selectedId) {
      ws.send(JSON.stringify({ type: 'select', target: selectedId }));
      /* Niente wake automatico a ogni reconnect (causava loop notifiche) */
    }
  });
  ws.addEventListener('message', (event) => {
    let data = null;
    try { data = JSON.parse(String(event.data || '')); } catch (e) { return; }
    if (!data) return;
    if (data.type === 'radios') paintRadios(data.radios || []);
    if (data.type === 'state' && (!selectedId || data.id === selectedId)) paintState(data.state);
    if (data.type === 'stations' && (!selectedId || data.id === selectedId)) onStationsReceived(data);
    if (data.type === 'settings' && (!selectedId || data.id === selectedId)) onSettingsReceived(data);
    if (data.type === 'error' || data.type === 'info') setStatus(data.message || 'Errore');
  });
  ws.addEventListener('close', () => {
    setStatus('Riconnessione…');
    paintConnect();
    window.clearTimeout(reconnectTimer);
    reconnectTimer = window.setTimeout(connect, 1200);
  });
}

function clampVol(v) {
  return Math.max(0, Math.min(10, Number(v) || 0));
}

function paintVolumeUI(v) {
  localVolume = clampVol(v);
  const pct = (localVolume / 10) * 100;
  if (volFill) volFill.style.width = `${pct}%`;
  if (volThumb) volThumb.style.left = `${pct}%`;
  volStrip?.setAttribute('aria-valuenow', localVolume.toFixed(1));
}

const VOL_NUDGE = 0.1; /* tap singolo (scala 0–10) */
const VOL_HOLD_STEP = 0.06; /* tenuta premuto */
const VOL_HOLD_DELAY = 280;
const VOL_HOLD_MS = 45;

function stopVolHold() {
  const wasHold = Boolean(volHoldDir);
  window.clearTimeout(volHoldTimer);
  volHoldTimer = 0;
  volHoldDir = 0;
  if (wasHold) releaseVolCurtain();
}

function nudgeVolume(dir, step = VOL_NUDGE) {
  const next = clampVol(localVolume + dir * step);
  if (Math.abs(next - localVolume) < 0.001) return;
  paintVolumeUI(next);
  lastVolSent = next;
  showCurtainForVolume();
  /* vol_set assoluto: la rondella radio segue in continuo mentre tieni premuto */
  sendCmd('vol_set', Number(next.toFixed(2)));
}

function startVolHold(dir) {
  stopVolHold();
  volHoldDir = dir;
  nudgeVolume(dir, VOL_NUDGE);
  const tick = () => {
    if (volHoldDir !== dir) return;
    nudgeVolume(dir, VOL_HOLD_STEP);
    if (localVolume <= 0 || localVolume >= 10) {
      stopVolHold();
      return;
    }
    volHoldTimer = window.setTimeout(tick, VOL_HOLD_MS);
  };
  volHoldTimer = window.setTimeout(tick, VOL_HOLD_DELAY);
}

function onVolBtnDown(event, dir) {
  if (event.button != null && event.button !== 0) return;
  event.preventDefault();
  try { event.currentTarget?.setPointerCapture?.(event.pointerId); } catch (e) { /* ignore */ }
  startVolHold(dir);
}

function onVolBtnUp(event) {
  if (event.pointerType === 'mouse' && event.button != null && event.button !== 0) return;
  stopVolHold();
}

function volumeFromClientX(clientX) {
  if (!volTrack) return localVolume;
  const r = volTrack.getBoundingClientRect();
  if (r.width <= 0) return localVolume;
  const t = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  return Math.round(t * 100) / 10; /* 0.0 … 10.0 a decimi */
}

function sendVolSet(v, force) {
  const next = clampVol(v);
  paintVolumeUI(next);
  showCurtainForVolume();
  if (!force && Math.abs(next - lastVolSent) < 0.05) return;
  lastVolSent = next;
  sendCmd('vol_set', Number(next.toFixed(1)));
}

function onVolDown(event) {
  if (event.button != null && event.button !== 0) return;
  if (event.target.closest('.vol-end')) return;
  event.preventDefault();
  volDrag = { id: event.pointerId };
  volTrack?.classList.add('is-drag');
  try { volTrack?.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ }
  sendVolSet(volumeFromClientX(event.clientX), true);
}

function onVolMove(event) {
  if (!volDrag || event.pointerId !== volDrag.id) return;
  event.preventDefault();
  sendVolSet(volumeFromClientX(event.clientX), false);
}

function onVolUp(event) {
  if (!volDrag || event.pointerId !== volDrag.id) return;
  sendVolSet(volumeFromClientX(event.clientX), true);
  volDrag = null;
  volTrack?.classList.remove('is-drag');
  releaseVolCurtain();
}

function handleAct(act) {
  const castPick = Boolean(lastState?.castPending || lastState?.castArming || lastState?.castPickerOpen);
  const settingsOpen = Boolean(lastState?.settingsOpen);
  const alarming = Boolean(lastState?.alarmRinging);
  /* Sveglia che suona: il centro tacita subito (priorità su menu/enter) */
  if (act === 'pause' && alarming) {
    if (lastState) lastState.alarmRinging = false;
    paintState(lastState || { alarmRinging: false });
    sendCmd('pause');
    return;
  }
  if (act === 'settings') {
    const next = !settingsOpen;
    if (lastState) lastState.settingsOpen = next;
    else lastState = { settingsOpen: next };
    btnSettings?.classList.toggle('is-on', next);
    paintSettingsMode(next, { alarming: Boolean(lastState?.alarmRinging) });
    sendCmd('settings');
    return;
  }
  if (settingsOpen) {
    if (act === 'settings_back') {
      sendCmd('settings_back');
      return;
    }
    if (act === 'nav_left' || act === 'ch_down') {
      sendCmd('settings_nav', 'left');
      return;
    }
    if (act === 'nav_right' || act === 'ch_up') {
      sendCmd('settings_nav', 'right');
      return;
    }
    if (act === 'nav_up') {
      sendCmd('settings_nav', 'up');
      return;
    }
    if (act === 'nav_down') {
      sendCmd('settings_nav', 'down');
      return;
    }
    if (act === 'pause') {
      sendCmd('settings_enter');
      return;
    }
  }
  if (act === 'nav_up') {
    if (castPick) sendCmd('cast_nav', 'up');
    else {
      showCurtainForSeek();
      sendCmd('tune_up');
    }
    return;
  }
  if (act === 'nav_down') {
    if (castPick) sendCmd('cast_nav', 'down');
    else {
      showCurtainForSeek();
      sendCmd('tune_down');
    }
    return;
  }
  if (act === 'nav_left') {
    if (castPick) sendCmd('cast_nav', 'left');
    else {
      showCurtainForSeek();
      sendCmd('ch_down');
    }
    return;
  }
  if (act === 'nav_right') {
    if (castPick) sendCmd('cast_nav', 'right');
    else {
      showCurtainForSeek();
      sendCmd('ch_up');
    }
    return;
  }
  /* Power esplicito on/off: evita FCM/sveglia sullo spegnimento */
  if (act === 'power') {
    const nextOn = !Boolean(lastState?.power);
    if (!lastState) lastState = {};
    lastState.power = nextOn;
    paintState(lastState);
    sendCmd('power', nextOn ? 'on' : 'off');
    return;
  }
  if (act === 'exit') {
    if (lastState) lastState.power = false;
    paintState(lastState || { power: false });
    sendCmd('exit');
    return;
  }
  if (act === 'cast') {
    /*
      - lista aperta → chiudi senza scegliere
      - già in Cast → spegni Cast (audio torna allo stereo), come sul tablet
      - altrimenti → apri lista casse
    */
    if (lastState?.casting && !lastState?.castPickerOpen && !lastState?.castArming) {
      lastState.casting = false;
      lastState.castPending = false;
      paintState(lastState);
    }
    sendCmd('cast');
    return;
  }
  if (act === 'ch_up' || act === 'ch_down') showCurtainForSeek();
  sendCmd(act);
}

function selectCastRoute(id) {
  const want = String(id || '');
  if (!want) return;
  sendCmd('cast_select', want);
  /* Optimistic: chiudi il foglio e lascia CAST acceso (come sullo stereo) */
  if (lastState) {
    lastState.castPickerOpen = false;
    lastState.castArming = false;
    lastState.castPending = true;
    lastState.casting = true;
    paintState(lastState);
  }
}

function angleAt(clientX, clientY) {
  const r = tuneWheel.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  return Math.atan2(clientY - cy, clientX - cx);
}

function setTuneVisual(deg) {
  tuneRot = deg;
  if (tuneRing) tuneRing.style.setProperty('--tune-rot', `${deg}deg`);
}

function onTuneDown(event) {
  /* Solo il centro play/pausa è escluso: si gira da tutta la corona (anche sulle frecce) */
  if (event.target.closest('.tune-core')) return;
  const dirBtn = event.target.closest('.dir');
  const dirAct = dirBtn?.getAttribute('data-act') || '';
  if (dirAct) setTuneTiltFromAct(dirAct);

  /* Impostazioni aperte: frecce = nav, swipe orizzontale = avanti/indietro pagine */
  if (lastState?.settingsOpen) {
    event.preventDefault();
    if (dirAct) {
      tuneMovedFlag = true;
      handleAct(dirAct);
      window.setTimeout(() => { tuneMovedFlag = false; }, 80);
    }
    try { tuneWheel.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ }
    tuneDrag = {
      id: event.pointerId,
      settingsOnly: true,
      fromDir: Boolean(dirBtn),
      x0: event.clientX,
      y0: event.clientY,
      axis: null,
      swiped: false
    };
    return;
  }

  event.preventDefault();
  const a0 = angleAt(event.clientX, event.clientY);
  tuneMovedFlag = false;
  tuneDrag = {
    id: event.pointerId,
    last: a0,
    moved: false,
    fromDir: Boolean(dirBtn),
    total: 0,
    tickSteps: 0
  };
  tuneAcc = 0;
  tickAcc = 0;
  tunePendingDeg = 0;
  try { clickCtx?.resume?.(); } catch (e) { /* ignore */ }
  try { tuneWheel.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ }
}

/*
  Rullo continuo: ogni grado sposta la frequenza della radio (tune_drag),
  al rilascio la radio scorre fino alla stazione e si aggancia (tune_release).
  Stessa scala della radio: FM 0.02 MHz/grado, AM 1 kHz/grado.
*/
const TUNE_TICK_DEG = 8;
const TUNE_SEND_MS = 30;
const TUNE_FM_PER_DEG = 0.02;
const TUNE_AM_PER_DEG = 1;
const BAND_LIMITS = { fm: { min: 87.5, max: 108 }, am: { min: 520, max: 1620 } };
let tunePendingDeg = 0;
let tuneSendTimer = 0;
let tuneLastSendAt = 0;

function flushTuneDrag() {
  window.clearTimeout(tuneSendTimer);
  tuneSendTimer = 0;
  if (Math.abs(tunePendingDeg) < 0.01) return;
  const deg = tunePendingDeg;
  tunePendingDeg = 0;
  tuneLastSendAt = performance.now();
  sendCmd('tune_drag', Number(deg.toFixed(2)));
}

function queueTuneDrag(deg) {
  tunePendingDeg += deg;
  if (tuneSendTimer) return;
  const wait = TUNE_SEND_MS - (performance.now() - tuneLastSendAt);
  if (wait <= 0) flushTuneDrag();
  else tuneSendTimer = window.setTimeout(flushTuneDrag, wait);
}

function playTuneTicks() {
  if (!tuneDrag) return;
  const tickWant = Math.trunc(tuneDrag.total / TUNE_TICK_DEG);
  while (tuneDrag.tickSteps < tickWant) {
    tuneDrag.tickSteps += 1;
    playTuneRatchet();
  }
  while (tuneDrag.tickSteps > tickWant) {
    tuneDrag.tickSteps -= 1;
    playTuneRatchet();
  }
}

/* Tendina: frequenza (rullo/CH) oppure volume (+/− / slider) */
const freqCurtain = document.getElementById('freqCurtain');
const freqCurtainVal = document.getElementById('freqCurtainVal');
const freqCurtainUnit = document.getElementById('freqCurtainUnit');
const freqCurtainName = document.getElementById('freqCurtainName');
let curtainMode = 'freq'; /* 'freq' | 'vol' */
let curtainBand = 'fm';
let curtainFreq = null;
let curtainHideTimer = 0;
let curtainHolding = false;
let curtainLockedAt = 0;
let curtainReleasedAt = 0;

function curtainFreqFromState(st) {
  const band = st?.band === 'am' ? 'am' : 'fm';
  const f = Number(band === 'am' ? st?.am : st?.fm);
  return { band, freq: Number.isFinite(f) ? f : null };
}

function paintCurtain(name) {
  if (!freqCurtainVal) return;
  if (curtainMode === 'vol') {
    freqCurtainVal.textContent = localVolume.toFixed(1);
    if (freqCurtainUnit) freqCurtainUnit.textContent = '';
    if (freqCurtainName) freqCurtainName.textContent = '';
    return;
  }
  if (curtainFreq == null) return;
  if (curtainBand === 'am') {
    freqCurtainVal.textContent = String(Math.round(curtainFreq));
    if (freqCurtainUnit) freqCurtainUnit.textContent = 'kHz';
  } else {
    freqCurtainVal.textContent = curtainFreq.toFixed(1);
    if (freqCurtainUnit) freqCurtainUnit.textContent = 'MHz';
  }
  if (freqCurtainName && name !== undefined) freqCurtainName.textContent = name || '';
}

function openCurtain() {
  window.clearTimeout(curtainHideTimer);
  curtainHideTimer = 0;
  curtainMode = 'freq';
  curtainHolding = true;
  const { band, freq } = curtainFreqFromState(lastState);
  curtainBand = band;
  if (freq != null) curtainFreq = freq;
  paintCurtain('');
  freqCurtain?.classList.add('is-open');
}

function nudgeCurtain(deg) {
  if (curtainMode !== 'freq' || curtainFreq == null) return;
  const lim = BAND_LIMITS[curtainBand];
  const per = curtainBand === 'am' ? TUNE_AM_PER_DEG : TUNE_FM_PER_DEG;
  curtainFreq = Math.max(lim.min, Math.min(lim.max, curtainFreq + deg * per));
  paintCurtain('');
}

function hideCurtainIn(ms) {
  window.clearTimeout(curtainHideTimer);
  curtainHideTimer = window.setTimeout(() => {
    curtainHideTimer = 0;
    freqCurtain?.classList.remove('is-open');
  }, ms);
}

function releaseCurtain() {
  curtainHolding = false;
  curtainLockedAt = 0;
  curtainReleasedAt = performance.now();
  /* Resta giù mentre la radio scorre e aggancia; tetto massimo se lo stato non arriva */
  hideCurtainIn(2600);
}

/* Tasto +/− / CH: scende subito, segue lo scorrimento reale, risale all’aggancio */
function showCurtainForSeek() {
  window.clearTimeout(curtainHideTimer);
  curtainHideTimer = 0;
  curtainMode = 'freq';
  curtainHolding = false;
  curtainLockedAt = 0;
  curtainReleasedAt = performance.now();
  const { band, freq } = curtainFreqFromState(lastState);
  curtainBand = band;
  if (freq != null) curtainFreq = freq;
  paintCurtain('');
  freqCurtain?.classList.add('is-open');
  hideCurtainIn(2600);
}

function showCurtainForVolume() {
  curtainMode = 'vol';
  curtainHolding = true;
  window.clearTimeout(curtainHideTimer);
  curtainHideTimer = 0;
  paintCurtain();
  freqCurtain?.classList.add('is-open');
}

function releaseVolCurtain() {
  if (curtainMode !== 'vol') return;
  curtainHolding = false;
  hideCurtainIn(900);
}

/* Dopo il rilascio la tendina segue la frequenza reale della radio (scorrimento + aggancio) */
function syncCurtainFromState(st) {
  if (curtainMode !== 'freq') return;
  if (curtainHolding || !freqCurtain?.classList.contains('is-open')) return;
  const { band, freq } = curtainFreqFromState(st);
  if (freq == null) return;
  curtainBand = band;
  curtainFreq = freq;
  paintCurtain(st?.station || '');
  /* Nome stazione presente = radio agganciata (durante lo scorrimento è vuoto) */
  if (st?.station && !curtainLockedAt && performance.now() - curtainReleasedAt > 250) {
    curtainLockedAt = performance.now();
    hideCurtainIn(700);
  }
}

function onTuneMove(event) {
  if (!tuneDrag || event.pointerId !== tuneDrag.id) return;
  if (tuneDrag.settingsOnly) {
    if (tuneDrag.fromDir || tuneDrag.swiped) return;
    event.preventDefault();
    const dx = event.clientX - tuneDrag.x0;
    const dy = event.clientY - tuneDrag.y0;
    if (!tuneDrag.axis) {
      if (Math.abs(dx) < 14 && Math.abs(dy) < 14) return;
      tuneDrag.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    }
    if (tuneDrag.axis !== 'x') return;
    if (Math.abs(dx) < 48) return;
    tuneDrag.swiped = true;
    tuneMovedFlag = true;
    /* Dito a destra = indietro; dito a sinistra = avanti (come sulla radio) */
    if (dx > 0) sendCmd('settings_back');
    else sendCmd('settings_forward');
    return;
  }
  event.preventDefault();
  const a = angleAt(event.clientX, event.clientY);
  let d = a - tuneDrag.last;
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  tuneDrag.last = a;
  const deg = d * (180 / Math.PI);
  setTuneVisual(tuneRot + deg);
  tuneDrag.total += deg;
  if (Math.abs(deg) > 0.01) tuneDrag.lastDir = deg > 0 ? 1 : -1;
  if (!tuneDrag.moved) {
    /* Partendo da una freccia serve un minimo di giro, così il tap resta un tap */
    const gate = tuneDrag.fromDir ? 2 : 0.3;
    if (Math.abs(tuneDrag.total) < gate) return;
    tuneDrag.moved = true;
    tuneMovedFlag = true;
    openCurtain();
    nudgeCurtain(tuneDrag.total);
    queueTuneDrag(tuneDrag.total);
    playTuneTicks();
    return;
  }
  nudgeCurtain(deg);
  queueTuneDrag(deg);
  playTuneTicks();
}

function endTuneGesture(suppressClickMs = 0) {
  clearTuneTilt();
  tuneDrag = null;
  /* Dopo un drag non lasciare il flag inchiodato (Power/CH± morti) */
  if (suppressClickMs > 0) {
    tuneMovedFlag = true;
    window.clearTimeout(endTuneGesture._t);
    endTuneGesture._t = window.setTimeout(() => { tuneMovedFlag = false; }, suppressClickMs);
  } else {
    window.clearTimeout(endTuneGesture._t);
    tuneMovedFlag = false;
  }
}

function onTuneUp(event) {
  if (!tuneDrag || event.pointerId !== tuneDrag.id) return;
  if (tuneDrag.settingsOnly) {
    endTuneGesture(tuneDrag.swiped ? 100 : 0);
    return;
  }
  const moved = Boolean(tuneDrag.moved);
  if (moved) {
    flushTuneDrag();
    sendCmd('tune_release', tuneDrag.lastDir || (tuneDrag.total >= 0 ? 1 : -1));
    releaseCurtain();
  }
  if (!moved && tuneDrag.fromDir) {
    const dirBtn = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('.dir');
    const act = dirBtn?.getAttribute('data-act') || event.target.closest?.('.dir')?.getAttribute('data-act');
    if (act) handleAct(act);
  }
  endTuneGesture(moved ? 140 : 0);
}

/* Se il browser perde il gesture senza pointerup, sblocca comunque i tasti */
tuneWheel?.addEventListener('lostpointercapture', () => {
  if (!tuneDrag) return;
  if (tuneDrag.moved && !tuneDrag.settingsOnly) {
    flushTuneDrag();
    sendCmd('tune_release', tuneDrag.lastDir || (tuneDrag.total >= 0 ? 1 : -1));
    releaseCurtain();
  }
  endTuneGesture(80);
});

btnConnect?.addEventListener('click', () => openPair(true));
btnPairClose?.addEventListener('click', () => openPair(false));
btnScan?.addEventListener('click', () => {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'list' }));
  else connect();
});
btnPurge?.addEventListener('click', () => {
  clearStickyRadio();
  selectedId = '';
  selectedName = '';
  paintConnect();
  paintRadios([]);
  setStatus('Ripulisco tutta la lista…');
  if (ws?.readyState === WebSocket.OPEN) {
    try { ws.send(JSON.stringify({ type: 'unlink' })); } catch (e) { /* ignore */ }
    try { ws.send(JSON.stringify({ type: 'purge' })); } catch (e) { /* ignore */ }
  } else {
    setStatus('Offline — riconnetto…');
    connect();
  }
});
btnDisconnect?.addEventListener('click', () => {
  if (ws?.readyState === WebSocket.OPEN) {
    try { ws.send(JSON.stringify({ type: 'unlink' })); } catch (e) { /* ignore */ }
    ws.send(JSON.stringify({ type: 'list' }));
  }
  selectedId = '';
  selectedName = '';
  clearStickyRadio();
  paintConnect();
  setStatus('Disconnesso · cerca una radio');
});

/*
  Power: tap breve = on/off (al rilascio).
  Tenuta 1 s = chiude l’app SUBITO (dito ancora giù); il rilascio successivo non manda nulla.
*/
const POWER_HOLD_MS = 1000;
let powerHoldTimer = 0;
let powerExitSent = false;
let powerPtrId = null;

function clearPowerHold() {
  window.clearTimeout(powerHoldTimer);
  powerHoldTimer = 0;
}

function firePowerExit() {
  powerHoldTimer = 0;
  powerExitSent = true;
  btnPower?.classList.add('is-exit-arm');
  window.setTimeout(() => btnPower?.classList.remove('is-exit-arm'), 600);
  handleAct('exit');
}

function endPowerGesture(sendAction) {
  const exited = powerExitSent;
  const live = powerPtrId != null;
  clearPowerHold();
  powerExitSent = false;
  powerPtrId = null;
  if (!live || exited || tuneMovedFlag) return;
  if (sendAction) handleAct('power');
}

function onPowerDown(event) {
  if (event.button != null && event.button !== 0) return;
  event.preventDefault();
  clearPowerHold();
  powerExitSent = false;
  powerPtrId = event.pointerId;
  try { event.currentTarget?.setPointerCapture?.(event.pointerId); } catch (e) { /* ignore */ }
  powerHoldTimer = window.setTimeout(firePowerExit, POWER_HOLD_MS);
}

function onPowerUp(event) {
  if (event.pointerType === 'mouse' && event.button != null && event.button !== 0) return;
  if (powerPtrId != null && event.pointerId !== powerPtrId) return;
  endPowerGesture(true);
}

function onPowerCancel(event) {
  if (powerPtrId != null && event.pointerId != null && event.pointerId !== powerPtrId) return;
  endPowerGesture(false);
}

document.querySelectorAll('[data-act]').forEach((btn) => {
  const act = btn.getAttribute('data-act');
  /* Frecce tuning: gestite in onTuneUp (tap vs drag) */
  if (btn.classList.contains('dir')) return;
  /* Power: long-press dedicato (non click) */
  if (act === 'power') return;
  btn.addEventListener('click', () => {
    if (tuneMovedFlag) return;
    handleAct(act);
  });
});

btnCastSheet?.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  handleAct('cast');
});

/* Tap vs scroll sulla lista casse (iOS) */
let castTap = null;
castSheetList?.addEventListener('pointerdown', (event) => {
  const item = event.target.closest?.('.cast-sheet-item');
  if (!item) {
    castTap = null;
    return;
  }
  castTap = { id: item.getAttribute('data-cast-id'), x: event.clientX, y: event.clientY, moved: false };
}, { passive: true });
castSheetList?.addEventListener('pointermove', (event) => {
  if (!castTap) return;
  if (Math.abs(event.clientX - castTap.x) > 8 || Math.abs(event.clientY - castTap.y) > 8) {
    castTap.moved = true;
  }
}, { passive: true });
castSheetList?.addEventListener('pointerup', (event) => {
  const tap = castTap;
  castTap = null;
  if (!tap || tap.moved || !tap.id) return;
  event.preventDefault();
  selectCastRoute(tap.id);
});
castSheetList?.addEventListener('pointercancel', () => { castTap = null; });

/* Evita che il tocco sul foglio Cast muova anche il telecomando sotto */
castSheet?.addEventListener('pointerdown', (event) => {
  if (event.target.closest('.cast-sheet-list')) return;
  event.stopPropagation();
}, true);

btnPower?.addEventListener('pointerdown', onPowerDown);
btnPower?.addEventListener('pointerup', onPowerUp);
btnPower?.addEventListener('pointercancel', onPowerCancel);
btnPower?.addEventListener('lostpointercapture', (event) => {
  /* Solo se il gesture è ancora vivo (pointerup non ha già chiuso) */
  if (powerPtrId == null) return;
  if (event.pointerId != null && event.pointerId !== powerPtrId) return;
  endPowerGesture(false);
});

tuneWheel?.addEventListener('pointerdown', onTuneDown);
tuneWheel?.addEventListener('pointermove', onTuneMove);
tuneWheel?.addEventListener('pointerup', onTuneUp);
tuneWheel?.addEventListener('pointercancel', onTuneUp);

btnVolDown?.addEventListener('pointerdown', (e) => onVolBtnDown(e, -1));
btnVolUp?.addEventListener('pointerdown', (e) => onVolBtnDown(e, 1));
btnVolDown?.addEventListener('pointerup', onVolBtnUp);
btnVolUp?.addEventListener('pointerup', onVolBtnUp);
btnVolDown?.addEventListener('pointercancel', onVolBtnUp);
btnVolUp?.addEventListener('pointercancel', onVolBtnUp);
btnVolDown?.addEventListener('lostpointercapture', stopVolHold);
btnVolUp?.addEventListener('lostpointercapture', stopVolHold);
window.addEventListener('blur', stopVolHold);
volTrack?.addEventListener('pointerdown', onVolDown);
volTrack?.addEventListener('pointermove', onVolMove);
volTrack?.addEventListener('pointerup', onVolUp);
volTrack?.addEventListener('pointercancel', onVolUp);

/* iOS: niente menu sistema / callout su long-press */
document.addEventListener('contextmenu', (event) => event.preventDefault());
document.addEventListener('selectstart', (event) => event.preventDefault());
document.addEventListener('gesturestart', (event) => event.preventDefault());

document.addEventListener('touchmove', (event) => {
  /* Lista Cast / stazioni / radio / volume: lascia scorrere su iOS */
  if (event.target.closest('.radio-list, .cast-sheet-list, .cast-sheet, .station-browser, .station-browser-grid, .settings-browser, #volTrack, .vol-strip, .vol-track')) return;
  event.preventDefault();
}, { passive: false });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
}

/*
  Sinistra (cima del telefono verso sinistra, landscape 90°) → lista RADIO.
  Destra → niente. Dritto → telecomando.
  I sensori anticipano la rotazione di iOS (niente immagine deformata);
  la rotazione dello schermo resta come riserva se i sensori non ci sono.
*/
function lockControlPortrait() {
  /* iOS non consente il blocco portrait da pagina web */
}

const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent || '')
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const MOTION_SIGN_KEY = 'mytuner-remote-motion-sign';
const MOTION_OK_KEY = 'mytuner-remote-motion-ok';
const btnMotion = document.getElementById('btnMotion');
/* leftScore = g.x * motionSign: positivo quando il telefono è girato a sinistra */
let motionSign = Number(localStorage.getItem(MOTION_SIGN_KEY)) || (IS_IOS ? -1 : 1);
let motionAlive = false;
let motionListening = false;
let sensorSide = null; /* null | 'left' | 'right' */
let lastGravityX = 0;
let returningToRemote = false;
let returnTimer = 0;

function onDeviceMotion(event) {
  const g = event.accelerationIncludingGravity;
  if (!g || g.x == null || g.y == null) return;
  if (!motionAlive) {
    motionAlive = true;
    btnMotion?.classList.add('is-hidden');
    try { localStorage.setItem(MOTION_OK_KEY, '1'); } catch (e) { /* ignore */ }
  }
  const gx = Number(g.x);
  const ay = Math.abs(Number(g.y));
  const az = Math.abs(Number(g.z || 0));
  lastGravityX = gx;
  /* Telefono quasi piatto: lettura inaffidabile, non cambiare stato */
  if (az > 8.2) return;
  const left = gx * motionSign;
  if (!sensorSide && Math.abs(left) > 5.5 && Math.abs(left) > ay + 0.5) {
    sensorSide = left > 0 ? 'left' : 'right';
    syncStationBrowserToOrientation();
  } else if (sensorSide && ay > 7 && ay > Math.abs(gx) + 1.5) {
    sensorSide = null;
    syncStationBrowserToOrientation();
  }
}

function startMotionTilt() {
  if (motionListening || typeof window.DeviceMotionEvent === 'undefined') return;
  motionListening = true;
  window.addEventListener('devicemotion', onDeviceMotion, { passive: true });
}

/* Permesso iOS: SOLO dal pulsante “Attiva rotazione”, mai a un tocco qualsiasi */
function requestMotionFromButton() {
  const ask = window.DeviceMotionEvent && window.DeviceMotionEvent.requestPermission;
  if (typeof ask !== 'function') {
    startMotionTilt();
    btnMotion?.classList.add('is-hidden');
    return;
  }
  ask.call(window.DeviceMotionEvent).then((res) => {
    if (res === 'granted') {
      startMotionTilt();
      btnMotion?.classList.add('is-hidden');
    }
  }).catch(() => {});
}

btnMotion?.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  requestMotionFromButton();
});

/* Se il permesso c’è già i dati arrivano da soli; altrimenti dopo poco mostra il pulsante */
function initMotionTilt() {
  startMotionTilt();
  const needsAsk = typeof window.DeviceMotionEvent?.requestPermission === 'function';
  if (!needsAsk) return;
  window.setTimeout(() => {
    if (!motionAlive) btnMotion?.classList.remove('is-hidden');
  }, 1500);
}

/* La rotazione di sistema conferma il segno del sensore (sinistra = positivo) */
function calibrateMotionSign(side) {
  if (Math.abs(lastGravityX) < 4) return;
  const towardLeft = side === 'left' ? 1 : -1;
  const next = (lastGravityX > 0 ? 1 : -1) * towardLeft;
  if (next === motionSign) return;
  motionSign = next;
  try { localStorage.setItem(MOTION_SIGN_KEY, String(next)); } catch (e) { /* ignore */ }
  /* Il lato letto finora era invertito: rileggilo col segno giusto */
  if (sensorSide) sensorSide = side;
}

function showStageRemote() {
  const stage = document.getElementById('app');
  if (!stage) return;
  stage.style.display = '';
  stage.style.visibility = '';
  stage.style.opacity = '';
}

function hideStageRemote() {
  const stage = document.getElementById('app');
  if (!stage) return;
  stage.style.display = 'none';
  stage.style.visibility = 'hidden';
  stage.style.opacity = '0';
}

/* Ritorno: lista via + telecomando subito. Mai lasciare solo lo scudo nero. */
function returnToRemoteInstant() {
  returningToRemote = false;
  window.clearTimeout(returnTimer);
  document.body.classList.remove('is-returning');
  closeSettingsBrowser();
  stationBrowserMode = '';
  stationBrowser?.classList.add('is-hidden');
  stationBrowser?.classList.remove('is-tilt-left', 'is-tilt-right', 'is-tv');
  stationBrowser?.setAttribute('aria-hidden', 'true');
  stationGridRadio?.classList.remove('is-revealing');
  stationGridTv?.classList.remove('is-revealing');
  document.body.classList.remove('is-tilt-cover', 'is-station-browser');
  showStageRemote();
  lockControlPortrait();
}

/* Ritorno mentre lo schermo è ancora orizzontale: via la lista, resta lo sfondo del
   telecomando (senza tasti) finché iOS non ha finito di girare */
function beginReturnToRemote() {
  if (returningToRemote) return;
  returningToRemote = true;
  closeSettingsBrowser();
  stationBrowserMode = '';
  stationBrowser?.classList.add('is-hidden');
  stationBrowser?.classList.remove('is-tilt-left', 'is-tilt-right', 'is-tv');
  stationBrowser?.setAttribute('aria-hidden', 'true');
  stationGridRadio?.classList.remove('is-revealing');
  stationGridTv?.classList.remove('is-revealing');
  document.body.classList.remove('is-tilt-cover', 'is-station-browser');
  document.body.classList.add('is-returning');
  hideStageRemote();
  window.clearTimeout(returnTimer);
  returnTimer = window.setTimeout(returnToRemoteInstant, 900);
}

/* Se per qualsiasi race resta scudo/lista incoerente → torna al telecomando */
function repairStationUiIfStuck() {
  if (returningToRemote || settingsBrowserOpen) return;
  const browsing = document.body.classList.contains('is-station-browser')
    || document.body.classList.contains('is-tilt-cover');
  const listHidden = !stationBrowser || stationBrowser.classList.contains('is-hidden');
  if (browsing && listHidden) returnToRemoteInstant();
  if (!stationBrowserMode && browsing) returnToRemoteInstant();
  if (stationBrowserMode && listHidden) {
    stationBrowser.classList.remove('is-hidden');
    hideStageRemote();
    document.body.classList.add('is-station-browser');
  }
}

function landscapeSide() {
  let angle = 0;
  try {
    if (screen.orientation && Number.isFinite(screen.orientation.angle)) {
      angle = screen.orientation.angle;
    } else if (typeof window.orientation === 'number') {
      angle = window.orientation;
    }
  } catch (e) { /* ignore */ }
  angle = ((angle % 360) + 360) % 360;
  /* iPhone girato a sinistra (cima verso sinistra) = 90° */
  if (angle === 90) return 'left';
  if (angle === 270) return 'right';
  return null;
}

/* Griglie costruite una volta sola (all’avvio o a nuovo download): la rotazione mostra/nasconde soltanto */
function buildStationGrid(grid, list, mode) {
  if (!grid) return;
  const activeName = String(lastState?.station || '');
  grid.innerHTML = list.map((s) => {
    const name = escapeHtml(s.name || '—');
    const key = escapeHtml(s.key || '');
    const logo = String(s.logo || '');
    const active = activeName && String(s.name || '') === activeName;
    const letter = escapeHtml((s.name || '?').slice(0, 1).toUpperCase());
    const logoHtml = logo
      ? `<img class="station-browser-logo" src="${escapeHtml(logo)}" alt="" decoding="async" data-letter="${letter}" />`
      : `<span class="station-browser-ico">${letter}</span>`;
    return `<div class="station-browser-item${active ? ' is-active' : ''}" role="option" data-key="${key}" data-name="${name}" data-mode="${mode}" tabindex="0">
      ${logoHtml}
      <span class="station-browser-name">${name}</span>
    </div>`;
  }).join('');
  grid.querySelectorAll('img.station-browser-logo').forEach((img) => {
    img.addEventListener('error', () => {
      const span = document.createElement('span');
      span.className = 'station-browser-ico';
      span.textContent = img.getAttribute('data-letter') || '?';
      img.replaceWith(span);
    }, { once: true });
  });
}

function buildStationGrids() {
  buildStationGrid(stationGridRadio, stationBrowserCache.radio, 'radio');
  buildStationGrid(stationGridTv, stationBrowserCache.tv, 'tv');
}

function markActiveStation(name) {
  const next = String(name || '');
  if (next === activeStationName) return;
  activeStationName = next;
  stationBrowser?.querySelectorAll('.station-browser-item').forEach((el) => {
    el.classList.toggle('is-active', Boolean(next) && el.getAttribute('data-name') === next);
  });
}

function stopStationsSyncFeedback() {
  stationBrowserTitle?.classList.remove('is-syncing');
}

function requestStationsSync() {
  if (!selectedId || !ws || ws.readyState !== WebSocket.OPEN) return;
  stationsSyncRequested = true;
  stationBrowserTitle?.classList.add('is-syncing');
  window.clearTimeout(stationsSyncTimer);
  /* Nessuna risposta (tablet appena avviato / in riconnessione): permetti un nuovo tentativo */
  stationsSyncTimer = window.setTimeout(() => {
    stopStationsSyncFeedback();
    stationsSyncRequested = false;
  }, 4000);
  sendCmd('stations_sync', 1);
}

function onStationsReceived(data) {
  const radio = Array.isArray(data.radio) ? data.radio : [];
  const tv = Array.isArray(data.tv) ? data.tv : [];
  window.clearTimeout(stationsSyncTimer);
  stopStationsSyncFeedback();
  if (!radio.length && !tv.length) return;
  const changed = JSON.stringify(radio) !== JSON.stringify(stationBrowserCache.radio)
    || JSON.stringify(tv) !== JSON.stringify(stationBrowserCache.tv);
  if (!changed) return;
  stationBrowserCache = { radio, tv };
  try {
    localStorage.setItem(STATIONS_CACHE_KEY, JSON.stringify({ radio, tv, at: Date.now() }));
  } catch (e) { /* ignore */ }
  activeStationName = '';
  buildStationGrids();
  markActiveStation(lastState?.station);
}

const stationBrowserHint = document.getElementById('stationBrowserHint');

function paintStationBrowserChrome(isTv) {
  if (stationBrowserTitle) stationBrowserTitle.textContent = isTv ? 'TV' : 'RADIO';
  if (stationBrowserHint) {
    stationBrowserHint.textContent = isTv ? 'clicca per le radio' : 'clicca per cambiare';
  }
}

/* Tap sul titolo: RADIO ↔ TV (tenere premuto ≈1s aggiorna l’elenco) */
let titleHoldTimer = 0;
stationBrowserTitle?.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  window.clearTimeout(titleHoldTimer);
  titleHoldTimer = window.setTimeout(() => {
    titleHoldTimer = 0;
    requestStationsSync();
  }, 900);
});
stationBrowserTitle?.addEventListener('pointerup', (event) => {
  event.preventDefault();
  const held = titleHoldTimer === 0;
  window.clearTimeout(titleHoldTimer);
  titleHoldTimer = 0;
  if (held || !stationBrowserMode) return;
  const next = stationBrowserMode === 'tv' ? 'radio' : 'tv';
  switchStationBrowserKind(next);
});
stationBrowserTitle?.addEventListener('pointercancel', () => {
  window.clearTimeout(titleHoldTimer);
  titleHoldTimer = 0;
});
stationBrowserHint?.addEventListener('click', (event) => {
  event.preventDefault();
  if (!stationBrowserMode) return;
  switchStationBrowserKind(stationBrowserMode === 'tv' ? 'radio' : 'tv');
});

let stationRevealTimer = 0;
function playStationReveal(grid) {
  if (!grid) return;
  grid.classList.remove('is-revealing');
  void grid.offsetWidth;
  grid.classList.add('is-revealing');
  window.clearTimeout(stationRevealTimer);
  stationRevealTimer = window.setTimeout(() => {
    grid.classList.remove('is-revealing');
  }, 1400);
}

function switchStationBrowserKind(kind) {
  const next = kind === 'tv' ? 'tv' : 'radio';
  if (!stationBrowserMode || next === stationBrowserMode) return;
  const isTv = next === 'tv';
  stationBrowserMode = next;
  stationBrowser?.classList.toggle('is-tv', isTv);
  paintStationBrowserChrome(isTv);
  stationGridRadio?.classList.toggle('is-hidden', isTv);
  stationGridTv?.classList.toggle('is-hidden', !isTv);
  playStationReveal(isTv ? stationGridTv : stationGridRadio);
}

function setStationBrowserMode(mode) {
  const nextMode = mode === 'radio' || mode === 'tv' ? mode : '';
  if (nextMode === stationBrowserMode) {
    /* Già aperto: assicurati che non resti lo schermo nero */
    if (nextMode) {
      document.body.classList.add('is-station-browser');
      document.body.classList.remove('is-tilt-cover');
      stationBrowser?.classList.remove('is-hidden');
      hideStageRemote();
    }
    return;
  }
  if (!nextMode) {
    returnToRemoteInstant();
    return;
  }
  const wasClosed = !stationBrowserMode;
  const isTv = nextMode === 'tv';
  stationBrowserMode = nextMode;
  /* Atomico: nascondi telecomando E mostra lista nello stesso frame (niente nero vuoto) */
  document.body.classList.remove('is-tilt-cover');
  document.body.classList.add('is-station-browser');
  hideStageRemote();
  stationBrowser?.classList.remove('is-hidden');
  stationBrowser?.setAttribute('aria-hidden', 'false');
  stationBrowser?.classList.toggle('is-tv', isTv);
  paintStationBrowserChrome(isTv);
  stationGridRadio?.classList.toggle('is-hidden', isTv);
  stationGridTv?.classList.toggle('is-hidden', !isTv);
  if (wasClosed) playStationReveal(isTv ? stationGridTv : stationGridRadio);
}

function openStationsForLeft(pageSide) {
  window.clearTimeout(returnTimer);
  returningToRemote = false;
  document.body.classList.remove('is-returning');
  /* Pagina ancora verticale (iOS non ha ancora girato): lista ruotata da noi */
  stationBrowser?.classList.toggle('is-tilt-left', pageSide == null);
  stationBrowser?.classList.remove('is-tilt-right');
  if (!stationBrowserMode) setStationBrowserMode('radio');
  else setStationBrowserMode(stationBrowserMode);
  if (!stationBrowserCache.radio.length && !stationBrowserCache.tv.length) {
    requestStationsSync();
  }
}

function syncStationBrowserToOrientation() {
  const pageSide = landscapeSide();
  /* Con i sensori decide l’inclinazione (arriva prima della rotazione di iOS) */
  const side = motionAlive ? sensorSide : pageSide;
  if (side === 'left') {
    closeSettingsBrowser();
    openStationsForLeft(pageSide);
    return;
  }
  if (side === 'right') {
    openSettingsForRight(pageSide);
    return;
  }

  const somethingOpen = Boolean(stationBrowserMode) || settingsBrowserOpen;
  if (pageSide && (somethingOpen || returningToRemote)) {
    /* Sto tornando dritto ma iOS è ancora orizzontale: niente lista, niente telecomando deformato */
    beginReturnToRemote();
    return;
  }
  if (pageSide == null) {
    returnToRemoteInstant();
  }
}

function pickStationFromBrowser(key, mode) {
  if (!key) return;
  sendCmd('tune_station', { key, mode: mode === 'tv' ? 'tv' : 'radio' });
}

/* —— Impostazioni (landscape destra): stesse voci dello stereo, le modifiche vanno sullo stereo —— */
const settingsBrowser = document.getElementById('settingsBrowser');
const settingsBody = document.getElementById('settingsBody');
const settingsBack = document.getElementById('settingsBack');
const settingsTitle = document.getElementById('settingsTitle');
const settingsVersion = document.getElementById('settingsVersion');
const SETTINGS_CACHE_KEY = 'mytuner-remote-settings-v1';
const CONTROL_VERSION = 'v73';
const SETTINGS_CHAIN = ['home', 'user', 'alarm', 'stations', 'standby', 'clock', 'bg'];
let settingsBrowserOpen = false;
let settingsPage = 'home';
let settingsTrail = false; /* true = navigazione swipe a catena (come sullo stereo) */
let settingsSwipeLock = false;
let remoteSettings = loadSettingsCache();

function loadSettingsCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_CACHE_KEY) || 'null');
    return raw && typeof raw === 'object' ? raw : null;
  } catch (e) {
    return null;
  }
}

const SETTINGS_SECTIONS = [
  { id: 'user', label: 'UTENTE', svg: '<circle cx="32" cy="20" r="11" fill="none" stroke="currentColor" stroke-width="3.4"/><path d="M14 52c3-12 10-18 18-18s15 6 18 18" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>' },
  { id: 'alarm', label: 'SVEGLIA', svg: '<circle cx="32" cy="34" r="16" fill="none" stroke="currentColor" stroke-width="3.2"/><path d="M32 34V24M32 34l9 6" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><path d="M14 18l8 6M50 18l-8 6" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>' },
  { id: 'stations', label: 'STAZIONI', svg: '<rect x="10" y="14" width="44" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="3.2"/><path d="M18 24h28M18 32h28M18 40h18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="44" cy="40" r="3.2" fill="currentColor"/>' },
  { id: 'standby', label: 'STANDBY', svg: '<circle cx="32" cy="32" r="18" fill="none" stroke="currentColor" stroke-width="3.2"/><path d="M32 18v14" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>' },
  { id: 'clock', label: 'CLOCK', svg: '<circle cx="32" cy="32" r="18" fill="none" stroke="currentColor" stroke-width="3.2"/><path d="M32 20v14l10 6" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>' },
  { id: 'bg', label: 'SFONDI', svg: '<rect x="10" y="14" width="44" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="3.2"/><path d="M10 40l12-10 10 8 8-6 14 12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="22" cy="24" r="3.2" fill="currentColor"/>' }
];

const IDLE_FIELDS = [
  { block: 'Radio accesa', field: 'onDim', label: 'Schermo scuro', get: (s) => s.idle?.on?.dimSec },
  { block: 'Radio accesa', field: 'onStandby', label: 'Standby', get: (s) => s.idle?.on?.standbySec },
  { block: 'Radio spenta', field: 'offDim', label: 'Schermo scuro', get: (s) => s.idle?.off?.dimSec },
  { block: 'Radio spenta', field: 'offStandby', label: 'Standby', get: (s) => s.idle?.off?.standbySec }
];

function idleLabel(sec) {
  const n = Number(sec);
  if (!Number.isFinite(n)) return '—';
  if (n < 60) return `${n} secondi`;
  const m = n / 60;
  return m === 1 ? '1 minuto' : `${m} minuti`;
}

function settingsStationTiles(list, activeKey, act) {
  if (!list.length) return '<div class="settings-empty">Elenco non ancora scaricato</div>';
  return `<div class="settings-stations">${list.map((s) => {
    const name = escapeHtml(s.name || '—');
    const key = escapeHtml(s.key || '');
    const letter = escapeHtml((s.name || '?').slice(0, 1).toUpperCase());
    const logo = s.logo
      ? `<img class="station-browser-logo" src="${escapeHtml(s.logo)}" alt="" decoding="async" />`
      : `<span class="station-browser-ico">${letter}</span>`;
    const on = activeKey && s.key === activeKey ? ' is-active' : '';
    return `<div class="station-browser-item${on}" data-act="${act}" data-key="${key}">${logo}<span class="station-browser-name">${name}</span></div>`;
  }).join('')}</div>`;
}

function settingsPageHtml(page) {
  const s = remoteSettings;
  if (page === 'home') {
    return `<div class="settings-home">${SETTINGS_SECTIONS.map((sec) => (
      `<button type="button" class="settings-tile" data-go="${sec.id}">
        <svg viewBox="0 0 64 64" aria-hidden="true">${sec.svg}</svg>
        <span>${sec.label}</span>
      </button>`
    )).join('')}</div>`;
  }
  if (page === 'stations') {
    return settingsStationTiles(stationBrowserCache.radio, '', 'tune');
  }
  if (!s) return '<div class="settings-empty">Collegamento allo stereo…</div>';
  if (page === 'user') {
    return `<form class="settings-form" data-form="user">
      <label class="settings-lab" for="settingsName">Nome dispositivo</label>
      <input class="settings-input" id="settingsName" maxlength="48" autocomplete="off" value="${escapeHtml(s.name || '')}" />
      <button type="submit" class="settings-btn">Salva</button>
    </form>`;
  }
  if (page === 'alarm') {
    const a = s.alarm || {};
    const music = a.mode === 'music';
    return `<div class="settings-form settings-alarm">
      <div class="settings-row">
        <input class="settings-input settings-time" id="settingsAlarmTime" type="time" value="${escapeHtml(a.time || '07:00')}" />
        <button type="button" class="settings-toggle${a.enabled ? ' is-on' : ''}" data-act="alarmToggle">${a.enabled ? 'ATTIVA' : 'SPENTA'}</button>
      </div>
      <div class="settings-seg">
        <button type="button" class="${music ? '' : 'is-on'}" data-act="alarmMode" data-v="sound">Suono</button>
        <button type="button" class="${music ? 'is-on' : ''}" data-act="alarmMode" data-v="music">Musica</button>
      </div>
      ${music ? `<div class="settings-lab">Stazione: ${escapeHtml(a.stationName || 'scegli sotto')}</div>${settingsStationTiles(stationBrowserCache.radio, a.stationKey, 'alarmStation')}` : ''}
    </div>`;
  }
  if (page === 'standby') {
    const choices = Array.isArray(s.idleChoices) ? s.idleChoices : [];
    let lastBlock = '';
    return `<div class="settings-form settings-standby">${IDLE_FIELDS.map((f) => {
      const cur = Number(f.get(s));
      const head = f.block !== lastBlock ? `<div class="settings-block">${f.block}</div>` : '';
      lastBlock = f.block;
      return `${head}<label class="settings-row settings-idle">
        <span class="settings-lab">${f.label}</span>
        <select class="settings-input" data-idle="${f.field}">${choices.map((c) => (
          `<option value="${c}"${c === cur ? ' selected' : ''}>${idleLabel(c)}</option>`
        )).join('')}</select>
      </label>`;
    }).join('')}</div>`;
  }
  if (page === 'clock') {
    const themes = Array.isArray(s.clockThemes) && s.clockThemes.length
      ? s.clockThemes
      : [
        { id: 'casio', name: 'Casio LCD', preview: 'casio' },
        { id: 'digital', name: 'Digital clock', preview: 'digital' },
        { id: 'corona', name: 'Corona spettro', preview: 'corona' }
      ];
    return `<div class="settings-choices settings-clocks">${themes.map((t) => {
      const preview = String(t.preview || t.id || 'casio');
      let thumb = '';
      if (preview === 'digital') {
        thumb = '<span class="clock-theme-preview is-digital" aria-hidden="true"><span class="pv-digital"><b>10:09</b><i>FM</i></span></span>';
      } else if (preview === 'corona') {
        thumb = '<span class="clock-theme-preview is-corona" aria-hidden="true"><span class="pv-corona-half"><i class="pv-arc"></i><b>15:42</b></span></span>';
      } else {
        thumb = '<span class="clock-theme-preview is-casio" aria-hidden="true"><span class="pv-lcd">12:45</span></span>';
      }
      return `<button type="button" class="settings-choice settings-clock${t.id === s.clockId ? ' is-on' : ''}" data-act="clock" data-id="${escapeHtml(t.id)}">${thumb}<span class="settings-clock-name">${escapeHtml(t.name)}</span></button>`;
    }).join('')}</div>`;
  }
  if (page === 'bg') {
    return `<div class="settings-choices settings-bgs">${(s.bgThemes || []).map((t) => (
      `<button type="button" class="settings-choice settings-bg${t.id === s.bgId ? ' is-on' : ''}" data-act="bg" data-id="${escapeHtml(t.id)}">
        <span class="settings-bg-thumb"${t.thumb ? ` style="background-image:url('${escapeHtml(t.thumb)}')"` : ''}></span>
        <span>${escapeHtml(t.name)}</span>
      </button>`
    )).join('')}</div>`;
  }
  return '';
}

function paintSettingsHead() {
  const sec = SETTINGS_SECTIONS.find((x) => x.id === settingsPage);
  if (settingsTitle) settingsTitle.textContent = sec ? sec.label : 'IMPOSTAZIONI';
  settingsBack?.classList.toggle('is-hidden', settingsPage === 'home');
  if (settingsVersion) {
    const radioVer = remoteSettings?.version ? ` · stereo ${remoteSettings.version}` : '';
    settingsVersion.textContent = `telecomando ${CONTROL_VERSION}${radioVer}`;
  }
}

function paintSettingsBrowser() {
  if (!settingsBody) return;
  paintSettingsHead();
  settingsBody.innerHTML = `<div class="settings-slide is-on">${settingsPageHtml(settingsPage)}</div>`;
  settingsBody.querySelector('.settings-slide.is-on')?.scrollTo?.(0, 0);
}

function showSettingsPage(page) {
  settingsPage = page;
  paintSettingsBrowser();
}

/* Stessa catena dello stereo: home → utente → sveglia → stazioni → standby → clock → sfondi */
function settingsNeighbor(dir) {
  const forward = dir === 'forward';
  const idx = SETTINGS_CHAIN.indexOf(settingsPage);
  if (forward) {
    if (idx < 0 || idx >= SETTINGS_CHAIN.length - 1) return null;
    return SETTINGS_CHAIN[idx + 1];
  }
  /* Home: sul telecomando non si chiude con swipe (a destra restano le impostazioni) */
  if (settingsPage === 'home') return null;
  if (settingsTrail && idx > 0) return SETTINGS_CHAIN[idx - 1];
  if (settingsPage !== 'home') return 'home';
  return null;
}

function settingsForwardLocal() {
  const next = settingsNeighbor('forward');
  if (!next) return;
  settingsTrail = true;
  showSettingsPage(next);
}

function settingsBackLocal() {
  const prev = settingsNeighbor('back');
  if (!prev) return;
  showSettingsPage(prev);
}

function sendSetting(value) {
  sendCmd('settings_set', value);
}

/* Aggiorna subito il telecomando, poi lo stereo conferma con i dati veri */
function patchRemoteSettings(fn) {
  if (!remoteSettings) return;
  fn(remoteSettings);
  paintSettingsBrowser();
}

function onSettingsReceived(data) {
  const s = data.settings;
  if (!s || typeof s !== 'object') return;
  remoteSettings = s;
  try { localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
  if (!settingsBrowserOpen || settingsSwipeLock) return;
  /* Non ridisegnare mentre scrivi il nome o scegli l’ora */
  const active = document.activeElement;
  if (active && settingsBody?.contains(active) && /INPUT|SELECT/.test(active.tagName)) return;
  paintSettingsBrowser();
}

function openSettingsForRight(pageSide) {
  window.clearTimeout(returnTimer);
  returningToRemote = false;
  document.body.classList.remove('is-returning');
  if (stationBrowserMode) {
    stationBrowserMode = '';
    stationBrowser?.classList.add('is-hidden');
    stationBrowser?.classList.remove('is-tilt-left', 'is-tilt-right');
  }
  settingsBrowser?.classList.toggle('is-tilt-right', pageSide == null);
  if (settingsBrowserOpen) return;
  settingsBrowserOpen = true;
  settingsPage = 'home';
  settingsTrail = false;
  settingsSwipeLock = false;
  document.body.classList.add('is-station-browser');
  hideStageRemote();
  settingsBrowser?.classList.remove('is-hidden');
  settingsBrowser?.setAttribute('aria-hidden', 'false');
  paintSettingsBrowser();
  sendCmd('settings_sync', 1);
  if (!stationBrowserCache.radio.length) requestStationsSync();
}

function closeSettingsBrowser() {
  if (!settingsBrowserOpen) return;
  settingsBrowserOpen = false;
  try { document.activeElement?.blur?.(); } catch (e) { /* ignore */ }
  settingsBrowser?.classList.add('is-hidden');
  settingsBrowser?.classList.remove('is-tilt-right');
  settingsBrowser?.setAttribute('aria-hidden', 'true');
}

settingsBack?.addEventListener('click', (event) => {
  event.preventDefault();
  if (settingsSwipeLock) return;
  settingsBackLocal();
});

settingsBody?.addEventListener('click', (event) => {
  if (settingsSwipeLock) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  const go = event.target.closest?.('[data-go]');
  if (go) {
    settingsTrail = false;
    showSettingsPage(go.getAttribute('data-go'));
    return;
  }
  const el = event.target.closest?.('[data-act]');
  if (!el) return;
  const act = el.getAttribute('data-act');
  if (act === 'tune') {
    pickStationFromBrowser(el.getAttribute('data-key'), 'radio');
  } else if (act === 'alarmToggle') {
    const next = !remoteSettings?.alarm?.enabled;
    patchRemoteSettings((s) => { s.alarm = { ...s.alarm, enabled: next }; });
    sendSetting({ section: 'alarm', enabled: next });
  } else if (act === 'alarmMode') {
    const mode = el.getAttribute('data-v') === 'music' ? 'music' : 'sound';
    patchRemoteSettings((s) => { s.alarm = { ...s.alarm, mode }; });
    sendSetting({ section: 'alarm', mode });
  } else if (act === 'alarmStation') {
    const key = el.getAttribute('data-key') || '';
    const st = stationBrowserCache.radio.find((x) => x.key === key);
    patchRemoteSettings((s) => { s.alarm = { ...s.alarm, mode: 'music', stationKey: key, stationName: st?.name || '' }; });
    sendSetting({ section: 'alarm', mode: 'music', stationKey: key });
  } else if (act === 'clock') {
    const id = el.getAttribute('data-id') || '';
    patchRemoteSettings((s) => { s.clockId = id; });
    sendSetting({ section: 'clock', id });
  } else if (act === 'bg') {
    const id = el.getAttribute('data-id') || '';
    patchRemoteSettings((s) => { s.bgId = id; });
    sendSetting({ section: 'bg', id });
  }
});

settingsBody?.addEventListener('change', (event) => {
  const t = event.target;
  if (t?.id === 'settingsAlarmTime' && /^\d{2}:\d{2}$/.test(t.value)) {
    const time = t.value;
    if (remoteSettings) remoteSettings.alarm = { ...remoteSettings.alarm, time };
    sendSetting({ section: 'alarm', time });
  } else if (t?.matches?.('select[data-idle]')) {
    const field = t.getAttribute('data-idle');
    const sec = Number(t.value);
    sendSetting({ section: 'idle', field, sec });
  }
});

settingsBody?.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.getElementById('settingsName');
  const name = String(input?.value || '').trim();
  if (!name) return;
  input.blur();
  patchRemoteSettings((s) => { s.name = name; });
  sendSetting({ section: 'user', name });
});

/* Swipe fluido come sullo stereo: la pagina successiva segue già il dito */
(function bindSettingsSwipeNav() {
  const panel = settingsBrowser;
  const body = settingsBody;
  if (!panel || !body) return;
  const SNAP = 0.28;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
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

  function isRotated() {
    return panel.classList.contains('is-tilt-right')
      && window.matchMedia('(orientation: portrait)').matches;
  }

  function visualOf(sdx, sdy) {
    return isRotated() ? { dx: -sdy, dy: sdx } : { dx: sdx, dy: sdy };
  }

  function pickAxis(dx, dy) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return null;
    if (Math.abs(dx) >= 10 && Math.abs(dx) >= Math.abs(dy) * 0.75) return 'x';
    if (Math.abs(dy) > Math.abs(dx) * 1.15) return 'y';
    return Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
  }

  function clearInline(el) {
    if (!el) return;
    el.style.transition = '';
    el.style.transform = '';
    el.classList.remove('is-drag-peek');
  }

  function stopDragVisual() {
    panel.classList.remove('is-finger-drag', 'is-finger-snap');
    clearInline(fromEl);
    if (toEl) {
      clearInline(toEl);
      toEl.remove();
    }
    fromEl = null;
    toEl = null;
    peekId = null;
    dir = null;
    dragging = false;
  }

  function slideWidth() {
    if (isRotated()) return Math.max(1, panel.clientWidth || body.clientWidth || 1);
    return Math.max(1, body.clientWidth || body.getBoundingClientRect().width || 1);
  }

  function beginPeek(nextDir) {
    const nextId = settingsNeighbor(nextDir);
    if (!nextId) return false;
    fromEl = body.querySelector('.settings-slide.is-on');
    if (!fromEl) return false;
    body.querySelectorAll('.settings-slide.is-drag-peek').forEach((el) => el.remove());
    toEl = document.createElement('div');
    toEl.className = 'settings-slide is-drag-peek';
    toEl.innerHTML = settingsPageHtml(nextId);
    body.appendChild(toEl);
    peekId = nextId;
    dir = nextDir;
    width = slideWidth();
    panel.classList.add('is-finger-drag');
    toEl.style.transition = 'none';
    fromEl.style.transition = 'none';
    toEl.style.transform = nextDir === 'forward'
      ? `translate3d(${width}px,0,0)`
      : `translate3d(${-width}px,0,0)`;
    fromEl.style.transform = 'translate3d(0,0,0)';
    return true;
  }

  function applyDrag(dx) {
    if (!dir || !fromEl || !toEl) return;
    const clamped = dir === 'forward'
      ? Math.max(-width, Math.min(0, dx))
      : Math.max(0, Math.min(width, dx));
    fromEl.style.transform = `translate3d(${clamped}px,0,0)`;
    toEl.style.transform = dir === 'forward'
      ? `translate3d(${width + clamped}px,0,0)`
      : `translate3d(${-width + clamped}px,0,0)`;
  }

  function finishDrag(commit, dx, velocity) {
    if (!dragging || !dir || !fromEl || !toEl) {
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
    const ease = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
    fromEl.style.transition = ease;
    toEl.style.transition = ease;
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
      stopDragVisual();
      settingsSwipeLock = false;
      if (!shouldCommit) {
        paintSettingsBrowser();
        return;
      }
      if (goDir === 'forward') settingsTrail = true;
      settingsPage = goPeek;
      paintSettingsBrowser();
    }, 290);
  }

  function onSwipeMove(clientX, clientY) {
    if (!tracking) return false;
    const { dx, dy } = visualOf(clientX - startX, clientY - startY);
    const now = performance.now();
    const dt = Math.max(1, now - lastT);
    const { dx: ldx } = visualOf(clientX - lastX, clientY - lastY);
    const vx = ldx / dt;
    lastX = clientX;
    lastY = clientY;
    lastT = now;

    if (!axis) {
      axis = pickAxis(dx, dy);
      if (!axis || axis !== 'x') return false;
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
      try { document.activeElement?.blur?.(); } catch (e) { /* ignore */ }
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

  function onDown(clientX, clientY, target) {
    if (!settingsBrowserOpen) return;
    if (panel.classList.contains('is-finger-snap')) return;
    if (target?.closest?.('input, select, textarea, .settings-time')) return;
    tracking = true;
    axis = null;
    dragging = false;
    dir = null;
    settingsSwipeLock = false;
    startX = clientX;
    startY = clientY;
    lastX = clientX;
    lastY = clientY;
    lastT = performance.now();
  }

  function onUp(clientX, clientY) {
    if (!tracking) return;
    const { dx } = visualOf(clientX - startX, clientY - startY);
    const velocity = Number(panel.dataset.vx || 0);
    delete panel.dataset.vx;
    const wasDragging = dragging;
    tracking = false;
    if (!wasDragging) {
      settingsSwipeLock = false;
      axis = null;
      return;
    }
    finishDrag(true, dx, velocity);
    axis = null;
  }

  function onCancel() {
    if (!tracking && !dragging) return;
    tracking = false;
    if (dragging) finishDrag(false, 0, 0);
    else {
      settingsSwipeLock = false;
      stopDragVisual();
    }
    axis = null;
  }

  panel.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    onDown(event.clientX, event.clientY, event.target);
  }, { passive: true });

  panel.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    onSwipeMove(event.clientX, event.clientY);
  }, { passive: true });

  panel.addEventListener('pointerup', (event) => {
    if (event.pointerType === 'touch') return;
    onUp(event.clientX, event.clientY);
  }, { passive: true });

  panel.addEventListener('pointercancel', (event) => {
    if (event.pointerType === 'touch') return;
    onCancel();
  }, { passive: true });

  panel.addEventListener('touchstart', (event) => {
    if (!settingsBrowserOpen) return;
    const t = event.touches?.[0];
    if (!t) return;
    onDown(t.clientX, t.clientY, event.target);
  }, { passive: true });

  panel.addEventListener('touchmove', (event) => {
    if (!tracking) return;
    const t = event.touches?.[0];
    if (!t) return;
    const { dx, dy } = visualOf(t.clientX - startX, t.clientY - startY);
    if (!axis) axis = pickAxis(dx, dy);
    if (axis === 'x' || (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 0.85)) {
      event.preventDefault();
      axis = 'x';
      onSwipeMove(t.clientX, t.clientY);
    }
  }, { passive: false });

  panel.addEventListener('touchend', (event) => {
    if (!tracking) return;
    const t = event.changedTouches?.[0];
    onUp(t?.clientX ?? startX, t?.clientY ?? startY);
  }, { passive: true });

  panel.addEventListener('touchcancel', () => onCancel(), { passive: true });
})();

let stationTap = null;
stationBrowser?.addEventListener('pointerdown', (event) => {
  const item = event.target.closest?.('.station-browser-item');
  if (!item) {
    stationTap = null;
    return;
  }
  stationTap = {
    key: item.getAttribute('data-key'),
    mode: item.getAttribute('data-mode'),
    x: event.clientX,
    y: event.clientY,
    moved: false
  };
}, { passive: true });
stationBrowser?.addEventListener('pointermove', (event) => {
  if (!stationTap) return;
  if (Math.abs(event.clientX - stationTap.x) > 8 || Math.abs(event.clientY - stationTap.y) > 8) {
    stationTap.moved = true;
  }
}, { passive: true });
stationBrowser?.addEventListener('pointerup', (event) => {
  const tap = stationTap;
  stationTap = null;
  if (!tap || tap.moved || !tap.key) return;
  event.preventDefault();
  pickStationFromBrowser(tap.key, tap.mode);
});
stationBrowser?.addEventListener('pointercancel', () => { stationTap = null; });

function onSystemOrientation() {
  const side = landscapeSide();
  if (side) calibrateMotionSign(side);
  syncStationBrowserToOrientation();
}

try {
  const landscapeMql = window.matchMedia('(orientation: landscape)');
  const onLandscapeMql = () => {
    onSystemOrientation();
    window.setTimeout(syncStationBrowserToOrientation, 30);
  };
  if (landscapeMql.addEventListener) landscapeMql.addEventListener('change', onLandscapeMql);
  else if (landscapeMql.addListener) landscapeMql.addListener(onLandscapeMql);
} catch (e) { /* ignore */ }

window.addEventListener('orientationchange', () => {
  onSystemOrientation();
  window.setTimeout(syncStationBrowserToOrientation, 60);
});
window.addEventListener('resize', () => {
  window.setTimeout(syncStationBrowserToOrientation, 60);
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    repairStationUiIfStuck();
    syncStationBrowserToOrientation();
  }
});
window.setInterval(repairStationUiIfStuck, 400);
buildStationGrids();
initMotionTilt();
syncStationBrowserToOrientation();

setTuneVisual(0);
paintVolumeUI(5);
/* Ultima radio usata (localStorage): ripristina subito id/nome e collega al primo list */
(() => {
  const sticky = loadStickyRadio();
  if (!sticky) return;
  selectedId = sticky.id || '';
  selectedName = sticky.name || 'MyTuner';
  if (selectedName) setStatus(`Ultima: ${selectedName}`);
})();
paintConnect();
connect();
