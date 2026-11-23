/* SINA · o corpo do herói, montado por código.
   Um esqueleto (quadril, tronco, cabeça, braços, pernas) recebe uma pose por animação; cada parte é rasterizada pixel a pixel,
   com sombra automática (luz de cima), contorno e linhas internas entre partes. Roupa e arma são partes também,
   então tudo o que o herói veste e empunha aparece nele, em qualquer pose. Desenhado olhando para a direita e espelhado. */
(function () {
  'use strict';
  const K = (window.Corpo = {});
  const W = 96, H = 96, OX = 48, OY = 84; // pés em (OX, OY)
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cg = cv.getContext('2d');
  const img = cg.createImageData(W, H), px32 = new Uint32Array(img.data.buffer);
  const parte = new Int16Array(W * H), camada = new Int16Array(W * H);
  const sel = new Uint8Array(W * H); // pixels marcados (brasa, olhos)
  K.canvas = cv;

  // ---------- paleta: [luz, base, sombra] por material ----------
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const MAT = {
    barro: ['#cf9466', '#a4643e', '#6e3c24'], barroT: ['#9a6040', '#7a4a30', '#4e2c1c'],
    folha: ['#8ab84e', '#5a8a34', '#34561e'], folhaT: ['#5a8a34', '#3e6a26', '#24401a'],
    cipo: ['#9aa04a', '#6e7634', '#464c20'],
    casca: ['#8a6844', '#5e4430', '#3a2a1c'],
    couro: ['#a87048', '#7a4e30', '#4e301c'], couroT: ['#7a4e30', '#5a3822', '#3a2414'],
    pano: ['#6e7e6c', '#4a5a4c', '#2c3830'], panoT: ['#4a5a4c', '#36443a', '#1e2822'],
    madeira: ['#a87c50', '#76522e', '#4a321c'], pedra: ['#b8b4a8', '#86827a', '#55524c'],
    osso: ['#ece2c8', '#c4b898', '#8a7e64'], ferro: ['#d4dae0', '#98a0a8', '#5a6068'],
    corda: ['#c8b080', '#9a8458', '#6a5838'],
  };
  const PAL = {}; for (const k in MAT) PAL[k] = MAT[k].map(rgb);
  const MATS = Object.keys(MAT), IDX = {}; MATS.forEach((m, i) => { IDX[m] = i + 1; });
  const CONTORNO = [12, 9, 12];
  const pack = (r, g, b, a) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;

  // ---------- rasterização ----------
  let ordem = 0, giro = 0, gx = 0, gy = 0, escX = 1, escY = 1;
  const tf = (x, y) => { // giro do corpo todo (rolamento) em torno de (gx, gy), e estica-amassa
    x *= escX; y *= escY;
    if (!giro) return [x, y];
    const c = Math.cos(giro), s = Math.sin(giro), dx = x - gx, dy = y - gy;
    return [gx + dx * c - dy * s, gy + dx * s + dy * c];
  };
  function marca(ix, iy, m) {
    if (ix < 0 || iy < 0 || ix >= W || iy >= H) return;
    const i = iy * W + ix; parte[i] = m; camada[i] = ordem;
  }
  // cápsula: segmento com raio variável (membros, cabos)
  function capsula(a, b, r1, r2, mat) {
    ordem++;
    const [x1, y1] = tf(a[0], a[1]), [x2, y2] = tf(b[0], b[1]), m = IDX[mat];
    const rr = Math.max(r1, r2) + 1;
    const minx = Math.floor(Math.min(x1, x2) - rr + OX), maxx = Math.ceil(Math.max(x1, x2) + rr + OX);
    const miny = Math.floor(Math.min(y1, y2) - rr + OY), maxy = Math.ceil(Math.max(y1, y2) + rr + OY);
    const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy || 1;
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const px = x + 0.5 - OX, py = y + 0.5 - OY;
      let t = ((px - x1) * dx + (py - y1) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = x1 + dx * t - px, qy = y1 + dy * t - py, r = r1 + (r2 - r1) * t;
      if (qx * qx + qy * qy <= r * r) marca(x, y, m);
    }
  }
  function poligono(pts, mat) {
    ordem++;
    const P = pts.map((p) => tf(p[0], p[1])), m = IDX[mat];
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (const [x, y] of P) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
    for (let y = Math.floor(miny + OY); y <= Math.ceil(maxy + OY); y++) for (let x = Math.floor(minx + OX); x <= Math.ceil(maxx + OX); x++) {
      const px = x + 0.5 - OX, py = y + 0.5 - OY; let dentro = false;
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
        const [xi, yi] = P[i], [xj, yj] = P[j];
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) dentro = !dentro;
      }
      if (dentro) marca(x, y, m);
    }
  }
  function ponto(p, flag) { const [x, y] = tf(p[0], p[1]); const ix = Math.floor(x + OX), iy = Math.floor(y + OY); if (ix >= 0 && iy >= 0 && ix < W && iy < H) sel[iy * W + ix] = flag; }

  // ---------- esqueleto ----------
  const C = { coxa: 10, canela: 10, tronco: 13, braco: 8, ante: 8 };
  const dirDe = (a) => [Math.sin(a), Math.cos(a)]; // 0 = para baixo; positivo = para a frente
  const soma = (p, a, L) => { const d = dirDe(a); return [p[0] + d[0] * L, p[1] + d[1] * L]; };
  // perna por IK: o joelho aponta para a frente
  function perna(q, pe) {
    let dx = pe[0] - q[0], dy = pe[1] - q[1], d = Math.hypot(dx, dy);
    const max = C.coxa + C.canela - 0.2; if (d > max) { dx *= max / d; dy *= max / d; d = max; pe = [q[0] + dx, q[1] + dy]; }
    const base = Math.atan2(dx, dy), k = Math.acos(Math.max(-1, Math.min(1, (C.coxa * C.coxa + d * d - C.canela * C.canela) / (2 * C.coxa * d))));
    const joelho = soma(q, base + k, C.coxa);
    return { joelho, pe };
  }

  // ---------- poses ----------
  const lerp = (a, b, k) => a + (b - a) * k;
  const suave = (k) => k * k * (3 - 2 * k);
  const POSE0 = () => ({ q: [0, -21], tronco: 0.05, cabeca: 0, bT: [-0.1, 0.3], bF: [0.12, 0.35], pT: [-3, 0], pF: [3, 0], arma: -1.3, giro: 0, esc: [1, 1], pegada: 'baixa' });
  function mistura(a, b, k) {
    const o = {};
    for (const c in a) {
      if (Array.isArray(a[c])) o[c] = a[c].map((v, i) => lerp(v, b[c][i], k));
      else if (typeof a[c] === 'number') o[c] = lerp(a[c], b[c], k);
      else o[c] = k < 0.5 ? a[c] : b[c];
    }
    return o;
  }
  const P = (mod) => Object.assign(POSE0(), mod);
  function chaves(lista, k) { // lista de [tempo, pose]
    if (k <= lista[0][0]) return lista[0][1];
    for (let i = 1; i < lista.length; i++) if (k <= lista[i][0]) { const [t0, a] = lista[i - 1], [t1, b] = lista[i]; return mistura(a, b, suave((k - t0) / (t1 - t0))); }
    return lista[lista.length - 1][1];
  }
  // tipos de golpe por arma
  const TIPO = { punho: 'soco', galho: 'corte', clava: 'corte', machado_pedra: 'corte', adaga_osso: 'corte', lanca_pedra: 'estoca', lanca_osso: 'estoca' };
  const GOLPES = {
    corte: [
      [[0, P({ q: [-1, -20], tronco: -0.1, bF: [-2.5, 0.5], bT: [0.6, 0.6], arma: -1.0, pT: [-5, 0], pF: [4, 0] })], [0.28, P({ q: [1, -19], tronco: 0.3, bF: [-2.9, 0.2], bT: [0.8, 0.8], arma: -0.6, pT: [-6, 0], pF: [5, 0] })], [0.5, P({ q: [3, -18], tronco: 0.45, bF: [1.5, 0.05], bT: [-0.5, 0.4], arma: 0.2, pT: [-6, 0], pF: [7, 0] })], [1, P({ q: [2, -19], tronco: 0.3, bF: [0.9, 0.3], bT: [-0.3, 0.5], arma: -0.4, pT: [-5, 0], pF: [6, 0] })]],
      [[0, P({ q: [1, -19], tronco: 0.3, bF: [1.2, 0.3], bT: [-0.2, 0.5], arma: 0.2, pT: [-5, 0], pF: [6, 0] })], [0.3, P({ q: [0, -19], tronco: 0.15, bF: [1.5, 0.1], bT: [-0.2, 0.5], arma: 1.0, pT: [-5, 0], pF: [5, 0] })], [0.55, P({ q: [2, -20], tronco: 0.0, bF: [-2.0, 0.2], bT: [0.4, 0.5], arma: -0.2, pT: [-4, 0], pF: [6, 0] })], [1, P({ q: [1, -20], tronco: 0.05, bF: [-1.3, 0.5], bT: [0.3, 0.4], arma: -0.8, pT: [-4, 0], pF: [5, 0] })]],
      [[0, P({ q: [-2, -17], tronco: -0.25, bF: [-2.8, 0.1], bT: [-2.6, 0.3], arma: -0.4, pT: [-6, 0], pF: [5, 0], pegada: 'dupla' })], [0.38, P({ q: [-2, -16], tronco: -0.35, bF: [-3.1, 0.0], bT: [-2.9, 0.1], arma: -0.2, pT: [-7, 0], pF: [5, 0], pegada: 'dupla' })], [0.55, P({ q: [5, -15], tronco: 0.7, bF: [1.4, 0.0], bT: [1.2, 0.2], arma: 0.4, pT: [-7, 0], pF: [9, 0], pegada: 'dupla' })], [1, P({ q: [4, -17], tronco: 0.5, bF: [1.0, 0.2], bT: [0.8, 0.3], arma: -0.2, pT: [-6, 0], pF: [8, 0], pegada: 'dupla' })]],
    ],
    estoca: [
      [[0, P({ q: [-1, -20], tronco: -0.05, bF: [0.6, 1.9], bT: [0.9, 1.2], arma: -1.57, pT: [-5, 0], pF: [5, 0] })], [0.3, P({ q: [-2, -19], tronco: -0.15, bF: [0.4, 2.2], bT: [0.7, 1.4], arma: -1.57, pT: [-6, 0], pF: [5, 0] })], [0.5, P({ q: [4, -18], tronco: 0.35, bF: [1.55, 0.0], bT: [1.3, 0.5], arma: -0.02, pT: [-7, 0], pF: [8, 0] })], [1, P({ q: [3, -19], tronco: 0.25, bF: [1.3, 0.3], bT: [1.0, 0.7], arma: -0.25, pT: [-6, 0], pF: [7, 0] })]],
      [[0, P({ q: [2, -19], tronco: 0.25, bF: [1.2, 0.4], bT: [0.9, 0.8], arma: -0.3, pT: [-6, 0], pF: [7, 0] })], [0.3, P({ q: [0, -18], tronco: 0.05, bF: [0.7, 1.6], bT: [0.8, 1.3], arma: -1.4, pT: [-6, 0], pF: [5, 0] })], [0.5, P({ q: [5, -17], tronco: 0.45, bF: [1.6, -0.1], bT: [1.4, 0.4], arma: 0.05, pT: [-8, 0], pF: [9, 0] })], [1, P({ q: [4, -18], tronco: 0.3, bF: [1.3, 0.3], bT: [1.0, 0.6], arma: -0.2, pT: [-7, 0], pF: [8, 0] })]],
      [[0, P({ q: [-3, -16], tronco: -0.2, bF: [0.2, 2.4], bT: [0.5, 1.8], arma: -1.6, pT: [-7, 0], pF: [4, 0] })], [0.4, P({ q: [-4, -15], tronco: -0.3, bF: [0.1, 2.5], bT: [0.4, 1.9], arma: -1.65, pT: [-8, 0], pF: [4, 0] })], [0.55, P({ q: [7, -16], tronco: 0.55, bF: [1.6, -0.05], bT: [1.5, 0.2], arma: 0.0, pT: [-9, 0], pF: [11, 0] })], [1, P({ q: [6, -17], tronco: 0.4, bF: [1.4, 0.2], bT: [1.2, 0.4], arma: -0.1, pT: [-8, 0], pF: [10, 0] })]],
    ],
    soco: [
      [[0, P({ q: [-1, -20], tronco: 0, bF: [0.5, 2.3], bT: [0.7, 2.2], pT: [-5, 0], pF: [4, 0] })], [0.3, P({ q: [-2, -20], tronco: -0.1, bF: [0.3, 2.6], bT: [0.8, 2.2], pT: [-5, 0], pF: [4, 0] })], [0.5, P({ q: [3, -19], tronco: 0.3, bF: [1.55, 0.0], bT: [0.6, 2.2], pT: [-5, 0], pF: [6, 0] })], [1, P({ q: [1, -20], tronco: 0.15, bF: [0.8, 1.8], bT: [0.7, 2.2], pT: [-5, 0], pF: [5, 0] })]],
      [[0, P({ q: [1, -20], tronco: 0.15, bF: [0.8, 1.8], bT: [0.7, 2.2], pT: [-5, 0], pF: [5, 0] })], [0.3, P({ q: [0, -20], tronco: 0.0, bF: [0.6, 2.2], bT: [0.4, 2.5], pT: [-5, 0], pF: [5, 0] })], [0.5, P({ q: [4, -19], tronco: 0.4, bF: [0.5, 2.0], bT: [1.55, 0.0], pT: [-6, 0], pF: [6, 0] })], [1, P({ q: [2, -20], tronco: 0.2, bF: [0.7, 2.0], bT: [0.9, 1.6], pT: [-5, 0], pF: [5, 0] })]],
      [[0, P({ q: [-2, -16], tronco: -0.1, bF: [-0.3, 2.6], bT: [0.6, 2.2], pT: [-6, 0], pF: [4, 0] })], [0.4, P({ q: [-3, -15], tronco: -0.2, bF: [-0.6, 2.7], bT: [0.6, 2.2], pT: [-6, 0], pF: [4, 0] })], [0.55, P({ q: [5, -21], tronco: 0.2, bF: [2.7, 0.1], bT: [0.6, 2.0], pT: [-5, -1], pF: [6, 0] })], [1, P({ q: [3, -20], tronco: 0.15, bF: [1.9, 0.5], bT: [0.7, 2.0], pT: [-5, 0], pF: [5, 0] })]],
    ],
  };
  const CIMA = [[0, P({ bF: [1.2, 0.3], bT: [-0.3, 0.4], arma: -0.3, tronco: 0.05, q: [0, -21] })], [0.3, P({ bF: [1.4, 0.2], bT: [-0.3, 0.4], arma: 0.2, tronco: 0.1, q: [0, -21] })], [0.55, P({ bF: [-2.9, 0.1], bT: [0.4, 0.4], arma: -0.1, tronco: -0.2, q: [0, -22] })], [1, P({ bF: [-2.5, 0.4], bT: [0.3, 0.4], arma: -0.5, tronco: -0.1, q: [0, -21] })]];
  const BAIXO = [[0, P({ q: [0, -20], bF: [-2.2, 0.4], bT: [-2.0, 0.4], arma: -0.5, pT: [-4, -6], pF: [3, -5], tronco: 0.1 })], [0.35, P({ q: [0, -20], bF: [0.0, 0.0], bT: [0.4, 0.3], arma: 0.0, pT: [-4, -7], pF: [3, -6], tronco: 0.25 })], [1, P({ q: [0, -20], bF: [0.1, 0.1], bT: [0.4, 0.3], arma: 0.0, pT: [-4, -6], pF: [3, -6], tronco: 0.2 })]];

  function pose(h, tempo) {
    const arma = h.arma || 'punho', tipo = TIPO[arma] || 'corte', temArma = arma !== 'punho';
    const descanso = temArma ? (tipo === 'estoca' ? { bF: [0.55, 0.9], arma: -1.0 } : { bF: [0.25, 0.7], arma: -1.15 }) : {};
    let p;
    const e = h.estado;
    if (e === 'golpe' || e === 'forte') {
      const k = Math.min(1, h.t / h.dur);
      if (h.dirGolpe === 'cima') p = chaves(CIMA, k);
      else if (h.dirGolpe === 'baixo') p = chaves(BAIXO, k);
      else if (e === 'forte') p = chaves(GOLPES[tipo][2], 0.45 + k * 0.55);
      else p = chaves(GOLPES[tipo][(h.combo - 1) % 3], k);
      if (!h.noChao && h.dirGolpe === 'frente') { p.pT = [-4, -4]; p.pF = [4, -3]; }
    } else if (e === 'carga') {
      const c = Math.min(1, h.carga / 0.9);
      p = chaves(GOLPES[tipo][2], 0.38 * c);
      p.q[0] += Math.sin(tempo * 60) * 0.4 * c;
    } else if (e === 'rola') {
      const k = h.t / 0.34;
      if (h.noAr) p = P({ q: [2, -20], tronco: 0.7, cabeca: 0.3, bF: [-1.6, 0.4], bT: [-1.9, 0.4], pT: [-10, -3], pF: [-6, -2], arma: -0.8 });
      else { p = P({ q: [0, -13], tronco: 1.2, cabeca: 0.6, bF: [1.6, 2.0], bT: [1.4, 2.2], pT: [-2, -4], pF: [4, -6], arma: 0.4 }); p.giro = k * Math.PI * 2; p.centro = [0, -11]; }
    } else if (e === 'magia') {
      const k = Math.min(1, h.t / h.dur);
      p = mistura(P({ q: [0, -20], tronco: -0.1, bF: [0.6, 1.4], bT: [-0.5, 0.8] }), P({ q: [1, -20], tronco: 0.15, bF: [1.6, -0.1], bT: [-2.7, 0.2], pT: [-5, 0], pF: [5, 0] }), suave(Math.min(1, k * 3)));
    } else if (e === 'dor') {
      const k = Math.min(1, h.t / 0.32);
      p = P({ q: [-2, -20], tronco: -0.45 * (1 - k), cabeca: -0.4 * (1 - k), bF: [-0.9, 0.5], bT: [1.0, 0.4], pT: [-5, 0], pF: [3, 0] });
    } else if (e === 'morto') {
      const k = Math.min(1, h.t / 0.7);
      p = mistura(P({ q: [-1, -19], tronco: -0.3, bF: [-0.6, 0.5], bT: [0.8, 0.4] }), P({ q: [0, -9], tronco: 0.9, cabeca: 0.7, bF: [0.4, 0.3], bT: [0.6, 0.3], pT: [-6, 0], pF: [5, 0] }), suave(k));
    } else if (e === 'coleta' || e === 'cria') {
      const k = Math.min(1, h.t / 0.25);
      p = mistura(POSE0(), P({ q: [1, -13], tronco: 0.8, cabeca: 0.3, bF: [0.4, 0.2], bT: [0.2, 0.4], pT: [-5, 0], pF: [5, 0] }), suave(e === 'coleta' ? (h.t < 0.35 ? k : 1 - Math.min(1, (h.t - 0.35) / 0.2)) : 1));
      if (e === 'cria') { p.bF = [0.7 + Math.sin(tempo * 18) * 0.4, 1.2]; p.bT = [0.6 - Math.sin(tempo * 18) * 0.4, 1.3]; }
    } else if (e === 'beber') {
      const k = Math.min(1, h.t / 0.3);
      p = mistura(POSE0(), P({ bF: [0.2, 2.7], cabeca: -0.2, tronco: -0.05 }), suave(k));
    } else if (e === 'nascer') {
      p = P({ q: [0, -21], tronco: 0.05, cabeca: 0.15, bF: [0.1, 0.2], bT: [-0.05, 0.2] });
    } else if (!h.noChao) {
      if (h.vy < 0) p = P({ q: [0, -21], tronco: 0.12, cabeca: -0.1, bF: [-0.9, 1.0], bT: [-1.2, 0.6], pT: [-4, -2], pF: [4, -6] });
      else { const c = Math.min(1, h.vy / 400); p = P({ q: [0, -21], tronco: 0.1, cabeca: 0.15 * c, bF: [-0.6 - c * 0.6, 0.6], bT: [0.8 + c * 0.4, 0.5], pT: [-5, -2 + c * 2], pF: [3, -4 + c * 3] }); }
      Object.assign(p, temArma ? { arma: descanso.arma } : {});
    } else if (Math.abs(h.vx) > 12) {
      const v = Math.min(1.3, Math.abs(h.vx) / 120), f = (h.fase || 0) * Math.PI * 2;
      const pe = (fa) => [Math.cos(fa) * 7.5 * v, -Math.max(0, Math.sin(fa)) * 5.5 * v];
      p = P({ q: [1, -20.5 + Math.abs(Math.sin(f)) * -1.4 * v], tronco: 0.24 * v, cabeca: -0.08, pF: pe(f), pT: pe(f + Math.PI),
        bF: [Math.cos(f + Math.PI) * 0.9 * v + 0.2, 0.9 + Math.max(0, Math.cos(f + Math.PI)) * 0.4], bT: [Math.cos(f) * 0.9 * v + 0.2, 0.9 + Math.max(0, Math.cos(f)) * 0.4] });
      if (temArma) { p.bF = [p.bF[0] * 0.5 + 0.35, 0.9]; p.arma = descanso.arma; }
    } else {
      const r = Math.sin(tempo * 2.2);
      p = P({ q: [0, -21 + r * 0.4], tronco: 0.05 + r * 0.02, cabeca: 0.02 - r * 0.03, bT: [-0.1 - r * 0.03, 0.3], bF: [0.12 + r * 0.03, 0.35] });
      if (temArma) Object.assign(p, descanso, { bF: descanso.bF.slice() });
    }
    if (h.amassa > 0 && h.noChao && (e === 'livre' || e === 'carga')) { p.q[1] += h.amassa * 6; p.tronco += h.amassa * 0.3; }
    return p;
  }
  K.pose = pose;

  // ---------- montagem ----------
  // h.roupa: { corpo: null|'tanga'|'gibao', manto: null|'folhas', bracos: null|'casca', cabeca: null|'capuz' }
  function monta(h, p) {
    parte.fill(0); camada.fill(0); sel.fill(0); ordem = 0;
    giro = p.giro || 0; [gx, gy] = p.centro || [0, -11]; [escX, escY] = p.esc || [1, 1];
    const R = h.roupa || {}, arma = h.arma || 'punho';
    const q = p.q, tdir = [Math.sin(p.tronco), -Math.cos(p.tronco)];
    const peito = [q[0] + tdir[0] * C.tronco, q[1] + tdir[1] * C.tronco];
    const ombro = [q[0] + tdir[0] * (C.tronco - 1.5), q[1] + tdir[1] * (C.tronco - 1.5)];
    const ombroT = [ombro[0] - 1.2, ombro[1] + 0.3], ombroF = [ombro[0] + 0.8, ombro[1]];
    const pesc = [q[0] + tdir[0] * (C.tronco + 1.8), q[1] + tdir[1] * (C.tronco + 1.8)];
    const ca = p.tronco + p.cabeca, cab = [pesc[0] + Math.sin(ca) * 3.6, pesc[1] - Math.cos(ca) * 3.6];
    const braco = (o, b) => { const cot = soma(o, b[0], C.braco), mao = soma(cot, b[0] - b[1] * 0.0 + b[1], C.ante); return { cot, mao }; };
    const bT = braco(ombroT, p.bT), bF = braco(ombroF, p.bF);
    const qT = [q[0] - 1.2, q[1]], qF = [q[0] + 1.2, q[1]];
    const pT = perna(qT, p.pT), pF = perna(qF, p.pF);
    const dirArma = (() => { const a = Math.atan2(bF.mao[0] - bF.cot[0], bF.mao[1] - bF.cot[1]); return a + p.arma; })();
    const pele = 'barro', peleT = 'barroT';
    const mBraco = (tras) => (R.bracos === 'casca' ? 'casca' : tras ? peleT : pele);
    const mPerna = (tras) => (R.pernas === 'couro' ? (tras ? 'couroT' : 'couro') : tras ? peleT : pele);

    // manto atrás de tudo
    if (R.manto) desenhaManto(h, ombro, q, R.manto === 'pano' ? 'panoT' : 'folhaT');
    // braço de trás
    capsula(ombroT, bT.cot, 2.2, 1.9, mBraco(true)); capsula(bT.cot, bT.mao, 1.9, 1.6, mBraco(true)); capsula(bT.mao, bT.mao, 1.9, 1.9, peleT);
    // perna de trás
    capsula(qT, pT.joelho, 2.8, 2.2, mPerna(true)); capsula(pT.joelho, pT.pe, 2.2, 1.6, mPerna(true));
    capsula([pT.pe[0] - 0.5, pT.pe[1] - 1], [pT.pe[0] + 3, pT.pe[1] - 0.6], 1.4, 1.2, R.pes ? 'couroT' : peleT);
    // tronco
    const lado = [Math.cos(p.tronco), Math.sin(p.tronco)];
    poligono([[q[0] - lado[0] * 3, q[1] - lado[1] * 3 + 1], [q[0] + lado[0] * 3.2, q[1] + lado[1] * 3.2 + 1],
      [ombro[0] + lado[0] * 3.6, ombro[1] + lado[1] * 3.6], [peito[0] + lado[0] * 2, peito[1] + lado[1] * 2 - 0.5], [peito[0] - lado[0] * 2.4, peito[1] - lado[1] * 2.4 - 0.5], [ombro[0] - lado[0] * 3.8, ombro[1] - lado[1] * 3.8]],
      R.corpo === 'gibao' ? 'couro' : pele);
    capsula([q[0], q[1] - 1], [q[0], q[1] + 0.5], 3.3, 3.3, R.corpo === 'gibao' ? 'couro' : pele);
    // rachaduras de brasa no peito (o sopro do deus)
    if (R.corpo !== 'gibao') { const m = [lerp(q[0], peito[0], 0.62), lerp(q[1], peito[1], 0.62)]; ponto([m[0] + 1, m[1]], 2); ponto([m[0] + 1, m[1] + 1], 2); ponto([m[0], m[1] + 2], 2); ponto([m[0] + 2, m[1] - 1], 2); }
    // tanga de folhas
    if (R.corpo === 'tanga' || R.corpo === 'gibao') {
      const mat = R.corpo === 'gibao' ? 'couro' : 'folha';
      const b0 = [q[0] - lado[0] * 3.6, q[1] - lado[1] * 3.6 - 1.5], b1 = [q[0] + lado[0] * 3.8, q[1] + lado[1] * 3.8 - 1.5];
      const balanço = Math.sin((h.fase || 0) * Math.PI * 2) * 1.2;
      poligono([b0, b1, [b1[0] + 0.5, b1[1] + 4], [lerp(b0[0], b1[0], 0.75) + balanço, b1[1] + 6.5], [lerp(b0[0], b1[0], 0.5), b1[1] + 4.5], [lerp(b0[0], b1[0], 0.25) + balanço, b0[1] + 6.5], [b0[0] - 0.5, b0[1] + 4]], mat);
      capsula(b0, b1, 1, 1, mat === 'couro' ? 'couroT' : 'cipo');
    }
    // perna da frente
    capsula(qF, pF.joelho, 2.9, 2.3, mPerna(false)); capsula(pF.joelho, pF.pe, 2.3, 1.7, mPerna(false));
    capsula([pF.pe[0] - 0.5, pF.pe[1] - 1], [pF.pe[0] + 3.2, pF.pe[1] - 0.6], 1.5, 1.3, R.pes ? 'couro' : pele);
    // cabeça: crânio liso de barro, maxilar marcado
    capsula(pesc, [pesc[0], pesc[1] + 1], 1.6, 1.6, pele);
    capsula([cab[0] - Math.sin(ca) * 0.5, cab[1]], [cab[0] + Math.sin(ca + 1.2) * 1.6, cab[1] + Math.cos(ca) * 1.6], 4.1, 3.2, pele);
    const olho = [cab[0] + Math.cos(ca) * 2.2 - Math.sin(ca) * -0.3, cab[1] + Math.sin(ca) * 2.2 - Math.cos(ca) * 0.2];
    ponto(olho, 3); ponto([olho[0] - 0.9, olho[1]], 4);
    if (R.cabeca === 'capuz') {
      poligono([[cab[0] - 4.8, cab[1] + 3.5], [cab[0] - 5, cab[1] - 2], [cab[0] - 1, cab[1] - 5.4], [cab[0] + 3.2, cab[1] - 4.4], [cab[0] + 4.4, cab[1] - 1.5], [cab[0] + 1.2, cab[1] - 2.2], [cab[0] - 1.2, cab[1] + 1.5], [cab[0] - 1, cab[1] + 4.6]], 'folha');
    }
    // arma (atrás da mão da frente)
    desenhaArma(arma, bF.mao, dirArma, p.pegada === 'dupla' ? bT.mao : null);
    // braço da frente
    capsula(ombroF, bF.cot, 2.3, 2.0, mBraco(false)); capsula(bF.cot, bF.mao, 2.0, 1.7, mBraco(false)); capsula(bF.mao, bF.mao, 2.0, 2.0, pele);
    if (R.bracos === 'casca') capsula(soma(bF.cot, Math.atan2(bF.mao[0] - bF.cot[0], bF.mao[1] - bF.cot[1]), 2), soma(bF.cot, Math.atan2(bF.mao[0] - bF.cot[0], bF.mao[1] - bF.cot[1]), 6), 2.2, 2.0, 'cipo');
    return { mao: bF.mao, maoT: bT.mao, dirArma, cab, peito, ombro };
  }
  const ARMAS_FORMA = {
    galho: (m, d) => { capsula(soma(m, d, -2), soma(m, d, 14), 1, 0.8, 'madeira'); capsula(soma(m, d, 8), soma(soma(m, d, 8), d - 0.8, 4), 0.6, 0.5, 'madeira'); },
    clava: (m, d) => { capsula(soma(m, d, -2), soma(m, d, 9), 1.1, 1.6, 'madeira'); capsula(soma(m, d, 9), soma(m, d, 15), 2.6, 2.2, 'madeira'); ponto(soma(m, d, 12), 5); },
    lanca_pedra: (m, d) => { capsula(soma(m, d, -9), soma(m, d, 17), 0.9, 0.9, 'madeira'); capsula(soma(m, d, 15), soma(m, d, 17), 1.4, 1.4, 'cipo'); poligono([soma(soma(m, d, 17), d + 1.57, 2), soma(m, d, 23), soma(soma(m, d, 17), d - 1.57, 2)], 'pedra'); },
    lanca_osso: (m, d) => { capsula(soma(m, d, -9), soma(m, d, 17), 0.9, 0.9, 'madeira'); poligono([soma(soma(m, d, 17), d + 1.57, 1.6), soma(m, d, 25), soma(soma(m, d, 17), d - 1.57, 1.6)], 'osso'); },
    machado_pedra: (m, d) => { capsula(soma(m, d, -2), soma(m, d, 14), 1, 1, 'madeira'); const c = soma(m, d, 12); poligono([soma(c, d + 1.57, 1), soma(soma(c, d + 1.57, 5), d, 2.5), soma(soma(c, d + 1.57, 5.5), d, -2.5), soma(c, d, -2)], 'pedra'); capsula(soma(c, d, -1.5), soma(c, d, 1.5), 1.4, 1.4, 'cipo'); },
    adaga_osso: (m, d) => { capsula(soma(m, d, -1), soma(m, d, 2), 1, 1, 'cipo'); poligono([soma(soma(m, d, 2), d + 1.57, 1.4), soma(m, d, 10), soma(soma(m, d, 2), d - 1.57, 1.4)], 'osso'); },
  };
  function desenhaArma(arma, mao, d, mao2) { const f = ARMAS_FORMA[arma]; if (f) f(mao, d); }
  K.alcanceVisual = { punho: 10, galho: 16, clava: 16, lanca_pedra: 24, lanca_osso: 25, machado_pedra: 15, adaga_osso: 10 };

  // manto: corrente de pontos presa nos ombros, simulada no mundo
  function desenhaManto(h, ombro, q, mat) {
    const pano = h.pano; if (!pano) return;
    const N = pano.length, larg = 4.5;
    const esq = [], dir = [];
    for (let i = 0; i < N; i++) {
      const pp = pano[i], prox = pano[Math.min(N - 1, i + 1)], ant = pano[Math.max(0, i - 1)];
      const dx = prox.lx - ant.lx, dy = prox.ly - ant.ly, L = Math.hypot(dx, dy) || 1;
      const w = larg * (0.7 + (i / N) * 0.6);
      esq.push([pp.lx - (dy / L) * w * 0.5, pp.ly + (dx / L) * w * 0.5]); dir.push([pp.lx + (dy / L) * w * 0.5, pp.ly - (dx / L) * w * 0.5]);
    }
    // barra rasgada
    const ult = pano[N - 1], fim = [];
    for (let k = 0; k < 4; k++) { const a = dir[N - 1], b = esq[N - 1], t = k / 3; fim.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t) + (k % 2 ? 2.5 : 0)]); }
    poligono([...esq, ...fim.reverse().map((x) => x), ...dir.slice().reverse()], mat);
    void ult; void ombro; void q;
  }
  K.passoPano = function (h, ombroMundo, dt) {
    const N = 6, SEG = 3.6;
    if (!h.pano || h.pano.length !== N) { h.pano = []; for (let i = 0; i < N; i++) h.pano.push({ x: ombroMundo[0] - h.dir * 2, y: ombroMundo[1] + i * SEG, px: ombroMundo[0] - h.dir * 2, py: ombroMundo[1] + i * SEG }); }
    const pn = h.pano;
    pn[0].x = ombroMundo[0] - h.dir * 2; pn[0].y = ombroMundo[1];
    const vento = Math.sin(performance.now() / 700) * 0.15;
    for (let i = 1; i < N; i++) { const p = pn[i], vx = (p.x - p.px) * 0.92, vy = (p.y - p.py) * 0.92; p.px = p.x; p.py = p.y; p.x += vx - h.dir * 0.06 + vento; p.y += vy + 0.45; }
    for (let k = 0; k < 4; k++) for (let i = 1; i < N; i++) {
      const a = pn[i - 1], b = pn[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, df = (d - SEG) / d;
      if (i === 1) { b.x -= dx * df; b.y -= dy * df; } else { a.x += dx * df * 0.5; a.y += dy * df * 0.5; b.x -= dx * df * 0.5; b.y -= dy * df * 0.5; }
      // o pano fica atrás do corpo: não passa para a frente do peito
      if (h.dir > 0 ? b.x > pn[0].x + 2 : b.x < pn[0].x - 2) b.x = pn[0].x + (h.dir > 0 ? 2 : -2);
    }
  };

  // ---------- acabamento: sombra, linhas internas, contorno ----------
  function pinta(o) {
    const branco = o.branco || 0;
    px32.fill(0);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, m = parte[i]; if (!m) continue;
      const pal = PAL[MATS[m - 1]];
      const cima = y > 0 ? parte[i - W] : 0, baixo = y < H - 1 ? parte[i + W] : 0, esq = x > 0 ? parte[i - 1] : 0, dir = x < W - 1 ? parte[i + 1] : 0;
      const baixo2 = y < H - 2 ? parte[i + 2 * W] : 0;
      let c = pal[1];
      if (cima !== m || esq !== m && x > 0 && !esq) c = pal[0];
      else if (baixo !== m || dir !== m && !dir || baixo2 !== m) c = pal[2];
      // linha interna: quem está por cima recorta quem está por baixo
      const ci = camada[i];
      if ((cima && cima !== m && camada[i - W] > ci) || (baixo && baixo !== m && camada[i + W] > ci) || (esq && esq !== m && camada[i - 1] > ci) || (dir && dir !== m && camada[i + 1] > ci)) c = [pal[2][0] * 0.55, pal[2][1] * 0.55, pal[2][2] * 0.6];
      let r = c[0], g = c[1], b = c[2];
      const s = sel[i];
      if (s === 2) { r = 255; g = 168; b = 72; } // brasa
      if (s === 3) { r = 255; g = 236; b = 170; } // olho
      if (s === 4) { r = 120; g = 50; b = 30; }
      if (s === 5) { r = c[0] * 0.6; g = c[1] * 0.6; b = c[2] * 0.6; }
      if (o.tinta) { const t = o.tinta, k = o.tintaA; r = lerp(r, t[0], k); g = lerp(g, t[1], k); b = lerp(b, t[2], k); }
      if (branco) { r = lerp(r, 255, branco); g = lerp(g, 255, branco); b = lerp(b, 255, branco); }
      px32[i] = pack(r | 0, g | 0, b | 0, 255);
    }
    // contorno
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (parte[i]) continue;
      if ((x > 0 && parte[i - 1]) || (x < W - 1 && parte[i + 1]) || (y > 0 && parte[i - W]) || (y < H - 1 && parte[i + W])) px32[i] = pack(CONTORNO[0], CONTORNO[1], CONTORNO[2], 250);
    }
    cg.putImageData(img, 0, 0);
  }

  // ---------- desenhar no mundo ----------
  K.desenha = function (g, h, tempo, o) {
    o = o || {};
    const p = pose(h, tempo);
    const pts = monta(h, p);
    pinta(o);
    h.maoMundo = [h.x + pts.mao[0] * h.dir, h.y + pts.mao[1]];
    h.cabMundo = [h.x + pts.cab[0] * h.dir, h.y + pts.cab[1]];
    h.ombroMundo = [h.x + pts.ombro[0] * h.dir, h.y + pts.ombro[1]];
    h.dirArmaMundo = h.dir > 0 ? pts.dirArma : -pts.dirArma;
    if (o.alpha != null) g.globalAlpha = o.alpha;
    const x = Math.round(h.x), y = Math.round(h.y);
    if (h.dir < 0) { g.save(); g.translate(x, 0); g.scale(-1, 1); g.drawImage(cv, -OX, y - OY); g.restore(); }
    else g.drawImage(cv, x - OX, y - OY);
    g.globalAlpha = 1;
    return pts;
  };
  // converte o pano do mundo para o espaço local antes de montar
  K.prepara = function (h, dt) {
    if (!(h.roupa && h.roupa.manto)) return;
    const p = pose(h, performance.now() / 1000);
    const tdir = [Math.sin(p.tronco), -Math.cos(p.tronco)];
    const ombroL = [p.q[0] + tdir[0] * (C.tronco - 1), p.q[1] + tdir[1] * (C.tronco - 1)];
    K.passoPano(h, [h.x + ombroL[0] * h.dir, h.y + ombroL[1]], dt);
    for (const pp of h.pano) { pp.lx = (pp.x - h.x) * h.dir; pp.ly = pp.y - h.y; }
  };
  // os pixels do corpo, para a morte (o barro se desfaz) e para o nascimento
  K.pixels = function (h, tempo) {
    const p = pose(h, tempo); monta(h, p); pinta({});
    const d = img.data, lista = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (d[i + 3] > 100) lista.push({ x: (x - OX) * h.dir + h.x, y: y - OY + h.y, c: 'rgb(' + d[i] + ',' + d[i + 1] + ',' + d[i + 2] + ')' }); }
    return lista;
  };
  K.retrato = function (dest, h) {
    const fake = Object.assign({}, h, { estado: 'nascer', noChao: true, vx: 0, dir: 1, x: 0, y: 0 });
    const p = pose(fake, 0); monta(fake, p); pinta({});
    const g = dest.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, dest.width, dest.height);
    g.drawImage(cv, OX - 12, OY - 50, 24, 24, 0, 0, dest.width, dest.height);
  };
})();
