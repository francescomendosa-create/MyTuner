"""Asset Banco falegname: fedele alla foto originale, senza tavolo stirato/tagliato."""
from pathlib import Path
import cv2
import numpy as np

SRC = Path(r'C:\Users\franc\.cursor\projects\c-Users-franc-Documents-GitHub-Radio\assets\image-94d50505-c242-4ef4-9c5d-b59509a50ccf.png')
NEAR_SRC = Path('public/img/bg/banco-falegname.jpg')
OUT = Path('public/img/bg')

far = cv2.imread(str(SRC))
assert far is not None, 'missing original workshop image'
print('original', far.shape)

# Upscale 3x nitido (3072x1290) — massima fedeltà alla foto fornita
far_hd = cv2.resize(far, (3072, 1290), interpolation=cv2.INTER_LANCZOS4)
far_hd = cv2.addWeighted(far_hd, 1.18, cv2.GaussianBlur(far_hd, (0, 0), 1.05), -0.18, 0)
cv2.imwrite(str(OUT / 'banco-falegname-lontano.jpg'), far_hd, [cv2.IMWRITE_JPEG_QUALITY, 95])

rh, rw = far_hd.shape[:2]
sx = lambda x: int(round(x * rw / 1024.0))
sy = lambda y: int(round(y * rh / 430.0))

# ------------------------------------------------------------------
# Banco VUOTO: mantieni TUTTA la struttura del banco (morsa, grembiule,
# sgabello, spessore anteriore). Pulisci SOLO un ovale piccolo al centro
# del piano dove atterrerà la radio, con legno campionato DALLA STESSA
# foto (zona tra le pialle, y~280..310) — niente stretch verticale!
# ------------------------------------------------------------------
room = far_hd.copy()

# Donor: fascia di legno del piano tra gli utensili (stessa illuminazione!)
donor = far_hd[sy(275):sy(318), sx(360):sx(620)].copy()
if donor.size == 0:
    donor = far_hd[sy(280):sy(320), sx(400):sx(580)].copy()
print('donor', donor.shape)

# Ovale stretto solo sotto la radio (non toccare bordo anteriore y>340 né morsa)
mask = np.zeros((rh, rw), np.float32)
cv2.ellipse(mask, (sx(510), sy(300)), (sx(210), sy(42)), 0, 0, 360, 1.0, -1)
mask[:, :sx(250)] = 0
mask[:, sx(760):] = 0
mask[:sy(262), :] = 0
mask[sy(338):, :] = 0  # PROTEGGI il bordo anteriore e il grembiule scuro!
mask = cv2.GaussianBlur(mask, (51, 31), 0)
mask = np.clip(mask, 0, 1)

# Riempi l'ovale con tiling orizzontale del donor (senza stretch V)
y0, y1 = sy(262), sy(338)
x0, x1 = sx(250), sx(760)
h, w = y1 - y0, x1 - x0
tile = np.hstack([donor, cv2.flip(donor, 1), donor])
fill = cv2.resize(tile, (w, h), interpolation=cv2.INTER_CUBIC)
# Softer vertical blur to hide tile seams, keep horizontal grain
fill = cv2.GaussianBlur(fill, (1, 7), 0)
# Match local brightness of destination edges
roi = room[y0:y1, x0:x1].astype(np.float32)
a = mask[y0:y1, x0:x1, None]
# slight shade: darker toward back of bench (top of ROI)
for i in range(h):
    s = 0.92 + 0.12 * (i / max(1, h - 1))
    fill[i] = np.clip(fill[i].astype(np.float32) * s, 0, 255).astype(np.uint8)
room[y0:y1, x0:x1] = np.clip(roi * (1.0 - a) + fill.astype(np.float32) * a, 0, 255).astype(np.uint8)

# seamlessClone polish SOLO sull'ovale centrale (non sul bordo anteriore)
src_p = far_hd[sy(278):sy(315), sx(380):sx(600)].copy()
src_big = cv2.resize(src_p, (sx(380), sy(70)), interpolation=cv2.INTER_CUBIC)
sm = np.zeros(src_big.shape[:2], np.uint8)
cv2.ellipse(sm, (src_big.shape[1] // 2, src_big.shape[0] // 2),
            (src_big.shape[1] // 2 - 6, src_big.shape[0] // 2 - 4), 0, 0, 360, 255, -1)
try:
    room = cv2.seamlessClone(src_big, room, sm, (sx(510), sy(300)), cv2.MIXED_CLONE)
except Exception as e:
    print('seamless skip', e)

cv2.imwrite(str(OUT / 'banco-falegname-vuoto.jpg'), room, [cv2.IMWRITE_JPEG_QUALITY, 95])

# ------------------------------------------------------------------
# Parete: pegboard esteso sotto SOLO dietro al banco (per parallasse),
# ma NON usata come texture del piano — solo fondale.
# ------------------------------------------------------------------
wall = room.copy()
peg = room[sy(170):sy(235), :].copy()
ph = peg.shape[0]
for y in range(sy(250), rh):
    by = (y - sy(250)) % ph
    shade = 0.95 - 0.35 * ((y - sy(250)) / max(1.0, rh - sy(250)))
    wall[y] = np.clip(peg[by].astype(np.float32) * shade, 0, 255).astype(np.uint8)
wall[sy(238):sy(268), :] = cv2.GaussianBlur(wall[sy(238):sy(268), :], (1, 15), 0)
cv2.imwrite(str(OUT / 'banco-falegname-parete.jpg'), wall, [cv2.IMWRITE_JPEG_QUALITY, 94])

# ------------------------------------------------------------------
# Near gameplay: se è già HD ok, altrimenti upscale dall'attuale file
# (ripristina da git se necessario — qui lasciamo l'attuale HD se 1920+)
# ------------------------------------------------------------------
near = cv2.imread(str(NEAR_SRC))
if near is not None and near.shape[1] < 1500:
    near_hd = cv2.resize(near, (1920, 1190), interpolation=cv2.INTER_LANCZOS4)
    near_hd = cv2.addWeighted(near_hd, 1.16, cv2.GaussianBlur(near_hd, (0, 0), 1.05), -0.16, 0)
    cv2.imwrite(str(OUT / 'banco-falegname.jpg'), near_hd, [cv2.IMWRITE_JPEG_QUALITY, 94])
    print('near upscaled', near_hd.shape)
else:
    print('near kept', None if near is None else near.shape)

print('done')
for p in ['banco-falegname-lontano.jpg', 'banco-falegname-vuoto.jpg', 'banco-falegname-parete.jpg']:
    im = cv2.imread(str(OUT / p))
    print(f'  {p}: {im.shape[1]}x{im.shape[0]} { (OUT/p).stat().st_size/1e3:.0f}KB')
