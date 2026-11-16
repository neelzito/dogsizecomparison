#!/usr/bin/env python3
"""Generate an illustration for every breed in js/breeds.js into img/dogs/<id>.png.

Skips breeds whose image already exists, so it can be re-run to resume or to
retry failures (delete a bad image first). Usage:
  python3 tools/gen_all.py [--jobs 8] [--only "Breed A,Breed B"] [--dry]
"""
import argparse, json, os, re, subprocess, sys, unicodedata
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "img", "dogs")


def slug(s):  # same as js/app.js
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", s))


def breed_names():
    js = open(os.path.join(ROOT, "js", "breeds.js")).read()
    body = js[js.index("BREED_ROWS"):]
    return re.findall(r'^\s*\[\s*"([^"]+)"', body, re.M)


HINTS = json.load(open(os.path.join(ROOT, "tools", "hints.json")))


def run(name):
    dest = os.path.join(OUT, slug(name) + ".png")
    if os.path.exists(dest):
        return name, "skip"
    cmd = [sys.executable, os.path.join(ROOT, "tools", "gen_dog.py"), name,
           "--out", "img/dogs", "--slug", slug(name)]
    if HINTS.get(name):
        cmd += ["--hint", HINTS[name]]
    r = subprocess.run(cmd, capture_output=True, text=True)
    return name, "ok" if r.returncode == 0 else "FAIL " + (r.stderr or r.stdout).strip()[-200:]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--jobs", type=int, default=8)
    ap.add_argument("--only", default="")
    ap.add_argument("--dry", action="store_true")
    a = ap.parse_args()
    names = breed_names()
    if a.only:
        names = [n.strip() for n in a.only.split(",")]
    os.makedirs(OUT, exist_ok=True)
    todo = [n for n in names if not os.path.exists(os.path.join(OUT, slug(n) + ".png"))]
    print(f"{len(names)} breeds, {len(todo)} to generate (~${len(todo) * 0.034:.2f})", flush=True)
    unknown = set(HINTS) - set(breed_names())
    if unknown:
        print("Hints for unknown breeds:", sorted(unknown))
    if a.dry:
        return
    fails = []
    with ThreadPoolExecutor(a.jobs) as ex:
        for i, (n, st) in enumerate(ex.map(run, todo), 1):
            print(f"[{i}/{len(todo)}] {n}: {st}", flush=True)
            if st.startswith("FAIL"):
                fails.append(n)
    print("Failures:", fails or "none")


if __name__ == "__main__":
    main()
