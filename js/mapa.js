/* SINA · Aruanã: o mundo aberto. Seis regiões geradas com semente fixa, clareiras e estradas abertas por cima, e a cripta
   embaixo de tudo. Funciona no navegador e no Node (test/parte1-mapa-test.js confere se tudo pode ser alcançado). */
(function (raiz) {
  'use strict';
  const CRIPTA_Y = 440, W = 560, H = CRIPTA_Y + 60, T = 32;
  const MATA = 0, MUSGO = 1, TERRA = 2, PISO = 3, PAREDE = 4, AGUA = 5;
  const cr = (x, y) => [x, y - 190 + CRIPTA_Y]; // a cripta foi desenhada a partir de y = 190

  // regiões: centro, quão fechado é o mato (quanto menor, mais fechado), perigo e luz ambiente
  const REGIOES = [
    { id: 'campos', nome: 'Campos da Aurora', x: 270, y: 350, fecha: 0.67, perigo: 1, luz: 'rgba(10,22,34,0.52)' },
    { id: 'mata', nome: 'Mata Funda', x: 250, y: 150, fecha: 0.55, perigo: 2, luz: 'rgba(6,20,28,0.68)' },
    { id: 'mangue', nome: 'Mangue Sombrio', x: 80, y: 300, fecha: 0.58, perigo: 3, luz: 'rgba(12,22,14,0.66)' },
    { id: 'serra', nome: 'Serra do Ferro', x: 80, y: 90, fecha: 0.56, perigo: 3, luz: 'rgba(14,20,34,0.6)' },
    { id: 'sertao', nome: 'Sertão das Cinzas', x: 460, y: 300, fecha: 0.69, perigo: 4, luz: 'rgba(30,20,14,0.46)' },
    { id: 'cinzas', nome: 'Cratera da Cauda', x: 470, y: 80, fecha: 0.61, perigo: 5, luz: 'rgba(30,8,8,0.64)' },
  ];

  // lugares abertos à força: [x, y, raio]
  const LUGARES = {
    ermo: [250, 412, 9], alvorada: [270, 372, 20], encruz: [270, 296, 9], ybira: [190, 165, 12], vale: [292, 128, 12], lobisomem: [330, 76, 14],
    toca: [120, 122, 14], ze: [62, 62, 14], manguefogo: [90, 290, 12], manguefim: [40, 350, 9], cemiterio: [400, 396, 22], cripta: [436, 416, 8],
    sertao: [450, 290, 12], ticao: [516, 250, 14], cabra: [340, 345, 10], curupira: [150, 215, 10], boiuna: [28, 262, 11], mapinguari: [30, 118, 10], boitata: [392, 268, 11], gigante: [525, 130, 11], mina: [40, 180, 5], gruta: [40, 350, 5], outro: [190, 165, 2], cinzas: [440, 112, 12], cauda: [470, 56, 15], oasis: [520, 380, 8], pedreira: [40, 180, 9], torre: [360, 200, 9],
  };
  const ESTRADAS = [
    ['ermo', 'alvorada'], ['alvorada', 'encruz'], ['encruz', 'ybira'], ['ybira', 'vale'], ['vale', 'lobisomem'], ['ybira', 'toca'], ['toca', 'ze'], ['toca', 'pedreira'],
    ['encruz', 'manguefogo'], ['manguefogo', 'manguefim'], ['manguefogo', 'pedreira'], ['alvorada', 'cemiterio'], ['cemiterio', 'cripta'], ['encruz', 'torre'], ['torre', 'vale'],
    ['torre', 'sertao'], ['cemiterio', 'sertao'], ['sertao', 'ticao'], ['sertao', 'oasis'], ['torre', 'cinzas'], ['cinzas', 'cauda'], ['vale', 'cinzas'], ['alvorada', 'cabra'], ['ybira', 'curupira'], ['manguefogo', 'boiuna'], ['pedreira', 'mapinguari'], ['sertao', 'boitata'], ['cinzas', 'gigante'],
  ];
  const SALAS = [
    [10, 200, 27, 213], [27, 205, 50, 208], [50, 196, 73, 217], [60, 217, 63, 228], [44, 228, 81, 245],
    [81, 235, 110, 238], [110, 230, 123, 243], [123, 235, 142, 238], [142, 218, 178, 248], [73, 204, 92, 207], [92, 199, 104, 212],
    // Mina do Ferro
    [200, 196, 216, 208], [216, 201, 240, 204], [240, 192, 262, 212], [262, 200, 286, 203], [286, 194, 306, 210], [294, 210, 297, 228], [280, 228, 312, 246], [240, 212, 243, 228], [228, 228, 256, 244],
    // Gruta do Mangue
    [400, 200, 416, 214], [416, 205, 438, 208], [438, 196, 458, 218], [458, 206, 480, 209], [480, 198, 500, 216], [488, 216, 491, 230], [472, 230, 512, 247], [445, 218, 448, 232], [430, 232, 460, 246],
  ];
  const PORTOES = {};

  function hash(x, y) { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 15), 2246822519); h = Math.imul(h ^ (h >>> 13), 3266489917); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function ruido(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const s = (t) => t * t * (3 - 2 * t), a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return (a * (1 - s(fx)) + b * s(fx)) * (1 - s(fy)) + (c * (1 - s(fx)) + d * s(fx)) * s(fy);
  }
  function regiaoEm(x, y) {
    // fronteiras onduladas: desloca o ponto com ruído antes de achar a região mais próxima
    const qx = x + (ruido(x * 0.03, y * 0.03) - 0.5) * 70, qy = y + (ruido(x * 0.03 + 40, y * 0.03 + 40) - 0.5) * 70;
    let melhor = 0, menor = 1e9;
    REGIOES.forEach((r, i) => { const d = (qx - r.x) ** 2 + (qy - r.y) ** 2; if (d < menor) { menor = d; melhor = i; } });
    return melhor;
  }

  const CHAO = new Uint8Array(W * H), REG = new Uint8Array(W * H);
  function gerar() {
    const t = CHAO;
    for (let y = 0; y < CRIPTA_Y; y++) for (let x = 0; x < W; x++) {
      const r = regiaoEm(x, y); REG[y * W + x] = r;
      const borda = Math.min(x, y, W - 1 - x, CRIPTA_Y - 1 - y);
      const v = ruido(x * 0.075, y * 0.075) * 0.68 + ruido(x * 0.2 + 9, y * 0.2 + 9) * 0.32;
      if (borda < 5 + ruido(x * 0.1, y * 0.1) * 8 || v > REGIOES[r].fecha) { t[y * W + x] = MATA; continue; }
      // lagoas: o mangue é cheio delas; o sertão, seco, quase não tem
      const lago = { mangue: 0.6, mata: 0.7, campos: 0.74, serra: 0.76, sertao: 0.82, cinzas: 2 }[REGIOES[r].id];
      if (ruido(x * 0.045 + 200, y * 0.045 + 90) * 0.8 + ruido(x * 0.14, y * 0.14 + 300) * 0.2 > lago) { t[y * W + x] = AGUA; continue; }
      const seco = REGIOES[r].id === 'sertao' || REGIOES[r].id === 'cinzas';
      t[y * W + x] = seco && ruido(x * 0.06 + 70, y * 0.06) > 0.56 ? TERRA : MUSGO;
    }
    // estradas tortas: os trechos passam por um ponto deslocado, para nada parecer régua
    const abre = (x, y, r, chao) => {
      for (let b = Math.floor(y - r); b <= y + r; b++) for (let a = Math.floor(x - r); a <= x + r; a++) {
        if (a < 2 || b < 2 || a >= W - 2 || b >= CRIPTA_Y - 2) continue;
        if (Math.hypot(a - x, b - y) < r + (ruido(a * 0.3, b * 0.3) - 0.5) * 1.6) t[b * W + a] = chao || (t[b * W + a] === TERRA ? TERRA : MUSGO);
      }
    };
    for (const [de, para] of ESTRADAS) {
      const A = LUGARES[de], B = LUGARES[para], L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      for (let i = 0; i <= L; i++) {
        const k = i / L, onda = Math.sin(k * Math.PI) * 18 * (ruido(A[0] * 0.1, B[1] * 0.1) - 0.5) * 2;
        const x = A[0] + (B[0] - A[0]) * k + (-(B[1] - A[1]) / L) * onda + (ruido(i * 0.1, A[1]) - 0.5) * 8, y = A[1] + (B[1] - A[1]) * k + ((B[0] - A[0]) / L) * onda + (ruido(i * 0.1, A[0]) - 0.5) * 8;
        abre(x, y, 3.4); abre(x, y, 1.5, TERRA);
      }
    }
    for (const k in LUGARES) { const n = LUGARES[k]; abre(n[0], n[1], n[2]); }
    for (const k of ['alvorada', 'toca', 'ze', 'ticao', 'cauda']) { const n = LUGARES[k]; abre(n[0], n[1], n[2] * 0.55, TERRA); }
    // cripta
    for (let y = CRIPTA_Y; y < H; y++) for (let x = 0; x < W; x++) t[y * W + x] = PAREDE;
    for (const s of SALAS) for (let y = s[1] - 190 + CRIPTA_Y; y < s[3] - 190 + CRIPTA_Y; y++) for (let x = s[0]; x < s[2]; x++) t[y * W + x] = PISO;

    // bolsões sem saída para o resto do mundo viram mato: tudo o que parece aberto pode ser alcançado
    const visto = new Uint8Array(W * H), fila = [LUGARES.ermo[1] * W + LUGARES.ermo[0]];
    visto[fila[0]] = 1;
    while (fila.length) {
      const i = fila.pop();
      for (const d of [1, -1, W, -W]) { const j = i + d; if (j >= 0 && j < CRIPTA_Y * W && !visto[j] && t[j] !== MATA && t[j] !== AGUA) { visto[j] = 1; fila.push(j); } }
    }
    for (let i = 0; i < CRIPTA_Y * W; i++) if (t[i] !== MATA && t[i] !== AGUA && !visto[i]) t[i] = MATA;
  }
  gerar();

  const anda = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return false; const v = CHAO[y * W + x]; return v === MUSGO || v === TERRA || v === PISO; };
  const regiao = (x, y) => REGIOES[REG[Math.max(0, Math.min(CRIPTA_Y - 1, y)) * W + Math.max(0, Math.min(W - 1, x))]];

  raiz.Mapa = { W, H, T, CRIPTA_Y, cr, AGUA, MATA, MUSGO, TERRA, PISO, PAREDE, REGIOES, LUGARES, SALAS, PORTOES, CHAO, REG, anda, regiao, hash, ruido };
  if (typeof module !== 'undefined') module.exports = raiz.Mapa;
})(typeof window !== 'undefined' ? window : globalThis);
