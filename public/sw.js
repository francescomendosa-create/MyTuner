/* MyTuner — PWA + guardian standby (presenza Connect di backup, non sostituisce la pagina) */
const CACHE = 'mytuner-fs-v284';
const ASSETS = [
  '/',
  '/index.html',
  '/css/radio.css',
  '/css/radio.css?v=252',
  '/js/main.js',
  '/js/main.js?v=252',
  '/img/skins/vintage-50-screw.png',
  '/img/skins/vintage-50-mono-track.png',
  '/img/skins/vintage-50-mono-knob.png',
  '/img/skins/vintage-50-auto-track.png',
  '/img/skins/vintage-50-auto-knob.png',
  '/img/skins/vintage-50.jpg',
  '/img/skins/vintage-50-face.jpg',
  '/img/skins/vintage-50-crown.png',
  '/img/skins/vintage-50-spin.png',
  '/img/skins/vintage-50-vol-crown.png',
  '/img/skins/vintage-50-vol-spin.png',
  '/img/skins/vintage-50-fm.png',
  '/img/skins/vintage-50-fm-up.png',
  '/img/skins/vintage-50-fm-down.png',
  '/img/skins/vintage-50-preset.png',
  '/img/skins/vintage-50-fm-up.png',
  '/img/skins/vintage-50-fm-down.png',
  '/img/skins/vintage-50-preset-up.png',
  '/img/skins/vintage-50-preset-down.png',
  '/img/skins/vintage-50-mono-right.png',
  '/img/skins/vintage-50-auto-left.png',
  '/img/skins/vintage-50-chdown-off.png',
  '/img/skins/vintage-50-chdown-on.png',
  '/img/skins/vintage-50-chup-off.png',
  '/img/skins/vintage-50-chup-on.png',
  '/img/skins/vintage-50-cast-off.png',
  '/img/skins/vintage-50-cast-on.png',
  '/img/skins/vintage-50-preset-up.png',
  '/img/skins/vintage-50-preset-down.png',
  '/img/skins/vintage-50-slide.png',
  '/img/skins/vintage-50-power.png',
  '/img/skins/vintage-50-power-on.png',
  '/img/skins/vintage-50-pause.png',
  '/img/skins/vintage-50-thumb.jpg',
  '/img/skins/vintage-50-dial.jpg',
  '/img/skins/vintage-50-speaker.jpg',
  '/img/skins/classic-7080-thumb.jpg',
  '/js/native-bridge.js',
  '/js/vendor/hls.min.js',
  '/fonts/DSEG7Classic-Bold.woff2',
  '/fonts/DSEG7Classic-Bold.woff',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png',
  '/img/bg/scaffale-legno-noce.jpg',
  '/img/bg/scaffale-panoramico.jpg',
  '/img/bg/soggiorno-radio-lontano.jpg',
  '/img/bg/soggiorno-radio-vicino.jpg',
  '/img/bg/soggiorno-vuoto.jpg',
  '/img/bg/soggiorno-stanza-parete.jpg',
  '/js/scene-approach-3d.js',
  '/js/vendor/three/three.module.js',
  '/js/vendor/three/examples/jsm/loaders/GLTFLoader.js',
  '/js/vendor/three/examples/jsm/utils/BufferGeometryUtils.js',
  '/img/bg/laccata-grigia.png',
  '/img/bg/acciaio-incassato.png',
  '/img/bg/soggiorno-chiaro.jpg',
  '/img/bg/banco-falegname.jpg',
  '/img/bg/banco-falegname-lontano.jpg',
  '/img/bg/banco-falegname-vuoto.jpg',
  '/img/bg/banco-falegname-parete.jpg',
  '/img/bg/soggiorno-radio-3d/radio.glb'
];

let guardWs = null;
let guardTimer = 0;
let guardMeta = null; /* { id, name, kind, origin } */
let pendingRemoteCmd = null;
const WAKE_URL = '/?pwa=fullscreen-v8&wake=1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await Promise.all(
        ASSETS.map((url) => cache.add(url).catch(() => null))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/stream')) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req, { ignoreSearch: true });
        if (hit) return hit;
        if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
          return (await caches.match('/index.html', { ignoreSearch: true }))
            || (await caches.match('/'));
        }
        return hit;
      })
  );
});

function guardWsUrl() {
  if (!guardMeta?.id) return '';
  const origin = guardMeta.origin || self.location.origin;
  const u = new URL('/api/remote/ws', origin);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  /* role=guard: backup — non ruba il socket primary della pagina */
  u.searchParams.set('role', 'guard');
  u.searchParams.set('id', guardMeta.id);
  u.searchParams.set('name', guardMeta.name || 'MyTuner');
  u.searchParams.set('kind', guardMeta.kind || 'device');
  return u.toString();
}

function stopRemoteGuard() {
  self.clearTimeout(guardTimer);
  guardTimer = 0;
  const ws = guardWs;
  guardWs = null;
  if (ws) {
    try { ws.close(1000, 'page_resume'); } catch (e) { /* ignore */ }
  }
}

function scheduleGuardReconnect(ms) {
  self.clearTimeout(guardTimer);
  if (!guardMeta) return;
  guardTimer = self.setTimeout(() => connectRemoteGuard(), ms || 1500);
}

function publishStandbyState(ws) {
  if (!ws || ws.readyState !== 1) return;
  try {
    ws.send(JSON.stringify({
      type: 'hello',
      name: guardMeta?.name || 'MyTuner',
      kind: guardMeta?.kind || 'device'
    }));
    ws.send(JSON.stringify({
      type: 'state',
      state: {
        power: false,
        stopped: false,
        standby: true,
        displayWakePending: true
      }
    }));
    ws.send(JSON.stringify({
      type: 'ping',
      name: guardMeta?.name,
      kind: guardMeta?.kind
    }));
  } catch (e) { /* ignore */ }
}

function connectRemoteGuard() {
  if (!guardMeta?.id) return;
  if (guardWs && (guardWs.readyState === 0 || guardWs.readyState === 1)) return;
  const url = guardWsUrl();
  if (!url) return;
  let ws;
  try {
    ws = new WebSocket(url);
  } catch (e) {
    scheduleGuardReconnect(2500);
    return;
  }
  guardWs = ws;
  ws.addEventListener('open', () => {
    publishStandbyState(ws);
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        try { c.postMessage({ type: 'remote-guard-ready' }); } catch (e) { /* ignore */ }
      }
    });
  });
  ws.addEventListener('message', (event) => {
    let data = null;
    try { data = JSON.parse(String(event.data || '')); } catch (e) { return; }
    if (!data || data.type !== 'cmd') return;
    const action = String(data.action || '');
    const value = data.value;
    pendingRemoteCmd = { action, value };
    deliverRemoteCmd(action, value);
  });
  ws.addEventListener('close', () => {
    if (guardWs === ws) guardWs = null;
    if (guardMeta) scheduleGuardReconnect(1500);
  });
  ws.addEventListener('error', () => {
    try { ws.close(); } catch (e) { /* ignore */ }
  });
}

function startRemoteGuard(meta) {
  guardMeta = {
    id: String(meta?.id || '').slice(0, 64),
    name: String(meta?.name || 'MyTuner').slice(0, 48),
    kind: String(meta?.kind || 'device').slice(0, 32),
    origin: String(meta?.origin || self.location.origin)
  };
  if (!guardMeta.id) return;
  connectRemoteGuard();
}

async function clearRemoteNotifications() {
  try {
    const tags = ['mytuner-standby', 'mytuner-remote-wake'];
    for (const tag of tags) {
      const list = await self.registration.getNotifications({ tag });
      for (const n of list) {
        try { n.close(); } catch (e) { /* ignore */ }
      }
    }
  } catch (e) { /* ignore */ }
}

/* Solo se non c’è nessuna finestra: silenziosa, senza testo, chiusa subito */
async function showWakeNotification(action, value) {
  try {
    await self.registration.showNotification('\u200b', {
      body: '\u200b',
      icon: '/icons/icon-192.png',
      badge: '/icons/favicon-32.png',
      tag: 'mytuner-remote-wake',
      renotify: false,
      silent: true,
      requireInteraction: false,
      vibrate: [],
      data: { action: action || 'power', value }
    });
  } catch (e) { /* ignore */ }
  try {
    const list = await self.registration.getNotifications({ tag: 'mytuner-remote-wake' });
    for (const n of list) {
      try { n.close(); } catch (err) { /* ignore */ }
    }
  } catch (e) { /* ignore */ }
}

async function notifyClients(cmd) {
  const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of all) {
    try {
      client.postMessage({
        type: 'remote-cmd',
        action: cmd?.action || 'power',
        value: cmd?.value,
        from: 'sw-guard',
        awaitVisible: true
      });
    } catch (e) { /* ignore */ }
  }
  return all.length;
}

async function focusOrOpenClient(cmd) {
  const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of all) {
    try {
      if ('focus' in client) await client.focus();
    } catch (e) { /* ignore */ }
    try {
      client.postMessage({
        type: 'remote-cmd',
        action: cmd?.action || 'power',
        value: cmd?.value,
        from: 'notification',
        awaitVisible: true
      });
    } catch (e) { /* ignore */ }
  }
  if (!all.length) {
    try { await self.clients.openWindow(WAKE_URL); } catch (e) { /* ignore */ }
  }
}

async function deliverRemoteCmd(action, value) {
  /* Chiusura app: inoltra solo a finestre già aperte, mai focus/apertura */
  if (action === 'exit') {
    await notifyClients({ action, value });
    return;
  }
  /* Accende via client già aperto — niente heads-up. Notifica solo se zero finestre. */
  const n = await notifyClients({ action, value });
  await focusOrOpenClient({ action, value });
  if (n === 0 && (action === 'power' || action === 'wake')) {
    await showWakeNotification(action, value);
  }
  await clearRemoteNotifications();
  publishStandbyState(guardWs);
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'remote-guard-start') {
    startRemoteGuard(data);
    return;
  }
  if (data.type === 'remote-guard-stop') {
    guardMeta = null;
    pendingRemoteCmd = null;
    stopRemoteGuard();
    event.waitUntil(clearRemoteNotifications());
    return;
  }
  if (data.type === 'remote-clear-notes') {
    event.waitUntil(clearRemoteNotifications());
    return;
  }
  if (data.type === 'remote-wake-now') {
    const action = String(data.action || 'power');
    const value = data.value;
    pendingRemoteCmd = { action, value };
    event.waitUntil(deliverRemoteCmd(action, value));
    return;
  }
  if (data.type === 'remote-show-note') {
    /* Niente banner visibili per wake/telecomando */
    event.waitUntil(clearRemoteNotifications());
    return;
  }
  if (data.type === 'remote-guard-ping') {
    if (guardWs?.readyState === 1) publishStandbyState(guardWs);
    else if (guardMeta) connectRemoteGuard();
  }
});

/* Web Push dal hub: arriva anche a tablet spento / SW sospeso */
self.addEventListener('push', (event) => {
  let msg = {};
  try {
    msg = event.data ? event.data.json() : {};
  } catch (e) {
    try { msg = { body: event.data?.text?.() || '' }; } catch (err) { msg = {}; }
  }
  const action = String(msg.action || 'power');
  const value = msg.value ?? 'push';
  pendingRemoteCmd = { action, value };
  event.waitUntil((async () => {
    const n = await notifyClients({ action, value });
    await focusOrOpenClient({ action, value });
    /* Push senza finestra: solo notifica invisibile (niente testo/vibrazione) */
    if (n === 0) await showWakeNotification(action, value);
    await clearRemoteNotifications();
  })());
});

self.addEventListener('notificationclick', (event) => {
  const note = event.notification;
  note.close();
  const actBtn = String(event.action || '');
  const data = note.data || pendingRemoteCmd || { action: 'power', value: 'notify' };
  let action = data.action || 'power';
  if (actBtn === 'power' || actBtn === 'open' || !actBtn) action = 'power';
  const value = data.value;
  const openUrl = String(data.url || WAKE_URL);
  pendingRemoteCmd = { action, value };
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    let focused = false;
    for (const client of all) {
      try {
        if ('focus' in client) {
          await client.focus();
          focused = true;
        }
      } catch (e) { /* ignore */ }
      try {
        if ('navigate' in client) await client.navigate(openUrl);
      } catch (e) { /* ignore */ }
      try {
        client.postMessage({
          type: 'remote-cmd',
          action,
          value,
          from: 'notification',
          awaitVisible: true
        });
      } catch (e) { /* ignore */ }
    }
    if (!all.length || !focused) {
      try { await self.clients.openWindow(openUrl); } catch (e) { /* ignore */ }
    }
  })());
});

/* Keepalive sticky presenza (hub) */
self.setInterval(() => {
  if (!guardMeta) return;
  if (guardWs?.readyState === 1) publishStandbyState(guardWs);
  else connectRemoteGuard();
}, 8000);
