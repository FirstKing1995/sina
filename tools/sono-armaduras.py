"""Quadros de dormir da pele, do osso e da prata (folha sina_sono2, linhas em alturas livres). Roda depois de folha-barro.py recortar."""
import importlib.util
from pathlib import Path
from PIL import Image
R = Path(__file__).resolve().parent.parent
sp = importlib.util.spec_from_file_location("fb", R / "tools" / "folha-barro.py"); fb = importlib.util.module_from_spec(sp); sp.loader.exec_module(fb)
W = Image.open(R / "arte-ia" / "lateral" / "sina_sono2.png").convert("RGB")
S = [1, 2, 3, 4, 5, 7]
orig = [fb.limpa(Image.open(fb.pasta_anim("dormir", "east") / f"frame_{i:03d}.png"), "dormir") for i in S]
Y = {"pele": (0, 132), "osso": (140, 292), "prata": (540, 696)}
for nome, (y0, y1) in Y.items():
    for k, i in enumerate(S):
        cel = Image.new("RGB", (240, 240), fb.VERDE[:3]); cel.paste(W.crop((k * 240, y0, k * 240 + 240, y1)), (0, 240 - (y1 - y0)))
        q = fb.reduz(cel); bo, bq = orig[k].getbbox(), q.getbbox()
        if nome == "osso" and k >= 3:   # deitado, a IA tirou a armadura: usa o ajoelhar e o deitar da queda
            q = Image.open(fb.BARRO / "roupas" / nome / ("morte_5.png" if k == 3 else "morte_7.png")).convert("RGBA"); bq = q.getbbox()
        t = Image.new("RGBA", (100, 100)); t.paste(q, (round((bo[0] + bo[2] - bq[0] - bq[2]) / 2), bo[3] - bq[3]), q)
        t.save(fb.BARRO / "roupas" / nome / f"dormir_{i}.png")
# corrida 0 da pele veio sem roupa: usa o quadro oposto
p = fb.BARRO / "roupas" / "pele"
Image.open(p / "correr_4.png").save(p / "correr_0.png")
