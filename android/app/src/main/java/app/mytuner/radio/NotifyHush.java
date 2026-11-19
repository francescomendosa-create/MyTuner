package app.mytuner.radio;

import android.content.Context;
import android.media.AudioManager;

/**
 * Mentre MyTuner è in primo piano: silenzia il canale notifiche di sistema
 * così il “ding” WhatsApp non taglia l’audio della radio.
 */
final class NotifyHush {
    private static boolean held = false;
    private static int savedNotification = -1;
    private static boolean savedHadValue = false;

    private NotifyHush() {}

    static synchronized void engage(Context context) {
        if (context == null || held) return;
        try {
            AudioManager am = (AudioManager) context.getApplicationContext()
                .getSystemService(Context.AUDIO_SERVICE);
            if (am == null) return;
            savedNotification = am.getStreamVolume(AudioManager.STREAM_NOTIFICATION);
            savedHadValue = true;
            if (savedNotification > 0) {
                am.setStreamVolume(AudioManager.STREAM_NOTIFICATION, 0, 0);
            }
            held = true;
        } catch (Exception ignored) { }
    }

    static synchronized void release(Context context) {
        if (!held) return;
        held = false;
        if (!savedHadValue) return;
        try {
            AudioManager am = (AudioManager) context.getApplicationContext()
                .getSystemService(Context.AUDIO_SERVICE);
            if (am == null) return;
            int max = am.getStreamMaxVolume(AudioManager.STREAM_NOTIFICATION);
            int restore = Math.max(0, Math.min(savedNotification, max));
            am.setStreamVolume(AudioManager.STREAM_NOTIFICATION, restore, 0);
        } catch (Exception ignored) { }
        savedHadValue = false;
        savedNotification = -1;
    }
}
