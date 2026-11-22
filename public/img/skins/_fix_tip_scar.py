"""Remove leftover tip drawing on crown between FM 100–102; restore gold + brown."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
import cv2

ROOT = Path(r"C:\Users\franc\Documents\GitHub\Radio\public\img\skins")

crown = Image.open(ROOT / "vintage-50-crown.png").convert("RGBA")
arr = np.asarray(crown).astype(np.float32)
h, w = arr.shape[:2]
cx, cy = (w - 1) / 2.0, (h - 1) / 2.0
yy, xx = np.mgrid[0:h, 0:w]
dx, dy = xx - cx, yy - cy
rad = np.sqrt(dx * dx + dy * dy)
ang = (np.degrees(np.arctan2(dy, dx)) + 360.0) % 360.0
R = min(cx, cy)

L = 0.4 * arr[:, :, 0] + 0.35 * arr[:, :, 1] + 0.25 * arr[:, :, 2]
A = arr[:, :, 3]

# --- zones ---
# Brown scale ring (numbers live here)
brown = (rad > 0.78 * R) & (rad < 0.955 * R) & (A > 200)
# Gold knurled ring
gold = (rad > 0.55 * R) & (rad < 0.80 * R) & (A > 200)

# FM 100–102 sits mid-left on this crown (~195–218°)
# Widen a bit to catch the whole tip scar
SEC0, SEC1 = 188.0, 222.0
sector = (ang >= SEC0) & (ang <= SEC1)

# Tip ghost on brown: brighter smear that isn't a clean thin tick
# Ticks are short, near gold, thin in angular width.
brown_sec = brown & sector
bmed = float(np.median(L[brown_sec]))
# bright-ish residual (tip was cream/gold)
ghost = brown_sec & (L > bmed + 28) & (L < 210)
# dilate a little to catch soft edge
ghost_u8 = ghost.astype(np.uint8) * 255
ghost_u8 = cv2.dilate(ghost_u8, np.ones((3, 3), np.uint8), iterations=1)
# remove thin tick marks: keep only blobs with enough area / radial extent
nlab, labels, stats, _ = cv2.connectedComponentsWithStats(ghost_u8, connectivity=8)
keep = np.zeros_like(ghost_u8)
for i in range(1, nlab):
    x, y, bw, bh, area = stats[i]
    if area < 12:
        continue
    # tip scar is wider than a 1px tick
    if bw >= 4 or bh >= 4 or area >= 25:
        keep[labels == i] = 255
print("brown ghost px", int(keep.sum() / 255), "bmed", bmed)

# Gold scar in same sector: local L outliers vs ring median at that radius
gold_sec = gold & sector
# also catch tip protruding from gold into brown (gold-colored wedge)
goldish = (
    sector
    & (A > 200)
    & (rad > 0.70 * R)
    & (rad < 0.90 * R)
    & (arr[:, :, 0] > 150)
    & (arr[:, :, 1] > 110)
    & (arr[:, :, 2] < 130)
    & ((arr[:, :, 0] - arr[:, :, 2]) > 40)
)
# Exclude normal knurled gold band interior (keep only outer fringe toward scale)
gold_scar = goldish & (rad > 0.76 * R)
gold_scar_u8 = gold_scar.astype(np.uint8) * 255
gold_scar_u8 = cv2.dilate(gold_scar_u8, np.ones((2, 2), np.uint8), iterations=1)
print("gold scar px", int(gold_scar_u8.sum() / 255))

# Combined mask for inpaint on RGB (preserve alpha)
mask = np.maximum(keep, gold_scar_u8)
# don't wipe legitimate scale numbers: protect very bright glyph cores if compact
# (optional) — tip ghost is usually mid-bright and blurry

if mask.sum() == 0:
    # fallback: manual wedge between 100–102 based on visual crops
    print("fallback wedge mask")
    mask = np.zeros((h, w), np.uint8)
    # from tip_a / tip_sharp: around x 80-160, y 240-320
    cv2.ellipse(mask, (int(cx), int(cy)), (int(0.88 * R), int(0.88 * R)), 0, 188, 218, 255, 18)
    # only brown+gold fringe
    mask = mask & ((brown | (gold & (rad > 0.72 * R))).astype(np.uint8) * 255)

rgb = np.clip(arr[:, :, :3], 0, 255).astype(np.uint8)
bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
out = cv2.inpaint(bgr, mask, 4, cv2.INPAINT_TELEA)
out = cv2.inpaint(out, mask, 2, cv2.INPAINT_NS)
rgb2 = cv2.cvtColor(out, cv2.COLOR_BGR2RGB).astype(np.float32)

# Second pass: on gold fringe, force blend toward neighbor gold along ring
rs = np.random.RandomState(7)
ys, xs = np.where(mask > 0)
for y, x in zip(ys, xs):
    rr = rad[y, x]
    aa = ang[y, x]
    # sample gold at same radius, ±8° outside scar sector
    samples = []
    for da in (-14, -10, 10, 14):
        a2 = (aa + da) % 360
        # pick pixel at (rr, a2)
        rad_a = np.radians(a2)
        x2 = int(cx + rr * np.cos(rad_a))
        y2 = int(cy + rr * np.sin(rad_a))
        if 0 <= x2 < w and 0 <= y2 < h and A[y2, x2] > 200:
            samples.append(rgb2[y2, x2])
    if not samples:
        continue
    ref = np.median(samples, axis=0)
    if rr > 0.78 * R:
        # brown zone: pull toward brown samples
        browns = []
        for da in (-12, -8, 8, 12):
            a2 = (aa + da) % 360
            rad_a = np.radians(a2)
            x2 = int(cx + rr * np.cos(rad_a))
            y2 = int(cy + rr * np.sin(rad_a))
            if 0 <= x2 < w and 0 <= y2 < h and brown[y2, x2]:
                browns.append(arr[y2, x2, :3])
        if browns:
            ref = np.median(browns, axis=0)
            rgb2[y, x] = 0.2 * rgb2[y, x] + 0.8 * (ref + rs.normal(0, 1.5, 3))
        continue
    # gold zone: solid gold match
    rgb2[y, x] = 0.25 * rgb2[y, x] + 0.75 * (ref + rs.normal(0, 2.0, 3))

rgb2 = np.clip(rgb2, 0, 255)
out_rgba = np.dstack([rgb2.astype(np.uint8), A.astype(np.uint8)])
Image.fromarray(out_rgba, "RGBA").save(ROOT / "vintage-50-crown.png")

# preview
prev = Image.fromarray(out_rgba).convert("RGB")
prev.crop((40, 180, 240, 400)).resize((400, 440), Image.Resampling.NEAREST).save(
    ROOT / "_tip_fixed.jpg", quality=95
)
# before/after strip
before = crown.convert("RGB").crop((40, 180, 240, 400)).resize((200, 220), Image.Resampling.NEAREST)
after = prev.crop((40, 180, 240, 400)).resize((200, 220), Image.Resampling.NEAREST)
strip = Image.new("RGB", (410, 220), (30, 30, 30))
strip.paste(before, (0, 0))
strip.paste(after, (210, 0))
strip.save(ROOT / "_tip_ba.jpg", quality=95)
print("mask total", int(mask.sum() / 255), "saved")
