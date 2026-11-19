# MyTuner Android (guscio nativo)

Stessa web app di sempre (`public/` + Worker). Su Android l’APK Capacitor aggiunge solo la **sveglia schermo** via FCM.

## Architettura

| Percorso | Dove | Cosa fa |
|----------|------|---------|
| `web` | PWA iOS/Android browser | Stessa UI/telecomando; non può riaccendere lo schermo spento |
| `android-native` | APK `app.mytuner.radio` | Stessa UI in WebView + FCM high-priority + `RemoteWake` |

Un solo codice JS (`public/js`). Il ponte è `MyTunerNative` in `native-bridge.js`.

## Setup Firebase (una tantum)

1. Console Firebase → progetto **mytuner-fr-2026** (o quello attivo)
2. Aggiungi app Android con package `app.mytuner.radio`
3. Scarica `google-services.json` → mettilo in `android/app/google-services.json`
4. Cloud Messaging → **Cloud Messaging API (Legacy)** server key  
   oppure crea una chiave server e salvala sul Worker:

```bash
npx wrangler secret put FCM_SERVER_KEY
```

5. Sul tablet: Settings → App → MyTuner → batteria **Non limitare**, notifiche on, “mostra a schermo intero” / full-screen intent se richiesto

## Build APK

```bash
npm install
npx cap sync android
npx cap open android
```

In Android Studio: Run sul tablet USB (o Build → APK).

## Flusso POWER dal telecomando

1. Hub riceve `power` / `wake`
2. Se c’è `fcmToken` → FCM data `priority: high`
3. `RemoteMessagingService` avvia `MainActivity` con full-screen intent + turn screen on
4. JS riceve `mytuner-native-cmd` e completa l’accensione radio

## Note iOS

Su iPhone/iPad resta la **PWA** (nessun secondo store app obbligatorio). Stessa UI e telecomando; wake schermo automatico non è consentito da Apple alle web/PWA.
