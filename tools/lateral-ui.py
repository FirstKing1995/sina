"""Kit da interface: molduras (sina_ui), ícones (sina_icones, sina_icones2), bichinhos e detalhes do cenário.
     python tools/lateral-ui.py molduras|icones|bichos|detalhes|tudo
   Grava em assets/ui (molduras e folha de ícones) e em assets/floresta (bichos e detalhes), com as posições em ui.js."""
import importlib.util, json, sys
from pathlib import Path
import numpy as np
from PIL import Image
R = Path(__file__).resolve().parent.parent
S0 = R.parent if R.name == "lateral" else R
LAT = R if (R / "assets").exists() else R / "lateral"
sp = importlib.util.spec_from_file_location("la", S0 / "tools" / "lateral-arte.py"); la = importlib.util.module_from_spec(sp); sp.loader.exec_module(la)
IA, UI, FL = la.IA, LAT / "assets" / "ui", LAT / "assets" / "floresta"
UI.mkdir(exist_ok=True)
ARQ = UI / "ui.json"
meta = json.loads(ARQ.read_text()) if ARQ.exists() else {}


def abre(n):
    return la.tira_magenta(Image.open(IA / n))


def duro(im, lim=128):
    a = np.asarray(im).copy(); a[a[..., 3] < lim] = 0; a[a[..., 3] >= lim, 3] = 255
    return Image.fromarray(a, "RGBA")


def caixa(S, x0, y0, x1, y1):
    c = S.crop((x0, y0, x1, y1)); bb = c.getchannel("A").point(lambda v: 255 if v > 140 else 0).getbbox()
    return c.crop(bb)


def menor(im, esc):
    return la.reduz(im, esc, False)


# nome: recorte na folha, escala
MOLD = {"painel": (30, 30, 495, 480, .5), "placa": (505, 35, 920, 152, .5), "placa_viva": (505, 162, 920, 278, .5), "vaga": (510, 288, 702, 474, .5), "vaga_viva": (722, 288, 912, 474, .5),
        "caixa": (955, 45, 1155, 245, .5), "anel": (960, 275, 1150, 462, .75), "anel_vivo": (1175, 275, 1365, 462, .75), "barra": (45, 505, 1050, 612, .4), "divisa": (45, 630, 1050, 715, .5), "retrato": (1085, 475, 1375, 740, .6)}


def molduras():
    S = abre("sina_ui.png")
    for n, (x0, y0, x1, y1, e) in MOLD.items():
        q = menor(caixa(S, x0, y0, x1, y1), e)
        if n in ("anel", "anel_vivo", "retrato"):     # redondos: quadrado certo
            L = max(q.size); t = Image.new("RGBA", (L, L)); t.paste(q, ((L - q.width) // 2, (L - q.height) // 2), q); q = t
        if n in ("retrato", "barra", "anel", "painel", "vaga", "vaga_viva", "caixa"):   # o miolo fica transparente (o fundo é do jogo)
            a = np.asarray(q).copy(); h, w = a.shape[:2]
            esc = (a[..., :3].astype(int).sum(2) < 100)
            yy, xx = np.mgrid[0:h, 0:w]
            if n in ("retrato", "anel"):
                dentro = np.hypot((xx - w / 2) / (w / 2), (yy - h / 2) / (h / 2)) < (.72 if n == "retrato" else .63)
            else:
                m = {"painel": 11, "vaga": 11, "vaga_viva": 9, "caixa": 11, "barra": 8}[n]; dentro = (xx > m) & (xx < w - m) & (yy > m * (.8 if n == "barra" else 1)) & (yy < h - m * (.8 if n == "barra" else 1))
            a[dentro & esc] = 0; q = Image.fromarray(a, "RGBA")
        q.save(UI / f"{n}.webp", lossless=True, method=6); print(n, q.size)


IC1 = ["golpe", "forte", "pula", "rola", "mochila", "mao", "tocha", "comer", "mapa", "engrenagem", "troca", "fogo", "casa", "bigorna", "livro", "taca", "braco", "bau", "escudo", "caveira", "fogueira", "lua", "sol", "pausa"]
IC2 = ["brasa", "vento", "espinhos", "folego", "tremor", "vida", "punho", "porrete", "lamina", "machado", "lanca", "arco", "pulmao", "perna", "cesto", "olho", "cadeado", "certo", "fome", "gota", "alvo", "alto", "sair", "familia"]


def icones():
    L = 64; nomes = IC1 + (IC2 if (IA / "sina_icones2.png").exists() else []); A = Image.new("RGBA", (12 * L, L * ((len(nomes) + 11) // 12)))
    for k, n in enumerate(nomes):
        f = "sina_icones.png" if k < 24 else "sina_icones2.png"
        if k in (0, 24):
            S = abre(f); cw, ch = S.width / 6, S.height / 4
        j = k % 24; c, r = j % 6, j // 6
        q = S.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)))
        bb = q.getchannel("A").point(lambda v: 255 if v > 120 else 0).getbbox(); q = q.crop(bb)
        q = menor(q, min(58 / q.width, 58 / q.height))
        A.paste(q, ((k % 12) * L + (L - q.width) // 2, (k // 12) * L + (L - q.height) // 2), q)
    A.save(UI / "icones.webp", lossless=True, method=6); meta["icones"] = {n: [k % 12, k // 12] for k, n in enumerate(nomes)}; meta["linhas"] = A.height // L


def sem_terra(q):
    """As peças enterradas vêm com um quadrado de terra: fica só o objeto (o que é mais claro que a terra)."""
    a = np.asarray(q).astype(int).copy(); h, w = a.shape[:2]; lum = a[..., :3].sum(2) / 3; sat = a[..., :3].max(2) - a[..., :3].min(2)
    yy, xx = np.mgrid[0:h, 0:w]; longe = np.hypot((xx - w / 2) / (w * .40), (yy - h * .52) / (h * .40)) > 1
    a[((lum < 50) & (sat < 40)) | longe, 3] = 0
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def grade(f, cols, lins, alts, pasta, nome, enterrada=None):
    """Folha de cols x lins: cada fileira com a altura final pedida; devolve posições."""
    S = abre(f); cw, ch = S.width / cols, S.height / lins; out, y = [], 0; pos = []
    for r in range(lins):
        qs = []
        for c in range(cols):
            q = S.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch)))
            q = sem_terra(q) if enterrada == r else q
            q = la.ilhas(q, .06); bb = q.getchannel("A").point(lambda v: 255 if v > 120 else 0).getbbox()
            qs.append(q.crop(bb) if bb else Image.new("RGBA", (2, 2)))
        al = alts[r]
        if isinstance(al, (int, float)):
            e = al / max(q.height for q in qs); qs = [duro(la.nitidez(la.reduz(q, e), 1.2, 1.05)) for q in qs]
        else:
            qs = [duro(la.nitidez(la.reduz(q, a / q.height), 1.2, 1.05)) for q, a in zip(qs, al)]
        out.append(qs)
    W = max(sum(q.width + 2 for q in qs) for qs in out); H = sum(max(q.height for q in qs) + 2 for qs in out); A = Image.new("RGBA", (W, H))
    for qs in out:
        x, hh = 0, max(q.height for q in qs); lin = []
        for q in qs:
            A.paste(q, (x, y), q); lin.append([x, y, q.width, q.height]); x += q.width + 2
        pos.append(lin); y += hh + 2
    A.save(pasta / f"{nome}.webp", lossless=True, method=6)
    return pos, A


def bichos():
    pos, A = grade("sina_bichos.png", 6, 5, [26, 22, 16, 22, 14], FL, "bichinhos")
    meta["bichos"] = dict(zip(["corvo", "coelho", "sapo", "morcego", "rato"], pos)); return A


DET = ["raiz1", "raiz2", "cipo1", "cipo2", "teia", "estala", "seixo", "seixos", "cranio", "costela", "cristal", "brasa", "capim1", "capim2", "flor1", "flor2", "junco", "seco", "cogu1", "cogu2", "pote", "estaca", "galho", "folhas"]


def detalhes():
    pos, A = grade("sina_detalhes.png", 6, 4, [[34, 44, 46, 44, 30, 34], [12, 18, 16, 24, 22, 14], [12, 20, 16, 16, 30, 16], [20, 12, 14, 22, 12, 8]], FL, "detalhes", 1)
    meta["det"] = {n: pos[i // 6][i % 6] for i, n in enumerate(DET)}; return A


q = sys.argv[1] if len(sys.argv) > 1 else "tudo"
if q in ("molduras", "tudo"): molduras()
if q in ("icones", "tudo"): icones()
for n, f, a in (("bichos", bichos, "sina_bichos.png"), ("detalhes", detalhes, "sina_detalhes.png")):
    if q in (n, "tudo") and (IA / a).exists():
        A = f(); P = Image.new("RGBA", A.size, (50, 68, 70, 255)); P.paste(A, (0, 0), A); P.resize((A.width * 3, A.height * 3), 0).save(IA / f"_p_{n}.png")
ARQ.write_text(json.dumps(meta)); (UI / "ui.js").write_text("window.UI_ARTE=" + json.dumps(meta) + ";\n", encoding="utf-8")
