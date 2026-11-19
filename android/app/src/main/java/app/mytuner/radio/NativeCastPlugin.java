package app.mytuner.radio;

import android.app.Activity;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.mediarouter.media.MediaRouteSelector;
import androidx.mediarouter.media.MediaRouter;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.cast.MediaInfo;
import com.google.android.gms.cast.MediaLoadRequestData;
import com.google.android.gms.cast.MediaMetadata;
import com.google.android.gms.cast.framework.CastContext;
import com.google.android.gms.cast.framework.CastSession;
import com.google.android.gms.cast.framework.SessionManager;
import com.google.android.gms.cast.framework.SessionManagerListener;
import com.google.android.gms.cast.framework.media.RemoteMediaClient;
import com.google.android.gms.common.images.WebImage;

import java.util.ArrayList;
import java.util.List;

/**
 * Cast nativo con lista custom (JS): discovery MediaRouter + selectRoute, senza dialog di sistema.
 */
@CapacitorPlugin(name = "NativeCast")
public class NativeCastPlugin extends Plugin {
    private SessionManagerListener<CastSession> sessionListener;
    private MediaRouter.Callback routeCallback;
    private boolean listening = false;
    private boolean scanning = false;
    private final Handler main = new Handler(Looper.getMainLooper());

    @Override
    public void load() {
        main.post(this::ensureCastContext);
    }

    private CastContext ensureCastContext() {
        try {
            Activity activity = getActivity();
            if (activity == null) return null;
            CastContext ctx = CastContext.getSharedInstance(activity);
            attachListener(ctx);
            return ctx;
        } catch (Exception e) {
            return null;
        }
    }

    private void attachListener(CastContext ctx) {
        if (ctx == null || listening) return;
        SessionManager sm = ctx.getSessionManager();
        if (sm == null) return;
        sessionListener = new SessionManagerListener<CastSession>() {
            @Override public void onSessionStarting(@NonNull CastSession session) {
                emitState("starting", session);
            }
            @Override public void onSessionStarted(@NonNull CastSession session, @NonNull String sessionId) {
                emitState("started", session);
                emitRoutes();
            }
            @Override public void onSessionStartFailed(@NonNull CastSession session, int error) {
                emitState("failed", session);
                emitRoutes();
            }
            @Override public void onSessionEnding(@NonNull CastSession session) {
                emitState("ending", session);
            }
            @Override public void onSessionEnded(@NonNull CastSession session, int error) {
                emitState("ended", session);
                emitRoutes();
            }
            @Override public void onSessionResuming(@NonNull CastSession session, @NonNull String sessionId) {}
            @Override public void onSessionResumed(@NonNull CastSession session, boolean wasSuspended) {
                emitState("resumed", session);
                emitRoutes();
            }
            @Override public void onSessionResumeFailed(@NonNull CastSession session, int error) {
                emitState("failed", session);
            }
            @Override public void onSessionSuspended(@NonNull CastSession session, int reason) {}
        };
        sm.addSessionManagerListener(sessionListener, CastSession.class);
        listening = true;
    }

    private void emitState(String phase, @Nullable CastSession session) {
        notifyListeners("castState", sessionPayload(phase, session));
    }

    private JSObject sessionPayload(String phase, @Nullable CastSession session) {
        JSObject o = new JSObject();
        boolean connected = session != null && session.isConnected();
        o.put("phase", phase == null ? "" : phase);
        o.put("connected", connected);
        String name = "";
        try {
            if (session != null && session.getCastDevice() != null) {
                name = String.valueOf(session.getCastDevice().getFriendlyName());
            }
        } catch (Exception ignored) { }
        o.put("deviceName", name);
        return o;
    }

    private MediaRouter router() {
        return MediaRouter.getInstance(getContext());
    }

    private MediaRouteSelector selector(CastContext ctx) {
        return ctx != null ? ctx.getMergedSelector() : null;
    }

    private JSArray collectRoutes(CastContext ctx) {
        JSArray arr = new JSArray();
        try {
            MediaRouter mr = router();
            MediaRouteSelector sel = selector(ctx);
            if (mr == null || sel == null) return arr;
            List<MediaRouter.RouteInfo> routes = mr.getRoutes();
            MediaRouter.RouteInfo selected = mr.getSelectedRoute();
            for (MediaRouter.RouteInfo r : routes) {
                if (r == null) continue;
                if (!r.isEnabled()) continue;
                if (r.isDefaultOrBluetooth()) continue;
                if (!r.matchesSelector(sel)) continue;
                JSObject item = new JSObject();
                item.put("id", r.getId());
                item.put("name", r.getName() != null ? r.getName() : "Cast");
                String desc = r.getDescription();
                item.put("description", desc != null ? desc : "");
                item.put("selected", selected != null && selected.getId().equals(r.getId()));
                item.put("connecting", r.isConnecting());
                arr.put(item);
            }
        } catch (Exception ignored) { }
        return arr;
    }

    private void emitRoutes() {
        CastContext ctx = ensureCastContext();
        JSObject payload = new JSObject();
        payload.put("routes", collectRoutes(ctx));
        notifyListeners("castRoutes", payload);
    }

    private void ensureScan() {
        CastContext ctx = ensureCastContext();
        if (ctx == null || scanning) return;
        MediaRouteSelector sel = selector(ctx);
        if (sel == null) return;
        routeCallback = new MediaRouter.Callback() {
            @Override public void onRouteAdded(@NonNull MediaRouter router, @NonNull MediaRouter.RouteInfo route) {
                emitRoutes();
            }
            @Override public void onRouteRemoved(@NonNull MediaRouter router, @NonNull MediaRouter.RouteInfo route) {
                emitRoutes();
            }
            @Override public void onRouteChanged(@NonNull MediaRouter router, @NonNull MediaRouter.RouteInfo route) {
                emitRoutes();
            }
            @Override public void onRouteSelected(@NonNull MediaRouter router, @NonNull MediaRouter.RouteInfo route) {
                emitRoutes();
            }
            @Override public void onRouteUnselected(@NonNull MediaRouter router, @NonNull MediaRouter.RouteInfo route) {
                emitRoutes();
            }
        };
        try {
            router().addCallback(
                sel,
                routeCallback,
                MediaRouter.CALLBACK_FLAG_REQUEST_DISCOVERY | MediaRouter.CALLBACK_FLAG_PERFORM_ACTIVE_SCAN
            );
            scanning = true;
            emitRoutes();
        } catch (Exception ignored) { }
    }

    private void stopScanInternal() {
        if (!scanning || routeCallback == null) return;
        try { router().removeCallback(routeCallback); } catch (Exception ignored) { }
        scanning = false;
    }

    @PluginMethod
    public void available(PluginCall call) {
        main.post(() -> {
            CastContext ctx = ensureCastContext();
            JSObject ret = new JSObject();
            ret.put("available", ctx != null);
            ret.put("native", true);
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void getState(PluginCall call) {
        main.post(() -> {
            CastContext ctx = ensureCastContext();
            CastSession session = ctx != null ? ctx.getSessionManager().getCurrentCastSession() : null;
            call.resolve(sessionPayload(session != null && session.isConnected() ? "started" : "idle", session));
        });
    }

    @PluginMethod
    public void startScan(PluginCall call) {
        main.post(() -> {
            ensureScan();
            CastContext ctx = ensureCastContext();
            JSObject ret = new JSObject();
            ret.put("ok", ctx != null);
            ret.put("routes", collectRoutes(ctx));
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void stopScan(PluginCall call) {
        main.post(() -> {
            stopScanInternal();
            JSObject ret = new JSObject();
            ret.put("ok", true);
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void listRoutes(PluginCall call) {
        main.post(() -> {
            ensureScan();
            CastContext ctx = ensureCastContext();
            JSObject ret = new JSObject();
            ret.put("routes", collectRoutes(ctx));
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void selectRoute(PluginCall call) {
        String id = call.getString("id", "");
        if (id == null || id.isEmpty()) {
            call.reject("id mancante");
            return;
        }
        main.post(() -> {
            try {
                CastContext ctx = ensureCastContext();
                ensureScan();
                MediaRouter mr = router();
                MediaRouteSelector sel = selector(ctx);
                MediaRouter.RouteInfo target = null;
                for (MediaRouter.RouteInfo r : mr.getRoutes()) {
                    if (r == null) continue;
                    if (!id.equals(r.getId())) continue;
                    if (sel != null && !r.matchesSelector(sel)) continue;
                    target = r;
                    break;
                }
                if (target == null) {
                    call.reject("Dispositivo non trovato");
                    return;
                }
                mr.selectRoute(target);
                JSObject ret = new JSObject();
                ret.put("ok", true);
                ret.put("id", id);
                ret.put("name", target.getName());
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Select: " + e.getMessage());
            }
        });
    }

    /** Compat: avvia scan (lista custom lato JS). Niente dialog di sistema. */
    @PluginMethod
    public void requestSession(PluginCall call) {
        main.post(() -> {
            CastContext ctx = ensureCastContext();
            if (ctx == null) {
                call.reject("Cast non disponibile");
                return;
            }
            ensureScan();
            JSObject ret = new JSObject();
            ret.put("ok", true);
            ret.put("opened", false);
            ret.put("custom", true);
            ret.put("routes", collectRoutes(ctx));
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void endSession(PluginCall call) {
        main.post(() -> {
            try {
                CastContext ctx = ensureCastContext();
                if (ctx != null) {
                    try {
                        CastSession session = ctx.getSessionManager().getCurrentCastSession();
                        RemoteMediaClient client = session != null ? session.getRemoteMediaClient() : null;
                        if (client != null) client.stop();
                    } catch (Exception ignored) { }
                    ctx.getSessionManager().endCurrentSession(true);
                }
                try {
                    router().unselect(MediaRouter.UNSELECT_REASON_STOPPED);
                } catch (Exception ignored) { }
                emitRoutes();
                JSObject ret = new JSObject();
                ret.put("ok", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        });
    }

    @PluginMethod
    public void loadMedia(PluginCall call) {
        String url = call.getString("url", "");
        String title = call.getString("title", "MyTuner");
        String contentType = call.getString("contentType", "audio/mpeg");
        String image = call.getString("image", null);
        if (url == null || url.isEmpty()) {
            call.reject("URL mancante");
            return;
        }
        main.post(() -> {
            try {
                CastContext ctx = ensureCastContext();
                CastSession session = ctx != null ? ctx.getSessionManager().getCurrentCastSession() : null;
                if (session == null || !session.isConnected()) {
                    call.reject("Nessuna sessione Cast");
                    return;
                }
                RemoteMediaClient client = session.getRemoteMediaClient();
                if (client == null) {
                    call.reject("RemoteMediaClient assente");
                    return;
                }
                MediaMetadata meta = new MediaMetadata(MediaMetadata.MEDIA_TYPE_MUSIC_TRACK);
                meta.putString(MediaMetadata.KEY_TITLE, title != null ? title : "MyTuner");
                meta.putString(MediaMetadata.KEY_ARTIST, "MyTuner Radio");
                if (image != null && !image.isEmpty()) {
                    try { meta.addImage(new WebImage(Uri.parse(image))); } catch (Exception ignored) { }
                }
                MediaInfo info = new MediaInfo.Builder(url)
                    .setStreamType(MediaInfo.STREAM_TYPE_LIVE)
                    .setContentType(contentType != null && !contentType.isEmpty() ? contentType : "audio/mpeg")
                    .setMetadata(meta)
                    .build();
                client.load(new MediaLoadRequestData.Builder()
                    .setMediaInfo(info)
                    .setAutoplay(true)
                    .build());
                JSObject ret = new JSObject();
                ret.put("ok", true);
                ret.put("url", url);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Load Cast: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void setVolume(PluginCall call) {
        Double vol = call.getDouble("volume", 1.0);
        double v = vol == null ? 1.0 : Math.max(0.0, Math.min(1.0, vol));
        main.post(() -> {
            try {
                CastContext ctx = ensureCastContext();
                CastSession session = ctx != null ? ctx.getSessionManager().getCurrentCastSession() : null;
                if (session != null && session.isConnected()) {
                    session.setVolume(v);
                }
                JSObject ret = new JSObject();
                ret.put("ok", true);
                ret.put("volume", v);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        });
    }
}
