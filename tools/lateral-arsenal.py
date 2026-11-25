"""Lugares marcantes, armas novas (recoloridas das que já existem) e ícones de amuletos, armaduras e tocha.
     python tools/lateral-arsenal.py        (rodar depois de lateral-arte.py itens e lateral-lanca.py)"""
import importlib.util, json, sys
from pathlib import Path
import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
SINA = RAIZ.parent if RAIZ.name == "lateral" else RAIZ
D = SINA / "lateral" / "assets" / "floresta"
IA = SINA / "arte-ia" / "lateral"
sp = importlib.util.spec_from_file_location("la", SINA / "tools" / "lateral-arte.py")
la = importlib.util.module_from_spec(sp)
sp.loader.exec_module(la)
meta = json.loads((D / "meta.json").read_text())

# ---------- lugares marcantes ----------
M = {"estatua": (20, 10, 340, 372, .52), "torre": (300, 16, 592, 376, .56), "costela": (548, 122, 890, 336, .5), "tenda": (860, 90, 1104, 304, .46), "mausoleu": (1096, 40, 1356, 326, .5),
     "bau": (34, 428, 214, 586, .22), "bau_aberto": (240, 420, 430, 592, .22), "tocha": (478, 400, 566, 730, .24), "gaiola": (618, 356, 790, 622, .36), "parede": (832, 362, 1130, 520, .4),
     "runa": (604, 640, 826, 738, .36), "caveiras": (880, 530, 1080, 744, .3), "poco": (1130, 530, 1344, 742, .34), "tronco2": (50, 650, 412, 734, .4)}
S = la.tira_magenta(Image.open(IA / "sina_marcos.png"))
a = np.asarray(S).copy()   # apaga o letreiro que a IA escreveu no mausoléu
rng = np.random.default_rng(2)
reg = a[126:158, 1168:1318]
cheio = reg[..., 3] > 200
reg[cheio, :3] = np.clip(np.array([58, 78, 72]) + rng.integers(-8, 8, (cheio.sum(), 1)), 0, 255)
S = Image.fromarray(a, "RGBA")
pecas = []
for n, (x0, y0, x1, y1, e) in M.items():
    q = la.nitidez(la.reduz(S.crop((x0, y0, x1, y1)), e))
    q = la.ilhas(q, .5 if n in ("torre", "mausoleu", "tenda", "bau", "bau_aberto", "poco", "parede", "gaiola") else .05)
    pecas.append((n, q.crop(q.getbbox())))
pecas.sort(key=lambda p: -p[1].height)
W, x, y, lh, pos = 560, 0, 0, 0, {}
for n, im in pecas:
    if x + im.width > W:
        x, y, lh = 0, y + lh + 2, 0
    pos[n] = [x, y, im.width, im.height]
    x += im.width + 2
    lh = max(lh, im.height)
at = Image.new("RGBA", (W, y + lh))
for n, im in pecas:
    at.paste(im, tuple(pos[n][:2]))
at.save(D / "marcos.webp", lossless=True, method=6)
meta["marcos"] = pos

# ---------- armas novas ----------
arm = Image.open(D / "armas.webp").convert("RGBA")
base_w = max(v[0] + v[2] for k, v in meta["armas"].items() if k not in ("adaga_presa", "lanca_prata")) + 2


def pega(n):
    x, y, w, h = meta["armas"][n]
    return arm.crop((x, y, x + w, y + h))


def muda(im, f):
    a = np.asarray(im).astype(int).copy()
    for yy in range(a.shape[0]):
        for xx in range(a.shape[1]):
            if a[yy, xx, 3] and a[yy, xx, :3].sum() > 70:
                a[yy, xx, :3] = np.clip(f(a[yy, xx, :3], xx / a.shape[1]), 0, 255)
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def osso(c, k):
    l = c.mean()
    if k > .38:   # a lâmina vira presa, com veneno na ponta
        return np.array([l * 1.15, l * 1.08, l * .78]) if k < .78 else np.array([l * .75, l * 1.05, l * .42])
    return np.array([l * .9, l * .62, l * .45])


def prata(c, k):
    l = c.mean()
    return np.array([l * .98, l * 1.08, l * 1.22]) if k > .6 else np.array([l * .62, l * .56, l * .6])


novas = {"adaga_presa": muda(pega("adaga"), osso), "lanca_prata": muda(pega("lanca"), prata)}
NW = base_w + sum(i.width + 2 for i in novas.values())
A2 = Image.new("RGBA", (NW, max(arm.height, 11)))
A2.paste(arm.crop((0, 0, base_w - 2, arm.height)), (0, 0))
x = base_w
for n, i in novas.items():
    A2.paste(i, (x, 0))
    meta["armas"][n] = [x, 0, i.width, i.height]
    x += i.width + 2
A2.save(D / "armas.webp", lossless=True, method=6)

# ---------- ícones ----------
it = Image.open(D / "itens.webp").convert("RGBA").crop((0, 0, 272, 102))
novo = Image.new("RGBA", (272, 102 + 34 * 3))
novo.paste(it, (0, 0))
COR = {".": None, "k": (12, 10, 9), "m": (140, 92, 56), "c": (190, 138, 88), "e": (84, 54, 34), "o": (226, 216, 190), "O": (170, 156, 128), "f": (206, 178, 116), "g": (140, 112, 64), "v": (120, 170, 60), "V": (70, 110, 40),
       "p": (214, 224, 232), "P": (140, 158, 172), "q": (84, 98, 112), "l": (255, 170, 60), "L": (255, 226, 130), "r": (214, 70, 36), "a": (110, 236, 226), "A": (50, 140, 140), "d": (60, 150, 96), "t": (172, 120, 84), "T": (120, 80, 54)}


def cordao(px):
    import math
    for t in range(0, 181, 4):
        x, y = 17 + 11 * math.cos(math.radians(t)), 8 + 13 * math.sin(math.radians(t))
        for dx, dy, c in ((0, 0, "g"), (0, -1, "f")):
            px[round(x) + dx, round(y) + dy] = COR[c] + (255,)


def desenha(linhas, x0, y0, im):
    px = im.load()
    for j, l in enumerate(linhas):
        for i, c in enumerate(l):
            if COR.get(c):
                px[x0 + i, y0 + j] = COR[c] + (255,)


def icone(pend=None, varios=None, sem=False):
    im = Image.new("RGBA", (34, 34))
    if not sem:
        cordao(im.load())
    if varios:
        for (x, y) in ((6, 14), (11, 18), (17, 20), (23, 18), (27, 14)):
            desenha(varios, x - 1, y, im)
    if pend:
        desenha(pend, 17 - len(pend[0]) // 2, 18 if not sem else 17 - len(pend) // 2, im)
    a = np.asarray(im).copy()
    al = a[..., 3] > 0
    v = np.zeros_like(al)
    v[1:] |= al[:-1]; v[:-1] |= al[1:]; v[:, 1:] |= al[:, :-1]; v[:, :-1] |= al[:, 1:]
    a[v & ~al] = (12, 10, 9, 255)
    return Image.fromarray(a, "RGBA")


IC = {
    "a_orelhas": icone(varios=["tTT", "ttT", ".tT", "..t"]),
    "a_presas": icone(varios=["ooO", "ooO", ".oO", "..o"]),
    "a_escama": icone(["..ppP..", ".pppPP.", "pppPPPq", "ppPPPqq", ".pPPqq.", "..PPq..", "...q..."]),
    "a_apito": icone(["oooooooooo", "oOOOOOOOOo", "oOkOOOkOOO", ".OOOOOOOO."]),
    "a_brasa": icone(["...l...", "..lLl..", ".lLLLl.", ".lLLLr.", "rlLLlr.", ".rrlrr.", "..rrr.."]),
    "a_pena": icone(["...pp..", "..ppP..", "..pPP..", ".ppPr..", ".pPrr..", ".rrr...", "..g....", "..g...."]),
    "a_olho": icone(["..AAA..", ".AaaaA.", "AaakaaA", "AakkkaA", "AaakaaA", ".AaaaA.", "..AAA.."]),
    "a_raiz": icone([".e...e.", "ee.e.ee", ".emmme.", "emdddme", ".emdme.", "ee.m.ee", ".e...e."]),
    "tocha": icone(["....l.....", "...lLl....", "..lLLl....", "..lLLLl...", "..rLLlr...", "..eell....", "..fgfg....", "...mm.....", "...mc.....", "...mc.....", "....mc....", "....mc....", "....em....", "....em....", ".....e...."], sem=True),
    "madeira": icone(["..eeeeeeeeeeee..", ".emcccmccmcccme.", "emcmmcmmcmmcmoOe", "emmcmmmcmmmmmOfO", "emcmmcmmmcmmmoOe", ".emmmemmmemmmme.", "..eeeeeeeeeeee.."], sem=True),
    "prata": icone(["...ppp...", "..ppppP..", ".pppPPPP.", "pppPPPPqq", "ppPPPPqqq", ".pPPPqqq.", "..PPqqq..", "...qqq...", "....q...."], sem=True),
    "seca": icone(["..m......", "..mT.....", ".rTTr....", ".rttTr...", ".rtTTr...", ".TrtTr...", ".TrTTr...", "..TrTT...", "..TTT....", "...T....."], sem=True),
}
for n in ("adaga_presa", "lanca_prata"):
    q = novas[n].rotate(38, Image.NEAREST, expand=True)
    q = q.crop(q.getbbox())
    e = min(1, 32 / max(q.size))
    q = q.resize((round(q.width * e), round(q.height * e)), Image.NEAREST)
    im = Image.new("RGBA", (34, 34))
    im.paste(q, ((34 - q.width) // 2, (34 - q.height) // 2))
    IC[n] = im
barro = json.loads((SINA / "lateral" / "assets" / "barro" / "barro.js").read_text().split("=", 1)[1].rstrip(";\n"))
for r in ("pele", "osso", "prata"):   # armadura: o busto do próprio herói vestido
    q = Image.open(SINA / "lateral" / "assets" / "barro" / f"{r}.png").convert("RGBA").crop((32, 15, 66, 49))
    IC["r_" + r] = q
for k, (n, im) in enumerate(IC.items()):
    x, y = (k % 8) * 34, 102 + (k // 8) * 34
    novo.paste(im, (x, y))
    meta["itens"][n] = [x, y, 34, 34]
novo.save(D / "itens.webp", lossless=True, method=6)
(D / "meta.json").write_text(json.dumps(meta))
(D / "arte.js").write_text("window.ARTE2=" + json.dumps(meta) + ";\n", encoding="utf-8")
P = Image.new("RGBA", (1120, 900), (50, 68, 70, 255))
b = at.resize((at.width * 3 // 2, at.height * 3 // 2), 0)
P.paste(b, (0, 0), b)
c = novo.resize((544, 408), 0)
P.paste(c, (560, 480), c)
P.save(IA / "_p.png")
print(len(pos), "lugares;", list(novas), len(IC), "ícones")
