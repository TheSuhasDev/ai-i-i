import os, glob
from PIL import Image, ImageOps

try:
    import pillow_avif  # enables AVIF support
except ImportError:
    print("pillow-avif-plugin not installed: AVIF files may be skipped")

OUT = "client/public/products"
os.makedirs(OUT, exist_ok=True)
for f in sorted(glob.glob("manual/*")):
    code = os.path.splitext(os.path.basename(f))[0].upper()
    try:
        im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
        ImageOps.fit(im, (400, 400)).save(f"{OUT}/{code}.jpg", quality=85, optimize=True)
        print("saved", code)
    except Exception as e:
        print("skipped", f, e)