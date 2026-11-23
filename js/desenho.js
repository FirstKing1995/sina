/* SINA 2D · desenho. O mundo é pintado num quadro pequeno (cerca de 480 x 270) e ampliado sem borrar.
   Camadas: céu, montanhas, mata ao longe, névoa, enfeites, chão, gente, frente, luz e números. */
(function () {
  'use strict';
  const D = window.Desenho = {};
  const F = window.Fase, J = window.Jogo, S = window.Spr, T = F.T;
  const tela = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  let cv, ctx, buf, g, luz, gl;
  D.VW = 480; D.VH = 270;
  const cam = (D.cam = { x: 0, y: 0, alvoX: 0 });
  let tempo = 0;

  D.iniciar = function (canvas) {
    cv = canvas; ctx = cv.getContext('2d');
    buf = tela(480, 270); g = buf.getContext('2d');
    luz = tela(480, 270); gl = luz.getContext('2d');
    D.ajustar(); addEventListener('resize', D.ajustar);
  };
  D.ajustar = function () {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
    const asp = innerWidth / innerHeight;
    let VH = 270, VW = Math.round(VH * asp);
    if (VW < 340) { VW = 340; VH = Math.round(VW / asp); }
    if (VW > 640) VW = 640;
    D.VW = VW; D.VH = VH;
    buf.width = luz.width = VW; buf.height = luz.height = VH;
    g.imageSmoothingEnabled = false;
  };

  // ---------- cores ----------
  const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const mist = (a, b, k) => { const x = hex(a), y = hex(b); return 'rgb(' + x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(',') + ')'; };
  // mistura a paleta da região onde a câmera está com a vizinha, para a troca ser suave
  function paleta(px) {
    const R = F.REGIOES, x = px / T;
    for (let i = 0; i < R.length; i++) {
      const r = R[i];
      if (x >= r.x0 && x < r.x1) {
        const viz = x > r.x1 - 20 && R[i + 1] ? R[i + 1] : null;
        const k = viz ? (x - (r.x1 - 20)) / 40 : 0;
        if (!viz || k <= 0) return { r, k: 0, viz: null };
        return { r, viz, k };
      }
    }
    return { r: R[R.length - 1], k: 0, viz: null };
  }
  const cor = (p, campo, i) => { const a = i == null ? p.r[campo] : p.r[campo][i]; if (!p.viz) return a; const b = i == null ? p.viz[campo] : p.viz[campo][i]; return mist(a, b, p.k); };
  const rgb = (c) => (c[0] === '#' ? hex(c) : c.slice(4, -1).split(',').map(Number));
  const num = (p, campo) => (p.viz ? p.r[campo] + (p.viz[campo] - p.r[campo]) * p.k : p.r[campo]);

  // ---------- terreno pintado por código, em pedaços de 32 blocos ----------
  const PED = 32, pedacos = [];
  function pintaPedaco(i) {
    const x0 = i * PED, w = PED * T, h = F.H * T;
    const c = tela(w, h), gc = c.getContext('2d');
    const im = gc.createImageData(w, h), d = im.data;
    const put = (x, y, rgb, a) => { if (x < 0 || y < 0 || x >= w || y >= h) return; const k = (y * w + x) * 4; d[k] = rgb[0]; d[k + 1] = rgb[1]; d[k + 2] = rgb[2]; d[k + 3] = a == null ? 255 : a; };
    const fundoT = (tx, ty) => { let n = 0; while (n < 6 && F.tile(tx, ty - n - 1) === 1) n++; return n; };
    for (let ty = 0; ty < F.H; ty++) for (let lx = 0; lx < PED; lx++) {
      const tx = x0 + lx, tp = F.tile(tx, ty);
      if (!tp) continue;
      const reg = F.regiao(tx * T), CH = reg.chao.map(hex), GR = reg.grama.map(hex);
      if (tp === 1) {
        const prof = fundoT(tx, ty); // blocos sólidos acima deste
        const expostoE = F.tile(tx - 1, ty) !== 1, expostoD = F.tile(tx + 1, ty) !== 1, expostoB = F.tile(tx, ty + 1) !== 1;
        for (let py = 0; py < T; py++) for (let px = 0; px < T; px++) {
          const gx = tx * T + px, gy = ty * T + py, n = F.hash(gx, gy), n2 = F.hash(gx >> 2, gy >> 2);
          const fund = prof * T + py; // distância até a superfície
          let base = fund < 10 ? CH[0] : fund < 40 ? CH[1] : CH[2];
          if (fund >= 6 && fund < 12 && n < 0.5) base = CH[1];
          if (fund >= 34 && fund < 46 && n < 0.5) base = CH[2];
          let k = 0.88 + n2 * 0.22 + (n < 0.06 ? 0.25 : 0);
          // pedrinhas
          if (F.hash(gx >> 3, gy >> 3) < 0.07 && F.hash(gx, gy >> 1) < 0.7) k *= 1.35;
          // faces expostas escurecem
          if ((expostoE && px < 2) || (expostoD && px > T - 3) || (expostoB && py > T - 3)) k *= 0.55;
          let rgb = base.map((v) => Math.min(255, v * k));
          if (prof === 0 && py < 4) { // grama no topo
            const gk = py < 2 ? 0 : 1; rgb = GR[gk].map((v) => Math.min(255, v * (0.85 + n * 0.3)));
          }
          if (prof === 0 && py === 4 && n < 0.5) rgb = GR[1].map((v) => v * 0.7);
          put(lx * T + px, ty * T + py, rgb);
        }
        if (prof === 0) for (let px = 0; px < T; px++) { // tufos de grama por cima
          const gx = tx * T + px, alt = Math.floor(F.hash(gx, 7) * 5);
          for (let k = 1; k <= alt; k++) if (F.hash(gx, k + 9) < 0.75) put(lx * T + px, ty * T - k, GR[k > 2 ? 0 : 1].map((v) => v * (0.9 + k * 0.06)));
        }
      } else if (tp === 2) { // plataforma: tábua ou galho
        const mata = reg.id === 'mata';
        for (let px = 0; px < T; px++) for (let py = 0; py < 6; py++) {
          const gx = tx * T + px, n = F.hash(gx, py);
          let rgb = mata ? [74, 54, 34] : [96, 70, 44];
          if (py === 0) rgb = rgb.map((v) => v * 1.35); else if (py === 5) rgb = [20, 14, 10];
          else if (!mata && px % 8 === 0) rgb = [40, 28, 18];
          put(lx * T + px, ty * T + py, rgb.map((v) => Math.min(255, v * (0.85 + n * 0.3))));
        }
        if (mata) for (let px = 0; px < T; px += 3) if (F.hash(tx * T + px, 3) < 0.5) { put(lx * T + px, ty * T - 1, GR[0]); put(lx * T + px + 1, ty * T - 2, GR[1]); }
        if (!mata && (F.tile(tx - 1, ty) !== 2 || F.tile(tx + 1, ty) !== 2)) for (let py = 6; py < 14; py++) put(lx * T + (F.tile(tx - 1, ty) !== 2 ? 3 : 12), ty * T + py, [50, 36, 24]);
      } else if (tp === 3) { // espinhos de osso
        for (let s = 0; s < 4; s++) {
          const cx = s * 4 + 2, alt = 9 + Math.floor(F.hash(tx * 4 + s, 5) * 6);
          for (let py = 0; py < alt; py++) {
            const meia = Math.floor((py / alt) * 2.2);
            for (let px = -meia; px <= meia; px++) put(lx * T + cx + px, ty * T + T - alt + py, px === -meia ? [200, 190, 170] : [120, 104, 96]);
          }
        }
      }
    }
    gc.putImageData(im, 0, 0);
    return c;
  }
  const pedaco = (i) => pedacos[i] || (pedacos[i] = pintaPedaco(i));
  D.repintar = () => { pedacos.length = 0; };

  // ---------- fundo ----------
  function ceu(p) {
    const gr = g.createLinearGradient(0, 0, 0, D.VH);
    gr.addColorStop(0, cor(p, 'ceu', 0)); gr.addColorStop(0.55, cor(p, 'ceu', 1)); gr.addColorStop(1, cor(p, 'ceu', 2));
    g.fillStyle = gr; g.fillRect(0, 0, D.VW, D.VH);
    // estrelas
    for (let i = 0; i < 60; i++) {
      const x = ((F.hash(i, 1) * 900 - cam.x * 0.02) % D.VW + D.VW) % D.VW, y = F.hash(i, 2) * D.VH * 0.55;
      g.fillStyle = 'rgba(230,225,255,' + (0.25 + 0.5 * Math.abs(Math.sin(tempo * (0.5 + F.hash(i, 3)) + i))) + ')';
      g.fillRect(x | 0, y | 0, 1, 1);
    }
    // lua
    const lx = D.VW * 0.74 - cam.x * 0.015, ly = 46 - cam.y * 0.02;
    const gl2 = g.createRadialGradient(lx, ly, 4, lx, ly, 70);
    gl2.addColorStop(0, 'rgba(255,240,220,0.35)'); gl2.addColorStop(1, 'rgba(255,240,220,0)');
    g.fillStyle = gl2; g.fillRect(lx - 70, ly - 70, 140, 140);
    g.fillStyle = p.r.lua ? '#f0d6c8' : '#e8e4d4'; g.beginPath(); g.arc(lx, ly, 15, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.arc(lx - 4, ly - 3, 4, 0, 7); g.arc(lx + 5, ly + 4, 3, 0, 7); g.fill();
  }
  function serra(p, fator, base, alt, corS, sem) {
    g.fillStyle = corS; g.beginPath(); g.moveTo(0, D.VH);
    for (let x = 0; x <= D.VW + 4; x += 4) {
      const wx = x + cam.x * fator;
      const y = base - cam.y * fator * 0.5 + Math.sin(wx * 0.006 + sem) * alt * 0.5 + Math.sin(wx * 0.017 + sem * 2) * alt * 0.3 + (F.hash((wx / 12) | 0, sem) - 0.5) * alt * 0.12;
      g.lineTo(x, y);
    }
    g.lineTo(D.VW, D.VH); g.fill();
  }
  const silCache = {};
  function arvoresLonge(p, fator, passo, esc, corS, sem) {
    const base = cam.x * fator, i0 = Math.floor(base / passo) - 2;
    for (let i = i0; i < i0 + D.VW / passo + 5; i++) {
      const wx = (i * passo) / fator, reg = F.regiao(Math.max(0, wx));
      const lista = { ermo: ['st19', 'cz19', 'st22'], campos: ['arv_campos0', 'cp24', 'arv_campos1'], mata: ['arv_mata0', 'mt1', 'mt4', 'arv_mata1'], clareira: ['arv_cinzas0', 'st19', 'cz19'] }[reg.id];
      if (F.hash(i, sem) < (reg.id === 'mata' ? 0.05 : 0.35)) continue;
      const nome = lista[Math.floor(F.hash(i, sem + 1) * lista.length)];
      const x = i * passo - base + F.hash(i, sem + 2) * passo * 0.6;
      const y = D.VH * 0.78 - cam.y * fator * 0.6 + F.hash(i, sem + 3) * 10;
      S.desenha(g, nome, 0, x, y, F.hash(i, sem + 4) < 0.5, { esc: esc * (0.8 + F.hash(i, sem + 5) * 0.4), tinta: corS, tintaA: 1 });
    }
  }
  function nevoa(p, y0, alfa) {
    const gr = g.createLinearGradient(0, y0 - 50, 0, y0 + 40);
    const c = rgb(cor(p, 'nevoa'));
    gr.addColorStop(0, 'rgba(' + c + ',0)'); gr.addColorStop(0.6, 'rgba(' + c + ',' + alfa + ')'); gr.addColorStop(1, 'rgba(' + c + ',' + alfa * 0.6 + ')');
    g.fillStyle = gr; g.fillRect(0, y0 - 50, D.VW, D.VH - y0 + 50);
  }

  // ---------- gente ----------
  const ANDA = 'h_anda', GOLPE = 'h_golpe';
  function desenhaHeroi(h) {
    const info = S.info(ANDA); if (!info) return;
    const gi = S.info(GOLPE);
    let nome = ANDA, q = 0, o = { sx: 1, sy: 1 }, x = h.x, y = h.y;
    const vir = h.dir < 0;
    switch (h.estado) {
      case 'golpe': case 'forte': {
        nome = GOLPE; const k = Math.min(0.999, h.t / h.dur);
        q = Math.floor(k * gi.n);
        if (h.dirGolpe === 'baixo') o.rot = 0.7 * h.dir;
        if (h.dirGolpe === 'cima') o.rot = -0.45 * h.dir;
        break;
      }
      case 'carga': nome = GOLPE; q = 1; x += (Math.random() - 0.5) * (h.cheia ? 2 : 1); if (h.cheia || (tempo * 10 | 0) % 2) { o.tinta = '#ffe2a0'; o.tintaA = h.cheia ? 0.35 : 0.15; } break;
      case 'magia': nome = GOLPE; q = Math.min(gi.n - 1, 1 + Math.floor(h.t / 0.18)); o.tinta = window.Heroi.MAGIAS[h.magia].cor; o.tintaA = 0.3 * (1 - h.t / h.dur); break;
      case 'rola': {
        const k = h.t / 0.34;
        if (h.noAr) { q = 3; o.sx = 1.18; o.sy = 0.9; o.rot = 0.25 * h.dir; }
        else { q = 0; o.rot = k * Math.PI * 2 * h.dir; o.esc = 0.78; y -= 2; }
        break;
      }
      case 'dor': q = 0; o.branco = h.t < 0.1 ? 0.8 : 0; o.rot = -0.25 * h.dir; break;
      case 'morto': q = 0; o.rot = -Math.min(1, h.t / 0.4) * (Math.PI / 2) * h.dir; o.alpha = Math.max(0.2, 1 - h.t / 3); break;
      case 'acorda': { // sai da cova
        const k = Math.min(1, h.t / 1.4); y += (1 - k) * 30; o.alpha = k; break;
      }
      default:
        if (!h.noChao) { q = h.vy < -60 ? 1 : h.vy > 80 ? 4 : 2; const st = Math.min(0.14, Math.abs(h.vy) / 3500); o.sy = 1 + st; o.sx = 1 - st * 0.7; }
        else if (Math.abs(h.vx) > 12) { h.andou += Math.abs(h.vx) / 60; q = Math.floor(h.andou / 7) % info.n; }
        else { q = 0; o.sy = 1 + Math.sin(tempo * 2.4) * 0.012; }
    }
    if (h.amassa > 0) { o.sy *= 1 - h.amassa * 0.16; o.sx *= 1 + h.amassa * 0.14; }
    if (h.estado === 'beber') { q = 0; }
    if (h.inv > 0 && h.estado !== 'rola' && h.estado !== 'dor' && h.estado !== 'morto' && (tempo * 16 | 0) % 2) o.alpha = 0.45;
    // sombra no chão
    sombra(h.x, h.y, 10);
    // aura da guarda
    if (h.guarda > 0) { o.tinta = '#9fc4e0'; o.tintaA = 0.25 + Math.sin(tempo * 12) * 0.12; }
    if (h.estado === 'magia' || h.estado === 'carga') circuloMagico(h.x, h.y, h.estado === 'carga' ? (h.cheia ? '#ffe2a0' : '#c9a45a') : window.Heroi.MAGIAS[h.magia].cor, h.estado === 'carga' ? Math.min(1, h.carga / 0.9) : 1 - h.t / h.dur);
    S.desenha(g, nome, q, x, y, vir, o);
    if (h.estado === 'beber') S.desenha(g, 'cabaca', 0, h.x + h.dir * 6, h.y - 20 - Math.min(1, h.t * 3) * 6, vir, { esc: 0.4 });
    if (h.guarda > 0) { g.strokeStyle = 'rgba(180,220,255,' + (0.35 + Math.sin(tempo * 9) * 0.15) + ')'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI * 2 + tempo; g.lineTo(h.x + Math.cos(a) * 20, h.y - 16 + Math.sin(a) * 22); } g.stroke(); }
    if (h.estado === 'golpe' || h.estado === 'forte') arco(h);
  }
  // o arco do golpe: um crescente de luz que acompanha a lâmina
  function arco(h) {
    const k = h.t / h.dur; if (k < 0.12 || k > 0.75) return;
    const a = h.ficha.arma, forte = h.estado === 'forte', p = (k - 0.12) / 0.63;
    const cx = h.x, cy = h.y - h.h / 2 - 2, R = (a.alcance + (forte ? 14 : 4)) * 0.95;
    const corA = forte ? '#ffe2a0' : h.combo === 3 ? '#fff1c8' : '#ffffff', corB = forte ? '#ff9a40' : h.ficha.cor;
    g.save();
    g.globalCompositeOperation = 'lighter';
    if (h.ficha.arma === window.Heroi.ARMAS.lanca && h.dirGolpe === 'frente' && !forte) { // estocada
      const len = R * (0.5 + p * 0.8), y = cy + 2;
      const gr = g.createLinearGradient(cx, y, cx + h.dir * len, y);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, corA);
      g.globalAlpha = 1 - p * 0.7; g.fillStyle = gr; g.fillRect(Math.min(cx, cx + h.dir * len), y - 1.5, len, 3);
      g.fillStyle = corB; g.globalAlpha = (1 - p) * 0.5; g.fillRect(Math.min(cx, cx + h.dir * len), y - 3, len, 1); g.fillRect(Math.min(cx, cx + h.dir * len), y + 2, len, 1);
      g.restore(); return;
    }
    let a0, a1;
    if (h.dirGolpe === 'cima') { a0 = Math.PI * 1.05; a1 = Math.PI * 1.95; }
    else if (h.dirGolpe === 'baixo') { a0 = Math.PI * 0.05; a1 = Math.PI * 0.95; }
    else { a0 = -Math.PI * 0.62; a1 = Math.PI * 0.38; if (h.combo === 2) { const t2 = a0; a0 = a1; a1 = t2; } }
    if (h.dir < 0 && h.dirGolpe === 'frente') { a0 = Math.PI - a0; a1 = Math.PI - a1; }
    const ponta = a0 + (a1 - a0) * Math.min(1, p * 1.6), cauda = a0 + (a1 - a0) * Math.max(0, p * 1.6 - 0.75);
    const n = 14, esp = forte ? 9 : h.combo === 3 ? 7 : 5;
    g.globalAlpha = 1 - p * 0.6;
    g.beginPath();
    for (let i = 0; i <= n; i++) { const t = cauda + (ponta - cauda) * (i / n); g.lineTo(cx + Math.cos(t) * R, cy + Math.sin(t) * R); }
    for (let i = n; i >= 0; i--) { const t = cauda + (ponta - cauda) * (i / n), e = esp * Math.sin((i / n) * Math.PI * 0.5 + 0.2); g.lineTo(cx + Math.cos(t) * (R - e), cy + Math.sin(t) * (R - e)); }
    g.fillStyle = corB; g.fill();
    g.beginPath();
    for (let i = 0; i <= n; i++) { const t = cauda + (ponta - cauda) * (i / n); g.lineTo(cx + Math.cos(t) * R, cy + Math.sin(t) * R); }
    for (let i = n; i >= 0; i--) { const t = cauda + (ponta - cauda) * (i / n), e = esp * 0.45 * (i / n); g.lineTo(cx + Math.cos(t) * (R - e), cy + Math.sin(t) * (R - e)); }
    g.fillStyle = corA; g.fill();
    g.restore();
  }
  function circuloMagico(x, y, c, k) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25 + k * 0.6;
    g.strokeStyle = c; g.lineWidth = 1;
    g.save(); g.translate(x, y); g.scale(1, 0.32);
    g.beginPath(); g.arc(0, 0, 22, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, 16, 0, 7); g.stroke();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + tempo * 1.5; g.fillStyle = c; g.fillRect(Math.cos(a) * 19 - 1, Math.sin(a) * 19 - 1, 2, 2); }
    g.beginPath(); for (let i = 0; i <= 3; i++) { const a = i * Math.PI * 2 / 3 - tempo; g.lineTo(Math.cos(a) * 16, Math.sin(a) * 16); } g.stroke();
    g.restore(); g.restore();
  }
  function sombra(x, y, r) {
    // procura o chão logo abaixo
    let yy = y; for (let i = 0; i < 12 && !J.solido(x, yy + 1) && F.tile(Math.floor(x / T), Math.floor((yy + 1) / T)) !== 2; i++) yy += 8;
    const k = Math.max(0.15, 1 - (yy - y) / 100);
    g.fillStyle = 'rgba(0,0,0,' + 0.35 * k + ')'; g.beginPath(); g.ellipse(x, Math.floor((yy + 1) / T) * T, r * k, 2.5 * k, 0, 0, 7); g.fill();
  }
  function desenhaInimigo(e) {
    const tp = e.T, info = S.info(tp.spr); if (!info) return;
    let nome = tp.spr, q = 0; const o = { esc: tp.escala || 1 };
    const ge = tp.ge && S.info(tp.ge);
    const prep = tp.prep * (tp.chefe && e.hp < e.hpMax * 0.5 ? 0.8 : 1);
    if (e.estado === 'prep' || e.estado === 'golpe') {
      if (ge) { nome = tp.ge; const meio = Math.floor(ge.n / 2); q = e.estado === 'prep' ? Math.min(meio - 1, Math.floor((e.t / prep) * meio)) : meio + Math.min(ge.n - meio - 1, Math.floor((e.t / tp.golpe) * (ge.n - meio))); }
      else { q = e.estado === 'prep' ? 0 : 2; o.rot = (e.estado === 'prep' ? -0.18 : 0.15) * e.dir; if (e.estado === 'golpe') { o.sx = 1.12; o.sy = 0.92; } }
      if (e.estado === 'prep') { o.tinta = '#ff2a1a'; o.tintaA = 0.1 + 0.35 * Math.min(1, e.t / prep) * (0.6 + 0.4 * Math.sin(tempo * 30)); }
    } else if (e.estado === 'morto') { q = 0; o.alpha = Math.max(0, 1 - e.t / 1); o.rot = tp.voa ? 0 : Math.min(1, e.t / 0.35) * (Math.PI / 2) * -e.dir; o.tinta = '#ffcf6a'; o.tintaA = Math.min(0.6, e.t); }
    else if (tp.voa) q = Math.floor(tempo * 12 + e.ox) % info.n;
    else if (Math.abs(e.vx) > 5) q = Math.floor(e.andou / 6) % info.n;
    else { q = 0; o.sy = 1 + Math.sin(tempo * 2 + e.ox) * 0.015; }
    if (e.estado === 'cambaleia') { o.rot = Math.sin(e.t * 20) * 0.12; }
    if (e.estado === 'uiva') { nome = tp.ge || tp.spr; q = 0; o.sy = 1 + Math.sin(e.t * 30) * 0.04; o.tinta = '#c0a0ff'; o.tintaA = 0.3; }
    if (e.estado === 'salto' && e.t < 0.45) { o.sy = 0.85; o.sx = 1.12; }
    if (e.flash > 0) o.branco = (e.flash / 0.12) * 0.6;
    if (!tp.voa) sombra(e.x, e.y, e.w * 0.45);
    S.desenha(g, nome, q, e.x, e.y + (tp.voa ? Math.sin(tempo * 6 + e.ox) * 2 : 0), e.dir < 0, o);
    // olhos acendem quando ele te vê
    if (e.pisca > 0) { g.fillStyle = 'rgba(255,60,40,' + e.pisca * 2 + ')'; g.fillRect(e.x - 1, e.y - e.h * (tp.escala || 1) - 10, 2, 5); g.fillRect(e.x - 1, e.y - e.h * (tp.escala || 1) - 3, 2, 2); }
    if (e.estado === 'cambaleia') for (let i = 0; i < 3; i++) { const a = tempo * 6 + i * 2.1; g.fillStyle = '#ffe9a0'; g.fillRect(e.x + Math.cos(a) * 8, e.y - e.h - 6 + Math.sin(a) * 2, 2, 2); }
    if (!tp.chefe && e.vivo && e.hp < e.hpMax) {
      const w = Math.max(16, e.w), x = Math.round(e.x - w / 2), y = Math.round(e.y - e.h * (tp.escala || 1) - 8);
      g.fillStyle = '#0a0808cc'; g.fillRect(x - 1, y - 1, w + 2, 4); g.fillStyle = '#a8332b'; g.fillRect(x, y, w * Math.max(0, e.hp / e.hpMax), 2);
    }
  }
  function desenhaBala(b) {
    g.save(); g.globalCompositeOperation = 'lighter';
    if (b.tipo === 'lanca') {
      const a = Math.atan2(b.vy, b.vx); g.translate(b.x, b.y); g.rotate(a);
      g.fillStyle = b.cor; g.globalAlpha = 0.5; g.fillRect(-22, -1, 22, 2); g.globalAlpha = 1; g.fillStyle = '#fff'; g.fillRect(-10, -1, 14, 2); g.beginPath(); g.moveTo(8, 0); g.lineTo(2, -3); g.lineTo(2, 3); g.fill();
    } else {
      const r = b.r + Math.sin(tempo * 30) * 0.8;
      const gr = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, r * 2.4);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, b.cor); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, r * 2.4, 0, 7); g.fill();
    }
    g.restore();
  }
  function desenhaMagia(m) {
    g.save(); g.globalCompositeOperation = 'lighter';
    if (m.tipo === 'coluna') {
      const k = m.t / m.dur, sobe = Math.min(1, m.t / 0.12), alt = m.h * sobe, fade = k > 0.75 ? (1 - k) / 0.25 : 1;
      for (let i = 0; i < 3; i++) {
        const w = m.w * (1 - i * 0.28) * (0.9 + Math.sin(tempo * 40 + i) * 0.1);
        const gr = g.createLinearGradient(0, m.y - alt, 0, m.y);
        gr.addColorStop(0, 'rgba(255,120,40,0)'); gr.addColorStop(0.3, i === 2 ? '#fff6d0' : i === 1 ? '#ffb050' : '#ff5a20'); gr.addColorStop(1, i === 2 ? '#ffffff' : '#ffd27a');
        g.globalAlpha = fade * (0.6 + i * 0.15); g.fillStyle = gr; g.fillRect(m.x - w / 2, m.y - alt, w, alt);
      }
      g.globalAlpha = fade * 0.8; g.fillStyle = '#ffd27a'; g.beginPath(); g.ellipse(m.x, m.y, m.w * 0.9, 4, 0, 0, 7); g.fill();
    } else if (m.tipo === 'onda') {
      const k = m.t / m.dur, px = m.px == null ? m.x : m.px;
      g.globalAlpha = 1 - k; g.fillStyle = m.inimiga ? '#8a60c0' : '#e0b070';
      for (let i = 0; i < 5; i++) { const hh = (14 - i * 2.4) * (1 - k * 0.5); g.fillRect(px - m.d * i * 6 - 3, m.y - hh, 5, hh); }
    } else if (m.tipo === 'lampejo') {
      const k = m.t / m.dur, r = m.raio * (0.3 + k * 0.9);
      const gr = g.createRadialGradient(m.x, m.y, 0, m.x, m.y, r);
      gr.addColorStop(0, 'rgba(255,250,220,' + (1 - k) + ')'); gr.addColorStop(0.7, 'rgba(255,230,160,' + (1 - k) * 0.5 + ')'); gr.addColorStop(1, 'rgba(255,230,160,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(m.x, m.y, r, 0, 7); g.fill();
      g.strokeStyle = 'rgba(255,255,230,' + (1 - k) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(m.x, m.y, r, 0, 7); g.stroke();
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.fillStyle = '#fff6d0'; g.globalAlpha = 1 - k; g.fillRect(m.x + Math.cos(a) * r * 1.05 - 1, m.y + Math.sin(a) * r * 1.05 - 1, 2, 2); }
    }
    g.restore();
  }
  function desenhaFx(f) {
    const k = Math.max(0, f.vida / f.max);
    if (f.tipo === 'anel') {
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = f.cor; g.globalAlpha = k; g.lineWidth = f.larg * k + 0.5;
      g.beginPath(); g.arc(f.x, f.y, f.raio * (1 - k * 0.7), 0, 7); g.stroke(); g.restore(); return;
    }
    if (f.tipo === 'circulo') { circuloMagico(f.x, f.y, f.cor, k); return; }
    if (f.tipo === 'corte') { // o risco branco do impacto
      g.save(); g.globalCompositeOperation = 'lighter'; g.translate(f.x, f.y); g.rotate(-0.6 * f.dir); g.globalAlpha = k;
      g.fillStyle = f.cor; const l = f.tam * (1.2 - k * 0.4); g.fillRect(-l / 2, -1, l, 2); g.fillRect(-1, -l / 4, 2, l / 2); g.restore(); return;
    }
    const lighter = f.tipo === 'brasa' || f.tipo === 'alma' || f.tipo === 'faisca';
    if (lighter) { g.save(); g.globalCompositeOperation = 'lighter'; }
    g.globalAlpha = f.tipo === 'gota' ? (f.preso ? k : 1) : k;
    g.fillStyle = f.cor; const t = f.tipo === 'poeira' ? f.tam * (2 - k) : f.tam * (f.tipo === 'gota' ? 1 : 0.5 + k * 0.5);
    g.fillRect(Math.round(f.x - t / 2), Math.round(f.y - t / 2), Math.max(1, Math.round(t)), Math.max(1, Math.round(t)));
    g.globalAlpha = 1;
    if (lighter) g.restore();
  }
  function desenhaRastro(r) {
    const o = { alpha: (r.vida / r.max) * 0.45, tinta: r.cor, tintaA: 0.9 };
    if (r.noAr) { o.sx = 1.18; o.sy = 0.9; } else if (!r.anda) { o.rot = r.rot; o.esc = 0.78; }
    S.desenha(g, ANDA, r.noAr ? 3 : r.anda ? 2 : 0, r.x, r.y - (r.noAr || r.anda ? 0 : 2), r.dir < 0, o);
  }
  function placa(x, y) {
    g.fillStyle = '#2a1d12'; g.fillRect(x - 1, y - 18, 3, 18);
    g.fillStyle = '#5a4128'; g.fillRect(x - 9, y - 22, 19, 10); g.fillStyle = '#7a5a38'; g.fillRect(x - 9, y - 22, 19, 2);
    g.fillStyle = '#2a1d12'; g.fillRect(x - 6, y - 18, 12, 1); g.fillRect(x - 6, y - 15, 9, 1);
  }

  // ---------- luz ----------
  function brilho(x, y, r, c, a) {
    const gr = gl.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, c.replace('A', a)); gr.addColorStop(1, c.replace('A', 0));
    gl.fillStyle = gr; gl.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // ---------- o quadro ----------
  D.quadro = function (dt) {
    tempo += dt;
    const h = J.heroi; if (!h) return;
    const VW = D.VW, VH = D.VH;
    // câmera
    cam.alvoX += ((h.dir * 46 + h.vx * 0.15) - cam.alvoX) * Math.min(1, dt * 2.2);
    let cx = h.x + cam.alvoX - VW / 2, cy = h.y - VH * 0.62;
    if (J.chefeAtivo) { cx = Math.max(F.ARENA.x0 - 8, Math.min(cx, F.ARENA.x1 - VW + 8)); }
    cx = Math.max(0, Math.min(cx, F.W * T - VW)); cy = Math.max(0, Math.min(cy, F.H * T - VH));
    cam.x += (cx - cam.x) * Math.min(1, dt * 7); cam.y += (cy - cam.y) * Math.min(1, dt * 5);
    const tr = J.tremor, ox = Math.round(cam.x + (Math.random() - 0.5) * tr), oy = Math.round(cam.y + (Math.random() - 0.5) * tr);
    const p = paleta(cam.x + VW / 2);

    // fundo
    ceu(p);
    serra(p, 0.08, VH * 0.52, 60, cor(p, 'longe'), 3);
    arvoresLonge(p, 0.22, 46, 0.55, cor(p, 'longe'), 11);
    nevoa(p, VH * 0.72, 0.18);
    serra(p, 0.3, VH * 0.82, 30, cor(p, 'meio'), 7);
    arvoresLonge(p, 0.42, 58, 0.8, cor(p, 'meio'), 19);
    nevoa(p, VH * 0.9, 0.22);

    g.save(); g.translate(-ox, -oy);
    // enfeites de fundo
    for (const d of F.DECOR) {
      if (d.camada !== 0 || d.x < ox - 120 || d.x > ox + VW + 120) continue;
      S.desenha(g, d.spr, 0, d.x, d.y + 1, F.hash(d.x, 1) < 0.5, { esc: d.esc, tinta: '#05070c', tintaA: d.escuro });
    }
    // chão
    const p0 = Math.max(0, Math.floor(ox / (PED * T))), p1 = Math.min(Math.ceil(F.W / PED) - 1, Math.floor((ox + VW) / (PED * T)));
    for (let i = p0; i <= p1; i++) g.drawImage(pedaco(i), i * PED * T, 0);
    // coisas do mundo
    for (const pl of F.PLACAS) if (Math.abs(pl.x - h.x) < VW) placa(pl.x, pl.y);
    for (const b of F.BAUS) if (Math.abs(b.x - h.x) < VW) S.desenha(g, 'bau', 0, b.x, b.y, false, { esc: 0.5, alpha: J.save.abertos[b.id] ? 0.55 : 1, tinta: J.save.abertos[b.id] ? '#000' : null, tintaA: 0.4 });
    for (const fg of F.FOGUEIRAS) {
      if (Math.abs(fg.x - h.x) > VW) continue;
      const acesa = J.save.acesas[fg.id];
      // espada cravada, como marco
      g.fillStyle = '#6a6a72'; g.fillRect(fg.x - 1, fg.y - 26, 2, 20); g.fillStyle = '#3a2a1a'; g.fillRect(fg.x - 4, fg.y - 26, 8, 2); g.fillRect(fg.x - 1, fg.y - 31, 2, 5);
      S.desenha(g, acesa ? 'fogueira' : 'fogueira_apagada', acesa ? Math.floor(tempo * 9) : 0, fg.x, fg.y + 4, false, { esc: 0.75 });
    }
    for (const n of F.NPCS) if (Math.abs(n.x - h.x) < VW) S.desenha(g, n.spr, Math.floor(tempo * 3) % 4, n.x, n.y, false);
    const per = J.save.perdidas;
    if (per) { g.save(); g.globalCompositeOperation = 'lighter'; const r = 4 + Math.sin(tempo * 5); g.fillStyle = '#ffcf6a'; g.globalAlpha = 0.8; g.beginPath(); g.arc(per.x, per.y - 12, r, 0, 7); g.fill(); g.restore(); if (Math.random() < 0.3) J.fx.push({ tipo: 'brasa', x: per.x + (Math.random() - 0.5) * 8, y: per.y - 12, vx: 0, vy: -30, vida: 0.6, max: 0.6, cor: '#ffcf6a', tam: 1.5, grav: 0 }); }

    for (const e of J.inimigos) if (e.x > ox - 80 && e.x < ox + VW + 80) desenhaInimigo(e);
    for (const r of J.rastro) desenhaRastro(r);
    desenhaHeroi(h);
    for (const m of J.magias) desenhaMagia(m);
    for (const b of J.balas) desenhaBala(b);
    for (const f of J.fx) if (f.x > ox - 20 && f.x < ox + VW + 20) desenhaFx(f);
    // frente
    for (const d of F.DECOR) {
      if (d.camada !== 1 || d.x < ox - 120 || d.x > ox + VW + 120) continue;
      S.desenha(g, d.spr, 0, d.x, d.y + 8, F.hash(d.x, 2) < 0.5, { esc: d.esc, tinta: '#020304', tintaA: 0.85 });
    }
    g.restore();

    // luz: escuridão com furos de luz quente
    const reg = p.r, amb = num(p, 'luz');
    const a = Math.round(amb * 255), ab = Math.round(Math.min(255, amb * 255 * 1.15));
    gl.globalCompositeOperation = 'source-over'; gl.fillStyle = 'rgb(' + a + ',' + a + ',' + ab + ')'; gl.fillRect(0, 0, VW, VH);
    gl.globalCompositeOperation = 'lighter';
    const L = (x, y, r, c, al) => brilho(x - ox, y - oy, r, c, al);
    L(h.x, h.y - 16, 110, 'rgba(255,200,140,A)', 0.42);
    for (const fg of F.FOGUEIRAS) if (J.save.acesas[fg.id] && Math.abs(fg.x - h.x) < VW) L(fg.x, fg.y - 10, 150 + Math.sin(tempo * 13) * 6, 'rgba(255,160,70,A)', 0.85);
    for (const b of J.balas) L(b.x, b.y, 60, b.dono === 'h' ? 'rgba(255,170,80,A)' : 'rgba(170,110,255,A)', 0.7);
    for (const m of J.magias) L(m.px || m.x, m.y - 20, m.tipo === 'coluna' ? 140 : 90, m.tipo === 'lampejo' ? 'rgba(255,250,220,A)' : 'rgba(255,150,70,A)', m.tipo === 'onda' ? 0.3 : 0.9);
    if (per) L(per.x, per.y - 12, 50, 'rgba(255,200,100,A)', 0.7);
    if (h.estado === 'magia') L(h.x, h.y - 16, 90, 'rgba(255,230,180,A)', 0.6);
    if (reg.lua) L(VW * 0.74 + ox, 46 + oy, 160, 'rgba(200,170,220,A)', 0.25);
    g.globalCompositeOperation = 'multiply'; g.drawImage(luz, 0, 0); g.globalCompositeOperation = 'source-over';

    // vinheta, sangue na borda quando a vida está baixa, clarão
    const vg = g.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VW * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.fillStyle = vg; g.fillRect(0, 0, VW, VH);
    const pouca = h.hp / h.ficha.vida;
    if (pouca < 0.3 && h.estado !== 'morto') { const rv = g.createRadialGradient(VW / 2, VH / 2, VH * 0.3, VW / 2, VH / 2, VW * 0.6); rv.addColorStop(0, 'rgba(120,0,0,0)'); rv.addColorStop(1, 'rgba(140,10,10,' + (0.3 + Math.sin(tempo * 5) * 0.1) * (1 - pouca / 0.3) + ')'); g.fillStyle = rv; g.fillRect(0, 0, VW, VH); }
    if (J.clarao > 0) { g.fillStyle = 'rgba(255,240,220,' + Math.min(0.5, J.clarao * 0.5) + ')'; g.fillRect(0, 0, VW, VH); }

    // para a tela grande
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, cv.width, cv.height);
    // números de dano, nítidos
    const ex = cv.width / VW, ey = cv.height / VH;
    ctx.textAlign = 'center';
    for (const t of J.textos) {
      const k = t.vida / t.max, sz = Math.round((t.grande ? 13 : 10) * ey * 0.5 + 6) * (t.grande ? 1.15 : 1);
      ctx.font = '700 ' + sz + 'px Cinzel, serif'; ctx.globalAlpha = Math.min(1, k * 2.5);
      const x = (t.x - ox) * ex, y = (t.y - oy) * ey;
      ctx.lineWidth = Math.max(2, sz / 5); ctx.strokeStyle = '#000'; ctx.strokeText(t.t, x, y); ctx.fillStyle = t.cor; ctx.fillText(t.t, x, y);
    }
    ctx.globalAlpha = 1;
  };
  D.telaDe = (x, y) => ({ x: ((x - cam.x) * cv.width) / D.VW, y: ((y - cam.y) * cv.height) / D.VH });
  D.centrar = function () { const h = J.heroi; cam.x = Math.max(0, h.x - D.VW / 2); cam.y = Math.max(0, Math.min(h.y - D.VH * 0.62, F.H * T - D.VH)); cam.alvoX = 0; };
  D.ANDA = ANDA; D.GOLPE = GOLPE;
})();
