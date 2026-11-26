"""Mangue das Marés (Ato 2): bichos, fundo e enfeites. Usa as rotinas de lateral-minas.py.
     C:\\Stack\\ia\\.venv\\Scripts\\python.exe tools/lateral-mangue.py
Fontes em arte-ia/lateral: sina_m_caranguejo/afogado/caboclo.png (4x2 do Gemini) e sina_f_mangue.png."""
import importlib.util, json
from pathlib import Path
from PIL import Image, ImageEnhance

AQUI = Path(__file__).parent
sp = importlib.util.spec_from_file_location("lm", AQUI / "lateral-minas.py")
lm = importlib.util.module_from_spec(sp)
sp.loader.exec_module(lm)
la, lv, IA, DEST = lm.la, lm.lv, lm.IA, lm.DEST


def main():
    meta = json.loads((DEST / "meta.json").read_text())
    M = meta["monstros"]
    # o caranguejo veio fora da grade: corta por figura
    qs = lm.pecas(la.tira_magenta(Image.open(IA / "sina_m_caranguejo.png")), 1500)[:8]
    lv.folha_tiras("caranguejo", lm.escala(qs, 30), M, 1.15)
    for nome, alto, brilho in (("afogado", 66, 1.1), ("caboclo", 112, 1.1)):
        qs = lm.da_folha(nome, alto)
        lv.folha_tiras(nome, qs, M, brilho)
    im = Image.open(IA / "sina_f_mangue.png").convert("RGB").resize((688, 384), Image.LANCZOS)
    im = ImageEnhance.Sharpness(im).enhance(1.3)
    im.save(DEST / "f_mangue.webp", quality=86, method=6)
    # enfeites: os da floresta em verde-azulado de água salobra
    at = Image.open(DEST / "p_floresta.webp").convert("RGBA")
    novo = la.tinge(at, ((84, 118, 112), .62, .9))
    for n in ("circulo", "fogo", "barro"):
        x, y, w, h = meta["props"][n]
        novo.paste(at.crop((x, y, x + w, y + h)), (x, y))
    novo.save(DEST / "p_mangue.webp", lossless=True, method=6)
    (DEST / "meta.json").write_text(json.dumps(meta))
    (DEST / "arte.js").write_text("window.ARTE2=" + json.dumps(meta) + ";\n", encoding="utf-8")
    print({k: M[k] for k in ("caranguejo", "afogado", "caboclo")})


if __name__ == "__main__":
    main()
