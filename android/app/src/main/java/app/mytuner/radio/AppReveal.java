package app.mytuner.radio;

import android.app.Activity;
import android.app.ActivityManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;

import java.util.List;

/**
 * Porta MyTuner in primo piano (sveglia / telecomando).
 * Schermo acceso + app in recent → {@link ActivityManager.AppTask#moveToFront()} (niente heads-up).
 * Schermo spento → notifica silenziosa + full-screen intent, poi cancel.
 */
public final class AppReveal {
    public static final String CHANNEL_ID = "mytuner_remote_wake_silent";
    public static final int NOTIFY_ID = 44002;

    private AppReveal() {}

    public static boolean isScreenInteractive(Context ctx) {
        try {
            PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
            return pm != null && pm.isInteractive();
        } catch (Exception e) {
            return false;
        }
    }

    public static void pulseCpu(Context ctx) {
        try {
            PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
            if (pm == null) return;
            @SuppressWarnings("deprecation")
            PowerManager.WakeLock wl = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "MyTuner:RevealPulse"
            );
            wl.acquire(2500);
        } catch (Exception ignored) { }
    }

    public static Intent wakeIntent(Context ctx, String action, String value, boolean alarmReveal) {
        Intent intent = new Intent(ctx, MainActivity.class);
        intent.setAction("app.mytuner.radio.REMOTE_WAKE");
        intent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_CLEAR_TOP
                | Intent.FLAG_ACTIVITY_SINGLE_TOP
                | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
        );
        if (action != null) intent.putExtra("remote_action", action);
        if (value != null) intent.putExtra("remote_value", value);
        intent.putExtra("wake_display", true);
        if (alarmReveal) intent.putExtra("alarm_reveal", true);
        return intent;
    }

    /** Riporta in primo piano i task di questa app (funziona con processo ancora in RAM). */
    public static void moveOwnTasksToFront(Context ctx) {
        if (ctx == null) return;
        try {
            ActivityManager am = (ActivityManager) ctx.getSystemService(Context.ACTIVITY_SERVICE);
            if (am == null) return;
            List<ActivityManager.AppTask> tasks = am.getAppTasks();
            if (tasks == null || tasks.isEmpty()) return;
            for (ActivityManager.AppTask task : tasks) {
                try { task.moveToFront(); } catch (Exception ignored) { }
            }
        } catch (Exception ignored) { }
    }

    public static void bringToFront(Context ctx, String action, String value, boolean alarmReveal, boolean forceNotify) {
        bringToFront(ctx, null, action, value, alarmReveal, forceNotify);
    }

    public static void bringToFront(
        Context ctx,
        Activity activity,
        String action,
        String value,
        boolean alarmReveal,
        boolean forceNotify
    ) {
        if (ctx == null) return;
        pulseCpu(ctx);
        if (activity != null) {
            try { RemoteWakePlugin.applyWake(activity); } catch (Exception ignored) { }
        }

        /* 1) Task già in recent: portalo avanti (schermo acceso / home) */
        moveOwnTasksToFront(ctx);

        Intent intent = wakeIntent(ctx, action, value, alarmReveal);
        try {
            if (activity != null) activity.startActivity(intent);
            else ctx.startActivity(intent);
        } catch (Exception ignored) { }

        Handler h = new Handler(Looper.getMainLooper());
        h.postDelayed(() -> moveOwnTasksToFront(ctx), 100);
        h.postDelayed(() -> {
            moveOwnTasksToFront(ctx);
            try {
                if (activity != null) activity.startActivity(intent);
                else ctx.startActivity(intent);
            } catch (Exception ignored) { }
        }, 350);
        h.postDelayed(() -> moveOwnTasksToFront(ctx), 800);

        /*
         * Full-screen intent solo a schermo spento.
         * A schermo acceso Android 14+ la trasforma in heads-up (notifica sopra) senza aprire l’app.
         */
        boolean screenOn = isScreenInteractive(ctx);
        if (!screenOn || (forceNotify && !screenOn)) {
            postSilentFullScreen(ctx, intent, alarmReveal);
        }
    }

    private static void postSilentFullScreen(Context ctx, Intent intent, boolean alarmReveal) {
        ensureSilentChannel(ctx);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent fullScreen = PendingIntent.getActivity(ctx, alarmReveal ? 43 : 42, intent, flags);

        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        if (Build.VERSION.SDK_INT >= 34) {
            try {
                if (!nm.canUseFullScreenIntent()) {
                    /* Senza permesso FSI: almeno content intent al tap */
                }
            } catch (Exception ignored) { }
        }

        nm.cancel(NOTIFY_ID);
        /* Contenuto vuoto: serve solo al full-screen intent a schermo spento */
        NotificationCompat.Builder builder = new NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(ctx.getApplicationInfo().icon)
            .setContentTitle("\u200b")
            .setContentText("\u200b")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_SECRET)
            .setSilent(true)
            .setSound(null)
            .setVibrate(null)
            .setDefaults(0)
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .setLocalOnly(true)
            .setShowWhen(false)
            .setTimeoutAfter(400)
            .setContentIntent(fullScreen)
            .setFullScreenIntent(fullScreen, true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder.setChannelId(CHANNEL_ID);
        }
        Notification note = builder.build();
        note.defaults = 0;
        note.sound = null;
        note.vibrate = null;
        nm.notify(NOTIFY_ID, note);
        Handler h = new Handler(Looper.getMainLooper());
        h.postDelayed(() -> {
            try { nm.cancel(NOTIFY_ID); } catch (Exception ignored) { }
        }, 80);
        h.postDelayed(() -> {
            try { nm.cancel(NOTIFY_ID); } catch (Exception ignored) { }
        }, 350);
        h.postDelayed(() -> {
            try { nm.cancel(NOTIFY_ID); } catch (Exception ignored) { }
        }, 900);
    }

    public static void ensureSilentChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        try { nm.deleteNotificationChannel("mytuner_remote_wake"); } catch (Exception ignored) { }

        NotificationChannel ch = new NotificationChannel(
            CHANNEL_ID,
            "Sveglia (silenziosa)",
            NotificationManager.IMPORTANCE_HIGH
        );
        ch.setDescription("Riaccende MyTuner senza suoni né vibrazioni");
        ch.setSound(null, null);
        ch.enableVibration(false);
        ch.setVibrationPattern(null);
        ch.enableLights(false);
        ch.setShowBadge(false);
        ch.setBypassDnd(true);
        ch.setLockscreenVisibility(Notification.VISIBILITY_SECRET);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ch.setAllowBubbles(false);
        }
        nm.createNotificationChannel(ch);
    }
}
