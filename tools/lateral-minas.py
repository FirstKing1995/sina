"""Minas de Ferro (Ato 2): bichos, fundo e enfeites. Usa as rotinas de lateral-arte.py e lateral-variantes.py.
     C:\\Stack\\ia\\.venv\\Scripts\\python.exe tools/lateral-minas.py
Fontes em arte-ia/lateral: sina_m_rastejante/golem/capataz.png (4x2 quadros do Gemini, um bicho por folha),
sina_minas_bichos.png (linha 2 = minerador) e sina_f_minas.png (fundo).
Se a folha de um bicho ainda não existe, o bicho sai dos quadros parados da folha geral, com pose feita aqui.
"""
import importlib.util, json
from pathlib import Path
import numpy as np
from PIL import Image, ImageEnhance

AQUI = Path(__file__).parent
sp = importlib.util.spec_from_file_location("lv", AQUI / "lateral-variantes.py")
lv = importlib.util.module_from_spec(sp)
sp.loader.exec_module(lv)
la = lv.la
# roda de dentro de lateral/ (o código) com a arte em ../arte-ia
LAT = AQUI.parent
IA, DEST = LAT.parent / "arte-ia" / "lateral", LAT / "assets" / "floresta"
la.IA = lv.IA = IA
la.DEST = lv.DEST = DEST


def pecas(S, minimo=400):
    """Recortes de cada figura numa folha (por linha, da esquerda para a direita)."""
    al = np.asarray(S)[..., 3] > 120
    out = []
    for y0, y1 in lv.faixas(al.any(1), 40, 14):
        faixa = al[y0:y1]
        for x0, x1 in lv.faixas(faixa.any(0), 20, 6):
            q = S.crop((x0, y0, x1, y1))
            if (np.asarray(q)[..., 3] > 120).sum() >= minimo:
                out.append(q.crop(q.getbbox()))
    return out


def escala(qs, alto, ref=0):
    e = alto / qs[ref].height
    return [la.reduz(q, e) for q in qs]


def da_folha(nome, alto):
    p = IA / f"sina_m_{nome}.png"
    if not p.exists():
        return None
    S = la.tira_magenta(Image.open(p))
    cw, ch, qs = S.width / 4, S.height / 2, []
    for k in range(8):  # grade 4x2; a borda de cada célula some (o Gemini às vezes risca a grade)
        c, r = k % 4, k // 4
        q = S.crop((round(c * cw) + 8, round(r * ch) + 8, round((c + 1) * cw) - 8, round((r + 1) * ch) - 8))
        q = la.ilhas(q, .04)
        qs.append(q.crop(q.getbbox()))
    return escala(qs, alto)


def gira(q, ang, dx=0):
    return q.rotate(ang, resample=Image.NEAREST, expand=True)


def poses(base, alto, morto=None):
    """Oito quadros a partir de um só (enquanto a folha certa não vem)."""
    q = la.reduz(base, alto / base.height)
    w, h = q.size

    def aperta(sx, sy):
        return q.resize((max(1, round(w * sx)), max(1, round(h * sy))), Image.NEAREST)
    ferido = lv.escurece(gira(q, 8), (200, 80, 60), .25)
    dead = la.reduz(morto, alto * .45 / morto.height) if morto is not None else gira(aperta(1, .9), 90)
    return [q, gira(q, -3), aperta(1.02, .97), gira(q, 3), gira(aperta(.96, 1.06), 10), gira(aperta(1.08, .9), -14), ferido, dead]


def main():
    meta = json.loads((DEST / "meta.json").read_text())
    M = meta["monstros"]
    G = la.tira_magenta(Image.open(IA / "sina_minas_bichos.png"))
    geral = pecas(G)
    # linhas da folha geral: 0 rastejante/zumbis, 1 minerador, 2 golem, 3-4 capataz
    linhas, al = [], np.asarray(G)[..., 3] > 120
    for y0, y1 in lv.faixas(al.any(1), 40, 14):
        linhas.append(pecas(G.crop((0, y0, G.width, y1))))
    # rastejante
    qs = da_folha("rastejante", 30) or poses(linhas[0][0], 30)
    lv.folha_tiras("rastejante", qs, M, 1.2)
    # minerador: parado, três passos, prepara, bate, ferido (= passo curvado), morto
    m = escala(linhas[1], 68)
    mq = [m[0], m[1], m[2], m[1], m[4], m[5], lv.escurece(gira(m[0], 9), (200, 80, 60), .25), m[6]]
    lv.folha_tiras("minerador", mq, M, 1.25)
    # golem
    qs = da_folha("golem", 78) or poses(linhas[2][0], 78)
    lv.folha_tiras("golem", qs, M, 1.2)
    # capataz: o morto da folha geral é um monte de ferro e pedra
    qs = da_folha("capataz", 100) or poses(linhas[3][0], 100, linhas[4][-1])
    lv.folha_tiras("capataz", qs, M, 1.15)
    # fundo
    im = Image.open(IA / "sina_f_minas.png").convert("RGB").resize((688, 384), Image.LANCZOS)
    im = ImageEnhance.Brightness(ImageEnhance.Sharpness(im).enhance(1.3)).enhance(1.05)
    im.save(DEST / "f_minas.webp", quality=86, method=6)
    # enfeites: os da cripta, mais frios e cor de ferrugem
    at = Image.open(DEST / "p_floresta.webp").convert("RGBA")
    novo = la.tinge(at, ((124, 104, 98), .94, .84))
    for n in ("circulo", "fogo", "barro"):
        x, y, w, h = meta["props"][n]
        novo.paste(at.crop((x, y, x + w, y + h)), (x, y))
    novo.save(DEST / "p_minas.webp", lossless=True, method=6)
    (DEST / "meta.json").write_text(json.dumps(meta))
    (DEST / "arte.js").write_text("window.ARTE2=" + json.dumps(meta) + ";\n", encoding="utf-8")
    print({k: M[k] for k in ("rastejante", "minerador", "golem", "capataz")})


if __name__ == "__main__":
    main()
