"""Desenha à mão a lança de pedra na escala do herói e troca no atlas das armas e no ícone.
     python tools/lateral-lanca.py      (rodar depois de lateral-arte.py itens)"""
import json
from pathlib import Path
import numpy as np
from PIL import Image

D = Path(__file__).resolve().parent.parent / "assets" / "floresta"
W, H, Y = 46, 11, 5
P = {".": (0, 0, 0, 0), "c": (186, 132, 84, 255), "m": (140, 92, 56, 255), "e": (92, 58, 36, 255), "f": (206, 178, 116, 255), "g": (140, 112, 64, 255),
     "1": (226, 230, 224, 255), "2": (168, 176, 172, 255), "3": (112, 122, 120, 255), "4": (70, 78, 78, 255)}
im = Image.new("RGBA", (W, H))
px = im.load()
rng = np.random.default_rng(3)
# cabo: um galho fino, quase reto, com dois nós
for x in range(1, 34):
    dy = 1 if x < 9 else 0
    px[x, Y + dy - 1] = P["c"] if rng.random() < .62 else P["m"]
    px[x, Y + dy] = P["m"] if rng.random() < .5 else P["e"]
for nx in (12, 23):
    px[nx, Y - 2] = P["m"]
    px[nx, Y - 1] = P["e"]
    px[nx + 1, Y - 1] = P["e"]
px[1, Y] = P["e"]
# empunhadura de fibra, onde a mão pega
for x in range(14, 20):
    px[x, Y - 1] = P["f"] if x % 2 else P["g"]
    px[x, Y] = P["g"]
# amarração da ponta
for x in range(29, 35):
    for dy in (-2, -1, 0, 1):
        if dy in (-2, 1) and x in (29, 34):
            continue
        px[x, Y + dy] = P["f"] if (x + dy) % 3 else P["g"]
# ponta de pedra lascada, em folha
meia = [1, 2, 3, 3, 3, 2, 2, 2, 1, 1, 1]
for i, h in enumerate(meia):
    x = 34 + i
    for dy in range(-h, h):
        k = (dy + h) / (2 * h)
        px[x, Y + dy] = P["1"] if k < .3 else P["2"] if k < .55 else P["3"] if k < .8 else P["4"]
for x, y in ((37, Y - 1), (39, Y), (36, Y + 1), (41, Y)):   # lascas
    px[x, y] = P["3"]
# contorno
a = np.asarray(im).copy()
al = a[..., 3] > 0
v = np.zeros_like(al)
v[1:] |= al[:-1]; v[:-1] |= al[1:]; v[:, 1:] |= al[:, :-1]; v[:, :-1] |= al[:, 1:]
a[v & ~al] = (12, 10, 9, 255)
im = Image.fromarray(a, "RGBA")

meta = json.loads((D / "meta.json").read_text())
at = Image.open(D / "armas.webp").convert("RGBA")
x, y = meta["armas"]["lanca"][:2]
at.paste(Image.new("RGBA", (54, 11)), (x, y))
at.paste(im, (x, y))
at.save(D / "armas.webp", lossless=True, method=6)
meta["armas"]["lanca"] = [x, y, W, H]
it = Image.open(D / "itens.webp").convert("RGBA")
ix, iy, iw, ih = meta["itens"]["lanca"]
it.paste(Image.new("RGBA", (iw, ih)), (ix, iy))
ic = im.rotate(38, Image.NEAREST, expand=True)
ic = ic.crop(ic.getbbox())
e = min(1, 32 / max(ic.size))
ic = ic.resize((round(ic.width * e), round(ic.height * e)), Image.NEAREST)
it.paste(ic, (ix + (iw - ic.width) // 2, iy + (ih - ic.height) // 2))
it.save(D / "itens.webp", lossless=True, method=6)
(D / "meta.json").write_text(json.dumps(meta))
(D / "arte.js").write_text("window.ARTE2=" + json.dumps(meta) + ";\n", encoding="utf-8")
im.resize((W * 10, H * 10), Image.NEAREST).save(D.parent.parent.parent / "arte-ia" / "lateral" / "_p.png")
print("lança", W, H)
