from PIL import Image
from pathlib import Path

src = Path(r"C:\Users\franc\Documents\GitHub\Radio\public\icons\icon-512.png")
mask = Path(r"C:\Users\franc\Documents\GitHub\Radio\public\icons\icon-maskable-512.png")
res = Path(r"C:\Users\franc\Documents\GitHub\Radio\android\app\src\main\res")

sizes = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
fg_sizes = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}

base = Image.open(src).convert("RGBA")
maskable = Image.open(mask).convert("RGBA") if mask.exists() else base


def fit(img, size, pad_ratio=0.08, bg=(12, 12, 12, 255)):
    canvas = Image.new("RGBA", (size, size), bg)
    inner = int(size * (1.0 - pad_ratio))
    im = img.copy()
    im.thumbnail((inner, inner), Image.Resampling.LANCZOS)
    x = (size - im.width) // 2
    y = (size - im.height) // 2
    canvas.paste(im, (x, y), im)
    return canvas


for folder, size in sizes.items():
    outdir = res / folder
    outdir.mkdir(parents=True, exist_ok=True)
    icon = fit(base, size)
    icon.save(outdir / "ic_launcher.png", optimize=True)
    icon.save(outdir / "ic_launcher_round.png", optimize=True)

for folder, size in fg_sizes.items():
    outdir = res / folder
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = int(size * 0.66)
    im = maskable.copy()
    im.thumbnail((inner, inner), Image.Resampling.LANCZOS)
    x = (size - im.width) // 2
    y = (size - im.height) // 2
    canvas.paste(im, (x, y), im)
    canvas.save(outdir / "ic_launcher_foreground.png", optimize=True)

print("icons written")
