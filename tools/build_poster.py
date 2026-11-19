#!/usr/bin/env python3
"""Render the "Every AKC breed, drawn to scale" poster.

Every breed the AKC fully recognises (tools/akc_recognised.txt) is drawn with the
site's illustrations at one shared scale, in rows from smallest to largest, at the midpoint of
the male breed-standard height. Output: poster/akc-breeds-to-scale.png (full size) and
poster/akc-breeds-to-scale-preview.jpg.

  .venv/bin/python tools/build_poster.py [--width 6000] [--ratio 1.5]
"""
import argparse, json, os, subprocess, unicodedata, re
from datetime import date
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "poster")

BG, INK, INK2, INK3, ACCENT, LINE = "#f6f3ee", "#1f1d1a", "#5c564d", "#8c857a", "#c2562b", "#ded8cd"
AVENIR = "/System/Library/Fonts/Avenir Next.ttc"
FONTS = {
    "serif": [("/System/Library/Fonts/Supplemental/Georgia Bold.ttf", 0), ("DejaVuSerif-Bold.ttf", 0)],
    "demi": [(AVENIR, 2), ("DejaVuSans-Bold.ttf", 0)],
    "medium": [(AVENIR, 5), ("DejaVuSans.ttf", 0)],
    "regular": [(AVENIR, 7), ("DejaVuSans.ttf", 0)],
}
_fc = {}


def font(kind, size):
    key = (kind, size)
    if key not in _fc:
        for p, idx in FONTS[kind]:
            try:
                _fc[key] = ImageFont.truetype(p, size, index=idx)
                break
            except OSError:
                continue
        else:
            _fc[key] = ImageFont.load_default(size)
    return _fc[key]


def slug(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", s))


# AKC names (tools/akc_recognised.txt) whose site name differs. A list means the AKC counts one
# breed in several varieties that the site draws separately; each is shown.
AKC_TO_SITE = {
    "Pointer": ["Pointer (English)"], "Spaniel (Cocker)": ["American Cocker Spaniel"],
    "Collie": ["Rough Collie"], "Dachshund": ["Dachshund (Standard)", "Dachshund (Miniature)"],
    "Fox Terrier": ["Smooth Fox Terrier", "Wire Fox Terrier"], "Mastiff": ["Mastiff (English)"],
    "Bulldog": ["Bulldog (English)"], "Manchester Terrier (Standard)": ["Manchester Terrier"],
    "Manchester Terrier (Toy)": ["Toy Manchester Terrier"],
    "Poodle": ["Toy Poodle", "Miniature Poodle", "Standard Poodle"],
    "Belgian Sheepdog": ["Belgian Sheepdog (Groenendael)"], "Akita": ["Akita (American)"],
    "Anatolian Shepherd": ["Anatolian Shepherd Dog"], "Plott": ["Plott Hound"],
    "Xoloitzcuintli": ["Xoloitzcuintli (Standard)"], "Bergamasco": ["Bergamasco Sheepdog"],
}

# Poster labels: the AKC's own name where the site's differs.
DISPLAY = {
    "Pointer (English)": "Pointer", "American Cocker Spaniel": "Cocker Spaniel", "Rough Collie": "Collie",
    "Dachshund (Standard)": "Dachshund", "Dachshund (Miniature)": "Miniature Dachshund",
    "Mastiff (English)": "Mastiff", "Bulldog (English)": "Bulldog", "Akita (American)": "Akita",
    "Belgian Sheepdog (Groenendael)": "Belgian Sheepdog", "Anatolian Shepherd Dog": "Anatolian Shepherd",
    "Plott Hound": "Plott", "Xoloitzcuintli (Standard)": "Xoloitzcuintli", "Bergamasco Sheepdog": "Bergamasco",
}


def norm(s):
    s = unicodedata.normalize("NFD", s.lower().replace("&", "and"))
    s = "".join(c for c in s if not unicodedata.combining(c)).replace("'", "").replace("\u2019", "")
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def flip(s):
    m = re.match(r"^(.*) \((.*)\)$", s)
    return f"{m[2]} {m[1]}" if m else s


def akc_list():
    with open(os.path.join(ROOT, "tools", "akc_recognised.txt"), encoding="utf-8") as f:
        return [l.strip() for l in f if l.strip() and not l.startswith("#")]


def load_breeds():
    js = ("global.window={};require('./js/breeds.js');require('./js/dog-images.js');"
          "console.log(JSON.stringify({rows:window.BREED_ROWS,img:window.DOG_IMAGES}))")
    data = json.loads(subprocess.check_output(["node", "-e", js], cwd=ROOT))
    rows = {norm(r[0]): r for r in data["rows"]}
    out, missing = [], []
    for a in akc_list():
        names = AKC_TO_SITE.get(a) or [a, flip(a)]
        found = [rows[norm(n)] for n in names if norm(n) in rows]
        if a not in AKC_TO_SITE:
            found = found[:1]
        if not found:
            missing.append(a)
        for r in found:
            bid = slug(r[0])
            aspect, wy, _wx = data["img"][bid]
            h = (r[4] + r[5]) / 2  # midpoint of the male height range, cm at the withers
            out.append({"name": DISPLAY.get(r[0], r[0]), "id": bid, "group": r[1], "h": h,
                        "unitW": aspect / wy, "unitH": 1 / wy})  # image size in withers units
    out.sort(key=lambda b: (b["h"], b["name"]))
    return out, missing


# ---------- layout ----------
NAME_SZ, SUB_SZ, LINE_GAP = 30, 24, 6
MIN_LABEL_W = 230
DOG_GAP = 34          # px between slots
ROW_GAP = 70          # px between a row's labels and the next row's tallest dog
RULER_W = 120         # px reserved left of every row for the cm ruler


def wrap(d, s, f, max_w):
    lines, cur = [], ""
    for word in s.split():
        t = f"{cur} {word}".strip()
        if d.textlength(t, font=f) <= max_w or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = word
    lines.append(cur)
    return lines


def layout(breeds, k, avail_w, d):
    """Greedy rows at k px per cm. Returns rows of slots and the total height in px."""
    fN = font("demi", NAME_SZ)
    rows, cur, cur_w = [], [], 0
    for b in breeds:
        dw = b["unitW"] * b["h"] * k
        lines = wrap(d, b["name"], fN, max(dw, MIN_LABEL_W))
        lw = max(d.textlength(l, font=fN) for l in lines)
        slot = {"b": b, "dw": dw, "dh": b["unitH"] * b["h"] * k, "lines": lines, "w": max(dw, lw)}
        add = slot["w"] + (DOG_GAP if cur else 0)
        if cur and cur_w + add > avail_w:
            rows.append(cur)
            cur, cur_w = [], 0
            add = slot["w"]
        cur.append(slot)
        cur_w += add
    if cur:
        rows.append(cur)
    total = 0
    for row in rows:
        nl = max(len(s["lines"]) for s in row)
        row_lab = 14 + nl * (NAME_SZ + LINE_GAP) + SUB_SZ + 4
        row_top = max(s["dh"] for s in row)
        total += row_top + row_lab + ROW_GAP
        for s in row:
            s["_lab"] = row_lab
    return rows, total


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--width", type=int, default=6000)
    ap.add_argument("--ratio", type=float, default=1.5, help="height / width")
    a = ap.parse_args()

    W = a.width
    H = round(W * a.ratio)
    M = round(W * 0.045)                 # outer margin
    HEAD_H, FOOT_H = round(W * 0.125), round(W * 0.06)
    avail_w = W - 2 * M - RULER_W
    avail_h = H - HEAD_H - FOOT_H - M

    breeds, missing = load_breeds()
    if missing:
        print(f"Not on the site yet ({len(missing)}): " + ", ".join(missing))
    scratch = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    lo, hi = 0.5, 40.0                   # px per cm; find the largest scale that fits
    for _ in range(40):
        mid = (lo + hi) / 2
        _, t = layout(breeds, mid, avail_w, scratch)
        lo, hi = (mid, hi) if t <= avail_h else (lo, mid)
    k = lo
    rows, total = layout(breeds, k, avail_w, scratch)

    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)

    # header
    d.text((M, M), "Every AKC breed, drawn to scale", font=font("serif", round(W * 0.042)), fill=INK)
    sub = (f"All {len(akc_list())} breeds recognised by the American Kennel Club, from the {breeds[0]['name']} "
           f"to the {breeds[-1]['name']}. Every dog is drawn at the same scale.")
    d.text((M, M + round(W * 0.062)), sub, font=font("medium", round(W * 0.0105)), fill=INK2)

    fN, fS, fR = font("demi", NAME_SZ), font("regular", SUB_SZ), font("regular", 22)
    row_gap_extra = (avail_h - total) / len(rows)   # spread leftover height across the rows
    y = HEAD_H + M * 0.3
    for row in rows:
        top = max(s["dh"] for s in row)
        ground = y + top
        # justify slots across the row (not the last, short row)
        used = sum(s["w"] for s in row)
        gap = (avail_w - used) / (len(row) - 1) if len(row) > 1 and row is not rows[-1] else DOG_GAP
        # ruler: ticks every 10 cm up to the tallest dog's withers
        rx = M + RULER_W - 26
        tallest = max(s["b"]["h"] for s in row)
        step = 10 if tallest > 25 else 5
        d.line([(rx, ground), (rx, ground - tallest * k)], fill=LINE, width=3)
        cm = 0
        while cm <= tallest + 0.01:
            ty = ground - cm * k
            d.line([(rx - 12, ty), (rx, ty)], fill=INK3, width=3)
            if cm and (cm % 20 == 0 or step == 5):
                d.text((rx - 18, ty), f"{cm}", font=fR, fill=INK3, anchor="rm")
            cm += step
        d.text((rx - 18, ground + 4), "cm", font=fR, fill=INK3, anchor="rt")
        d.line([(M + RULER_W - 26, ground), (W - M, ground)], fill=LINE, width=3)

        x = M + RULER_W
        for s in row:
            b = s["b"]
            dog = Image.open(os.path.join(ROOT, "img", "dogs", "web", f"{b['id']}.webp")).convert("RGBA")
            dw, dh = max(1, round(s["dw"])), max(1, round(s["dh"]))
            dog = dog.resize((dw, dh), Image.LANCZOS)
            cx = x + s["w"] / 2
            im.paste(dog, (round(cx - dw / 2), round(ground - dh)), dog)
            ly = ground + 14
            for line in s["lines"]:
                d.text((cx, ly), line, font=fN, fill=INK, anchor="mt")
                ly += NAME_SZ + LINE_GAP
            inches = b["h"] / 2.54
            d.text((cx, ly), f"{b['h']:.0f} cm · {inches:.0f} in", font=fS, fill=INK3, anchor="mt")
            x += s["w"] + gap
        y = ground + s["_lab"] + ROW_GAP + row_gap_extra

    # footer
    fy = H - FOOT_H
    d.line([(M, fy), (W - M, fy)], fill=LINE, width=3)
    note = ("Heights are the midpoint of the male height at the withers (top of the shoulder) in the AKC breed standard, or a "
            "typical figure where the standard gives none. Poodles, Dachshunds and Fox Terriers are shown in each variety. "
            "Females are usually a little smaller, and individual dogs can fall outside the standard.")
    d.text((M, fy + 40), note, font=font("regular", 30), fill=INK2)
    d.text((M, fy + 90), f"© {date.today().year} MILIVON", font=font("regular", 30), fill=INK3)
    d.text((W - M, fy + 40), "dogsizecomparison.com", font=font("demi", round(W * 0.012)), fill=ACCENT, anchor="ra")

    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, "akc-breeds-to-scale.png")
    im.save(out, optimize=True)
    prev = im.copy()
    prev.thumbnail((1500, 2250))
    prev.save(os.path.join(OUT_DIR, "akc-breeds-to-scale-preview.jpg"), quality=88)
    print(f"{len(breeds)} breeds, {len(rows)} rows, {k:.2f} px/cm -> {out}")


if __name__ == "__main__":
    main()
