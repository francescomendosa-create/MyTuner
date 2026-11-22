"""Rimuove la radio baked-in dagli sfondi scena, lascia mobile/nicchia vuota."""
from PIL import Image, ImageFilter, ImageDraw
import os
import numpy as np

base = os.path.join(os.path.dirname(__file__), '..', 'public', 'img', 'bg')
base = os.path.normpath(base)


def fill_niche_from_frame(path, margin_frac=0.10):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    arr = np.asarray(im).astype(np.float32)
    mx = max(8, int(w * margin_frac))
    my = max(8, int(h * margin_frac))
    result = arr.copy()

    left = arr[:, :mx, :]
    right = arr[:, w - mx :, :]
    for x in range(mx, w - mx):
        t = (x - mx) / max(1, (w - 2 * mx))
        lx = mx - 1 - ((x - mx) % mx)
        rx = (x - (w - mx)) % mx
        L = left[:, lx, :]
        R = right[:, rx, :]
        result[:, x, :] = (1 - t) * L + t * R

    top = arr[:my, :, :]
    bot = arr[h - my :, :, :]
    for y in range(my, h - my):
        t = (y - my) / max(1, (h - 2 * my))
        ty = my - 1 - ((y - my) % my)
        by = (y - (h - my)) % my
        T = top[ty, :, :]
        B = bot[by, :, :]
        row = (1 - t) * T + t * B
        result[y, :, :] = 0.55 * result[y, :, :] + 0.45 * row

    # cornice originale intatta
    result[:my, :, :] = arr[:my, :, :]
    result[h - my :, :, :] = arr[h - my :, :, :]
    result[:, :mx, :] = arr[:, :mx, :]
    result[:, w - mx :, :] = arr[:, w - mx :, :]

    out = Image.fromarray(np.clip(result, 0, 255).astype(np.uint8))

    # nicchia scura centrale (posto per il chassis vero)
    overlay = Image.new('RGB', (w, h), (8, 6, 4))
    mask = Image.new('L', (w, h), 0)
    md = ImageDraw.Draw(mask)
    pad_x = int(w * 0.055)
    pad_y = int(h * 0.07)
    md.rounded_rectangle(
        [pad_x, pad_y, w - pad_x, h - pad_y],
        radius=max(8, w // 40),
        fill=210,
    )
    mask = mask.filter(ImageFilter.GaussianBlur(14))
    niche = Image.composite(Image.blend(out, overlay, 0.62), out, mask)

    bak = path + '.bak.png'
    if not os.path.exists(bak):
        Image.open(path).save(bak)
    niche.save(path, optimize=True)
    print('updated', path, niche.size)


def main():
    jobs = [
        ('scaffale-legno-noce.png', 0.10),
        ('laccata-grigia.png', 0.12),
        ('acciaio-incassato.png', 0.12),
    ]
    for name, frac in jobs:
        fill_niche_from_frame(os.path.join(base, name), margin_frac=frac)
    print('done')


if __name__ == '__main__':
    main()
