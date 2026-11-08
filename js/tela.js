/* SINA · Parte I: desenho do mundo. Chão em pedaços guardados, objetos ordenados por altura, luz em faixas, névoa e partículas. */
(function (raiz) {
  'use strict';
  const M = raiz.Mapa, C = raiz.Conteudo, J = raiz.Jogo, A = raiz.ARTE, T = M.T;
  const Tela = raiz.Tela = {};
  const cv = document.getElementById('c'), cx = cv.getContext('2d');
  const luz = document.createElement('canvas'), lx = luz.getContext('2d');
  let VW = 640, VH = 360;
  const IMG = {};
  Tela.cam = { x: 0, y: 0, tremor: 0 };

  function medir() {
    const lw = innerWidth || 640, lh = innerHeight || 360;
    const esc = Math.max(1, Math.round(Math.min(lw / 640, lh / 360))); // em pé ou deitado, o celular vê mais mundo em vez de ampliar demais
    VW = Math.ceil(lw / esc); VH = Math.ceil(lh / esc);
    cv.width = luz.width = VW; cv.height = luz.height = VH;
    cx.imageSmoothingEnabled = false;
    Tela.esc = esc;
  }
  addEventListener('resize', medir); medir();

  // folhas de efeito do pixelfx (MIT, Patch e Hugo Duprez): quadro, pivô no pé, colunas, quadros, momento do impacto
  const VFX = {
    faisca: { arq: 'hit-spark', w: 136, h: 80, px: 44, py: 64, c: 4, q: 16, alto: 20 },
    critico: { arq: 'crit-hit', w: 216, h: 136, px: 84, py: 106, c: 5, q: 28, alto: 20 },
  };
  Tela.carregar = function (aoPasso) {
    for (const k in VFX) { const i = new Image(); i.onload = () => { VFX[k].img = i; }; i.src = 'assets/vfx/' + VFX[k].arq + '.png'; }
    const nomes = Object.keys(A.spr);
    let feitos = 0;
    return Promise.all(nomes.map((n) => new Promise((ok) => {
      const i = new Image();
      i.onload = () => { IMG[n] = i; feitos++; aoPasso(feitos / nomes.length); ok(); };
      i.onerror = () => { console.warn('sem imagem', n); ok(); };
      i.src = 'assets/spr/' + n + '.png';
    })));
  };

  // ---------- objetos fixos ----------
  const objs = [], baldeObj = new Map();
  const rnd = (x, y, k) => M.hash(x * 7 + k * 131, y * 13 - k * 17);
  const NO = { x: 0 };
  function pôr(nome, x, y, opts) {
    if (!A.spr[nome]) return;
    const o = Object.assign({ n: nome, x, y }, opts);
    objs.push(o);
    const k = (Math.floor(x / 256) << 10) | Math.floor(y / 256);
    if (!baldeObj.has(k)) baldeObj.set(k, []); baldeObj.get(k).push(o);
    if (o.r) J.addSolido(x, y, o.r);
  }
  const reservado = (bx, by) => {
    for (const f of Object.values(C.FOGUEIRAS)) if (Math.hypot(f.x - bx, f.y - by) < 5) return true;
    for (const t of C.TESOUROS) if (Math.hypot(t.x - bx, t.y - by) < 3) return true;
    for (const n of C.NPCS) if (Math.hypot(n.x - bx, n.y - by) < 4) return true;
    for (const t of C.ERVAS) if (Math.hypot(t.x - bx, t.y - by) < 3) return true;
    for (const k of ['ermo', 'cripta']) if (Math.hypot(M.LUGARES[k][0] - bx, M.LUGARES[k][1] - by) < 7) return true;
    for (const k of ['ze', 'lobisomem', 'ticao', 'cauda', 'mina', 'gruta']) if (Math.hypot(M.LUGARES[k][0] - bx, M.LUGARES[k][1] - by) < 12) return true;
    for (const n of [[M.cr(203, 202)], [M.cr(403, 207)], [M.cr(18, 202)]]) if (Math.hypot(n[0][0] - bx, n[0][1] - by) < 5) return true;
    if (Math.hypot(M.LUGARES.alvorada[0] - bx, M.LUGARES.alvorada[1] - by) < 17) return true;
    return false;
  };
  function montarMundo() {
    const G = A.grupos;
    for (let y = 2; y < M.CRIPTA_Y - 2; y += 2) for (let x = 2; x < M.W - 2; x += 2) {
      if (M.anda(x, y) || M.CHAO[y * M.W + x] === M.AGUA) continue;
      let pertoAberto = false, acima = false;
      for (let dy = -3; dy <= 3 && !pertoAberto; dy++) for (let dx = -3; dx <= 3; dx++) if (M.anda(x + dx, y + dy)) { pertoAberto = true; break; }
      for (let dy = 1; dy <= 6 && !acima; dy++) for (let dx = -2; dx <= 2; dx++) if (M.anda(x + dx, y - dy)) { acima = true; break; }
      const r = rnd(x, y, 1), reg = M.regiao(x, y).id, B = A.biomas[reg];
      if (!acima && r < (pertoAberto ? 0.92 : 0.42)) { // a copa não pode cobrir o caminho: só onde não há nada aberto logo acima
        pôr(B.arvores[Math.floor(rnd(x, y, 9) * B.arvores.length)], x * T + (rnd(x, y, 2) - 0.5) * 54, y * T + (rnd(x, y, 3) - 0.5) * 40, { base: 12, verga: 1, reg });
      } else if (acima && pertoAberto && r < 0.78) {
        { const n_ = B.objetos[Math.floor(rnd(x, y, 4) * B.objetos.length)]; pôr(n_, x * T + (rnd(x, y, 7) - 0.5) * 40, y * T + (rnd(x, y, 8) - 0.5) * 30, { base: 6, verga: (A.baixos || []).includes(n_) ? 2 : 0, reg }); }
      }
    }
    for (let y = 0; y < M.H; y += 3) for (let x = 0; x < M.W; x += 3) {
      if (!M.anda(x, y) || reservado(x, y)) continue;
      const r = rnd(x, y, 5), cripta = y >= M.CRIPTA_Y;
      const cem = !cripta && Math.hypot(x - M.LUGARES.cemiterio[0], y - M.LUGARES.cemiterio[1]) < M.LUGARES.cemiterio[2];
      if (cripta) {
        if (r < 0.035) pôr(G.cripta[Math.floor(rnd(x, y, 6) * G.cripta.length)], x * T + 16, y * T + 16, { base: 6, r: 9 });
      } else if (cem) {
        if (r < 0.14) pôr(G.cemiterio[Math.floor(rnd(x, y, 6) * G.cemiterio.length)], x * T + 16, y * T + 16, { base: 5, r: 8 });
      } else if (M.CHAO[y * M.W + x] !== M.TERRA) {
        const reg = M.regiao(x, y), B = A.biomas[reg.id], dens = { campos: 0.05, mata: 0.09, mangue: 0.08, serra: 0.075, sertao: 0.045, cinzas: 0.06 }[reg.id];
        const jx = (rnd(x, y, 11) - 0.5) * 60, jy = (rnd(x, y, 12) - 0.5) * 60;
        if (r < dens * 0.32) pôr(B.arvores[Math.floor(rnd(x, y, 9) * B.arvores.length)], x * T + jx, y * T + jy, { base: 12, r: 10, verga: 1, reg: reg.id });
        else if (r < dens) { const n = B.objetos[Math.floor(rnd(x, y, 6) * B.objetos.length)], baixo = (A.baixos || []).includes(n); pôr(n, x * T + jx, y * T + jy, { base: 6, r: baixo ? 0 : 8, cogu: (A.cogumelos || []).includes(n), verga: baixo ? 2 : 0, reg: reg.id }); }
      }
    }
    // Ruínas de Alvorada, em volta da praça
    const al = M.LUGARES.alvorada;
    for (const [dx, dy, n] of [[-14, -12, 'casa1'], [14, -12, 'casa2'], [-16, 8, 'casa2'], [17, 10, 'casa1'], [-4, 14, 'casa1'], [8, 15, 'casa2']]) pôr(n, (al[0] + dx) * T, (al[1] + dy) * T, { base: 12, r: 50 });
    pôr('fonte', al[0] * T, (al[1] - 3) * T, { base: 6, r: 24 });
    for (const [dx, dy] of [[-10, -14], [10, -14], [-20, 0], [20, 0], [-8, 11], [10, 12]]) pôr(A.tocha, (al[0] + dx) * T, (al[1] + dy) * T, { base: 4, tocha: 1, r: 7 });
    for (const k of ['toca', 'ze', 'ticao', 'cemiterio', 'ybira', 'torre', 'sertao', 'cinzas']) {
      const l = M.LUGARES[k];
      for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.28 + rnd(l[0], i, 21), d = l[2] * 0.82, x = Math.round(l[0] + Math.cos(a) * d), y = Math.round(l[1] + Math.sin(a) * d); if (M.anda(x, y) && !reservado(x, y)) pôr(A.tocha, x * T, y * T, { base: 4, tocha: 1, r: 7 }); }
    }
    // ruínas espalhadas: colunas e estátuas contam uma Aruanã que já foi grande
    for (let n = 0; n < 150; n++) {
      const x = Math.floor(rnd(n, 7, 31) * M.W), y = Math.floor(rnd(n, 11, 32) * M.CRIPTA_Y);
      if (!M.anda(x, y) || reservado(x, y) || M.CHAO[y * M.W + x] === M.TERRA) continue;
      const q = 2 + Math.floor(rnd(n, 3, 33) * 5);
      for (let i = 0; i < q; i++) {
        const ax = x + Math.floor((rnd(n, i, 34) - 0.5) * 12), ay = y + Math.floor((rnd(n, i, 35) - 0.5) * 12);
        if (!M.anda(ax, ay) || reservado(ax, ay)) continue;
        const lista = i === 0 && rnd(n, i, 36) < 0.5 && A.estatuas.length ? A.estatuas : A.ruinas;
        if (lista.length) pôr(lista[Math.floor(rnd(n, i, 37) * lista.length)], ax * T + 16, ay * T + 16, { base: 5, r: 9 });
      }
    }
    // fontes secas e de água estranha, longe da vila
    if (A.fontes && A.fontes.length) for (let n = 0; n < 60; n++) {
      const x = Math.floor(rnd(n, 17, 41) * M.W), y = Math.floor(rnd(n, 19, 42) * M.CRIPTA_Y);
      if (M.anda(x, y) && !reservado(x, y) && M.CHAO[y * M.W + x] !== M.TERRA) pôr(A.fontes[Math.floor(rnd(n, 2, 43) * A.fontes.length)], x * T + 16, y * T + 16, { base: 6, r: 14 });
    }
    const cr = M.LUGARES.cripta;
    pôr('entrada', cr[0] * T, cr[1] * T, { base: 10, r: 46 });
    for (const k of ['mina', 'gruta']) pôr(k === 'mina' ? 'entrada_mina' : 'entrada_gruta', M.LUGARES[k][0] * T, (M.LUGARES[k][1] - 5) * T, { base: 10, r: 46 });
    for (const [x, y] of [[12, 201], [25, 201], [52, 197], [71, 197], [46, 229], [79, 229], [112, 231], [121, 231], [144, 219], [176, 219], [201, 197], [214, 197], [242, 193], [260, 193], [288, 195], [304, 195], [282, 229], [310, 229], [230, 229], [254, 229], [402, 201], [414, 201], [440, 197], [456, 197], [482, 199], [498, 199], [474, 231], [510, 231], [432, 233], [458, 233]]) { const c = M.cr(x, y); pôr(A.tocha, c[0] * T, c[1] * T + 12, { base: 4, tocha: 1 }); }
    for (const t of C.TESOUROS) pôr(A.bau, t.x * T + 16, t.y * T + 16, { base: 6, bau: t.id });
    for (const t of C.ERVAS) pôr(A.erva, t.x * T + 16, t.y * T + 16, { base: 6, erva: t.id });
  }

  // ---------- chão ----------
  const CHUNK = 16, cachos = new Map();
  function tile(i, x, y) { return i[Math.floor(M.hash(x, y) * i.length)]; }
  // moita: aglomerado de folhas em blocos de 2 px, na cor da região, cada vez mais escura para dentro do mato
  const CORES_MOITA = { campos: ['#24401f', '#2f5028', '#172c1a', '#466a32'], mata: ['#10302b', '#173f37', '#0a2321', '#265a48'], mangue: ['#2c3a18', '#3c4c20', '#1c2810', '#566a2c'], serra: ['#2a3440', '#38444e', '#1c242e', '#55636e'], sertao: ['#4a3c20', '#5e4c28', '#352a16', '#7c6636'], cinzas: ['#2e1a18', '#3e2420', '#1e100e', '#5a3026'] };
  function moita(g, dx, dy, x, y, d) {
    const idReg = M.regiao(x, y).id, c = CORES_MOITA[idReg] || CORES_MOITA.mata;
    const k = d >= 3 ? 0.55 : d === 2 ? 0.8 : 1;
    const fol = IMG['moita_' + idReg];
    if (fol) g.drawImage(fol, (x * T) % 96, (y * T) % 96, T, T, dx, dy, T, T);
    else for (let b = 0; b < T; b += 2) for (let a = 0; a < T; a += 2) {
      const wx = x * T + a, wy = y * T + b, n = M.ruido(wx * 0.11, wy * 0.11) * 0.7 + M.hash(wx >> 1, wy >> 1) * 0.3;
      g.globalAlpha = k >= 1 ? 1 : 1;
      g.fillStyle = n > 0.68 ? c[3] : n > 0.52 ? c[1] : n > 0.34 ? c[0] : c[2];
      g.fillRect(dx + a, dy + b, 2, 2);
    }
    g.globalAlpha = 1;
    if (k < 1) { g.fillStyle = 'rgba(2,8,12,' + (1 - k) + ')'; g.fillRect(dx, dy, T, T); }
    // sombra projetada no chão aberto logo abaixo
    if (M.anda(x, y + 1)) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(dx, dy + T - 4, T, 4); }
  }
  function pintaChunk(cc, cl) {
    const c = document.createElement('canvas'); c.width = c.height = CHUNK * T;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const canto = (x, y) => (x >= 0 && y >= 0 && x < M.W && y < M.H && M.CHAO[y * M.W + x] === M.TERRA ? 'l' : 'u');
    const parede = IMG.parede, piso = IMG.piso;
    for (let y = cl * CHUNK; y < (cl + 1) * CHUNK; y++) for (let x = cc * CHUNK; x < (cc + 1) * CHUNK; x++) {
      if (x >= M.W || y >= M.H) continue;
      const dx = (x - cc * CHUNK) * T, dy = (y - cl * CHUNK) * T, v = M.CHAO[y * M.W + x];
      if (v === M.AGUA) {
        const borda = [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([a, b]) => M.anda(x + a, y + b));
        if (IMG.agua) g.drawImage(IMG.agua, Math.floor(M.hash(x, y) * 2) * 32, borda ? 32 : 0, 32, 32, dx, dy, T, T);
      } else if (v === M.PISO) {
        if (piso) g.drawImage(piso, (x % 4) * T, (y % 4) * T, T, T, dx, dy, T, T);
      } else if (v === M.PAREDE) {
        const sob = M.anda(x, y + 1), sob2 = M.anda(x, y + 2);
        if (sob || sob2) {
          if (parede) g.drawImage(parede, (x % 4) * 32, sob ? 32 : 0, 32, 32, dx, dy, T, T);
          g.fillStyle = sob ? 'rgba(4,8,12,0.1)' : 'rgba(4,8,12,0.55)'; g.fillRect(dx, dy, T, T);
          if (sob) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(dx, dy + T - 3, T, 3); }
        } else { g.fillStyle = '#04070a'; g.fillRect(dx, dy, T, T); }
      } else {
        const k = canto(x, y) + canto(x + 1, y) + canto(x, y + 1) + canto(x + 1, y + 1);
        const reg0 = M.regiao(x, y), p = tile(A.tiles[k], x, y), folha = IMG['chao_' + reg0.id];
        if (folha) g.drawImage(folha, p[0], p[1], T, T, dx, dy, T, T);
        // fronteira entre regiões: em vez de degrau quadrado, pedacinhos de uma entram na outra
        let vizinha = null;
        for (const [a, b] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, 2], [-2, 2], [2, -2]]) { const r_ = M.regiao(x + a, y + b); if (r_ !== reg0) { vizinha = r_; break; } }
        if (vizinha && IMG['chao_' + vizinha.id]) {
          const outra = IMG['chao_' + vizinha.id];
          for (let b = 0; b < T; b += 4) for (let a = 0; a < T; a += 4) {
            const wx = x * T + a, wy = y * T + b;
            const qx = Math.floor((wx + (M.ruido(wx * 0.025, wy * 0.025) - 0.5) * 150 + (M.hash(wx >> 2, wy >> 2) - 0.5) * 34) / T);
            const qy = Math.floor((wy + (M.ruido(wx * 0.025 + 50, wy * 0.025) - 0.5) * 150 + (M.hash(wy >> 2, wx >> 2) - 0.5) * 34) / T);
            if (M.regiao(qx, qy) === vizinha) g.drawImage(outra, p[0] + a, p[1] + b, 4, 4, dx + a, dy + b, 4, 4);
          }
        }
        if (v === M.MATA) {
          let d = 3; // distância até o aberto mais próximo, em blocos
          for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) if (M.anda(x + a, y + b)) d = Math.min(d, Math.max(Math.abs(a), Math.abs(b)));
          moita(g, dx, dy, x, y, d);
        }
      }
    }
    // folhas invadem o chão aberto: a beirada do mato deixa de ser um degrau reto
    for (let y = cl * CHUNK; y < (cl + 1) * CHUNK; y++) for (let x = cc * CHUNK; x < (cc + 1) * CHUNK; x++) {
      if (y >= M.CRIPTA_Y || x >= M.W || M.CHAO[y * M.W + x] !== M.MATA) continue;
      const c = CORES_MOITA[M.regiao(x, y).id] || CORES_MOITA.mata;
      const dx = (x - cc * CHUNK) * T, dy = (y - cl * CHUNK) * T;
      for (const [vx, vy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!M.anda(x + vx, y + vy)) continue;
        for (let p = 0; p < T; p += 2) for (let d_ = 0; d_ < 14; d_ += 2) {
          const px = vx ? (vx > 0 ? T + d_ : -2 - d_) : p, py = vy ? (vy > 0 ? T + d_ : -2 - d_) : p;
          const n = M.hash(x * T + px, y * T + py);
          if (n > 0.85 - d_ * 0.06) continue;
          g.fillStyle = n < 0.14 ? c[3] : n < 0.4 ? c[1] : n < 0.62 ? c[0] : c[2];
          g.fillRect(dx + px, dy + py, 2, 2);
        }
      }
    }
    if (IMG.musgo1) for (let q = 0; q < 10; q++) {
      const x = cc * CHUNK + Math.floor(M.hash(cc * 7 + q, cl) * CHUNK), y = cl * CHUNK + Math.floor(M.hash(cl * 9, cc + q * 3) * CHUNK);
      if (!M.anda(x, y) || y >= M.CRIPTA_Y || M.CHAO[y * M.W + x] === M.TERRA) continue;
      const n = A.musgos[Math.floor(M.hash(x, y) * A.musgos.length)];
      if (IMG[n] && M.regiao(x, y).id !== 'sertao') { g.globalAlpha = 0.55; g.drawImage(IMG[n], (x - cc * CHUNK) * T, (y - cl * CHUNK) * T); g.globalAlpha = 1; }
    }
    if (IMG.vitoria_regia) for (let y = cl * CHUNK + 1; y < (cl + 1) * CHUNK - 1; y++) for (let x = cc * CHUNK + 1; x < (cc + 1) * CHUNK - 1; x++) {
      if (x >= M.W || y >= M.H || M.CHAO[y * M.W + x] !== M.AGUA || M.hash(x + 3, y + 91) > 0.03) continue;
      g.drawImage(IMG.vitoria_regia, (x - cc * CHUNK) * T - 8, (y - cl * CHUNK) * T - 8);
    }
    // miúdos: plantinhas e sangue seco pintados no chão, sem custo por quadro
    const fora = (x, y) => y >= M.CRIPTA_Y || !M.anda(x, y) || M.CHAO[y * M.W + x] === M.TERRA;
    for (let q = 0; q < 24; q++) {
      const px = 28 + Math.floor(M.hash(cc * 11 + q, cl * 3 + 1) * (CHUNK * T - 56)), py = 28 + Math.floor(M.hash(cl * 13 + q * 7, cc + 2) * (CHUNK * T - 56));
      const x = cc * CHUNK + Math.floor(px / T), y = cl * CHUNK + Math.floor(py / T);
      if (fora(x, y)) continue;
      const lista = (A.miudos || {})[M.regiao(x, y).id] || [], n = lista[Math.floor(M.hash(x * 3 + q, y) * lista.length)], i = IMG[n];
      if (i) { const s = A.spr[n]; g.drawImage(i, px - Math.floor(s.w / 2), py - s.h); }
    }
    for (let q = 0; q < 3; q++) {
      const px = 24 + Math.floor(M.hash(cc * 17 + q, cl * 5 + 8) * (CHUNK * T - 48)), py = 24 + Math.floor(M.hash(cl * 19 + q, cc * 3 + 4) * (CHUNK * T - 48));
      const x = cc * CHUNK + Math.floor(px / T), y = cl * CHUNK + Math.floor(py / T);
      if (fora(x, y) || !A.sangue || M.hash(x, y + 77) > ({ cinzas: 0.5, sertao: 0.28, serra: 0.25, mangue: 0.2, mata: 0.14, campos: 0.1 }[M.regiao(x, y).id] || 0.1)) continue;
      const i = IMG[A.sangue[Math.floor(M.hash(y, x + 9) * A.sangue.length)]];
      if (i) { g.globalAlpha = 0.7; g.drawImage(i, px - 16, py - 16); g.globalAlpha = 1; }
    }
    // manchas grandes em blocos de 4 px: escondem a repetição dos blocos sem borrar o pixel
    for (let y = 0; y < CHUNK * T; y += 4) for (let x = 0; x < CHUNK * T; x += 4) {
      const wx = cc * CHUNK * T + x, wy = cl * CHUNK * T + y;
      const n = M.ruido(wx * 0.014, wy * 0.014) * 0.65 + M.ruido(wx * 0.05, wy * 0.05) * 0.35;
      if (n < 0.46) { g.fillStyle = 'rgba(2,8,12,' + (0.46 - n) * 1.25 + ')'; g.fillRect(x, y, 4, 4); }
      else if (n > 0.58) { g.fillStyle = 'rgba(120,150,120,' + (n - 0.58) * 0.28 + ')'; g.fillRect(x, y, 4, 4); }
    }
    return c;
  }
  function chunk(cc, cl) {
    const k = cc * 1000 + cl;
    let c = cachos.get(k);
    if (!c) {
      if (cachos.size > (innerWidth < 900 ? 16 : 36)) cachos.delete(cachos.keys().next().value); // guarda só os mais recentes, por causa do celular
      c = pintaChunk(cc, cl); cachos.set(k, c);
    } else { cachos.delete(k); cachos.set(k, c); }
    return c;
  }

  // ---------- partículas ----------
  const pts = [];
  Tela.pts = pts;
  Tela.sangue = function (x, y, n, cor) {
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 30 + Math.random() * 80; pts.push({ x, y: y - 18, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, g: 180, vida: 0.3 + Math.random() * 0.45, cor }); }
  };
  Tela.fagulhas = function (x, y, n, cor, sobe) {
    for (let i = 0; i < n; i++) pts.push({ x: x + (Math.random() - 0.5) * 20, y: y - Math.random() * 16, vx: (Math.random() - 0.5) * 18, vy: -(sobe || 18) - Math.random() * 26, g: 0, vida: 0.7 + Math.random() * 1.1, cor });
  };

  // ---------- nevoa ----------
  let nevoa;
  function montarNevoa() {
    nevoa = document.createElement('canvas'); nevoa.width = 512; nevoa.height = 256;
    const g = nevoa.getContext('2d');
    for (let i = 0; i < 420; i++) {
      const x = Math.random() * 512, y = Math.random() * 256, r = 6 + Math.random() * 26;
      g.fillStyle = 'rgba(150,205,205,0.022)';
      for (let dx = -r; dx < r; dx += 2) for (let dy = -r * 0.5; dy < r * 0.5; dy += 2) if (dx * dx + 4 * dy * dy < r * r) g.fillRect(((x + dx) | 0) & ~1, ((y + dy) | 0) & ~1, 2, 2);
    }
  }

  // ---------- sprites ----------
  let escalaFolha = 1, pose = null; // pose: {dx, dy, sx, sy, rot} aplicada ao próximo desenho de folha
  function folha(nome, q, x, y, inverte, extraFundo) {
    const info = A.spr[nome], im = IMG[nome];
    if (!im) return false;
    const w = info.w, h = info.h, f = ((Math.floor(q) % info.n) + info.n) % info.n;
    // os quadros maiores que 64 são centrados: o pé fica sempre na mesma altura
    const fundo = (info.fundo != null ? info.fundo : (h - 64) / 2 + 2) + (extraFundo || 0);
    const k = escalaFolha, dw = w * k, dh = h * k, p = pose || {};
    const pinta = (G, mx, my) => { // chefes maiores e corpos em movimento: tudo gira e estica em volta do pé
      G.save(); G.translate(Math.round(x + (p.dx || 0)) + mx, Math.round(y + fundo * k + (p.dy || 0)) + my);
      if (p.rot) G.rotate(p.rot);
      G.scale((inverte ? -1 : 1) * (p.sx || 1), p.sy || 1);
      G.drawImage(im, f * w, 0, w, h, -dw / 2, -dh, dw, dh); G.restore();
    };
    if (k === 1 && !pose && !aro) {
      if (inverte) { cx.save(); cx.translate(Math.round(x), 0); cx.scale(-1, 1); cx.drawImage(im, f * w, 0, w, h, -w / 2, Math.round(y - h + fundo), w, h); cx.restore(); }
      else cx.drawImage(im, f * w, 0, w, h, Math.round(x - w / 2), Math.round(y - h + fundo), w, h);
      return true;
    }
    pinta(cx, 0, 0);
    if (aro) contorno(pinta, x, y, Math.max(dw, dh) * 0.75 + 12);
    return true;
  }
  // ---------- luz no relevo: o lado virado para o fogo ganha um contorno quente ----------
  let aro = null, fontesLuz = [], camX = 0, camY = 0;
  const aroC = document.createElement('canvas'), aroG = aroC.getContext('2d');
  function luzPara(x, y) {
    let melhor = null, nota = 0;
    for (const L of fontesLuz) {
      const dx = L[0] - x, dy = L[1] - (y - 26), d = Math.hypot(dx, dy);
      if (d > L[2] || d < 4) continue;
      const k = (1 - d / L[2]) * L[3];
      if (k > nota) { nota = k; melhor = { dx: dx / d, dy: dy / d, k }; }
    }
    return melhor && melhor.k > 0.06 ? melhor : null;
  }
  function contorno(pinta, x, y, raio) {
    if (aroC.width !== VW || aroC.height !== VH) { aroC.width = VW; aroC.height = VH; }
    const sx = Math.round(x - camX - raio), sy = Math.round(y - camY - raio * 1.6), lw = Math.round(raio * 2), lh = Math.round(raio * 1.9);
    aroG.setTransform(1, 0, 0, 1, 0, 0); aroG.clearRect(sx, sy, lw, lh);
    aroG.imageSmoothingEnabled = false;
    aroG.setTransform(1, 0, 0, 1, -camX, -camY);
    aroG.globalCompositeOperation = 'source-over'; pinta(aroG, 0, 0);
    // tira o próprio corpo deslocado para o lado do fogo: sobra só a borda que encara a luz
    aroG.globalCompositeOperation = 'destination-out'; pinta(aroG, -Math.round(aro.dx * 2), -Math.round(aro.dy * 2));
    aroG.setTransform(1, 0, 0, 1, 0, 0);
    aroG.globalCompositeOperation = 'source-in'; aroG.fillStyle = '#ffa04a'; aroG.fillRect(sx, sy, lw, lh);
    aroG.globalCompositeOperation = 'source-over';
    cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = Math.min(0.9, aro.k);
    cx.drawImage(aroC, sx, sy, lw, lh, sx, sy, lw, lh);
    cx.restore();
  }
  // silhueta preta de qualquer peça: serve para sombra no chão e copa na frente da câmera
  const SILH = {};
  function silh(n, im) {
    if (SILH[n]) return SILH[n];
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#02070a'; g.fillRect(0, 0, c.width, c.height);
    return (SILH[n] = c);
  }
  function sombra(x, y, r) {
    cx.fillStyle = 'rgba(2,6,10,0.5)';
    for (let i = -r; i <= r; i++) { const h = Math.round(Math.sqrt(1 - (i * i) / (r * r)) * r * 0.32); cx.fillRect(Math.round(x + i), Math.round(y - h), 1, h * 2 + 1); }
  }
  const lado = (a) => { const c = Math.cos(a), s = Math.sin(a); if (Math.abs(c) >= Math.abs(s)) return c >= 0 ? 'e' : 'w'; return s >= 0 ? 's' : 'n'; };

  function heroi() {
    const P = J.P, d = lado(P.ang), inv = d === 'w', base = d === 'w' ? 'e' : d;
    if (P.estado === 'morto') {
      cx.globalAlpha = Math.max(0, 1 - P.t * 0.5);
      folha('rola', 1, P.x, P.y + 4, false); cx.globalAlpha = 1; return;
    }
    sombra(P.x, P.y - 1, 13);
    if (P.inv > 0 && P.estado !== 'rola' && Math.floor(P.inv * 20) % 2) cx.globalAlpha = 0.45;
    if (P.estado === 'rola') {
      const nome = 'heroi_' + base, info = A.spr[nome], im = IMG[nome], k = Math.min(1, P.t / 0.46);
      if (im) {
        const sobe = Math.sin(k * Math.PI);          // abaixa no meio do movimento
        const achata = 1 - sobe * 0.28, estica = 1 + sobe * 0.16, incl = (inv ? -1 : 1) * (d === 'e' || d === 'w' ? sobe * 0.34 : 0);
        const q = Math.floor(P.t * 22) % info.n, fundo = info.fundo != null ? info.fundo : 2;
        const pinta = (x, y, a) => {
          cx.save(); cx.globalAlpha = a; cx.translate(Math.round(x), Math.round(y)); cx.rotate(incl); cx.scale((inv ? -1 : 1) * estica, achata);
          cx.drawImage(im, q * info.w, 0, info.w, info.h, -info.w / 2, -info.h + fundo, info.w, info.h);
          cx.restore();
        };
        for (const [atras, a] of [[34, 0.14], [22, 0.22], [11, 0.32]]) pinta(P.x - P.dirX * atras * sobe, P.y - P.dirY * atras * sobe, a); // rastro
        pinta(P.x, P.y, 1);
        if (Math.random() < 0.6) pts.push({ x: P.x - P.dirX * 12 + (Math.random() - 0.5) * 10, y: P.y - 2, vx: -P.dirX * 20, vy: -8, g: 0, vida: 0.4, cor: 'rgba(170,160,140,0.6)' });
      }
      cx.globalAlpha = 1; return;
    }
    if (P.estado === 'golpe') {
      const k = P.t / P.dGolpe;
      const n = 'golpe_' + base, info = A.spr[n] || A.spr.golpe_e;
      // o corpo acompanha a lâmina: avança no meio do golpe e volta
      const av = Math.sin(Math.min(1, k) * Math.PI) * (P.forte ? 5 : 3);
      pose = { dx: Math.cos(P.ang) * av, dy: Math.sin(P.ang) * av * 0.5, sx: 1 + av * 0.012, sy: 1 - av * 0.008 };
      folha(A.spr[n] ? n : 'golpe_e', Math.min(info.n - 1, k * info.n), P.x, P.y, inv);
      pose = null;
      if (P.forte && P.t < P.hitIni) { cx.fillStyle = 'rgba(255,190,90,0.7)'; cx.fillRect(Math.round(P.x + Math.cos(P.ang) * 20), Math.round(P.y - 30 + Math.sin(P.ang) * 8), 2, 2); }
      cx.globalAlpha = 1; return;
    }
    if (P.estado === 'dor') {
      // tranco: o corpo joga para trás e volta
      const a = Math.max(0, 1 - P.t / 0.22), lado_ = Math.cos(P.ang) >= 0 ? 1 : -1;
      pose = { dx: -Math.cos(P.ang) * 4 * a, dy: -Math.sin(P.ang) * 2 * a, rot: -lado_ * 0.22 * a, sx: 1 - 0.06 * a, sy: 1 + 0.04 * a };
      folha('heroi_' + base + '0', 0, P.x, P.y, inv);
      pose = null;
    } else if (P.andando && P.estado === 'livre') folha('heroi_' + base, P.passo, P.x, P.y, inv);
    else {
      // parado, respira: um fôlego lento, maior quando o vigor está baixo
      const canso = 1 - Math.min(1, P.vigor / J.vigorMax()), f_ = Math.sin(J.tempo * (2.2 + canso * 2.5)) * (0.012 + canso * 0.02);
      pose = { sy: 1 + f_, sx: 1 - f_ * 0.5 };
      folha('heroi_' + base + '0', 0, P.x, P.y, inv);
      pose = null;
    }
    if (P.estado === 'bebe') Tela.fagulhas(P.x, P.y - 26, 1, '#7ce0a8', 8);
    cx.globalAlpha = 1;
  }
  function inimigo(e) {
    escalaFolha = e.d.chefe || e.d.lenda || 1;
    desenhaInimigo(e);
    escalaFolha = 1;
  }
  function desenhaInimigo(e) {
    const d = e.d, s = d.spr;
    if (e.estado === 'morto') {
      cx.globalAlpha = Math.max(0, 1 - e.t / (d.chefe ? 3 : 1.4));
      // cai de lado antes de sumir; quem voa só desaba
      if (!d.chefe) { const k = Math.min(1, e.t / 0.32), q = k * k, lado_ = Math.cos(e.ang) < 0 ? 1 : -1; pose = d.voa ? { sy: 1 - q * 0.5, dy: q * 4 } : { rot: lado_ * q * 1.35, dy: q * 3, sy: 1 - q * 0.15 }; }
      folha(s + '_e', 0, e.x, e.y, Math.cos(e.ang) < 0);
      pose = null;
      cx.globalAlpha = 1; return;
    }
    sombra(e.x, e.y - 1, d.chefe ? 22 : 14);
    if (e.estado === 'prepara' && !d.atira && e.tipoGolpe !== 'tremor') {
      // aviso no chão: mostra de onde vem o golpe
      cx.fillStyle = 'rgba(200,40,30,' + Math.min(0.24, (e.t / e.resta) * 0.3) + ')';
      cx.beginPath(); cx.moveTo(e.x, e.y - 2); cx.arc(e.x, e.y - 2, (d.salta ? 60 : d.alcance) + 6, e.ang - 1.15, e.ang + 1.15); cx.fill();
    }
    if (e.estado === 'prepara' && e.tipoGolpe === 'tremor') {
      cx.strokeStyle = 'rgba(240,80,40,' + Math.min(0.8, e.t / e.resta) + ')'; cx.lineWidth = 2;
      cx.beginPath(); cx.arc(e.x, e.y, 30 * (1 - e.t / e.resta) + 12, 0, 7); cx.stroke();
    }
    if (d.aura && Math.random() < 0.5) { const q = Math.random() * 6.28; pts.push({ x: e.x + Math.cos(q) * d.r * 1.4, y: e.y - 20 - Math.random() * 40, vx: 0, vy: -24, g: 0, vida: 0.7, cor: d.aura }); }
    if (e.flash > 0) cx.filter = 'brightness(3) saturate(0.2)';
    else if (e.estado === 'prepara') cx.filter = 'brightness(1.45) saturate(1.3)';
    else if (e.estado === 'atordoado') cx.filter = 'brightness(0.7)';
    const inv = Math.cos(e.ang) < 0, sul = Math.sin(e.ang) > 0.75;
    const atk = e.estado === 'golpe' || e.estado === 'prepara';
    // corpo em movimento: quem não tem quadros de ataque próprios recua, estica e avança no golpe
    {
      const temGolpe = !!A.spr[s + '_ge'], fr = inv ? -1 : 1, ca = Math.cos(e.ang), sa = Math.sin(e.ang);
      const p = { dx: 0, dy: 0, sx: 1, sy: 1, rot: 0 };
      if (e.estado === 'prepara' && e.tipoGolpe !== 'tremor') {
        const k = Math.min(1, e.t / e.resta), tr = k > 0.8 ? Math.sin(e.t * 70) * 0.6 : 0; // treme no fim: o golpe vai sair
        const forca = temGolpe ? 0.4 : 1;
        p.dx = -ca * 4 * k * forca + tr; p.dy = -sa * 2 * k * forca;
        p.rot = -fr * 0.14 * k * forca; p.sx = 1 + 0.05 * k * forca; p.sy = 1 - 0.08 * k * forca;
      } else if (e.estado === 'prepara') { // tremor: agacha antes de bater no chão
        const k = Math.min(1, e.t / e.resta); p.sy = 1 - 0.14 * k; p.sx = 1 + 0.1 * k;
      } else if (e.estado === 'golpe' && !d.atira) {
        const pr = e.t / e.resta, a = pr < 0.25 ? pr / 0.25 : Math.max(0, 1 - (pr - 0.25) / 0.75), forca = temGolpe ? 0.4 : 1;
        p.dx = ca * 7 * a * forca; p.dy = sa * 3.5 * a * forca; p.rot = fr * 0.2 * a * forca; p.sx = 1 + 0.12 * a * forca; p.sy = 1 - 0.07 * a * forca;
      } else if (e.estado === 'golpe' && d.atira) { // disparo: coice para trás
        const a = Math.max(0, 1 - e.t / Math.max(0.08, e.resta)); p.dx = -ca * 3 * a; p.sy = 1 + 0.05 * a;
      } else if (e.estado === 'atordoado') { // cambaleia
        const a = Math.max(0, 1 - e.t / Math.max(0.1, e.atord)); p.rot = Math.sin(e.t * 34) * 0.16 * a; p.dx = Math.sin(e.t * 22) * 2 * a; p.sy = 1 - 0.06 * a;
      } else if (d.voa) { // quem voa paira
        p.dy = Math.sin(J.tempo * 4 + e.id) * 2.5;
      }
      if (e.flash > 0) { const f_ = e.flash / 0.12; p.sx *= 1 + 0.1 * f_; p.sy *= 1 - 0.1 * f_; }
      pose = p;
    }
    if (atk) {
      const pref = sul && A.spr[s + '_gs'] ? s + '_gs' : s + '_ge';
      if (A.spr[pref]) {
        const info = A.spr[pref], k = e.estado === 'prepara' ? (e.t / e.resta) * 0.45 : 0.45 + (e.t / e.resta) * 0.55;
        folha(pref, Math.min(info.n - 1, k * info.n), e.x, e.y, pref.endsWith('gs') ? false : inv);
      } else folha(s + '_e', 0, e.x, e.y, inv);
    } else if (sul && A.spr[s + '_s']) folha(s + '_s', e.passo, e.x, e.y, false);
    else if (Math.sin(e.ang) < -0.75 && A.spr[s + '_n']) folha(s + '_n', e.passo, e.x, e.y, false);
    else folha(s + '_e', e.passo, e.x, e.y, inv);
    pose = null;
    cx.filter = 'none';
    if (e.estado === 'golpe' && !d.atira && e.tipoGolpe !== 'tremor') {
      const k = escalaFolha, rr = (d.alcance * 0.7 + 16) * Math.min(1.25, k), prog = Math.min(1, e.t / e.resta);
      meiaLua(e.x, e.y - 20, rr, e.ang - 0.9, e.ang - 0.9 + 1.8 * prog, 4 + (k > 1 ? 2 : 0), PAL.inimigo, prog > 0.8 ? (prog - 0.8) * 5 : 0);
    }
    if (e.hp < e.hpMax && !d.chefe) {
      const L_ = d.lenda ? 46 : 24, ty = d.lenda ? 84 : 56;
      cx.fillStyle = '#0a0c0e'; cx.fillRect(Math.round(e.x - L_ / 2 - 1), Math.round(e.y - ty), L_ + 2, 3);
      cx.fillStyle = d.lenda ? '#c8822a' : '#a02a24'; cx.fillRect(Math.round(e.x - L_ / 2), Math.round(e.y - ty + 1), Math.max(0, L_ * e.hp / e.hpMax), 1);
    }
    if (J.P.alvo === e) {
      cx.fillStyle = '#e8d08a';
      cx.fillRect(Math.round(e.x - 1), Math.round(e.y - 62), 3, 3);
    }
  }

  function silhueta(e) {
    const s = e.d.spr, inv = Math.cos(e.ang) < 0;
    escalaFolha = e.d.chefe || e.d.lenda || 1;
    if (e.estado === 'golpe' && A.spr[s + '_ge']) folha(s + '_ge', A.spr[s + '_ge'].n - 2, e.x, e.y, inv);
    else folha(s + '_e', e.passo, e.x, e.y, inv);
    escalaFolha = 1;
  }

  // ---------- luz ----------
  function furo(x, y, r, forca, faixas) {
    lx.fillStyle = 'rgba(0,0,0,' + (1 - Math.pow(1 - forca, 1 / faixas)) + ')';
    for (let i = 0; i < faixas; i++) { lx.beginPath(); lx.arc(x, y, r * (1 - i / faixas), 0, 7); lx.fill(); }
  }
  function brilho(x, y, r, cor, faixas) {
    cx.fillStyle = cor;
    for (let i = 0; i < faixas; i++) { cx.beginPath(); cx.arc(x, y, r * (1 - i / faixas), 0, 7); cx.fill(); }
  }

  // ---------- clima ----------
  const gotas = Array.from({ length: 150 }, () => ({ x: Math.random(), y: Math.random(), v: 0.5 + Math.random(), f: Math.random() * 6.28 }));
  const CLIMA = {
    campos: { tipo: 'folha', n: 26, cor: ['#b8782e', '#a05a24', '#c89a3a'], vx: 26, vy: 22 },
    mata: { tipo: 'folha', n: 32, cor: ['#3e6a4a', '#5a7a3a', '#2e5a50'], vx: 10, vy: 20 },
    mangue: { tipo: 'chuva', n: 110, cor: ['rgba(170,195,190,0.42)'], vx: -30, vy: 420 },
    serra: { tipo: 'pontos', n: 60, cor: ['rgba(215,225,235,0.6)', 'rgba(190,205,220,0.5)'], vx: -70, vy: 24 },
    sertao: { tipo: 'pontos', n: 70, cor: ['rgba(200,165,110,0.42)', 'rgba(170,135,90,0.36)'], vx: 110, vy: 4 },
    cinzas: { tipo: 'pontos', n: 90, cor: ['rgba(120,115,110,0.7)', 'rgba(255,130,50,0.8)', 'rgba(70,65,62,0.7)'], vx: 14, vy: 34 },
  };
  let nuvens = null, passaros = [];
  function montarNuvens() {
    nuvens = document.createElement('canvas'); nuvens.width = 256; nuvens.height = 256;
    const g = nuvens.getContext('2d');
    for (let y = 0; y < 256; y += 4) for (let x = 0; x < 256; x += 4) {
      const n = M.ruido(x * 0.024 + 11, y * 0.024 + 5) * 0.75 + M.ruido(x * 0.06, y * 0.06) * 0.25;
      if (n > 0.52) { g.fillStyle = 'rgba(2,6,14,' + Math.min(0.42, (n - 0.52) * 2) + ')'; g.fillRect(x, y, 4, 4); }
    }
  }
  function desenharClima(dt, reg, naCripta, ox, oy) {
    if (naCripta) { // pó no ar, parado, e goteira
      cx.fillStyle = 'rgba(190,200,190,0.22)';
      for (let i = 0; i < 30; i++) { const g_ = gotas[i]; g_.y += dt * 0.012 * g_.v; g_.x += Math.sin(relogio + g_.f) * dt * 0.006; cx.fillRect(((g_.x % 1 + 1) % 1) * VW | 0, ((g_.y % 1) * VH) | 0, 1, 1); }
      return;
    }
    // sombra de nuvem correndo pelo chão
    if (!leve) {
      if (!nuvens) montarNuvens();
      const esc_ = 4, tam = 256 * esc_, nx = -(((ox * 0.9 + relogio * 9) % tam) + tam) % tam, ny = -(((oy * 0.9 + relogio * 3) % tam) + tam) % tam;
      cx.imageSmoothingEnabled = false;
      for (let x = nx; x < VW; x += tam) for (let y = ny; y < VH; y += tam) cx.drawImage(nuvens, x, y, tam, tam);
    }
    // fachos de luar nas clareiras
    if (!leve && (reg.id === 'mata' || reg.id === 'campos' || reg.id === 'mangue')) {
      cx.globalCompositeOperation = 'lighter';
      const gx = 11 * T;
      for (let a = Math.floor(ox / gx) - 1; a <= Math.floor((ox + VW) / gx) + 1; a++) for (let b = Math.floor(oy / gx) - 1; b <= Math.floor((oy + VH) / gx) + 1; b++) {
        if (M.hash(a, b + 900) > 0.26) continue;
        const px = a * gx + M.hash(a, b) * gx - ox, py = b * gx + M.hash(b, a) * gx - oy, br = 0.022 + Math.sin(relogio * 0.5 + a) * 0.009;
        cx.fillStyle = 'rgba(130,170,195,' + br + ')';
        for (const k of [1, 0.6]) { cx.beginPath(); cx.moveTo(px - 26 * k, py - 200); cx.lineTo(px + 26 * k, py - 200); cx.lineTo(px + 46 * k, py + 40); cx.lineTo(px - 18 * k, py + 40); cx.fill(); }
      }
      cx.globalCompositeOperation = 'source-over';
    }
    // céu vermelho da cratera
    if (reg.id === 'cinzas') { cx.fillStyle = 'rgba(120,24,8,' + (0.05 + Math.sin(relogio * 0.7) * 0.03) + ')'; cx.fillRect(0, 0, VW, VH); }
    const C_ = CLIMA[reg.id];
    if (C_) {
      const n = leve ? Math.floor(C_.n * 0.5) : C_.n;
      for (let i = 0; i < n; i++) {
        const g_ = gotas[i];
        g_.x += ((C_.vx * g_.v) / VW) * dt; g_.y += ((C_.vy * g_.v) / VH) * dt;
        const x = ((g_.x % 1 + 1) % 1) * VW, y = ((g_.y % 1 + 1) % 1) * VH;
        cx.fillStyle = C_.cor[i % C_.cor.length];
        if (C_.tipo === 'chuva') cx.fillRect(x | 0, y | 0, 1, 7);
        else if (C_.tipo === 'folha') { const s_ = Math.sin(relogio * 3 + g_.f); cx.fillRect((x + s_ * 7) | 0, y | 0, s_ > 0 ? 3 : 2, 1); cx.fillRect((x + s_ * 7 + 1) | 0, (y + 1) | 0, 1, 1); }
        else cx.fillRect(x | 0, y | 0, i % 3 === 0 ? 2 : 1, 1);
      }
    }
    // bando de aves ou morcegos cruzando o céu, de vez em quando
    if (Math.random() < dt * 0.05 && passaros.length < 7) { const y = Math.random() * VH * 0.6, v = 80 + Math.random() * 40, n_ = 3 + Math.floor(Math.random() * 4); for (let i = 0; i < n_; i++) passaros.push({ x: -30 - i * 14, y: y + (i % 2) * 8 + i * 3, v, f: Math.random() * 6 }); }
    cx.fillStyle = 'rgba(5,8,12,0.85)';
    for (const p of passaros) { p.x += p.v * dt; const asa = Math.sin(relogio * 14 + p.f) > 0 ? -1 : 1; cx.fillRect(p.x | 0, p.y | 0, 1, 1); cx.fillRect((p.x - 2) | 0, (p.y + asa) | 0, 2, 1); cx.fillRect((p.x + 1) | 0, (p.y + asa) | 0, 2, 1); }
    passaros = passaros.filter((p) => p.x < VW + 30);
    // brilho na água
    if (Math.random() < dt * 14) { const x = Math.floor((ox + Math.random() * VW) / T), y = Math.floor((oy + Math.random() * VH) / T); if (y >= 0 && y < M.CRIPTA_Y && x >= 0 && x < M.W && M.CHAO[y * M.W + x] === M.AGUA) pts.push({ x: x * T + Math.random() * T, y: y * T + Math.random() * T, vx: 0, vy: 0, g: 0, vida: 0.5, cor: '#7aa8a8' }); }
  }

  // ---------- bichinhos ----------
  // borboletas, ratos e sapos: não atacam, só fogem de quem chega perto
  const bichinhos_ = [];
  function bichinhos(dt, ox, oy) {
    if (!A.fauna) return;
    const P = J.P, limite = leve ? 5 : 12;
    if (P.y / T < M.CRIPTA_Y && bichinhos_.length < limite && Math.random() < dt * 2) {
      const lado = Math.floor(Math.random() * 4), m = 24;
      const x = lado === 0 ? ox - m : lado === 1 ? ox + VW + m : ox + Math.random() * VW, y = lado === 2 ? oy - m : lado === 3 ? oy + VH + m : oy + Math.random() * VH;
      const tx = Math.floor(x / T), ty = Math.floor(y / T);
      if (ty >= 0 && ty < M.CRIPTA_Y && tx >= 0 && tx < M.W && M.anda(tx, ty)) {
        const l = A.fauna[M.regiao(tx, ty).id] || [], n = l[Math.floor(Math.random() * l.length)];
        if (n && IMG[n]) bichinhos_.push({ n, x, y, vx: 0, vy: 0, t: 0, f: Math.random() * 6, voa: /butterfly|bat|moth|mosquito|firefly/.test(n) });
      }
    }
    for (let i = bichinhos_.length - 1; i >= 0; i--) {
      const b = bichinhos_[i], dx = b.x - P.x, dy = b.y - P.y, d = Math.hypot(dx, dy) || 1;
      if (d > VW * 1.1) { bichinhos_.splice(i, 1); continue; }
      b.t -= dt;
      if (d < 74) { const v = b.voa ? 70 : 118; b.vx = dx / d * v; b.vy = dy / d * v; b.t = 0.45; }
      else if (b.t <= 0) {
        if (!b.voa && Math.random() < 0.55) { b.vx = b.vy = 0; b.t = 0.8 + Math.random() * 2.4; }
        else { const a = Math.random() * 6.28, v = b.voa ? 34 : 20 + Math.random() * 18; b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v; b.t = 0.5 + Math.random() * 1.5; }
      }
      const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
      if (b.voa || M.anda(Math.floor(nx / T), Math.floor(ny / T))) { b.x = nx; b.y = ny; } else { b.vx = -b.vx; b.vy = -b.vy; }
      const s = A.spr[b.n], alto = b.voa ? 14 + Math.sin(relogio * 7 + b.f) * 4 : (b.vx || b.vy ? Math.abs(Math.sin(relogio * 11 + b.f)) : 0);
      if (b.voa) { cx.fillStyle = 'rgba(0,0,0,0.25)'; cx.fillRect(Math.round(b.x) - 3, Math.round(b.y), 6, 2); }
      const px = Math.round(b.x), py = Math.round(b.y - alto);
      if (b.vx < 0) { cx.save(); cx.translate(px, py); cx.scale(-1, 1); cx.drawImage(IMG[b.n], -Math.floor(s.w / 2), -s.h); cx.restore(); }
      else cx.drawImage(IMG[b.n], px - Math.floor(s.w / 2), py - s.h);
    }
  }

  // ---------- quadro ----------
  let relogio = 0, leve = false, mediaMs = 0, amostras = 0;
  Tela.leve = () => leve;
  Tela.forcaLeve = (v) => { leve = v; };
  const luzAtual = [10, 22, 34, 0.52];
  const brasasFogo = [];
  // se o aparelho não dá conta, tira a névoa dupla e as faixas de luz, sem avisar
  Tela.desenhar = function (dt) {
    const ini_ = performance.now();
    desenharQuadro(dt);
    mediaMs += performance.now() - ini_;
    if (++amostras >= 45) { if (mediaMs / amostras > 20) leve = true; mediaMs = 0; amostras = 0; }
  };
  // ---------- plantas vivas: vento, quem passa empurra, fogo queima ----------
  let rajada = 0;
  const VENTO_REG = { campos: 1, mata: 0.7, mangue: 0.8, serra: 1.4, sertao: 1.2, cinzas: 0.9 };
  function planta(o, im, dt) {
    const alto = o.verga === 1, fx_ = (o.x * 0.011 + o.y * 0.007);
    let sk = 0;
    if (!o.queimado) {
      const vr = VENTO_REG[o.reg] || 1;
      sk = (Math.sin(relogio * 1.3 + fx_) * 0.5 + Math.sin(relogio * 2.9 + fx_ * 3) * 0.2) * (alto ? 0.022 : 0.05) * vr + rajada * (alto ? 0.03 : 0.07) * vr;
      if (o.verga === 2) { // quem passa abre caminho no mato
        let alvo = 0;
        const empurra = (ex, ey, anda) => { const dx = o.x - ex, dy = o.y - ey; if (Math.abs(dy) < 14 && Math.abs(dx) < 24) { const k = (1 - Math.abs(dx) / 24) * (dx >= 0 ? 1 : -1); alvo += k * 0.42; if (anda && Math.random() < dt * 5) pts.push({ x: o.x + (Math.random() - 0.5) * 14, y: o.y - 8 - Math.random() * 10, vx: (dx >= 0 ? 1 : -1) * (14 + Math.random() * 20), vy: -16 - Math.random() * 12, g: 46, vida: 0.7, cor: Math.random() < 0.5 ? '#2c4a34' : '#3e5c38' }); } };
        const P = J.P; empurra(P.x, P.y, P.andando || P.estado === 'rola');
        for (const e of J.inimigos) if (e.estado !== 'morto' && Math.abs(e.x - o.x) < 26 && Math.abs(e.y - o.y) < 16) empurra(e.x, e.y, e.estado === 'caca');
        o.dob = (o.dob || 0) + (Math.max(-0.5, Math.min(0.5, alvo)) - (o.dob || 0)) * Math.min(1, dt * 12);
        sk += o.dob;
      }
    }
    const queimando = o.fogo != null, meio = queimando && o.fogo > o.durFogo * 0.5;
    const img = o.queimado || meio ? carvao(o.n, im) : im;
    cx.save(); cx.translate(Math.round(o.x), Math.round(o.y + (o.base || 0)));
    cx.transform(1, 0, -sk * (queimando ? 2.2 : 1), 1, 0, 0);
    cx.drawImage(img, -Math.round(im.width / 2), -im.height);
    cx.restore();
    if (queimando) chamas(o);
  }
  // ---------- efeitos em pixel (ideias adaptadas do pixelfx, MIT, de Patch e Hugo Duprez) ----------
  const efs = [];
  const BRANCO = '#ffffff';
  const PAL = {
    faisca: ['#4a1712', '#c9281f', '#f2561d', '#ff8a2a', '#ffe26b', '#fff3a6'],
    corte: ['#1a2a4a', '#2c4c86', '#5a8ad0', '#a8d0f0', '#e0f4ff', '#ffffff'],
    forte: ['#3a1208', '#8a2a10', '#d0561a', '#ff9a3a', '#ffe08a', '#fff6d0'],
    inimigo: ['#2a0808', '#6a1410', '#b02a1c', '#e06040', '#f8b090', '#fff0e0'],
    cura: ['#0a2a1a', '#1c5a3a', '#3a9a62', '#7ce0a8', '#c8ffe0', '#ffffff'],
    alma: ['#0a1a20', '#1c3a48', '#3a6a7a', '#7aa8b4', '#c0e0e8', '#f0ffff'],
  };
  Tela.efeito = function (tipo, x, y, o) { efs.push(Object.assign({ tipo, x, y, t: 0 }, o || {})); };
  const px1 = (x, y, c) => { cx.fillStyle = c; cx.fillRect(Math.round(x), Math.round(y), 1, 1); };
  // raio da faísca: grosso na raiz, um fio na ponta, branco esfriando para fora
  function raio(x, y, a, L, w, C, de) {
    const c = Math.cos(a), s_ = Math.sin(a);
    for (let d = (de || 0) * L; d <= L; d += 0.7) {
      const u = d / L, hw = w * Math.pow(1 - u, 1.6), cor = u < 0.3 ? BRANCO : u < 0.62 ? C[5] : u < 0.88 ? C[4] : C[3];
      px1(x + c * d, y + s_ * d, cor);
      for (let k = 0.7; k <= hw; k += 0.7) { px1(x + c * d - s_ * k, y + s_ * d + c * k, C[4]); px1(x + c * d + s_ * k, y + s_ * d - c * k, C[4]); }
    }
  }
  function diamante(x, y, r, C) { for (let dy = -r - 1; dy <= r + 1; dy++) for (let dx = -r - 1; dx <= r + 1; dx++) { const m = Math.abs(dx) + Math.abs(dy); if (m <= r) px1(x + dx, y + dy, BRANCO); else if (m === r + 1) px1(x + dx, y + dy, C[3]); } }
  function clarao(x, y, r, cor, a) { cx.save(); cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = a; cx.fillStyle = cor; for (const k of [1, 0.62, 0.34]) { cx.beginPath(); cx.arc(x, y, r * k, 0, 7); cx.fill(); } cx.restore(); }
  // meia-lua do corte: a ponta que vai na frente é branca, o rastro esfria e afina
  function meiaLua(x, y, r, a0, a1, grosso, C, apaga) {
    const passos = Math.max(8, Math.round(Math.abs(a1 - a0) * r / 1.2));
    for (let i = 0; i <= passos; i++) {
      const u = i / passos, a = a0 + (a1 - a0) * u, w = grosso * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - apaga * (1 - u));
      if (w < 0.4) continue;
      const cor = u > 0.86 ? BRANCO : u > 0.6 ? C[5] : u > 0.35 ? C[4] : u > 0.15 ? C[3] : C[2];
      for (let k = -w / 2; k <= w / 2; k += 0.8) px1(x + Math.cos(a) * (r + k), y + Math.sin(a) * (r + k) * 0.8, k > w / 2 - 1.2 ? cor : u > 0.5 ? C[4] : C[3]);
    }
  }
  // toca uma folha do pixelfx: o pivô vai no pé, gira em volta do ponto do golpe, espelha para a esquerda
  function folhaVfx(v, t, x, y, ang, esc) {
    if (!v.img) return false;
    const q = Math.floor(t * 30); if (q >= v.q) return false;
    const esq = Math.cos(ang) < 0, r = Math.max(-0.6, Math.min(0.6, esq ? ang - Math.PI * Math.sign(ang || 1) : ang)), alto = v.alto || 0;
    cx.save(); cx.translate(Math.round(x), Math.round(y - alto * esc)); cx.rotate(r); cx.scale((esq ? -1 : 1) * esc, esc);
    cx.drawImage(v.img, (q % v.c) * v.w, Math.floor(q / v.c) * v.h, v.w, v.h, -v.px, -v.py + alto, v.w, v.h);
    cx.restore();
    return true;
  }
  Tela.faisca = function (x, y, ang, grande) {
    if (VFX.faisca.img) { Tela.efeito('vfx', x, y + 20, { v: grande ? VFX.critico : VFX.faisca, ang, esc: grande ? 0.8 : 1 }); return; }
    const C = PAL.faisca, ti = (Math.random() - 0.5) * 0.16, e_ = grande ? 1.35 : 1;
    Tela.efeito('faisca', x, y, { ang, grande, raios: [[ang + ti, 34 * e_, 2.2], [ang + Math.PI + ti, 9 * e_, 2.2], [ang - Math.PI / 2 + ti, 16 * e_, 2.6], [ang + Math.PI / 2 + ti, 11 * e_, 2.3], [ang - Math.PI / 4 + ti, 6, 1]] });
    for (let i = 0; i < (grande ? 14 : 9); i++) { const a = ang + (Math.random() - 0.5) * 1.2 - 0.15, v = 120 + Math.random() * 150; pts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, g: 520, vida: 0.22 + Math.random() * 0.2, cor: [BRANCO, C[5], C[4], C[2]][i % 4] }); }
    for (let i = 0; i < 6; i++) { const a = ang + (Math.random() - 0.7) * 1.6, v = 50 + Math.random() * 100; pts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 50, g: 380, vida: 0.4, cor: C[3 + (i % 3)] }); }
  };
  function efeitosPix(dt) {
    const P = J.P;
    // o corte do herói acompanha a lâmina, do começo ao fim do golpe
    if (P && P.estado === 'golpe' && P.t >= P.hitIni - 0.05 && P.t <= P.hitFim + 0.14) {
      const C = P.forte ? PAL.forte : PAL.corte, u = Math.min(1, (P.t - P.hitIni + 0.05) / (P.hitFim - P.hitIni + 0.06)), lado_ = Math.cos(P.ang) >= 0 ? 1 : -1;
      const ab = P.forte ? 1.5 : 1.15, a0 = P.ang - ab * lado_, a1 = a0 + 2 * ab * lado_ * u, apaga = Math.max(0, (P.t - P.hitFim) / 0.14);
      meiaLua(P.x, P.y - 18, P.forte ? 34 : 28, a0, a1, (P.forte ? 6 : 4) * (1 - apaga * 0.8), C, apaga);
      if (u < 1) clarao(P.x + Math.cos(a1) * 30, P.y - 18 + Math.sin(a1) * 24, P.forte ? 16 : 10, C[3], 0.12);
    }
    for (let i = efs.length - 1; i >= 0; i--) {
      const f = efs[i]; f.t += dt;
      if (f.tipo === 'vfx') {
        if (f.segue && J.P) { f.x = J.P.x; f.y = J.P.y; }
        if (!folhaVfx(f.v, f.t, f.x, f.y, f.ang, f.esc || 1)) efs.splice(i, 1);
      } else if (f.tipo === 'faisca') {
        const C = PAL.faisca;
        if (f.t < 0.03) { for (const r of f.raios) raio(f.x, f.y, r[0], r[1], r[2], C); diamante(f.x, f.y, f.grande ? 5 : 4, C); }
        else if (f.t < 0.065) { for (const r of f.raios) raio(f.x, f.y, r[0], r[1] * 1.2, r[2] * 0.55, C, 0.12); diamante(f.x, f.y, 3, C); }
        else if (f.t < 0.1) { const r = f.raios[0]; raio(f.x, f.y, r[0], r[1] * 1.3, 0.6, [C[0], C[1], C[2], C[3], C[3], C[4]], 0.4); }
        const pop = Math.exp(-f.t / 0.05); if (pop > 0.03) clarao(f.x, f.y, f.grande ? 30 : 22, C[4], 0.22 * pop);
        if (f.grande && f.t < 0.25) { // golpe crítico: um anel que se parte em arcos
          const r_ = 10 + f.t * 120, al = 1 - f.t / 0.25;
          for (let k = 0; k < 6; k++) { const a = k * 1.047 + f.t * 3; meiaLua(f.x, f.y, r_, a, a + 0.6 * al, 2, PAL.forte, 0); }
        }
        if (f.t > 0.3) efs.splice(i, 1);
      } else if (f.tipo === 'racha') {
        // golpe forte no chão: rachaduras que brilham e esfriam
        const k = 1 - f.t / 0.9, C = PAL.forte;
        for (const [a, L] of f.linhas) { let x = f.x, y = f.y; for (let d = 0; d < L * Math.min(1, f.t * 8); d += 1) { x += Math.cos(a + Math.sin(d * 0.7) * 0.3); y += Math.sin(a + Math.sin(d * 0.7) * 0.3) * 0.5; px1(x, y, k > 0.6 ? C[4] : k > 0.3 ? C[2] : C[1]); } }
        if (f.t > 0.9) efs.splice(i, 1);
      } else if (f.tipo === 'cura') {
        // um aro de luz sobe pelo corpo e solta faíscas verdes
        const C = PAL.cura, u = Math.min(1, f.t / 0.8), yy = f.y - 2 - u * 46, rx = 13 - u * 3;
        for (let a = 0; a < 6.28; a += 0.12) { const fr = Math.sin(a) > 0; px1(f.x + Math.cos(a) * rx, yy + Math.sin(a) * rx * 0.32, fr ? C[4] : C[2]); }
        if (f.t < 0.4) for (let a = 0; a < 6.28; a += 0.9) { const r = 6 + f.t * 30; px1(f.x + Math.cos(a + f.t * 2) * r, f.y + Math.sin(a + f.t * 2) * r * 0.35, C[3]); }
        if (Math.random() < 0.7) { const a = Math.random() * 6.28; pts.push({ x: f.x + Math.cos(a) * 10, y: yy, vx: Math.cos(a) * 6, vy: -24 - Math.random() * 20, g: 0, vida: 0.7, cor: Math.random() < 0.4 ? BRANCO : C[4] }); }
        clarao(f.x, yy, 16, C[3], 0.06 * (1 - u));
        if (f.t > 0.85) efs.splice(i, 1);
      } else if (f.tipo === 'alma') {
        // o que sobra de quem cai: um fio pálido que sobe ondulando e se desfaz
        const C = PAL.alma, u = f.t / 1.6, topo = f.y - 20 - u * 46;
        for (let d = 0; d < 26 * (1 - u * 0.6); d++) { const yy = topo + d, w = Math.max(0, 4 - d * 0.14) * (1 - u), xx = f.x + Math.sin(d * 0.35 - f.t * 7) * (1.5 + d * 0.1); for (let k = -w; k <= w; k += 1) px1(xx + k, yy, d < 3 ? C[5] : Math.abs(k) > w - 1 ? C[2] : C[3 + (d % 2)]); }
        if (Math.random() < 0.4) pts.push({ x: f.x + (Math.random() - 0.5) * 8, y: topo + 10, vx: (Math.random() - 0.5) * 8, vy: -18, g: 0, vida: 0.6, cor: C[4] });
        if (f.t > 1.6) efs.splice(i, 1);
      } else efs.splice(i, 1);
    }
  }
  // ---------- fogo no mato: pega, espalha conforme a região e deixa carvão ----------
  const focos = [];
  const PEGA = { sertao: 0.55, campos: 0.34, cinzas: 0.3, mata: 0.2, serra: 0.16, mangue: 0 }; // o mangue é molhado demais
  function perto(x, y, r, cada) {
    const a0 = Math.floor((x - r) / 256), a1 = Math.floor((x + r) / 256), b0 = Math.floor((y - r) / 256), b1 = Math.floor((y + r) / 256);
    for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) { const l = baldeObj.get((a << 10) | b); if (l) for (const o of l) if (Math.abs(o.x - x) < r && Math.abs(o.y - y) < r) cada(o); }
  }
  Tela.acender = function (x, y, r) {
    let n = 0;
    perto(x, y, r, (o) => {
      if (!o.verga || o.queimado || o.fogo != null || focos.length >= 48) return;
      if (!(PEGA[o.reg] > 0)) return;
      o.fogo = 0; o.durFogo = o.verga === 1 ? 10 + Math.random() * 4 : 5 + Math.random() * 2; o.prox = 0.4; focos.push(o); n++;
      J.fx.push({ tipo: 'fogo', planta: true, todos: true, x: o.x, y: o.y - 4, r: o.verga === 1 ? 26 : 20, vida: o.durFogo, t: 0, dano: 9, proximo: 0.3, dePlanta: o });
    });
    return n;
  };
  Tela.focos = () => focos.length;
  // chamado pelo laço do jogo: o fogo anda mesmo sem ninguém olhando
  Tela.fogoPasso = function (dt) {
    const P = J.P;
    if (P) {
      // a tocha acesa no golpe forte ateia o mato à frente; a seta de fogo ateia onde passa
      if (P.tochaLiga && P.estado === 'golpe' && P.forte && P.t >= P.hitIni && P.t <= P.hitFim) Tela.acender(P.x + Math.cos(P.ang) * 26, P.y + Math.sin(P.ang) * 16, 26);
      for (const t of J.tirosH) Tela.acender(t.x, t.y + 20, 14);
      for (const f of J.fx) if ((f.tipo === 'fogo' && !f.planta && Math.random() < dt * 2) || (f.tipo === 'meteoro' && f.caiu && !f.ateou)) { f.ateou = true; Tela.acender(f.x, f.y, f.r); }
    }
    for (let i = focos.length - 1; i >= 0; i--) {
      const o = focos[i]; o.fogo += dt; o.prox -= dt;
      if (o.prox <= 0 && o.fogo > 1.2) { // a cada meio segundo, tenta pular para o vizinho
        o.prox = 0.5;
        const pega = PEGA[o.reg] || 0;
        perto(o.x, o.y, o.verga === 1 ? 70 : 56, (v) => { if (v !== o && v.verga && v.fogo == null && !v.queimado && Math.random() < pega * 0.32) Tela.acender(v.x, v.y, 4); });
      }
      if (o.fogo >= o.durFogo) { o.queimado = true; o.fogo = null; focos.splice(i, 1); }
    }
  };
  function chamas(o) { // línguas de fogo: largas na base, finas e tortas na ponta, esfriando do amarelo ao vermelho
    const k = Math.min(1, o.fogo / 1.2) * Math.min(1, (o.durFogo - o.fogo) / 1.5), alto = o.verga === 1, im = IMG[o.n];
    const larg = alto ? 30 : 18, base = o.y + (o.base || 0) - (alto ? 8 : 3), n = alto ? 7 : 4;
    for (let i = 0; i < n; i++) {
      // nas árvores, metade das línguas sobe pela copa
      const naCopa = alto && i >= 3, by = naCopa && im ? base - im.height * (0.35 + M.hash(i, 7) * 0.3) : base;
      const bx = o.x + (M.hash(i, 3) - 0.5) * (naCopa ? larg * 1.4 : larg), ph = relogio * (7 + i * 1.3) + i * 1.7;
      const hh = Math.round((alto ? 30 : 18) * k * (0.6 + 0.4 * Math.abs(Math.sin(ph))) * (naCopa ? 0.8 : 1)), w0 = (alto ? 9 : 7) * (0.75 + 0.25 * Math.sin(ph * 1.7));
      for (let r = 0; r < hh; r++) {
        const fr = r / hh, w = Math.max(1, w0 * Math.pow(1 - fr, 0.85)), dx = Math.sin(ph * 1.3 + r * 0.28) * fr * 2.4, y = Math.round(by - r), x = Math.round(bx + dx - w / 2);
        cx.fillStyle = fr < 0.3 ? '#f07a1e' : fr < 0.7 ? '#c84a16' : '#8a2410'; cx.fillRect(x, y, Math.round(w), 1);
        if (w > 2.5) { cx.fillStyle = fr < 0.45 ? '#ffd25a' : '#f59a2a'; cx.fillRect(Math.round(bx + dx - w * 0.3), y, Math.max(1, Math.round(w * 0.6)), 1); }
        if (fr < 0.25 && w > 4) { cx.fillStyle = '#fff3b0'; cx.fillRect(Math.round(bx + dx - 1), y, 2, 1); }
      }
    }
    if (Math.random() < 0.6) Tela.fagulhas(o.x + (Math.random() - 0.5) * larg, base - 20 * k, 1, Math.random() < 0.5 ? '#ffb84a' : '#c8501e', 34);
    if (Math.random() < 0.3) pts.push({ x: o.x + (Math.random() - 0.5) * larg, y: base - 24 * k, vx: (Math.random() - 0.3) * 10, vy: -22, g: -4, vida: 1.4, cor: 'rgba(40,36,34,0.55)' });
  }
  // o que o fogo deixa: a mesma planta, preta e cinza
  const CARVAO = {};
  function carvao(n, im) {
    if (CARVAO[n]) return CARVAO[n];
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) { const l = (p[i] + p[i + 1] + p[i + 2]) / 3; p[i] = l * 0.28 + 8; p[i + 1] = l * 0.25 + 6; p[i + 2] = l * 0.24 + 6; if (p[i + 3] && Math.random() < 0.22) p[i + 3] = 0; }
    g.putImageData(d, 0, 0);
    return (CARVAO[n] = c);
  }
  function desenharQuadro(dt) {
    relogio += dt;
    rajada = Math.pow(Math.max(0, Math.sin(relogio * 0.33) * Math.sin(relogio * 0.71 + 1)), 2);
    const P = J.P, cam = Tela.cam;
    if (!P) return;
    const alvoX = Math.max(0, Math.min(M.W * T - VW, P.x - VW / 2)), alvoY = Math.max(0, Math.min(M.H * T - VH, P.y - 26 - VH / 2));
    if (Math.abs(alvoX - cam.x) > VW || Math.abs(alvoY - cam.y) > VH) { cam.x = alvoX; cam.y = alvoY; }
    cam.x += (alvoX - cam.x) * Math.min(1, dt * 7); cam.y += (alvoY - cam.y) * Math.min(1, dt * 7);
    cam.tremor = Math.max(0, cam.tremor - dt * 14);
    const ox = Math.round(cam.x + (cam.tremor ? (Math.random() - 0.5) * cam.tremor : 0)), oy = Math.round(cam.y + (cam.tremor ? (Math.random() - 0.5) * cam.tremor : 0));

    camX = ox; camY = oy;
    const naCripta0 = P.y >= M.CRIPTA_Y * T, dia0 = naCripta0 ? 0 : J.momento(), reg0 = naCripta0 ? null : M.regiao(Math.floor(P.x / T), Math.floor(P.y / T));
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.fillStyle = '#04070a'; cx.fillRect(0, 0, VW, VH);
    const lado_ = CHUNK * T;
    for (let cl = Math.floor(oy / lado_); cl <= Math.floor((oy + VH) / lado_); cl++) for (let cc = Math.floor(ox / lado_); cc <= Math.floor((ox + VW) / lado_); cc++) {
      if (cc < 0 || cl < 0) continue;
      cx.drawImage(chunk(cc, cl), cc * lado_ - ox, cl * lado_ - oy);
    }
    cx.setTransform(1, 0, 0, 1, -ox, -oy);
    bichinhos(dt, ox, oy);

    // mancha de brasas: pulsa no chão
    const R = J.S.resto;
    if (R) {
      const p = 8 + Math.sin(relogio * 3) * 3;
      cx.fillStyle = 'rgba(255,120,30,0.28)'; cx.beginPath(); cx.arc(R.x, R.y - 2, p, 0, 7); cx.fill();
      if (Math.random() < dt * 8) Tela.fagulhas(R.x, R.y, 1, '#ffb050');
    }
    // lista por altura
    const lista = [], visiveis = [];
    const a0 = Math.floor((ox - 180) / 256), a1 = Math.floor((ox + VW + 180) / 256), b0 = Math.floor((oy - 60) / 256), b1 = Math.floor((oy + VH + 240) / 256);
    for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) {
      const l = baldeObj.get((a << 10) | b); if (!l) continue;
      for (const o of l) {
        if ((o.bau && J.S.tesouros.includes(o.bau)) || (o.erva && J.S.ervas.includes(o.erva))) continue;
        lista.push([o.y, 0, o]); visiveis.push(o);
      }
    }
    // fontes de luz que desenham contorno nos corpos: [x, y, alcance, força]
    const noite = naCripta0 ? 1 : 0.25 + 0.75 * (1 - dia0);
    fontesLuz.length = 0;
    if (!leve) {
      for (const o of visiveis) { if (o.tocha) fontesLuz.push([o.x, o.y - 22, 150, 0.75 * noite]); else if (o.fogo != null) fontesLuz.push([o.x, o.y - 10, 120, 0.8 * noite]); }
      for (const id in C.FOGUEIRAS) if (J.S.acesas.includes(id)) { const f = C.FOGUEIRAS[id]; fontesLuz.push([f.x * T + 16, f.y * T + 6, 190, 0.85 * noite]); }
      if (P.tochaLiga) fontesLuz.push([P.x + (Math.cos(P.ang) >= 0 ? 13 : -13), P.y - 30, 230, 0.8 * noite]);
      for (const f of J.fx) if (f.tipo === 'fogo') fontesLuz.push([f.x, f.y - 6, 110, 0.7 * noite]);
    }
    // sombra das copas no chão: o sol anda do leste para o oeste e a sombra gira e encolhe com ele
    if (!naCripta0 && dia0 > 0.04 && !leve) {
      const hs = ((J.S.hora % 24) + 24) % 24, t_ = Math.max(0, Math.min(1, (hs - 6) / 12)), sx_ = -Math.cos(Math.PI * t_), comp = 0.3 + (1 - Math.sin(Math.PI * t_)) * 0.9;
      cx.globalAlpha = 0.3 * dia0;
      for (const o of visiveis) {
        if (o.verga !== 1 || o.queimado) continue; const im = IMG[o.n]; if (!im) continue;
        const bal = Math.sin(relogio * 1.3 + o.x * 0.011 + o.y * 0.007) * 0.02 + rajada * 0.03;
        cx.save(); cx.translate(Math.round(o.x), Math.round(o.y + (o.base || 0) - 4));
        cx.transform(1, 0, -(sx_ * comp + bal), -0.42 * (0.6 + comp * 0.5), 0, 0);
        cx.drawImage(silh(o.n, im), -Math.round(im.width / 2), -im.height);
        cx.restore();
      }
      cx.globalAlpha = 1;
    }
    for (const e of J.inimigos) if (e.x > ox - 80 && e.x < ox + VW + 80 && e.y > oy - 60 && e.y < oy + VH + 90) lista.push([e.y, 1, e]);
    for (const id in C.FOGUEIRAS) { const f = C.FOGUEIRAS[id]; lista.push([f.y * T + 18, 2, f, id]); }
    for (const id in M.PORTOES) { if (!J.S.portoes.includes(id)) { const p = M.PORTOES[id]; lista.push([(p.y0 + p.y1) / 2 * T + T, 3, p]); } }
    for (const n of J.gente) if (Math.abs(n.px - ox - VW / 2) < VW && Math.abs(n.py - oy - VH / 2) < VH) lista.push([n.py, 4, n]);
    lista.push([P.y, 5]);
    lista.sort((a, b) => a[0] - b[0]);
    for (const it of lista) {
      switch (it[1]) {
        case 0: { const o = it[2], im = IMG[o.n]; if (!im) break;
          if (A.spr[o.n].n > 1) folha(o.n, relogio * 8, o.x, o.y, false);
          else if (o.verga || o.fogo != null) planta(o, im, dt);
          else cx.drawImage(im, Math.round(o.x - im.width / 2), Math.round(o.y - im.height + (o.base || 0)));
          break; }
        case 1: aro = it[2].estado !== 'morto' ? luzPara(it[2].x, it[2].y) : null; inimigo(it[2]); aro = null; break;
        case 2: { const f = it[2], acesa = J.S.acesas.includes(it[3]);
          if (acesa) folha('fogueira', relogio * 8, f.x * T + 16, f.y * T + 18, false);
          else folha('fogueira_apagada', 0, f.x * T + 16, f.y * T + 18, false);
          if (acesa && Math.random() < dt * 8) Tela.fagulhas(f.x * T + 16, f.y * T + 4, 1, Math.random() < 0.5 ? '#ffb84a' : '#c8501e');
          break; }
        case 3: { const p = it[2];
          // grade em toda a largura aberta, com o portão no meio do trecho
          const abertos = [];
          for (let y = p.y0; y <= p.y1; y++) if (M.anda(p.x0, y)) abertos.push(y);
          if (IMG.cerca) for (const y of abertos) { const i = IMG.cerca; cx.drawImage(i, Math.round((p.x0 + 1) * T - i.width / 2), Math.round((y + 1) * T - i.height + 4)); }
          if (IMG.portao && abertos.length) { const i = IMG.portao, y = abertos[abertos.length >> 1]; cx.drawImage(i, Math.round((p.x0 + 1) * T - i.width / 2), Math.round((y + 1) * T - i.height + 10)); }
          break; }
        case 4: { const n = it[2]; aro = luzPara(n.px, n.py); sombra(n.px, n.py - 1, 12); { const q_ = A.spr[n.spr] && A.spr[n.spr].n >= 6 ? (n.andando ? 2 + Math.floor(relogio * 7 + n.fase) % 4 : Math.floor(relogio * 1.3 + n.fase) % 2) : relogio * 1.6 + n.fase; folha(n.spr, q_, n.px, n.py, n.vira); } aro = null; break; }
        case 5: aro = luzPara(P.x, P.y); heroi(); aro = null; break;
      }
    }
    // tiros e anéis
    for (const t of J.tiros) {
      cx.fillStyle = '#7a3ad0'; cx.fillRect(Math.round(t.x) - 3, Math.round(t.y) - 3, 7, 7);
      cx.fillStyle = '#d8b0ff'; cx.fillRect(Math.round(t.x) - 1, Math.round(t.y) - 1, 3, 3);
      if (Math.random() < 0.5) pts.push({ x: t.x, y: t.y, vx: 0, vy: 0, g: 0, vida: 0.25, cor: '#6a2ac0' });
    }
    for (const f of J.fx) if (f.tipo === 'fogo') {
      const pulsa = (Math.sin(relogio * 9 + f.x) + 1) / 2, k = Math.min(1, f.vida);
      cx.fillStyle = 'rgba(220,70,20,' + 0.26 * k + ')'; cx.beginPath(); cx.arc(f.x, f.y, f.r, 0, 7); cx.fill();
      cx.fillStyle = 'rgba(255,170,60,' + (0.16 + pulsa * 0.2) * k + ')'; cx.beginPath(); cx.arc(f.x, f.y, f.r * 0.55, 0, 7); cx.fill();
      if (Math.random() < dt * 5) Tela.fagulhas(f.x, f.y, 1, '#ff9a3a');
    } else if (f.tipo === 'meteoro') {
      if (f.caiu) { cx.fillStyle = 'rgba(255,190,90,' + Math.max(0, f.vida * 2.5) + ')'; cx.beginPath(); cx.arc(f.x, f.y, f.r, 0, 7); cx.fill(); }
      else {
        const k = f.t / f.cai;
        cx.strokeStyle = 'rgba(240,80,40,0.85)'; cx.lineWidth = 2; cx.beginPath(); cx.arc(f.x, f.y, f.r, 0, 7); cx.stroke();
        cx.fillStyle = 'rgba(240,70,30,' + k * 0.35 + ')'; cx.beginPath(); cx.arc(f.x, f.y, f.r * k, 0, 7); cx.fill();
        const yy = f.y - (1 - k) * 170; // a pedra caindo
        cx.fillStyle = '#ffb040'; cx.fillRect(Math.round(f.x) - 3, Math.round(yy) - 3, 7, 7); cx.fillStyle = '#fff0c0'; cx.fillRect(Math.round(f.x) - 1, Math.round(yy) - 1, 3, 3);
      }
    }
    for (const f of J.fx) if (f.tipo === 'anel') {
      cx.strokeStyle = '#f07028'; cx.lineWidth = 3; cx.beginPath(); cx.arc(f.x, f.y, f.r, 0, 7); cx.stroke();
      cx.strokeStyle = 'rgba(255,200,90,0.8)'; cx.lineWidth = 1; cx.beginPath(); cx.arc(f.x, f.y, f.r - 2, 0, 7); cx.stroke();
    }
    // névoa da arena: quem entra não sai
    if (J.preso && J.chefe) {
      const c = J.chefe;
      for (let i = 0; i < 90; i++) {
        const a = (i / 90) * 6.283 + relogio * 0.12, h = M.hash(i, Math.floor(relogio * 4));
        cx.fillStyle = 'rgba(190,210,225,' + (0.14 + h * 0.3) + ')';
        cx.fillRect(Math.round(c.arenaX + Math.cos(a) * c.arenaR), Math.round(c.arenaY + Math.sin(a) * c.arenaR - h * 26), 2, 2 + Math.round(h * 12));
      }
    }
    // partículas
    for (const p of pts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vida -= dt; cx.fillStyle = p.cor; cx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
    for (let i = pts.length - 1; i >= 0; i--) if (pts[i].vida <= 0) pts.splice(i, 1);

    cx.setTransform(1, 0, 0, 1, 0, 0);
    // névoa no ar
    cx.globalCompositeOperation = 'screen';
    // mais névoa no mangue e nas Cinzas, e de madrugada; quase nada no sertão ao meio-dia
    const densa = (naCripta0 ? 0.7 : ({ mangue: 1.6, cinzas: 1.35, mata: 1.15, serra: 1.2, campos: 0.85, sertao: 0.5 }[reg0.id] || 1)) * (0.75 + (1 - dia0) * 0.35 + 4 * dia0 * (1 - dia0) * 0.3);
    for (const [k, vel, al, esc_] of leve ? [[0.6, 5, 0.3, 1]] : [[0.6, 5, 0.3, 1], [1.15, -8, 0.2, 1], [0.8, 3, 0.26, 2]]) {
      const L_ = 512 * esc_, A_ = 256 * esc_;
      const nx = -(((ox * k + relogio * vel) % L_) + L_) % L_, ny = -(((oy * k + relogio * vel * 0.2) % A_) + A_) % A_;
      cx.globalAlpha = Math.min(0.62, al * densa);
      for (let x = nx; x < VW; x += L_) for (let y = ny; y < VH; y += A_) cx.drawImage(nevoa, x, y, L_, A_);
    }
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';

    // escuridão com furos de luz
    const mexe = Math.floor(relogio * 11), pisca = 1 + Math.sin(mexe * 1.7) * 0.035 + Math.sin(mexe * 0.6) * 0.03;
    const naCripta = P.y >= M.CRIPTA_Y * T;
    // a luz muda aos poucos ao cruzar de uma região para outra
    const reg = naCripta ? null : M.regiao(Math.floor(P.x / T), Math.floor(P.y / T));
    const alvoLuz = naCripta ? [6, 10, 20, 0.8] : reg.luz.match(/[\d.]+/g).map(Number);
    const dia = naCripta ? 0 : J.momento();
    if (!naCripta) {
      // de dia quase não há véu; de noite, escurece bem; na virada, o céu puxa para o laranja
      const a0 = alvoLuz[3], virada = 4 * dia * (1 - dia);
      alvoLuz[3] = Math.min(0.86, a0 + 0.14) * (1 - dia) + a0 * 0.28 * dia;
      alvoLuz[0] += (84 - alvoLuz[0]) * virada * 0.7; alvoLuz[1] += (38 - alvoLuz[1]) * virada * 0.7; alvoLuz[2] += (16 - alvoLuz[2]) * virada * 0.7;
    }
    for (let i = 0; i < 4; i++) luzAtual[i] += (alvoLuz[i] - luzAtual[i]) * Math.min(1, dt * 1.5);
    lx.globalCompositeOperation = 'source-over';
    lx.clearRect(0, 0, VW, VH);
    lx.fillStyle = 'rgba(' + Math.round(luzAtual[0]) + ',' + Math.round(luzAtual[1]) + ',' + Math.round(luzAtual[2]) + ',' + luzAtual[3] + ')'; lx.fillRect(0, 0, VW, VH);
    lx.globalCompositeOperation = 'destination-out';
    if (P.tochaLiga) furo(P.x - ox, P.y - oy - 20, 310 * pisca, 0.95, leve ? 8 : 16);
    else furo(P.x - ox, P.y - oy - 20, naCripta ? 225 : 130 + 95 * dia, naCripta ? 0.72 : 0.6 + 0.1 * dia, leve ? 7 : 14);
    const quentes = [];
    for (const id in C.FOGUEIRAS) {
      if (!J.S.acesas.includes(id)) continue;
      const f = C.FOGUEIRAS[id], fx = f.x * T + 16 - ox, fy = f.y * T + 6 - oy;
      if (fx > -220 && fx < VW + 220 && fy > -220 && fy < VH + 220) { furo(fx, fy, 200 * pisca, 0.97, 9); quentes.push([fx, fy, 130]); }
    }
    for (const o of visiveis) {
      const qx = o.x - ox, qy = o.y - oy;
      if (o.tocha) { furo(qx, qy - 22, 130 * pisca, 0.88, leve ? 4 : 7); quentes.push([qx, qy - 22, 70]); }
      else if (o.cogu) furo(qx, qy - 12, 44, 0.42, 4);
      if (o.fogo != null) { const k_ = Math.min(1, o.fogo) * pisca; furo(qx, qy - 14, (o.verga === 1 ? 170 : 110) * k_, 0.9, leve ? 4 : 7); quentes.push([qx, qy - 14, o.verga === 1 ? 90 : 60]); }
    }
    for (const e of J.inimigos) if (e.d.chefe && Math.abs(e.arenaX - P.x) < 700 && Math.abs(e.arenaY - P.y) < 500) furo(e.arenaX - ox, e.arenaY - oy, e.arenaR, 0.62, 12); // a arena é sempre visível: o medo vem de ver o que espera
    for (const e of J.inimigos) if (e.estado === 'prepara' || e.d.spr === 'apagado') furo(e.x - ox, e.y - oy - 26, 50, 0.45, 3);
    cx.drawImage(luz, 0, 0);
    // luz do sol: clareia o que já tem cor, sem lavar os pretos
    if (dia > 0 && !leve) {
      cx.globalCompositeOperation = 'color-dodge';
      cx.fillStyle = 'rgb(' + Math.round(74 * dia) + ',' + Math.round(70 * dia) + ',' + Math.round(58 * dia) + ')'; cx.fillRect(0, 0, VW, VH);
      cx.globalCompositeOperation = 'source-over';
    }
    if (P.tochaLiga && P.estado !== 'morto') {
      // a tocha na mão: cabo e chama em blocos, tremendo
      const lado = Math.cos(P.ang) >= 0 ? 1 : -1, tx = Math.round(P.x - ox + lado * 13), ty = Math.round(P.y - oy - 28), m_ = mexe % 3;
      cx.fillStyle = '#3a2412'; cx.fillRect(tx - 1, ty, 2, 12);
      cx.fillStyle = '#d4551a'; cx.fillRect(tx - 3, ty - 5 - m_, 6, 6 + m_);
      cx.fillStyle = '#f6b53a'; cx.fillRect(tx - 2, ty - 3 - m_, 4, 4);
      cx.fillStyle = '#fff0b0'; cx.fillRect(tx - 1, ty - 1, 2, 2);
      quentes.push([tx, ty - 2, 110]);
    }

    // silhuetas: mesmo no escuro, quem pode matar você precisa ser visto
    cx.setTransform(1, 0, 0, 1, -ox, -oy);
    cx.globalAlpha = 0.42;
    for (const e of J.inimigos) if (e.estado !== 'morto' && e.x > ox - 60 && e.x < ox + VW + 60 && e.y > oy - 40 && e.y < oy + VH + 70) silhueta(e);
    cx.globalAlpha = 1;
    efeitosPix(dt); // golpes, faíscas, cura e alma têm luz própria: ficam por cima do escuro
    cx.setTransform(1, 0, 0, 1, 0, 0);

    cx.globalCompositeOperation = 'lighter';
    for (const [x, y, r] of quentes) { brilho(x, y, r * pisca, 'rgba(130,52,10,0.075)', 6); brilho(x, y, 34 * pisca, 'rgba(255,130,30,0.05)', 3); }
    if (R) brilho(R.x - ox, R.y - oy, 26, 'rgba(255,110,30,0.05)', 3);
    cx.globalCompositeOperation = 'source-over';

    desenharClima(dt, reg, naCripta, ox, oy);
    // tiros do herói
    if (J.tirosH.length) { cx.setTransform(1, 0, 0, 1, -ox, -oy); for (const t of J.tirosH) { cx.fillStyle = '#ff8a2a'; cx.fillRect(Math.round(t.x) - 3, Math.round(t.y) - 3, 7, 7); cx.fillStyle = '#ffe9a8'; cx.fillRect(Math.round(t.x) - 1, Math.round(t.y) - 1, 3, 3); if (Math.random() < 0.6) Tela.fagulhas(t.x, t.y + 10, 1, '#ff9a3a', 8); } cx.setTransform(1, 0, 0, 1, 0, 0); }
    if (P.guarda > 0) { cx.strokeStyle = 'rgba(190,210,235,' + (0.35 + Math.sin(relogio * 12) * 0.2) + ')'; cx.lineWidth = 2; cx.beginPath(); cx.arc(P.x - ox, P.y - oy - 24, 26, 0, 7); cx.stroke(); }
    // vinheta de vida baixa
    if (P.vida < J.vidaMax() * 0.28 && P.estado !== 'morto') {
      const a = 0.14 + Math.sin(relogio * 5) * 0.06;
      cx.fillStyle = 'rgba(120,10,10,' + a + ')';
      cx.fillRect(0, 0, VW, 8); cx.fillRect(0, VH - 8, VW, 8); cx.fillRect(0, 0, 8, VH); cx.fillRect(VW - 8, 0, 8, VH);
    }
  }

  Tela.medir = medir;
  Tela.iniciar = function () {
    montarMundo(); montarNevoa();
    Tela.espriteBenta = IMG.benta_s0;
  };
  Tela.imagem = (n) => IMG[n];
  const ORIG = {};
  Tela.original = (n) => { if (!ORIG[n] && IMG[n]) ORIG[n] = IMG[n]; return ORIG[n]; };
  const SPR0 = {};
  Tela.trocar = (n, c) => { Tela.original(n); if (!SPR0[n]) SPR0[n] = A.spr[n]; IMG[n] = c; };
  Tela.restaurar = (n) => { if (ORIG[n]) IMG[n] = ORIG[n]; if (SPR0[n]) A.spr[n] = SPR0[n]; };
  Tela.tamanho = () => ({ VW, VH, esc: Tela.esc });
})(window);
