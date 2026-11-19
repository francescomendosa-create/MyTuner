package app.mytuner.radio;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.view.WindowManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "RemoteWake")
public class RemoteWakePlugin extends Plugin {

    private PowerManager.WakeLock wakeLock;
    private static boolean brightnessDimmed = false;
    private static float savedBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE;

    @PluginMethod
    public void wakeScreen(PluginCall call) {
        Activity activity = getActivity();
        Context ctx = getContext();
        String reason = call.getString("reason", "wake");
        boolean reveal = call.getBoolean("reveal", false)
            || "alarm".equalsIgnoreCase(reason);
        if (activity == null && ctx == null) {
            call.reject("Nessuna activity");
            return;
        }
        final Context appCtx = ctx != null ? ctx.getApplicationContext() : null;
        Runnable work = () -> {
            try {
                boolean focused = activity != null && activity.hasWindowFocus();
                if (activity != null) applyWake(activity);
                if (reveal && focused) {
                    /* App già a schermo: solo wake, niente startActivity (causava loop/crash) */
                } else if (reveal && !focused) {
                    Context c = appCtx != null ? appCtx : ctx;
                    AlarmClockHelper.revealNow(c != null ? c : activity);
                    boolean screenOff = c != null && !AppReveal.isScreenInteractive(c);
                    if (screenOff) {
                        AppReveal.bringToFront(c, activity, "alarm", "ring", true, true);
                    }
                }
                JSObject ret = new JSObject();
                ret.put("ok", true);
                ret.put("native", true);
                ret.put("revealed", reveal);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Wake fallita: " + e.getMessage());
            }
        };
        if (activity != null) activity.runOnUiThread(work);
        else work.run();
    }

    /** Schedula sveglia di sistema (riapre l’app anche dalla home). */
    @PluginMethod
    public void scheduleAlarmClock(PluginCall call) {
        Context ctx = getContext();
        if (ctx == null) {
            call.reject("Nessun context");
            return;
        }
        Context app = ctx.getApplicationContext();
        boolean enabled = call.getBoolean("enabled", false);
        String time = call.getString("time", "");
        boolean canExact = AlarmClockHelper.canScheduleExact(app);
        if (enabled && !canExact) {
            AlarmClockHelper.requestExactAlarmSettings(app);
        }
        /* Samsung: senza overlay l’activity può restare dietro la home */
        if (enabled) {
            Activity act = getActivity();
            if (act != null) {
                act.runOnUiThread(() -> MainActivity.ensureOverlayPermission(act));
            }
        }
        long at = AlarmClockHelper.schedule(app, enabled, time);
        JSObject ret = new JSObject();
        ret.put("ok", true);
        ret.put("enabled", enabled && at > 0);
        ret.put("triggerAt", at);
        ret.put("canExact", AlarmClockHelper.canScheduleExact(app));
        call.resolve(ret);
    }

    @PluginMethod
    public void cancelAlarmClock(PluginCall call) {
        Context ctx = getContext();
        if (ctx != null) AlarmClockHelper.cancel(ctx.getApplicationContext());
        JSObject ret = new JSObject();
        ret.put("ok", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void keepAwake(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Nessuna activity");
            return;
        }
        boolean on = call.getBoolean("on", true);
        activity.runOnUiThread(() -> {
            try {
                if (on) {
                    activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    acquireCpuLock(activity.getApplicationContext(), 10 * 60 * 1000L);
                } else {
                    clearKeepFlags(activity);
                    releaseCpuLock();
                }
                JSObject ret = new JSObject();
                ret.put("ok", true);
                ret.put("on", on);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        });
    }

    /**
     * Dopo POWER off: togli wake-lock e manda l'app in background
     * così il tablet può andare in standby. Il telecomando la riprende via FCM.
     */
    @PluginMethod
    public void allowStandby(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Nessuna activity");
            return;
        }
        boolean goBackground = call.getBoolean("background", false);
        activity.runOnUiThread(() -> {
            try {
                restoreBrightnessNow(activity);
                clearKeepFlags(activity);
                releaseCpuLock();
                /* Default: NON uscire dall'app — solo permettere lo spegnimento schermo */
                if (goBackground) {
                    try { activity.moveTaskToBack(true); } catch (Exception ignored) { }
                }
                JSObject ret = new JSObject();
                ret.put("ok", true);
                ret.put("standby", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        });
    }

    /** Luminosità di sistema (0–1). Usata per idle dim reale, non filtro CSS. */
    @PluginMethod
    public void setBrightness(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Nessuna activity");
            return;
        }
        double level = call.getDouble("level", 0.06);
        float clamped = (float) Math.max(0.01, Math.min(1.0, level));
        activity.runOnUiThread(() -> {
            try {
                WindowManager.LayoutParams lp = activity.getWindow().getAttributes();
                if (!brightnessDimmed) {
                    savedBrightness = lp.screenBrightness;
                    brightnessDimmed = true;
                }
                lp.screenBrightness = clamped;
                activity.getWindow().setAttributes(lp);
                JSObject ret = new JSObject();
                ret.put("ok", true);
                ret.put("level", clamped);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        });
    }

    @PluginMethod
    public void restoreBrightness(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Nessuna activity");
            return;
        }
        activity.runOnUiThread(() -> {
            try {
                restoreBrightnessNow(activity);
                JSObject ret = new JSObject();
                ret.put("ok", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        });
    }

    private static void restoreBrightnessNow(Activity activity) {
        if (activity == null || !brightnessDimmed) return;
        try {
            WindowManager.LayoutParams lp = activity.getWindow().getAttributes();
            lp.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE;
            activity.getWindow().setAttributes(lp);
        } catch (Exception ignored) { }
        brightnessDimmed = false;
        savedBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE;
    }

    static void clearKeepFlags(Activity activity) {
        activity.getWindow().clearFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
                | WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON
        );
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            activity.setTurnScreenOn(false);
            activity.setShowWhenLocked(false);
        }
    }

    @PluginMethod
    public void isNative(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("native", true);
        ret.put("platform", "android");
        call.resolve(ret);
    }

    static void applyWake(Activity activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            activity.setShowWhenLocked(true);
            activity.setTurnScreenOn(true);
        } else {
            activity.getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                    | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            );
        }
        activity.getWindow().addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON
        );

        KeyguardManager km = (KeyguardManager) activity.getSystemService(Context.KEYGUARD_SERVICE);
        if (km != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            km.requestDismissKeyguard(activity, null);
        }

        PowerManager pm = (PowerManager) activity.getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            @SuppressWarnings("deprecation")
            PowerManager.WakeLock wl = pm.newWakeLock(
                PowerManager.FULL_WAKE_LOCK
                    | PowerManager.ACQUIRE_CAUSES_WAKEUP
                    | PowerManager.ON_AFTER_RELEASE,
                "MyTuner:RemoteWake"
            );
            wl.acquire(4000);
        }
    }

    private void acquireCpuLock(Context ctx, long ms) {
        releaseCpuLock();
        PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
        if (pm == null) return;
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "MyTuner:Keep");
        wakeLock.acquire(ms);
    }

    private void releaseCpuLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            try { wakeLock.release(); } catch (Exception ignored) { }
        }
        wakeLock = null;
    }
}
