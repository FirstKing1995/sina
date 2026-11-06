/* SINA · Parte I: o mapa. Fixo e desenhado à mão como um grafo de áreas e corredores; o resto é mata fechada.
   Funciona no navegador e no Node (test/mapa-test.js confere se dá para chegar ao chefe). */
(function (raiz) {
  'use strict';
  const ESC = 1.6, CRIPTA_ORIG = 190; // a superfície foi desenhada em 260 x 190 e é esticada aqui; a cripta fica abaixo dela
  const CRIPTA_Y = Math.round(CRIPTA_ORIG * ESC), W = Math.round(260 * ESC), H = CRIPTA_Y + 60, T = 32;
  // converte coordenadas do desenho para o mapa final
  const p = (x, y) => (y < CRIPTA_ORIG ? [Math.round(x * ESC), Math.round(y * ESC)] : [x, y - CRIPTA_ORIG + CRIPTA_Y]);
  const MATA = 0, MUSGO = 1, TERRA = 2, PISO = 3, PAREDE = 4;

  // nós da superfície: [x, y, raio], em blocos
  const N = {
    ermo: [28, 172, 8], vila: [48, 142, 15], est1: [72, 133, 4], est2: [92, 123, 4], encruz: [112, 118, 9],
    mata1: [108, 92, 7], lobos: [82, 74, 11], ponte: [64, 50, 8], matafim: [92, 36, 10], trilha: [125, 34, 6],
    tocaboca: [150, 38, 9], toca: [172, 32, 12], ze: [202, 26, 12], desce1: [174, 52, 4], desce2: [170, 78, 5],
    desce3: [160, 100, 4], junta: [150, 116, 5], volta: [122, 118, 3], fora: [165, 122, 3], cemiterio: [190, 134, 20],
    cripta: [226, 156, 7], lado1: [40, 70, 6], lado2: [132, 72, 5], lado3: [216, 96, 6], lado4: [28, 118, 6],
  };
  // corredores: [de, para, largura, 1 se for estrada de terra]
  for (const k in N) { const [x, y] = p(N[k][0], N[k][1]); N[k] = [x, y, N[k][2] * 1.3]; }
  const E = [
    ['ermo', 'vila', 3, 0], ['vila', 'est1', 2.6, 1], ['est1', 'est2', 2.6, 1], ['est2', 'encruz', 2.6, 1],
    ['encruz', 'mata1', 2.4, 1], ['mata1', 'lobos', 2.4, 0], ['lobos', 'ponte', 2.2, 0], ['ponte', 'matafim', 2.4, 0],
    ['matafim', 'trilha', 2.2, 1], ['trilha', 'tocaboca', 2.2, 1], ['tocaboca', 'toca', 3.5, 1], ['toca', 'ze', 2.4, 1],
    ['toca', 'desce1', 2, 0], ['desce1', 'desce2', 2, 0], ['desce2', 'desce3', 2, 0], ['desce3', 'junta', 2, 0],
    ['junta', 'volta', 2, 1], ['volta', 'encruz', 2, 1], ['junta', 'fora', 2, 1], ['fora', 'cemiterio', 2.6, 1],
    ['cemiterio', 'cripta', 3, 1], ['lobos', 'lado1', 1.8, 0], ['mata1', 'lado2', 1.8, 0], ['cemiterio', 'lado3', 1.8, 0], ['vila', 'lado4', 1.8, 0],
  ];
  // salas da cripta: [x0, y0, x1, y1]
  const SALAS = [
    [10, 200, 27, 213], [27, 205, 50, 208], [50, 196, 73, 217], [60, 217, 63, 228], [44, 228, 81, 245],
    [81, 235, 110, 238], [110, 230, 123, 243], [123, 235, 142, 238], [142, 218, 178, 248],
    [73, 204, 92, 207], [92, 199, 104, 212],
  ];

  // portas com barra: bloqueiam os blocos do retângulo até serem abertas
  const PORTOES = {
    atalho: { x0: 131, y0: 113, x1: 132, y1: 123, abre: 'leste', nome: 'Portão enferrujado' },
    cemiterio: { x0: 158, y0: 116, x1: 159, y1: 128, abre: 'chave', chave: 'chave_ferro', nome: 'Portão do cemitério' },
  };

  function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; }
  function ruido(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const s = (t) => t * t * (3 - 2 * t), a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return (a * (1 - s(fx)) + b * s(fx)) * (1 - s(fy)) + (c * (1 - s(fx)) + d * s(fx)) * s(fy);
  }
  function distSeg(px, py, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - a[0] - dx * t, py - a[1] - dy * t);
  }

  function gerar() {
    const t = new Uint8Array(W * H);
    const nos = Object.values(N);
    for (let y = 0; y < CRIPTA_Y; y++) for (let x = 0; x < W; x++) {
      // o ruído deixa as bordas orgânicas, sem nunca fechar uma passagem de largura mínima
      const v = (ruido(x * 0.13, y * 0.13) - 0.5) * 3.2 + (ruido(x * 0.41, y * 0.41) - 0.5) * 1.3;
      let aberto = false, estrada = false;
      for (const n of nos) if (Math.hypot(x - n[0], y - n[1]) < n[2] + v) { aberto = true; break; }
      for (const e of E) {
        const d = distSeg(x, y, N[e[0]], N[e[1]]);
        if (d < e[2] + Math.max(-0.6, v * 0.45)) aberto = true;
        if (e[3] && d < 1.5 + v * 0.35) estrada = true;
      }
      if (aberto) t[y * W + x] = estrada ? TERRA : MUSGO;
    }
    // chão de terra batida nas clareiras com gente
    for (const [nome, k] of [['vila', 0.55], ['toca', 0.6], ['ze', 0.75], ['matafim', 0.35]]) {
      const n = N[nome];
      for (let y = n[1] - n[2]; y <= n[1] + n[2]; y++) for (let x = n[0] - n[2]; x <= n[0] + n[2]; x++) {
        if (t[y * W + x] && Math.hypot(x - n[0], y - n[1]) < n[2] * k + (ruido(x * 0.3, y * 0.3) - 0.5) * 4) t[y * W + x] = TERRA;
      }
    }
    // cripta
    for (let y = CRIPTA_Y; y < H; y++) for (let x = 0; x < W; x++) t[y * W + x] = PAREDE;
    for (const s of SALAS) for (let y = s[1] - CRIPTA_ORIG + CRIPTA_Y; y < s[3] - CRIPTA_ORIG + CRIPTA_Y; y++) for (let x = s[0]; x < s[2]; x++) t[y * W + x] = PISO;
    return t;
  }

  const CHAO = gerar();
  const anda = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return false; const v = CHAO[y * W + x]; return v === MUSGO || v === TERRA || v === PISO; };

  for (const k in PORTOES) { const g = PORTOES[k], a = p(g.x0, g.y0), b = p(g.x0, g.y1); g.x0 = a[0]; g.x1 = a[0] + 1; g.y0 = a[1]; g.y1 = b[1]; }

  raiz.Mapa = { W, H, T, CRIPTA_Y, p, MATA, MUSGO, TERRA, PISO, PAREDE, N, E, SALAS, PORTOES, CHAO, anda, hash, ruido };
  if (typeof module !== 'undefined') module.exports = raiz.Mapa;
})(typeof window !== 'undefined' ? window : globalThis);
