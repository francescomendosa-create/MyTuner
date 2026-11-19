from PIL import Image
import numpy as np

im = Image.open(r"C:\Users\franc\Documents\GitHub\Radio\public\img\dance-couple-alpha.png")
arr = np.asarray(im)
fw, fh = 68, 70
print("sheet", im.size)
for idx in [0, 4, 10, 30, 50, 55, 90, 100]:
    c = idx % 15
    r = idx // 15
    cell = arr[r * fh:(r + 1) * fh, c * fw:(c + 1) * fw]
    a = cell[..., 3]
    ys, xs = np.where(a > 20)
    if len(xs) == 0:
        print(idx, "EMPTY")
    else:
        print(
            idx,
            "bbox", int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()),
            "opaque", len(xs),
            "mean_x", round(float(xs.mean()), 1),
            "mean_y", round(float(ys.mean()), 1),
        )
