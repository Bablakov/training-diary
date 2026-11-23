"""Собирает prototype/index.html из базы v2 (стили, пример данных, статистика) и новых частей v3.

Запуск из папки prototype:  python src/build.py
"""
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

SRC = Path(__file__).parent
L = (SRC / "v2-base.html").read_text(encoding="utf-8").split("\n")


def idx(prefix: str) -> int:
    for i, line in enumerate(L):
        if line.startswith(prefix):
            return i
    raise SystemExit(f"не найдено: {prefix}")


def part(name: str) -> str:
    return (SRC / name).read_text(encoding="utf-8")


st = idx("</style>")
a0, a1 = idx("const main="), idx("let db;")
b0, b1 = idx("function lastTime"), idx("function mkItem")
c0, c1 = idx("function vDetail"), idx("/* ---------- рендер и события")

out = ("\n".join(L[:st]) + "\n" + part("extra.css") + part("body.html")
       + "\n".join(L[a0:a1]) + part("j1.js") + "\n".join(L[b0:b1])
       + part("j2.js") + "\n".join(L[c0:c1]) + part("j3.js"))
(SRC.parent / "index.html").write_text(out, encoding="utf-8", newline="\n")
print("index.html:", len(out.split("\n")), "строк,",
      len(re.findall(r"<script>(.*?)</script>", out, re.S)[0]), "символов JS")
