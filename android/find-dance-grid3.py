"""Finalize 14x8 grid bounds; rebuild clean alpha sheet."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path(r"C:\Users\franc\Documents\GitHub\Radio\public\img\dance-couple.png")
OUT = Path(r"C:\Users\franc\Documents\GitHub\Radio\public\img\dance-couple-alpha.png")
OUT_W, OUT_H = 72, 68
INSET = 1

# Vertical interiors from line detection (14 columns)
V_INTERIOR = [75, 148, 222, 295, 367, 439, 512, 585, 656, 727, 802, 875, 948]
# Horizontal: equal 8 rows is more stable than noisy detection
ROWS = 8


def key_cell(rgb: np.ndarray, bg: np.ndarray) -> np.ndarray:
    pix = rgb.astype(np.float32)
    bgv = bg.reshape(1, 1, 3)
    dist = np.sqrt(((pix - bgv) ** 2).sum(axis=2))
    chroma = pix.max(axis=2) - pix.min(axis=2)
    is_bg = (dist < 36.0) & (chroma < 28.0)
    is_grid = (chroma < 16.0) & (dist < 52.0)
    alpha = np.full(rgb.shape[:2], 255.0, dtype=np.float32)
    alpha[is_bg | is_grid] = 0.0
    fringe = (~(is_bg | is_grid)) & (dist < 50.0) & (chroma < 38.0)
    t = np.clip((dist - 36.0) / 14.0, 0.0, 1.0)
    alpha[fringe] = t[fringe] * 255.0
    out = np.zeros((*rgb.shape[:2], 4), dtype=np.uint8)
    out[..., :3] = rgb
    out[..., 3] = np.clip(alpha, 0, 255).astype(np.uint8)
    out[out[..., 3] == 0, :3] = 0
    return out


def main() -> None:
    im = Image.open(SRC).convert("RGB")
    w, h = im.size
    arr = np.asarray(im)
    bg = arr[2:6, 2:6].reshape(-1, 3).mean(axis=0)

    vb = [0] + V_INTERIOR + [w]
    hb = [int(round(i * h / ROWS)) for i in range(ROWS + 1)]
    cols = len(vb) - 1
    print("cols", cols, "rows", ROWS, "vb", vb, "hb", hb)
    print("widths", [vb[i + 1] - vb[i] for i in range(cols)])
    print("heights", [hb[i + 1] - hb[i] for i in range(ROWS)])

    frames: list[Image.Image] = []
    for row in range(ROWS):
        for col in range(cols):
            x0 = vb[col] + INSET
            y0 = hb[row] + INSET
            x1 = vb[col + 1] - INSET
            y1 = hb[row + 1] - INSET
            cell = arr[y0:y1, x0:x1]
            rgba = key_cell(cell, bg)
            frames.append(
                Image.fromarray(rgba, "RGBA").resize((OUT_W, OUT_H), Image.Resampling.LANCZOS)
            )

    sheet = Image.new("RGBA", (OUT_W * cols, OUT_H * ROWS), (0, 0, 0, 0))
    i = 0
    for row in range(ROWS):
        for col in range(cols):
            sheet.paste(frames[i], (col * OUT_W, row * OUT_H), frames[i])
            i += 1
    sheet.save(OUT, optimize=True)
    print("wrote", OUT, sheet.size, "frames", len(frames), "cell", OUT_W, OUT_H)

    img_dir = Path(r"C:\Users\franc\Documents\GitHub\Radio\public\img")
    for idx in (0, 1, 4, 20, 40, 55):
        frames[idx].save(img_dir / f"dance-f{idx}.png")
        a = np.asarray(frames[idx])[..., 3]
        print("frame", idx, "opaque", int((a > 20).sum()))

    # meta for JS
    meta = img_dir / "dance-meta.txt"
    meta.write_text(f"cols={cols}\nrows={ROWS}\nfw={OUT_W}\nfh={OUT_H}\nskip=4\n", encoding="utf-8")
    print(meta.read_text())


if __name__ == "__main__":
    main()
