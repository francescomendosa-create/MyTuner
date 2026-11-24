import io
import json
import struct
import zipfile
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

ZIP_PATH = Path(r'C:\Users\franc\Pictures\MYRADIO\radio\8445f6e5-0d1f-4461-ba7a-76f40f90a418.zip')
V50_PATH = Path('public/img/skins/vintage-50.jpg')
OUT_GLB = Path('public/img/bg/soggiorno-radio-3d/radio.glb')
OUT_GLB.parent.mkdir(parents=True, exist_ok=True)

print('Reading original 3D archive:', ZIP_PATH)
with zipfile.ZipFile(ZIP_PATH) as z:
    obj_lines = z.read('base.obj').decode('utf-8').splitlines()
    raw_diff = z.read('texture_diffuse.png')
    raw_norm = z.read('texture_normal.png')
    raw_pbr = z.read('texture_pbr.png')

# 1) Parse 100% of original vertices, UVs, normals, and triangles (ZERO decimation!)
vs, vts, vns = [], [], []
f_v, f_vt, f_vn = [], [], []
for line in obj_lines:
    if line.startswith('v '):
        p = line.split()
        vs.append((float(p[1]), float(p[2]), float(p[3])))
    elif line.startswith('vt '):
        p = line.split()
        vts.append((float(p[1]), 1.0 - float(p[2])))
    elif line.startswith('vn '):
        p = line.split()
        vns.append((float(p[1]), float(p[2]), float(p[3])))
    elif line.startswith('f '):
        parts = line.split()[1:]
        for i in range(1, len(parts) - 1):
            for tok in (parts[0], parts[i], parts[i + 1]):
                a, b, c = tok.split('/')
                f_v.append(int(a) - 1)
                f_vt.append(int(b) - 1)
                f_vn.append(int(c) - 1)

vs = np.asarray(vs, dtype=np.float32)
vts = np.asarray(vts, dtype=np.float32)
vns = np.asarray(vns, dtype=np.float32)
f_v = np.asarray(f_v, dtype=np.int32).reshape(-1, 3)
f_vt = np.asarray(f_vt, dtype=np.int32).reshape(-1, 3)
f_vn = np.asarray(f_vn, dtype=np.int32).reshape(-1, 3)

# Front bounding box used for exact alignment with vintage-50.jpg
front_mask_v = vs[:, 2] > 0.14
FXMIN, FXMAX = float(vs[front_mask_v, 0].min()), float(vs[front_mask_v, 0].max())
FYMIN, FYMAX = float(vs[front_mask_v, 1].min()), float(vs[front_mask_v, 1].max())
print(f'3D front projection frame: X=[{FXMIN:.4f}, {FXMAX:.4f}] Y=[{FYMIN:.4f}, {FYMAX:.4f}]')

tri_v = vs[f_v]
tri_n = vns[f_vn]
tri_c = tri_v.mean(axis=1)
tri_nz = tri_n[:, :, 2].mean(axis=1)
tri_zmax = tri_v[:, :, 2].max(axis=1)

# Drop completely hidden back panel triangles (z_max < -0.17 and facing strictly backwards)
keep_mask = ~((tri_zmax < -0.17) & (tri_nz < -0.35))
f_v = f_v[keep_mask]
f_vt = f_vt[keep_mask]
f_vn = f_vn[keep_mask]
tri_c = tri_c[keep_mask]
tri_nz = tri_nz[keep_mask]

# Split along natural bezel seam between ivory front panel and wood cabinet
is_hd_front = (
    (tri_c[:, 2] > 0.160)
    & (tri_nz > 0.30)
    & (np.abs(tri_c[:, 0]) < 0.908)
    & (tri_c[:, 1] > 0.056)
    & (tri_c[:, 1] < 1.022)
)
print(f'Kept tris: {len(f_v):,} (HD Front={int(is_hd_front.sum()):,}, Wood Cabinet={int((~is_hd_front).sum()):,})')

vmin = vs.min(axis=0)
vmax = vs.max(axis=0)
center = (vmin + vmax) * 0.5
u_scale = float(np.maximum((vmax - vmin) * 0.5, 1e-6).max())


def pack_primitive(mask_tris, planar_uv=False):
    fv = f_v[mask_tris].reshape(-1)
    fvt = f_vt[mask_tris].reshape(-1)
    fvn = f_vn[mask_tris].reshape(-1)
    if planar_uv:
        keys = np.empty(len(fv), dtype=[('v', 'i4'), ('n', 'i4')])
        keys['v'] = fv
        keys['n'] = fvn
    else:
        keys = np.empty(len(fv), dtype=[('v', 'i4'), ('t', 'i4'), ('n', 'i4')])
        keys['v'] = fv
        keys['t'] = fvt
        keys['n'] = fvn
    _, first, inv = np.unique(keys, return_index=True, return_inverse=True)
    ov = vs[fv[first]].astype(np.float32)
    on = vns[fvn[first]].astype(np.float32)
    nlen = np.linalg.norm(on, axis=1, keepdims=True)
    nlen[nlen < 1e-8] = 1.0
    on = (on / nlen).astype(np.float32)

    if planar_uv:
        u = np.clip((ov[:, 0] - FXMIN) / (FXMAX - FXMIN), 0.0, 1.0)
        v = np.clip((FYMAX - ov[:, 1]) / (FYMAX - FYMIN), 0.0, 1.0)
        ouv = np.stack([u, v], axis=1).astype(np.float32)
        # Smooth micro-ripples on flat glass dial & flat ivory face toward (0, 0, 1)
        # while keeping 100% 3D sculpted normals on protruding knobs, switches, buttons & grille!
        in_flat_dial = (u > 0.055) & (u < 0.535) & (v > 0.115) & (v < 0.530)
        is_flat_face = (ov[:, 2] < 0.212) & (on[:, 2] > 0.86)
        blend = np.zeros(len(on), dtype=np.float32)
        blend[is_flat_face] = 0.65
        blend[in_flat_dial] = 0.92
        flat_n = np.array([0.0, 0.0, 1.0], dtype=np.float32)
        on = on * (1.0 - blend[:, None]) + flat_n * blend[:, None]
        nlen2 = np.linalg.norm(on, axis=1, keepdims=True)
        nlen2[nlen2 < 1e-8] = 1.0
        on = (on / nlen2).astype(np.float32)
    else:
        ouv = vts[fvt[first]].astype(np.float32)

    pos_q = np.round(np.clip((ov - center) / u_scale, -1.0, 1.0) * 32767.0).astype(np.int16)
    pos_pad = np.zeros((len(pos_q), 4), dtype=np.int16)
    pos_pad[:, :3] = pos_q

    nrm_q = np.round(np.clip(on, -1.0, 1.0) * 127.0).astype(np.int8)
    nrm_pad = np.zeros((len(nrm_q), 4), dtype=np.int8)
    nrm_pad[:, :3] = nrm_q

    uv_q = np.round(np.clip(ouv, 0.0, 1.0) * 65535.0).astype(np.uint16)
    idx = inv.astype(np.uint32)
    return pos_pad, pos_q, nrm_pad, uv_q, idx


p0_pos, p0_pq, p0_nrm, p0_uv, p0_idx = pack_primitive(is_hd_front, planar_uv=True)
p1_pos, p1_pq, p1_nrm, p1_uv, p1_idx = pack_primitive(~is_hd_front, planar_uv=False)

# 2) Build 3K Ultra-HD Front Texture (3072x1676) with razor-sharp text & details!
v50_bgr = cv2.imread(str(V50_PATH))
v50_crop = v50_bgr[62:588, 28:992]
# Multi-pass Lanczos upscale + dual-radius crisp unsharp mask (micro-detail + local clarity)
v50_hd = cv2.resize(v50_crop, (3072, 1676), interpolation=cv2.INTER_LANCZOS4)
blur_fine = cv2.GaussianBlur(v50_hd, (0, 0), 1.0)
v50_sharp = cv2.addWeighted(v50_hd, 1.42, blur_fine, -0.42, 0)
blur_med = cv2.GaussianBlur(v50_sharp, (0, 0), 2.4)
v50_sharp = cv2.addWeighted(v50_sharp, 1.12, blur_med, -0.12, 0)
v50_rgb = cv2.cvtColor(v50_sharp, cv2.COLOR_BGR2RGB)
buf_front = io.BytesIO()
Image.fromarray(v50_rgb).save(buf_front, format='JPEG', quality=97, optimize=True, subsampling=0)
bytes_front = buf_front.getvalue()

# Procedural PBR metallicRoughness map for the HD Front (G=roughness, B=metallic)
pbr_h, pbr_w = 512, 1024
rgh = np.full((pbr_h, pbr_w), 156, dtype=np.uint8)  # satin ivory
met = np.full((pbr_h, pbr_w), 4, dtype=np.uint8)
yy, xx = np.mgrid[0:pbr_h, 0:pbr_w]
u_g = xx / float(pbr_w)
v_g = yy / float(pbr_h)
m_dial = (u_g > 0.05) & (u_g < 0.54) & (v_g > 0.10) & (v_g < 0.54)
rgh[m_dial] = 62
met[m_dial] = 10
m_cloth = (u_g >= 0.55) & (u_g < 0.74) & (v_g > 0.10) & (v_g < 0.54)
rgh[m_cloth] = 228
met[m_cloth] = 2
m_grill = (u_g >= 0.74) & (u_g < 0.95) & (v_g > 0.10) & (v_g < 0.54)
rgh[m_grill] = 98
met[m_grill] = 96
d_vol = np.hypot((u_g - 0.238) * 1.85, v_g - 0.755)
m_vol = d_vol < 0.175
rgh[m_vol] = 74
met[m_vol] = 128
d_tun = np.hypot((u_g - 0.633) * 1.85, v_g - 0.755)
m_tun = d_tun < 0.175
rgh[m_tun] = 66
met[m_tun] = 20
rgh = cv2.GaussianBlur(rgh, (9, 9), 0)
met = cv2.GaussianBlur(met, (9, 9), 0)
front_pbr = np.stack([np.full_like(rgh, 255), rgh, met], axis=2)
buf_fpbr = io.BytesIO()
Image.fromarray(front_pbr).save(buf_fpbr, format='JPEG', quality=92, optimize=True)
bytes_fpbr = buf_fpbr.getvalue()

# 3) Wood Cabinet textures (from original zip — crisp wood grain on sides/top/corners)
buf_wdiff = io.BytesIO()
Image.open(io.BytesIO(raw_diff)).convert('RGB').resize((1536, 1536), Image.Resampling.LANCZOS).save(
    buf_wdiff, format='JPEG', quality=94, optimize=True, subsampling=0
)
bytes_wdiff = buf_wdiff.getvalue()

buf_wnorm = io.BytesIO()
Image.open(io.BytesIO(raw_norm)).convert('RGB').resize((1024, 1024), Image.Resampling.LANCZOS).save(
    buf_wnorm, format='PNG', optimize=True
)
bytes_wnorm = buf_wnorm.getvalue()

buf_wpbr = io.BytesIO()
Image.open(io.BytesIO(raw_pbr)).convert('RGB').resize((1024, 1024), Image.Resampling.LANCZOS).save(
    buf_wpbr, format='JPEG', quality=92, optimize=True
)
bytes_wpbr = buf_wpbr.getvalue()

print(
    f'Textures: 3K-front={len(bytes_front)/1e3:.0f}KB frontPBR={len(bytes_fpbr)/1e3:.0f}KB | '
    f'woodDiff={len(bytes_wdiff)/1e3:.0f}KB woodNorm={len(bytes_wnorm)/1e3:.0f}KB woodPBR={len(bytes_wpbr)/1e3:.0f}KB'
)

chunks = []
views = []
offset = 0


def add_view(data: bytes, target=None, stride=None):
    global offset
    pad = (-len(data)) % 4
    padded = data + (b'\x00' * pad)
    idx = len(views)
    bv = {'buffer': 0, 'byteOffset': offset, 'byteLength': len(data)}
    if target is not None:
        bv['target'] = target
    if stride is not None:
        bv['byteStride'] = stride
    views.append(bv)
    chunks.append(padded)
    offset += len(padded)
    return idx


accessors = []


def add_prim_buffers(pos_pad, pos_q, nrm_pad, uv_q, idx):
    bv_p = add_view(pos_pad.tobytes(), target=34962, stride=8)
    bv_n = add_view(nrm_pad.tobytes(), target=34962, stride=4)
    bv_u = add_view(uv_q.tobytes(), target=34962, stride=4)
    bv_i = add_view(idx.tobytes(), target=34963)
    a0 = len(accessors)
    accessors.extend([
        {
            'bufferView': bv_p,
            'componentType': 5122,
            'normalized': True,
            'count': len(pos_pad),
            'type': 'VEC3',
            'min': [int(pos_q[:, 0].min()), int(pos_q[:, 1].min()), int(pos_q[:, 2].min())],
            'max': [int(pos_q[:, 0].max()), int(pos_q[:, 1].max()), int(pos_q[:, 2].max())]
        },
        {
            'bufferView': bv_n,
            'componentType': 5120,
            'normalized': True,
            'count': len(nrm_pad),
            'type': 'VEC3'
        },
        {
            'bufferView': bv_u,
            'componentType': 5123,
            'normalized': True,
            'count': len(uv_q),
            'type': 'VEC2'
        },
        {
            'bufferView': bv_i,
            'componentType': 5125,
            'count': len(idx),
            'type': 'SCALAR'
        }
    ])
    return a0, a0 + 1, a0 + 2, a0 + 3


p0_a = add_prim_buffers(p0_pos, p0_pq, p0_nrm, p0_uv, p0_idx)
p1_a = add_prim_buffers(p1_pos, p1_pq, p1_nrm, p1_uv, p1_idx)

bv_front = add_view(bytes_front)
bv_fpbr = add_view(bytes_fpbr)
bv_wdiff = add_view(bytes_wdiff)
bv_wnorm = add_view(bytes_wnorm)
bv_wpbr = add_view(bytes_wpbr)

bin_data = b''.join(chunks)

gltf = {
    'asset': {'version': '2.0', 'generator': 'mytuner-3k-pbr-builder'},
    'extensionsUsed': ['KHR_mesh_quantization'],
    'extensionsRequired': ['KHR_mesh_quantization'],
    'scene': 0,
    'scenes': [{'nodes': [0]}],
    'nodes': [{
        'name': 'VintageRadio50',
        'mesh': 0,
        'translation': [float(center[0]), float(center[1]), float(center[2])],
        'scale': [u_scale, u_scale, u_scale]
    }],
    'meshes': [{
        'name': 'VintageRadio50Mesh',
        'primitives': [
            {
                'attributes': {'POSITION': p0_a[0], 'NORMAL': p0_a[1], 'TEXCOORD_0': p0_a[2]},
                'indices': p0_a[3],
                'material': 0
            },
            {
                'attributes': {'POSITION': p1_a[0], 'NORMAL': p1_a[1], 'TEXCOORD_0': p1_a[2]},
                'indices': p1_a[3],
                'material': 1
            }
        ]
    }],
    'materials': [
        {
            'name': 'VintageRadio50_HDFront',
            'pbrMetallicRoughness': {
                'baseColorTexture': {'index': 0},
                'metallicRoughnessTexture': {'index': 1},
                'metallicFactor': 1.0,
                'roughnessFactor': 1.0
            },
            'doubleSided': False
        },
        {
            'name': 'VintageRadio50_WoodCabinet',
            'pbrMetallicRoughness': {
                'baseColorTexture': {'index': 2},
                'metallicRoughnessTexture': {'index': 4},
                'metallicFactor': 1.0,
                'roughnessFactor': 1.0
            },
            'normalTexture': {'index': 3, 'scale': 1.0},
            'doubleSided': False
        }
    ],
    'samplers': [{
        'magFilter': 9729,
        'minFilter': 9987,
        'wrapS': 33071,
        'wrapT': 33071
    }],
    'images': [
        {'bufferView': bv_front, 'mimeType': 'image/jpeg'},
        {'bufferView': bv_fpbr, 'mimeType': 'image/jpeg'},
        {'bufferView': bv_wdiff, 'mimeType': 'image/jpeg'},
        {'bufferView': bv_wnorm, 'mimeType': 'image/png'},
        {'bufferView': bv_wpbr, 'mimeType': 'image/jpeg'}
    ],
    'textures': [
        {'sampler': 0, 'source': 0},
        {'sampler': 0, 'source': 1},
        {'sampler': 0, 'source': 2},
        {'sampler': 0, 'source': 3},
        {'sampler': 0, 'source': 4}
    ],
    'buffers': [{'byteLength': len(bin_data)}],
    'bufferViews': views,
    'accessors': accessors
}

json_bytes = json.dumps(gltf, separators=(',', ':')).encode('utf-8')
json_pad = (-len(json_bytes)) % 4
json_chunk = json_bytes + (b' ' * json_pad)

total_len = 12 + 8 + len(json_chunk) + 8 + len(bin_data)
with open(OUT_GLB, 'wb') as f:
    f.write(struct.pack('<4sII', b'glTF', 2, total_len))
    f.write(struct.pack('<I4s', len(json_chunk), b'JSON'))
    f.write(json_chunk)
    f.write(struct.pack('<I4s', len(bin_data), b'BIN\x00'))
    f.write(bin_data)

print(f'Exported 3K ULTRA-HD GLB: {OUT_GLB} ({OUT_GLB.stat().st_size/1e6:.2f} MB)')
