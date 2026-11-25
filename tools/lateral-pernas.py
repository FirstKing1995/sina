"""Andar dos goblins novos (folhas sina_w3 e sina_w4 do Gemini) e a corrida do lobo em vermelho.
     python tools/lateral-pernas.py      (rodar depois de lateral-andar.py)"""
import importlib.util, json
from pathlib import Path
import numpy as np
from PIL import Image
R = Path(__file__).resolve().parent.parent
S0 = R.parent if R.name == "lateral" else R
sp = importlib.util.spec_from_file_location("lv", S0 / "tools" / "lateral-variantes.py"); lv = importlib.util.module_from_spec(sp); sp.loader.exec_module(lv)
la, D, IA = lv.la, lv.DEST, lv.IA
meta = json.loads((D / "meta.json").read_text())
P = S0 / "arte-pixel" / "anda"


def tira_verde(im):
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = g - np.maximum(r, b)
    alfa = np.clip(1 - (m - 30) / 70, 0, 1)
    g2 = np.where(m > 14, np.maximum(r, b) + 10, g)
    return Image.fromarray(np.dstack([r, g2, b, alfa * 255]).clip(0, 255).astype(np.uint8), "RGBA")


def limpa(im):
    a = np.asarray(im.convert("RGBA")).copy(); a[a[..., 3] < 128] = 0; a[a[..., 3] >= 128, 3] = 255
    return Image.fromarray(a, "RGBA")


def maior(im):
    return la.ilhas(im, .12)


def celas(S, y0, y1, n=8):
    cw = S.width / n
    return [maior(S.crop((round(i * cw), y0, round((i + 1) * cw), y1))) for i in range(n)]


def eixo(q, f0, f1):
    """Meio do corpo numa faixa da altura (para alinhar os quadros)."""
    bb = q.getbbox(); h = bb[3] - bb[1]
    a = np.asarray(q)[bb[1] + int(h * f0):bb[1] + int(h * f1), :, 3] > 128
    xs = np.where(a.any(0))[0]
    return (xs.min() + xs.max()) / 2


def grava(nome, qs, faixa, alt, passo):
    """qs em tamanho da folha; alt = altura final do corpo em pixels do jogo."""
    H = max(q.getbbox()[3] - q.getbbox()[1] for q in qs); e = alt / H
    out = []
    for q in qs:
        c = eixo(q, *faixa); bb = q.getbbox(); k = q.crop((0, bb[1], q.width, bb[3]))
        p = la.nitidez(la.reduz(k, e), 1.3, 1.1); out.append((limpa(la.clareia(p, 1.12)), c * e))
    # mesma luz e cor do bicho parado
    mm = meta["monstros"][nome]; ref = np.asarray(Image.open(D / f"m_{nome}.webp").convert("RGBA").crop((0, 0, mm["w"], mm["h"]))).astype(float)
    med = lambda a: a[(a[..., 3] > 0) & (a[..., :3].sum(2) > 110)][:, :3].mean(0)
    k = np.clip(med(ref) / med(np.concatenate([np.asarray(p).reshape(-1, 1, 4) for p, _ in out]).astype(float)), .8, 1.5) ** .85
    novo = []
    for p, c in out:
        a = np.asarray(p).astype(float).copy()
        if nome == "goblin_xama":   # o cristal roxo vira o verde do cajado
            rx = (a[..., 2] > a[..., 1] * 1.35) & (a[..., 0] > a[..., 1] * 1.15) & (a[..., 2] > 110); a[rx] = np.stack([a[rx][:, 1] * .7, a[rx][:, 2], a[rx][:, 1] * .6, a[rx][:, 3]], 1)
        a[..., :3] = np.clip(a[..., :3] * k, 0, 255); novo.append((Image.fromarray(a.astype(np.uint8), "RGBA"), c))
    out = novo
    meia = int(max(max(c - p.getbbox()[0], p.getbbox()[2] - c) for p, c in out)) + 3
    w, h = meia * 2, max(p.height for p, _ in out) + 2
    T = Image.new("RGBA", (w * len(out), h))
    for i, (p, c) in enumerate(out):
        T.paste(p, (round(i * w + meia - c), h - 1 - p.height), p)
    la.contorno(T).save(D / f"m_{nome}_anda.webp", lossless=True, method=6)
    meta["monstros"][nome]["anda"] = {"w": w, "h": h, "n": len(out), "passo": passo}


def altura(nome):
    m = meta["monstros"][nome]; f = Image.open(D / f"m_{nome}.webp").convert("RGBA").crop((0, 0, m["w"], m["h"])).getbbox()
    return f[3] - f[1]


W3, W4 = tira_verde(Image.open(IA / "sina_w3.png")), tira_verde(Image.open(IA / "sina_w4.png"))
grava("goblin_arco", celas(W3, 20, 190), (.1, .4), altura("goblin_arco"), 7)
# guerreiro: o tronco com escudo vale para todos; as pernas vêm de cada quadro
g = celas(W4, 16, 240); corte = 148; base = g[1]; cb = eixo(base, .5, .64); qs = []
for i in (0, 1, 2, 3, 4, 7, 5, 6):
    q = g[i]; t = Image.new("RGBA", (q.width + 40, q.height)); dx = round(20 + cb - eixo(q, .56, .66))
    p = np.asarray(q).copy(); p[:corte] = 0; p = maior(Image.fromarray(p, "RGBA")); t.paste(p, (dx, 0), p)
    tr = np.asarray(base).copy(); tr[corte + 6:] = 0; tr = Image.fromarray(tr, "RGBA"); t.paste(tr, (20, 0), tr); qs.append(t)
grava("goblin_guerreiro", qs, (.1, .4), altura("goblin_guerreiro"), 6)
b = celas(W4, 262, 500); grava("goblin_porrete", [b[i] for i in (0, 1, 2, 6, 7)], (.2, .5), altura("goblin_porrete") * 1.12, 9)
x = celas(W4, 534, 768); grava("goblin_xama", [x[i] for i in (0, 1, 6, 7, 4, 3)], (.2, .5), altura("goblin_xama"), 8)
# lobo vermelho: a mesma corrida, maior e recolorida
qs = []
for i in (1, 2, 3, 4, 5):
    q = limpa(Image.open(P / "lobo" / f"{i}.png")); q = q.crop(q.getbbox())
    k = limpa(q.resize((round(q.width * 1.36), round(q.height * 1.36)), Image.LANCZOS)); qs.append(la.nitidez(lv.escurece(k, (168, 46, 48), .84), 1.3, 1.1))
w = max(q.width for q in qs) + 4; h = max(q.height for q in qs) + 2
F = Image.new("RGBA", (w * 5, h))
for i, q in enumerate(qs):
    F.paste(q, (i * w + (w - q.width) // 2, h - 1 - q.height), q)
la.contorno(F).save(D / "m_lobo_rubro_anda.webp", lossless=True, method=6)
meta["monstros"]["lobo_rubro"]["anda"] = {"w": w, "h": h, "n": 5, "passo": 20}
(D / "meta.json").write_text(json.dumps(meta))
(D / "arte.js").write_text("window.ARTE2=" + json.dumps(meta) + ";\n", encoding="utf-8")
V = Image.new("RGBA", (760, 460), (50, 68, 70, 255)); y = 0
for n in ("goblin_arco", "goblin_xama", "goblin_guerreiro", "goblin_porrete"):
    i = Image.open(D / f"m_{n}_anda.webp").convert("RGBA"); V.paste(i, (0, y), i)
    m = meta["monstros"][n]; j = Image.open(D / f"m_{n}.webp").convert("RGBA").crop((0, 0, m["w"], m["h"])); V.paste(j, (i.width + 8, y), j); y += max(i.height, j.height) + 4
V.crop((0, 0, 760, y)).resize((1520, y * 2), 0).save(IA / "_p.png")
print("ok")
