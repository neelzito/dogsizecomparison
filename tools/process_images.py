#!/usr/bin/env python3
"""Turn generated breed PNGs (white background) into web-ready cut-outs.

For every img/dogs/<id>.png:
  * removes the white background (flood fill from the image border, soft edge),
  * crops to the dog, scales to at most MAX_W px wide, saves img/dogs/web/<id>.webp,
  * saves a small copy for list thumbnails as img/dogs/thumb/<id>.webp (fits THUMB),
  * finds the ground line (lowest paw) and the withers (top of the shoulder),
and writes js/dog-images.js:
  window.DOG_IMAGES = { id: [aspect, withersY, withersX], ... }
  aspect   = width / height of the cropped image
  withersY = withers height above the ground, as a fraction of image height
  withersX = horizontal position of the withers, as a fraction of image width

tools/withers_overrides.json can set {id: {"y": .., "x": ..}} fractions by hand.

Needs Pillow, numpy and scipy:  python3 tools/process_images.py [id ...]
"""
import json, os, re, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "img", "dogs")
OUT = os.path.join(SRC, "web")
MAX_W = 640
THUMB = (144, 100)   # list thumbnails are shown at up to 72 x 50 px
THUMB_DIR = os.path.join(SRC, "thumb")
BG_MAX_DARK = 9      # a pixel is background-ish if 255 - min(r,g,b) <= this
EDGE_SOFT = 24       # darkness at which an edge pixel becomes fully opaque


def cutout(im):
    rgb = np.asarray(im.convert("RGB")).astype(np.float32)
    dark = 255 - rgb.min(axis=2)
    cand = dark <= BG_MAX_DARK
    lab, _ = ndimage.label(cand)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, border[border > 0])
    alpha = np.where(bg, 0.0, 1.0)
    # soft 2px band just inside the background edge
    band = ndimage.binary_dilation(bg, iterations=2) & ~bg
    a = np.clip(dark / EDGE_SOFT, 0, 1)
    alpha[band] = a[band]
    # un-mix white from semi-transparent edge pixels
    am = np.maximum(alpha, 1e-3)[..., None]
    col = np.where(band[..., None], (rgb - (1 - am) * 255) / am, rgb)
    out = np.dstack([np.clip(col, 0, 255), alpha * 255]).astype(np.uint8)
    # drop tiny specks not attached to the dog
    solid = alpha > 0.5
    lab2, n = ndimage.label(solid)
    if n > 1:
        sizes = ndimage.sum(solid, lab2, range(1, n + 1))
        keep = 1 + int(np.argmax(sizes))
        specks = (lab2 > 0) & (lab2 != keep)
        small = specks & (ndimage.sum(solid, lab2, lab2) < 0.002 * solid.sum())
        out[small, 3] = 0
    return Image.fromarray(out, "RGBA")


def measure(a):
    """a: alpha array (h, w) of the cropped dog. Returns withers (y_frac, x_frac).

    1. Find the leg groups (columns that are solid just above the ground).
    2. The back = median topline height over the belly, between hind and front legs.
    3. Walk forward along the topline until it rises clearly above the back level
       (the neck starts); the withers is the topline height just before that.
    """
    h, w = a.shape
    solid = a > 128
    cols = solid.any(axis=0)
    top = np.where(cols, solid.argmax(axis=0), h)
    height = ndimage.uniform_filter1d((h - top).astype(float), max(3, w // 100))
    band = solid[int(h * 0.80):int(h * 0.92)].any(axis=0)
    lab, n = ndimage.label(band)
    legs = sorted([np.where(lab == k)[0] for k in range(1, n + 1)], key=lambda c: c.min())
    legs = [c for c in legs if len(c) > w * 0.015]
    if len(legs) >= 2:
        a0, a1 = legs[0].max(), legs[-1].min()
    else:
        a0, a1 = int(w * 0.35), int(w * 0.6)
    if a1 - a0 < w * 0.05:
        a0, a1 = int(w * 0.35), int(w * 0.6)
    back = float(np.median(height[a0:a1]))
    limit = back * 1.04 + h * 0.01
    x = int((a0 + a1) / 2)
    while x + 1 < w and height[x + 1] <= limit:
        x += 1
    wy = float(min(height[x], limit))
    return wy / h, x / w


def save_thumb(im, i):
    os.makedirs(THUMB_DIR, exist_ok=True)
    t = im.copy()
    t.thumbnail(THUMB, Image.LANCZOS)
    t.save(os.path.join(THUMB_DIR, i + ".webp"), "WEBP", quality=85, method=6)


def main():
    if sys.argv[1:] == ["--thumbs"]:  # rebuild thumbnails from the existing web images
        for f in sorted(os.listdir(OUT)):
            if f.endswith(".webp"):
                save_thumb(Image.open(os.path.join(OUT, f)), f[:-5])
        return
    os.makedirs(OUT, exist_ok=True)
    ids = [x for x in sys.argv[1:] if not x.startswith("--")] or sorted(f[:-4] for f in os.listdir(SRC) if f.endswith(".png"))
    ov_path = os.path.join(ROOT, "tools", "withers_overrides.json")
    overrides = json.load(open(ov_path)) if os.path.exists(ov_path) else {}
    js_path = os.path.join(ROOT, "js", "dog-images.js")
    data = {}
    if os.path.exists(js_path) and [x for x in sys.argv[1:] if not x.startswith("--")]:
        txt = open(js_path).read()
        obj = txt[txt.index("{"):txt.rindex("}") + 1]
        data = json.loads(re.sub(r",\s*}$", "}", obj))  # tolerate a trailing comma (valid JS, not JSON)
    measure_only = "--measure-only" in sys.argv
    ids = [i for i in ids if not i.startswith("--")]
    if measure_only and not sys.argv[2:]:
        ids = sorted(f[:-5] for f in os.listdir(OUT) if f.endswith(".webp"))
        data = {}
    for i in ids:
        if measure_only:
            im = Image.open(os.path.join(OUT, i + ".webp"))
            wy, wx = measure(np.asarray(im.getchannel("A")))
            o = overrides.get(i, {})
            data[i] = [round(im.width / im.height, 4), round(o.get("y", wy), 4), round(o.get("x", wx), 4)]
            continue
        im = cutout(Image.open(os.path.join(SRC, i + ".png")))
        bbox = im.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
        im = im.crop(bbox)
        if im.width > MAX_W:
            im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
        im.save(os.path.join(OUT, i + ".webp"), "WEBP", quality=88, method=6)
        save_thumb(im, i)
        wy, wx = measure(np.asarray(im.getchannel("A")))
        o = overrides.get(i, {})
        wy, wx = o.get("y", wy), o.get("x", wx)
        data[i] = [round(im.width / im.height, 4), round(wy, 4), round(wx, 4)]
        print(i, data[i], flush=True)
    with open(js_path, "w") as f:
        f.write("// Generated by tools/process_images.py — [aspect, withersY, withersX] per breed id.\n")
        f.write("window.DOG_IMAGES = " + json.dumps(data, separators=(",", ":")) + ";\n")
    print(len(data), "images")


if __name__ == "__main__":
    main()
