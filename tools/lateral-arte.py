"""Arte do SINA 2D (versão de lado): corta o que as IAs do navegador pintaram e grava em lateral/assets.
     python tools/lateral-arte.py fundos | props | monstros | itens | tudo
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageEnhance

RAIZ = Path(__file__).resolve().parent.parent
IA = RAIZ / "arte-ia" / "lateral"
DEST = RAIZ / "lateral" / "assets" / "floresta"
DEST.mkdir(parents=True, exist_ok=True)

# ---------- utilidades ----------


def tira_magenta(im):
    """Magenta vira transparente; o que estava misturado com ele perde a cor da mistura."""
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = np.minimum(r, b) - g
    alfa = np.clip(1 - (m - 22) / 80, 0, 1)
    lim = np.maximum(g + 4, 0)
    r2 = np.where(m > 6, np.minimum(r, lim + (r - np.minimum(r, b))), r)
    b2 = np.where(m > 6, np.minimum(b, lim + (b - np.minimum(r, b))), b)
    out = np.dstack([r2, g, b2, alfa * 255]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def reduz(im, esc, duro=True):
    w, h = max(1, round(im.width * esc)), max(1, round(im.height * esc))
    a = np.asarray(im).astype(np.float32)
    al = a[..., 3:4] / 255
    pre = np.concatenate([a[..., :3] * al, a[..., 3:4]], 2)
    # cada canal em separado, com alfa já multiplicado (sem halo)
    can = [np.asarray(Image.fromarray(pre[..., i]).resize((w, h), Image.LANCZOS if not duro else Image.BOX)) for i in range(4)]
    A = np.clip(can[3], 0, 255)
    d = np.maximum(A / 255, 1e-3)
    rgb = [np.clip(c / d, 0, 255) for c in can[:3]]
    if duro:
        A = np.where(A > 110, 255, 0)
    return Image.fromarray(np.dstack(rgb + [A]).astype(np.uint8), "RGBA")


def nitidez(im, k=1.25, cor=1.08):
    al = im.getchannel("A")
    rgb = ImageEnhance.Color(ImageEnhance.Contrast(im.convert("RGB")).enhance(1.06)).enhance(cor)
    rgb = ImageEnhance.Sharpness(rgb).enhance(k)
    out = rgb.convert("RGBA")
    out.putalpha(al)
    return out


def clareia(im, k):
    al = im.getchannel('A')
    o = ImageEnhance.Brightness(im.convert('RGB')).enhance(k).convert('RGBA')
    o.putalpha(al)
    return o


def contorno(im, cor=(8, 9, 10)):
    a = np.asarray(im).copy()
    al = a[..., 3] > 0
    viz = np.zeros_like(al)
    viz[1:] |= al[:-1]; viz[:-1] |= al[1:]; viz[:, 1:] |= al[:, :-1]; viz[:, :-1] |= al[:, 1:]
    b = viz & ~al
    a[b] = (*cor, 255)
    return Image.fromarray(a, "RGBA")


def ilhas(im, minimo=.06):
    """Fica só com os pedaços grandes (tira o que sobrou do vizinho no recorte)."""
    a = np.asarray(im).copy()
    al = a[..., 3] > 60
    h, w = al.shape
    vis = np.zeros_like(al)
    comps = []
    for y0 in range(h):
        for x0 in range(w):
            if not al[y0, x0] or vis[y0, x0]:
                continue
            pilha, c = [(y0, x0)], []
            vis[y0, x0] = True
            while pilha:
                y, x = pilha.pop()
                c.append((y, x))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < h and 0 <= xx < w and al[yy, xx] and not vis[yy, xx]:
                            vis[yy, xx] = True
                            pilha.append((yy, xx))
            comps.append(c)
    if not comps:
        return im
    g = max(len(c) for c in comps)
    for c in comps:
        if len(c) < g * minimo:
            for y, x in c:
                a[y, x] = 0
    return Image.fromarray(a, "RGBA")


# ---------- fundos ----------
def fundos():
    for dest, orig in (("f_floresta", "sina_fundo"), ("f_lobos", "sina_f_lobos"), ("f_cobras", "sina_f_cobras"), ("f_zumbis", "sina_f_zumbis"), ("f_goblins", "sina_f_goblins")):
        im = Image.open(IA / f"{orig}.png").convert("RGB").resize((688, 384), Image.LANCZOS)
        im = ImageEnhance.Sharpness(im).enhance(1.3)
        im.save(DEST / f"{dest}.webp", quality=86, method=6)
    Image.open(IA / "sina_nasce.png").convert("RGB").save(DEST / "nasce.webp", quality=84, method=6)


# ---------- enfeites, um atlas por região ----------
P1 = {"arvorao": (0, 0, 508, 492, .62), "arvore": (435, 20, 800, 430, .42), "samambaia": (815, 22, 1102, 222, .2), "cogumelos": (1120, 20, 1342, 216, .17),
      "pedrao": (785, 240, 1056, 425, .3), "pedras": (1095, 240, 1342, 373, .15), "tronco": (1060, 385, 1358, 505, .28), "galhada": (35, 520, 326, 752, .17),
      "planta": (340, 530, 602, 753, .19), "pilar": (615, 470, 782, 757, .34), "arco": (790, 480, 1096, 757, .42), "frutas": (1110, 552, 1354, 757, .2)}
P2 = {"circulo": (33, 318, 446, 556, .42), "fogo": (511, 330, 738, 446, .2), "barro": (775, 303, 992, 443, .36), "totem": (1003, 216, 1160, 441, .36),
      "ossos": (1156, 325, 1352, 438, .24), "ossos2": (53, 616, 336, 735, .24), "lapide": (372, 490, 598, 697, .22), "ninho": (610, 545, 822, 715, .24),
      "caverna": (838, 458, 1202, 730, .5), "placa": (1210, 460, 1362, 714, .22), "ponte": (35, 220, 529, 328, .3)}
# mistura de cor por região: (matiz RGB, força, brilho)
TINTA = {"floresta": None, "lobos": ((96, 118, 150), .62, .92), "cobras": ((128, 132, 62), .55, 1.0), "zumbis": ((128, 110, 138), .68, 1.02), "goblins": ((168, 108, 66), .6, 1.0)}


def tinge(im, t):
    if not t:
        return im
    a = np.asarray(im).astype(np.float32)
    l = a[..., :3].mean(2, keepdims=True)
    c = np.array(t[0], np.float32) / (sum(t[0]) / 3)
    a[..., :3] = np.clip((a[..., :3] * (1 - t[1]) + l * c * t[1]) * t[2], 0, 255)
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def copa(im):
    """A árvore grande veio cortada no alto da pintura: arredonda a copa em tufos de folha."""
    a = np.asarray(im).copy()
    h, w = a.shape[:2]
    rng = np.random.default_rng(9)
    topo = np.full(w, 60.0)
    for _ in range(26):
        c, r, base = rng.uniform(0, w), rng.uniform(14, 34), rng.uniform(2, 26)
        x = np.arange(w)
        d = np.abs(x - c) / r
        topo = np.where(d < 1, np.minimum(topo, base + r * 1.0 * (1 - np.sqrt(np.clip(1 - d * d, 0, 1)))), topo)
    topo += 22 * np.abs(np.linspace(-1, 1, w)) ** 3
    for x in range(w):
        t = int(topo[x] + rng.integers(-1, 2))
        if t > 0:
            a[:t, x] = 0
    return Image.fromarray(a, 'RGBA')


def props():
    A, B = tira_magenta(Image.open(IA / "sina_props.png")), tira_magenta(Image.open(IA / "sina_props2.png"))
    # apaga o letreiro que a IA escreveu na lápide
    b = np.asarray(B).copy()
    b[525:632, 495:565, :3] = (b[525:632, 495:565, :3] * .0 + np.array([70, 88, 80])).astype(np.uint8)
    rng = np.random.default_rng(4)
    b[525:632, 495:565, :3] = np.clip(b[525:632, 495:565, :3].astype(int) + rng.integers(-10, 10, (107, 70, 1)), 0, 255)
    B = Image.fromarray(b, "RGBA")
    pecas = []
    for tab, src in ((P1, A), (P2, B)):
        for n, (x0, y0, x1, y1, e) in tab.items():
            im = src.crop((x0, y0, min(x1, src.width), min(y1, src.height)))
            luz = n in ("circulo", "cogumelos")
            im = reduz(im, e, duro=not luz)
            im = ilhas(nitidez(im), .5 if n in ('arvorao', 'arvore', 'caverna', 'planta', 'samambaia', 'lapide') else .004 if n == 'circulo' else .04)
            bb = im.getbbox()
            im = im.crop(bb)
            pecas.append((n, copa(im) if n == 'arvorao' else im))
    # chão: capim (em cima) e terra (embaixo), repetíveis na horizontal
    faixa = reduz(B.crop((60, 10, 1320, 197)), .46, duro=True)
    f = nitidez(faixa)
    pecas.append(("chao", f))
    # monta o atlas
    pecas.sort(key=lambda p: -p[1].height)
    W, x, y, lh, pos = 760, 0, 0, 0, {}
    for n, im in pecas:
        if x + im.width > W:
            x, y, lh = 0, y + lh + 2, 0
        pos[n] = [x, y, im.width, im.height]
        x += im.width + 2
        lh = max(lh, im.height)
    H = y + lh
    for reg, t in TINTA.items():
        at = Image.new("RGBA", (W, H))
        for n, im in pecas:
            px, py = pos[n][:2]
            at.paste(tinge(im, None if n in ("circulo", "fogo", "barro") else t), (px, py))
        at.save(DEST / f"p_{reg}.webp", lossless=True, method=6)
    return pos


# ---------- monstros ----------
M = [("sina_m1", ["lobo", "cobra", "zumbi", "goblin"], [.38, .34, .37, .36]),
     ("sina_m2", ["alfa", "rainha", "carcereiro", "chefe"], [.58, .62, .46, .5])]


def monstros():
    meta = {}
    for arq, nomes, escs in M:
        S = tira_magenta(Image.open(IA / f"{arq}.png"))
        cw = S.width / 8
        linhas = [(0, 190), (194, 382), (387, 576), (581, 768)]
        for r, nome in enumerate(nomes):
            y0, y1 = linhas[r]
            qs = []
            for c in range(8):
                q = S.crop((round(c * cw) + 4, y0, round((c + 1) * cw) - 3, y1))
                a = np.asarray(q).copy()
                q = reduz(Image.fromarray(a, "RGBA"), escs[r])
                # tira sujeira solta nas bordas (linhas da grade)
                b = np.asarray(q).copy()
                b[:1], b[:, :1], b[:, -1:] = 0, 0, 0
                if r < 3:
                    b[-1:] = 0
                q2 = ilhas(nitidez(Image.fromarray(b, "RGBA"), 1.35, 1.12), .05)
                qs.append(clareia(q2, {'zumbi': 1.35, 'carcereiro': 1.4, 'alfa': 1.25, 'goblin': 1.15}.get(nome, 1.1)))
            w, h = qs[0].width + 2, max(q.height for q in qs) + 2
            T = Image.new("RGBA", (w * 8, h))
            for i, q in enumerate(qs):
                bb = q.getbbox()
                T.paste(q.crop(bb), (i * w + bb[0] + 1, h - 1 - (bb[3] - bb[1])))
            T = contorno(T)
            T.save(DEST / f"m_{nome}.webp", lossless=True, method=6)
            meta[nome] = {"w": w, "h": h, "n": 8}
    return meta


# ---------- itens ----------
IT = ["porrete", "faca", "machado", "lanca", "espada", "adaga", "osso_clava", "machado_ferro",
      "galho", "pedra", "fibra", "folha", "fruta", "erva", "carne", "osso",
      "couro", "pele", "presa", "trapo", "ferro", "orelha", "arco", "flecha"]


def itens():
    p = IA / "sina_itens.png"
    if not p.exists():
        return {}
    S = tira_magenta(Image.open(p))
    cw, ch = S.width / 8, S.height / 3
    meta = {}
    at = Image.new("RGBA", (8 * 34, 3 * 34))
    arm = {}
    for k, n in enumerate(IT):
        c, r = k % 8, k // 8
        q = S.crop((round(c * cw) + 3, round(r * ch) + 3, round((c + 1) * cw) - 3, round((r + 1) * ch) - 3))
        a = np.asarray(q).copy()
        a[a[..., 3] < 120] = 0
        q = Image.fromarray(a, "RGBA").crop(Image.fromarray(a, "RGBA").getbbox())
        e = min(32 / q.width, 32 / q.height)
        i = nitidez(reduz(q, e))
        at.paste(i, (c * 34 + (34 - i.width) // 2, r * 34 + (34 - i.height) // 2))
        meta[n] = [c * 34, r * 34, 34, 34]
        COMP = {"porrete": 30, "faca": 17, "machado": 30, "lanca": 54, "espada": 36, "adaga": 21, "osso_clava": 34, "machado_ferro": 34, "flecha": 26, "arco": 34}
        if n in COMP:
            w = contorno(nitidez(reduz(q, COMP[n] / q.width)).copy())
            arm[n] = w
    at.save(DEST / "itens.webp", lossless=True, method=6)
    W = sum(i.width + 2 for i in arm.values())
    H = max(i.height for i in arm.values())
    T = Image.new("RGBA", (W, H))
    x, am = 0, {}
    for n, i in arm.items():
        T.paste(i, (x, 0))
        am[n] = [x, 0, i.width, i.height]
        x += i.width + 2
    T.save(DEST / "armas.webp", lossless=True, method=6)
    return {"itens": meta, "armas": am}


if __name__ == "__main__":
    q = sys.argv[1] if len(sys.argv) > 1 else "tudo"
    arq = DEST / "meta.json"
    meta = json.loads(arq.read_text()) if arq.exists() else {}
    if q in ("fundos", "tudo"):
        fundos()
    if q in ("props", "tudo"):
        meta["props"] = props()
    if q in ("monstros", "tudo"):
        meta["monstros"] = monstros()
    if q in ("itens", "tudo"):
        meta.update(itens())
    arq.write_text(json.dumps(meta))
    (DEST / "arte.js").write_text("window.ARTE2=" + json.dumps(meta) + ";\n", encoding="utf-8")
    print({k: len(v) for k, v in meta.items()})
