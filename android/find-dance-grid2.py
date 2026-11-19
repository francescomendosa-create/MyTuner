"""Refine grid: test 14 vs 15 cols; build bounds from detected lines."""
from __future__ import annotations

import numpy as np
from PIL import Image, ImageDraw

SRC = r"C:\Users\franc\Documents\GitHub\Radio\public\img\dance-couple.png"
OUT = r"C:\Users\franc\Documents\GitHub\Radio\public\img\dance-grid-debug.png"


def peaks(profile: np.ndarray, min_gap: int, thr: float) -> list[int]:
    out: list[int] = []
    for i in range(1, len(profile) - 1):
        if profile[i] >= thr and profile[i] >= profile[i - 1] and profile[i] >= profile[i + 1]:
            if not out or i - out[-1] >= min_gap:
                out.append(i)
            elif profile[i] > profile[out[-1]]:
                out[-1] = i
    return out


def main() -> None:
    im = Image.open(SRC).convert("RGB")
    arr = np.asarray(im).astype(np.float32)
    h, w, _ = arr.shape
    gray = arr.mean(axis=2)
    chroma = arr.max(axis=2) - arr.min(axis=2)
    line_score = ((gray > 150) & (chroma < 25)).mean(axis=0)
    col_prof = line_score * 1000 + gray.mean(axis=0)
    row_line = ((gray > 150) & (chroma < 25)).mean(axis=1)
    row_prof = row_line * 1000 + gray.mean(axis=1)

    vp = peaks(col_prof, 55, float(np.percentile(col_prof, 88)))
    hp = peaks(row_prof, 45, float(np.percentile(row_prof, 88)))
    print("raw v", len(vp), vp)
    print("raw h", len(hp), hp)

    # Drop near-edge false peaks
    vp = [x for x in vp if 20 < x < w - 20]
    hp = [y for y in hp if 20 < y < h - 20]
    print("trimmed v", len(vp), vp)
    print("trimmed h", len(hp), hp)

    vb = [0] + vp + [w]
    hb = [0] + hp + [h]
    print("v bounds", len(vb) - 1, "cells", vb)
    print("h bounds", len(hb) - 1, "cells", hb)
    print("v widths", [vb[i + 1] - vb[i] for i in range(len(vb) - 1)])
    print("h heights", [hb[i + 1] - hb[i] for i in range(len(hb) - 1)])

    dbg = im.copy()
    draw = ImageDraw.Draw(dbg)
    for x in vb:
        draw.line([(x, 0), (x, h - 1)], fill=(255, 0, 0), width=1)
    for y in hb:
        draw.line([(0, y), (w - 1, y)], fill=(0, 255, 0), width=1)
    dbg.save(OUT)
    print("wrote", OUT)

    # Export first 6 cells using these bounds
    bg = arr[2, 2]
    for col in range(min(6, len(vb) - 1)):
        x0, x1 = vb[col], vb[col + 1]
        y0, y1 = hb[0], hb[1]
        # inset 1px from grid
        cell = arr[y0 + 1:y1 - 1, x0 + 1:x1 - 1].astype(np.uint8)
        Image.fromarray(cell).save(
            rf"C:\Users\franc\Documents\GitHub\Radio\public\img\dance-cell{col}.png"
        )
        print("cell", col, cell.shape)


if __name__ == "__main__":
    main()
