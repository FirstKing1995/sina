"""Andar dos monstros (PixelLab e Gemini) e poses extras dos quatro chefes.
     python tools/lateral-andar.py      (rodar depois de lateral-variantes.py)"""
import importlib.util, json
from pathlib import Path
import numpy as np
from PIL import Image
R = Path(__file__).resolve().parent.parent
S0 = R.parent if R.name == "lateral" else R
sp = importlib.util.spec_from_file_location("lv", S0 / "tools" / "lateral-variantes.py"); lv = importlib.util.module_from_spec(sp); sp.loader.exec_module(lv)
la, D, IA = lv.la, lv.DEST, lv.IA
meta = json.loads((D / "meta.json").read_text())


def tira(nome, qs, contorna=True, pes=True):
    out = []
    for q in qs:
        q = q.crop(q.getbbox())
        a = np.asarray(q)[..., 3] > 0
        xs = np.where(a[int(a.shape[0] * .8):].any(0))[0]
        # na corrida o corpo estica: centraliza pelo corpo todo, não pelas patas
        out.append((q, (xs.min() + xs.max()) / 2 if pes else q.width / 2))
    meia = int(max(max(c, q.width - c) for q, c in out)) + 2
    w, h = meia * 2, max(q.height for q, _ in out) + 2
    T = Image.new("RGBA", (w * len(out), h))
    for i, (q, c) in enumerate(out):
        T.paste(q, (round(i * w + meia - c), h - 1 - q.height), q)
    (la.contorno(T) if contorna else T).save(D / f"{nome}.webp", lossless=True, method=6)
    return {"w": w, "h": h, "n": len(out)}


def limpa(im):
    a = np.asarray(im.convert("RGBA")).copy()
    a[a[..., 3] < 128] = 0
    a[a[..., 3] >= 128, 3] = 255
    return Image.fromarray(a, "RGBA")


def anda(nome, qs, passo, **k):
    meta["monstros"][nome]["anda"] = {**tira(f"m_{nome}_anda", qs, **k), "passo": passo}


P = S0 / "arte-pixel" / "anda"
lobo = [limpa(Image.open(P / "lobo" / f"{i}.png")) for i in (1, 2, 3, 4, 5)]
anda("lobo", lobo, 15, contorna=False, pes=False)
negro = [lv.escurece(q, (46, 48, 56), .86) for q in lobo]
anda("lobo_negro", negro, 15, contorna=False, pes=False)
gob = [limpa(Image.open(P / "goblin" / f"{i}.png")) for i in range(1, 9)]
anda("goblin", gob, 7, contorna=False)
Z = la.tira_magenta(Image.open(IA / "sina_w2.png"))
for r, nome, cols, e, passo in ((0, "zumbi_mulher", (4, 5, 6, 7), .37, 13), (1, "zumbi_machado", (2, 4, 5, 6), .37, 10), (2, "zumbi_lanca", (0, 1, 2, 6), .36, 11)):
    qs = [la.clareia(la.ilhas(la.nitidez(lv.escurece(lv.celula(Z, r, c, e), (92, 116, 100), .3), 1.3, 1.1), .3), 1.25) for c in cols]
    anda(nome, qs, passo)
B = la.tira_magenta(Image.open(IA / "sina_m3.png"))
for r, (nome, e, br) in enumerate((("alfa", .58, 1.25), ("rainha", .62, 1.1), ("carcereiro", .46, 1.5), ("chefe", .5, 1.1))):
    qs = []
    for c in range(8):
        q = lv.celula(B, r, c, e, 1.36 if (r, c) == (2, 4) else 1)
        qs.append(la.clareia(la.ilhas(la.nitidez(q, 1.35, 1.12), .3 if r != 0 else .05), br))
    meta["monstros"][nome]["pose"] = tira(f"m_{nome}_pose", qs, pes=r != 0)
(D / "meta.json").write_text(json.dumps(meta))
(D / "arte.js").write_text("window.ARTE2=" + json.dumps(meta) + ";\n", encoding="utf-8")
W = Image.new("RGBA", (1100, 900), (50, 68, 70, 255)); y = 0
for n in ("lobo_anda", "lobo_negro_anda", "goblin_anda", "zumbi_mulher_anda", "zumbi_machado_anda", "zumbi_lanca_anda", "alfa_pose", "rainha_pose", "carcereiro_pose", "chefe_pose"):
    i = Image.open(D / f"m_{n}.webp").convert("RGBA"); W.paste(i, (0, y), i); y += i.height + 2
W.crop((0, 0, 1100, y)).save(IA / "_p.png")
print("ok")
