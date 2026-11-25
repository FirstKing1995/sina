"""Herói de perfil do SINA 2D: junta as poses do PixelLab em duas folhas (6x5, fundo verde) para as IAs vestirem,
   e recorta o que volta, gerando as tiras do jogo.
     python tools/folha-barro.py montar                    -> arte-pixel/barro/folha_1.png e folha_2.png
     python tools/folha-barro.py recortar ROUPA A.png B.png -> arte-pixel/barro/roupas/ROUPA/*.png
     python tools/folha-barro.py tiras                      -> lateral/assets/barro/*.png e barro.js
"""
import json, sys
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
BARRO = RAIZ / "arte-pixel" / "barro"
ZIP = BARRO / "zip"
SAIDA = RAIZ / "lateral" / "assets" / "barro"
Q = 100      # lado do quadro
COL, LIN, CEL = 6, 5, 200   # folha para a IA
VERDE = (0, 255, 0, 255)

# movimento -> quadros escolhidos do PixelLab (na ordem)
POSES = [
    ("parado", "south-east", [2, 3, 4, 6]),
    ("correr", "east", [0, 1, 2, 3, 4, 5, 6, 7]),
    ("golpe1", "east", [1, 2, 4, 6]),
    ("golpe2", "east", [1, 3, 5]),
    ("golpe3", "east", [1, 2, 3, 5]),
    ("pulo", "east", [1, 2, 3, 4, 6, 7]),
    ("rola", "east", [1, 2, 3, 4, 5, 7]),
    ("magia", "east", [2, 4, 5, 7]),
    ("dor", "east", [1, 2, 3]),
    ("morte", "east", [0, 1, 3, 5, 6, 7]),
    ("colher", "east", [1, 2, 3, 7]),
    ("cima", "east", [1, 3, 6]),
    ("baixo", "east", [0]),
    ("arco", "east", [1, 3, 5, 7]),
]
# entrou depois das folhas 6x5: a roupa destes quadros vem de tools/folha-familia.py sono
DEPOIS = [("dormir", "east", [1, 2, 3, 4, 5, 7])]
SO_BARRO = [("nascer", "east", [1, 2, 3, 5, 6, 7])]


def pasta_anim(nome, direcao):
    for p in ZIP.glob(f"*/animations/{nome}*/{direcao}"):
        return p
    raise SystemExit("falta a animação " + nome)


def limpa(im, nome):
    """Tira do quadro os efeitos que a IA desenhou por conta (riscos vermelhos do golpe e da dor): o jogo tem os dele."""
    im = im.convert("RGBA")
    px = im.load()
    W, H = im.size
    for y in range(H):
        for x in range(W):
            if px[x, y][3] < 40:
                px[x, y] = (0, 0, 0, 0)
    if nome in ("golpe2", "golpe3", "dor"):
        brasa = {(x, y) for y in range(H) for x in range(W)
                 if px[x, y][3] and px[x, y][0] > 190 and px[x, y][2] < 100 and px[x, y][0] - px[x, y][2] > 130}
        while brasa:
            pilha = [brasa.pop()]
            ilha = []
            while pilha:
                x, y = pilha.pop()
                ilha.append((x, y))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        p = (x + dx, y + dy)
                        if p in brasa:
                            brasa.remove(p)
                            pilha.append(p)
            if len(ilha) > 14:
                for p in ilha:
                    px[p] = (0, 0, 0, 0)
                for x, y in ilha:   # o que passava por cima do corpo vira pele na sombra
                    cheio = lambda dx, dy: any(0 <= x + dx * k < W and 0 <= y + dy * k < H and px[x + dx * k, y + dy * k][3] for k in range(1, 5))
                    if (cheio(0, -1) and cheio(0, 1)) and (cheio(1, 0) and cheio(-1, 0)):
                        px[x, y] = (84, 44, 30, 255)
    # ilhas soltas com menos de 14 pontos são fagulhas
    vis, w, h = set(), im.width, im.height
    for y0 in range(h):
        for x0 in range(w):
            if (x0, y0) in vis or px[x0, y0][3] == 0:
                continue
            pilha, ilha = [(x0, y0)], []
            vis.add((x0, y0))
            while pilha:
                x, y = pilha.pop()
                ilha.append((x, y))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        p = (x + dx, y + dy)
                        if 0 <= p[0] < w and 0 <= p[1] < h and p not in vis and px[p][3]:
                            vis.add(p)
                            pilha.append(p)
            if len(ilha) < 14:
                for p in ilha:
                    px[p] = (0, 0, 0, 0)
    return im


def quadros():
    for nome, d, ids in POSES:
        p = pasta_anim(nome, d)
        for i in ids:
            yield nome, i, limpa(Image.open(p / f"frame_{i:03d}.png"), nome)


def montar():
    todos = list(quadros())
    por = COL * LIN
    print(len(todos), "quadros")
    for f in range((len(todos) + por - 1) // por):
        W = Image.new("RGBA", (COL * CEL, LIN * CEL), VERDE)
        for k, (_, _, im) in enumerate(todos[f * por:(f + 1) * por]):
            W.paste(im.resize((CEL, CEL), Image.NEAREST), ((k % COL) * CEL, (k // COL) * CEL), im.resize((CEL, CEL), Image.NEAREST))
        W.convert("RGB").save(BARRO / f"folha_{f + 1}.png")


def verde(r, g, b):
    return g > 110 and g > r * 1.35 and g > b * 1.35


def reduz(cel):
    """Reduz a célula para 100x100 escolhendo, em cada ponto, a cor mais comum: mantém o pixel nítido."""
    cel = cel.convert("RGB")
    w, h = cel.size
    px = cel.load()
    out = Image.new("RGBA", (Q, Q))
    o = out.load()
    for y in range(Q):
        for x in range(Q):
            x0, x1 = x * w / Q, (x + 1) * w / Q
            y0, y1 = y * h / Q, (y + 1) * h / Q
            votos, fundo, tot = {}, 0, 0
            for yy in range(int(y0), max(int(y0) + 1, int(y1 + 0.5))):
                for xx in range(int(x0), max(int(x0) + 1, int(x1 + 0.5))):
                    if xx >= w or yy >= h:
                        continue
                    r, g, b = px[xx, yy]
                    tot += 1
                    if verde(r, g, b):
                        fundo += 1
                    else:
                        k = (r >> 3, g >> 3, b >> 3)
                        votos.setdefault(k, []).append((r, g, b))
            if tot and fundo * 2 < tot and votos:
                l = max(votos.values(), key=len)
                r, g, b = (sum(c[i] for c in l) // len(l) for i in range(3))
                if g > r * 1.15 and g > b * 1.6 and g > 90:   # franja verde
                    g = int(max(r, b) * 1.08)
                o[x, y] = (r, g, b, 255)
    # a borda que ficou esverdeada vira contorno
    for y in range(Q):
        for x in range(Q):
            r, g, b, a = o[x, y]
            if not a:
                continue
            borda = any(not (0 <= x + dx < Q and 0 <= y + dy < Q) or o[x + dx, y + dy][3] == 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if borda and g > r * 1.02 and g > b * 1.08:
                o[x, y] = (14, 14, 12, 255)
    return out


def recortar(roupa, arqs):
    nomes = [(n, i) for n, d, ids in POSES for i in ids]
    dest = BARRO / "roupas" / roupa
    dest.mkdir(parents=True, exist_ok=True)
    orig = list(quadros())
    k = 0
    for a in arqs:
        W = Image.open(a).convert("RGB")
        cw, ch = W.width / COL, W.height / LIN
        for c in range(COL * LIN):
            if k >= len(nomes):
                break
            x, y = c % COL, c // COL
            q = reduz(W.crop((round(x * cw), round(y * ch), round((x + 1) * cw), round((y + 1) * ch))))
            # acerta o pé com o quadro original, para o boneco não tremer
            bo, bq = orig[k][2].getbbox(), q.getbbox()
            if bo and bq:
                dx = round(((bo[0] + bo[2]) - (bq[0] + bq[2])) / 2)
                dy = bo[3] - bq[3]
                if abs(dx) <= 12 and abs(dy) <= 12:
                    t = Image.new("RGBA", (Q, Q))
                    t.paste(q, (dx, dy), q)
                    q = t
            q.save(dest / f"{nomes[k][0]}_{nomes[k][1]}.png")
            k += 1
    print(roupa, k, "quadros")


def tiras():
    SAIDA.mkdir(parents=True, exist_ok=True)
    meta = {"q": Q, "anims": {}, "roupas": ["barro"]}
    roupas = {"barro": None}
    if (BARRO / "roupas").exists():
        for p in sorted((BARRO / "roupas").iterdir()):
            if p.is_dir():
                roupas[p.name] = p
                meta["roupas"].append(p.name)
    blocos = [(n, d, ids) for n, d, ids in POSES + DEPOIS]
    total = sum(len(i) for _, _, i in blocos)
    pos = 0
    for n, d, ids in blocos:
        meta["anims"][n] = [pos, len(ids)]
        pos += len(ids)
    meta["anims"]["nascer"] = [pos, len(SO_BARRO[0][2])]
    nasc = [limpa(Image.open(pasta_anim("nascer", "east") / f"frame_{i:03d}.png"), "nascer") for i in SO_BARRO[0][2]]
    orig = [q for _, _, q in quadros()] + [limpa(Image.open(pasta_anim(n, d) / f"frame_{i:03d}.png"), n) for n, d, ids in DEPOIS for i in ids]
    cols = 10
    for r, p in roupas.items():
        fs = orig if p is None else [Image.open(p / f"{n}_{i}.png").convert("RGBA") for n, d, ids in blocos for i in ids]
        if p is not None:   # as roupas vieram escuras: clareia um tanto
            from PIL import ImageEnhance
            for i, f in enumerate(fs):
                al = f.getchannel("A")
                o = ImageEnhance.Sharpness(ImageEnhance.Brightness(f.convert("RGB")).enhance({"couro": 1.42, "pele": 1.28, "osso": 1.2, "prata": 1.0}.get(r, 1.18))).enhance(1.3).convert("RGBA")
                o.putalpha(al)
                fs[i] = o
        fs = fs + nasc
        W = Image.new("RGBA", (cols * Q, ((len(fs) + cols - 1) // cols) * Q))
        for k, f in enumerate(fs):
            W.paste(f, ((k % cols) * Q, (k // cols) * Q), f)
        W.save(SAIDA / f"{r}.png")
    meta["cols"] = cols
    (SAIDA / "barro.js").write_text("window.BARRO=" + json.dumps(meta) + ";\n", encoding="utf-8")
    print(total, "quadros por roupa;", meta["roupas"])


if __name__ == "__main__":
    if sys.argv[1] == "montar":
        montar()
    elif sys.argv[1] == "recortar":
        recortar(sys.argv[2], sys.argv[3:])
    else:
        tiras()
