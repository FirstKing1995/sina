"""Ruínas do Oleiro (Ato 2): bichos, fundo e enfeites. Usa as rotinas de lateral-minas.py.
     C:\\Stack\\ia\\.venv\\Scripts\\python.exe tools/lateral-ruinas.py
Fontes em arte-ia/lateral: sina_m_boneco/guardiao/pote/molde.png (4x2 do Gemini) e sina_f_ruinas.png."""
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
    for nome, alto, brilho in (("boneco", 66, 1.1), ("guardiao", 70, 1.1), ("pote", 30, 1.12), ("molde", 116, 1.08)):
        qs = lm.da_folha(nome, alto)
        if nome in ("boneco", "pote"):  # o barro cru veio vivo demais: puxa para a luz dos outros bichos
            out = []
            for q in qs:
                al = q.getchannel("A"); r = ImageEnhance.Brightness(ImageEnhance.Color(q.convert("RGB")).enhance(0.62)).enhance(0.8).convert("RGBA"); r.putalpha(al); out.append(r)
            qs = out
        lv.folha_tiras(nome, qs, M, brilho)
    im = Image.open(IA / "sina_f_ruinas.png").convert("RGB").resize((688, 384), Image.LANCZOS)
    ImageEnhance.Sharpness(im).enhance(1.3).save(DEST / "f_ruinas.webp", quality=86, method=6)
    # enfeites: os da floresta em terracota seca
    at = Image.open(DEST / "p_floresta.webp").convert("RGBA")
    novo = la.tinge(at, ((168, 108, 76), .9, .88))
    for n in ("circulo", "fogo", "barro"):
        x, y, w, h = meta["props"][n]
        novo.paste(at.crop((x, y, x + w, y + h)), (x, y))
    novo.save(DEST / "p_ruinas.webp", lossless=True, method=6)
    (DEST / "meta.json").write_text(json.dumps(meta))
    (DEST / "arte.js").write_text("window.ARTE2=" + json.dumps(meta) + ";\n", encoding="utf-8")
    print({k: M[k] for k in ("boneco", "guardiao", "pote", "molde")})


if __name__ == "__main__":
    main()
