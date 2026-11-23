from pathlib import Path
import numpy as np
import trimesh
from PIL import Image
from trimesh.visual.texture import TextureVisuals

root = Path('public/img/bg/soggiorno-radio-3d')
obj = root / 'base.obj'
print('loading', obj, 'size_mb', round(obj.stat().st_size / 1e6, 2))
src = trimesh.load(obj, force='mesh', process=False)
print('verts', len(src.vertices), 'faces', len(src.faces))
src_uv = np.array(src.visual.uv, dtype=np.float64)

target = 70000
mesh = src.simplify_quadric_decimation(face_count=target)
print('simplified faces', len(mesh.faces), 'verts', len(mesh.vertices))

# Trasferisci UV: vertice semplificato → UV del vertice originale più vicino
from scipy.spatial import cKDTree
tree = cKDTree(np.asarray(src.vertices))
_, idx = tree.query(np.asarray(mesh.vertices), k=1)
uv = src_uv[idx]

diff = root / 'texture_diffuse.png'
img = Image.open(diff).convert('RGBA')
# riduci texture per il web
img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
mesh.visual = TextureVisuals(uv=uv, image=img)
print('texture attached', img.size)

out = root / 'radio.glb'
mesh.export(out, file_type='glb')
print('exported', out, 'mb', round(out.stat().st_size / 1e6, 2))
