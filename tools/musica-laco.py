"""Acha, em cada música, o melhor ponto de volta (onde o fim soa igual ao começo do laço) e grava um mp3 leve.
     python tools/musica-laco.py PASTA_ENTRADA PASTA_SAIDA   (espera floresta, batalha, chefao e calma .mp3)
   Escreve também lacos.json: [início do laço, fim do laço] em segundos."""
import json, subprocess, sys
from pathlib import Path
import numpy as np

ENT, SAI = Path(sys.argv[1]), Path(sys.argv[2])
SAI.mkdir(parents=True, exist_ok=True)
R = 22050
H = 512


def le(p):
    b = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ac", "1", "-ar", str(R), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(b, np.float32)


def traco(x):
    n = 2048
    w = np.hanning(n)
    q = (len(x) - n) // H
    S = np.abs(np.fft.rfft(np.stack([x[i * H:i * H + n] * w for i in range(q)]), axis=1))
    f = np.fft.rfftfreq(n, 1 / R)
    bordas = np.geomspace(60, 9000, 49)
    M = np.stack([S[:, (f >= a) & (f < b)].sum(1) for a, b in zip(bordas[:-1], bordas[1:])], 1)
    L = np.log1p(M)
    L = L - L.mean(0)
    return L / (np.linalg.norm(L, axis=1, keepdims=True) + 1e-6)


out = {}
for nome in ("floresta", "batalha", "chefao", "calma"):
    x = le(ENT / f"{nome}.mp3")
    dur = len(x) / R
    c = np.concatenate([[0], np.cumsum(x.astype(np.float64) ** 2)])
    m2 = R // 4
    idx = np.arange(len(x))
    env = np.sqrt(np.maximum(0, (c[np.minimum(len(x), idx + m2)] - c[np.maximum(0, idx - m2)]) / (2 * m2)))
    tip = np.median(env)
    ini = next(i for i in range(0, len(x), 200) if abs(x[i]) > 0.02) / R
    # até onde a música ainda está cheia (antes de sumir no fim)
    cheio = max(i for i in range(0, len(x), R // 10) if env[i] > tip * 0.75) / R
    L = traco(x)
    fr = R / H
    jan = int(4 * fr)
    ult = int((cheio - 2.0) * fr) - jan
    A = range(int((ini + 0.2) * fr), int(min(36, dur * 0.22) * fr), 2)
    B = range(int((dur * 0.72) * fr), ult, 2)
    melhor = (-1, 0, 0)
    passos = np.arange(0, jan, 6)
    B = np.array(list(B))
    blocoB = L[(B[:, None] + passos[None, :])]            # (nB, p, 48)
    blocoB = blocoB.reshape(len(B), -1)
    for a in A:
        v = blocoB @ L[a + passos].reshape(-1) / len(passos) + 0.3 * (B - a) / (ult - int(ini * fr) + 1)
        k = int(np.argmax(v))
        if v[k] > melhor[0]:
            melhor = (float(v[k]), a, int(B[k]))
    s, a, b = melhor
    # acerto fino pela forma da onda
    ta, tb = a * H, b * H
    N = R * 2
    ref = x[ta:ta + N]
    lag = range(-1400, 1401)
    cor = [float(np.dot(ref, x[tb + l:tb + l + N])) for l in lag]
    tb += lag[int(np.argmax(cor))]
    q = max(cor) / (np.linalg.norm(ref) * np.linalg.norm(x[tb:tb + N]) + 1e-6)
    corte = max(0.0, ini - 0.02)
    li, lf = ta / R - corte, tb / R - corte
    fim = min(dur, tb / R + 2.2)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{corte:.3f}", "-to", f"{fim:.3f}", "-i", str(ENT / f"{nome}.mp3"), "-map", "0:a", "-map_metadata", "-1", "-af", "loudnorm=I=-17:TP=-1.5:LRA=11", "-ar", "44100", "-b:a", "112k", str(SAI / f"sina-{nome}.mp3")], check=True)
    out[nome] = [round(li, 3), round(lf, 3)]
    print(nome, "duração", round(dur, 1), "cheia até", round(cheio, 1), "laço", out[nome], "semelhança", round(s, 3), "onda", round(q, 3), (SAI / f"sina-{nome}.mp3").stat().st_size // 1024, "KB")
(SAI / "lacos.json").write_text(json.dumps(out))
