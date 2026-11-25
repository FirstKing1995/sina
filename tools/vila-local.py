"""Moradores da vila feitos por recoloração das folhas que já existem (enquanto o Gemini não pinta os definitivos).
     python tools/vila-local.py      -> assets/barro/vila.png (6 poses x 4 pessoas)"""
import colorsys
from pathlib import Path
import numpy as np
from PIL import Image

D = Path(__file__).resolve().parent.parent / "assets" / "barro"
HER = {"parado": 0, "correr": 4, "golpe1": 12, "colher": 48}


def quadro(folha, k):
    return folha.crop((k % 10 * 100, k // 10 * 100, k % 10 * 100 + 100, k // 10 * 100 + 100))


def pinta(im, regra):
    a = np.asarray(im).copy()
    for y in range(100):
        for x in range(100):
            if a[y, x, 3] < 10:
                continue
            r, g, b = (int(v) / 255 for v in a[y, x, :3])
            h, l, s = colorsys.rgb_to_hls(r, g, b)
            n = regra(h * 360, l, s, y)
            if n:
                a[y, x, :3] = [int(255 * v) for v in colorsys.hls_to_rgb((n[0] % 360) / 360, min(1, max(0, n[1])), min(1, max(0, n[2])))]
    return Image.fromarray(a, "RGBA")


pele = lambda h, l, s: h < 42 or h > 345


def ferreiro(h, l, s, y):      # manto de folhas vira couro cru; brasa da pele apaga
    if 55 < h < 170:
        return 26, l * .92, .34
    if pele(h, l, s) and s > .25 and y > 40:
        return 24, l * .92, min(.5, s * .62)
    if y <= 40 and l < .32:
        return 30, l * 1.5 + .12, .06   # cabelo e barba grisalhos
    return None


def curandeira(h, l, s, y):    # vestido vinho, cabelo branco
    if 60 < h < 170 and s > .12:
        return 352, l * .74, .42
    if (200 < h < 300 or s < .2) and y < 62 and .1 < l < .5:
        return 40, min(.9, l * 1.4 + .42), .05
    return None


def cacador(h, l, s, y):       # capuz de lobo em pelo pardo
    if s < .22 and l > .12:
        return 28, l * .82, .30
    if pele(h, l, s) and s > .3:
        return 24, l, s * .75
    return None


def vigia(h, l, s, y):         # túnica azul acinzentada, faixa vermelha na cintura
    if 60 < h < 170 and s > .12:
        return (356, l * .95, .5) if 44 < y < 49 else (212, l * .86, .26)
    return None


mul, fol, cou = (Image.open(D / f"{n}.png").convert("RGBA") for n in ("mulher", "folhas", "couro"))
idh = [HER["parado"], HER["parado"] + 1, HER["correr"] + 1, HER["correr"] + 3, HER["colher"], HER["golpe1"] + 2]
idm = [0, 2, 5, 7, 20, 14]
T = Image.new("RGBA", (600, 400))
for r, (folha, ids, regra) in enumerate(((fol, idh, ferreiro), (mul, idm, curandeira), (cou, idh, cacador), (mul, idm, vigia))):
    for c, k in enumerate(ids):
        T.paste(pinta(quadro(folha, k), regra), (c * 100, r * 100))
T.save(D / "vila.png")
P = Image.new("RGBA", (600, 400), (50, 68, 70, 255))
P.paste(T, (0, 0), T)
P.resize((1200, 800), 0).save(D.parent.parent.parent / "arte-ia" / "lateral" / "_p.png")
print("vila.png")
