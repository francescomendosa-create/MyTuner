/* MyTuner — PWA + guardian standby (presenza Connect di backup, non sostituisce la pagina) */
const CACHE = 'mytuner-fs-v81';
const ASSETS = [
  '/',
  '/index.html',
  '/css/radio.css',
  '/js/main.js',
  '/js/native-bridge.js',
  '/fonts/DSEG7Classic-Bold.woff2',
  '/fonts/DSEG7Classic-Bold.woff',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png'
];

let guardWs = null;
let guardTimer = 0;
let guardMeta = null; /* { id, name, kind, origin } */
let pendingRemoteCmd = null;
const WAKE_URL = '/?pwa=fullscreen-v8&wake=1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
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
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('/index.html')))
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

async function showWakeNotification(action, value) {
  try {
    await self.registration.showNotification('MyTuner — tocca per aprire', {
      body: 'Tocca la notifica per riaccendere lo schermo. Resta in Connect.',
      icon: '/icons/icon-192.png',
      badge: '/icons/favicon-32.png',
      tag: 'mytuner-remote-wake',
      renotify: true,
      silent: false,
      requireInteraction: true,
      vibrate: [220, 100, 220, 100, 220],
      actions: [
        { action: 'power', title: 'Apri e accendi' },
        { action: 'open', title: 'Apri' }
      ],
      data: { action: action || 'power', value }
    });
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
  const isPowerOn = action === 'power' || action === 'wake';
  /* Notifica per lo schermo; NON chiudere il guardian; NON navigate (rompe presenza) */
  if (isPowerOn) await showWakeNotification(action, value);
  await notifyClients({ action, value });
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
    event.waitUntil((async () => {
      try {
        await self.registration.showNotification(String(data.title || 'MyTuner'), {
          body: String(data.body || ''),
          icon: '/icons/icon-192.png',
          badge: '/icons/favicon-32.png',
          tag: String(data.tag || 'mytuner-remote-wake'),
          renotify: true,
          silent: false,
          vibrate: [100, 50, 100],
          data: { action: 'wake', value: 'note' }
        });
      } catch (e) { /* ignore */ }
    })());
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
    await self.registration.showNotification(String(msg.title || 'MyTuner — TOCCA PER ACCENDERE'), {
      body: String(msg.body || 'Tocca per riaccendere lo schermo e la radio.'),
      icon: '/icons/icon-192.png',
      badge: '/icons/favicon-32.png',
      tag: String(msg.tag || 'mytuner-remote-wake'),
      renotify: true,
      silent: false,
      requireInteraction: true,
      vibrate: [280, 120, 280, 120, 280],
      actions: [
        { action: 'power', title: 'Apri e accendi' },
        { action: 'open', title: 'Apri' }
      ],
      data: {
        action,
        value,
        url: String(msg.url || WAKE_URL)
      }
    });
    await notifyClients({ action, value });
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
