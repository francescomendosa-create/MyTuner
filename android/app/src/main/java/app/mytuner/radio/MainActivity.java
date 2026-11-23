package app.mytuner.radio;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static long lastAlarmInjectAt = 0;
    private final Handler immersiveHandler = new Handler(Looper.getMainLooper());
    private boolean immersiveListenerBound = false;
    private final Runnable rehideSystemBars = this::applyImmersiveFullscreen;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RemoteWakePlugin.class);
        registerPlugin(NativeCastPlugin.class);
        registerPlugin(WhatsAppNotifyPlugin.class);
        super.onCreate(savedInstanceState);
        bindImmersiveListener();
        applyImmersiveFullscreen();
        try {
            com.google.android.gms.cast.framework.CastContext.getSharedInstance(this);
        } catch (Exception ignored) { }
        handleRemoteIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleRemoteIntent(intent);
    }

    @Override
    public void onResume() {
        super.onResume();
        applyImmersiveFullscreen();
        try { NotifyHush.engage(this); } catch (Exception ignored) { }
        /* Niente forceAlarmToFront qui: riavviava in loop con intent sticky */
    }

    @Override
    public void onPause() {
        try { NotifyHush.release(this); } catch (Exception ignored) { }
        super.onPause();
    }

    @Override
    public void onDestroy() {
        try { NotifyHush.release(this); } catch (Exception ignored) { }
        super.onDestroy();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) applyImmersiveFullscreen();
    }

    /**
     * Fullscreen sticky: niente status/nav bar al swipe dai bordi
     * (prima BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE faceva scendere orologio/data).
     */
    private void applyImmersiveFullscreen() {
        Window window = getWindow();
        if (window == null) return;
        try {
            window.addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
            window.clearFlags(WindowManager.LayoutParams.FLAG_FORCE_NOT_FULLSCREEN);
            WindowCompat.setDecorFitsSystemWindows(window, false);
            WindowInsetsControllerCompat c =
                WindowCompat.getInsetsController(window, window.getDecorView());
            if (c != null) {
                /* BEHAVIOR_DEFAULT ≈ immersive sticky: le barre non restano aperte col gesto */
                c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_DEFAULT);
                c.hide(WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.navigationBars());
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                WindowManager.LayoutParams lp = window.getAttributes();
                lp.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
                window.setAttributes(lp);
            }
        } catch (Exception ignored) { }
    }

    private void bindImmersiveListener() {
        if (immersiveListenerBound) return;
        Window window = getWindow();
        if (window == null) return;
        View decor = window.getDecorView();
        if (decor == null) return;
        immersiveListenerBound = true;
        ViewCompat.setOnApplyWindowInsetsListener(decor, (v, insets) -> {
            Insets status = insets.getInsets(WindowInsetsCompat.Type.statusBars());
            Insets nav = insets.getInsets(WindowInsetsCompat.Type.navigationBars());
            boolean barsPeeking =
                insets.isVisible(WindowInsetsCompat.Type.statusBars())
                    || insets.isVisible(WindowInsetsCompat.Type.navigationBars())
                    || status.top > 0
                    || nav.bottom > 0
                    || nav.left > 0
                    || nav.right > 0;
            if (barsPeeking) {
                immersiveHandler.removeCallbacks(rehideSystemBars);
                /* Ri-nasconde subito + un secondo colpo se il sistema le ripropone */
                immersiveHandler.post(rehideSystemBars);
                immersiveHandler.postDelayed(rehideSystemBars, 120);
                immersiveHandler.postDelayed(rehideSystemBars, 420);
            }
            return ViewCompat.onApplyWindowInsets(v, insets);
        });
    }

    /**
     * Solo se NON siamo già in primo piano: porta il task avanti.
     * Mai startActivity(MainActivity) da qui → loop onNewIntent.
     */
    private void bringTaskForwardIfNeeded() {
        if (hasWindowFocus()) {
            try { RemoteWakePlugin.applyWake(this); } catch (Exception ignored) { }
            return;
        }
        try { RemoteWakePlugin.applyWake(this); } catch (Exception ignored) { }
        try { AppReveal.moveOwnTasksToFront(this); } catch (Exception ignored) { }
    }

    private void handleRemoteIntent(Intent intent) {
        if (intent == null) return;
        boolean alarmFire = intent.getBooleanExtra("alarm_fire", false)
            || AlarmClockHelper.ACTION_FIRE.equals(intent.getAction());
        boolean alarmReveal = intent.getBooleanExtra("alarm_reveal", false);
        boolean wake = intent.getBooleanExtra("wake_display", false)
            || "app.mytuner.radio.REMOTE_WAKE".equals(intent.getAction())
            || alarmFire
            || alarmReveal;
        if (!wake) return;

        bringTaskForwardIfNeeded();

        String act = intent.getStringExtra("remote_action");
        String val = intent.getStringExtra("remote_value");
        /* Pulisci subito così onResume / re-entry non riparte */
        intent.setAction(Intent.ACTION_MAIN);
        intent.removeExtra("wake_display");
        intent.removeExtra("alarm_reveal");
        intent.removeExtra("alarm_fire");
        intent.removeExtra("remote_action");
        intent.removeExtra("remote_value");
        setIntent(intent);

        if (alarmReveal || alarmFire) {
            try {
                android.app.NotificationManager nm =
                    (android.app.NotificationManager) getSystemService(NOTIFICATION_SERVICE);
                if (nm != null) nm.cancel(45010);
            } catch (Exception ignored) { }
            if (alarmFire) {
                long now = System.currentTimeMillis();
                if (now - lastAlarmInjectAt > 4000L) {
                    lastAlarmInjectAt = now;
                    getBridge().getWebView().postDelayed(this::injectAlarmFire, 350);
                }
            }
            return;
        }

        if (act == null || act.isEmpty()) act = "wake";
        if (val == null || val.isEmpty()) val = "display";
        final boolean powerOn = "power".equals(act)
            && ("on".equalsIgnoreCase(val) || "1".equals(val) || "true".equalsIgnoreCase(val));
        final String injectAct = powerOn ? "power" : "wake";
        final String injectVal = powerOn ? "on" : "display";
        getBridge().getWebView().postDelayed(() -> injectRemoteCmd(injectAct, injectVal), 700);
    }

    private void injectRemoteCmd(String action, String value) {
        try {
            WebView web = getBridge().getWebView();
            if (web == null) return;
            JSONObject payload = new JSONObject();
            payload.put("type", "remote-cmd");
            payload.put("action", action);
            payload.put("value", value);
            payload.put("from", "native-fcm");
            String js = "(function(){try{window.dispatchEvent(new CustomEvent('mytuner-native-cmd',{detail:"
                + payload.toString()
                + "}));}catch(e){}})();";
            web.evaluateJavascript(js, null);
        } catch (Exception ignored) { }
    }

    private void injectAlarmFire() {
        try {
            WebView web = getBridge().getWebView();
            if (web == null) return;
            String js = "(function(){try{window.dispatchEvent(new CustomEvent('mytuner-alarm-fire',"
                + "{detail:{from:'alarm-clock'}}));}catch(e){}})();";
            web.evaluateJavascript(js, null);
        } catch (Exception ignored) { }
    }

    public static void ensureOverlayPermission(android.app.Activity activity) {
        if (activity == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;
        try {
            if (Settings.canDrawOverlays(activity)) return;
            Intent i = new Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + activity.getPackageName())
            );
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(i);
        } catch (Exception ignored) { }
    }
}
