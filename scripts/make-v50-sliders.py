"""Build clean empty tracks + knobs for Vintage50 Mono/Auto sliders.

Uses a geometric stadium fill so the empty recess has no ghost pedina / halo.
Outer cream bezel stays photographic; knob is cut from the real disc.
"""
from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np

skins = Path("public/img/skins")


def find_knob(bgr: np.ndarray, alpha: np.ndarray, prefer: str) -> tuple[float, float, float]:
    h, w = bgr.shape[:2]
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    yy, xx = np.ogrid[:h, :w]
    mask = (gray > 155) & (alpha > 200)
    mask &= (yy > h * 0.16) & (yy < h * 0.84)
    mask &= (xx > w * 0.10) & (xx < w * 0.90)
    dark = (gray < 130) & (alpha > 200)
    dark_d = cv2.distanceTransform(dark.astype(np.uint8), cv2.DIST_L2, 3)
    mask &= dark_d < 58
    mask_u8 = mask.astype(np.uint8) * 255
    mask_u8 = cv2.morphologyEx(mask_u8, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    mask_u8 = cv2.morphologyEx(mask_u8, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, _labels, stats, cents = cv2.connectedComponentsWithStats(mask_u8, 8)
    best = None
    for i in range(1, n):
        _x, _y, bw, bh, area = stats[i]
        if area < 2800 or area > w * h * 0.42:
            continue
        cx, cy = float(cents[i][0]), float(cents[i][1])
        aspect = bw / max(1.0, bh)
        if aspect < 0.72 or aspect > 1.40:
            continue
        if abs(cy - h / 2) > h * 0.22:
            continue
        roundness = min(bw, bh) / max(bw, bh)
        side = cx if prefer == "right" else (w - cx)
        score = area * 8 + roundness * 4000 + side
        if best is None or score > best[0]:
            best = (score, cx, cy, float(max(bw, bh) * 0.50))
    if best is None:
        raise RuntimeError("knob not found")
    return best[1], best[2], best[3]


def stadium_alpha(h: int, w: int, left_cx: float, right_cx: float, cy: float, r: float) -> np.ndarray:
    """Anti-aliased coverage of a horizontal stadium (0..1)."""
    yy, xx = np.mgrid[:h, :w].astype(np.float32)
    # Distance to stadium: 0 inside, positive outside
    x_clamped = np.clip(xx, left_cx, right_cx)
    dist = np.sqrt((xx - x_clamped) ** 2 + (yy - cy) ** 2)
    # Soft 1.6px edge
    return np.clip((r - dist) / 1.6 + 1.0, 0.0, 1.0)


def sample_empty_recess(
    bgr: np.ndarray, alpha: np.ndarray, cx: float, cy: float, r: float
) -> np.ndarray:
    """Median dark recess color from the empty side (away from pedina)."""
    h, w = bgr.shape[:2]
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    if cx >= w * 0.5:
        xs0, xs1 = int(w * 0.20), int(max(w * 0.20 + 8, cx - r - 16))
    else:
        xs0, xs1 = int(min(w * 0.80 - 8, cx + r + 16)), int(w * 0.80)
    xs0 = max(0, xs0)
    xs1 = min(w, max(xs0 + 8, xs1))
    ys0, ys1 = int(h * 0.32), int(h * 0.68)
    region = bgr[ys0:ys1, xs0:xs1]
    rg = gray[ys0:ys1, xs0:xs1]
    aa = alpha[ys0:ys1, xs0:xs1]
    pick = (rg > 40) & (rg < 125) & (aa > 200)
    dark = region[pick]
    if len(dark) < 30:
        pick = (rg > 40) & (rg < 150) & (aa > 200)
        dark = region[pick]
    if len(dark) < 10:
        return np.array([70, 95, 120], dtype=np.uint8)  # BGR fallback olive
    return np.median(dark.reshape(-1, 3), axis=0).astype(np.uint8)


def make_assets(src_name: str, out_prefix: str, prefer: str) -> dict:
    path = skins / src_name
    img = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if img is None:
        raise SystemExit(f"missing {path}")
    if img.shape[2] == 4:
        bgr = img[:, :, :3].copy()
        alpha = img[:, :, 3].copy()
    else:
        bgr = img.copy()
        alpha = np.full(bgr.shape[:2], 255, np.uint8)

    h, w = bgr.shape[:2]
    cx, cy, r = find_knob(bgr, alpha, prefer)
    print(f"{out_prefix}: knob cx={cx:.1f} cy={cy:.1f} r={r:.1f} size={w}x{h}")

    right_cx = cx if cx >= w * 0.5 else (w - cx)
    left_cx = w - right_cx
    # Keep pedina travel inside the dark guide, away from cream rim
    left_cx = max(r + w * 0.145, min(left_cx, right_cx - r * 1.12))

    med = sample_empty_recess(bgr, alpha, cx, cy, r)
    print(f"  recess BGR median={med.tolist()}")

    # Stadium slightly smaller than knob radius so cream bezel rim stays photographic
    cover_r = r + 3.0
    cov = stadium_alpha(h, w, left_cx, right_cx, cy, cover_r)
    # Don't paint outside opaque soft interior
    opaque = (alpha > 200).astype(np.float32)
    inner = cv2.erode((opaque > 0).astype(np.uint8) * 255, np.ones((9, 9), np.uint8))
    cov = cov * (inner.astype(np.float32) / 255.0)

    noise = np.random.randint(-2, 3, bgr.shape, dtype=np.int16)
    fill = np.clip(med.astype(np.int16) + noise, 0, 255).astype(np.float32)

    cleaned = bgr.astype(np.float32)
    # Replace only where coverage is strong; leave outer cream untouched
    a = cov[..., None]
    cleaned = cleaned * (1.0 - a) + fill * a
    cleaned = np.clip(cleaned, 0, 255).astype(np.uint8)

    # Kill any leftover bright ghost pixels inside strong coverage
    g = cv2.cvtColor(cleaned, cv2.COLOR_BGR2GRAY)
    ghost = (cov > 0.85) & (g > 145) & (alpha > 200)
    if ghost.any():
        cleaned[ghost] = med

    track_rgba = np.dstack([cleaned, alpha])
    cv2.imwrite(str(skins / f"{out_prefix}-track.png"), track_rgba)

    pad = 2
    ksize = int(np.ceil(r * 2 + pad * 2))
    ox = int(round(cx - r - pad))
    oy = int(round(cy - r - pad))
    knob = np.zeros((ksize, ksize, 4), np.uint8)
    yy_k, xx_k = np.mgrid[:ksize, :ksize]
    sx = ox + xx_k
    sy = oy + yy_k
    valid = (sx >= 0) & (sy >= 0) & (sx < w) & (sy < h)
    d = np.sqrt((sx - cx) ** 2 + (sy - cy) ** 2)
    inside = valid & (d <= r + 0.5)
    knob_a = np.zeros((ksize, ksize), np.float32)
    knob_a[inside] = alpha[sy[inside], sx[inside]].astype(np.float32)
    edge = inside & (d > r - 1.0)
    knob_a[edge] *= np.clip((r + 0.5 - d[edge]) / 1.5, 0, 1)
    knob[..., :3][inside] = bgr[sy[inside], sx[inside]]
    knob[..., 3] = np.clip(knob_a, 0, 255).astype(np.uint8)
    cv2.imwrite(str(skins / f"{out_prefix}-knob.png"), knob)

    geom = {
        "w": w,
        "h": h,
        "r": r,
        "ksize": ksize,
        "leftPct": (left_cx - r) / w * 100,
        "rightPct": (right_cx - r) / w * 100,
        "wPct": ksize / w * 100,
        "hPct": ksize / h * 100,
        "topPct": (cy - r - pad) / h * 100,
    }
    print("geom", geom)
    rr = int(r)
    yy2, xx2 = np.ogrid[-rr : rr + 1, -rr : rr + 1]
    disk = xx2 * xx2 + yy2 * yy2 <= rr * rr
    for label, cc in [("left", left_cx), ("right", right_cx)]:
        x0, y0 = int(cc - rr), int(cy - rr)
        patch = cleaned[y0 : y0 + 2 * rr + 1, x0 : x0 + 2 * rr + 1]
        if patch.shape[:2] != disk.shape:
            continue
        gg = cv2.cvtColor(patch, cv2.COLOR_BGR2GRAY)[disk]
        print(f"  {label} disk mean={gg.mean():.1f} std={gg.std():.1f} max={gg.max()}")
    return geom


def main() -> None:
    mono = make_assets("vintage-50-mono-right.png", "vintage-50-mono", "right")
    auto = make_assets("vintage-50-auto-left.png", "vintage-50-auto", "right")
    (skins / "_slider-geom.json").write_text(
        json.dumps({"mono": mono, "auto": auto}, indent=2), encoding="utf-8"
    )
    print("done")


if __name__ == "__main__":
    main()
