/* SINA · o cenário vivo: vento, capim que se abre, cipós, bichinhos que reagem, olhos na mata, bandos ao longe e os sons da natureza.
   Só enfeita: nada daqui muda regra. Usa as peças de assets/floresta/detalhes.webp e bichinhos.webp. */
(function () {
  'use strict';
  const D = window.Desenho, J = window.Jogo, F = window.Fase, C = window.Dados, T = F.T;
  const U = window.UI_ARTE || {}, DET = U.det || {}, BI = U.bichos || {};
  const V = (D.vivo = {}), cam = D.cam, img = D.img;
  const tela = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const hash = (n) => { let k = (n * 374761393) | 0; k = Math.imul(k ^ (k >>> 13), 1274126177); return ((k ^ (k >>> 16)) >>> 0) / 4294967296; };
  const rnd = (a, b) => a + Math.random() * (b - a), um = (l) => l[Math.floor(Math.random() * l.length)];
  let t = 0;

  // ---------- vento: uma onda que corre pelo mapa, com rajadas ----------
  V.vento = function (x) {
    const cl = J.cl ? J.cl('vento', 'tempestade') : 0, ch = J.cl ? J.cl('chuva') : 0, raj = Math.max(0, Math.sin(t * 0.37 - x * 0.0016) - 0.35) * 1.5, lado = J.clima ? J.clima.lado : 1;
    return (Math.sin(t * 1.5 + x * 0.012) * 0.4 + Math.sin(t * 2.7 + x * 0.031) * 0.18) * (0.6 + ch * 0.5 + cl) + lado * (raj * 0.7 + cl * 1.1 * (0.7 + 0.3 * Math.sin(t * 5 + x * 0.01)));
  };
  // quanto cada planta dobra (por pixel de altura)
  const MOLE = { planta: 0.07, samambaia: 0.085, frutas: 0.05, galhada: 0.03, arvore: 0.012, arvorao: 0.006, capim1: 0.14, capim2: 0.13, flor1: 0.12, flor2: 0.12, junco: 0.1, seco: 0.13, cipo1: 0.07, cipo2: 0.09, raiz1: 0.07, raiz2: 0.04 };
  V.inclina = function (n, x, y) {
    const m = MOLE[n]; if (!m) return 0; let v = V.vento(x) * m; const h = J.heroi;
    // o mato abre quando alguém passa
    if (m > 0.04 && h) { const abre = (e, f) => { const d = x - e.x; if (Math.abs(d) < 26 && Math.abs(y - e.y) < 30) v += (d >= 0 ? 1 : -1) * (1 - Math.abs(d) / 26) * f * Math.min(1, 0.25 + Math.abs(e.vx) / 130); }; abre(h, 0.34); for (const e of J.inimigos) if (e.vivo && Math.abs(e.x - x) < 30) abre(e, 0.28); }
    return Math.max(-0.5, Math.min(0.5, v));
  };

  // ---------- peças tingidas com a cor do lugar ----------
  const TINTA = { minas: ['60,52,58', 0.5], floresta: ['54,112,104', 0.34], vale: ['96,120,84', 0.22], lobos: ['58,74,104', 0.55], mangue: ['92,104,52', 0.3], cobras: ['92,104,52', 0.3], zumbis: ['86,74,98', 0.55], goblins: ['112,74,50', 0.5] };
  const prontas = new Map();
  function peca(n, reg, modo) {
    const k = n + reg + (modo || ''); let c = prontas.get(k); if (c) return c; const p = DET[n], im = img.detalhes; if (!p || !im) return null;
    c = tela(p[2], p[3]); const q = c.getContext('2d'); q.drawImage(im, p[0], p[1], p[2], p[3], 0, 0, p[2], p[3]);
    const brilha = ['cristal', 'brasa', 'cogu1'].includes(n), ti = modo === 'sombra' ? ['3,7,9', 0.95] : brilha ? null : TINTA[reg]; if (ti) { q.globalCompositeOperation = 'source-atop'; q.globalAlpha = ti[1]; q.fillStyle = 'rgb(' + ti[0] + ')'; q.fillRect(0, 0, p[2], p[3]); }
    prontas.set(k, c); return c;
  }
  V.peca = peca;
  // pé no chão (ou preso no alto), inclinando com o vento
  function planta(g, n, x, y, o) {
    const c = peca(n, F.atual.regiao, o && o.modo); if (!c) return; const e = (o && o.e) || 1, w = c.width * e, h = c.height * e, alto = o && o.alto, s = V.inclina(n, x, y) * (alto ? -1 : 1);
    g.save(); g.translate(Math.round(x), Math.round(y)); g.transform((o && o.v) ? -1 : 1, 0, alto ? -s : -s * ((o && o.v) ? -1 : 1) * ((o && o.v) ? -1 : 1), 1, 0, 0); const ct = o && o.corte > t ? Math.max(0.32, 1 - (o.corte - t) / 4) : 1; g.drawImage(c, Math.round(-w / 2), alto ? 0 : Math.round(-h * ct), Math.round(w), Math.round(h * ct)); g.restore();
  }

  // ---------- o que nasce no chão de cada lugar ----------
  const CHAO = {
    minas: [['seco', 0.05], ['estaca', 0.02], ['pote', 0.012], ['cogu1', 0.02]],
    floresta: [['capim1', 0.3], ['capim2', 0.2], ['flor2', 0.07], ['flor1', 0.05], ['cogu1', 0.016], ['folhas', 0.03], ['galho', 0.015]], vale: [['capim1', 0.3], ['capim2', 0.2], ['flor1', 0.12], ['flor2', 0.08], ['cogu2', 0.02], ['galho', 0.014]],
    lobos: [['seco', 0.16], ['capim1', 0.1], ['folhas', 0.02], ['galho', 0.02]], mangue: [['capim2', 0.24], ['junco', 0.15], ['capim1', 0.18], ['cogu1', 0.02], ['cogu2', 0.02]], cobras: [['capim2', 0.24], ['junco', 0.15], ['capim1', 0.18], ['cogu1', 0.02], ['cogu2', 0.02]],
    zumbis: [['seco', 0.2], ['capim1', 0.06], ['estaca', 0.018], ['pote', 0.012], ['cogu1', 0.012]], goblins: [['seco', 0.2], ['folhas', 0.04], ['pote', 0.02], ['estaca', 0.02], ['galho', 0.02]],
  };
  let areaV = null, brotos = [], penduras = [];
  // monta uma vez por área: o que brota do chão e o que pende das bordas
  function monta() {
    const A = F.atual; areaV = A.id; brotos = []; penduras = []; const l = CHAO[A.regiao] || CHAO.floresta, W = A.W, covil = A.id.startsWith('covil');
    const perto = (x, q, d) => q.some((o) => Math.abs(o.x - x) < d);
    for (let tx = 3; tx < W - 3; tx++) {
      const y = A.topo[tx] * T; if (A.topo[tx] >= F.H) continue; if (F.tile(tx, A.topo[tx] - 1) === 3) continue;
      const plano = A.topo[tx - 1] === A.topo[tx] && A.topo[tx + 1] === A.topo[tx];
      for (let k = 0; k < 2; k++) {
        const r = hash(tx * 91 + k * 37 + W); let ac = 0, n = null; for (const [m, p] of l) { ac += p * (covil ? 0.35 : 0.62); if (r < ac) { n = m; break; } } if (!n) continue;
        if (!plano && !['capim1', 'capim2', 'seco', 'flor1', 'flor2'].includes(n)) continue;
        const x = tx * T + 2 + hash(tx * 17 + k) * 12; if (perto(x, A.portas, 46) || perto(x, A.fogos, 30) || perto(x, A.circulos, 70)) continue;
        const lar = A.terreno && x > A.terreno.x0 + 40 && x < A.terreno.x1; if (lar && !['capim1', 'flor1', 'flor2'].includes(n)) continue;
        const frente = MOLE[n] && hash(tx * 5 + k * 3) < 0.4; brotos.push({ n, x, y: y + (frente ? 6 : 3), f: frente, e: 0.85 + hash(tx + k * 9) * 0.4, v: hash(tx * 3 + k) < 0.5 });
      }
      // beiradas altas: raízes e cipós descem pela parede
      for (const d of [-1, 1]) { const des = A.topo[tx + d] - A.topo[tx]; if (des >= 3 && des < 20 && hash(tx * 29 + d) < 0.72) penduras.push({ n: um2(['raiz1', 'cipo2', 'cipo1', 'raiz2'], tx), x: (d > 0 ? (tx + 1) * T : tx * T) + d * 2, y: y - 2, e: 0.9, lim: des * T }); }
    }
    // debaixo dos galhos e dos tetos
    for (let ty = 6; ty < F.H - 2; ty++) for (let tx = 2; tx < W - 2; tx++) {
      const v = F.tile(tx, ty); if (v !== 1 && v !== 2) continue; if (F.tile(tx, ty + 1) !== 0 || F.tile(tx, ty + 2) !== 0) continue; const r = hash(tx * 47 + ty * 13);
      if (v === 2 && r < 0.2) penduras.push({ n: um2(['cipo1', 'cipo2', 'raiz1'], tx), x: tx * T + 8, y: ty * T + 8, e: 0.75 });
      if (v === 1 && r < 0.13) penduras.push({ n: um2(covil || A.regiao === 'lobos' || A.regiao === 'zumbis' ? ['estala', 'raiz1', 'teia'] : ['raiz1', 'raiz2', 'cipo2', 'estala'], tx + ty), x: tx * T + 8, y: (ty + 1) * T - 3, e: 0.8 });
    }
  }
  const um2 = (l, s) => l[Math.floor(hash(s * 7 + 3) * l.length)];
  V.atras = function (g, brilhos) {
    if (areaV !== F.atual.id) monta(); const x0 = cam.x - 40, x1 = cam.x + D.VW + 40;
    for (const p of penduras) if (p.x > x0 && p.x < x1) planta(g, p.n, p.x, p.y, { alto: true, e: p.e });
    for (const b of brotos) if (!b.f && b.x > x0 && b.x < x1) { planta(g, b.n, b.x, b.y, b); if (b.n === 'cogu1') brilhos.push([b.x, b.y - 8, 40, '90,220,230', 0.4 + 0.14 * Math.sin(t * 2 + b.x)]); }
  };
  // a lâmina corta o capim: folhas voam e o tufo fica baixo por um tempo
  let ultCorte = 0;
  const VERDE = { floresta: ['#3e7a5c', '#2c5a4a', '#6aa07a'], vale: ['#5c8a4a', '#7aa05a', '#46703c'], lobos: ['#4a5a6a', '#6a7a86'], mangue: ['#7a8a3a', '#5c6c2a'], cobras: ['#7a8a3a', '#5c6c2a'], zumbis: ['#6a5c72', '#4a4052'], goblins: ['#8a5a3a', '#6a4228'] };
  function folhas(x, y, n, dir) { const c = VERDE[F.atual.regiao] || VERDE.floresta; for (let i = 0; i < n; i++) { const vida = rnd(0.5, 1.2); J.poe({ tipo: 'folha', x: x + rnd(-5, 5), y: y - rnd(2, 14), vx: dir * rnd(10, 90) + rnd(-30, 30), vy: rnd(-130, -20), grav: 190, vida, max: vida, cor: um(c), tam: 2 }); } }
  V.corta = function (h) {
    if (ultCorte === J.golpeId) return; const cx = J.golpeCaixa(h); let n = 0;
    for (let tx = Math.floor((cx.x0 - 4) / T); tx <= Math.floor((cx.x1 + 4) / T); tx++) if (Math.abs(F.atual.topo[tx] * T - h.y) < 20 && !(cortes.get(tx) > t)) { cortes.set(tx, t + 12 + hash(tx) * 6); n++; }
    for (const b of brotos) if (MOLE[b.n] > 0.04 && !(b.corte > t) && b.x > cx.x0 - 4 && b.x < cx.x1 + 4 && Math.abs(b.y - h.y) < 24) { b.corte = t + 14 + hash(b.x) * 8; n++; if (n < 5) folhas(b.x, b.y, 4, h.dir); }
    for (const d of F.atual.decor) if (MOLE[d.n] > 0.06 && d.x > cx.x0 && d.x < cx.x1 && Math.abs(d.y - h.y) < 24) { n++; folhas(d.x, d.y - 14, 3, h.dir); }
    if (n) { ultCorte = J.golpeId; if (window.Som) Som.sopro('mato', 1.2, 1.3); }
  };
  // correr pelo mato solta folhinhas e faz barulho; o pouso espalha
  let antesChao = true;
  V.rastros = function (dt) { const h = J.heroi; if (!h) return; if (h.noChao && Math.abs(h.vx) > 110 && Math.random() < dt * 5 && brotos.some((b) => Math.abs(b.x - h.x) < 10 && MOLE[b.n] > 0.1)) folhas(h.x, h.y, 1, -Math.sign(h.vx)); if (h.noChao && !antesChao && h.amassa > 0.5) folhas(h.x, h.y, 4, 0); antesChao = h.noChao; };
  // ---------- tapete de capim: folha por folha, com vento, gente passando e lâmina cortando ----------
  const GRAMA = { minas: [['#2a2420', '#3a302a', '#4a3a30'], 0.22, 3], floresta: [['#1f4a3c', '#2f6a52', '#4f8f6a'], 1, 6], vale: [['#3a5a2c', '#5a7e3a', '#86a85a'], 1, 7], lobos: [['#2c3a48', '#4a5a6a', '#7a8a96'], 0.55, 4], mangue: [['#3a4a1c', '#5c6a2a', '#8a9a46'], 1, 7], cobras: [['#3a4a1c', '#5c6a2a', '#8a9a46'], 1, 7], zumbis: [['#3a3040', '#564a5c', '#7a6a7a'], 0.5, 4], goblins: [['#4a2c18', '#6a4426', '#9a6a3a'], 0.5, 4] };
  const cortes = new Map();
  function tapete(g, frente) {
    const A = F.atual, G = GRAMA[A.regiao] || GRAMA.floresta, dens = A.id.startsWith('covil') ? G[1] * 0.4 : G[1], x0 = Math.max(2, Math.floor((cam.x - 8) / T)), x1 = Math.min(A.W - 3, Math.ceil((cam.x + D.VW + 8) / T));
    const lotes = [[], [], []];
    for (let tx = x0; tx <= x1; tx++) {
      const ty = A.topo[tx]; if (ty >= F.H || F.tile(tx, ty - 1) !== 0 || F.tile(tx, ty) !== 1) continue; if (A.terreno && tx * T > A.lugar.lago - 70 && tx * T < A.lugar.lago + 70) continue;
      const y = ty * T + (frente ? 3 : 1), inc = V.inclina('capim2', tx * T + 8, y) * 1.6, ct = cortes.get(tx), baixo = ct && ct > t ? 0.3 + 0.7 * Math.max(0, 1 - (ct - t) / 3) : 1;
      for (let i = frente ? 1 : 0; i < T; i += frente ? 3 : 2) {
        const r = hash(tx * 31 + i * 7 + (frente ? 99 : 0)); if (r > dens) continue; const x = tx * T + i, h = Math.max(1, Math.round((2 + r * G[2]) * (frente ? 0.7 : 1) * baixo)), c = hash(tx * 13 + i) * 3 | 0, ve = Math.sin(t * 2.3 + x * 0.09) * 0.25;
        lotes[c].push(x, y, h, inc + ve * (h / 6));
      }
    }
    for (let c = 0; c < 3; c++) { g.fillStyle = G[0][c]; const l = lotes[c]; for (let k = 0; k < l.length; k += 4) { const x = l[k], y = l[k + 1], h = l[k + 2], b = l[k + 3]; for (let j = 0; j < h; j++) g.fillRect(Math.round(x + b * j * j / Math.max(2, h)), y - j - 1, 1, 1); } }
  }
  V.tapeteAtras = (g) => tapete(g, false);
  V.frente = function (g) {
    tapete(g, true); const x0 = cam.x - 40, x1 = cam.x + D.VW + 40; for (const b of brotos) if (b.f && b.x > x0 && b.x < x1) planta(g, b.n, b.x, b.y, b); };
  D.repintaVivo = () => { areaV = null; };

  // ---------- dentro da terra: pedras, ossos, cristais (pintados nos pedaços guardados) ----------
  V.enterra = function (q, tx0, n, solido, luzes) {
    const A = F.atual, reg = A.regiao, OB = { minas: ['seixo', 'seixos', 'cristal', 'brasa', 'brasa', 'cranio'], floresta: ['seixo', 'seixos', 'seixo', 'cranio', 'cristal'], vale: ['seixo', 'seixos', 'seixos', 'costela'], lobos: ['seixo', 'seixos', 'costela', 'cranio', 'cristal'], mangue: ['seixos', 'cranio', 'costela', 'cristal'], cobras: ['seixos', 'cranio', 'costela', 'cristal'], zumbis: ['cranio', 'costela', 'cranio', 'seixo'], goblins: ['seixo', 'brasa', 'seixos', 'brasa', 'cranio'] }[reg] || ['seixo'];
    for (let ty = 8; ty < F.H - 2; ty += 2) for (let tx = tx0; tx < tx0 + n; tx += 3) {
      if (hash(tx * 131 + ty * 57) > 0.13) continue; let ok = true; for (let dx = -1; dx <= 2 && ok; dx++) for (let dy = -2; dy <= 1; dy++) if (!solido(tx + dx, ty + dy)) { ok = false; break; } if (!ok) continue;
      const m = OB[Math.floor(hash(tx * 7 + ty) * OB.length)], c = peca(m, reg); if (!c) continue; let prof = 0; while (prof < 14 && solido(tx, ty - prof)) prof++;
      const x = (tx - tx0) * T + hash(tx + ty) * 10, y = ty * T + hash(tx * 3 + ty) * 8, bri = m === 'cristal' || m === 'brasa'; q.globalAlpha = bri ? 0.95 : Math.max(0.16, 0.72 - prof * 0.05); q.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height / 2)); q.globalAlpha = 1;
      if (bri) luzes.push([tx0 * T + x, y, 46, m === 'cristal' ? '90,230,220' : '255,140,60', 0.75]);
    }
  };

  // ---------- fundo: bandos ao longe e olhos na mata ----------
  let bando = null, bandoT = 6;
  V.fundo = function (g, dt) {
    t += dt; const VW = D.VW, VH = D.VH, A = F.atual, covil = A.id.startsWith('covil'), noite = J.claridade ? 1 - J.claridade() : 0;
    if (!covil && noite < 0.6) {
      bandoT -= dt; if (bandoT <= 0 && !bando) { const d = Math.random() < 0.5 ? 1 : -1; bando = { d, x: d > 0 ? -60 : VW + 60, y: rnd(VH * 0.1, VH * 0.34), v: rnd(22, 36), l: Array.from({ length: 4 + Math.floor(Math.random() * 6) }, (_, i) => [-i * rnd(7, 11), (i % 2 ? 1 : -1) * i * rnd(1.6, 3.2), Math.random() * 7]) }; }
      if (bando) { bando.x += bando.d * bando.v * dt; g.fillStyle = 'rgba(16,22,24,0.55)'; for (const p of bando.l) { const x = Math.round(bando.x + p[0] * bando.d), y = Math.round(bando.y + p[1] + Math.sin(t * 0.7 + p[2]) * 3), a = Math.sin(t * 7 + p[2]); g.fillRect(x, y, 2, 1); g.fillRect(x - 2, y - (a > 0.2 ? 1 : a < -0.4 ? -1 : 0), 2, 1); g.fillRect(x + 2, y - (a > 0.2 ? 1 : a < -0.4 ? -1 : 0), 2, 1); } if (bando.x < -160 || bando.x > VW + 160) { bando = null; bandoT = rnd(9, 26); } }
    }
    // olhos que abrem e fecham entre as árvores
    if (noite > 0.35 || A.regiao === 'zumbis' || A.regiao === 'lobos') {
      const off = cam.x * 0.5, p = 170, i0 = Math.floor(off / p) - 1; g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = i0; i < i0 + Math.ceil(VW / p) + 2; i++) { const r = hash(i * 77 + 5); if (r > 0.42) continue; const ab = Math.sin(t * 0.5 + r * 60), pis = Math.sin(t * 3.1 + r * 90) > 0.97 ? 0 : 1; if (ab < 0.1) continue; const x = Math.round(i * p - off + r * 300 % p), y = Math.round(VH * (0.42 + hash(i * 3) * 0.2) - (cam.y - 190) * 0.15); g.globalAlpha = Math.min(1, ab * 1.6) * (0.35 + noite * 0.5) * pis; g.fillStyle = A.regiao === 'zumbis' ? '#b8ff9a' : A.regiao === 'goblins' ? '#ff9a50' : '#ffd86a'; g.fillRect(x, y, 2, 1); g.fillRect(x + 5, y, 2, 1); g.globalAlpha *= 0.3; g.fillRect(x - 1, y - 1, 4, 3); g.fillRect(x + 4, y - 1, 4, 3); }
      g.restore();
    }
  };
  // cipós pretos bem perto da câmera, no alto
  V.moldura = function (g) {
    const A = F.atual; if (A.id.startsWith('covil') || A.regiao === 'minas') { alto(g, ['estala'], 260, 1.6); return; } const L = { floresta: ['cipo1', 'raiz2', 'cipo2'], mangue: ['cipo1', 'cipo2', 'raiz1'], cobras: ['cipo1', 'cipo2', 'raiz1'], vale: ['cipo2'], zumbis: ['raiz1', 'raiz2'], goblins: ['raiz1'], lobos: null }[A.regiao]; if (L) alto(g, L, A.regiao === 'vale' || A.regiao === 'goblins' ? 520 : 300, 1.9);
  };
  function alto(g, l, p, e) { const off = cam.x * 1.28, i0 = Math.floor(off / p) - 1; for (let i = i0; i < i0 + Math.ceil(D.VW / p) + 2; i++) { const r = hash(i * 41 + 9); if (r < 0.42) continue; const n = l[Math.floor(hash(i * 3 + 1) * l.length)], c = peca(n, F.atual.regiao, 'sombra'); if (!c) continue; const es = e * (0.8 + r * 0.6), x = Math.round(i * p - off + r * 140), y = Math.round(-8 - r * 14 - (cam.y - 190) * 0.12); g.save(); g.translate(x, y); g.transform(1, 0, Math.sin(t * 0.9 + i) * 0.03 + V.vento(cam.x + x) * 0.03, 1, 0, 0); g.drawImage(c, Math.round(-c.width * es / 2), 0, Math.round(c.width * es), Math.round(c.height * es)); g.restore(); } }

  // ---------- bichinhos ----------
  const QUEM = { minas: ['morcego', 'rato', 'rato'], floresta: ['corvo', 'coelho', 'coelho', 'borboleta', 'borboleta', 'sapo'], vale: ['coelho', 'borboleta', 'borboleta', 'corvo', 'sapo'], lobos: ['corvo', 'corvo', 'coelho'], mangue: ['sapo', 'sapo', 'borboleta', 'rato'], cobras: ['sapo', 'sapo', 'borboleta', 'rato'], zumbis: ['corvo', 'corvo', 'rato', 'morcego'], goblins: ['rato', 'corvo', 'rato'] };
  let bichos = [], nasceT = 1, areaB = null;
  function brota() {
    const A = F.atual, covil = A.id.startsWith('covil'), noite = J.ehNoite && J.ehNoite(); let l = covil ? ['morcego', 'morcego', 'rato'] : QUEM[A.regiao] || []; if (noite) l = l.map((n) => (n === 'borboleta' || n === 'corvo' ? 'morcego' : n)); if (J.cl && J.cl('chuva', 'tempestade') > 0.4) l = l.map((n) => (n === 'borboleta' ? 'sapo' : n)); if (!l.length) return;
    const n = um(l), lado = Math.random() < 0.5 ? -1 : 1, x = cam.x + (lado < 0 ? -30 - Math.random() * 60 : D.VW + 30 + Math.random() * 60), tx = Math.floor(x / T); if (tx < 4 || tx > A.W - 5 || F.tile(tx, A.topo[tx] - 1) !== 0) return;
    const y = A.topo[tx] * T, b = { n, x, y, vx: 0, vy: 0, d: -lado, t: Math.random() * 3, e: 'calmo', q: 0, medo: 0, alvo: 0 };
    if (n === 'morcego') { b.e = 'voa'; b.y = y - rnd(90, 170); b.vx = -lado * rnd(50, 80); } else if (n === 'borboleta') { b.e = 'voa'; b.y = y - rnd(20, 60); b.cor = um(['#e8c860', '#9fd8ff', '#ffb0c0', '#f0f0e0']); }
    bichos.push(b);
  }
  function passoBicho(b, dt) {
    const h = J.heroi, A = F.atual; b.t += dt; const perto = Math.min(Math.abs(h.x - b.x) + Math.abs(h.y - b.y) * 0.6, ...J.inimigos.filter((e) => e.vivo && Math.abs(e.x - b.x) < 90).map((e) => Math.abs(e.x - b.x) + Math.abs(e.y - b.y)), 999), chao = () => { const tx = Math.max(0, Math.min(A.W - 1, Math.floor(b.x / T))); return A.topo[tx] * T; };
    if (b.n === 'borboleta') { b.x += Math.sin(b.t * 1.1 + b.alvo) * 26 * dt + b.d * 6 * dt; b.y += Math.cos(b.t * 1.9) * 22 * dt + (b.y > chao() - 16 ? -30 : b.y < chao() - 80 ? 20 : 0) * dt; if (perto < 40) b.y -= 60 * dt; return; }
    if (b.n === 'morcego') { b.x += b.vx * dt; b.y += Math.sin(b.t * 3.4) * 40 * dt; b.d = Math.sign(b.vx); return; }
    if (b.n === 'corvo') {
      if (b.e === 'calmo') { if (perto < 84) { b.e = 'voa'; b.d = b.x >= h.x ? 1 : -1; b.vx = b.d * rnd(70, 120); b.vy = -rnd(90, 130); b.t = 0; if (window.Som) Som.bicho('corvo', 0.5, (b.x - h.x) / 400); for (let i = 0; i < 4; i++) J.poe({ tipo: 'pena', x: b.x + rnd(-6, 6), y: b.y - 10, vx: rnd(-20, 20), vy: rnd(-30, 0), grav: 26, vida: 1.6, max: 1.6, cor: '#1c1a22', tam: 2 }); } else { if (b.t > 2.4) { b.t = 0; if (Math.random() < 0.4) b.d = -b.d; } } }
      else { b.vy += 22 * dt; if (b.vy > -24) b.vy = -24; b.x += b.vx * dt; b.y += b.vy * dt; }
      return;
    }
    // os de chão: sentam, pulam um pouco, e fogem quando chegam perto
    const foge = perto < (b.n === 'coelho' ? 110 : 64); if (foge && b.e !== 'foge') { b.e = 'foge'; b.t = 0; b.d = b.x >= h.x ? 1 : -1; if (b.n === 'sapo' && window.Som) Som.bicho('sapo', 0.3, (b.x - h.x) / 400); }
    if (b.e === 'foge' && b.t > 2.2 && !foge) { b.e = 'calmo'; b.t = 0; }
    const solo = chao(); const noAr = b.y < solo - 1 || b.vy < 0;
    if (!noAr && b.e === 'calmo' && b.t > rnd(1.4, 4)) { b.t = 0; if (Math.random() < 0.6) { if (Math.random() < 0.4) b.d = -b.d; if (b.n === 'rato') { b.corre = 0.5; } else { b.vy = -110; b.vx = b.d * 34; } } }
    if (b.n === 'rato') { b.corre = Math.max(0, (b.corre || 0) - dt); b.vx = b.e === 'foge' ? b.d * 130 : b.corre > 0 ? b.d * 50 : 0; b.x += b.vx * dt; const s2 = chao(); if (Math.abs(s2 - b.y) > 20) { b.x -= b.vx * dt; b.d = -b.d; } else b.y = s2; return; }
    if (b.e === 'foge' && !noAr) { b.vy = b.n === 'coelho' ? -150 : -120; b.vx = b.d * (b.n === 'coelho' ? 130 : 80); }
    if (b.y < solo || b.vy < 0) { b.vy += 620 * dt; b.y += b.vy * dt; b.x += b.vx * dt; const s2 = chao(); if (s2 < b.y - 18) { b.x -= b.vx * dt; b.d = -b.d; b.vx = -b.vx; } if (b.vy > 0 && b.y >= chao()) { b.y = chao(); b.vy = 0; b.vx = 0; } } else b.y = solo;
  }
  V.bichos = function (g, dt) {
    if (dt > 0) V.rastros(dt);
    if (areaB !== F.atual.id) { areaB = F.atual.id; bichos = []; for (let i = 0; i < 3; i++) brota(); for (const b of bichos) b.x = cam.x + Math.random() * D.VW; }
    if (!J.pref || J.pref.bichos) { nasceT -= dt; if (nasceT <= 0) { nasceT = rnd(1.6, 4); if (bichos.length < 6) brota(); } } else bichos = [];
    const im = img.bichinhos;
    for (const b of bichos) {
      if (dt > 0) passoBicho(b, dt);
      if (b.n === 'borboleta') { const a = Math.abs(Math.sin(b.t * 11)), x = Math.round(b.x), y = Math.round(b.y); g.fillStyle = b.cor; const w = 1 + Math.round(a * 2); g.fillRect(x - w, y - 2, w, 3); g.fillRect(x + 1, y - 2, w, 3); g.fillRect(x - Math.max(1, w - 1), y + 1, Math.max(1, w - 1), 1); g.fillRect(x + 1, y + 1, Math.max(1, w - 1), 1); g.fillStyle = '#1a1410'; g.fillRect(x, y - 2, 1, 4); continue; }
      const l = BI[b.n]; if (!im || !l) continue; let q = 0;
      if (b.n === 'corvo') q = b.e === 'calmo' ? (b.t % 2.4 > 1.5 ? 1 : 0) : b.vy > -26 && b.t > 2 ? 5 : 2 + Math.floor(b.t * 11) % 3; else if (b.n === 'morcego') q = 1 + Math.floor(b.t * 13) % 5; else if (b.n === 'rato') q = Math.abs(b.vx) > 5 ? 2 + Math.floor(b.t * 14) % 4 : b.t % 3 > 2 ? 1 : 0; else q = b.vy < -30 ? 3 : b.vy > 30 || (b.y < F.atual.topo[Math.max(0, Math.min(F.W - 1, Math.floor(b.x / T)))] * T - 2) ? 4 : b.t < 0.15 ? 5 : b.e === 'calmo' && b.t % 2 > 1.4 ? 1 : 0;
      const p = l[q]; g.save(); g.translate(Math.round(b.x), Math.round(b.y + 1)); g.scale(b.d < 0 ? -1 : 1, 1); const ti = b.n === 'sapo' ? 0.75 : 1; g.globalAlpha = ti; g.drawImage(im, p[0], p[1], p[2], p[3], Math.round(-p[2] / 2), -p[3], p[2], p[3]); g.restore();
    }
    bichos = bichos.filter((b) => b.x > cam.x - 200 && b.x < cam.x + D.VW + 200 && b.y > cam.y - 160);
  };

  // ---------- sons da natureza ----------
  let somT = 2, coraT = 0;
  V.sons = function (dt) {
    const S = window.Som, h = J.heroi; if (!S || !S.bicho || !h) return; const A = F.atual, covil = A.id.startsWith('covil') || (J.abrigado && J.abrigado()), noite = J.ehNoite(), mau = J.cl('chuva', 'tempestade') > 0.4;
    somT -= dt; if (somT <= 0) {
      somT = rnd(1.8, 5.5); const pan = rnd(-0.8, 0.8), v = rnd(0.25, 0.8); let l;
      if (covil || A.regiao === 'minas') l = ['gota', 'gota', 'gota', 'morcego', 'sopro']; else if (mau) l = A.regiao === 'cobras' ? ['sapo', 'sapo'] : []; else l = { floresta: noite ? ['grilo', 'grilo', 'coruja', 'grilo'] : ['pio', 'pio', 'pio2', 'pio2', 'corvo'], vale: noite ? ['grilo', 'grilo', 'sapo', 'coruja'] : ['pio', 'pio2', 'pio', 'pio2'], lobos: noite ? ['coruja', 'sopro', 'uivo', 'sopro'] : ['corvo', 'sopro', 'sopro'], mangue: noite ? ['sapo', 'sapo', 'grilo'] : ['sapo', 'pio2', 'grilo', 'gota'], cobras: noite ? ['sapo', 'sapo', 'grilo'] : ['sapo', 'pio2', 'grilo', 'gota'], zumbis: ['corvo', 'coruja', 'sopro', 'gota'], goblins: noite ? ['grilo', 'coruja', 'sopro'] : ['corvo', 'sopro'] }[A.regiao] || [];
      if (l.length && !J.chefeAtivo) S.bicho(um(l), v, pan);
    }
    // o coração, quando a vida está por um fio
    if (h.hp < h.ficha.vida * 0.28 && h.estado !== 'morto') { coraT -= dt; if (coraT <= 0) { coraT = 0.95; S.bicho('coracao', 0.9, 0); } }
  };
})();
