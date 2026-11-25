"""Folhas para o Gemini vestir os ciclos de andar do PixelLab: goblin (8 quadros x 4) e lobo (5 quadros).
     python tools/folha-andar.py"""
from pathlib import Path
from PIL import Image
R = Path(__file__).resolve().parent.parent
S0 = R.parent if R.name == "lateral" else R
A = S0 / "arte-pixel" / "anda"
V = (0, 255, 0, 255)
def q(n, i):
    im = Image.open(A / n / f"{i}.png").convert("RGBA"); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            px[x, y] = (*px[x, y][:3], 255) if px[x, y][3] >= 128 else (0, 0, 0, 0)
    return im
W = Image.new("RGBA", (8 * 160, 4 * 180), V)
for r in range(4):
    for c in range(8):
        g = q("goblin", c + 1).crop((36, 46, 96, 114)); g = g.resize((g.width * 5 // 2, g.height * 5 // 2), 0)
        W.paste(g, (c * 160 + (160 - g.width) // 2, r * 180 + 180 - g.height - 4), g)
W.convert("RGB").save(A / "folha_goblins.png")
W = Image.new("RGBA", (5 * 256, 2 * 240), V)
for r in range(2):
    for c in range(5):
        g = q("lobo", c + 1).crop((16, 52, 120, 116)).resize((208, 128), 0)
        W.paste(g, (c * 256 + 24, r * 240 + 92), g)
W.convert("RGB").save(A / "folha_lobo.png")
