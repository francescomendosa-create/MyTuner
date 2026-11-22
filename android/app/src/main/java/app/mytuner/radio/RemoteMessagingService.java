package app.mytuner.radio;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * FCM high-priority: porta MyTuner in primo piano via {@link AppReveal}.
 */
public class RemoteMessagingService extends FirebaseMessagingService {
    public static final String CHANNEL_ID = AppReveal.CHANNEL_ID;
    public static final int NOTIFY_ID = AppReveal.NOTIFY_ID;
    private static long lastWakeAt = 0;

    @Override
    public void onMessageReceived(RemoteMessage message) {
        Map<String, String> data = message.getData();
        String action = data != null ? data.get("action") : null;
        String value = data != null ? data.get("value") : "fcm";
        if (action == null || action.isEmpty()) action = "power";

        String v = value == null ? "" : value.toLowerCase();
        if ("off".equals(v) || "0".equals(v) || "false".equals(v)) return;
        if ("unlink".equals(action) || "disconnect".equals(action)) return;

        long now = System.currentTimeMillis();
        if (now - lastWakeAt < 1800) return;
        lastWakeAt = now;

        boolean powerOn = "power".equals(action)
            && ("on".equals(v) || "1".equals(v) || "true".equals(v) || v.isEmpty());
        boolean screenOff = !AppReveal.isScreenInteractive(this);
        /* App chiusa (niente task): forza il percorso notifica anche a schermo acceso */
        boolean cold = !AppReveal.hasOwnTasks(this);
        AppReveal.bringToFront(
            this,
            null,
            powerOn ? "power" : "wake",
            powerOn ? "on" : "display",
            false,
            screenOff || cold
        );
    }

    @Override
    public void onNewToken(String token) { /* JS registra il token */ }
}
