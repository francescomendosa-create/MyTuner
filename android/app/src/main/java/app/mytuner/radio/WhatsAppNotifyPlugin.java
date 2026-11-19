package app.mytuner.radio;

import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.provider.Settings;
import android.text.TextUtils;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WhatsAppNotify")
public class WhatsAppNotifyPlugin extends Plugin {
    private static WhatsAppNotifyPlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (instance == this) instance = null;
        super.handleOnDestroy();
    }

    static void emitNewMessage() {
        WhatsAppNotifyPlugin p = instance;
        if (p == null) return;
        JSObject ev = new JSObject();
        ev.put("kind", "message");
        p.notifyListeners("whatsapp", ev);
    }

    @PluginMethod
    public void isEnabled(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("enabled", isListenerEnabled());
        call.resolve(ret);
    }

    @PluginMethod
    public void openAccessSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("ok", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("settings_failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openWhatsApp(PluginCall call) {
        try {
            PackageManager pm = getContext().getPackageManager();
            Intent launch = pm.getLaunchIntentForPackage("com.whatsapp");
            if (launch == null) {
                launch = pm.getLaunchIntentForPackage("com.whatsapp.w4b");
            }
            if (launch == null) {
                call.reject("whatsapp_missing");
                return;
            }
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(launch);
            JSObject ret = new JSObject();
            ret.put("ok", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("open_failed: " + e.getMessage());
        }
    }

    private boolean isListenerEnabled() {
        try {
            String flat = Settings.Secure.getString(
                getContext().getContentResolver(),
                "enabled_notification_listeners"
            );
            if (TextUtils.isEmpty(flat)) return false;
            ComponentName expected = new ComponentName(getContext(), WhatsAppNotifyService.class);
            for (String raw : flat.split(":")) {
                ComponentName cn = ComponentName.unflattenFromString(raw);
                if (cn != null && cn.equals(expected)) return true;
            }
            return flat.contains(expected.flattenToString());
        } catch (Exception e) {
            return false;
        }
    }
}
