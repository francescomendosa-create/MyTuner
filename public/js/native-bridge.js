/* Unico ponte nativo/web: stessa API su PWA e APK Android (Capacitor) */
(function (global) {
  const NativeBridge = {
    isNative() {
      try {
        return Boolean(global.Capacitor?.isNativePlatform?.() || global.Capacitor?.Plugins?.RemoteWake);
      } catch (e) {
        return false;
      }
    },

    platform() {
      try {
        return global.Capacitor?.getPlatform?.() || (this.isNative() ? 'android' : 'web');
      } catch (e) {
        return 'web';
      }
    },

    async wakeDisplay(opts) {
      const o = opts || {};
      const plugin = global.Capacitor?.Plugins?.RemoteWake;
      if (plugin?.wakeScreen) {
        try {
          const reveal = Boolean(o.reveal) || String(o.reason || '') === 'alarm';
          await plugin.wakeScreen({ ...o, reveal });
          return { ok: true, path: 'native', revealed: reveal };
        } catch (e) {
          return { ok: false, path: 'native', error: String(e?.message || e) };
        }
      }
      /* Web: non può accendere lo schermo spento */
      try { global.focus?.(); } catch (e) { /* ignore */ }
      return { ok: false, path: 'web', error: 'web_no_screen_wake' };
    },

    async scheduleAlarmClock(opts) {
      const plugin = global.Capacitor?.Plugins?.RemoteWake;
      if (!plugin?.scheduleAlarmClock) return { ok: false, path: 'web' };
      try {
        return await plugin.scheduleAlarmClock(opts || {});
      } catch (e) {
        return { ok: false, error: String(e?.message || e) };
      }
    },

    async cancelAlarmClock() {
      const plugin = global.Capacitor?.Plugins?.RemoteWake;
      if (!plugin?.cancelAlarmClock) return { ok: false };
      try {
        return await plugin.cancelAlarmClock();
      } catch (e) {
        return { ok: false };
      }
    },

    async keepAwake(on) {
      const plugin = global.Capacitor?.Plugins?.RemoteWake;
      if (plugin?.keepAwake) {
        try {
          await plugin.keepAwake({ on: Boolean(on) });
          return true;
        } catch (e) {
          return false;
        }
      }
      return false;
    },

    /* Schermo off; keepCpu=true tiene PARTIAL_WAKE_LOCK per audio in soft-standby */
    async allowStandby(opts = {}) {
      const plugin = global.Capacitor?.Plugins?.RemoteWake;
      const keepCpu = Boolean(opts?.keepCpu);
      if (plugin?.allowStandby) {
        try {
          await plugin.allowStandby({ background: false, keepCpu });
          return true;
        } catch (e) {
          return false;
        }
      }
      if (!keepCpu) {
        try { await this.keepAwake(false); } catch (e) { /* ignore */ }
      }
      return false;
    },

    /* Long-press Power telecomando: chiude l’Activity Android */
    async exitApp() {
      const plugin = global.Capacitor?.Plugins?.RemoteWake;
      if (!plugin?.exitApp) return false;
      try {
        await plugin.exitApp();
        return true;
      } catch (e) {
        return false;
      }
    },

    async setBrightness(level) {
      const plugin = global.Capacitor?.Plugins?.RemoteWake;
      if (!plugin?.setBrightness) return false;
      try {
        await plugin.setBrightness({ level: Number(level) });
        return true;
      } catch (e) {
        return false;
      }
    },

    async restoreBrightness() {
      const plugin = global.Capacitor?.Plugins?.RemoteWake;
      if (!plugin?.restoreBrightness) return false;
      try {
        await plugin.restoreBrightness();
        return true;
      } catch (e) {
        return false;
      }
    },

    async registerPushForRemote(sendToHub) {
      if (!this.isNative()) return null;
      const Push = global.Capacitor?.Plugins?.PushNotifications;
      if (!Push) return null;
      try {
        let perm = await Push.checkPermissions();
        if (perm.receive !== 'granted') {
          perm = await Push.requestPermissions();
        }
        if (perm.receive !== 'granted') return null;
        await Push.register();
        return await new Promise((resolve) => {
          const done = (token) => {
            try { Push.removeAllListeners?.(); } catch (e) { /* ignore */ }
            if (token && typeof sendToHub === 'function') {
              try { sendToHub(token); } catch (e) { /* ignore */ }
            }
            resolve(token || null);
          };
          Push.addListener('registration', (t) => done(t?.value || t?.token || null));
          Push.addListener('registrationError', () => done(null));
          global.setTimeout(() => done(null), 8000);
        });
      } catch (e) {
        return null;
      }
    },

    castPlugin() {
      return global.Capacitor?.Plugins?.NativeCast || null;
    },

    hasNativeCast() {
      return Boolean(this.castPlugin());
    },

    async castAvailable() {
      const p = this.castPlugin();
      if (!p?.available) return false;
      try {
        const res = await p.available();
        return Boolean(res?.available);
      } catch (e) {
        return false;
      }
    },

    async castGetState() {
      const p = this.castPlugin();
      if (!p?.getState) return { connected: false };
      try { return await p.getState(); } catch (e) { return { connected: false }; }
    },

    async castRequestSession() {
      const p = this.castPlugin();
      if (!p?.requestSession) return { ok: false };
      return p.requestSession();
    },

    async castStartScan() {
      const p = this.castPlugin();
      if (!p?.startScan) return this.castRequestSession();
      return p.startScan();
    },

    async castStopScan() {
      const p = this.castPlugin();
      if (!p?.stopScan) return { ok: false };
      return p.stopScan();
    },

    async castListRoutes() {
      const p = this.castPlugin();
      if (!p?.listRoutes) return { routes: [] };
      try { return await p.listRoutes(); } catch (e) { return { routes: [] }; }
    },

    async castSelectRoute(id) {
      const p = this.castPlugin();
      if (!p?.selectRoute) return { ok: false };
      return p.selectRoute({ id });
    },

    async castEndSession() {
      const p = this.castPlugin();
      if (!p?.endSession) return { ok: false };
      return p.endSession();
    },

    async castLoadMedia(opts) {
      const p = this.castPlugin();
      if (!p?.loadMedia) return { ok: false };
      return p.loadMedia(opts || {});
    },

    async castSetVolume(unit) {
      const p = this.castPlugin();
      if (!p?.setVolume) return { ok: false };
      return p.setVolume({ volume: unit });
    },

    onCastState(handler) {
      return this._onCastEvent('castState', handler);
    },

    onCastRoutes(handler) {
      return this._onCastEvent('castRoutes', handler);
    },

    _onCastEvent(eventName, handler) {
      const p = this.castPlugin();
      if (!p?.addListener || typeof handler !== 'function') return () => {};
      let handle = null;
      try {
        const maybe = p.addListener(eventName, (ev) => handler(ev || {}));
        if (maybe && typeof maybe.then === 'function') {
          maybe.then((h) => { handle = h; }).catch(() => {});
        } else {
          handle = maybe;
        }
      } catch (e) { /* ignore */ }
      return () => {
        try { handle?.remove?.(); } catch (e) { /* ignore */ }
      };
    },

    whatsAppPlugin() {
      return global.Capacitor?.Plugins?.WhatsAppNotify || null;
    },

    hasWhatsAppNotify() {
      return Boolean(this.whatsAppPlugin());
    },

    async whatsAppAccessEnabled() {
      const p = this.whatsAppPlugin();
      if (!p?.isEnabled) return false;
      try {
        const res = await p.isEnabled();
        return Boolean(res?.enabled);
      } catch (e) {
        return false;
      }
    },

    async openWhatsAppAccessSettings() {
      const p = this.whatsAppPlugin();
      if (!p?.openAccessSettings) return false;
      try {
        await p.openAccessSettings();
        return true;
      } catch (e) {
        return false;
      }
    },

    async openWhatsApp() {
      const p = this.whatsAppPlugin();
      if (!p?.openWhatsApp) return false;
      try {
        await p.openWhatsApp();
        return true;
      } catch (e) {
        return false;
      }
    },

    onWhatsAppNotify(handler) {
      const p = this.whatsAppPlugin();
      if (!p?.addListener || typeof handler !== 'function') return () => {};
      let handle = null;
      try {
        const maybe = p.addListener('whatsapp', (ev) => handler(ev || {}));
        if (maybe && typeof maybe.then === 'function') {
          maybe.then((h) => { handle = h; }).catch(() => {});
        } else {
          handle = maybe;
        }
      } catch (e) { /* ignore */ }
      return () => {
        try { handle?.remove?.(); } catch (e) { /* ignore */ }
      };
    }
  };

  global.MyTunerNative = NativeBridge;
})(typeof window !== 'undefined' ? window : globalThis);
