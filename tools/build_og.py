#!/usr/bin/env python3
"""Render social preview images (og:image, 1200×630) for breed and comparison pages.

Called by tools/build_site.js, which pipes a JSON list of jobs to stdin:
  [{ "out": "img/og/breeds/beagle.png", "kind": "breed" | "compare",
     "kicker": str, "title": str, "lines": [[text, style], ...],
     "dogs": [{ "img": "img/dogs/web/beagle.webp", "maxX": w, "maxY": h,
                "hCm": withers height, "name": str, "sub": str, "color": "#hex", "muted": bool }] }]

Images whose job hasn't changed since the last run (img/og/manifest.json) are skipped,
and images no longer referenced are deleted. Needs Pillow:
  python3 -m venv .venv && .venv/bin/pip install -r tools/requirements.txt
"""
import hashlib, json, os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OG_DIR = os.path.join(ROOT, "img", "og")
MANIFEST = os.path.join(OG_DIR, "manifest.json")
VERSION = "3"  # bump to force a full re-render after changing the layout

W, H = 1200, 630
BG, INK, INK2, INK3, ACCENT, LINE = "#f6f3ee", "#1f1d1a", "#5c564d", "#8c857a", "#c2562b", "#ded8cd"
GROUND = 512


def _font(paths, size):
    for p, idx in paths:
        try:
            return ImageFont.truetype(p, size, index=idx)
        except OSError:
            continue
    return ImageFont.load_default(size)


AVENIR = "/System/Library/Fonts/Avenir Next.ttc"
FONTS = {
    "serif": [("/System/Library/Fonts/Supplemental/Georgia Bold.ttf", 0), ("DejaVuSerif-Bold.ttf", 0)],
    "demi": [(AVENIR, 2), ("DejaVuSans-Bold.ttf", 0)],
    "medium": [(AVENIR, 5), ("DejaVuSans.ttf", 0)],
    "regular": [(AVENIR, 7), ("DejaVuSans.ttf", 0)],
}
_cache = {}


def font(kind, size):
    key = (kind, size)
    if key not in _cache:
        _cache[key] = _font(FONTS[kind], size)
    return _cache[key]


def text_w(d, s, f):
    return d.textlength(s, font=f)


def fit(d, s, kind, size, max_w, min_size=14):
    while size > min_size and text_w(d, s, font(kind, size)) > max_w:
        size -= 1
    return font(kind, size)


def wrap(d, s, kind, size, max_w, max_lines=2, min_size=34):
    """Largest size (down to min_size) at which s wraps into max_lines lines of max_w."""
    for sz in range(size, min_size - 1, -2):
        f = font(kind, sz)
        lines, cur = [], ""
        for word in s.split():
            t = f"{cur} {word}".strip()
            if text_w(d, t, f) <= max_w:
                cur = t
            else:
                if cur:
                    lines.append(cur)
                cur = word
        lines.append(cur)
        if len(lines) <= max_lines and all(text_w(d, l, f) <= max_w for l in lines):
            return f, lines
    f = font(kind, min_size)
    return f, [s]


_imgs = {}


def dog_img(path):
    if path not in _imgs:
        _imgs[path] = Image.open(os.path.join(ROOT, path)).convert("RGBA")
    return _imgs[path]


def draw_scene(im, d, dogs, x0, x1, top, ground):
    """Dogs side by side at true relative size, standing on `ground`, centred in [x0, x1]."""
    max_h = max(g["hCm"] for g in dogs)
    gap = 0.16 * max_h
    total_cm = sum(g["maxX"] * g["hCm"] for g in dogs) + gap * (len(dogs) - 1)
    max_top = max(g["maxY"] * g["hCm"] for g in dogs)
    k = min((x1 - x0) / total_cm, (ground - top) / max_top)
    x = x0 + ((x1 - x0) - total_cm * k) / 2
    centres = []
    for g in dogs:
        w, h = g["maxX"] * g["hCm"] * k, g["maxY"] * g["hCm"] * k
        src = dog_img(g["img"])
        pic = src.resize((max(1, round(w)), max(1, round(h))), Image.LANCZOS)
        im.alpha_composite(pic, (round(x), round(ground - h)))
        d.rounded_rectangle([x + w * 0.08, ground + 4, x + w * 0.92, ground + 9], 3, fill=g["color"])
        centres.append(x + w / 2)
        x += w + gap * k
    d.line([x0 - 10, ground + 1, x1 + 10, ground + 1], fill=LINE, width=2)

    # labels: centred under each dog, nudged apart when they would overlap
    slot = (x1 - x0) / len(dogs) - 12
    labs = []
    for g, c in zip(dogs, centres):
        fn = fit(d, g["name"], "demi", 24, slot)
        fs = fit(d, g["sub"], "regular", 19, slot)
        w = max(text_w(d, g["name"], fn), text_w(d, g["sub"], fs))
        labs.append([c - w / 2, w, g, fn, fs])
    for i in range(1, len(labs)):
        prev = labs[i - 1]
        labs[i][0] = max(labs[i][0], prev[0] + prev[1] + 18)
    over = labs[-1][0] + labs[-1][1] - (x1 + 20)
    if over > 0:
        for l in labs:
            l[0] -= over
        for i in range(len(labs) - 2, -1, -1):
            labs[i][0] = min(labs[i][0], labs[i + 1][0] - labs[i][1] - 18)
    for lx, w, g, fn, fs in labs:
        nw, sw = text_w(d, g["name"], fn), text_w(d, g["sub"], fs)
        d.text((lx + (w - nw) / 2, ground + 18), g["name"], font=fn, fill=INK3 if g.get("muted") else INK)
        d.text((lx + (w - sw) / 2, ground + 50), g["sub"], font=fs, fill=INK3)


STYLES = {"fact": ("medium", 27, INK2), "small": ("regular", 21, INK3)}


def render(job):
    im = Image.new("RGBA", (W, H), BG)
    d = ImageDraw.Draw(im)
    if job["kind"] == "breed":
        left, col_w = 64, 480
        y = 70
        d.text((left, y), job["kicker"].upper(), font=font("demi", 20), fill=ACCENT)
        y += 40
        f, lines = wrap(d, job["title"], "serif", 66, col_w)
        lh = f.size * 1.12
        for l in lines:
            d.text((left, y), l, font=f, fill=INK)
            y += lh
        y += 18
        for text, style in job["lines"]:
            kind, size, col = STYLES[style]
            ff = fit(d, text, kind, size, col_w)
            d.text((left, y), text, font=ff, fill=col)
            y += size * (1.5 if style == "fact" else 1.9)
        draw_scene(im, d, job["dogs"], 600, 1140, 70, GROUND)
        d.text((left, 562), "dogsizecomparison.com", font=font("demi", 22), fill=INK2)
    else:
        f = fit(d, job["title"], "serif", 64, W - 128, 50)
        if text_w(d, job["title"], f) <= W - 128:
            lines = [job["title"]]
        else:  # too long for one line even at 50px: wrap onto two
            f, lines = wrap(d, job["title"], "serif", 60, W - 128, max_lines=2, min_size=40)
        y = 48
        for l in lines:
            d.text((64, y), l, font=f, fill=INK)
            y += f.size * 1.12
        y += 10
        sub = "  ·  ".join(t for t, _ in job["lines"])
        fs = font("medium", 26)
        d.text((64, y), sub, font=fs, fill=INK2)
        brand, fb = "dogsizecomparison.com", font("demi", 22)
        d.text((W - 64 - text_w(d, brand, fb), y + 3), brand, font=fb, fill=INK3)
        draw_scene(im, d, job["dogs"], 90, 1110, y + 60, GROUND)
    d.rectangle([0, H - 12, W, H], fill=ACCENT)
    out = im.convert("RGB").quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    path = os.path.join(ROOT, job["out"])
    os.makedirs(os.path.dirname(path), exist_ok=True)
    out.save(path, optimize=True)


_hashes = {}


def file_hash(rel):
    if rel not in _hashes:
        _hashes[rel] = hashlib.sha1(open(os.path.join(ROOT, rel), "rb").read()).hexdigest()[:8]
    return _hashes[rel]


def main():
    jobs = json.load(sys.stdin)
    try:
        manifest = json.load(open(MANIFEST))
    except (OSError, ValueError):
        manifest = {}
    new_manifest, done = {}, 0
    for job in jobs:
        key = hashlib.sha1((VERSION + json.dumps(job, sort_keys=True)).encode()).hexdigest()[:16]
        for g in job["dogs"]:  # re-render when an illustration changes
            key += file_hash(g["img"])
        new_manifest[job["out"]] = key
        if manifest.get(job["out"]) == key and os.path.exists(os.path.join(ROOT, job["out"])):
            continue
        render(job)
        done += 1
    stale = 0
    for rel in set(manifest) - set(new_manifest):
        p = os.path.join(ROOT, rel)
        if os.path.exists(p):
            os.remove(p)
            stale += 1
    os.makedirs(OG_DIR, exist_ok=True)
    with open(MANIFEST, "w") as fh:
        json.dump(new_manifest, fh, indent=0, sort_keys=True)
    print(f"og images: {len(jobs)} total, {done} rendered, {stale} removed")


if __name__ == "__main__":
    main()
