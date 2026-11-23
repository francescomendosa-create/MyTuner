"""Rebuild Auto track: mirror the good left empty recess onto the right."""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

skins = Path("public/img/skins")


def find_knob(bgr: np.ndarray, alpha: np.ndarray, prefer: str = "right") -> tuple[float, float, float]:
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
    yy, xx = np.mgrid[:h, :w].astype(np.float32)
    x_clamped = np.clip(xx, left_cx, right_cx)
    dist = np.sqrt((xx - x_clamped) ** 2 + (yy - cy) ** 2)
    return np.clip((r - dist) / 1.6 + 1.0, 0.0, 1.0)


def main() -> None:
    # Prefer mono source: same look user already likes on the left empty side
    src_name = "vintage-50-mono-right.png"
    img = cv2.imread(str(skins / src_name), cv2.IMREAD_UNCHANGED)
    if img is None:
        raise SystemExit(f"missing {src_name}")
    bgr = img[:, :, :3].copy()
    alpha = img[:, :, 3].copy()
    h, w = bgr.shape[:2]
    cx, cy, r = find_knob(bgr, alpha, "right")
    print(f"knob cx={cx:.1f} cy={cy:.1f} r={r:.1f}")

    right_cx = cx if cx >= w * 0.5 else (w - cx)
    left_cx = w - right_cx
    left_cx = max(r + w * 0.145, min(left_cx, right_cx - r * 1.12))

    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    xs0, xs1 = int(w * 0.20), int(max(w * 0.20 + 8, cx - r - 16))
    ys0, ys1 = int(h * 0.32), int(h * 0.68)
    region = bgr[ys0:ys1, xs0:xs1]
    rg = gray[ys0:ys1, xs0:xs1]
    aa = alpha[ys0:ys1, xs0:xs1]
    pick = (rg > 40) & (rg < 125) & (aa > 200)
    dark = region[pick]
    med = np.median(dark.reshape(-1, 3), axis=0).astype(np.uint8)
    print("left recess median BGR", med.tolist())

    cover_r = r + 4.0
    opaque = (alpha > 200).astype(np.uint8) * 255
    inner = cv2.erode(opaque, np.ones((9, 9), np.uint8))
    cov = stadium_alpha(h, w, left_cx, right_cx, cy, cover_r)
    cov = cov * (inner.astype(np.float32) / 255.0)

    rng = np.random.RandomState(7)
    fill = np.clip(med.astype(np.int16) + rng.randint(-2, 3, bgr.shape, dtype=np.int16), 0, 255).astype(
        np.float32
    )
    cleaned = bgr.astype(np.float32)
    cleaned = cleaned * (1.0 - cov[..., None]) + fill * cov[..., None]
    cleaned = np.clip(cleaned, 0, 255).astype(np.uint8)

    # Mirror LEFT (good empty) onto RIGHT across opaque centroid
    ys, xs = np.where(alpha > 200)
    mid_x = float(xs.mean())
    print("mirror axis x", mid_x)

    yy, xx = np.mgrid[:h, :w]
    src_x = np.clip(np.rint(2 * mid_x - xx).astype(np.int32), 0, w - 1)
    mirrored = cleaned[yy, src_x]
    right_side = xx >= mid_x
    both = right_side & (alpha > 180) & (alpha[yy, src_x] > 180)
    out = cleaned.copy()
    out[both] = mirrored[both]

    # Uniform stadium again so recess floor matches left exactly
    cov2 = stadium_alpha(h, w, left_cx, right_cx, cy, cover_r)
    cov2 = cov2 * (inner.astype(np.float32) / 255.0)
    rng2 = np.random.RandomState(11)
    fill2 = np.clip(med.astype(np.int16) + rng2.randint(-2, 3, bgr.shape, dtype=np.int16), 0, 255).astype(
        np.float32
    )
    out_f = out.astype(np.float32)
    out_f = out_f * (1.0 - cov2[..., None]) + fill2 * cov2[..., None]
    out = np.clip(out_f, 0, 255).astype(np.uint8)

    track = np.dstack([out, alpha])
    cv2.imwrite(str(skins / "vintage-50-auto-track.png"), track)

    # Knob from original mono (same as before)
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
    cv2.imwrite(str(skins / "vintage-50-auto-knob.png"), knob)

    left = out[:, : w // 2]
    right_m = cv2.flip(out[:, w // 2 :], 1)
    m = min(left.shape[1], right_m.shape[1])
    diff = cv2.absdiff(left[:, :m], right_m[:, :m])
    print("L vs mirrored-R mean absdiff", float(diff.mean()))

    # Travel geom for CSS (symmetric around mid)
    # Keep mono-like travel which user already accepted for left/right positions
    left_pct = (left_cx - r) / w * 100
    right_pct = (right_cx - r) / w * 100
    print(
        {
            "leftPct": left_pct,
            "rightPct": right_pct,
            "wPct": ksize / w * 100,
            "hPct": ksize / h * 100,
            "topPct": (cy - r - pad) / h * 100,
        }
    )
    print("done")


if __name__ == "__main__":
    main()
