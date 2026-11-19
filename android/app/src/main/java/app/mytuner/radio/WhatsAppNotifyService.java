package app.mytuner.radio;

import android.app.Notification;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

/**
 * Ascolta notifiche WhatsApp (messaggi), avvisa la UI e le rimuove subito
 * dalla barra di sistema (niente popup che resta sullo schermo).
 */
public class WhatsAppNotifyService extends NotificationListenerService {
    private static final String PKG_WA = "com.whatsapp";
    private static final String PKG_W4B = "com.whatsapp.w4b";
    private static long lastEmitAt = 0L;
    private static String lastKey = "";
    private final Handler main = new Handler(Looper.getMainLooper());

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null) return;
        String pkg = sbn.getPackageName();
        if (!PKG_WA.equals(pkg) && !PKG_W4B.equals(pkg)) return;

        Notification n = sbn.getNotification();
        if (n == null) return;
        if ((n.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;
        if (Notification.CATEGORY_CALL.equals(n.category)) return;

        Bundle extras = n.extras;
        CharSequence title = extras != null ? extras.getCharSequence(Notification.EXTRA_TITLE) : null;
        CharSequence text = extras != null ? extras.getCharSequence(Notification.EXTRA_TEXT) : null;
        String blob = ((title != null ? title : "") + " " + (text != null ? text : "")).toLowerCase();
        if (blob.contains("chiamata in arrivo")
            || blob.contains("incoming call")
            || blob.contains("ringing")
            || blob.contains("videochiamata")
            || blob.contains("voice call")
            || blob.contains("video call")) {
            return;
        }

        final String key = sbn.getKey() != null ? sbn.getKey() : (pkg + ":" + sbn.getId());
        long now = System.currentTimeMillis();
        if (key.equals(lastKey) && now - lastEmitAt < 2500L) {
            /* Aggiornamento duplicato: togli comunque dalla barra */
            dismissQuietly(key);
            return;
        }
        lastKey = key;
        lastEmitAt = now;

        WhatsAppNotifyPlugin.emitNewMessage();
        /* Chiudi subito la notifica di sistema: resta solo l’avviso sul dial */
        dismissQuietly(key);
        main.postDelayed(() -> dismissQuietly(key), 80);
        main.postDelayed(() -> dismissQuietly(key), 250);
    }

    private void dismissQuietly(String key) {
        if (key == null || key.isEmpty()) return;
        try {
            cancelNotification(key);
        } catch (Exception ignored) { }
    }
}
