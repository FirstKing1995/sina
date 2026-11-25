"""Moradores da vila: folha 6x4 (uma pessoa por fileira, seis poses do herói) para o Gemini vestir, e o recorte.
     python tools/folha-vila.py montar | recortar IMG"""
import importlib.util, json, sys
from pathlib import Path
from PIL import Image, ImageEnhance
R = Path(__file__).resolve().parent.parent
S0 = R.parent if R.name == "lateral" else R
sp = importlib.util.spec_from_file_location("fb", S0 / "tools" / "folha-barro.py"); fb = importlib.util.module_from_spec(sp); sp.loader.exec_module(fb)
P = [("parado", "south-east", 2), ("parado", "south-east", 4), ("correr", "east", 1), ("correr", "east", 3), ("colher", "east", 1), ("golpe1", "east", 4)]
NOMES = ["ferreiro", "curandeira", "cacador", "vigia"]
_m = Image.open(fb.SAIDA / "mulher.png").convert("RGBA")   # parte da humana já vestida
o = [_m.crop((k % 10 * 100, k // 10 * 100, k % 10 * 100 + 100, k // 10 * 100 + 100)) for k in (0, 2, 5, 7, 20, 14)]
if sys.argv[1] == "montar":
    W = Image.new("RGBA", (1200, 800), fb.VERDE)
    for r in range(4):
        for c, q in enumerate(o):
            g = q.resize((200, 200), 0); W.paste(g, (c * 200, r * 200), g)
    W.convert("RGB").save(fb.BARRO / "folha_vila.png")
else:
    W = Image.open(sys.argv[2]).convert("RGB"); cw, ch = W.width / 6, W.height / 4
    T = Image.new("RGBA", (600, 400))
    for r in range(4):
        for c in range(6):
            q = fb.reduz(W.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch))))
            bo, bq = o[c].getbbox(), q.getbbox()
            t = Image.new("RGBA", (100, 100)); dx = round((bo[0] + bo[2] - bq[0] - bq[2]) / 2) if abs(bo[0] + bo[2] - bq[0] - bq[2]) < 24 else 0
            t.paste(q, (dx, bo[3] - bq[3]), q)
            al = t.getchannel("A"); k = ImageEnhance.Sharpness(ImageEnhance.Brightness(t.convert("RGB")).enhance(1.2)).enhance(1.25).convert("RGBA"); k.putalpha(al)
            T.paste(k, (c * 100, r * 100), k)
    T.save(fb.SAIDA / "vila.png"); T.resize((1200, 800), 0).save(fb.BARRO / "prev_vila.png")
