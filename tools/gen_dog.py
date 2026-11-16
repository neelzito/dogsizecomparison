#!/usr/bin/env python3
"""Generate a breed illustration with Replicate (google/nano-banana-2-lite).

Usage:
  python3 tools/gen_dog.py "Labrador Retriever" [--out img/test] [--tag v1]
                           [--ref path/to/style.png] [--prompt-file tools/prompt.txt]
  python3 tools/gen_dog.py --schema        # print the model's input schema

Reads REPLICATE_API_TOKEN from the environment or from .env in the project root.
"""
import argparse, base64, json, mimetypes, os, re, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = "google/nano-banana-2-lite"


def token():
    t = os.environ.get("REPLICATE_API_TOKEN")
    if not t and os.path.exists(os.path.join(ROOT, ".env")):
        for line in open(os.path.join(ROOT, ".env")):
            m = re.match(r"\s*REPLICATE_API_TOKEN\s*=\s*['\"]?([^'\"\s]+)", line)
            if m:
                t = m.group(1)
    if not t:
        sys.exit("No REPLICATE_API_TOKEN found (env or .env).")
    return t


def api(method, url, body=None, extra=None):
    h = {"Authorization": f"Bearer {token()}", "Content-Type": "application/json", "User-Agent": "dog-size-tool/1.0"}
    h.update(extra or {})
    req = urllib.request.Request(url, method=method, headers=h,
                                 data=json.dumps(body).encode() if body else None)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code}: {e.read().decode()[:500]}")


def data_uri(path):
    mime = mimetypes.guess_type(path)[0] or "image/png"
    return f"data:{mime};base64," + base64.b64encode(open(path, "rb").read()).decode()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("breed", nargs="?")
    ap.add_argument("--out", default="img/test")
    ap.add_argument("--tag", default="v1")
    ap.add_argument("--ref", action="append", default=[])
    ap.add_argument("--prompt-file", default="tools/prompt.txt")
    ap.add_argument("--aspect", default="4:3")
    ap.add_argument("--slug", default="", help="output file name without extension")
    ap.add_argument("--hint", default="", help="extra breed details appended to the prompt")
    ap.add_argument("--schema", action="store_true")
    a = ap.parse_args()

    if a.schema:
        m = api("GET", f"https://api.replicate.com/v1/models/{MODEL}")
        s = m["latest_version"]["openapi_schema"]["components"]["schemas"]
        print(json.dumps({"Input": s.get("Input"), "Output": s.get("Output")}, indent=1))
        return

    tpl = open(os.path.join(ROOT, a.prompt_file)).read().strip()
    prompt = tpl.replace("{breed}", a.breed)
    if a.hint:
        prompt += f" Breed details: {a.hint}."
    inp = {"prompt": prompt, "aspect_ratio": a.aspect, "output_format": "png"}
    if a.ref:
        inp["image_input"] = [data_uri(os.path.join(ROOT, p)) for p in a.ref]

    pred = api("POST", f"https://api.replicate.com/v1/models/{MODEL}/predictions",
               {"input": inp}, {"Prefer": "wait=60"})
    while pred["status"] in ("starting", "processing"):
        time.sleep(2)
        pred = api("GET", pred["urls"]["get"])
    if pred["status"] != "succeeded":
        sys.exit(f"{pred['status']}: {pred.get('error')}")

    out = pred["output"]
    url = out[0] if isinstance(out, list) else out
    slug = re.sub(r"[^a-z0-9]+", "-", a.breed.lower()).strip("-")
    os.makedirs(os.path.join(ROOT, a.out), exist_ok=True)
    name = a.slug or (f"{slug}-{a.tag}" if a.tag else slug)
    dest = os.path.join(ROOT, a.out, f"{name}.png")
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "dog-size-tool/1.0"}), timeout=120) as r:
        open(dest, "wb").write(r.read())
    print(dest, f"({pred.get('metrics', {}).get('predict_time', '?')}s)")


if __name__ == "__main__":
    main()
