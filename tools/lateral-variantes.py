"""Variedades de cada espécie, casas e o vale do SINA (versão de lado). Usa as rotinas de lateral-arte.py.
     python tools/lateral-variantes.py [variantes|casas|vale|tudo]
"""
import importlib.util, json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageEnhance

sp = importlib.util.spec_from_file_location("la", Path(__file__).with_name("lateral-arte.py"))
la = importlib.util.module_from_spec(sp)
sp.loader.exec_module(la)
IA, DEST, reduz, ilhas, nitidez, clareia, contorno, tira_magenta = la.IA, la.DEST, la.reduz, la.ilhas, la.nitidez, la.clareia, la.contorno, la.tira_magenta


def escurece(im, cor, k):
    """Puxa a cor do recorte para outra (para refazer um quadro que a IA errou a partir do bicho comum)."""
    a = np.asarray(im).astype(np.float32).copy()
    l = a[..., :3].mean(2, keepdims=True) / 110
    a[..., :3] = np.clip(a[..., :3] * (1 - k) + np.array(cor, np.float32) * l * k, 0, 255)
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def satura(im, k):
    al = im.getchannel("A")
    o = ImageEnhance.Color(im.convert("RGB")).enhance(k).convert("RGBA")
    o.putalpha(al)
    return o


def faixas(v, minimo, junta):
    """Trechos contínuos de v verdadeiro, juntando vãos menores que junta."""
    out, ini = [], None
    for i, b in enumerate(list(v) + [False]):
        if b and ini is None:
            ini = i
        if not b and ini is not None:
            out.append([ini, i])
            ini = None
    j = []
    for f in out:
        if j and f[0] - j[-1][1] < junta:
            j[-1][1] = f[1]
        else:
            j.append(f)
    return [f for f in j if f[1] - f[0] >= minimo]


def folha_tiras(nome, qs, meta, brilho=1.15, ilha=.05):
    """Alinha os 8 quadros pelos pés e grava a tira."""
    out = []
    for i, q in enumerate(qs):
        q = clareia(ilhas(nitidez(q, 1.3, 1.1), ilha), brilho)
        q = q.crop(q.getbbox())
        a = np.asarray(q)[..., 3] > 0
        xs = np.where(a[int(a.shape[0] * .86):].any(0))[0]
        cx = (xs.min() + xs.max()) / 2 if i != 7 and len(xs) else q.width / 2
        out.append((q, cx))
    meia = int(max(max(cx, q.width - cx) for q, cx in out)) + 2
    w, h = meia * 2, max(q.height for q, _ in out) + 2
    T = Image.new("RGBA", (w * 8, h))
    for i, (q, cx) in enumerate(out):
        T.paste(q, (round(i * w + meia - cx), h - 1 - q.height), q)
    contorno(T).save(DEST / f"m_{nome}.webp", lossless=True, method=6)
    meta[nome] = {"w": w, "h": h, "n": 8}


def celula(S, r, c, e, larg=1):
    cw = S.width / 8
    y0, y1 = [(0, 189), (192, 383), (386, 579), (583, 768)][r]
    q = S.crop((round(c * cw) + 3, y0 + 2, round((c + larg) * cw) - 3, y1 - 1))
    a = np.asarray(q).copy()
    a[:2], a[-1:], a[:, :2], a[:, -2:] = 0, 0, 0, 0
    return reduz(Image.fromarray(a, "RGBA"), e)


def tira_claro(im, lim):
    """Apaga riscos claros que a IA pintou em volta do golpe."""
    a = np.asarray(im).copy()
    rgb = a[..., :3].astype(int)
    a[(rgb.min(2) > lim - 40) & (rgb.max(2) > lim)] = 0
    return Image.fromarray(a, "RGBA")


def variantes():
    meta = {}
    S = tira_magenta(Image.open(IA / "sina_g3.png"))
    al = np.asarray(S)[..., 3] > 120
    linhas = faixas(al.any(1), 60, 8)
    for (y0, y1), (nome, e) in zip(linhas, [("goblin_arco", .285), ("goblin_xama", .285), ("goblin_porrete", .34), ("goblin_guerreiro", .3)]):
        cols = faixas(al[y0:y1].any(0), 60, 6)
        if len(cols) != 8:   # vizinhos encostados: corta pelo meio da grade
            print(nome, "colunas", cols)
            cols = [[round(k * S.width / 8) + 2, round((k + 1) * S.width / 8) - 2] for k in range(8)]
        qs = [reduz(S.crop((a, y0, b, y1)), e) for a, b in cols]
        if nome == "goblin_porrete":
            qs[6] = qs[3]
        folha_tiras(nome, qs, meta, 1.2)
    Z = tira_magenta(Image.open(IA / "sina_z1.png"))
    for r, (nome, e) in enumerate([("zumbi_mulher", .37), ("zumbi_machado", .37), ("zumbi_lanca", .36), ("zumbi_inchado", .4)]):
        qs = [celula(Z, r, c, e) for c in range(8)]
        if r == 0:
            qs[4] = qs[3]
        if r == 1:
            qs[3], qs[5] = qs[2], tira_claro(qs[5], 190)
        if r == 2:
            qs[5] = celula(Z, r, 4, e, 2)
            qs[4] = qs[3]
        if r == 3:
            qs[6], qs[5] = qs[2], qs[4]
        qs = [escurece(q, (92, 116, 100), .0 if r == 3 else .42) for q in qs]   # carne de morto
        folha_tiras(nome, qs, meta, 1.25, .3)
    L = tira_magenta(Image.open(IA / "sina_l1.png"))
    M1 = tira_magenta(Image.open(IA / "sina_m1.png"))
    for r, (nome, e) in enumerate([("lobo_rubro", .45), ("lobo_negro", .4), ("cobra_prata", .4), ("cobra_coral", .34)]):
        qs = [celula(L, r, c, e) for c in range(8)]
        if r == 0:
            qs = [satura(q, .72) for q in qs]
        if r == 1:
            qs[5] = escurece(celula(M1, 0, 5, .4), (44, 46, 54), .85)
        if r == 2:
            qs[7] = escurece(celula(M1, 1, 7, .5), (150, 158, 170), .9)
        if r == 3:
            qs[7] = escurece(celula(M1, 1, 7, .34), (150, 40, 34), .8)
        folha_tiras(nome, qs, meta, (1.12, 1.5, .84, 1.1)[r])
    return meta


CASA = {"casa1": (40, 110, 268, 274, .46), "casa2": (288, 88, 536, 276, .5), "casa3": (556, 48, 790, 274, .56), "casa4": (810, 64, 1066, 274, .62), "casa5": (1082, 34, 1350, 276, .66),
        "cerca": (34, 318, 276, 722, .26), "varal": (316, 334, 516, 518, .34), "horta": (546, 392, 788, 518, .34), "berco": (824, 328, 1008, 518, .26),
        "estacas": (1062, 388, 1286, 518, .3), "cama": (692, 598, 972, 722, .3), "lenha": (1010, 608, 1180, 720, .34), "cepo": (1220, 566, 1342, 722, .34)}


def casas():
    S = tira_magenta(Image.open(IA / "sina_casa.png"))
    pecas = []
    for n, (x0, y0, x1, y1, e) in CASA.items():
        q = ilhas(nitidez(reduz(S.crop((x0, y0, x1, y1)), e)), .03)
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
    at.save(DEST / "casa.webp", lossless=True, method=6)
    return pos


def vale(meta):
    im = Image.open(IA / "sina_f_vale.png").convert("RGB").resize((688, 384), Image.LANCZOS)
    im = ImageEnhance.Brightness(ImageEnhance.Sharpness(im).enhance(1.3)).enhance(1.15)
    im.save(DEST / "f_vale.webp", quality=86, method=6)
    # os enfeites do vale são os da floresta numa luz de fim de tarde
    at = Image.open(DEST / "p_floresta.webp").convert("RGBA")
    novo = la.tinge(at, ((120, 126, 98), .42, 1.06))
    for n in ("circulo", "fogo", "barro"):
        x, y, w, h = meta["props"][n]
        novo.paste(at.crop((x, y, x + w, y + h)), (x, y))
    novo.save(DEST / "p_vale.webp", lossless=True, method=6)


if __name__ == "__main__":
    q = sys.argv[1] if len(sys.argv) > 1 else "tudo"
    arq = DEST / "meta.json"
    meta = json.loads(arq.read_text())
    if q in ("variantes", "tudo"):
        meta["monstros"].update(variantes())
    if q in ("casas", "tudo"):
        meta["casa"] = casas()
    if q in ("vale", "tudo"):
        vale(meta)
    arq.write_text(json.dumps(meta))
    (DEST / "arte.js").write_text("window.ARTE2=" + json.dumps(meta) + ";\n", encoding="utf-8")
    print({k: len(v) for k, v in meta.items()})
