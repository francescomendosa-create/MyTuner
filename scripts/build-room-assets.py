import cv2
import numpy as np
from pathlib import Path

SRC = Path('public/img/bg/soggiorno-radio-lontano.jpg')
OUT_DIR = Path('public/img/bg')

img = cv2.imread(str(SRC))
H, W, _ = img.shape
room = img.copy()

# ------------------------------------------------------------------
# 1) CARTA DA PARATI A ROMBI (x=206..486, y=150..472)
# ------------------------------------------------------------------
wp_period = 60
wp_band = img[90:90 + wp_period, 206:486].copy()
for y in range(150, 472):
    by = (y - 90) % wp_period
    shade = 1.0 - 0.16 * np.clip((y - 150) / 322.0, 0.0, 1.0)
    row = np.clip(wp_band[by].astype(np.float32) * shade, 0, 255).astype(np.uint8)
    if y < 162:
        a = (y - 150) / 12.0
        room[y, 206:486] = np.clip(room[y, 206:486] * (1 - a) + row * a, 0, 255).astype(np.uint8)
    else:
        room[y, 206:486] = row

# ------------------------------------------------------------------
# 2) MURO VERDE OLIVA (x=486..796, y=152..472) — rimuove completamente anche il bordo destro della radio originale (fino a x=784)
# ------------------------------------------------------------------
w_len = 796 - 486
row_ref = cv2.GaussianBlur(img[142:156, 486:796], (21, 5), 0).mean(axis=0).astype(np.float32)
c0, c1 = 608 - 486, 688 - 486
for cx in range(c0, c1):
    t = (cx - c0) / float(c1 - c0)
    row_ref[cx] = row_ref[c0 - 1] * (1.0 - t) + row_ref[c1] * t
row_ref = cv2.GaussianBlur(row_ref[None, :, :], (41, 1), 0)[0]

# Grana muro reale con variazione morbida
grain_src = img[80:150, 495:605].astype(np.float32)
grain_res = grain_src - cv2.GaussianBlur(grain_src, (15, 15), 0)
gh, gw, _ = grain_res.shape

for y in range(152, 472):
    shade = 1.0 - 0.15 * np.clip((y - 152) / 320.0, 0.0, 1.0)
    g_row = grain_res[(y - 152) % gh]
    g_tiled = np.tile(g_row, (int(np.ceil(w_len / gw)), 1))[:w_len]
    row = np.clip(row_ref * shade + g_tiled * 0.95, 0, 255).astype(np.uint8)
    a_row = np.ones((w_len, 1), dtype=np.float32)
    if y < 176:
        a_row[:] = np.clip((y - 152) / 18.0, 0.0, 1.0)
        if y < 163:
            a_row[c0:c1] = 0.0
        else:
            a_row[c0:c1] = np.clip((y - 162) / 10.0, 0.0, 1.0)
    # Sopra la poltrona (y<254) copri completamente fino a x=788; sulla poltrona (y>=254) sfuma da x=772..786
    fade_start = (782 - 486) if y < 254 else (768 - 486)
    fade_w = float(w_len - fade_start)
    for rx in range(fade_start, w_len):
        k = (rx - fade_start) / fade_w
        s = 1.0 - (3 * k * k - 2 * k * k * k)
        a_row[rx] *= s
    room[y, 486:796] = np.clip(room[y, 486:796] * (1.0 - a_row) + row * a_row, 0, 255).astype(np.uint8)

# ------------------------------------------------------------------
# 3) TENDA VERDE SINISTRA (x=170..208, y=154..456)
# ------------------------------------------------------------------
curt_band = img[110:154, 170:208].copy()
ch = curt_band.shape[0]
for y in range(154, 456):
    cy = (y - 154) % ch
    x0 = 170 if y < 414 else 177
    off = x0 - 170
    shade = 1.0 - 0.16 * np.clip((y - 154) / 302.0, 0.0, 1.0)
    row = np.clip(curt_band[cy, off:].astype(np.float32) * shade, 0, 255).astype(np.uint8)
    room[y, x0:208] = row

for sx in [206, 486]:
    room[150:470, sx - 3:sx + 4] = cv2.GaussianBlur(room[150:470, sx - 3:sx + 4], (5, 1), 0)
room[156:172, 486:612] = cv2.GaussianBlur(room[156:172, 486:612], (5, 11), 0)
room[158:174, 680:776] = cv2.GaussianBlur(room[158:174, 680:776], (5, 11), 0)

# Pulizia bordo radio destro con sfumatura naturale (senza artefatti inpaint verticali)
room[168:450, 742:774] = cv2.GaussianBlur(room[168:450, 742:774], (9, 5), 0)

# ------------------------------------------------------------------
# 4) PIANO TAVOLO IN LEGNO PULITO (mantiene tazzina+centrino+chiavi sx, libri+sveglia+penna dx)
# ------------------------------------------------------------------
wood_patch = img[506:548, 325:650].copy()
wood_fill = cv2.resize(wood_patch, (580, 74), interpolation=cv2.INTER_CUBIC)
for i in range(74):
    s = 0.72 + 0.28 * (i / 73.0)
    wood_fill[i] = np.clip(wood_fill[i].astype(np.float32) * s, 0, 255).astype(np.uint8)

mask_tbl = np.zeros((H, W), dtype=np.uint8)
pts_base = np.array([
    [182, 446], [766, 446], [766, 474], [730, 482], [670, 488],
    [662, 510], [312, 514], [295, 502], [248, 496], [218, 484], [182, 466]
], dtype=np.int32)
cv2.fillPoly(mask_tbl, [pts_base], 255)
m_soft = cv2.GaussianBlur(mask_tbl.astype(np.float32) / 255.0, (13, 13), 0)

for y in range(444, 518):
    for x in range(180, 760):
        a = m_soft[y, x]
        if a > 0.005:
            room[y, x] = np.clip(
                room[y, x].astype(np.float32) * (1.0 - a) + wood_fill[y - 444, x - 180].astype(np.float32) * a,
                0, 255
            ).astype(np.uint8)

room[441:455, 188:760] = cv2.GaussianBlur(room[441:455, 188:760], (5, 7), 0)

# Upscale 2x nitido (2048x1272) così durante il dolly-in 3D il tavolo e il soggiorno restano nitidissimi!
room_hd = cv2.resize(room, (2048, 1272), interpolation=cv2.INTER_LANCZOS4)
room_hd = cv2.addWeighted(room_hd, 1.24, cv2.GaussianBlur(room_hd, (0, 0), 1.2), -0.24, 0)
cv2.imwrite(str(OUT_DIR / 'soggiorno-vuoto.jpg'), room_hd, [cv2.IMWRITE_JPEG_QUALITY, 94])

# ------------------------------------------------------------------
# 5) PARETE STANZA PULITA PER SFONDO 3D (senza tazzina, senza sveglia, senza tavolo!)
#    Estende muro/tenda/poltrona fino in basso così dietro al tavolo 3D NON spunta mai una seconda sveglia!
# ------------------------------------------------------------------
bg_wall = room.copy()

# Rimuovi tazzina a sx (x=76..196, y=412..H) campionando sotto il nastrino (y=368..410)
for y in range(412, H):
    sy = 368 + ((y - 412) % 42)
    shade = 1.0 - 0.18 * np.clip((y - 412) / float(H - 412), 0.0, 1.0)
    bg_wall[y, 0:206] = np.clip(room[sy, 0:206].astype(np.float32) * shade, 0, 255).astype(np.uint8)

# Estendi carta da parati e muro verde fino in fondo sotto y=444
for y in range(444, H):
    by = (y - 90) % wp_period
    shade = 0.84 - 0.16 * np.clip((y - 444) / float(H - 444), 0.0, 1.0)
    bg_wall[y, 206:486] = np.clip(wp_band[by].astype(np.float32) * shade, 0, 255).astype(np.uint8)
    g_row = grain_res[(y - 152) % gh]
    g_tiled = np.tile(g_row, (int(np.ceil(w_len / gw)), 1))[:w_len]
    row_m = np.clip(row_ref * shade + g_tiled * 0.9, 0, 255).astype(np.uint8)
    bg_wall[y, 486:762] = row_m[:762 - 486]

# Rimuovi sveglia e libri a dx (x=755..960, y=385..H) sostituendoli con la trama scura della poltrona
chair_patch = room[310:382, 768:888].copy()
ch_h, ch_w, _ = chair_patch.shape
for y in range(385, H):
    cy = (y - 385) % ch_h
    shade = 0.92 - 0.25 * np.clip((y - 385) / float(H - 385), 0.0, 1.0)
    row_c = np.clip(chair_patch[cy].astype(np.float32) * shade, 0, 255).astype(np.uint8)
    # Ripeti leggermente a coprire x=755..945
    tiled = np.tile(row_c, (2, 1))[:945 - 755]
    if y < 402:
        a = (y - 385) / 17.0
        bg_wall[y, 755:945] = np.clip(bg_wall[y, 755:945] * (1 - a) + tiled * a, 0, 255).astype(np.uint8)
    else:
        bg_wall[y, 755:945] = tiled

# Raccordo morbido tra muro e poltrona e destra
bg_wall[380:H, 745:772] = cv2.GaussianBlur(bg_wall[380:H, 745:772], (15, 5), 0)
bg_wall[405:425, 0:215] = cv2.GaussianBlur(bg_wall[405:425, 0:215], (5, 11), 0)
# Zona destra sotto la cornice foto (x=945..W, y=460..H)
for y in range(460, H):
    bg_wall[y, 945:W] = np.clip(room[455, 945:W].astype(np.float32) * (1.0 - 0.25 * (y - 460) / float(H - 460)), 0, 255).astype(np.uint8)

cv2.imwrite(str(OUT_DIR / 'soggiorno-stanza-parete.jpg'), bg_wall, [cv2.IMWRITE_JPEG_QUALITY, 93])

# ------------------------------------------------------------------
# 6) Sfondo finale ravvicinato SENZA RADIO dietro la Vintage 50 ufficiale
#    Inquadrato esattamente come lo screenshot finale: tazzina in basso a sx,
#    sveglia in basso a dx, tenda e carta da parati sopra, poltrona a dx, ZERO radio dietro!
# ------------------------------------------------------------------
crop = room[78:520, 74:890]
near_bg = cv2.resize(crop, (1920, 1038), interpolation=cv2.INTER_LANCZOS4)
near_bg = cv2.GaussianBlur(near_bg, (5, 5), 1.05)
cv2.imwrite(str(OUT_DIR / 'soggiorno-radio-vicino.jpg'), near_bg, [cv2.IMWRITE_JPEG_QUALITY, 94])

print('Built clean soggiorno-vuoto.jpg, soggiorno-stanza-parete.jpg, soggiorno-radio-vicino.jpg!')
