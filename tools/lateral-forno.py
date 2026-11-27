"""O Forno (fim do Ato 2): mutantes, fundo e enfeites. Usa as rotinas de lateral-minas.py.
     C:\\Stack\\ia\\.venv\\Scripts\\python.exe tools/lateral-forno.py
Fontes em arte-ia/lateral: sina_m_fundido/queimado/sentinela/mutacao.png (4x2 do Gemini) e sina_f_forno.png."""
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
    for nome, alto, brilho in (("fundido", 40, 1.08), ("queimado", 66, 1.1), ("sentinela", 70, 1.08), ("mutacao", 120, 1.06)):
        if not (IA / f"sina_m_{nome}.png").exists():
            print("falta", nome); continue
        lv.folha_tiras(nome, lm.da_folha(nome, alto), M, brilho)
    im = Image.open(IA / "sina_f_forno.png").convert("RGB").resize((688, 384), Image.LANCZOS)
    ImageEnhance.Sharpness(im).enhance(1.3).save(DEST / "f_forno.webp", quality=86, method=6)
    # enfeites: os da floresta em ferro queimado
    at = Image.open(DEST / "p_floresta.webp").convert("RGBA")
    novo = la.tinge(at, ((96, 70, 62), .92, .8))
    for n in ("circulo", "fogo", "barro"):
        x, y, w, h = meta["props"][n]
        novo.paste(at.crop((x, y, x + w, y + h)), (x, y))
    novo.save(DEST / "p_forno.webp", lossless=True, method=6)
    (DEST / "meta.json").write_text(json.dumps(meta))
    (DEST / "arte.js").write_text("window.ARTE2=" + json.dumps(meta) + ";\n", encoding="utf-8")
    print({k: M[k] for k in ("fundido", "queimado", "sentinela", "mutacao") if k in M})


if __name__ == "__main__":
    main()
