#!/usr/bin/env python3
"""Build the social preview image and favicons from the breed illustrations.

Writes img/og-image.png and img/og-image-de.png (1200x630), favicon.ico, img/favicon-32.png and
img/apple-touch-icon.png. Needs Pillow:  python3 tools/make_icons.py
"""
import json, os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(ROOT, "img", "dogs", "web")
BG, INK, INK2, ACCENT, LINE = "#f6f3ee", "#1f1d1a", "#5d574e", "#c2562b", "#e4ded4"

txt = open(os.path.join(ROOT, "js", "dog-images.js")).read()
META = json.loads(txt[txt.index("{"):txt.rindex("}") + 1])


def font(names, size):
    for n in names:
        try:
            return ImageFont.truetype(n, size)
        except OSError:
            pass
    return ImageFont.load_default(size)


def dog(i, withers_px):
    """Breed cut-out scaled so its withers are withers_px tall (ground at the bottom)."""
    im = Image.open(os.path.join(WEB, i + ".webp")).convert("RGBA")
    h = withers_px / META[i][1]
    return im.resize((max(1, round(h * META[i][0])), max(1, round(h))), Image.LANCZOS)


def og(lang="en"):
    W, H = 1200, 630
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    serif = ["/System/Library/Fonts/Supplemental/Georgia Bold.ttf", "DejaVuSerif-Bold.ttf"]
    sans = ["/System/Library/Fonts/Avenir Next.ttc", "/System/Library/Fonts/Helvetica.ttc", "DejaVuSans.ttf"]
    if lang == "de":
        d.text((64, 52), "Hundegrößen-Vergleich", font=font(serif, 66), fill=INK)
        d.text((66, 140), f"{len(META)} Hunderassen maßstabsgetreu nebeneinander", font=font(sans, 32), fill=INK2)
        d.text((66, 184), "Größe und Gewicht von Rüden und Hündinnen · cm/kg", font=font(sans, 26), fill=INK2)
    else:
        d.text((64, 52), "Dog Size Comparison", font=font(serif, 66), fill=INK)
        d.text((66, 140), f"{len(META)} breeds side by side, drawn to scale", font=font(sans, 32), fill=INK2)
        d.text((66, 184), "Male & female heights and weights · cm/kg or in/lb", font=font(sans, 26), fill=INK2)
    # breeds to scale, cm at the withers (average adult)
    row = [("chihuahua", 16.5), ("dachshund-standard", 22), ("beagle", 36), ("labrador-retriever", 57),
           ("great-dane", 79), ("irish-wolfhound", 83)]
    ground, gap = 590, 18
    # largest scale at which the row fits the width and stays below the text
    px_per_cm = min((W - 100 - gap * (len(row) - 1)) / sum(cm * META[i][0] / META[i][1] for i, cm in row),
                    (ground - 240) / max(cm / META[i][1] for i, cm in row))
    dogs = [dog(i, cm * px_per_cm) for i, cm in row]
    x = (W - sum(g.width for g in dogs) - gap * (len(dogs) - 1)) // 2
    d.line([(40, ground + 2), (W - 40, ground + 2)], fill=LINE, width=3)
    for g in dogs:
        im.paste(g, (x, ground - g.height), g)
        x += g.width + gap
    d.rectangle([0, H - 10, W, H], fill=ACCENT)
    im.save(os.path.join(ROOT, "img", "og-image-de.png" if lang == "de" else "og-image.png"), optimize=True)


def icons():
    src = dog("beagle", 400)
    s = 512
    tile = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(tile).rounded_rectangle([0, 0, s - 1, s - 1], radius=110, fill=ACCENT)
    pad = 54
    k = min((s - 2 * pad) / src.width, (s - 2 * pad) / src.height)
    g = src.resize((round(src.width * k), round(src.height * k)), Image.LANCZOS)
    # white halo so the dog reads on the accent tile at small sizes
    halo = Image.new("RGBA", g.size, (255, 255, 255, 0))
    halo.putalpha(g.getchannel("A").point(lambda v: 255 if v > 30 else 0))
    from PIL import ImageFilter
    halo = halo.filter(ImageFilter.MaxFilter(9))
    halo = Image.composite(Image.new("RGBA", g.size, (255, 255, 255, 255)), Image.new("RGBA", g.size, (0, 0, 0, 0)), halo.getchannel("A"))
    pos = ((s - g.width) // 2, (s - g.height) // 2 + 10)
    tile.alpha_composite(halo, pos)
    tile.alpha_composite(g, pos)
    tile.resize((180, 180), Image.LANCZOS).save(os.path.join(ROOT, "img", "apple-touch-icon.png"), optimize=True)
    tile.resize((32, 32), Image.LANCZOS).save(os.path.join(ROOT, "img", "favicon-32.png"), optimize=True)
    tile.save(os.path.join(ROOT, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)])


if __name__ == "__main__":
    og()
    og("de")
    icons()
    print("ok")
