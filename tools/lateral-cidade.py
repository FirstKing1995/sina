"""Construções da vila (sina_predios.png, magenta) e as pessoas (sina_vila/sina_ferreiro/sina_vila2, verde).
     python tools/lateral-cidade.py predios | povo"""
import importlib.util, json, sys
from pathlib import Path
import numpy as np
from PIL import Image
R = Path(__file__).resolve().parent.parent
S0 = R.parent if R.name == "lateral" else R
sp = importlib.util.spec_from_file_location("lv", S0 / "tools" / "lateral-variantes.py"); lv = importlib.util.module_from_spec(sp); sp.loader.exec_module(lv)
la, D, IA = lv.la, lv.DEST, lv.IA
BARRO = R / "assets" / "barro" if (R / "assets").exists() else R / "lateral" / "assets" / "barro"
# nome: recorte na folha e altura final em pixels do jogo
PRED = {"poco": (60, 60, 300, 345, 66), "celeiro": (370, 40, 680, 350, 104), "torre": (760, 15, 970, 385, 138), "arsenal": (1050, 90, 1345, 345, 78),
        "praca": (70, 395, 290, 730, 104), "fam1": (355, 420, 675, 720, 92), "fam2": (690, 380, 1030, 730, 112), "mercado": (1045, 430, 1345, 730, 96)}


def predios():
    S = la.tira_magenta(Image.open(IA / "sina_predios.png")); pecas = []
    for n, (x0, y0, x1, y1, alt) in PRED.items():
        c = la.ilhas(S.crop((x0, y0, x1, y1)), .03); c = c.crop(c.getbbox())
        q = la.contorno(la.nitidez(la.reduz(c, alt / c.height), 1.25, 1.05).crop((0, 0, 9999, 9999)).crop((0, 0, round(c.width * alt / c.height), alt)))
        pecas.append((n, q))
    pecas.sort(key=lambda p: -p[1].height); W, x, y, lh, pos = 460, 0, 0, 0, {}
    for n, im in pecas:
        if x + im.width > W:
            x, y, lh = 0, y + lh + 2, 0
        pos[n] = [x, y, im.width, im.height]; x += im.width + 2; lh = max(lh, im.height)
    at = Image.new("RGBA", (W, y + lh))
    for n, im in pecas:
        at.paste(im, tuple(pos[n][:2]))
    at.save(D / "cidade.webp", lossless=True, method=6)
    meta = json.loads((D / "meta.json").read_text()); meta["cidade"] = pos
    (D / "meta.json").write_text(json.dumps(meta)); (D / "arte.js").write_text("window.ARTE2=" + json.dumps(meta) + ";\n", encoding="utf-8")
    P = Image.new("RGBA", at.size, (50, 68, 70, 255)); P.paste(at, (0, 0), at); P.resize((at.width * 2, at.height * 2), 0).save(IA / "_p.png")


def verde(im):
    a = np.asarray(im.convert("RGB")).astype(np.float32); r, g, b = a[..., 0], a[..., 1], a[..., 2]; m = g - np.maximum(r, b)
    return Image.fromarray(np.dstack([r, np.where(m > 14, np.maximum(r, b) + 10, g), b, np.clip(1 - (m - 30) / 70, 0, 1) * 255]).clip(0, 255).astype(np.uint8), "RGBA")


def pessoa(cel, e, pe=85):
    c = la.ilhas(cel, .02); bb = c.getchannel('A').point(lambda v: 255 if v > 150 else 0).getbbox(); c = c.crop(bb); q = la.nitidez(la.reduz(c, e), 1.25, 1.05)
    a = np.asarray(q).copy(); a[a[..., 3] < 128] = 0; a[a[..., 3] >= 128, 3] = 255; q = Image.fromarray(a, "RGBA"); q = la.clareia(q, 1.12)
    xs = np.where((np.asarray(q)[int(q.height * .1):int(q.height * .5), :, 3] > 0).any(0))[0]; cx = (xs.min() + xs.max()) / 2
    return q, cx


def poe(T, col, fil, q, cx, pe=85):
    x = round(50 - cx); x = max(0, min(100 - q.width, x)) if q.width <= 100 else 0
    T.paste(q, (col * 100 + x, fil * 100 + pe - q.height), q)


def tom(im, dh, ks, kl):
    """Outra família: gira a cor da roupa, sem mexer na pele."""
    import colorsys
    a = np.asarray(im).copy()
    for y, x in zip(*np.where(a[..., 3] > 0)):
        r, g, b = (int(v) / 255 for v in a[y, x, :3]); h, l, s = colorsys.rgb_to_hls(r, g, b)
        if l < .1 or (5 < h * 360 < 34 and s > .28 and l > .38):
            continue
        a[y, x, :3] = [int(255 * v) for v in colorsys.hls_to_rgb((h + dh / 360) % 1, min(.95, l * kl), min(1, s * ks))]
    return Image.fromarray(a, "RGBA")


def povo():
    T = Image.new("RGBA", (600, 800)); F = verde(Image.open(IA / "sina_ferreiro.png")); cw = F.width / 6
    # ferreiro: o mesmo tamanho nas seis poses (a em pé tem 70 pixels)
    cs = [F.crop((max(0, round(c * cw) - 6), 0, min(F.width, round((c + 1) * cw) + 6), F.height)) for c in range(6)]
    e = 70 / (lambda b: b[3] - b[1])(la.ilhas(cs[0], .02).getbbox())
    f = [pessoa(c, e) for c in cs]
    for c, k in enumerate((0, 0, 1, 3, 4, 5)):
        poe(T, c, 0, *f[k])
    if (IA / "sina_vila2.png").exists():
        V = verde(Image.open(IA / "sina_vila2.png")); vw, vh = V.width / 6, V.height / 3
        for r in range(3):
            y0, y1 = ((18, 226), (232, 466), (494, 702))[r]   # a folha veio com sete colunas
            cs = [V.crop((x0, y0, x1, y1)) for x0, x1 in ((46, 170), (236, 360), (412, 545), (592, 705), (755, 885), (935, 1170), (1205, 1440))]
            e = (64, 68, 67)[r] / (lambda b: b[3] - b[1])(la.ilhas(cs[0], .02).getbbox()); f = [pessoa(c, e) for c in cs]
            for c, k in enumerate((0, 0, 2, 1 if r == 1 else 3, 5, 6)):
                poe(T, c, r + 1, *f[k])
    else:
        V = verde(Image.open(IA / "sina_vila.png")); vw, vh = V.width / 6, V.height / 4
        for r in (1, 2, 3):
            for c in range(6):
                q = pessoa(V.crop((round(c * vw) + 3, round(r * vh) + 3, round((c + 1) * vw) - 3, round((r + 1) * vh) - 3)), 100 / vh); poe(T, c, r, *q)
    # o povo das famílias: as mesmas pessoas em outras roupas
    for fil, (de, dh, ks, kl) in enumerate(((2, 70, .55, .9), (3, 150, .8, .95), (2, 190, .4, 1.12), (3, 60, .9, .9))):
        T.paste(tom(T.crop((0, de * 100, 600, de * 100 + 100)), dh, ks, kl), (0, (4 + fil) * 100))
    T.save(BARRO / "vila.png")
    P = Image.new("RGBA", T.size, (50, 68, 70, 255)); P.paste(T, (0, 0), T); P.resize((1200, 1600), 0).save(IA / "_p.png")


{"predios": predios, "povo": povo}[sys.argv[1]]()
