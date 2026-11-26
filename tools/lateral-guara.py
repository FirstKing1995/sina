"""O lobo-guará companheiro (Retro Diffusion): pose base + 8 quadros de trote.
     C:\\Stack\\ia\\.venv\\Scripts\\python.exe tools/lateral-guara.py
Fontes em arte-ia/lateral/retro: guara_base.png (128 px) e guara_andar.png (grade 4x2, 4x maior).
Grava m_guara.webp (parado, 3 passos, prepara, morde, ferido, deitado) e m_guara_anda.webp (8 passos)."""
import importlib.util, json
from pathlib import Path
import numpy as np
from PIL import Image

AQUI = Path(__file__).parent
sp = importlib.util.spec_from_file_location("lv", AQUI / "lateral-variantes.py")
lv = importlib.util.module_from_spec(sp)
sp.loader.exec_module(lv)
la = lv.la
LAT = AQUI.parent
IA, DEST = LAT.parent / "arte-ia" / "lateral" / "retro", LAT / "assets" / "floresta"
ALTO = 58  # altura do bicho adulto; o jogo encolhe o filhote


def limpa(im):
    """Tira os riscos azul-claros que o animador deixou e os pedaços soltos."""
    a = np.asarray(im.convert("RGBA")).copy()
    r, g, b = [a[..., i].astype(int) for i in range(3)]
    a[(b > r + 25) & (b > 120)] = 0
    return la.ilhas(Image.fromarray(a, "RGBA"), .08)


def corta(im):
    return im.crop(im.getbbox())


def tira(nome, qs, meta, chave=None):
    """Alinha pelos pés, centro no meio do corpo."""
    w = max(q.width for q in qs) + 4
    h = max(q.height for q in qs) + 2
    T = Image.new("RGBA", (w * len(qs), h))
    for i, q in enumerate(qs):
        T.paste(q, (i * w + (w - q.width) // 2, h - 1 - q.height), q)
    la.contorno(T).save(DEST / f"m_{nome}.webp", lossless=True, method=6)
    return {"w": w, "h": h, "n": len(qs)}


def gira(q, ang):
    return corta(q.rotate(ang, resample=Image.NEAREST, expand=True))


def main():
    meta = json.loads((DEST / "meta.json").read_text())
    base = corta(limpa(Image.open(IA / "guara_base.png")))
    e = ALTO / base.height
    b = la.reduz(base, e)
    S = Image.open(IA / "guara_andar.png").convert("RGBA")
    cw, ch = S.width // 4, S.height // 2
    passos = []
    for k in range(8):
        c, r = k % 4, k // 4
        q = corta(limpa(S.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))))
        passos.append(la.reduz(q, ALTO / q.height))
    w, h = b.size

    def aperta(sx, sy):
        return b.resize((max(1, round(w * sx)), max(1, round(h * sy))), Image.NEAREST)
    prep = gira(aperta(1.04, 0.9), 6)       # encolhe para trás
    morde = gira(aperta(1.12, 0.92), -10)   # estica para a frente
    ferido = lv.escurece(gira(b, 9), (200, 80, 60), .25)
    deitado = aperta(1.1, 0.55)
    M = meta["monstros"]
    M["guara"] = tira("guara", [b, passos[0], passos[2], passos[4], prep, morde, ferido, deitado], meta)
    M["guara"]["anda"] = dict(tira("guara_anda", passos, meta), passo=8)
    (DEST / "meta.json").write_text(json.dumps(meta))
    (DEST / "arte.js").write_text("window.ARTE2=" + json.dumps(meta) + ";\n", encoding="utf-8")
    print(M["guara"])


if __name__ == "__main__":
    main()
