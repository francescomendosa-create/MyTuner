"""Find real sprite grid lines in dance-couple.png."""
from __future__ import annotations

import numpy as np
from PIL import Image

SRC = r"C:\Users\franc\Documents\GitHub\Radio\public\img\dance-couple.png"


def main() -> None:
    im = Image.open(SRC).convert("RGB")
    arr = np.asarray(im).astype(np.float32)
    h, w, _ = arr.shape
    gray = arr.mean(axis=2)
    chroma = arr.max(axis=2) - arr.min(axis=2)

    # Grid lines are pale (high luma) and low-chroma relative to fill
    # Emphasize vertical seams: column profile of "line-likeness"
    line_score = (gray > 150) & (chroma < 25)
    # Also relative brightness peaks
    col_bright = gray.mean(axis=0)
    row_bright = gray.mean(axis=1)
    col_line = line_score.mean(axis=0)
    row_line = line_score.mean(axis=1)

    def peaks(profile: np.ndarray, min_gap: int, thr: float) -> list[int]:
        out: list[int] = []
        for i in range(1, len(profile) - 1):
            if profile[i] >= thr and profile[i] >= profile[i - 1] and profile[i] >= profile[i + 1]:
                if not out or i - out[-1] >= min_gap:
                    out.append(i)
                elif profile[i] > profile[out[-1]]:
                    out[-1] = i
        return out

    # Try several thresholds
    for name, prof, gap in [
        ("col_bright", col_bright, 50),
        ("col_line", col_line * 1000 + col_bright, 50),
        ("row_bright", row_bright, 50),
        ("row_line", row_line * 1000 + row_bright, 50),
    ]:
        thr = float(np.percentile(prof, 85))
        p = peaks(prof, gap, thr)
        print(name, "thr", round(thr, 2), "n", len(p), p[:20])

    # Equal split markers
    print("equal_v", [round(i * w / 15) for i in range(16)])
    print("equal_h", [round(i * h / 8) for i in range(9)])

    # Save a debug image marking equal splits in red
    dbg = im.copy().convert("RGB")
    px = dbg.load()
    for i in range(16):
        x = min(w - 1, round(i * w / 15))
        for y in range(h):
            px[x, y] = (255, 0, 0)
    for i in range(9):
        y = min(h - 1, round(i * h / 8))
        for x in range(w):
            px[x, y] = (0, 255, 0)
    out = r"C:\Users\franc\Documents\GitHub\Radio\public\img\dance-grid-debug.png"
    dbg.save(out)
    print("wrote", out)

    # Measure first few cell content centers by scanning for non-gray blobs
    bg = arr[2, 2]
    dist = np.sqrt(((arr - bg) ** 2).sum(axis=2))
    mask = dist > 40
    # For each equal cell, find content
    for col in range(5):
        x0 = round(col * w / 15)
        x1 = round((col + 1) * w / 15)
        cell_mask = mask[0:70, x0:x1]
        ys, xs = np.where(cell_mask)
        if len(xs):
            print(
                "cell", col,
                "content_x", x0 + int(xs.min()), "..", x0 + int(xs.max()),
                "mean", round(x0 + float(xs.mean()), 1),
                "cell_center", (x0 + x1) / 2,
            )


if __name__ == "__main__":
    main()
