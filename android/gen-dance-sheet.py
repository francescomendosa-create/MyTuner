"""Build tuxedo dancer sheet: 5x3 from user image, integer cells, dark-bg key."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path(
    r"C:\Users\franc\.cursor\projects\c-Users-franc-Documents-GitHub-Radio\assets"
    r"\c__Users_franc_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images"
    r"_fai_ballare_questo_omino_per_un__227805_Md4-abef292d-df7f-49fd-bfd8-8d539a98884d.png"
)
OUT_DIR = Path(r"C:\Users\franc\Documents\GitHub\Radio\public\img")
OUT = OUT_DIR / "dance-man-alpha.png"
RAW = OUT_DIR / "dance-man.png"
COLS, ROWS = 5, 3
OUT_W, OUT_H = 96, 96
INSET = 2


def peaks(profile: np.ndarray, min_gap: int, thr: float) -> list[int]:
    out: list[int] = []
    for i in range(1, len(profile) - 1):
        if profile[i] >= thr and profile[i] >= profile[i - 1] and profile[i] >= profile[i + 1]:
            if not out or i - out[-1] >= min_gap:
                out.append(i)
            elif profile[i] > profile[out[-1]]:
                out[-1] = i
    return out


def detect_bounds(arr: np.ndarray, cols: int, rows: int) -> tuple[list[int], list[int]]:
    """Prefer equal split; refine if clear seams exist."""
    h, w, _ = arr.shape
    # Equal bounds first (rounded) — most AI sheets are near-equal
    vb = [int(round(i * w / cols)) for i in range(cols + 1)]
    hb = [int(round(i * h / rows)) for i in range(rows + 1)]

    gray = arr.mean(axis=2)
    # Seams between frames on these sheets are often near-black gutters
    # Look for darker vertical strips
    col_dark = 255 - gray.mean(axis=0)
    row_dark = 255 - gray.mean(axis=1)
    # Also brighter hairline separators if present
    chroma = arr.max(axis=2) - arr.min(axis=2)
    col_line = ((gray > 40) & (gray < 90) & (chroma < 20)).mean(axis=0)

    print("equal vb", vb, "widths", [vb[i + 1] - vb[i] for i in range(cols)])
    print("equal hb", hb, "heights", [hb[i + 1] - hb[i] for i in range(rows)])

    # Try finding interior seams near equal positions
    def refine(equal: list[int], prof: np.ndarray, axis_len: int) -> list[int]:
        refined = [equal[0]]
        for i in range(1, len(equal) - 1):
            target = equal[i]
            lo = max(1, target - 12)
            hi = min(axis_len - 1, target + 12)
            window = prof[lo:hi]
            # pick darkest (gutter) or strongest line in window
            local = lo + int(np.argmax(window))
            refined.append(local)
        refined.append(equal[-1])
        return refined

    vb2 = refine(vb, col_dark + col_line * 200, w)
    hb2 = refine(hb, row_dark, h)
    print("refined vb", vb2, "widths", [vb2[i + 1] - vb2[i] for i in range(cols)])
    print("refined hb", hb2, "heights", [hb2[i + 1] - hb2[i] for i in range(rows)])
    return vb2, hb2


def key_cell(rgb: np.ndarray) -> np.ndarray:
    """Dark stage bg -> transparent; keep dancer + soft spotlight floor."""
    pix = rgb.astype(np.float32)
    luma = 0.299 * pix[..., 0] + 0.587 * pix[..., 1] + 0.114 * pix[..., 2]
    chroma = pix.max(axis=2) - pix.min(axis=2)

    # Pure/near-black stage
    hard = luma < 18
    # Soft fade for very dark areas without color (not red/blue gels on floor)
    soft = (luma < 36) & (chroma < 18) & (~hard)

    alpha = np.full(rgb.shape[:2], 255.0, dtype=np.float32)
    alpha[hard] = 0.0
    # Soft: map luma 18..36 -> 0..255
    t = np.clip((luma - 18.0) / 18.0, 0.0, 1.0)
    alpha[soft] = t[soft] * 255.0

    # Kill 1px outer rim (sheet seams)
    alpha[:1, :] = 0
    alpha[-1:, :] = 0
    alpha[:, :1] = 0
    alpha[:, -1:] = 0

    out = np.zeros((*rgb.shape[:2], 4), dtype=np.uint8)
    out[..., :3] = rgb
    out[..., 3] = np.clip(alpha, 0, 255).astype(np.uint8)
    out[out[..., 3] == 0, :3] = 0
    return out


def main() -> None:
    im = Image.open(SRC).convert("RGB")
    RAW.write_bytes(SRC.read_bytes())
    w, h = im.size
    arr = np.asarray(im)
    print("src", w, h)

    vb, hb = detect_bounds(arr, COLS, ROWS)
    frames: list[Image.Image] = []
    for row in range(ROWS):
        for col in range(COLS):
            x0 = vb[col] + INSET
            y0 = hb[row] + INSET
            x1 = vb[col + 1] - INSET
            y1 = hb[row + 1] - INSET
            cell = arr[y0:y1, x0:x1]
            rgba = key_cell(cell)
            frames.append(
                Image.fromarray(rgba, "RGBA").resize((OUT_W, OUT_H), Image.Resampling.LANCZOS)
            )

    sheet = Image.new("RGBA", (OUT_W * COLS, OUT_H * ROWS), (0, 0, 0, 0))
    i = 0
    for row in range(ROWS):
        for col in range(COLS):
            sheet.paste(frames[i], (col * OUT_W, row * OUT_H), frames[i])
            i += 1
    sheet.save(OUT, optimize=True)
    print("wrote", OUT, sheet.size, "frames", len(frames))

    # QA previews
    for idx in (0, 4, 7, 14):
        frames[idx].save(OUT_DIR / f"dance-man-f{idx}.png")
        a = np.asarray(frames[idx])[..., 3]
        print("frame", idx, "opaque", int((a > 20).sum()))


if __name__ == "__main__":
    main()
