package app.mytuner.radio;

import android.app.ActivityOptions;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;

import androidx.core.app.NotificationCompat;

import java.util.Calendar;

/**
 * Sveglia di sistema: {@link AlarmManager#setAlarmClock} con PendingIntent
 * verso {@link MainActivity} (niente Broadcast in mezzo — così Android apre l’UI).
 */
public final class AlarmClockHelper {
    public static final String ACTION_FIRE = "app.mytuner.radio.ALARM_CLOCK_FIRE";
    public static final int REQ_SHOW = 45001;
    public static final int REQ_FIRE = 45002;
    public static final int REQ_REVEAL = 45003;
    private static final String CH_ALARM = "mytuner_alarm_launch";
    private static final int NOTE_LAUNCH = 45010;

    private AlarmClockHelper() {}

    public static void cancel(Context ctx) {
        if (ctx == null) return;
        try {
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            am.cancel(firePending(ctx));
            am.cancel(showPending(ctx));
        } catch (Exception ignored) { }
        try {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(NOTE_LAUNCH);
        } catch (Exception ignored) { }
    }

    public static boolean canScheduleExact(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true;
        try {
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            return am != null && am.canScheduleExactAlarms();
        } catch (Exception e) {
            return false;
        }
    }

    /** Apre le impostazioni “sveglie e promemoria” se il permesso exact manca. */
    public static void requestExactAlarmSettings(Context ctx) {
        if (ctx == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return;
        if (canScheduleExact(ctx)) return;
        try {
            Intent i = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
            i.setData(Uri.parse("package:" + ctx.getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(i);
        } catch (Exception e) {
            try {
                Intent i = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(i);
            } catch (Exception ignored) { }
        }
    }

    /**
     * @param hhmm "HH:MM" 24h
     * @return trigger epoch ms, oppure 0 se disabilitata/invalida
     */
    public static long schedule(Context ctx, boolean enabled, String hhmm) {
        if (ctx == null) return 0;
        cancel(ctx);
        if (!enabled) return 0;
        long triggerAt = nextTriggerMillis(hhmm);
        if (triggerAt <= 0) return 0;

        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return 0;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !canScheduleExact(ctx)) {
            requestExactAlarmSettings(ctx);
        }

        /* FIRE = Activity diretta: è il percorso privilegiato di setAlarmClock */
        PendingIntent show = showPending(ctx);
        PendingIntent fire = firePending(ctx);
        try {
            AlarmManager.AlarmClockInfo info = new AlarmManager.AlarmClockInfo(triggerAt, show);
            am.setAlarmClock(info, fire);
            return triggerAt;
        } catch (Exception e) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, fire);
                } else {
                    am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, fire);
                }
                return triggerAt;
            } catch (Exception ignored) {
                return 0;
            }
        }
    }

    public static long nextTriggerMillis(String hhmm) {
        if (hhmm == null || hhmm.length() < 4) return 0;
        String[] parts = hhmm.trim().split(":");
        if (parts.length < 2) return 0;
        int hour;
        int minute;
        try {
            hour = Integer.parseInt(parts[0].trim());
            minute = Integer.parseInt(parts[1].trim());
        } catch (Exception e) {
            return 0;
        }
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return 0;

        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        cal.set(Calendar.HOUR_OF_DAY, hour);
        cal.set(Calendar.MINUTE, minute);
        long now = System.currentTimeMillis();
        if (cal.getTimeInMillis() <= now + 1500L) {
            cal.add(Calendar.DAY_OF_YEAR, 1);
        }
        return cal.getTimeInMillis();
    }

    public static Intent launchIntent(Context ctx) {
        Intent intent = new Intent(ctx, MainActivity.class);
        intent.setAction(ACTION_FIRE);
        intent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_CLEAR_TOP
                | Intent.FLAG_ACTIVITY_SINGLE_TOP
                | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
        );
        intent.putExtra("wake_display", true);
        intent.putExtra("alarm_reveal", true);
        intent.putExtra("alarm_fire", true);
        intent.putExtra("remote_action", "alarm");
        intent.putExtra("remote_value", "ring");
        return intent;
    }

    public static PendingIntent showPending(Context ctx) {
        return activityPending(ctx, REQ_SHOW, launchIntent(ctx));
    }

    public static PendingIntent firePending(Context ctx) {
        return activityPending(ctx, REQ_FIRE, launchIntent(ctx));
    }

    public static PendingIntent activityPending(Context ctx, int req, Intent intent) {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        if (Build.VERSION.SDK_INT >= 34) {
            try {
                ActivityOptions opts = ActivityOptions.makeBasic();
                opts.setPendingIntentCreatorBackgroundActivityStartMode(
                    ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED
                );
                return PendingIntent.getActivity(ctx, req, intent, flags, opts.toBundle());
            } catch (Exception ignored) { }
        }
        return PendingIntent.getActivity(ctx, req, intent, flags);
    }

    /**
     * Apertura immediata (JS tick in background): PI + notifica CATEGORY_ALARM
     * con fullScreenIntent (unico modo certo a schermo acceso su Android 14).
     */
    public static void revealNow(Context ctx) {
        if (ctx == null) return;
        AppReveal.pulseCpu(ctx);
        AppReveal.moveOwnTasksToFront(ctx);

        Intent launch = launchIntent(ctx);
        try {
            PendingIntent pi = activityPending(ctx, REQ_REVEAL, launch);
            if (Build.VERSION.SDK_INT >= 34) {
                ActivityOptions opts = ActivityOptions.makeBasic();
                opts.setPendingIntentBackgroundActivityStartMode(
                    ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED
                );
                pi.send(ctx, 0, null, null, null, null, opts.toBundle());
            } else {
                pi.send();
            }
        } catch (Exception e) {
            try { ctx.startActivity(launch); } catch (Exception ignored) { }
        }

        /* Notifica allarme: su molti OEM (Samsung) è l’unico modo per forzare l’UI a schermo acceso */
        postAlarmLaunchNotification(ctx, launch);

        Handler h = new Handler(Looper.getMainLooper());
        h.postDelayed(() -> {
            AppReveal.moveOwnTasksToFront(ctx);
            try { ctx.startActivity(launchIntent(ctx)); } catch (Exception ignored) { }
        }, 300);
        h.postDelayed(() -> AppReveal.moveOwnTasksToFront(ctx), 900);
    }

    private static void ensureAlarmChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel ch = new NotificationChannel(
            CH_ALARM,
            "Sveglia MyTuner",
            NotificationManager.IMPORTANCE_HIGH
        );
        ch.setDescription("Apre MyTuner quando suona la sveglia");
        ch.setSound(null, null);
        ch.enableVibration(false);
        ch.setBypassDnd(true);
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(ch);
    }

    private static void postAlarmLaunchNotification(Context ctx, Intent launch) {
        ensureAlarmChannel(ctx);
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        PendingIntent full = activityPending(ctx, REQ_REVEAL + 1, launch);
        nm.cancel(NOTE_LAUNCH);

        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CH_ALARM)
            .setSmallIcon(ctx.getApplicationInfo().icon)
            .setContentTitle("Sveglia")
            .setContentText("MyTuner")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(true)
            .setSilent(true)
            .setSound(null)
            .setVibrate(null)
            .setDefaults(0)
            .setContentIntent(full)
            .setFullScreenIntent(full, true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            b.setChannelId(CH_ALARM);
        }
        Notification note = b.build();
        note.defaults = 0;
        note.sound = null;
        note.vibrate = null;
        nm.notify(NOTE_LAUNCH, note);

        /* Se l’activity è ripartita, togli la notifica dopo un attimo */
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            try { nm.cancel(NOTE_LAUNCH); } catch (Exception ignored) { }
        }, 2500);
    }
}
