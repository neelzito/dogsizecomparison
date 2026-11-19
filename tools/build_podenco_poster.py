#!/usr/bin/env python3
"""Render a poster of every podenco type (German or English), drawn to scale with the site's illustrations.

Row 1: the Spanish podencos. Row 2: their Mediterranean relatives (Portuguese podengos,
Cirneco dell'Etna, Pharaoh Hound). Every dog is drawn at the midpoint of the male and female
breed-standard height, at one shared scale. Output: poster/podencos-massstabsgetreu.png (de) or
poster/podencos-to-scale.png (en), a -preview.jpg, and web copies in img/posters/.

  .venv/bin/python tools/build_podenco_poster.py [--lang de|en] [--width 4800] [--ratio 0.56]
"""
import argparse, json, os, subprocess, sys
from datetime import date
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_poster import BG, INK, INK2, INK3, ACCENT, LINE, ROOT, OUT_DIR, font, slug, wrap, save_web  # noqa: E402

SECTIONS = [
    (("Spanische Podencos", "Spanish podencos"), ["Maneto", "Podenco Andaluz (Small)", "Podenco Orito Español", "Podengo Galego", "Podenco Andaluz (Medium)",
                            "Podenco Valenciano", "Podenco Andaluz (Large)", "Podenco Canario", "Ibizan Hound"]),
    (("Verwandte aus Portugal, Italien und Malta", "Relatives from Portugal, Italy and Malta"), ["Portuguese Podengo Pequeno", "Cirneco dell'Etna",
                                                   "Portuguese Podengo (Medium)", "Pharaoh Hound",
                                                   "Portuguese Podengo (Large)"]),
]
NAME_SZ, SUB_SZ, SEC_SZ = 44, 34, 40
TEXT = {
    "de": {"file": "podencos-massstabsgetreu", "title": "Alle Podencos, maßstabsgetreu", "male": "Rüde", "female": "Hündin",
           "sub": "Vom Maneto bis zum Podenco Ibicenco, dazu ihre Verwandten rund ums Mittelmeer. Alle Hunde im selben Maßstab.",
           "note": "Widerristhöhe laut Rassestandard (u. a. RSCE, FCI, AKC). Gezeichnet ist der Mittelwert aus Rüden und Hündinnen; "
                   "einzelne Hunde können außerhalb des Standards liegen.", "site": "dogsizecomparison.com/de"},
    "en": {"file": "podencos-to-scale", "title": "Every podenco, drawn to scale", "male": "Male", "female": "Female",
           "sub": "From the Maneto to the Ibizan Hound, plus their relatives around the Mediterranean. Every dog is drawn at the same scale.",
           "note": "Height at the withers from the breed standards (RSCE, FCI, AKC and others). Each dog is drawn at the average of "
                   "males and females; individual dogs can fall outside the standard.", "site": "dogsizecomparison.com"},
}
DOG_GAP, MIN_LABEL_W = 60, 300


def load(lang, sections=None):
    js = ("global.window={};require('./js/breeds.js');require('./js/dog-images.js');require('./js/i18n-de.js');"
          "console.log(JSON.stringify({rows:window.BREED_ROWS,img:window.DOG_IMAGES,de:window.I18N.names}))")
    data = json.loads(subprocess.check_output(["node", "-e", js], cwd=ROOT))
    rows = {r[0]: r for r in data["rows"]}
    out = []
    for title, names in (sections or SECTIONS):
        sec = []
        for n in names:
            r = rows[n]
            bid = slug(n)
            aspect, wy, _ = data["img"][bid]
            sec.append({"name": data["de"].get(bid, n) if lang == "de" else n, "id": bid, "m": (r[4], r[5]), "f": (r[6], r[7]),
                        "h": (r[4] + r[5] + r[6] + r[7]) / 4, "unitW": aspect / wy, "unitH": 1 / wy})
        out.append(((title[0] if lang == "de" else title[1]) if title else None, sec))
    return out


DEC = ","


def cm(v):
    return (f"{v:.0f}" if abs(v - round(v)) < 0.05 else f"{v:.1f}".replace(".", DEC))


def rng(a, b):
    return f"{cm(a)} cm" if abs(a - b) < 0.05 else f"{cm(a)}–{cm(b)} cm"


def layout(sections, k, d, T):
    fN = font("demi", NAME_SZ)
    out = []
    for title, sec in sections:
        slots = []
        for b in sec:
            dw = b["unitW"] * b["h"] * k
            lines = wrap(d, b["name"], fN, max(dw, MIN_LABEL_W))
            subs = [f"{T['male']} {rng(*b['m'])}", f"{T['female']} {rng(*b['f'])}"]
            lw = max([d.textlength(l, font=fN) for l in lines] + [d.textlength(s, font=font("regular", SUB_SZ)) for s in subs])
            slots.append({"b": b, "dw": dw, "dh": b["unitH"] * b["h"] * k, "lines": lines, "subs": subs, "w": max(dw, lw)})
        out.append((title, slots))
    return out


def sizes(rows, k):
    width = max(sum(s["w"] for s in sl) + DOG_GAP * (len(sl) - 1) for _, sl in rows)
    height = 0
    for title, sl in rows:
        nl = max(len(s["lines"]) for s in sl)
        height += (SEC_SZ + 50 if title else 30) + max(s["dh"] for s in sl) + 20 + nl * (NAME_SZ + 8) + 2 * (SUB_SZ + 6) + 90
    return width, height


def render(sections, T, lang, width, ratio):
    """Draw the poster. sections: [(title or None, [breed dicts from load()])]; T: texts (file, title, sub, note, site, male, female)."""
    global DEC
    DEC = "," if lang == "de" else "."
    W = width
    M = round(W * 0.045)
    RULER_W = 130
    HEAD_H, FOOT_H = round(W * 0.115), round(W * 0.06)
    # ratio None: scale to fit the width only, then make the poster as tall as the content needs
    H = round(width * ratio) if ratio else 10 ** 6
    avail_w, avail_h = W - 2 * M - RULER_W, H - HEAD_H - FOOT_H - M * 0.6

    scratch = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    lo, hi = 0.5, 60.0
    for _ in range(40):
        mid = (lo + hi) / 2
        w, h = sizes(layout(sections, mid, scratch, T), mid)
        lo, hi = (mid, hi) if w <= avail_w and h <= avail_h else (lo, mid)
    k = lo
    rows = layout(sections, k, scratch, T)
    _, used_h = sizes(rows, k)
    if not ratio:
        H = round(HEAD_H + FOOT_H + M * 0.6 + used_h)
        avail_h = used_h
    extra = (avail_h - used_h) / len(rows)

    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    ts = round(W * 0.042)
    while d.textlength(T["title"], font=font("serif", ts)) > W - 2 * M:
        ts -= 4
    d.text((M, M), T["title"], font=font("serif", ts), fill=INK)
    d.text((M, M + round(W * 0.06)), T["sub"], font=font("medium", round(W * 0.0125)), fill=INK2)

    fN, fS, fR = font("demi", NAME_SZ), font("regular", SUB_SZ), font("regular", 28)
    y = HEAD_H + M * 0.2
    for title, sl in rows:
        if title:
            d.text((M + RULER_W, y), title.upper(), font=font("demi", SEC_SZ), fill=ACCENT)
        top = max(s["dh"] for s in sl)
        ground = y + (SEC_SZ + 50 if title else 30) + top
        rx = M + RULER_W - 30
        tallest = max(s["b"]["h"] for s in sl)
        d.line([(rx, ground), (rx, ground - tallest * k)], fill=LINE, width=4)
        c = 0
        while c <= tallest + 0.01:
            ty = ground - c * k
            d.line([(rx - 14, ty), (rx, ty)], fill=INK3, width=3)
            if c:
                d.text((rx - 22, ty), str(c), font=fR, fill=INK3, anchor="rm")
            c += 10
        d.text((rx - 22, ground + 6), "cm", font=fR, fill=INK3, anchor="rt")
        d.line([(rx, ground), (W - M, ground)], fill=LINE, width=4)

        used = sum(s["w"] for s in sl)
        gap = (avail_w - used) / (len(sl) - 1) if len(sl) > 1 else 0
        x = M + RULER_W
        for s in sl:
            b = s["b"]
            dog = Image.open(os.path.join(ROOT, "img", "dogs", "web", f"{b['id']}.webp")).convert("RGBA")
            dw, dh = max(1, round(s["dw"])), max(1, round(s["dh"]))
            dog = dog.resize((dw, dh), Image.LANCZOS)
            cx = x + s["w"] / 2
            im.paste(dog, (round(cx - dw / 2), round(ground - dh)), dog)
            ly = ground + 20
            for line in s["lines"]:
                d.text((cx, ly), line, font=fN, fill=INK, anchor="mt")
                ly += NAME_SZ + 8
            for sub in s["subs"]:
                d.text((cx, ly), sub, font=fS, fill=INK3, anchor="mt")
                ly += SUB_SZ + 6
            x += s["w"] + gap
        nl = max(len(s["lines"]) for s in sl)
        y = ground + 20 + nl * (NAME_SZ + 8) + 2 * (SUB_SZ + 6) + 90 + extra

    fy = H - FOOT_H
    d.line([(M, fy), (W - M, fy)], fill=LINE, width=3)
    d.text((M, fy + 36), T["note"], font=font("regular", 34), fill=INK2)
    d.text((M, fy + 90), f"© {date.today().year} MILIVON", font=font("regular", 32), fill=INK3)
    d.text((W - M, fy + 36), T["site"], font=font("demi", round(W * 0.014)), fill=ACCENT, anchor="ra")

    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, T["file"] + ".png")
    im.save(out, optimize=True)
    prev = im.copy()
    prev.thumbnail((2000, 2000))
    prev.save(os.path.join(OUT_DIR, T["file"] + "-preview.jpg"), quality=88)
    save_web(im, T["file"])
    print(f"{k:.2f} px/cm -> {out}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", choices=["de", "en"], default="de")
    ap.add_argument("--width", type=int, default=4800)
    ap.add_argument("--ratio", type=float, default=0.56, help="height / width")
    a = ap.parse_args()
    render(load(a.lang), TEXT[a.lang], a.lang, a.width, a.ratio)


if __name__ == "__main__":
    main()
