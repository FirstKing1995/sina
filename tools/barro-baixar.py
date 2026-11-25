"""Baixa o ZIP do personagem do PixelLab e monta uma prévia ampliada por animação.
   python tools/barro-baixar.py ID PASTA [animacao ...]"""
import io, json, sys, urllib.request, zipfile
from pathlib import Path
from PIL import Image
idp, pasta = sys.argv[1], Path(sys.argv[2])
dados = urllib.request.urlopen(f"https://api.pixellab.ai/mcp/characters/{idp}/download", timeout=120).read()
z = zipfile.ZipFile(io.BytesIO(dados))
for n in z.namelist():
    if ".." in n or n.startswith("/"): continue
    if n.endswith((".png", ".json")):
        alvo = pasta / n; alvo.parent.mkdir(parents=True, exist_ok=True); alvo.write_bytes(z.read(n))
quer = sys.argv[3:]
for anim in sorted(p for p in pasta.glob("*/animations/*/*") if p.is_dir()):
    nome = anim.parent.name
    fs = [Image.open(f).convert("RGBA") for f in sorted(anim.glob("frame_*.png"))]
    if not fs: continue
    print(nome, anim.name, len(fs), fs[0].size)
    if quer and not any(q in nome for q in quer): continue
    w, h = fs[0].size
    P = Image.new("RGBA", (w * len(fs), h), (38, 56, 60, 255))
    for i, f in enumerate(fs): P.paste(f, (i * w, 0), f)
    P.resize((P.width * 2, P.height * 2), Image.NEAREST).save(pasta / f"prev_{nome}_{anim.name}.png")
