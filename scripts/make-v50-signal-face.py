#!/usr/bin/env python3
"""Remove the fixed SIGNAL needle from vintage-50-face.jpg (from the pre-signal backup).

Clones parchment grain over the needle corridor, keeps arc/ticks/SIGNAL, redraws the "0"
the old needle ran through.
"""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SKINS = ROOT / "public" / "img" / "skins"
FACE = SKINS / "vintage-50-face.jpg"
BACKUP = SKINS / "vintage-50-face.pre-signal.jpg"

X0_FRAC, Y0_FRAC = 0.332, 0.575
MW, MH = 155, 99
PIVOT = np.array([87.7, 89.5])
DIR = np.array([-0.717, -0.697])  # pivot -> tip (photo needle at rest)
ARC_C = np.array([87.4, 75.7])
ARC_R = 58.8
Y_STOP = 75.5  # below this the needle hides in SIGNAL letters: untouched
ZERO_C = (58.0, 57.8)
ZERO_AX = (2.5, 3.4)


def main() -> None:
    if not BACKUP.exists():
        BACKUP.write_bytes(FACE.read_bytes())
    bak = cv2.imread(str(BACKUP))
    h, w = bak.shape[:2]
    x0, y0 = int(X0_FRAC * w), int(Y0_FRAC * h)
    m = bak[y0 : y0 + MH, x0 : x0 + MW].copy()
    mf = m.astype(np.float32)
    g = cv2.cvtColor(m, cv2.COLOR_BGR2GRAY).astype(np.float32)

    yy, xx = np.mgrid[:MH, :MW].astype(np.float32)
    rel_x, rel_y = xx - PIVOT[0], yy - PIVOT[1]
    t = rel_x * DIR[0] + rel_y * DIR[1]
    perp = rel_x * DIR[1] - rel_y * DIR[0]  # signed distance from needle axis
    tip_t = 68.0
    near_tip = np.clip((t - (tip_t - 14)) / 6, 0, 1)
    half = 2.7 + 1.4 * near_tip
    d = np.abs(perp)
    arc_d = np.abs(np.hypot(xx - ARC_C[0], yy - ARC_C[1]) - ARC_R)

    zone = (t > 0) & (t < tip_t + 3) & (yy < Y_STOP)
    weight = np.clip((half + 1.5 - d) / 1.5, 0, 1) * zone
    weight[arc_d < 1.6] = 0
    # ticks near the tip are separate ink outside the core
    ink = g < 140
    weight[ink & (d > half)] = 0
    zero_d = ((xx - ZERO_C[0]) / (ZERO_AX[0] + 1.6)) ** 2 + ((yy - ZERO_C[1]) / (ZERO_AX[1] + 1.6)) ** 2
    weight[zero_d <= 1.0] = 1.0

    # clone grain from parallel strips on both sides of the needle
    out = mf.copy()
    ys, xs = np.where(weight > 0)
    nx, ny = DIR[1], -DIR[0]
    def ok(sx: int, sy: int) -> bool:
        return 0 <= sx < MW and 0 <= sy < MH and weight[sy, sx] == 0 and g[sy, sx] > 125

    for y, x in zip(ys, xs):
        pair = None
        for off in (5.0, 6.0, 7.0, 8.5, 10.0):
            ax, ay = int(round(x + nx * off)), int(round(y + ny * off))
            bx, by = int(round(x - nx * off)), int(round(y - ny * off))
            if ok(ax, ay) and ok(bx, by):
                pair = (mf[ay, ax] + mf[by, bx]) / 2
                break
        if pair is None:
            for off in (5.0, 6.0, 7.0, 8.5, 10.0, -5.0, -6.0, -7.0, -8.5, -10.0):
                sx, sy = int(round(x + nx * off)), int(round(y + ny * off))
                if ok(sx, sy):
                    pair = mf[sy, sx]
                    break
        if pair is None:
            continue
        fill = pair
        wv = weight[y, x]
        out[y, x] = mf[y, x] * (1 - wv) + fill * wv

    # match low-frequency tone of the surrounding paper
    def lowpass(img: np.ndarray, msk: np.ndarray) -> np.ndarray:
        k = (0, 0)
        num = cv2.GaussianBlur(img * msk[..., None], k, 3.0)
        den = cv2.GaussianBlur(msk, k, 3.0)[..., None]
        return num / np.maximum(den, 1e-3)

    paper = ((weight == 0) & (g > 125)).astype(np.float32)
    filled = (weight > 0).astype(np.float32)
    tone = lowpass(mf, paper) - lowpass(out, filled)
    out = out + tone * weight[..., None]

    # soften clone seams inside the corridor only
    sm = cv2.GaussianBlur(out, (3, 3), 0.6)
    core = (weight > 0.5)[..., None]
    out = np.where(core, out * 0.6 + sm * 0.4, out)

    # redraw the "0" (supersampled ring, darken-only)
    ss = 8
    ring = np.zeros((MH * ss, MW * ss), np.uint8)
    cv2.ellipse(
        ring,
        (int(ZERO_C[0] * ss + ss / 2), int(ZERO_C[1] * ss + ss / 2)),
        (int(ZERO_AX[0] * ss), int(ZERO_AX[1] * ss)),
        0, 0, 360, 255, thickness=int(1.3 * ss), lineType=cv2.LINE_AA,
    )
    ring_a = cv2.resize(ring, (MW, MH), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    ink_col = np.array([38, 52, 66], np.float32)  # BGR of the printed digits
    a = (ring_a * 0.92)[..., None]
    out = np.minimum(out, out * (1 - a) + ink_col * a)

    final = np.clip(out, 0, 255).astype(np.uint8)
    face = bak.copy()
    face[y0 : y0 + MH, x0 : x0 + MW] = final
    cv2.imwrite(str(FACE), face, [int(cv2.IMWRITE_JPEG_QUALITY), 98])
    print("patched", FACE.name, "px", int((weight > 0).sum()))


if __name__ == "__main__":
    main()
