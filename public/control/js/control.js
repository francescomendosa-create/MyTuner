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
const btnSettings = document.getElementById('btnSettings');
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
  btnCast?.classList.toggle('is-on', Boolean(st.casting || st.castPending || st.castArming || st.castPickerOpen));
  btnSettings?.classList.toggle('is-on', settingsOpen);
  btnZoomL?.classList.toggle('is-on', zoom === 'dial');
  btnZoomR?.classList.toggle('is-on', zoom === 'spec' || zoom === 'tv');
  paintDualLab(labBand, st.band === 'am' ? 'am' : 'fm');
  paintDualLab(labStereo, st.stereo ? 'st' : 'mo');
  paintDualLab(labAuto, st.auto ? 'auto' : 'man');
  paintDualLab(labView, st.viewMode === 'video' ? 'tv' : 'radio');
  paintSettingsMode(settingsOpen, { alarming });
  if (typeof st.volume === 'number' && !volDrag && !volHoldDir) paintVolumeUI(st.volume);
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
  window.clearTimeout(volHoldTimer);
  volHoldTimer = 0;
  volHoldDir = 0;
}

function nudgeVolume(dir, step = VOL_NUDGE) {
  const next = clampVol(localVolume + dir * step);
  if (Math.abs(next - localVolume) < 0.001) return;
  paintVolumeUI(next);
  lastVolSent = next;
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
    else sendCmd('tune_up');
    return;
  }
  if (act === 'nav_down') {
    if (castPick) sendCmd('cast_nav', 'down');
    else sendCmd('tune_down');
    return;
  }
  if (act === 'nav_left') {
    if (castPick) sendCmd('cast_nav', 'left');
    else sendCmd('ch_down');
    return;
  }
  if (act === 'nav_right') {
    if (castPick) sendCmd('cast_nav', 'right');
    else sendCmd('ch_up');
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
  sendCmd(act);
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
    fromDir: Boolean(dirBtn)
  };
  tuneAcc = 0;
  tickAcc = 0;
  try { clickCtx?.resume?.(); } catch (e) { /* ignore */ }
  try { tuneWheel.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ }
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
  if (Math.abs(d) > 0.002) {
    tuneDrag.moved = true;
    tuneMovedFlag = true;
  }
  const deg = d * (180 / Math.PI);
  setTuneVisual(tuneRot + deg);
  tuneAcc += deg;
  tickAcc += deg;
  while (tickAcc >= 7) {
    tickAcc -= 7;
    playTuneRatchet();
  }
  while (tickAcc <= -7) {
    tickAcc += 7;
    playTuneRatchet();
  }
  while (tuneAcc >= 14) {
    tuneAcc -= 14;
    sendCmd('tune_up');
  }
  while (tuneAcc <= -14) {
    tuneAcc += 14;
    sendCmd('tune_down');
  }
}

function onTuneUp(event) {
  if (!tuneDrag || event.pointerId !== tuneDrag.id) return;
  if (tuneDrag.settingsOnly) {
    clearTuneTilt();
    tuneDrag = null;
    return;
  }
  if (!tuneDrag.moved && tuneDrag.fromDir) {
    const dirBtn = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('.dir');
    const act = dirBtn?.getAttribute('data-act') || event.target.closest?.('.dir')?.getAttribute('data-act');
    if (act) handleAct(act);
  }
  clearTuneTilt();
  tuneDrag = null;
}

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

document.querySelectorAll('[data-act]').forEach((btn) => {
  const act = btn.getAttribute('data-act');
  /* Frecce tuning: gestite in onTuneUp (tap vs drag) */
  if (btn.classList.contains('dir')) return;
  btn.addEventListener('click', () => {
    if (tuneMovedFlag) return;
    handleAct(act);
  });
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
  if (event.target.closest('.radio-list, #volTrack, .vol-strip, .vol-track')) return;
  event.preventDefault();
}, { passive: false });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
}

function lockControlPortrait() {
  try {
    const o = screen.orientation;
    if (o && typeof o.lock === 'function') {
      o.lock('portrait').catch(() => {
        try { o.lock('portrait-primary').catch(() => {}); } catch (e) { /* ignore */ }
      });
    }
  } catch (e) { /* ignore */ }
}
lockControlPortrait();
window.addEventListener('orientationchange', () => {
  window.setTimeout(lockControlPortrait, 80);
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') lockControlPortrait();
});
window.addEventListener('pageshow', lockControlPortrait);

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
