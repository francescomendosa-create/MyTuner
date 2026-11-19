/* Hub telecomando MyTuner Control: radio online + relay + Web Push wake */

import { sendPush, isPushSubscription } from './web-push.js';
import { sendFcmDataMessage } from './fcm-send.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store'
    }
  });
}

const STICKY_MS = 24 * 60 * 60 * 1000; /* 24h in Connect anche offline */
const LIVE_SEEN_MS = 10 * 60 * 1000;

function wsOpen(ws) {
  return Boolean(ws && ws.readyState === 1);
}

export class RemoteHub {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    /** @type {Map<string, any>} */
    this.radios = new Map();
    /** @type {Map<string, { id: string, target: string, ws: WebSocket }>} */
    this.controls = new Map();
    this._loaded = false;
  }

  vapid() {
    const publicKey = this.env?.VAPID_PUBLIC_KEY || '';
    const privateKey = this.env?.VAPID_PRIVATE_KEY || '';
    const subject = this.env?.VAPID_SUBJECT || 'mailto:mytuner@workers.dev';
    if (!publicKey || !privateKey) return null;
    return { publicKey, privateKey, subject };
  }

  async ensureLoaded() {
    if (this._loaded) return;
    this._loaded = true;
    try {
      const saved = await this.state.storage.get('radios');
      if (!saved || typeof saved !== 'object') return;
      for (const [id, row] of Object.entries(saved)) {
        if (!id || !row) continue;
        this.radios.set(id, {
          id,
          name: String(row.name || 'MyTuner').slice(0, 48),
          kind: String(row.kind || 'device').slice(0, 32),
          ws: null,
          guardWs: null,
          seen: Number(row.seen) || Date.now(),
          stickyUntil: Number(row.stickyUntil) || (Date.now() + STICKY_MS),
          snapshot: row.snapshot && typeof row.snapshot === 'object' ? row.snapshot : { standby: true, power: false },
          pendingCmds: Array.isArray(row.pendingCmds) ? row.pendingCmds.slice(-8) : [],
          pushSub: row.pushSub && isPushSubscription(row.pushSub) ? row.pushSub : null,
          fcmToken: typeof row.fcmToken === 'string' ? row.fcmToken : null
        });
      }
    } catch (e) { /* ignore */ }
  }

  async persistRadios() {
    const out = {};
    for (const r of this.radios.values()) {
      out[r.id] = {
        id: r.id,
        name: r.name,
        kind: r.kind,
        seen: r.seen,
        stickyUntil: r.stickyUntil || 0,
        snapshot: r.snapshot || null,
        pendingCmds: Array.isArray(r.pendingCmds) ? r.pendingCmds.slice(-8) : [],
        pushSub: r.pushSub || null,
        fcmToken: r.fcmToken || null
      };
    }
    try {
      await this.state.storage.put('radios', out);
    } catch (e) { /* ignore */ }
  }

  isLive(r) {
    return wsOpen(r?.ws) || wsOpen(r?.guardWs);
  }

  touch(r) {
    if (!r) return;
    r.seen = Date.now();
    r.stickyUntil = Date.now() + STICKY_MS;
  }

  listRadios() {
    const now = Date.now();
    const out = [];
    for (const r of this.radios.values()) {
      const live = this.isLive(r);
      const sticky = Number(r.stickyUntil) > now;
      const recent = now - Number(r.seen || 0) < LIVE_SEEN_MS;
      const hasPush = Boolean(r.pushSub) || Boolean(r.fcmToken);
      if (!live && !sticky && !recent && !hasPush) continue;
      out.push({
        id: r.id,
        name: r.name,
        kind: r.kind || 'device',
        seen: r.seen,
        live,
        push: hasPush,
        native: Boolean(r.fcmToken),
        standby: Boolean(r.snapshot?.standby) || !wsOpen(r.ws),
        state: r.snapshot || null
      });
    }
    /* APK e in linea in cima, così si distinguono subito */
    out.sort((a, b) => {
      const score = (x) => (x.native ? 4 : 0) + (x.live ? 2 : 0) + (x.standby ? 0 : 1);
      const d = score(b) - score(a);
      if (d) return d;
      return String(a.name).localeCompare(String(b.name), 'it');
    });
    return out;
  }

  broadcastRadios() {
    const list = this.listRadios();
    const msg = JSON.stringify({ type: 'radios', radios: list });
    for (const c of this.controls.values()) {
      try { c.ws.send(msg); } catch (e) { /* ignore */ }
    }
  }

  /*
    Ripulisci = svuota TUTTA la lista hub.
    Chiude i socket: solo i device davvero attivi si ripresentano da soli.
  */
  purgeStaleRadios() {
    let removed = 0;
    for (const [id, r] of [...this.radios.entries()]) {
      try { r.ws?.close(1000, 'purged'); } catch (e) { /* ignore */ }
      try { r.guardWs?.close(1000, 'purged'); } catch (e) { /* ignore */ }
      r.ws = null;
      r.guardWs = null;
      this.radios.delete(id);
      removed += 1;
    }
    this.persistRadios();
    this.broadcastRadios();
    return removed;
  }

  queueCmd(radioId, payload) {
    const r = this.radios.get(radioId);
    if (!r) return;
    if (!Array.isArray(r.pendingCmds)) r.pendingCmds = [];
    r.pendingCmds.push({
      type: 'cmd',
      action: String(payload?.action || '').slice(0, 40),
      value: payload?.value,
      at: Date.now()
    });
    if (r.pendingCmds.length > 8) r.pendingCmds = r.pendingCmds.slice(-8);
    this.persistRadios();
  }

  deliverRaw(r, payload) {
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
    if (wsOpen(r.ws)) {
      try { r.ws.send(raw); return true; } catch (e) { /* try guard */ }
    }
    if (wsOpen(r.guardWs)) {
      try { r.guardWs.send(raw); return true; } catch (e) { /* fail */ }
    }
    return false;
  }

  flushPending(radioId) {
    const r = this.radios.get(radioId);
    if (!r || !this.isLive(r) || !r.pendingCmds?.length) return;
    const cmds = r.pendingCmds.slice();
    r.pendingCmds = [];
    this.persistRadios();
    for (const cmd of cmds) this.deliverRaw(r, cmd);
  }

  /* Sveglia schermo su qualsiasi tasto telecomando, mai su spegnimento / list / reconnect */
  wantsScreenWake(action, value) {
    const a = String(action || '');
    const v = String(value ?? '').toLowerCase();
    if (!a) return false;
    if (a === 'unlink' || a === 'disconnect' || a === 'select' || a === 'reconnect') return false;
    if (v === 'off' || v === '0' || v === 'false' || v === 'nag' || v === 'select' || v === 'reconnect') {
      return false;
    }
    /* power senza value = toggle legacy: non svegliare (potrebbe essere off) */
    if (a === 'power' && !(v === 'on' || v === '1' || v === 'true' || v === 'fcm' || v === 'remote' || v === 'manual' || v === 'need-display' || v === 'native' || v === 'native-fcm' || v === 'visible' || v === 'push')) {
      return false;
    }
    return true;
  }

  async wakePush(radioId, action, value) {
    const r = this.radios.get(radioId);
    if (!r) return false;
    if (!this.wantsScreenWake(action, value)) return false;
    const act = String(action || 'wake');
    const v = String(value ?? '').toLowerCase();
    const powerOn = act === 'power' && (v === 'on' || v === '1' || v === 'true' || v === 'fcm' || v === 'remote' || v === 'manual' || v === 'need-display' || v === 'native' || v === 'native-fcm' || v === 'visible' || v === 'push');
    /* FCM: power on solo per POWER; altrimenti wake display (radio può restare spenta) */
    const fcmAction = powerOn ? 'power' : 'wake';
    const fcmValue = powerOn ? 'on' : 'display';
    let ok = false;

    /* 1) APK Android: FCM v1 */
    if (r.fcmToken && (this.env?.FCM_SERVICE_ACCOUNT || this.env?.FCM_SERVER_KEY)) {
      const fcm = await sendFcmDataMessage(this.env, r.fcmToken, {
        action: fcmAction,
        value: fcmValue
      });
      if (fcm.ok) {
        /* Niente anche web-push: evita doppie notifiche */
        return true;
      }
      if (fcm.status === 404 || fcm.status === 410) {
        r.fcmToken = null;
        this.persistRadios();
      }
    }

    /* 2) Fallback web push solo se NON c’è APK/FCM */
    if (r.fcmToken) return ok;
    const vapid = this.vapid();
    if (r.pushSub && vapid) {
      try {
        const res = await sendPush(
          r.pushSub,
          {
            title: 'MyTuner',
            body: 'Telecomando: apri MyTuner',
            tag: 'mytuner-remote-wake',
            action: fcmAction,
            value: fcmValue,
            url: '/?pwa=fullscreen-v8&wake=1'
          },
          vapid,
          { ttl: 60, urgency: 'high', topic: 'mytuner-wake' }
        );
        if (res.status === 404 || res.status === 410) {
          r.pushSub = null;
          this.persistRadios();
        } else if (res.status >= 200 && res.status < 300) {
          ok = true;
        }
        try { await res.body?.cancel?.(); } catch (e) { /* ignore */ }
      } catch (e) { /* ignore */ }
    }
    return ok;
  }

  sendToTarget(targetId, payload) {
    const r = this.radios.get(targetId);
    if (!r) return false;
    const action = String(payload?.action || '');
    const delivered = this.deliverRaw(r, payload);
    /* FCM/push SOLO per accensione esplicita — mai su spegnimento */
    if (this.wantsScreenWake(action, payload?.value)) {
      try {
        this.state.waitUntil(this.wakePush(targetId, action, payload?.value));
      } catch (e) {
        this.wakePush(targetId, action, payload?.value);
      }
    }
    if (delivered) return true;
    if (action) this.queueCmd(targetId, payload);
    this.touch(r);
    try {
      if (!r.snapshot || typeof r.snapshot !== 'object') r.snapshot = {};
      r.snapshot = { ...r.snapshot, standby: true };
    } catch (e) { /* ignore */ }
    this.persistRadios();
    this.broadcastRadios();
    return false;
  }

  forwardState(radioId, snapshot) {
    const msg = JSON.stringify({ type: 'state', id: radioId, state: snapshot });
    for (const c of this.controls.values()) {
      if (c.target && c.target !== radioId) continue;
      try { c.ws.send(msg); } catch (e) { /* ignore */ }
    }
  }

  dropPrimary(id, closingWs) {
    const cur = this.radios.get(id);
    if (!cur) return;
    if (cur.ws !== closingWs) return;
    cur.ws = null;
    this.touch(cur);
    try {
      if (!cur.snapshot || typeof cur.snapshot !== 'object') cur.snapshot = {};
      cur.snapshot = { ...cur.snapshot, standby: true, power: false };
    } catch (e) { /* ignore */ }
    this.persistRadios();
    this.broadcastRadios();
  }

  dropGuard(id, closingWs) {
    const cur = this.radios.get(id);
    if (!cur) return;
    if (cur.guardWs !== closingWs) return;
    cur.guardWs = null;
    this.touch(cur);
    this.persistRadios();
    this.broadcastRadios();
  }

  countControlsFor(targetId) {
    let n = 0;
    for (const c of this.controls.values()) {
      if (c.target && c.target === targetId) n += 1;
    }
    return n;
  }

  dropControl(id) {
    const entry = this.controls.get(id);
    const target = entry?.target || '';
    this.controls.delete(id);
    if (target && this.countControlsFor(target) === 0) {
      this.sendToTarget(target, { type: 'cmd', action: 'unlink', value: 'control_gone' });
    }
  }

  attachRadioSocket(id, name, kind, server, asGuard) {
    let entry = this.radios.get(id);
    if (!entry) {
      entry = {
        id,
        name,
        kind,
        ws: null,
        guardWs: null,
        seen: Date.now(),
        stickyUntil: Date.now() + STICKY_MS,
        snapshot: { standby: true, power: false },
        pendingCmds: [],
        pushSub: null,
        fcmToken: null
      };
      this.radios.set(id, entry);
    }
    entry.name = name || entry.name;
    entry.kind = kind || entry.kind;
    this.touch(entry);

    if (asGuard) {
      if (entry.guardWs && entry.guardWs !== server) {
        try { entry.guardWs.close(1000, 'guard_replaced'); } catch (e) { /* ignore */ }
      }
      entry.guardWs = server;
    } else {
      if (entry.ws && entry.ws !== server) {
        try { entry.ws.close(1000, 'replaced'); } catch (e) { /* ignore */ }
      }
      entry.ws = server;
    }

    server.addEventListener('message', (event) => {
      let data = null;
      try { data = JSON.parse(String(event.data || '')); } catch (e) { return; }
      if (!data || typeof data !== 'object') return;
      this.touch(entry);
      if (data.type === 'push_sub' && isPushSubscription(data.subscription)) {
        entry.pushSub = {
          endpoint: data.subscription.endpoint,
          keys: {
            p256dh: data.subscription.keys.p256dh,
            auth: data.subscription.keys.auth
          }
        };
        this.persistRadios();
        this.broadcastRadios();
        try { server.send(JSON.stringify({ type: 'ok', push: true })); } catch (e) { /* ignore */ }
        return;
      }
      if (data.type === 'fcm_token' && typeof data.token === 'string' && data.token.length > 20) {
        entry.fcmToken = data.token.slice(0, 4096);
        this.persistRadios();
        this.broadcastRadios();
        try { server.send(JSON.stringify({ type: 'ok', fcm: true })); } catch (e) { /* ignore */ }
        return;
      }
      if (data.type === 'hello' || data.type === 'ping') {
        if (data.name) entry.name = String(data.name).slice(0, 48);
        if (data.kind) entry.kind = String(data.kind).slice(0, 32);
        this.persistRadios();
        this.broadcastRadios();
        try { server.send(JSON.stringify({ type: 'ok' })); } catch (e) { /* ignore */ }
        this.flushPending(id);
        return;
      }
      if (data.type === 'state') {
        entry.snapshot = data.state && typeof data.state === 'object' ? data.state : null;
        this.forwardState(id, entry.snapshot);
        this.persistRadios();
        this.broadcastRadios();
        this.flushPending(id);
      }
    });

    server.addEventListener('close', () => {
      if (asGuard) this.dropGuard(id, server);
      else this.dropPrimary(id, server);
    });
    server.addEventListener('error', () => {
      if (asGuard) this.dropGuard(id, server);
      else this.dropPrimary(id, server);
    });

    try {
      server.send(JSON.stringify({ type: 'welcome', role: asGuard ? 'guard' : 'radio', id }));
    } catch (e) { /* ignore */ }
    this.persistRadios();
    this.broadcastRadios();
    this.flushPending(id);
  }

  async fetch(request) {
    await this.ensureLoaded();
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': '*'
        }
      });
    }

    if (url.pathname === '/list' || url.pathname.endsWith('/list')) {
      return json({ radios: this.listRadios() });
    }

    if (url.pathname === '/vapid' || url.pathname.endsWith('/vapid')) {
      const pub = this.env?.VAPID_PUBLIC_KEY || '';
      return json({ publicKey: pub });
    }

    const upgrade = request.headers.get('Upgrade') || '';
    if (upgrade.toLowerCase() !== 'websocket') {
      return json({ error: 'WebSocket richiesto' }, 426);
    }

    const role = String(url.searchParams.get('role') || '').toLowerCase();
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();

    if (role === 'radio' || role === 'guard') {
      const id = String(url.searchParams.get('id') || crypto.randomUUID()).slice(0, 64);
      const name = String(url.searchParams.get('name') || 'MyTuner').slice(0, 48) || 'MyTuner';
      const kind = String(url.searchParams.get('kind') || 'device').slice(0, 32);
      this.attachRadioSocket(id, name, kind, server, role === 'guard');
      return new Response(null, { status: 101, webSocket: client });
    }

    if (role === 'control') {
      const id = crypto.randomUUID();
      let target = String(url.searchParams.get('target') || '').slice(0, 64);
      const entry = { id, target, ws: server };
      this.controls.set(id, entry);
      server.addEventListener('message', (event) => {
        let data = null;
        try { data = JSON.parse(String(event.data || '')); } catch (e) { return; }
        if (!data || typeof data !== 'object') return;
        if (data.type === 'select') {
          const prev = entry.target;
          entry.target = String(data.target || '').slice(0, 64);
          try {
            server.send(JSON.stringify({ type: 'selected', target: entry.target }));
            const radio = this.radios.get(entry.target);
            if (radio?.snapshot) {
              server.send(JSON.stringify({ type: 'state', id: entry.target, state: radio.snapshot }));
            }
            /* Segnala collegamento al target (cerchio focus impostazioni) — senza wake/FCM */
            if (entry.target) {
              this.sendToTarget(entry.target, { type: 'cmd', action: 'link', value: 'select' });
            }
            if (prev && prev !== entry.target && this.countControlsFor(prev) === 0) {
              this.sendToTarget(prev, { type: 'cmd', action: 'unlink', value: 'select_other' });
            }
          } catch (e) { /* ignore */ }
          return;
        }
        if (data.type === 'unlink' || data.type === 'disconnect') {
          const prev = entry.target;
          entry.target = '';
          if (prev && this.countControlsFor(prev) === 0) {
            this.sendToTarget(prev, { type: 'cmd', action: 'unlink', value: 'manual' });
          }
          try { server.send(JSON.stringify({ type: 'selected', target: '' })); } catch (e) { /* ignore */ }
          return;
        }
        if (data.type === 'list') {
          try { server.send(JSON.stringify({ type: 'radios', radios: this.listRadios() })); } catch (e) { /* ignore */ }
          return;
        }
        if (data.type === 'purge' || data.type === 'cleanup') {
          const removed = this.purgeStaleRadios();
          entry.target = '';
          try {
            server.send(JSON.stringify({ type: 'selected', target: '' }));
            server.send(JSON.stringify({
              type: 'info',
              message: removed ? `Lista azzerata (${removed}) — attendi chi si ripresenta` : 'Lista già vuota'
            }));
            server.send(JSON.stringify({ type: 'radios', radios: [] }));
            /* Dopo 1.2s rimanda la lista reale (chi si è già riconnesso) */
            setTimeout(() => {
              try {
                server.send(JSON.stringify({ type: 'radios', radios: this.listRadios() }));
              } catch (e) { /* ignore */ }
            }, 1200);
          } catch (e) { /* ignore */ }
          return;
        }
        if (data.type === 'cmd') {
          const tid = String(data.target || entry.target || '').slice(0, 64);
          if (!tid) {
            try { server.send(JSON.stringify({ type: 'error', message: 'Nessuna radio selezionata' })); } catch (e) { /* ignore */ }
            return;
          }
          const ok = this.sendToTarget(tid, {
            type: 'cmd',
            action: String(data.action || '').slice(0, 40),
            value: data.value
          });
          if (!ok) {
            try {
              server.send(JSON.stringify({
                type: 'info',
                message: 'Standby: push inviata — tocca la notifica sul tablet'
              }));
            } catch (e) { /* ignore */ }
          }
        }
      });
      server.addEventListener('close', () => this.dropControl(id));
      server.addEventListener('error', () => this.dropControl(id));
      try {
        server.send(JSON.stringify({ type: 'welcome', role: 'control', id }));
        server.send(JSON.stringify({ type: 'radios', radios: this.listRadios() }));
      } catch (e) { /* ignore */ }
      return new Response(null, { status: 101, webSocket: client });
    }

    try { server.close(1008, 'role invalid'); } catch (e) { /* ignore */ }
    return json({ error: 'role=radio|control|guard' }, 400);
  }
}
