#!/usr/bin/env python3
"""Fetch a freely licensed breed photo from Wikimedia Commons for each breed.

For each breed it looks up the English Wikipedia article (breed name, then its
aliases), takes the article's lead image, checks that the file lives on Commons
under a free licence (CC0, public domain, CC BY, CC BY-SA), downloads an
800 px thumbnail, saves it as img/photos/<id>.webp and records the credit in
content/photos.json.

Usage:
  .venv/bin/python tools/fetch_photos.py labrador-retriever vizsla   # some breeds
  .venv/bin/python tools/fetch_photos.py --all                        # every breed
  .venv/bin/python tools/fetch_photos.py --force vizsla               # refetch
  .venv/bin/python tools/fetch_photos.py --thumbs                     # rebuild all thumbnails

Overrides live in tools/photo_overrides.json:
  {"vizsla": "File:Some better photo.jpg",          # pick a specific Commons file
   "maneto": {"title": "Maneto (dog)"},              # use this Wikipedia article
   "some-breed": null}                               # no photo for this breed
"""
import html
import io
import json
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "img/photos"
DATA = ROOT / "content/photos.json"
OVERRIDES = ROOT / "tools/photo_overrides.json"
API = "https://en.wikipedia.org/w/api.php"
UA = "dog-breed-photo-fetcher/0.1 (static site build script; python-urllib)"
WIDTH = 800
THUMB = (160, 120)  # card thumbnails, shown at 80 x 60
THUMB_DIR = OUT_DIR / "thumb"
FREE = re.compile(r"^(cc0|public domain|pd\b|pd-|cc by(-sa)? [0-9.]+|cc by(-sa)?$|gfdl|gpl|fal\b|free art|copyrighted free use|attribution)", re.I)


def get(url, binary=False):
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
            return data if binary else json.loads(data)
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 5:
                time.sleep(max(int(e.headers.get("Retry-After") or 0), 20 * (attempt + 1)))
                continue
            raise


def api(**params):
    params.update(format="json", formatversion="2")
    return get(API + "?" + urllib.parse.urlencode(params))


def breeds():
    js = """
      global.window = {};
      require('./js/breeds.js');
      const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const A = window.BREED_ALIASES || {};
      console.log(JSON.stringify(window.BREED_ROWS.map(r => ({id: slug(r[0]), name: r[0], aliases: A[r[0]] || []}))));
    """
    out = subprocess.run(["node", "-e", js], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def lead_image(title):
    """Return (article title, File:... name) for a Wikipedia article's lead image."""
    r = api(action="query", titles=title, prop="pageimages|description", piprop="name", redirects=1)
    for p in r["query"]["pages"]:
        # Skip articles about something else ("Brittany" the region, "Havanese" -> Havana).
        if p.get("description") and not re.search(r"dog|hound|terrier|breed|canine", p["description"], re.I):
            continue
        if not p.get("missing") and p.get("pageimage"):
            return p["title"], "File:" + p["pageimage"]
    return None, None


def strip(s):
    s = re.sub(r"<[^>]+>", "", s or "")
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def file_info(fname):
    r = api(action="query", titles=fname, prop="imageinfo", iiprop="url|extmetadata|size", iiurlwidth=960)  # a standard Wikimedia thumb size (cached, not rate-limited)
    p = r["query"]["pages"][0]
    if "imageinfo" not in p:
        return None, "file not found"
    if p.get("imagerepository") != "shared":
        return None, "not on Commons (probably non-free)"
    ii = p["imageinfo"][0]
    if "thumbnail_unscaled" in (ii.get("thumburl") or ""):
        # Original is under 960 px: originals are heavily rate-limited, so ask for the next
        # standard thumbnail size down instead.
        w = 500 if ii["width"] > 500 else 330
        ii["thumburl"] = api(action="query", titles=fname, prop="imageinfo", iiprop="url", iiurlwidth=w)["query"]["pages"][0]["imageinfo"][0]["thumburl"]
    m = ii.get("extmetadata", {})
    val = lambda k: strip(m.get(k, {}).get("value", ""))
    lic = val("LicenseShortName")
    if not FREE.match(lic):
        return None, f"licence not allowed: {lic!r}"
    artist = val("Artist") or val("Credit") or "Unknown author"
    artist = re.sub(r"\s*\((?:[^()]*\b(?:talk|contribs|discussion|original text|eingestellt)\b[^()]*|[^()]*@[^()]*)\)", "", artist, flags=re.I)  # talk links, emails
    artist = re.sub(r"\S+@\S+", "", artist).strip(" ,;")
    artist = re.sub(r"\s*\(\[\[.*$", "", artist)                    # unparsed wiki links
    artist = re.sub(r"^by\s*$", "", artist).strip(' "') or "Unknown author"
    artist = re.sub(r"^\S+\.(jpe?g|png|tiff?):\s*", "", artist, flags=re.I)  # "Original.jpg: Author"
    artist = re.sub(r"\s*derivative work:\s*", ", derivative work by ", artist, flags=re.I)
    if len(artist) > 80:
        artist = artist[:77].rstrip() + "…"
    return {
        "file": p["title"],
        "thumb": ii.get("thumburl") or ii["url"],
        "artist": artist,
        "license": lic,
        "licenseUrl": val("LicenseUrl"),
        "source": ii["descriptionurl"],
    }, None


def candidate_titles(b):
    """Wikipedia titles to try: "Pointer (English)" -> "Pointer (English)", "English Pointer", "Pointer", "Pointer (dog breed)"."""
    name = b["name"]
    t = [name, *b["aliases"]]
    m = re.match(r"^(.*?) \((.*)\)$", name)
    if m:
        base, q = m.groups()
        t += [f"{q} {base}", base, f"{base} (dog breed)", f"{base} (dog)"]
    else:
        t += [f"{name} (dog breed)", f"{name} (dog)", f"{name} dog"]
    return t


def make_thumb(bid):
    """Centre-cropped 4:3 thumbnail for breed cards (img/photos/thumb/<id>.webp)."""
    from PIL import ImageOps
    img = Image.open(OUT_DIR / f"{bid}.webp").convert("RGB")
    THUMB_DIR.mkdir(parents=True, exist_ok=True)
    ImageOps.fit(img, THUMB, Image.LANCZOS, centering=(0.5, 0.4)).save(THUMB_DIR / f"{bid}.webp", "WEBP", quality=72, method=6)


def fetch(b, overrides, data, force):
    if b["id"] in data and not force:
        return "kept"
    ov = overrides.get(b["id"], "")
    if ov is None:
        data.pop(b["id"], None)
        return "skipped (override: no photo)"
    article = None
    if isinstance(ov, str) and ov.startswith("File:"):
        fname = ov
    else:
        titles = [ov["title"]] if isinstance(ov, dict) else candidate_titles(b)
        fname = None
        for t in titles:
            article, fname = lead_image(t)
            if fname:
                break
        if not fname:
            return "no Wikipedia lead image found"
    info, err = file_info(fname)
    if err:
        return f"{fname}: {err}"
    img = Image.open(io.BytesIO(get(info.pop("thumb"), binary=True))).convert("RGB")
    if img.width > WIDTH:
        img = img.resize((WIDTH, round(img.height * WIDTH / img.width)), Image.LANCZOS)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img.save(OUT_DIR / f"{b['id']}.webp", "WEBP", quality=78, method=6)
    make_thumb(b["id"])
    info.update(width=img.width, height=img.height, article=article)
    data[b["id"]] = info
    return f"ok  {info['file']}  ({info['license']}, {info['artist']})"


def main():
    args = sys.argv[1:]
    force = "--force" in args
    ids = [a for a in args if not a.startswith("--")]
    all_breeds = breeds()
    pick = all_breeds if "--all" in args else [b for b in all_breeds if b["id"] in ids]
    unknown = set(ids) - {b["id"] for b in all_breeds}
    if unknown:
        sys.exit(f"Unknown breed ids: {', '.join(sorted(unknown))}")
    overrides = json.loads(OVERRIDES.read_text()) if OVERRIDES.exists() else {}
    data = json.loads(DATA.read_text()) if DATA.exists() else {}
    if "--thumbs" in args:
        for bid in data:
            make_thumb(bid)
        print(f"{len(data)} thumbnails in {THUMB_DIR.relative_to(ROOT)}")
        return
    for b in pick:
        try:
            msg = fetch(b, overrides, data, force)
        except Exception as e:  # keep going; report at the end
            msg = f"error: {e}"
        print(f"{b['id']:40} {msg}", flush=True)
        DATA.write_text(json.dumps(dict(sorted(data.items())), indent=1, ensure_ascii=False) + "\n")
        if msg != "kept":
            time.sleep(3)  # stay well under Wikimedia's rate limits


if __name__ == "__main__":
    main()
