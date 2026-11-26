"""Rastejar das cobras: o corpo erguido ondula (cada linha desliza de lado, mais no alto), a cauda arrasta.
     C:\\Stack\\ia\\.venv\\Scripts\\python.exe tools/lateral-cobras.py
Lê o quadro parado de m_<cobra>.webp e grava m_<cobra>_anda.webp com 6 quadros."""
import json, math
from pathlib import Path
import numpy as np
from PIL import Image

D = Path(__file__).parent.parent / "assets" / "floresta"
N = 6


def ondula(q, fase):
    a = np.asarray(q).copy()
    h, w = a.shape[:2]
    out = np.zeros((h, w + 8, 4), np.uint8)
    for y in range(h):
        k = 1 - y / h  # topo mexe mais
        dx = round(3.2 * k * math.sin(fase + y * 0.16) + 1.2 * math.sin(fase * 2 + y * 0.35) * (y / h))
        out[y, 4 + dx:4 + dx + w] = a[y]
    # sobe e desce de leve, como quem se arrasta
    dy = round(math.sin(fase * 2) * 0.8)
    o = Image.fromarray(out, "RGBA")
    return o.transform(o.size, Image.AFFINE, (1, 0, 0, 0, 1, -dy), resample=Image.NEAREST)


def main():
    meta = json.loads((D / "meta.json").read_text())
    M = meta["monstros"]
    for n in [k for k in M if k.startswith("cobra")]:
        mt = M[n]
        im = Image.open(D / f"m_{n}.webp").convert("RGBA")
        q = im.crop((0, 0, mt["w"], mt["h"]))
        qs = [ondula(q, i * 2 * math.pi / N) for i in range(N)]
        w, h = qs[0].size
        T = Image.new("RGBA", (w * N, h))
        for i, f in enumerate(qs):
            T.paste(f, (i * w, 0))
        T.save(D / f"m_{n}_anda.webp", lossless=True, method=6)
        mt["anda"] = {"w": w, "h": h, "n": N, "passo": 7}
        print(n, mt["anda"])
    (D / "meta.json").write_text(json.dumps(meta))
    (D / "arte.js").write_text("window.ARTE2=" + json.dumps(meta) + ";\n", encoding="utf-8")


if __name__ == "__main__":
    main()
