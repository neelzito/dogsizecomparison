#!/usr/bin/env python3
"""Split a translation batch file into content/de/breeds/<id>.md files.

Batch format: blocks that start with a line "=== <breed-id> ===", followed by the
German Markdown for that breed. Usage: python3 tools/site/de/split_batch.py batch.md
"""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
OUT = os.path.join(ROOT, "content", "de", "breeds")
src = open(sys.argv[1], encoding="utf-8").read()
parts = re.split(r"^=== ([a-z0-9-]+) ===\s*$", src, flags=re.M)
n = 0
for i in range(1, len(parts), 2):
    bid, body = parts[i], parts[i + 1].strip() + "\n"
    if not os.path.exists(os.path.join(ROOT, "content", "breeds", bid + ".md")):
        sys.exit(f"unknown breed id {bid}")
    open(os.path.join(OUT, bid + ".md"), "w", encoding="utf-8").write(body)
    n += 1
print(n, "files")
