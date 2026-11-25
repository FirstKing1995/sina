"""Folhas extras do herói (dormir com roupa) e da mulher, a partir dos quadros do herói de barro.
     python tools/folha-familia.py montar                -> folha_sono.png (6x3) e folha_mulher.png (6x5)
     python tools/folha-familia.py sono IMG              -> roupas/folhas e roupas/couro: dormir_N.png
     python tools/folha-familia.py mulher IMG NOME       -> lateral/assets/barro/NOME.png e gente.js
"""
import sys, json, importlib.util
from pathlib import Path
from PIL import Image, ImageEnhance
RAIZ = Path(__file__).resolve().parent.parent
sp = importlib.util.spec_from_file_location("fb", RAIZ / "tools" / "folha-barro.py")
fb = importlib.util.module_from_spec(sp); sp.loader.exec_module(fb)
BARRO, Q, CEL, VERDE = fb.BARRO, fb.Q, fb.CEL, fb.VERDE
SONO = [1, 2, 3, 4, 5, 7]
MULHER = [("parado", "south-east", [2, 3, 4, 6]), ("correr", "east", [0, 1, 2, 3, 4, 5, 6, 7]), ("golpe1", "east", [1, 2, 4, 6]), ("pulo", "east", [3, 6]),
          ("dor", "east", [1, 2]), ("colher", "east", [1, 2, 3, 7]), ("dormir", "east", [1, 2, 3, 4, 5]), ("morte", "east", [6])]


def pega(nome, d, i):
    return fb.limpa(Image.open(fb.pasta_anim(nome, d) / f"frame_{i:03d}.png"), nome)


def folha(qs, cols, lins, dest):
    W = Image.new("RGBA", (cols * CEL, lins * CEL), VERDE)
    for k, im in enumerate(qs):
        g = im.resize((CEL, CEL), Image.NEAREST)
        W.paste(g, ((k % cols) * CEL, (k // cols) * CEL), g)
    W.convert("RGB").save(dest)


def lista():
    return [(n, i, pega(n, d, i)) for n, d, ids in MULHER for i in ids]


def corta(arq, cols, lins, orig):
    W = Image.open(arq).convert("RGB"); cw, ch = W.width / cols, W.height / lins
    out = []
    for k, o in enumerate(orig):
        x, y = k % cols, k // cols
        q = fb.reduz(W.crop((round(x * cw), round(y * ch), round((x + 1) * cw), round((y + 1) * ch))))
        bo, bq = o.getbbox(), q.getbbox()
        if bo and bq:
            dx, dy = round(((bo[0] + bo[2]) - (bq[0] + bq[2])) / 2), bo[3] - bq[3]
            if abs(dx) <= 12 and abs(dy) <= 12:
                t = Image.new("RGBA", (Q, Q)); t.paste(q, (dx, dy), q); q = t
        out.append(q)
    return out


c = sys.argv[1]
if c == "montar":
    s = [pega("dormir", "east", i) for i in SONO]
    folha(s * 3, 6, 3, BARRO / "folha_sono.png")
    folha([q for _, _, q in lista()], 6, 5, BARRO / "folha_mulher.png")
elif c == "sono":
    s = [pega("dormir", "east", i) for i in SONO]
    # o Gemini devolveu 4 fileiras (240x180): a 2a é a roupa de folhas e a 3a a de couro; a ordem boa dos quadros é 0,2,4,3,5,5
    W = Image.open(sys.argv[2]).convert("RGB")
    for r, nome in ((1, "folhas"), (2, "couro")):
        for k, (i, c2) in enumerate(zip(SONO, [0, 2, 4, 3, 5, 5])):
            cel = Image.new("RGB", (240, 240), VERDE[:3]); cel.paste(W.crop((c2 * 240, r * 180, c2 * 240 + 240, r * 180 + 180)), (0, 60))
            q = fb.reduz(cel); bo, bq = s[k].getbbox(), q.getbbox()
            t = Image.new("RGBA", (Q, Q)); t.paste(q, (round((bo[0] + bo[2] - bq[0] - bq[2]) / 2), bo[3] - bq[3]), q)
            t.save(BARRO / "roupas" / nome / f"dormir_{i}.png")
else:
    L = lista(); qs = corta(sys.argv[2], 6, 5, [q for _, _, q in L]); nome = sys.argv[3]
    esc = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
    fs = []
    for q in qs:
        al = q.getchannel("A"); o = ImageEnhance.Sharpness(ImageEnhance.Brightness(q.convert("RGB")).enhance(1.2)).enhance(1.25).convert("RGBA"); o.putalpha(al); fs.append(o)
    W = Image.new("RGBA", (10 * Q, 3 * Q))
    for k, f in enumerate(fs):
        W.paste(f, ((k % 10) * Q, (k // 10) * Q), f)
    W.save(fb.SAIDA / f"{nome}.png")
    an, p = {}, 0
    for n, d, ids in MULHER:
        an[n] = [p, len(ids)]; p += len(ids)
    (fb.SAIDA / "gente.js").write_text("window.GENTE=" + json.dumps({"q": Q, "cols": 10, "anims": an}) + ";\n", encoding="utf-8")
    print(nome, len(fs))
