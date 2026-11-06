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
    const esc = Math.max(1, Math.round(Math.max(lw / 640, lh / 400)));
    VW = Math.ceil(lw / esc); VH = Math.ceil(lh / esc);
    cv.width = luz.width = VW; cv.height = luz.height = VH;
    cx.imageSmoothingEnabled = false;
    Tela.esc = esc;
  }
  addEventListener('resize', medir); medir();

  Tela.carregar = function (aoPasso) {
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
    for (const id in M.PORTOES) { const p = M.PORTOES[id]; if (bx >= p.x0 - 4 && bx <= p.x1 + 4 && by >= p.y0 - 2 && by <= p.y1 + 2) return true; }
    for (const q of [[28, 172], [226, 152], [18, 206], [40, 134], [204, 26], [160, 230]]) { const c = M.p(q[0], q[1]); if (Math.hypot(c[0] - bx, c[1] - by) < 6) return true; }
    return false;
  };
  function montarMundo() {
    const G = A.grupos;
    // árvores nas bordas da mata: só onde a copa não cobre o caminho (nada aberto logo acima)
    for (let y = 2; y < M.CRIPTA_Y - 2; y += 2) for (let x = 2; x < M.W - 2; x += 2) {
      if (M.anda(x, y)) continue;
      let pertoAberto = false, acima = false;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (M.anda(x + dx, y + dy)) pertoAberto = true;
      if (!pertoAberto) continue;
      for (let dy = 1; dy <= 6; dy++) for (let dx = -2; dx <= 2; dx++) if (M.anda(x + dx, y - dy)) acima = true;
      const r = rnd(x, y, 1);
      if (!acima && r < 0.8) {
        pôr(r < 0.45 ? 'arvore1' : 'arvore2', x * T + (rnd(x, y, 2) - 0.5) * 54, y * T + (rnd(x, y, 3) - 0.5) * 40, { base: 12 });
      } else if (acima && r < 0.24) {
        const lista = G.mata; // ao sul do caminho, só plantas baixas fazem a parede
        pôr(lista[Math.floor(rnd(x, y, 4) * lista.length)], x * T + (rnd(x, y, 7) - 0.5) * 56, y * T + (rnd(x, y, 8) - 0.5) * 44, { base: 6 });
      }
    }
    // miolo das áreas
    for (let y = 0; y < M.H; y += 3) for (let x = 0; x < M.W; x += 3) {
      if (!M.anda(x, y) || reservado(x, y)) continue;
      const r = rnd(x, y, 5);
      const cem = Math.hypot(x - M.N.cemiterio[0], y - M.N.cemiterio[1]) < M.N.cemiterio[2], cripta = y >= M.CRIPTA_Y;
      if (cripta) {
        if (r < 0.035) pôr(G.cripta[Math.floor(rnd(x, y, 6) * G.cripta.length)], x * T + 16, y * T + 16, { base: 6, r: 12 });
      } else if (cem) {
        if (r < 0.12) pôr(G.cemiterio[Math.floor(rnd(x, y, 6) * G.cemiterio.length)], x * T + 16, y * T + 16, { base: 5, r: 10 });
      } else if (r < 0.018 && M.CHAO[y * M.W + x] === M.MUSGO) {
        const n = G.mata[Math.floor(rnd(x, y, 6) * G.mata.length)];
        pôr(n, x * T + 16, y * T + 16, { base: 6, r: (A.baixos || []).includes(n) ? 0 : 12, cogu: (A.cogumelos || []).includes(n) });
      }
    }
    // Ruínas de Alvorada
    for (const [x, y, n] of [[36, 150, 'casa1'], [62, 136, 'casa2'], [56, 156, 'casa2'], [34, 128, 'casa1'], [66, 150, 'casa1']]) { const c = M.p(x, y); pôr(n, c[0] * T, c[1] * T, { base: 12, r: 52 }); }
    // entrada da cripta
    { const c = M.p(226, 150); pôr('entrada', c[0] * T, c[1] * T, { base: 10 }); }
    // tochas da cripta
    for (const [x, y] of [[12, 201], [25, 201], [52, 197], [71, 197], [46, 229], [79, 229], [112, 231], [121, 231], [144, 219], [176, 219]]) { const c = M.p(x, y); pôr(A.tocha || 'fogueira', c[0] * T, c[1] * T + 12, { base: 4, tocha: 1 }); }
    for (const t of C.TESOUROS) pôr(A.bau || 'obj7', t.x * T + 16, t.y * T + 16, { base: 6, bau: t.id });
  }

  // ---------- chão ----------
  const CHUNK = 16, cachos = new Map();
  function tile(i, x, y) { return i[((x * 73856093) ^ (y * 19349663)) >>> 0 & 0xffff ? (((x * 73856093) ^ (y * 19349663)) >>> 0) % i.length : 0]; }
  function pintaChunk(cc, cl) {
    const c = document.createElement('canvas'); c.width = c.height = CHUNK * T;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const canto = (x, y) => (x >= 0 && y >= 0 && x < M.W && y < M.H && M.CHAO[y * M.W + x] === M.TERRA ? 'l' : 'u');
    const folha = IMG.chao, parede = IMG.parede, piso = IMG.piso;
    for (let y = cl * CHUNK; y < (cl + 1) * CHUNK; y++) for (let x = cc * CHUNK; x < (cc + 1) * CHUNK; x++) {
      if (x >= M.W || y >= M.H) continue;
      const dx = (x - cc * CHUNK) * T, dy = (y - cl * CHUNK) * T, v = M.CHAO[y * M.W + x];
      if (v === M.PISO) {
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
        const p = tile(A.tiles[k], x, y);
        if (folha) g.drawImage(folha, p[0], p[1], T, T, dx, dy, T, T);
        if (v === M.MATA) { g.fillStyle = 'rgba(2,8,12,0.62)'; g.fillRect(dx, dy, T, T); }
      }
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
      if (cachos.size > 36) cachos.delete(cachos.keys().next().value); // guarda só os mais recentes, por causa do celular
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
  let escalaFolha = 1;
  function folha(nome, q, x, y, inverte, extraFundo) {
    const info = A.spr[nome], im = IMG[nome];
    if (!im) return false;
    const w = info.w, h = info.h, f = ((Math.floor(q) % info.n) + info.n) % info.n;
    // os quadros maiores que 64 são centrados: o pé fica sempre na mesma altura
    const fundo = (h - 64) / 2 + 2 + (extraFundo || 0);
    if (escalaFolha !== 1) { // chefes desenhados maiores, com o pé no mesmo lugar
      const k = escalaFolha, dw = w * k, dh = h * k;
      cx.save(); cx.translate(Math.round(x), Math.round(y + fundo * k)); if (inverte) cx.scale(-1, 1);
      cx.drawImage(im, f * w, 0, w, h, -dw / 2, -dh, dw, dh); cx.restore();
      return true;
    }
    if (inverte) {
      cx.save(); cx.translate(Math.round(x), 0); cx.scale(-1, 1);
      cx.drawImage(im, f * w, 0, w, h, -w / 2, Math.round(y - h + fundo), w, h); cx.restore();
    } else cx.drawImage(im, f * w, 0, w, h, Math.round(x - w / 2), Math.round(y - h + fundo), w, h);
    return true;
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
    if (P.estado === 'rola') { folha('rola', (P.t / 0.46) * 4, P.x, P.y, Math.cos(P.ang) < 0); cx.globalAlpha = 1; return; }
    if (P.estado === 'golpe') {
      const k = P.t / P.dGolpe;
      const n = 'golpe_' + base, info = A.spr[n] || A.spr.golpe_e;
      folha(A.spr[n] ? n : 'golpe_e', Math.min(info.n - 1, k * info.n), P.x, P.y, inv);
      if (P.forte && P.t < P.hitIni) { cx.fillStyle = 'rgba(255,190,90,0.7)'; cx.fillRect(Math.round(P.x + Math.cos(P.ang) * 20), Math.round(P.y - 30 + Math.sin(P.ang) * 8), 2, 2); }
      cx.globalAlpha = 1; return;
    }
    if (P.andando && P.estado === 'livre') folha('heroi_' + base, P.passo, P.x, P.y, inv);
    else folha('heroi_' + base + '0', 0, P.x, P.y, inv);
    if (P.estado === 'bebe') Tela.fagulhas(P.x, P.y - 26, 1, '#7ce0a8', 8);
    cx.globalAlpha = 1;
  }
  function inimigo(e) {
    escalaFolha = e.d.chefe ? (e.d.spr === 'corpo' ? 1.5 : 1.3) : 1;
    desenhaInimigo(e);
    escalaFolha = 1;
  }
  function desenhaInimigo(e) {
    const d = e.d, s = d.spr;
    if (e.estado === 'morto') {
      cx.globalAlpha = Math.max(0, 1 - e.t / (d.chefe ? 3 : 1.4));
      folha(s + '_e', 0, e.x, e.y, Math.cos(e.ang) < 0);
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
    if (e.flash > 0) cx.filter = 'brightness(3) saturate(0.2)';
    else if (e.estado === 'prepara') cx.filter = 'brightness(1.45) saturate(1.3)';
    else if (e.estado === 'atordoado') cx.filter = 'brightness(0.7)';
    const inv = Math.cos(e.ang) < 0, sul = Math.sin(e.ang) > 0.75;
    const atk = e.estado === 'golpe' || e.estado === 'prepara';
    if (atk) {
      const pref = sul && A.spr[s + '_gs'] ? s + '_gs' : s + '_ge';
      if (A.spr[pref]) {
        const info = A.spr[pref], k = e.estado === 'prepara' ? (e.t / e.resta) * 0.45 : 0.45 + (e.t / e.resta) * 0.55;
        folha(pref, Math.min(info.n - 1, k * info.n), e.x, e.y, pref.endsWith('gs') ? false : inv);
      } else folha(s + '_e', 0, e.x, e.y, inv);
    } else if (sul && A.spr[s + '_s']) folha(s + '_s', e.passo, e.x, e.y, false);
    else if (Math.sin(e.ang) < -0.75 && A.spr[s + '_n']) folha(s + '_n', e.passo, e.x, e.y, false);
    else folha(s + '_e', e.passo, e.x, e.y, inv);
    cx.filter = 'none';
    if (e.hp < e.hpMax && !d.chefe) {
      cx.fillStyle = '#0a0c0e'; cx.fillRect(Math.round(e.x - 13), Math.round(e.y - 56), 26, 3);
      cx.fillStyle = '#a02a24'; cx.fillRect(Math.round(e.x - 12), Math.round(e.y - 55), Math.max(0, 24 * e.hp / e.hpMax), 1);
    }
    if (J.P.alvo === e) {
      cx.fillStyle = '#e8d08a';
      cx.fillRect(Math.round(e.x - 1), Math.round(e.y - 62), 3, 3);
    }
  }

  function silhueta(e) {
    const s = e.d.spr, inv = Math.cos(e.ang) < 0;
    escalaFolha = e.d.chefe ? (s === 'corpo' ? 1.5 : 1.3) : 1;
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

  // ---------- quadro ----------
  let relogio = 0;
  const brasasFogo = [];
  Tela.desenhar = function (dt) {
    relogio += dt;
    const P = J.P, cam = Tela.cam;
    if (!P) return;
    const alvoX = Math.max(0, Math.min(M.W * T - VW, P.x - VW / 2)), alvoY = Math.max(0, Math.min(M.H * T - VH, P.y - 26 - VH / 2));
    if (Math.abs(alvoX - cam.x) > VW || Math.abs(alvoY - cam.y) > VH) { cam.x = alvoX; cam.y = alvoY; }
    cam.x += (alvoX - cam.x) * Math.min(1, dt * 7); cam.y += (alvoY - cam.y) * Math.min(1, dt * 7);
    cam.tremor = Math.max(0, cam.tremor - dt * 14);
    const ox = Math.round(cam.x + (cam.tremor ? (Math.random() - 0.5) * cam.tremor : 0)), oy = Math.round(cam.y + (cam.tremor ? (Math.random() - 0.5) * cam.tremor : 0));

    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.fillStyle = '#04070a'; cx.fillRect(0, 0, VW, VH);
    const lado_ = CHUNK * T;
    for (let cl = Math.floor(oy / lado_); cl <= Math.floor((oy + VH) / lado_); cl++) for (let cc = Math.floor(ox / lado_); cc <= Math.floor((ox + VW) / lado_); cc++) {
      if (cc < 0 || cl < 0) continue;
      cx.drawImage(chunk(cc, cl), cc * lado_ - ox, cl * lado_ - oy);
    }
    cx.setTransform(1, 0, 0, 1, -ox, -oy);

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
        if (o.bau && J.S.tesouros.includes(o.bau)) continue;
        lista.push([o.y, 0, o]); visiveis.push(o);
      }
    }
    for (const e of J.inimigos) if (e.x > ox - 80 && e.x < ox + VW + 80 && e.y > oy - 60 && e.y < oy + VH + 90) lista.push([e.y, 1, e]);
    for (const id in C.FOGUEIRAS) { const f = C.FOGUEIRAS[id]; lista.push([f.y * T + 18, 2, f, id]); }
    for (const id in M.PORTOES) { if (!J.S.portoes.includes(id)) { const p = M.PORTOES[id]; lista.push([(p.y0 + p.y1) / 2 * T + T, 3, p]); } }
    lista.push([J.BENTA.y, 4]);
    lista.push([P.y, 5]);
    lista.sort((a, b) => a[0] - b[0]);
    for (const it of lista) {
      switch (it[1]) {
        case 0: { const o = it[2], im = IMG[o.n]; if (!im) break;
          if (A.spr[o.n].n > 1) folha(o.n, relogio * 8, o.x, o.y, false, 10);
          else cx.drawImage(im, Math.round(o.x - im.width / 2), Math.round(o.y - im.height + (o.base || 0)));
          break; }
        case 1: inimigo(it[2]); break;
        case 2: { const f = it[2], acesa = J.S.acesas.includes(it[3]);
          if (acesa) folha('fogueira', relogio * 8, f.x * T + 16, f.y * T + 18, false, 14);
          else if (IMG.fogueira) { cx.drawImage(IMG.fogueira, 0, 34, 48, 30, f.x * T - 8, f.y * T - 2, 48, 30); }
          if (acesa && Math.random() < dt * 8) Tela.fagulhas(f.x * T + 16, f.y * T + 4, 1, Math.random() < 0.5 ? '#ffb84a' : '#c8501e');
          break; }
        case 3: { const p = it[2];
          // grade em toda a largura aberta, com o portão no meio do trecho
          const abertos = [];
          for (let y = p.y0; y <= p.y1; y++) if (M.anda(p.x0, y)) abertos.push(y);
          if (IMG.cerca) for (const y of abertos) { const i = IMG.cerca; cx.drawImage(i, Math.round((p.x0 + 1) * T - i.width / 2), Math.round((y + 1) * T - i.height + 4)); }
          if (IMG.portao && abertos.length) { const i = IMG.portao, y = abertos[abertos.length >> 1]; cx.drawImage(i, Math.round((p.x0 + 1) * T - i.width / 2), Math.round((y + 1) * T - i.height + 10)); }
          break; }
        case 4: sombra(J.BENTA.x, J.BENTA.y - 1, 12); folha('benta_s0', 0, J.BENTA.x, J.BENTA.y, false); break;
        case 5: heroi(); break;
      }
    }
    // tiros e anéis
    for (const t of J.tiros) {
      cx.fillStyle = '#7a3ad0'; cx.fillRect(Math.round(t.x) - 3, Math.round(t.y) - 3, 7, 7);
      cx.fillStyle = '#d8b0ff'; cx.fillRect(Math.round(t.x) - 1, Math.round(t.y) - 1, 3, 3);
      if (Math.random() < 0.5) pts.push({ x: t.x, y: t.y, vx: 0, vy: 0, g: 0, vida: 0.25, cor: '#6a2ac0' });
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
    for (const [k, vel, al] of [[0.6, 5, 0.32], [1.15, -8, 0.22]]) {
      const nx = -(((ox * k + relogio * vel) % 512) + 512) % 512, ny = -(((oy * k) % 256) + 256) % 256;
      cx.globalAlpha = al;
      for (let x = nx; x < VW; x += 512) for (let y = ny; y < VH; y += 256) cx.drawImage(nevoa, x, y);
    }
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';

    // escuridão com furos de luz
    const mexe = Math.floor(relogio * 11), pisca = 1 + Math.sin(mexe * 1.7) * 0.035 + Math.sin(mexe * 0.6) * 0.03;
    const naCripta = P.y >= M.CRIPTA_Y * T;
    lx.globalCompositeOperation = 'source-over';
    lx.clearRect(0, 0, VW, VH);
    lx.fillStyle = naCripta ? 'rgba(6,10,20,0.8)' : 'rgba(8,20,34,0.64)'; lx.fillRect(0, 0, VW, VH);
    lx.globalCompositeOperation = 'destination-out';
    furo(P.x - ox, P.y - oy - 20, 225, naCripta ? 0.72 : 0.7, 14);
    const quentes = [];
    for (const id in C.FOGUEIRAS) {
      if (!J.S.acesas.includes(id)) continue;
      const f = C.FOGUEIRAS[id], fx = f.x * T + 16 - ox, fy = f.y * T + 6 - oy;
      if (fx > -220 && fx < VW + 220 && fy > -220 && fy < VH + 220) { furo(fx, fy, 200 * pisca, 0.97, 9); quentes.push([fx, fy, 130]); }
    }
    for (const o of visiveis) {
      const qx = o.x - ox, qy = o.y - oy;
      if (o.tocha) { furo(qx, qy - 22, 130 * pisca, 0.88, 7); quentes.push([qx, qy - 22, 70]); }
      else if (o.cogu) furo(qx, qy - 12, 44, 0.42, 4);
    }
    for (const e of J.inimigos) if (e.d.chefe && Math.abs(e.arenaX - P.x) < 700 && Math.abs(e.arenaY - P.y) < 500) furo(e.arenaX - ox, e.arenaY - oy, e.arenaR, 0.62, 12); // a arena é sempre visível: o medo vem de ver o que espera
    for (const e of J.inimigos) if (e.estado === 'prepara' || e.d.spr === 'apagado') furo(e.x - ox, e.y - oy - 26, 50, 0.45, 3);
    cx.drawImage(luz, 0, 0);

    // silhuetas: mesmo no escuro, quem pode matar você precisa ser visto
    cx.setTransform(1, 0, 0, 1, -ox, -oy);
    cx.globalAlpha = 0.42;
    for (const e of J.inimigos) if (e.estado !== 'morto' && e.x > ox - 60 && e.x < ox + VW + 60 && e.y > oy - 40 && e.y < oy + VH + 70) silhueta(e);
    cx.globalAlpha = 1;
    cx.setTransform(1, 0, 0, 1, 0, 0);

    cx.globalCompositeOperation = 'lighter';
    for (const [x, y, r] of quentes) { brilho(x, y, r * pisca, 'rgba(130,52,10,0.075)', 6); brilho(x, y, 34 * pisca, 'rgba(255,130,30,0.05)', 3); }
    if (R) brilho(R.x - ox, R.y - oy, 26, 'rgba(255,110,30,0.05)', 3);
    cx.globalCompositeOperation = 'source-over';

    // vinheta de vida baixa
    if (P.vida < J.vidaMax() * 0.28 && P.estado !== 'morto') {
      const a = 0.14 + Math.sin(relogio * 5) * 0.06;
      cx.fillStyle = 'rgba(120,10,10,' + a + ')';
      cx.fillRect(0, 0, VW, 8); cx.fillRect(0, VH - 8, VW, 8); cx.fillRect(0, 0, 8, VH); cx.fillRect(VW - 8, 0, 8, VH);
    }
  };

  Tela.iniciar = function () {
    montarMundo(); montarNevoa();
    Tela.espriteBenta = IMG.benta_s0;
  };
  Tela.imagem = (n) => IMG[n];
  Tela.tamanho = () => ({ VW, VH, esc: Tela.esc });
})(window);
