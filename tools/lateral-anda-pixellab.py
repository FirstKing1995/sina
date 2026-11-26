"""Monta m_<bicho>_anda.webp a partir dos quadros que o PixelLab animou (f1..f8.png; f0 é o quadro de entrada).
     C:\\Stack\\ia\\.venv\\Scripts\\python.exe tools/lateral-anda-pixellab.py zumbi zumbi_inchado
Pasta de cada um: arte-ia/lateral/pixellab/<bicho>_anda/."""
import json, sys
from pathlib import Path
from PIL import Image

LAT = Path(__file__).parent.parent
IA, D = LAT.parent / "arte-ia" / "lateral" / "pixellab", LAT / "assets" / "floresta"
PASSO = {"zumbi": 9, "zumbi_inchado": 10, "minerador": 9}

meta = json.loads((D / "meta.json").read_text())
for n in sys.argv[1:]:
    fs = sorted((IA / f"{n}_anda").glob("f*.png"), key=lambda p: int(p.stem[1:]))[1:]
    qs = [Image.open(p).convert("RGBA") for p in fs]
    x0 = min(q.getbbox()[0] for q in qs); y0 = min(q.getbbox()[1] for q in qs)
    x1 = max(q.getbbox()[2] for q in qs); y1 = max(q.getbbox()[3] for q in qs)
    w, h = x1 - x0 + 2, y1 - y0 + 1
    T = Image.new("RGBA", (w * len(qs), h))
    for i, q in enumerate(qs):
        T.paste(q.crop((x0 - 1, y0, x1 + 1, y1 + 1)), (i * w, 0))
    T.save(D / f"m_{n}_anda.webp", lossless=True, method=6)
    meta["monstros"][n]["anda"] = {"w": w, "h": h, "n": len(qs), "passo": PASSO.get(n, 9)}
    print(n, meta["monstros"][n]["anda"])
(D / "meta.json").write_text(json.dumps(meta))
(D / "arte.js").write_text("window.ARTE2=" + json.dumps(meta) + ";\n", encoding="utf-8")
