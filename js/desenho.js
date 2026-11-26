/* SINA · desenho. O mundo é pintado num quadro pequeno (320 px de altura) e ampliado sem borrar.
   Camadas: fundo pintado, árvores na névoa, árvores de perto, terra, enfeites, gente, frente, luz e números. */
(function () {
  'use strict';
  const D = window.Desenho = {};
  const F = window.Fase, J = window.Jogo, C = window.Dados, T = F.T, B = window.BARRO, A2 = window.ARTE2;
  const tela = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  let cv, ctx, buf, g, luz, gl; const bl = tela(2, 2), gb = bl.getContext('2d'), bl2 = tela(2, 2), gb2 = bl2.getContext('2d');
  D.VW = 568; D.VH = 320;
  const cam = (D.cam = { x: 0, y: 0, olha: 0 });
  let tempo = 0, noiteK = 0;
  const img = {}; // nome -> imagem
  const carregaImg = (src, n) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => { if ((n || 0) < 3) setTimeout(() => carregaImg(src, (n || 0) + 1).then(ok), 700); else { console.warn('faltou', src); ok(null); } }; i.src = src + '?v=21' + (n ? '&t=' + n : ''); });

  D.iniciar = function (canvas) {
    cv = canvas; ctx = cv.getContext('2d');
    buf = tela(10, 10); g = buf.getContext('2d'); luz = tela(10, 10); gl = luz.getContext('2d');
    D.ajustar(); addEventListener('resize', D.ajustar);
  };
  D.ajustar = function () {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(2, Math.round(innerWidth * dpr)); cv.height = Math.max(2, Math.round(innerHeight * dpr));
    const asp = innerWidth / Math.max(1, innerHeight);
    // cada pixel do mundo vira o mesmo número de pixels da tela; no celular a câmera chega mais perto
    const alvo = Math.min(innerWidth, innerHeight) < 520 ? 286 : 324, esc = Math.round(cv.height / alvo);
    let VH = esc >= 2 ? Math.ceil(cv.height / esc) : alvo, VW = esc >= 2 ? Math.ceil(cv.width / esc) : Math.round(alvo * asp);
    if (VW < 360) { VW = 360; VH = Math.min(640, Math.round(VW / asp)); }
    if (VW > 780) { VW = 780; VH = Math.round(VW / asp); }
    D.esc = esc >= 2 ? esc : cv.height / VH; VW += 1; VH += 1; // uma coluna e uma linha a mais para deslizar
    D.VW = VW; D.VH = VH;
    buf.width = VW; buf.height = VH; luz.width = VW; luz.height = VH;
    g.imageSmoothingEnabled = false;
  };
  D.carregar = async function (aviso) {
    const l = [];
    for (const r of B.roupas) l.push(['h_' + r, 'assets/barro/' + r + '.png']);
    for (const m in A2.monstros) { l.push(['m_' + m, 'assets/floresta/m_' + m + '.webp']); for (const x of ['anda', 'pose']) if (A2.monstros[m][x]) l.push(['m_' + m + '_' + x, 'assets/floresta/m_' + m + '_' + x + '.webp']); }
    for (const r in C.REGIOES) { l.push(['f_' + r, 'assets/floresta/f_' + r + '.webp']); l.push(['p_' + r, 'assets/floresta/p_' + r + '.webp']); }
    l.push(['h_mulher', 'assets/barro/mulher.png'], ['h_filho', 'assets/barro/filho.png'], ['h_vila', 'assets/barro/vila.png'], ['casa', 'assets/floresta/casa.webp'], ['cidade', 'assets/floresta/cidade.webp'], ['marcos', 'assets/floresta/marcos.webp'], ['itens', 'assets/floresta/itens.webp'], ['detalhes', 'assets/floresta/detalhes.webp'], ['bichinhos', 'assets/floresta/bichinhos.webp'], ['armas', 'assets/floresta/armas.webp']);
    l.push(['detalhes', 'assets/floresta/detalhes.webp'], ['bichinhos', 'assets/floresta/bichinhos.webp']);
    // primeiro o herói, a área onde o jogo vai abrir e o que todo lugar usa; o resto vem depois, sem segurar a tela
    let sv = null; try { sv = JSON.parse(localStorage.getItem('sina_primeiro')); } catch (e) { /* nada */ }
    const reg = sv && sv.area && C.REGIOES[sv.area] ? sv.area : sv && sv.area && sv.area.startsWith('covil_') ? sv.area.slice(6) : sv && sv.area === 'lar' ? 'vale' : 'floresta', roupa = (sv && sv.roupa) || 'barro';
    const ja = (k) => (k.startsWith('h_') && B.roupas.includes(k.slice(2)) ? k === 'h_barro' || k === 'h_' + roupa : /^[fp]_/.test(k) ? k.slice(2) === reg : !/_pose$/.test(k) && !['h_mulher', 'h_filho', 'h_vila', 'casa', 'cidade'].includes(k));
    const antes = l.filter(([k]) => ja(k)), depois = l.filter(([k]) => !ja(k)); let n = 0;
    await Promise.all(antes.map(async ([k, s]) => { img[k] = await carregaImg(s); n++; if (aviso) aviso(n / antes.length); }));
    D.resto = Promise.all(depois.map(async ([k, s]) => { img[k] = await carregaImg(s); }));
  };
  D.img = img;

  // ---------- peças ----------
  const regiao = () => C.REGIOES[F.atual.regiao];
  function prop(n, x, y, o) { // base no meio de baixo
    const p = A2.props[n], at = img['p_' + F.atual.regiao]; if (!p || !at) return;
    o = o || {}; const e = o.e || 1, w = p[2] * e, h = p[3] * e;
    if (x + w < cam.x - 10 || x - w > cam.x + D.VW + 10) return;
    if (o.a != null) g.globalAlpha = o.a;
    const inc = D.vivo ? D.vivo.inclina(n, x, y) : 0;
    if (inc) { g.save(); g.translate(Math.round(x), Math.round(y)); g.transform(1, 0, -inc, 1, 0, 0); if (o.v) g.scale(-1, 1); g.drawImage(at, p[0], p[1], p[2], p[3], Math.round(-w / 2), Math.round(-h), Math.round(w), Math.round(h)); g.restore(); }
    else if (o.v) { g.save(); g.translate(Math.round(x), 0); g.scale(-1, 1); g.drawImage(at, p[0], p[1], p[2], p[3], Math.round(-w / 2), Math.round(y - h), Math.round(w), Math.round(h)); g.restore(); }
    else g.drawImage(at, p[0], p[1], p[2], p[3], Math.round(x - w / 2), Math.round(y - h), Math.round(w), Math.round(h));
    g.globalAlpha = 1;
  }
  const itemEm = (gg, m, x, y, e) => { const p = A2.itens && A2.itens[m]; if (!p || !img.itens) return; gg.drawImage(img.itens, p[0], p[1], p[2], p[3], x, y, p[2] * e, p[3] * e); };
  D.icone = function (m, tam) { const c = tela(tam || 34, tam || 34), q = c.getContext('2d'); q.imageSmoothingEnabled = false; itemEm(q, m, 0, 0, (tam || 34) / 34); return c; };
  const tintas = {};
  function tingida(nome, regiaoId, cor, forca) { // silhueta misturada com a névoa, para as árvores ao longe
    const k = nome + regiaoId + cor + forca; if (tintas[k]) return tintas[k];
    const p = A2.props[nome], at = img['p_' + regiaoId]; if (!p || !at) return null;
    const c = tela(p[2], p[3]), q = c.getContext('2d'); q.drawImage(at, p[0], p[1], p[2], p[3], 0, 0, p[2], p[3]);
    q.globalCompositeOperation = 'source-atop'; q.globalAlpha = forca; q.fillStyle = 'rgb(' + cor + ')'; q.fillRect(0, 0, p[2], p[3]);
    return (tintas[k] = c);
  }
  const silh = {};
  function silhueta(im, cor, k) { const n = k + cor; if (silh[n]) return silh[n]; const c = tela(im.width, im.height), q = c.getContext('2d'); q.drawImage(im, 0, 0); q.globalCompositeOperation = 'source-in'; q.fillStyle = cor; q.fillRect(0, 0, c.width, c.height); return (silh[n] = c); }
  // fio de luz em volta do bicho, na cor da névoa do lugar: separa do fundo
  const fios = {};
  function fio(im, cor, k) {
    const n = k + cor; if (fios[n]) return fios[n];
    const c = tela(im.width, im.height), q = c.getContext('2d'), s = silhueta(im, 'rgb(' + cor + ')', k);
    for (const [x, y] of [[1, 0], [-1, 0], [0, -1], [1, -1], [-1, -1]]) q.drawImage(s, x, y);
    q.globalCompositeOperation = 'destination-out'; q.drawImage(im, 0, 0);
    return (fios[n] = c);
  }
  const clareia = {}; // névoa puxada para o claro
  const corFio = (R) => clareia[R.nevoa] || (clareia[R.nevoa] = R.nevoa.split(',').map((v) => Math.min(255, Math.round(+v * 0.55 + 118))).join(','));
  // desenhos que se repetem todo quadro ficam prontos
  const prontos = new Map();
  function guarda(k, w, h, f) { let c = prontos.get(k); if (!c) { c = tela(w, h); f(c.getContext('2d'), w, h); if (prontos.size > 90) prontos.clear(); prontos.set(k, c); } return c; }
  const mancha = (cor) => guarda('m' + cor, 64, 64, (q) => { const gr = q.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(' + cor + ',1)'); gr.addColorStop(1, 'rgba(' + cor + ',0)'); q.fillStyle = gr; q.fillRect(0, 0, 64, 64); });
  const hash = (n) => { let k = (n * 374761393) | 0; k = Math.imul(k ^ (k >>> 13), 1274126177); return ((k ^ (k >>> 16)) >>> 0) / 4294967296; };

  // ---------- fundo ----------
  function fundo() {
    const R = regiao(), im = img['f_' + F.atual.regiao], VW = D.VW, VH = D.VH;
    g.fillStyle = 'rgb(' + R.nevoa + ')'; g.fillRect(0, 0, VW, VH);
    if (im) {
      const esc = Math.max(1, (VH + 40) / 384), w = Math.round(688 * esc), h = Math.round(384 * esc);
      const off = cam.x * 0.14, i0 = Math.floor(off / w);
      const yy = Math.round(-((h - VH) * 0.5) - (cam.y - 180) * 0.05); const y = Math.max(VH - h, Math.min(0, yy));
      for (let i = i0; i <= i0 + Math.ceil(VW / w) + 1; i++) {
        const x = Math.round(i * w - off);
        if (x > VW || x + w < 0) continue;
        if (i & 1) { g.save(); g.translate(x + w, 0); g.scale(-1, 1); g.drawImage(im, 0, y, w, h); g.restore(); } else g.drawImage(im, x, y, w, h);
      }
    }
    raios(R); if (D.vivo) D.vivo.fundo(g, D.dt || 0);
    camadaArvores(0.34, 0.6, 150, 0.5, 11);
    nevoa(R, 0.34);
    camadaArvores(0.58, 0.34, 210, 0.85, 29);
    nevoa(R, 0.2);
  }
  function camadaArvores(par, forca, passo, esc, sem) {
    const R = regiao(), off = cam.x * par, i0 = Math.floor(off / passo) - 2;
    for (let i = i0; i < i0 + Math.ceil(D.VW / passo) + 4; i++) {
      const r1 = hash(i * 7 + sem), r2 = hash(i * 13 + sem), seca = ['zumbis', 'goblins', 'lobos'].includes(F.atual.regiao); if (R.semArvores) { if (r1 < 0.45) continue; const t2 = tingida(r2 < 0.5 ? 'pilar' : 'pedrao', F.atual.regiao, R.nevoa, forca); if (!t2) continue; const e2 = esc * 2.2 * (0.8 + r1 * 0.5), w2 = Math.round(t2.width * e2), h2 = Math.round(t2.height * e2), x2 = Math.round(i * passo - off + r2 * 90), y2 = Math.round(D.VH * 0.94 - (cam.y - 190) * par * 0.3); g.drawImage(t2, x2 - w2 / 2, y2 - h2, w2, h2); continue; }
      if (r1 < (seca ? 0.5 : 0.12)) continue;
      const nome = r2 < 0.5 && !seca ? 'arvorao' : 'arvore';
      const t = tingida(nome, F.atual.regiao, R.nevoa, forca); if (!t) continue;
      const e = esc * (0.85 + r1 * 0.5) * (nome === 'arvore' ? 1.35 : 1), w = Math.round(t.width * e), h = Math.round(t.height * e);
      const x = Math.round(i * passo - off + r2 * 90), y = Math.round(D.VH * 0.94 - (cam.y - 190) * par * 0.3);
      if (r2 * 7 % 1 < 0.5) { g.save(); g.translate(x, 0); g.scale(-1, 1); g.drawImage(t, -w / 2, y - h, w, h); g.restore(); } else g.drawImage(t, x - w / 2, y - h, w, h);
    }
  }
  function nevoa(R, a) {
    g.drawImage(guarda('nev' + R.nevoa + a, 2, 128, (q, w, h) => { const gr = q.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(' + R.nevoa + ',0)'); gr.addColorStop(0.7, 'rgba(' + R.nevoa + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + R.nevoa + ',' + a * 0.7 + ')'); q.fillStyle = gr; q.fillRect(0, 0, w, h); }), 0, D.VH * 0.3, D.VW, D.VH * 0.7);
  }
  function raios(R) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const off = cam.x * 0.2;
    for (let i = 0; i < 5; i++) {
      const x = ((i * 190 - off) % (D.VW + 300) + D.VW + 300) % (D.VW + 300) - 150, a = 0.05 + 0.035 * Math.sin(tempo * 0.5 + i * 1.7), w = 26 + i * 9;
      g.globalAlpha = a * 2; g.setTransform(1, 0, -0.42, 1, x, 0);
      g.drawImage(guarda('raio' + R.nevoa, 32, 160, (q, rw, rh) => { const gr = q.createLinearGradient(0, 0, 0, rh); gr.addColorStop(0, 'rgba(' + R.nevoa + ',1)'); gr.addColorStop(1, 'rgba(' + R.nevoa + ',0)'); q.fillStyle = gr; q.fillRect(4, 0, rw - 8, rh); q.globalAlpha = 0.5; q.fillRect(0, 0, rw, rh); }), 0, 0, w, D.VH * 0.85); g.setTransform(1, 0, 0, 1, 0, 0);
    }
    g.restore();
  }

  // ---------- terra, em pedaços guardados ----------
  const PED = 32; let pedacos = new Map(), areaPed = null;
  const aberto = (e) => !e.oco || F.atual.fracas.some((f) => J.save.fracas[f.id] && f.c0 * T >= e.x0 && f.c1 * T <= e.x1);
  function pintaPedaco(i) {
    const c = tela(PED * T, F.H * T), q = c.getContext('2d'); q.imageSmoothingEnabled = false;
    const at = img['p_' + F.atual.regiao], p = A2.props.chao, R = regiao(); if (!at) return c;
    const x0 = i * PED, LARG = 560, SUP = 27; // SUP: altura da linha do chão dentro da peça
    // as paredes de emboscada e de arena são desenhadas à parte: não entram na terra guardada
    const AR = F.atual.arena, parede = (tx) => (F.fechos && F.fechos.includes(tx)) || (F.fechada && AR && (tx === Math.floor(AR.x0 / T) || tx === Math.floor(AR.x1 / T) - 1));
    // câmara escondida: parece terra maciça até o chão quebrar
    const ocos = F.atual.escuros.filter((e) => e.oco && !aberto(e));
    const oculto = (tx, ty) => ocos.some((e) => tx * T >= e.x0 && tx * T < e.x1 && ty * T >= e.y0 && ty * T < e.y1);
    const solido = (tx, ty) => oculto(tx, ty) || F.tile(tx, ty) === 1 && !(tx >= 0 && tx < F.W && ty < F.atual.topo[tx] && parede(tx));
    for (let lx = 0; lx < PED; lx++) {
      const tx = x0 + lx; if (tx >= F.W) break;
      let prof = -1;
      for (let ty = 0; ty < F.H; ty++) {
        if (!solido(tx, ty)) { prof = -1; continue; }
        prof = prof < 0 ? (ty === 0 || solido(tx, ty - 1) ? 6 : 0) : prof + 1;
        const x = lx * T, y = ty * T, sx = p[0] + ((tx * T) % LARG), k = prof & 3, linha = k === 0 ? 0 : k === 1 ? 1 : k === 2 ? 1 : 0;
        const sy = p[1] + 48 + linha * 18;
        if (k >= 2) { q.save(); q.translate(0, y + T); q.scale(1, -1); q.drawImage(at, sx, sy, T, T, x, 0, T, T); q.restore(); } else q.drawImage(at, sx, sy, T, T, x, y, T, T);
        q.fillStyle = 'rgba(' + R.terra.map((v) => Math.round(v * 0.35)).join(',') + ',' + Math.min(0.94, 0.1 + prof * 0.11) + ')'; q.fillRect(x, y, T, T);
        // paredes: luz fraca na quina
        if (!solido(tx - 1, ty) && tx > 0) { q.fillStyle = 'rgba(0,0,0,0.55)'; q.fillRect(x, y, 2, T); q.fillStyle = 'rgba(' + R.nevoa + ',0.16)'; q.fillRect(x + 2, y, 1, T); }
        if (!solido(tx + 1, ty)) { q.fillStyle = 'rgba(0,0,0,0.6)'; q.fillRect(x + T - 2, y, 2, T); q.fillStyle = 'rgba(' + R.nevoa + ',0.08)'; q.fillRect(x + T - 3, y, 1, T); }
      }
    }
    // sombra funda perto das paredes e no pé dos barrancos
    for (let lx = -1; lx <= PED; lx++) { const tx = x0 + lx; if (tx < 1 || tx >= F.W - 1) continue; const tp = F.atual.topo[tx]; for (const d of [-1, 1]) { const viz = F.atual.topo[tx + d]; if (tp - viz >= 2 && tp < F.H) { const px = lx * T + (d > 0 ? T : 0), gr = q.createLinearGradient(px, 0, px - d * 22, 0); gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); q.fillStyle = gr; q.fillRect(d > 0 ? px - 22 : px, tp * T, 22, 30); } if (viz - tp >= 2) { const px = lx * T + (d > 0 ? T : 0), gr = q.createLinearGradient(px, 0, px - d * 14, 0); gr.addColorStop(0, 'rgba(0,0,0,0.42)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); q.fillStyle = gr; q.fillRect(d > 0 ? px - 14 : px, tp * T + 6, 14, Math.min(22, viz - tp) * T); q.fillStyle = 'rgba(' + R.nevoa + ',0.13)'; q.fillRect(d > 0 ? px - 1 : px, tp * T + 8, 1, Math.min(22, viz - tp) * T - 8); } } }
    c.luzes = []; if (D.vivo) { q.save(); D.vivo.enterra(q, x0, PED, solido, c.luzes); q.restore(); }
    // degrau de um bloco vira ladeira: a terra enche o canto e o capim acompanha
    const ladeiras = [];
    for (let lx = -1; lx <= PED; lx++) { const tx = x0 + lx; if (tx < 1 || tx >= F.W - 1) continue; const tp = F.atual.topo[tx]; if (tp >= F.H || F.tile(tx, tp - 1) !== 0) continue; for (const d of [-1, 1]) if (tp - F.atual.topo[tx + d] === 1 && F.tile(tx + d, tp - 1) === 1) ladeiras.push([lx, tp, d]); }
    const L = 13; for (const [lx, tp, d] of ladeiras) for (let i = 0; i < L; i++) { const px = d > 0 ? lx * T + T - 1 - i : lx * T + i, k = i / L, yy = Math.round((tp - 1) * T + T * (k * k * (3 - 2 * k))), sx = p[0] + (((x0 + lx) * T + i) % LARG); q.drawImage(at, sx, p[1] + 48, 1, Math.max(1, tp * T - yy + 2), px, yy, 1, Math.max(1, tp * T - yy + 2)); q.fillStyle = 'rgba(' + R.terra.map((v) => Math.round(v * 0.35)).join(',') + ',0.12)'; q.fillRect(px, yy, 1, tp * T - yy + 2); }
    // capim por cima de toda superfície
    for (let lx = -1; lx <= PED; lx++) {
      const tx = x0 + lx; if (tx < 0 || tx >= F.W) continue;
      for (let ty = 1; ty < F.H; ty++) {
        if (solido(tx, ty) && !solido(tx, ty - 1) && F.tile(tx, ty - 1) !== 3) {
          const sx = p[0] + ((tx * T) % LARG);
          q.drawImage(at, sx, p[1], T, 46, lx * T, ty * T - SUP, T, 46);
          if (!solido(tx - 1, ty)) q.drawImage(at, sx, p[1] + 14, 6, 30, lx * T - 4, ty * T - SUP + 15, 5, 26);
          if (!solido(tx + 1, ty)) q.drawImage(at, sx, p[1] + 14, 6, 30, lx * T + T - 1, ty * T - SUP + 15, 5, 26);
        }
      }
    }
    for (const [lx, tp, d] of ladeiras) for (let i = 0; i < L; i++) { const px = d > 0 ? lx * T + T - 1 - i : lx * T + i, k = i / L, yy = Math.round((tp - 1) * T + T * (k * k * (3 - 2 * k))); q.drawImage(at, p[0] + (((x0 + lx) * T + px) % LARG + LARG) % LARG, p[1], 1, 40, px, yy - SUP + 1, 1, 40); }
    // galhos para pisar
    const po = A2.props.ponte;
    for (let ty = 0; ty < F.H; ty++) for (let lx = -8; lx < PED; lx++) {
      const tx = x0 + lx; if (tx < 0 || F.tile(tx, ty) !== 2 || F.tile(tx - 1, ty) === 2 || oculto(tx, ty)) continue;
      let n = 1; while (F.tile(tx + n, ty) === 2) n++;
      const w = n * T + 10, m = Math.min(po[2] / 2, Math.ceil(w / 2)), x = lx * T - 5, y = ty * T - 5;
      q.drawImage(at, po[0], po[1], m, po[3], x, y, m, po[3]);
      q.drawImage(at, po[0] + po[2] - m, po[1], m, po[3], x + w - m, y, m, po[3]);
    }
    // espinhos: raízes pontudas
    for (let ty = 0; ty < F.H; ty++) for (let lx = 0; lx < PED; lx++) {
      const tx = x0 + lx; if (F.tile(tx, ty) !== 3) continue;
      for (let k = 0; k < 3; k++) {
        const r = hash(tx * 31 + k * 7), bx = lx * T + 2 + k * 5, alt = 12 + r * 14, incl = (hash(tx * 17 + k) - 0.5) * 8, by = ty * T + T + 3;
        q.fillStyle = '#0c0a0a'; q.beginPath(); q.moveTo(bx - 3, by); q.lineTo(bx + incl, by - alt - 1); q.lineTo(bx + 4, by); q.fill();
        q.fillStyle = 'rgb(' + R.terra.map((v) => v + 34).join(',') + ')'; q.beginPath(); q.moveTo(bx - 2, by); q.lineTo(bx + incl, by - alt); q.lineTo(bx + 1, by); q.fill();
        q.fillStyle = 'rgba(' + R.nevoa + ',0.7)'; q.fillRect(Math.round(bx + incl), Math.round(by - alt), 1, 3);
      }
    }
    return c;
  }
  function pedaco(i) {
    if (areaPed !== F.atual.id) { pedacos = new Map(); areaPed = F.atual.id; }
    let c = pedacos.get(i);
    if (!c) { c = pintaPedaco(i); if (!img['p_' + F.atual.regiao]) return c; if (pedacos.size > 10) pedacos.delete(pedacos.keys().next().value); pedacos.set(i, c); }
    return c;
  }
  D.repintar = () => { areaPed = null; };

  // ---------- herói ----------
  // mão da frente em cada quadro: x, y, ângulo da arma (graus, 0 = para a frente), 1 = arma atrás do corpo
  const MAO = {
    parado: [[60, 54, 62], [60, 54, 62], [60, 54, 62], [60, 54, 62]],
    correr: [[65, 47, -62], [68, 38, -70], [68, 36, -74], [67, 43, -66], [62, 47, -60], [69, 40, -66], [71, 36, -74], [70, 42, -68]],
    golpe1: [[28, 33, -150, 1], [26, 28, -135, 1], [78, 38, 4], [69, 41, 28]],
    golpe2: [[31, 51, 150, 1], [36, 18, -58], [33, 20, -110]],
    golpe3: [[27, 21, -140, 1], [26, 18, -125, 1], [68, 81, 12], [74, 81, 8]],
    pulo: [[68, 51, -30], [63, 21, -70], [66, 25, -62], [66, 33, -50], [57, 39, -30], [31, 50, 160, 1]],
    cima: [[32, 53, 140, 1], [58, 18, -84], [63, 28, -50]],
    baixo: [[57, 64, 88]], dor: [[56, 45, 70], [56, 45, 70], [55, 45, 70]],
  };
  // a lança tem jeito próprio: em pé ao lado do corpo, deitada na corrida, reta na estocada (a mão corre pelo cabo)
  const MAO_LANCA = {
    parado: [[63, 56, -84, 0, 24], [63, 56, -84, 0, 24], [63, 56, -84, 0, 24], [63, 56, -84, 0, 24]],
    correr: [[65, 47, -12, 0, 20], [68, 42, -14, 0, 20], [68, 41, -15, 0, 20], [67, 45, -13, 0, 20], [62, 48, -11, 0, 20], [69, 43, -13, 0, 20], [71, 41, -15, 0, 20], [70, 44, -14, 0, 20]],
    golpe1: [[38, 41, -4, 1, 26], [34, 40, -3, 1, 28], [78, 38, 1, 0, 12], [69, 41, 3, 0, 16]],
    golpe2: [[36, 46, -10, 1, 26], [36, 18, -24, 0, 18], [33, 20, -60, 0, 20]],
    golpe3: [[27, 21, -118, 1, 18], [26, 18, -100, 1, 18], [68, 81, 14, 0, 14], [74, 81, 10, 0, 14]],
    pulo: [[68, 51, -26, 0, 20], [63, 24, -62, 0, 20], [66, 27, -56, 0, 20], [66, 34, -44, 0, 20], [57, 40, -30, 0, 20], [40, 50, -20, 1, 22]],
    cima: [[40, 53, -84, 1, 26], [58, 18, -88, 0, 12], [63, 28, -84, 0, 16]],
    baixo: [[57, 60, 89, 0, 14]], dor: [[56, 48, 40, 0, 20], [56, 48, 40, 0, 20], [55, 48, 40, 0, 20]],
  };
  const PE = 85;
  // qual pose mostrar agora
  function pose(h) {
    const k = h.dur ? h.t / h.dur : 0;
    switch (h.estado) {
      case 'dorme': return J.quadroSono(h);
      case 'pesca': return ['colher', h.t < 0.25 ? 1 : 0];
      case 'nasce': return ['nascer', Math.min(5, h.nq || 0)];
      case 'morto': return ['morte', Math.min(5, Math.floor(h.t * 6))];
      case 'dor': return ['dor', Math.min(2, Math.floor(h.t * 10))];
      case 'colhe': return ['colher', Math.min(3, Math.floor(h.t * (h.rapido ? 18 : 10)))];
      case 'escala': return ['pulo', 1 + (Math.floor(h.andou / 12) % 2)];
      case 'cava': { const f = (h.t % 0.42) / 0.42; return ['golpe3', f < 0.35 ? 1 : f < 0.6 ? 2 : 3]; }
      case 'minera': { const f = (h.t % 0.36) / 0.36; return ['golpe1', f < 0.3 ? 1 : 2]; }
      case 'come': return ['magia', h.t < 0.3 ? 0 : 3];
      case 'rola': return h.noAr ? ['rola', 0] : ['rola', Math.min(5, Math.floor((h.t / 0.42) * 6))];
      case 'carga': return ['golpe1', h.t < 0.12 ? 0 : 1];
      case 'forte':
        if (h.pesado === 'passa' || h.pesado === 'carga') return ['golpe1', k < 0.06 ? 1 : k < 0.86 ? 2 : 3];
        if (h.pesado === 'gancho') return ['cima', k < 0.2 ? 0 : k < 0.72 ? 1 : 2];
        if (h.pesado === 'giro') return k < 0.16 ? ['golpe1', 0] : k < 0.5 ? ['golpe1', 2] : k < 0.8 ? ['golpe2', 1] : ['golpe1', 3];
        if (h.pesado === 'salto') return h.noChao ? ['golpe3', k < 0.9 ? 2 : 3] : ['golpe3', h.vy < 0 ? 0 : 1];
        return ['golpe3', k < 0.14 ? 0 : k < 0.28 ? 1 : k < 0.75 ? 2 : 3];
      case 'mira': return ['arco', h.t < 0.1 ? 0 : h.t < 0.3 ? 1 : 2];
      case 'soltou': return ['arco', 3];
      case 'magia': return ['magia', k < 0.22 ? 0 : k < 0.48 ? 1 : k < 0.75 ? 2 : 3];
      case 'golpe':
        if (h.dirGolpe === 'cima') return ['cima', k < 0.22 ? 0 : k < 0.7 ? 1 : 2];
        if (h.dirGolpe === 'baixo') return ['baixo', 0];
        if (h.ficha.arma.estoca) { // estocadas: a segunda recolhe menos, a terceira entra mais
          if (h.combo === 2) return ['golpe1', k < 0.08 ? 3 : k < 0.2 ? 1 : k < 0.72 ? 2 : 3];
          return ['golpe1', k < (h.final ? 0.22 : 0.1) ? 0 : k < (h.final ? 0.34 : 0.24) ? 1 : k < 0.76 ? 2 : 3];
        }
        if (h.pg && h.pg.a === 'golpe2') return ['golpe2', k < 0.24 ? 0 : k < 0.72 ? 1 : 2];
        if (h.pg && h.pg.a === 'golpe3') return ['golpe3', k < 0.18 ? 0 : k < 0.32 ? 1 : k < 0.78 ? 2 : 3];
        return ['golpe1', k < 0.1 ? 0 : k < 0.24 ? 1 : k < 0.72 ? 2 : 3];
    }
    if (!h.noChao) return ['pulo', h.vy < -420 ? 1 : h.vy < -170 ? 2 : h.vy < 130 ? 3 : h.vy < 380 ? 4 : 5];
    if (h.amassa > 0.45 && Math.abs(h.vx) < 60) return ['pulo', 0];
    if (Math.abs(h.vx) > 16) return ['correr', Math.floor(h.andou / 13.5) % 8];
    const c = tempo % 4; return ['parado', c < 1.4 ? 0 : c < 2.1 ? 1 : c < 3.2 ? 3 : 1];
  }
  function quadroHeroi(q, roupa, anim, n, x, y, o) {
    const im = img['h_' + roupa] || img.h_barro, a = B.anims[anim]; if (!im || !a) return;
    const k = a[0] + Math.min(a[1] - 1, n), sx = (k % B.cols) * B.q, sy = Math.floor(k / B.cols) * B.q;
    q.save(); q.translate(Math.round(x), Math.round(y)); q.scale((o && o.dir) || 1, 1);
    if (o && o.sx) q.scale(o.sx, o.sy);
    const arma = o && o.arma, tab = arma && arma.startsWith('lanca') ? MAO_LANCA : MAO, m = arma && tab[anim] && tab[anim][Math.min(tab[anim].length - 1, n)];
    const poeArma = () => { const p = A2.armas && A2.armas[arma]; if (!p) return; q.save(); q.translate(m[0] - 50, m[1] - PE); q.rotate(((m[2] + (o.giro || 0)) * Math.PI) / 180); const pega = arma.startsWith('lanca') ? m[4] : arma === 'machado' || arma === 'machado_ferro' ? 8 : 5; q.drawImage(img.armas, p[0], p[1], p[2], p[3], -pega, -Math.round(arma === 'machado' || arma === 'machado_ferro' ? p[3] * 0.4 : p[3] / 2), p[2], p[3]); q.restore(); };
    if (m && m[3]) poeArma();
    q.drawImage((o && o.sil ? silhueta(im, o.sil, 'h' + roupa) : im), sx, sy, B.q, B.q, -50, -PE, B.q, B.q);
    if (m && !m[3]) poeArma();
    if (o && o.branco) { q.globalAlpha = o.branco; q.drawImage(silhueta(im, '#ffffff', 'h' + roupa), sx, sy, B.q, B.q, -50, -PE, B.q, B.q); }
    q.restore();
  }
  D.quadroHeroi = quadroHeroi;
  function desenhaHeroi(h) {
    const [anim, n] = pose(h); h.anim = anim; h.quadro = n;
    let sx = 1, sy = 1;
    if (h.estado === 'dorme' && anim === 'dormir' && n >= 4) sy = 1 + Math.sin(tempo * 1.7) * 0.025;
    if (h.estado === 'livre' && h.noChao && Math.abs(h.vx) < 10 && !(h.amassa > 0)) sy = 1 + Math.sin(tempo * 2.1) * 0.012;
    if (h.estado === 'livre') { if (h.amassa > 0) { sx = 1 + h.amassa * 0.1; sy = 1 - h.amassa * 0.12; } else if (!h.noChao && h.vy < -300) { sx = 0.96; sy = 1.05; } }
    const treme = h.estado === 'carga' ? (Math.random() - 0.5) * (h.cheia ? 2 : 1) : 0;
    if (h.estado !== 'morto') sombra(h.x, h.y, 14);
    const arma = ['golpe', 'forte', 'carga', 'livre', 'dor'].includes(h.estado) && !h.ficha.arma.tiro && J.save.arma !== 'punho' ? J.save.arma : null;
    const k = h.dur ? h.t / h.dur : 0;
    let giro = 0; // a arma acompanha o arco do golpe
    if (h.estado === 'golpe' && h.dirGolpe === 'frente' && !h.ficha.arma.estoca) { const an = h.pg ? h.pg.a : 'golpe1'; if (an === 'golpe1' && k > 0.24 && !(h.final && h.ficha.arma.per === 'lamina')) giro = -70 + Math.min(1, (k - 0.24) / 0.25) * 90; if (an === 'golpe2' && k > 0.24) giro = 70 - Math.min(1, (k - 0.24) / 0.25) * 90; }
    const pisca = h.inv > 0 && h.estado !== 'dor' && h.estado !== 'rola' && Math.floor(h.inv * 18) % 2 === 0;
    if (J.save.tochaAcesa && !['rola', 'dorme', 'morto', 'nasce'].includes(h.estado)) tochaNaMao(h, anim);
    if (h.estado === 'pesca') linhaPesca(h);
    if (pisca) g.globalAlpha = 0.45;
    if (h.vento > 0) { g.globalAlpha *= 0.9; }
    quadroHeroi(g, J.save.roupa, anim, n, h.x + treme, h.y + 1 + (h.degrau > 0 ? h.degrau * 60 : 0), { dir: h.dir, sx, sy, arma, giro, branco: h.estado === 'dor' && h.t < 0.1 ? 0.8 : h.cheia ? 0.15 + 0.15 * Math.sin(tempo * 30) : 0 });
    g.globalAlpha = 1;
    if (h.veneno > 0) { g.globalAlpha = 0.25 + 0.15 * Math.sin(tempo * 8); quadroHeroi(g, J.save.roupa, anim, n, h.x, h.y + 1, { dir: h.dir, sil: '#8ac030' }); g.globalAlpha = 1; }
    if (h.estado === 'golpe' || h.estado === 'forte') { arco(h); if (D.vivo && k > 0.25 && k < 0.7) D.vivo.corta(h); }
    if (h.estado === 'mira') { const k2 = Math.min(1, h.t / 0.8); g.fillStyle = h.cheia ? '#ffe2a0' : '#c9bfa2'; g.fillRect(h.x - 12, h.y - 74, 24 * k2, 2); const am = J.anguloMira(h, k2); flecha(h.x + h.dir * 14, h.y - 41, h.dir > 0 ? am : Math.PI - am); const v = 300 + 260 * k2, gv = 260 * (1.3 - k2); g.fillStyle = h.cheia ? '#ffe2a0' : '#e8e0c8'; for (let i = 2; i < 16; i++) { const tt = i * 0.035, px = h.x + h.dir * 20 + h.dir * Math.cos(am) * v * tt, py = h.y - 41 + Math.sin(am) * v * tt + gv * tt * tt / 2; g.globalAlpha = 0.6 * (1 - i / 16); g.fillRect(Math.round(px), Math.round(py), 2, 2); } g.globalAlpha = 1; }
    if (J.save.magias.length && h.estado === 'magia') brilhos.push([h.x + h.dir * 14, h.y - 40, 60, '255,170,80', 0.7]);
  }
  function linhaPesca(h) {
    const lx = F.atual.lugar.lago, mx = h.x + h.dir * 14, my = h.y - 30, px = mx + h.dir * 30, py = my - 26, afunda = h.t > h.morde && h.t < h.morde + 0.75, by = h.y - 1 + (afunda ? 5 + Math.sin(tempo * 40) * 2 : Math.sin(tempo * 2.4) * 1.2);
    g.strokeStyle = '#0c0a08'; g.lineWidth = 3; g.beginPath(); g.moveTo(mx, my); g.lineTo(px, py); g.stroke(); g.strokeStyle = '#8a6240'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(mx, my); g.lineTo(px, py); g.stroke();
    if (h.t > 0.35) { g.strokeStyle = 'rgba(230,236,230,0.6)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo((px + lx) / 2, py + 26, lx, by); g.stroke(); g.fillStyle = '#c8402e'; g.fillRect(lx - 1, by - 3, 3, 4); if (afunda) { g.fillStyle = '#ffe2a0'; g.fillRect(h.x - 1, h.y - 82, 3, 9); g.fillRect(h.x - 1, h.y - 71, 3, 3); } }
  }
  // a tocha vai na mão de trás
  function tochaNaMao(h, anim) {
    const baixo = anim === 'golpe3' || anim === 'colher', x = Math.round(h.x - h.dir * (anim === 'correr' ? 15 : 11)), y = Math.round(h.y - (baixo ? 30 : 38) + (anim === 'correr' ? Math.sin(h.andou / 8) * 1.5 : 0));
    g.save(); g.translate(x, y); g.scale(h.dir, 1); g.rotate(-0.35);
    g.fillStyle = '#0c0a08'; g.fillRect(-2, -15, 5, 24); g.fillStyle = '#7a5232'; g.fillRect(-1, -14, 3, 22); g.fillStyle = '#a87848'; g.fillRect(-1, -14, 1, 22); g.fillStyle = '#c8a868'; g.fillRect(-2, -16, 5, 4); g.restore();
    const fx0 = x - h.dir * 5, fy = y - 15;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const [cor, alt, larg, al] of [['#c8321a', 17, 8, 0.6], ['#ff7a24', 13, 6, 0.8], ['#ffc050', 9, 4, 0.9], ['#fff0c0', 5, 2.4, 0.9]]) { g.fillStyle = cor; g.globalAlpha = al; const hh = alt + Math.sin(tempo * 9 + alt) * 1.6; for (let yy = 0; yy < hh; yy += 2) { const q = yy / hh, w2 = larg * Math.sin(Math.PI * (0.2 + q * 0.8)) * (1 - q * 0.3), des = -h.vx * 0.012 * q * 6 + Math.sin(tempo * 8 + q * 4) * 1.6 * q; if (w2 > 0.6) g.fillRect(Math.round(fx0 + des - w2 / 2), Math.round(fy - yy), Math.max(1, Math.round(w2)), 2); } }
    g.restore();
    if (Math.random() < 0.16) J.poe({ tipo: 'brasa', x: fx0, y: fy - 10, vx: (Math.random() - 0.5) * 14 - h.vx * 0.1, vy: -26, vida: 0.8, max: 0.8, cor: '#ff9a40', tam: 1.3 });
  }
  function arco(h) {
    const k = h.t / h.dur; if (k < 0.16 || k > 0.8) return;
    const a = h.ficha.arma, forte = h.estado === 'forte', p = (k - 0.16) / 0.64;
    const cx = h.x + h.dir * 4, cy = h.y - 36, R = (a.alcance + (forte ? 14 : h.final ? 8 : 2)) * 0.96, pes = forte ? h.pesado : '', reto = !forte && h.final && a.per === 'lamina';
    if (pes === 'salto') return;
    if (pes === 'giro') { // corte em volta: a lâmina dá a volta inteira
      g.save(); g.globalCompositeOperation = 'lighter'; const a0 = -Math.PI * 0.6, gi = p * Math.PI * 2.3; for (let i = 0; i < 26; i++) { const t = a0 + gi - i * 0.075; g.globalAlpha = (1 - i / 26) * (1 - p) * 0.9; g.fillStyle = i < 5 ? '#fff6dc' : '#ffb060'; const rx = Math.cos(t) * R * h.dir, ry = Math.sin(t) * R * 0.34; g.fillRect(cx + rx - 4, cy + 4 + ry - 4, 8, 8 - i * 0.2); } g.restore(); brilhos.push([cx, cy, 80, '255,190,110', (1 - p) * 0.7]); return;
    }
    const punho = J.save.arma === 'punho';
    const corA = forte || h.investida ? '#ffe2a0' : h.final ? '#fff1c8' : '#f4f8ff', corB = forte ? '#ff8a30' : punho ? '#ff7a3a' : a.veneno ? '#a8d050' : h.final ? '#ffb060' : '#9fc8d8';
    g.save(); g.globalCompositeOperation = 'lighter';
    if ((a.estoca || reto || pes === 'passa' || (punho && h.pg && h.pg.a === 'golpe1')) && h.dirGolpe === 'frente' && (!forte || pes === 'passa' || pes === 'carga')) {
      const len = R * (0.55 + p * 0.75), y = cy + (punho ? -8 : 2), x1 = cx + h.dir * len;
      const gr = g.createLinearGradient(cx, y, x1, y); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, corA);
      g.globalAlpha = 1 - p * 0.8; g.fillStyle = gr; g.beginPath(); g.moveTo(cx, y - 1); g.lineTo(x1 - h.dir * 8, y - 4); g.lineTo(x1, y); g.lineTo(x1 - h.dir * 8, y + 4); g.lineTo(cx, y + 1); g.fill();
      g.fillStyle = corB; g.globalAlpha = (1 - p) * 0.6; g.fillRect(Math.min(cx, x1), y - 6, len, 1); g.fillRect(Math.min(cx, x1), y + 5, len, 1);
      if (punho) { g.globalAlpha = 1 - p; g.strokeStyle = corB; g.beginPath(); g.arc(x1, y, 4 + p * 8, 0, 7); g.stroke(); }
      g.restore(); return;
    }
    let a0, a1;
    if (h.dirGolpe === 'cima' || pes === 'gancho') { a0 = Math.PI * 1.02; a1 = Math.PI * 1.98; if (pes === 'gancho') { a0 = Math.PI * 0.35; a1 = -Math.PI * 0.62; } }
    else if (h.dirGolpe === 'baixo') { a0 = Math.PI * 0.02; a1 = Math.PI * 0.98; }
    else { a0 = -Math.PI * 0.72; a1 = Math.PI * 0.42; if (h.pg && h.pg.a === 'golpe2' && !forte) { const t2 = a0; a0 = a1 * 0.9; a1 = t2; } else if (h.pg && h.pg.a === 'golpe3' && !forte) { a0 = -Math.PI * 0.85; a1 = Math.PI * 0.5; } }
    if (h.dir < 0) { a0 = Math.PI - a0; a1 = Math.PI - a1; }
    const ponta = a0 + (a1 - a0) * Math.min(1, p * 1.7), cauda = a0 + (a1 - a0) * Math.max(0, p * 1.7 - 0.8);
    const n = 18, esp = forte ? 15 : h.final ? 12 : a.per === 'machado' || a.per === 'porrete' ? 10 : a.per === 'lamina' ? 6 : 8;
    const fita = (e2, cor, al) => {
      g.globalAlpha = al; g.fillStyle = cor; g.beginPath();
      for (let i = 0; i <= n; i++) { const t = cauda + (ponta - cauda) * (i / n); g.lineTo(cx + Math.cos(t) * R, cy + Math.sin(t) * R * 0.92); }
      for (let i = n; i >= 0; i--) { const t = cauda + (ponta - cauda) * (i / n), e = e2 * Math.pow(i / n, 0.7) * Math.sin((i / n) * Math.PI * 0.6 + 0.4); g.lineTo(cx + Math.cos(t) * (R - e), cy + Math.sin(t) * (R - e) * 0.92); }
      g.fill();
    };
    const al = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
    fita(esp * 1.7, corB, al * 0.28); fita(esp, corB, al * 0.75); fita(esp * 0.45, corA, al);
    g.globalAlpha = al; g.fillStyle = '#ffffff'; const px = cx + Math.cos(ponta) * (R - 2), py = cy + Math.sin(ponta) * (R - 2) * 0.92; g.fillRect(px - 2, py - 2, 4, 4);
    g.restore();
    if (forte || h.final) brilhos.push([px, py, 46, '255,190,110', al * 0.6]);
    if (Math.random() < 0.5) J.poe({ tipo: 'brasa', x: px, y: py, vx: (Math.random() - 0.5) * 60, vy: -30 * Math.random(), vida: 0.3, max: 0.3, cor: corB, tam: 1.6 });
  }
  function flecha(x, y, ang) { const p = A2.armas && A2.armas.flecha; if (!p) return; g.save(); g.translate(x, y); g.rotate(ang); g.drawImage(img.armas, p[0], p[1], p[2], p[3], -13, -2, p[2], p[3]); g.restore(); }
  function contato(x, y, r) { g.fillStyle = 'rgba(2,5,5,0.34)'; g.beginPath(); g.ellipse(x, y, r, 3.4, 0, 0, 7); g.fill(); }
  function sombra(x, y, r) {
    let yy = y; for (let i = 0; i < 12 && !J.solido(x, yy + 1) && F.tile(Math.floor(x / T), Math.floor((yy + 1) / T)) !== 2; i++) yy += 8;
    const k = Math.max(0.15, 1 - (yy - y) / 110);
    g.fillStyle = 'rgba(0,0,0,' + 0.42 * k + ')'; g.beginPath(); g.ellipse(x, Math.floor((yy + 1) / T) * T + 1, r * k, 3 * k, 0, 0, 7); g.fill();
  }

  // ---------- inimigos ----------
  function desenhaInimigo(e) {
    const tp = e.T; let im = img['m_' + tp.spr], mt = A2.monstros[tp.spr], chv = tp.spr; if (!im) return;
    if (e.x < cam.x - 120 || e.x > cam.x + D.VW + 120) return;
    let q = 0, sx = 1, sy = 1, al = 1, oy = 0;
    const prep = e.prepDur || tp.prep;
    if (e.estado === 'morto') { q = e.t < 0.18 ? 6 : 7; al = Math.min(1, ((tp.chefe ? 3 : 1.8) - e.t) / 0.6); }
    else if (e.estado === 'caido') { q = e.t < 1.3 ? 7 : 4; }
    else if (e.estado === 'cambaleia') { q = 6; }
    else if (e.ferido > 0.17 && ['persegue', 'recua', 'vaga'].includes(e.estado)) q = 6;
    else if (e.estado === 'prep') { q = 4; const k = e.t / prep; sx = 1 + k * 0.05; sy = 1 - k * 0.06; }
    else if (e.estado === 'golpe') q = e.t < (tp.salta ? 0.5 : tp.golpe + 0.05) ? 5 : 0;
    else if (['chama', 'cuspe', 'cova', 'uiva', 'cura'].includes(e.estado)) { q = e.t < 0.45 ? 4 : e.estado === 'uiva' ? 6 : 5; oy = Math.sin(e.t * 40) * 1; }
    else if (e.estado === 'salto') q = e.t < 0.5 ? 4 : 5;
    else if (e.estado === 'pula' || e.estado === 'porcima') q = 5;
    else if (e.estado === 'esquiva') { q = 3; sx = 1.06; sy = 0.95; }
    else if (e.estado === 'bloqueia') q = tp.escudo ? 3 : 4;
    else if (Math.abs(e.vx) > 5) { q = [1, 2, 3, 2][Math.floor(e.andou / (tp.passo || 8)) % 4]; if (tp.spr.startsWith('goblin_') || tp.spr.startsWith('zumbi_')) { q = q === 3 && !tp.spr.startsWith('zumbi_') ? 1 : q; oy = -Math.abs(Math.sin(e.andou / (tp.passo || 8) * 1.57)) * 1.6; } }
    else sy = 1 + Math.sin(tempo * 2.4 + e.ox) * 0.018;
    if (tp.chefe && e.vivo) {
      if (typeof e.qf === 'number') q = e.qf; else if (e.qf && mt.pose && img['m_' + tp.spr + '_pose']) { q = +e.qf.slice(1); im = img['m_' + tp.spr + '_pose']; chv = tp.spr + '_pose'; mt = mt.pose; } if (e.estado === 'cambaleia') { q = 6; im = img['m_' + tp.spr]; mt = A2.monstros[tp.spr]; chv = tp.spr; oy = Math.sin(tempo * 20) * 0.6; }
      if (e.aviso > 0) { sx = 1 + e.aviso * 0.05; sy = 1 - e.aviso * 0.06; }
      if (e.some != null) al = e.some;
      if (e.olhos > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = '#ff4a30'; g.globalAlpha = e.olhos; for (const d of [0, 9]) { g.fillRect(e.x + e.dir * (34 + d) - 2, e.y - 42, 4, 3); } g.restore(); brilhos.push([e.x + e.dir * 38, e.y - 42, 50, '255,70,40', e.olhos * 0.8]); }
      if (e.montinho != null) { g.fillStyle = 'rgb(' + regiao().terra.map((v) => v + 20).join(',') + ')'; g.beginPath(); g.ellipse(e.x, e.y + 2, 26, 9 + Math.sin(tempo * 24) * 2, 0, Math.PI, 0); g.fill(); g.fillStyle = 'rgba(255,60,40,0.35)'; g.fillRect(e.x - 24, e.y - 1, 48, 2); }
      if (e.cx != null) { g.save(); g.fillStyle = '#b8b0a8'; for (let x = 10; x < e.cx; x += 7) { const yy = e.cy + Math.sin(x * 0.08 + tempo * 20) * 2; g.fillStyle = '#15120f'; g.fillRect(Math.round(e.x + e.dir * x) - 3, Math.round(yy) - 2, 6, 4); g.fillStyle = '#a8a098'; g.fillRect(Math.round(e.x + e.dir * x) - 2, Math.round(yy) - 1, 4, 2); } g.fillStyle = '#d8d0c0'; g.fillRect(e.x + e.dir * e.cx - 4, e.cy - 5, 8, 10); g.restore(); }
      if (al <= 0.02) return;
    }
    // quem tem ciclo de andar de verdade usa ele
    const an = A2.monstros[tp.spr].anda;
    if (an && e.vivo && q >= 1 && q <= 3 && Math.abs(e.vx) > 5 && ['vaga', 'persegue', 'volta', 'foge', 'recua'].includes(e.estado) && img['m_' + tp.spr + '_anda']) { im = img['m_' + tp.spr + '_anda']; chv = tp.spr + '_anda'; mt = an; q = Math.floor(e.andou / an.passo) % an.n; oy = 0; }
    const es = e.esc || 1;
    if (tp.escondida && e.estado === 'vaga' && e.vivo) al = tp.escondida;
    if (e.estado !== 'morto' && al > 0.3) sombra(e.x, e.y, e.w * 0.6);
    const pinta = (src, a) => { g.globalAlpha = a; g.drawImage(src, q * mt.w, 0, mt.w, mt.h, -Math.round(mt.w / 2), -mt.h + 1, mt.w, mt.h); };
    let tx0 = 0; if (e.tranco > 0) { e.tranco = Math.max(0, e.tranco - (D.dt || 0)); const k = e.tranco / 0.16; tx0 = Math.round((e.trancoDir || 0) * k * 5 + Math.sin(tempo * 90) * k * 1.5); sx *= 1 + k * 0.1; sy *= 1 - k * 0.08; }
    g.save(); g.translate(Math.round(e.x) + tx0, Math.round(e.y + 1 + oy)); g.scale(e.dir * sx * es, sy * es);
    if (e.vivo) pinta(fio(im, corFio(regiao()), chv), al * (0.5 + noiteK * 0.35));
    pinta(im, al);
    if (tp.tinta) pinta(silhueta(im, tp.tinta, chv), al);
    if (e.estado === 'prep' || e.aviso > 0) pinta(silhueta(im, '#ff2a1a', chv), (0.08 + 0.3 * Math.min(1, tp.chefe ? e.aviso : e.t / prep)) * (0.6 + 0.4 * Math.sin(tempo * 30)) * al);
    if (e.veneno > 0) pinta(silhueta(im, '#8ac030', chv), 0.22);
    if (e.furia > 0) pinta(silhueta(im, '#ff4a2a', chv), 0.12 + 0.08 * Math.sin(tempo * 12));
    if (e.estado === 'cura') pinta(silhueta(im, '#7aff8a', chv), 0.25);
    if (e.flash > 0) pinta(silhueta(im, '#ffffff', chv), (e.flash / 0.13) * 0.85);
    g.restore(); g.globalAlpha = 1;
    if (e.vivo && al > 0.5) brilhos.push([e.x, e.y - e.h * 0.55, 30 + e.h * 0.5, corFio(regiao()), (e.estado === 'vaga' ? 0.12 : 0.24) + noiteK * 0.2]);
    if (tp.chefe && e.fase > 1 && e.vivo && Math.random() < e.fase * 0.12) J.poe({ tipo: 'alma', x: e.x + (Math.random() - 0.5) * e.w, y: e.y - Math.random() * e.h, vy: -26, vida: 0.8, max: 0.8, cor: J.DONOS[e.tipo].cor, tam: 1.8 });
    if (tp.chefe && e.estado === 'acao' && (e.qf === 5 || e.qf === 'p4' || e.qf === 'p6') && e.aviso === 0 && e.golpe !== 'salto' && e.golpe !== 'teto' && e.tipo !== 'alfa' && e.tipo !== 'rainha') { const k = e.rast = Math.min(1, (e.rast || 0) + 0.09); garra({ t: k * 0.3, x: e.x, y: e.y, dir: e.dir, w: e.w }, { salta: 0, alcance: 70, h: e.h, esp: tp.esp }); } else e.rast = 0;
    if (e.estado === 'golpe' && !tp.atira && e.t < 0.3) garra(e, tp);
    if (e.estado === 'bloqueia') { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#ffe9b0'; g.globalAlpha = 0.5 + 0.2 * Math.sin(tempo * 14); g.beginPath(); g.arc(e.x + e.dir * 8, e.y - e.h * 0.5, 22, e.dir > 0 ? -1 : Math.PI - 1, e.dir > 0 ? 1 : Math.PI + 1); g.stroke(); g.restore(); }
    if (tp.spr === 'goblin_xama' && e.vivo) brilhos.push([e.x + e.dir * 16, e.y - 44, 34, '120,255,140', 0.45]);
    const topo = e.y - tp.h * es - 14;
    if (e.estado === 'prep' && e.vivo && !tp.chefe) { const kp = Math.min(1, e.t / prep), rx = e.x + e.dir * e.w * 0.28, ry = e.y - tp.h * es * 0.82; g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = '#ff5a30'; g.globalAlpha = kp; const r = 2 + kp * 7; g.fillRect(Math.round(rx - r), Math.round(ry), Math.round(r * 2), 1); g.fillRect(Math.round(rx), Math.round(ry - r * 0.7), 1, Math.round(r * 1.4)); g.restore(); brilhos.push([rx, ry, 26 * kp, '255,90,50', 0.6 * kp]); }
    if (e.pisca > 0) { g.fillStyle = 'rgba(255,60,40,' + Math.min(1, e.pisca * 2) + ')'; g.fillRect(e.x - 1, topo - 6, 2, 6); g.fillRect(e.x - 1, topo + 2, 2, 2); }
    if (e.estado === 'cambaleia') for (let i = 0; i < 3; i++) { const a = tempo * 6 + i * 2.1; g.fillStyle = '#ffe9a0'; g.fillRect(e.x + Math.cos(a) * 10, topo + 4 + Math.sin(a) * 3, 2, 2); }
    if (!tp.chefe && e.vivo && e.hp < e.hpMax) { const w = Math.max(26, Math.min(44, e.w + 6)), x = Math.round(e.x - w / 2), y = Math.round(topo), k = Math.max(0, e.hp / e.hpMax); e.hpV = e.hpV == null ? k : e.hpV > k ? Math.max(k, e.hpV - (D.dt || 0) * 0.5) : k; g.fillStyle = '#000000b0'; g.fillRect(x - 2, y - 2, w + 4, 7); g.fillStyle = '#3a2c20'; g.fillRect(x - 1, y - 1, w + 2, 5); g.fillStyle = '#0c0707'; g.fillRect(x, y, w, 3); g.fillStyle = '#ffd890'; g.fillRect(x, y, Math.round(w * e.hpV), 3); g.fillStyle = '#c8301e'; g.fillRect(x, y, Math.round(w * k), 3); g.fillStyle = '#ff7a5a'; g.fillRect(x, y, Math.round(w * k), 1); }
  }
  function garra(e, tp) {
    const k = e.t / 0.3, cx = e.x + e.dir * e.w * 0.6, cy = e.y - tp.h * 0.6;
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (1 - k) * 0.9;
    if (tp.salta) { g.strokeStyle = tp.esp === 'cobra' ? '#d8f0a0' : '#ffd0c0'; g.lineWidth = 1.5; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(cx - e.dir * 8, cy + i * 6 - 8); g.quadraticCurveTo(cx + e.dir * 8, cy + i * 6 - 2, cx + e.dir * 4, cy + i * 6 + 8); g.stroke(); } }
    else { const R = tp.alcance + 2, a0 = e.dir > 0 ? -1.2 : Math.PI + 1.2, a1 = e.dir > 0 ? 0.9 : Math.PI - 0.9, p = a0 + (a1 - a0) * Math.min(1, k * 2); g.strokeStyle = 'rgba(255,90,70,0.8)'; g.lineWidth = 4; g.beginPath(); g.arc(e.x, cy, R, Math.min(a0, p), Math.max(a0, p)); g.stroke(); g.strokeStyle = '#ffe6dc'; g.lineWidth = 1.5; g.beginPath(); g.arc(e.x, cy, R, Math.min(a0, p), Math.max(a0, p)); g.stroke(); }
    g.restore();
  }

  // ---------- balas, magias e efeitos ----------
  function desenhaBala(b) {
    if (b.flecha) { flecha(b.x, b.y, Math.atan2(b.vy, b.vx)); if (b.forte) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5; g.fillStyle = '#ffe2a0'; g.fillRect(b.x - b.vx * 0.06, b.y - 1, b.vx * 0.05, 2); g.restore(); } return; }
    if (b.tipo === 'barril') { g.save(); g.translate(b.x, b.y); g.rotate(tempo * 9); g.fillStyle = '#120c08'; g.fillRect(-9, -8, 18, 16); g.fillStyle = '#6a4326'; g.fillRect(-8, -7, 16, 14); g.fillStyle = '#3a2716'; g.fillRect(-8, -4, 16, 2); g.fillRect(-8, 3, 16, 2); g.fillStyle = '#ffb040'; g.fillRect(-2, -11, 3, 4); g.restore(); brilhos.push([b.x, b.y - 8, 40, '255,150,60', 0.6]); return; }
    if (b.tipo === 'pedra') { g.fillStyle = '#1a1612'; g.fillRect(b.x - 4, b.y - 3, 8, 7); g.fillStyle = b.cor; g.fillRect(b.x - 3, b.y - 3, 6, 5); return; }
    g.save(); g.globalCompositeOperation = 'lighter';
    if (b.tipo === 'espinho') { g.translate(b.x, b.y); g.rotate(Math.atan2(b.vy, b.vx)); g.fillStyle = b.cor; g.globalAlpha = 0.5; g.fillRect(-26, -1, 26, 2); g.globalAlpha = 1; g.beginPath(); g.moveTo(10, 0); g.lineTo(-8, -4); g.lineTo(-4, 0); g.lineTo(-8, 4); g.fill(); }
    else {
      const r = b.r + Math.sin(tempo * 30) * 0.8, gr = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, r * 2.6);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.3, b.cor); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, r * 2.6, 0, 7); g.fill();
      if (b.tipo === 'brasa') { g.fillStyle = '#ffb050'; for (let i = 1; i < 5; i++) { g.globalAlpha = 0.5 - i * 0.1; g.fillRect(b.x - Math.sign(b.vx) * i * 7 - 2, b.y - 3 + Math.sin(tempo * 30 + i) * 2, 6 - i, 6 - i); } }
    }
    g.restore();
    brilhos.push([b.x, b.y, b.tipo === 'brasa' ? 90 : 46, b.tipo === 'feitico' ? '110,255,130' : b.tipo === 'veneno' ? '170,220,80' : b.tipo === 'espinho' ? '160,220,100' : '255,160,70', 0.8]);
  }
  function desenhaMagia(m) {
    if (m.tipo === 'onda') {
      const k = m.t / m.dur, px = m.px == null ? m.x : m.px;
      g.globalAlpha = 1 - k; for (let i = 0; i < 6; i++) { const hh = (22 - i * 3.4) * (1 - k * 0.5); g.fillStyle = i === 0 ? '#e8c890' : m.cor; g.fillRect(px - m.d * i * 7 - 4, m.y - hh, 7, hh); g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(px - m.d * i * 7 - 4, m.y - hh, 2, hh); } g.globalAlpha = 1;
    } else if (m.tipo === 'raio') {
      if (m.t < 0) { const k = 1 + m.t / 1.1; g.strokeStyle = 'rgba(190,224,255,' + (0.25 + 0.5 * k) + ')'; g.lineWidth = 1; g.beginPath(); g.ellipse(m.x, m.y, 26 - 8 * k, 5, 0, 0, 7); g.stroke(); brilhos.push([m.x, m.y - 10, 50, '190,224,255', 0.4 * k]); return; }
      const a = 1 - m.t / m.dur; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; for (const [w2, cor] of [[7, 'rgba(120,180,255,0.4)'], [3, '#dff0ff'], [1, '#ffffff']]) { g.strokeStyle = cor; g.lineWidth = w2; g.beginPath(); let x = m.x; g.moveTo(x, m.y); for (let y = m.y, i = 0; y > m.y - 330; y -= 22, i++) { x = m.x + (hash(i + Math.round(m.x)) - 0.5) * 34 * Math.min(1, (m.y - y) / 60 + 0.2); g.lineTo(x, y); } g.stroke(); } g.restore(); brilhos.push([m.x, m.y - 40, 220, '190,224,255', a]);
    } else if (m.tipo === 'queda') {
      if (m.t < 0) return; const k = Math.min(1, m.t / 0.75); g.fillStyle = 'rgba(10,6,4,' + 0.5 * k + ')'; g.beginPath(); g.ellipse(m.x, m.y + 1, 8 + 10 * k, 3 + k * 2, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,90,50,' + 0.5 * k + ')'; g.lineWidth = 1; g.beginPath(); g.ellipse(m.x, m.y + 1, 20, 5, 0, 0, 7); g.stroke(); if (m.t < 0.75 && Math.random() < 0.5) J.poe({ tipo: 'pedra', x: m.x + (Math.random() - 0.5) * 20, y: m.y - 250, vy: 120, grav: 500, vida: 0.5, max: 0.5, cor: '#8a7c66', tam: 2 });
      if (m.alt != null) { const y = m.y - m.alt; const pol = (cor, pts) => { g.fillStyle = cor; g.beginPath(); for (const [px, py] of pts) g.lineTo(Math.round(m.x + px), Math.round(y + py)); g.fill(); }; pol('#0e0a08', [[-16, -14], [-12, -28], [-2, -36], [10, -32], [17, -20], [15, -6], [4, 1], [-9, -1]]); pol('#5c4e40', [[-14, -14], [-10, -26], [-2, -33], [9, -30], [15, -19], [13, -7], [4, -1], [-8, -3]]); pol('#86755f', [[-10, -25], [-2, -33], [9, -30], [3, -24], [-6, -18], [-13, -15]]); pol('#3a3026', [[15, -19], [13, -7], [4, -1], [2, -9], [8, -16]]); g.fillStyle = '#2a221a'; g.fillRect(m.x - 5, y - 16, 6, 1); g.fillRect(m.x - 1, y - 12, 1, 5); g.fillStyle = 'rgba(255,220,180,0.16)'; g.fillRect(m.x - 6, y - 70, 1, 30); g.fillRect(m.x + 6, y - 64, 1, 26); }
    } else if (m.tipo === 'gas') { g.globalAlpha = 0.22 * Math.max(0, 1 - m.t / m.dur); g.drawImage(mancha('150,190,60'), m.x - m.raio, m.y - 44, m.raio * 2, 60); g.globalAlpha = 1;
    } else if (m.tipo === 'maos') {
      if (m.t < 0) { g.fillStyle = 'rgba(184,160,200,' + (0.25 + 0.2 * Math.sin(tempo * 30)) + ')'; g.fillRect(m.x - 14, m.y - 2, 28, 2); return; }
      const k = m.t / m.dur, alt = 46 * Math.sin(Math.min(1, k * 1.4) * Math.PI * 0.9);
      for (let i = -1; i <= 1; i++) { const x = m.x + i * 9, a = alt * (1 - Math.abs(i) * 0.25); g.fillStyle = '#0c0a0c'; g.fillRect(x - 3, m.y - a, 7, a); g.fillStyle = '#8a7a86'; g.fillRect(x - 2, m.y - a, 5, a); g.fillStyle = '#b8a8b4'; g.fillRect(x - 2, m.y - a, 1, a); for (let d = -1; d <= 1; d++) { g.fillStyle = '#0c0a0c'; g.fillRect(x + d * 3 - 1, m.y - a - 6, 3, 7); g.fillStyle = '#a898a4'; g.fillRect(x + d * 3, m.y - a - 5, 1, 6); } }
    }
  }
  function circuloMagico(x, y, c, k, tam) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25 + k * 0.6; g.strokeStyle = c; g.lineWidth = 1.2;
    g.translate(x, y); g.scale(1, 0.3); const r = tam * (1.1 - k * 0.2);
    g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, r * 0.72, 0, 7); g.stroke();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + tempo * 1.5; g.fillStyle = c; g.fillRect(Math.cos(a) * r * 0.86 - 1.5, Math.sin(a) * r * 0.86 - 1.5, 3, 3); }
    g.beginPath(); for (let i = 0; i <= 3; i++) { const a = i * Math.PI * 2 / 3 - tempo; g.lineTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72); } g.stroke();
    g.restore();
    g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(0, y - 60, 0, y); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, c); g.globalAlpha = k * 0.22; g.fillStyle = gr; g.fillRect(x - tam * 0.8, y - 60, tam * 1.6, 60); g.restore();
  }
  function desenhaFx(f) {
    const k = Math.max(0, f.vida / f.max);
    if (f.tipo === 'anel') { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = f.cor; g.globalAlpha = k; g.lineWidth = f.larg * k + 0.5; g.beginPath(); g.arc(f.x, f.y, f.raio * (1 - k * 0.7), 0, 7); g.stroke(); g.restore(); return; }
    if (f.tipo === 'nuvem') { g.globalAlpha = 0.3 * Math.sin(k * Math.PI); g.drawImage(mancha(f.cor), f.x - f.tam, f.y - f.tam, f.tam * 2, f.tam * 2); g.globalAlpha = 1; return; }
    if (f.tipo === 'circulo') { circuloMagico(f.x, f.y, f.cor, k, f.tam); return; }
    if (f.tipo === 'bola') { g.save(); g.globalCompositeOperation = 'lighter'; const r = f.tam * (1.15 - k * 0.5), gr = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, r); gr.addColorStop(0, 'rgba(255,250,220,' + k + ')'); gr.addColorStop(0.4, f.cor); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = k; g.fillStyle = gr; g.beginPath(); g.arc(f.x, f.y, r, 0, 7); g.fill(); g.restore(); brilhos.push([f.x, f.y, f.tam * 3, '255,160,70', k]); return; }
    if (f.tipo === 'estrela') { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = f.cor; g.globalAlpha = k; const r = f.tam; g.translate(f.x, f.y); g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.3, q = i & 1 ? r * 0.28 : r; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.fill(); g.restore(); return; }
    if (f.tipo === 'corte') { g.save(); g.globalCompositeOperation = 'lighter'; g.translate(f.x, f.y); g.rotate((f.ang || -0.6) * f.dir); g.globalAlpha = k; g.fillStyle = f.cor; const l = f.tam * (1.3 - k * 0.5); g.beginPath(); g.moveTo(-l / 2, 0); g.lineTo(0, -2); g.lineTo(l / 2, 0); g.lineTo(0, 2); g.fill(); g.restore(); return; }
    if (f.tipo === 'folha') { const gi = Math.sin(f.vida * 9 + f.x * 0.2); g.globalAlpha = Math.min(1, k * 2.4); g.fillStyle = f.cor; g.fillRect(Math.round(f.x + gi * 2), Math.round(f.y), gi > 0 ? 3 : 2, gi > 0.6 || gi < -0.6 ? 1 : 2); g.globalAlpha = 1; return; }
    if (f.tipo === 'pena') { g.globalAlpha = Math.min(1, k * 2); g.fillStyle = f.cor; g.fillRect(Math.round(f.x + Math.sin(f.vida * 6) * 5), Math.round(f.y), 2, 1); g.globalAlpha = 1; return; }
    const lighter = f.tipo === 'brasa' || f.tipo === 'alma' || f.tipo === 'faisca';
    if (lighter) { g.save(); g.globalCompositeOperation = 'lighter'; }
    g.globalAlpha = f.tipo === 'gota' ? (f.preso ? k : 1) : f.tipo === 'poeira' ? k * 0.5 : k;
    g.fillStyle = f.tipo === 'poeira' ? 'rgb(' + regiao().terra.map((v) => v + 60).join(',') + ')' : f.cor;
    const t = f.tipo === 'poeira' ? f.tam * (1.8 - k) : f.tam * (f.tipo === 'gota' ? 1 : 0.5 + k * 0.5);
    g.fillRect(Math.round(f.x - t / 2), Math.round(f.y - t / 2), Math.max(1, Math.round(t)), Math.max(1, Math.round(t)));
    g.globalAlpha = 1; if (lighter) g.restore();
  }

  // ---------- coisas do cenário ----------
  const COLETA = { galho: 'galhada', pedra: 'pedras', folha: 'planta', fibra: 'samambaia', fruta: 'frutas', osso: 'ossos' };
  // árvores altas, terra fofa, veios e tochas fincadas
  function desenhaMundo() {
    const A = F.atual, E = A.extras, s = J.save, h = J.heroi; if (!E) return;
    if (A.rochas) for (const r of A.rochas) { if (s.rochas && s.rochas[r.id]) continue; if (r.x < cam.x - 60 || r.x > cam.x + D.VW + 60) continue; const x0 = r.c0 * T - 3, w = (r.c1 - r.c0 + 1) * T + 6, y0 = r.y0 * T, hh = (r.y1 - r.y0 + 1) * T; g.fillStyle = '#1a1416'; g.fillRect(x0, y0, w, hh); for (let y = y0; y < y0 + hh; y += 7) for (let x = x0; x < x0 + w; x += 9) { const k = hash(x * 3 + y); g.fillStyle = k < 0.18 ? '#c8884a' : k < 0.24 ? '#dfe8f0' : k < 0.6 ? '#3a3236' : '#2a2428'; g.fillRect(x + ((y / 7) % 2) * 4, y, k < 0.24 ? 3 : 8, k < 0.24 ? 2 : 6); } const k2 = Math.max(0, Math.sin(tempo * 2 + r.x)); brilhos.push([r.x, r.y1 * T - 30, 40, '255,170,90', 0.25 * k2]); } const x0 = cam.x - 200, x1 = cam.x + D.VW + 200;
    for (const a of E.arvores) {
      if (a.x < x0 || a.x > x1) continue; const alt = a.y0 - a.y1, e = (alt + 90) / 304; prop('arvorao', a.x + 6, a.y0 + 4, { e, v: a.tx % 2 === 0 });
      // o tronco tem cipó e marcas de garra: dá para subir
      for (let y = a.y0 - 8; y > a.y1 + 4; y -= 7) { g.fillStyle = '#1a2a18'; g.fillRect(Math.round(a.x - 4 + Math.sin(y * 0.3) * 2), Math.round(y), 2, 5); g.fillStyle = '#4a7a3a'; g.fillRect(Math.round(a.x - 3 + Math.sin(y * 0.3) * 2), Math.round(y), 1, 4); }
      if (Math.abs(h.x - a.x) < 80 && h.y > a.y1 + 20) { const k = 0.5 + 0.5 * Math.sin(tempo * 3); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = '#ffe2a0'; g.globalAlpha = 0.5 * k; g.fillRect(Math.round(a.x - 1), Math.round(a.y1 - 20 - k * 4), 3, 3); g.fillRect(Math.round(a.x - 3), Math.round(a.y1 - 18 - k * 4), 7, 1); g.restore(); }
      peca('ponte' in (A2.props || {}) ? 'lenha' : 'lenha', a.ninho, a.y1 + 4, { e: 0.4 }); brilhos.push([a.ninho, a.y1 - 6, 36, '255,226,160', 0.22]);
    }
    for (const m of E.montes) { if (m.x < x0 || m.x > x1) continue; const R = regiao(), cv = s.cavados && s.cavados[m.id]; if (cv) { g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.ellipse(m.x, m.y + 1, 10, 3, 0, 0, 7); g.fill(); continue; } g.fillStyle = 'rgb(' + R.terra.map((v) => v + 26).join(',') + ')'; g.beginPath(); g.ellipse(m.x, m.y + 1, 12, 5, 0, Math.PI, 0); g.fill(); g.fillStyle = 'rgb(' + R.terra.map((v) => v + 46).join(',') + ')'; for (let i = 0; i < 5; i++) g.fillRect(Math.round(m.x - 8 + hash(m.tx + i) * 16), Math.round(m.y - 2 - hash(m.tx * 3 + i) * 3), 2, 1); const k = Math.max(0, Math.sin(tempo * 2.2 + m.x)); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = k; g.fillStyle = '#ffe9b0'; g.fillRect(Math.round(m.x + 3), Math.round(m.y - 8), 1, 3); g.fillRect(Math.round(m.x + 2), Math.round(m.y - 7), 3, 1); g.restore(); }
    for (const v of E.veios) { if (v.x < x0 || v.x > x1) continue; const usado = s.minados && s.minados[v.id] > s.dia - 3, c1 = v.prata ? '#dfe8f0' : '#d8904a', c2 = v.prata ? '#8a9aa8' : '#7a4a24'; for (let i = 0; i < 5; i++) { const px = Math.round(v.x - v.d * (2 + hash(i + v.y) * 9)), py = Math.round(v.y - 8 + hash(i * 7 + v.x) * 16); g.fillStyle = '#0a0806'; g.fillRect(px - 1, py - 1, 4, 4); g.fillStyle = usado ? '#3a3430' : c2; g.fillRect(px, py, 3, 3); if (!usado) { g.fillStyle = c1; g.fillRect(px, py, 2, 1); } } if (!usado) { const k = Math.max(0, Math.sin(tempo * 2.6 + v.y)); brilhos.push([v.x, v.y, 22, v.prata ? '200,220,240' : '255,170,90', 0.3 * k]); } }
    for (const tx of J.fincadas()) { if (tx < x0 || tx > x1) continue; const y = F.chao(tx); lugar('tocha', tx, y + 4, { e: 0.7 }); brilhos.push([tx, y - 48, 150 + Math.sin(tempo * 9 + tx) * 6, '255,170,80', 0.9]); if (Math.random() < 0.1) J.poe({ tipo: 'brasa', x: tx + (Math.random() - 0.5) * 6, y: y - 52, vx: 0, vy: -26, vida: 0.7, max: 0.7, cor: '#ff9a40', tam: 1.2 }); }
  }
  function desenhaColeta(c) {
    if (J.colhidos[c.id] > 0 || c.x < cam.x - 60 || c.x > cam.x + D.VW + 60) return;
    const p = COLETA[c.m];
    if (c.alto) { const b = Math.sin(tempo * 2.5 + c.x) * 1.5; peca('lenha', c.x, c.y + 3, { e: 0.36 }); itemEm(g, c.m, Math.round(c.x - 10), Math.round(c.y - 22 + b), 0.62); }
    else if (c.m === 'madeira' && F.atual.regiao === 'minas') { prop('pilar', c.x, c.y + 3, { e: 0.55 }); peca('cepo', c.x + 14, c.y + 2, { e: 0.7 }); }
    else if (c.m === 'madeira') { prop('arvore', c.x, c.y + 3, { e: 0.8 }); peca('cepo', c.x + 16, c.y + 2, { e: 0.8 }); if (c.talho) { g.fillStyle = '#e8c890'; g.fillRect(Math.round(c.x - 4), Math.round(c.y - 18), 4 + c.talho * 2, 3); } }
    else if (p) { prop(p, c.x, c.y + 2); if (c.m === 'fruta') for (let i = 0; i < 6; i++) { const x = c.x - 14 + hash(c.x + i) * 28, y = c.y - 8 - hash(c.x * 3 + i) * 22; g.fillStyle = '#1a0608'; g.fillRect(x - 1, y - 1, 4, 4); g.fillStyle = '#d83030'; g.fillRect(x, y, 2, 2); } }
    else itemEm(g, c.m, Math.round(c.x - 14), Math.round(c.y - 26), 0.82);
    const a = 0.5 + 0.5 * Math.sin(tempo * 3 + c.x);
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = '#fff2c0';
    for (let i = 0; i < 2; i++) { const x = Math.round(c.x - 10 + hash(c.x + i * 9) * 20), y = Math.round(c.y - 14 - hash(c.x * 2 + i) * 16 - a * 3), f = Math.max(0, Math.sin(tempo * 2.4 + c.x + i * 2.2)); g.globalAlpha = f; g.fillRect(x, y - 2, 1, 5); g.fillRect(x - 2, y, 5, 1); }
    g.restore();
    brilhos.push([c.x, c.y - 14, 34, '255,236,180', 0.14 + 0.1 * a]);
  }
  function chama(x, y, k) {
    g.save(); g.globalCompositeOperation = 'lighter';
    // línguas de fogo: três labaredas que respiram, do vermelho ao quase branco
    for (const [cor, alt, larg, al] of [['#c8321a', 34, 13, 0.55], ['#ff7a24', 27, 10, 0.75], ['#ffc050', 18, 7, 0.85], ['#fff0c0', 10, 4, 0.9]]) {
      g.fillStyle = cor; g.globalAlpha = al;
      for (let j = -1; j <= 1; j++) {
        const hh = (alt * (j ? 0.62 : 1) + Math.sin(tempo * 7 + j * 2.3 + alt) * 3) * k, ww = larg * (j ? 0.6 : 1) * k, bx = x + j * larg * 0.62 * k;
        for (let yy = 0; yy < hh; yy += 2) { const q = yy / hh, w2 = ww * Math.sin(Math.PI * (0.18 + q * 0.82)) * (1 - q * 0.35), des = Math.sin(tempo * 6 + q * 4 + j) * 3 * q; if (w2 > 0.6) g.fillRect(Math.round(bx + des - w2 / 2), Math.round(y - 7 - yy), Math.max(1, Math.round(w2)), 2); }
      }
    }
    for (let i = 0; i < 5; i++) { const t = (tempo * 0.9 + i * 0.21) % 1; g.globalAlpha = (1 - t) * 0.8; g.fillStyle = '#ff9a40'; g.fillRect(Math.round(x + Math.sin(tempo * 3 + i * 2) * 9), Math.round(y - 20 - t * 34 * k), 1, 2); }
    g.restore();
    brilhos.push([x, y - 20, 130 + Math.sin(tempo * 9) * 5, '255,170,80', 0.95]);
    if (Math.random() < 0.12) J.poe({ tipo: 'brasa', x: x + (Math.random() - 0.5) * 12, y: y - 18, vx: (Math.random() - 0.5) * 14, vy: -30 - Math.random() * 30, vida: 1.2, max: 1.2, cor: '#ff9a40', tam: 1.4 });
  }
  function desenhaPorta(p) {
    if (p.x < cam.x - 140 || p.x > cam.x + D.VW + 140) return;
    const alvo = C.REGIOES[F.area ? (F.IDS.includes(p.para[0]) ? regDe(p.para[0]) : F.atual.regiao) : F.atual.regiao];
    prop(p.d === 'arco' ? 'arco' : 'caverna', p.x, p.y + 8, { e: p.d === 'arco' ? 1 : 0.92 });
    const h = p.d === 'arco' ? 70 : 58, gr = g.createRadialGradient(p.x, p.y - h * 0.5, 2, p.x, p.y - h * 0.5, 40);
    gr.addColorStop(0, 'rgba(' + alvo.nevoa + ',' + (0.34 + 0.1 * Math.sin(tempo * 1.6 + p.x)) + ')'); gr.addColorStop(1, 'rgba(' + alvo.nevoa + ',0)');
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(p.x - 40, p.y - h * 0.5 - 40, 80, 80); g.restore();
    brilhos.push([p.x, p.y - 34, 76, alvo.nevoa, 0.55]);
  }
  const regDe = (id) => id.replace('covil_', '');
  function desenhaCirculo(c) {
    if (c.x < cam.x - 140 || c.x > cam.x + D.VW + 140) return;
    const sabe = J.save.magias.includes(c.magia), preso = F.atual.arena && !J.save.chefes[F.atual.arena.chefe];
    prop('circulo', c.x, c.y + 34, { a: sabe ? 0.75 : 1 });
    if (!sabe && !preso) { circuloMagico(c.x, c.y - 4, C.MAGIAS[c.magia].cor, 0.5 + 0.3 * Math.sin(tempo * 2), 62); brilhos.push([c.x, c.y - 20, 130, '110,230,240', 0.8]); if (Math.random() < 0.25) J.poe({ tipo: 'alma', x: c.x + (Math.random() - 0.5) * 120, y: c.y, vy: -20 - Math.random() * 30, vida: 1.6, max: 1.6, cor: '#7ff0ff', tam: 1.6 }); }
  }

  // ---------- a humana, os filhos e o lar ----------
  const GE = window.GENTE;
  function quadroGente(tipo, anim, n, x, y, o) {
    const im = img['h_' + tipo], a = GE.anims[anim]; if (!im || !a) return; o = o || {};
    const k = a[0] + Math.min(a[1] - 1, n), sx = (k % GE.cols) * GE.q, sy = Math.floor(k / GE.cols) * GE.q, e = o.e || 1;
    g.save(); g.translate(Math.round(x), Math.round(y)); g.scale((o.dir || 1) * e, e * (o.sy || 1)); if (o.a != null) g.globalAlpha = o.a;
    g.drawImage(im, sx, sy, GE.q, GE.q, -50, -PE, GE.q, GE.q);
    if (o.branco) { g.globalAlpha = o.branco; g.drawImage(silhueta(im, '#ffffff', 'h' + tipo), sx, sy, GE.q, GE.q, -50, -PE, GE.q, GE.q); }
    g.restore();
  }
  function peca(n, x, y, o) {
    const p = A2.casa && A2.casa[n]; if (!p || !img.casa) return; o = o || {}; const e = o.e || 1, w = Math.round(p[2] * e), h = Math.round(p[3] * e);
    if (x + w < cam.x - 10 || x - w > cam.x + D.VW + 10) return;
    g.save(); if (o.a != null) g.globalAlpha = o.a; g.translate(Math.round(x), Math.round(y)); if (o.v) g.scale(-1, 1); g.drawImage(img.casa, p[0], p[1], p[2], p[3], Math.round(-w / 2), -h, w, h); g.restore();
  }
  function lugar(n, x, y, o) {
    const p = A2.marcos && A2.marcos[n]; if (!p || !img.marcos) return; o = o || {}; const e = o.e || 1, w = Math.round(p[2] * e), h = Math.round(p[3] * e);
    if (x + w < cam.x - 10 || x - w > cam.x + D.VW + 10) return;
    g.save(); g.translate(Math.round(x), Math.round(y)); if (o.v) g.scale(-1, 1); g.drawImage(img.marcos, p[0], p[1], p[2], p[3], Math.round(-w / 2), -h, w, h); g.restore();
  }
  function desenhaLugares() {
    const A = F.atual;
    for (const m of A.marcos) { lugar(m.n, m.x, m.y + 5, { e: m.e }); if (m.n === 'estatua' && Math.random() < 0.06) J.poe({ tipo: 'alma', x: m.x + 50 + Math.random() * 30, y: m.y - 70, vy: -14, vida: 1.8, max: 1.8, cor: '#ffcf8a', tam: 1.6 }); }
    for (const q of A.pecas) { if (Math.abs(q.x - cam.x - D.VW / 2) > D.VW) continue; lugar(q.n, q.x, q.y + 4, q); if (q.n === 'tocha') brilhos.push([q.x, q.y - 70, 120 + Math.sin(tempo * 9 + q.x) * 5, '255,170,80', 0.85]); }
  }
  function desenhaBaus() {
    const A = F.atual, h = J.heroi, ve = J.amu('olho');
    for (const b of A.baus) {
      if (Math.abs(b.x - cam.x - D.VW / 2) > D.VW * 0.7 || A.escuros.some((e) => e.oco && b.x > e.x0 && b.x < e.x1 && b.y > e.y0 && b.y <= e.y1 + 2 && !aberto(e))) continue;
      const ab = J.save.baus[b.id]; lugar(ab ? 'bau_aberto' : 'bau', b.x, b.y + 2);
      if (!ab) { const a = 0.5 + 0.5 * Math.sin(tempo * 2.4 + b.x); brilhos.push([b.x, b.y - 18, 40, '255,220,150', 0.3 + 0.2 * a]); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.fillStyle = '#fff2c0'; g.fillRect(Math.round(b.x - 9), Math.round(b.y - 30), 1, 5); g.fillRect(Math.round(b.x - 11), Math.round(b.y - 28), 5, 1); g.restore(); }
    }
    for (const f of A.fracas) {
      if (J.save.fracas[f.id]) continue; const x0 = f.c0 * T, w = (f.c1 - f.c0 + 1) * T, y = f.y0 * T; if (Math.abs(x0 - cam.x - D.VW / 2) > D.VW) continue;
      for (const [corR, dd, lw] of [['rgba(4,3,2,0.95)', 0, 2.2], ['rgba(190,170,140,0.5)', 1, 0.8]]) { g.strokeStyle = corR; g.lineWidth = lw; g.beginPath(); for (let i = 0; i < 4; i++) { const bx = x0 + 6 + i * (w / 4); g.moveTo(bx + dd, y - 3); g.lineTo(bx + dd + (hash(f.c0 + i) - 0.5) * 12, y + 9); g.lineTo(bx + (hash(f.c0 * 3 + i) - 0.5) * 18, y + 18); g.lineTo(bx + dd + (hash(f.c0 * 7 + i) - 0.5) * 16, y + 29); } g.stroke(); }
      g.fillStyle = 'rgba(8,6,5,0.35)'; g.fillRect(x0, y + 3, w, 2);
      if (ve && Math.abs(x0 - h.x) < 240) { brilhos.push([x0 + w / 2, y + 12, 56, '110,236,226', 0.5 + 0.3 * Math.sin(tempo * 4)]); if (Math.random() < 0.15) J.poe({ tipo: 'alma', x: x0 + Math.random() * w, y, vy: -24, vida: 0.9, max: 0.9, cor: '#7ff0ff', tam: 1.5 }); }
    }
    if (ve) for (const b of A.baus) if (!J.save.baus[b.id] && Math.abs(b.x - h.x) < 320 && Math.random() < 0.06) J.poe({ tipo: 'alma', x: b.x, y: b.y - 20, vy: -30, vida: 1.2, max: 1.2, cor: '#7ff0ff', tam: 1.6 });
  }
  // o fundo de dentro da terra: parede escura, para não ver a mata através da gruta
  function fundoGruta() {
    const R = regiao(), at = img['p_' + F.atual.regiao], p = A2.props.chao;
    for (const q of F.atual.escuros) {
      if (q.x1 < cam.x - 20 || q.x0 > cam.x + D.VW + 20 || !aberto(q)) continue;
      for (let x = Math.floor(Math.max(q.x0, cam.x - 32) / T) * T; x < Math.min(q.x1, cam.x + D.VW + 32); x += T) for (let y = q.y0; y < q.y1; y += T) { const sx = p[0] + ((x * 3 + y) % 560); if (at) g.drawImage(at, sx, p[1] + 48 + ((x + y) / T & 1) * 18, T, T, x, y, T, T); }
      g.fillStyle = 'rgba(' + R.terra.map((v) => Math.round(v * 0.3)).join(',') + ',0.74)'; g.fillRect(q.x0, q.y0, q.x1 - q.x0, q.y1 - q.y0);
    }
  }
  function poseGente(H) {
    if (H.caida) return ['morte', 0];
    if (H.dorme != null && Math.abs(H.vx) < 5) { const h = J.heroi; const k = h.acordando ? 1.25 - h.t : h.andaAte ? 0 : Math.min(1.25, Math.max(0, h.t - 0.4)); return ['dormir', Math.min(4, Math.floor(k / 1.25 * 4.99))]; }
    if (H.tDor > 0) return ['dor', H.tDor > 0.15 ? 0 : 1];
    if (H.tGolpe > 0) return ['golpe1', H.tGolpe > 0.3 ? 0 : H.tGolpe > 0.22 ? 1 : H.tGolpe > 0.08 ? 2 : 3];
    if (H.tColhe > 0) return ['colher', Math.min(3, Math.floor((0.6 - H.tColhe) * 8))];
    if (!H.noChao) return ['pulo', H.vy < 0 ? 0 : 1];
    if (Math.abs(H.vx) > 12) return ['correr', Math.floor(H.andou / 13) % 8];
    if (H.perdida) return ['dormir', 1];
    const c = (tempo + H.x * 0.01) % 4; return ['parado', c < 1.4 ? 0 : c < 2.1 ? 1 : c < 3.2 ? 3 : 2];
  }
  // ---------- o companheiro (filhote do Alfa) ----------
  let guaraIm = null;
  function guara() {
    if (guaraIm) return guaraIm; const base = img.m_guara || img.m_lobo; if (!base || !base.width) return null;
    const c = document.createElement('canvas'); c.width = base.width; c.height = base.height; const q = c.getContext('2d'); q.drawImage(base, 0, 0);
    if (!img.m_guara) { q.globalCompositeOperation = 'source-atop'; q.fillStyle = 'rgba(206,96,34,0.5)'; q.fillRect(0, 0, c.width, Math.round(c.height * 0.8)); q.fillStyle = 'rgba(20,12,8,0.55)'; q.fillRect(0, Math.round(c.height * 0.8), c.width, c.height); }
    return (guaraIm = c);
  }
  function desenhaPet() {
    const im = guara(), mt = A2.monstros[img.m_guara ? 'guara' : 'lobo']; if (!im || !mt) return;
    const f = J.filhote && J.filhote(), P = J.pet;
    const pinta = (x, y, dir, q, es, sy) => { g.save(); g.translate(Math.round(x), Math.round(y + 1)); g.scale(dir * es, es * (sy || 1)); g.drawImage(im, q * mt.w, 0, mt.w, mt.h, -Math.round(mt.w / 2), -mt.h + 1, mt.w, mt.h); g.restore(); };
    if (f) { sombra(f.x, f.y, 8); pinta(f.x, f.y, -1, 0, 0.46, 1 + Math.sin(tempo * 2) * 0.03); brilhos.push([f.x, f.y - 10, 60, '255,200,150', 0.45]); }
    if (!P) return;
    let q = 0; const es = J.escPet();
    if (P.estado === 'dorme') q = 7; else if (P.tMorde > 0) q = 5; else if (P.tDor > 0.6) q = 6; else if (!P.noChao) q = 4; else if (Math.abs(P.vx) > 8) q = [1, 2, 3, 2][Math.floor(P.andou / 9) % 4];
    sombra(P.x, P.y, 10 * es / 0.6); pinta(P.x, P.y, P.dir, q, es, q === 0 ? 1 + Math.sin(tempo * 3) * 0.02 : 1);
  }
  function desenhaHum() {
    const H = J.hum; if (!H || H.dentro) return;
    const [a, n] = poseGente(H); sombra(H.x, H.y, 13);
    const deita = a === 'dormir' && n >= 4;
    quadroGente('mulher', a, n, H.x, H.y + 1, { dir: H.dir, sy: deita ? 1 + Math.sin(tempo * 1.5 + 1) * 0.025 : 1, branco: H.tDor > 0.2 ? 0.7 : 0, a: H.inv > 0 && H.tDor <= 0 && Math.floor(H.inv * 16) % 2 ? 0.6 : 1 });
    brilhos.push([H.x, H.y - 30, 70, '255,214,170', 0.35]);
    const D2 = J.save.hum;
    if (D2 && D2.lanca && ['parado', 'correr'].includes(a) && A2.armas.lanca) { const p = A2.armas.lanca; g.save(); g.translate(Math.round(H.x + H.dir * 11), Math.round(H.y - 29)); g.scale(H.dir, 1); g.rotate(a === 'correr' ? -0.3 : -1.42); g.drawImage(img.armas, p[0], p[1], p[2], p[3], -22, -Math.round(p[3] / 2), p[2], p[3]); g.restore(); }
    if (H.caida) { g.fillStyle = '#0a0808d0'; g.fillRect(H.x - 18, H.y - 46, 36, 4); g.fillStyle = '#ff9a6a'; g.fillRect(H.x - 17, H.y - 45, 34 * Math.max(0, H.tCaida / 25), 2); }
    else if (H.hp < H.hpMax) { g.fillStyle = '#0a0808d0'; g.fillRect(H.x - 14, H.y - 66, 28, 4); g.fillStyle = '#d8a06a'; g.fillRect(H.x - 13, H.y - 65, 26 * (H.hp / H.hpMax), 2); }
  }
  function desenhaGente() {
    for (const q of J.gente || []) {
      if (q.dentro || Math.abs(q.x - cam.x - D.VW / 2) > D.VW) continue;
      if (q.bebe) continue; // dorme no berço
      const id = q.p ? J.save.dia - q.p.dia : 99, e = q.mae ? 1 : id >= 5 ? 0.82 : 0.55 + id * 0.04, [a, n] = poseGente(q);
      sombra(q.x, q.y, 12 * e); quadroGente(q.tipo, a, n, q.x, q.y + 1, { dir: q.dir, e });
    }
  }
  // os moradores: duas poses paradas, duas de andar, uma de trabalho e uma de ataque
  function quadroVila(fila, n, x, y, dir, sy) { const im = img.h_vila; if (!im) return; g.save(); g.translate(Math.round(x), Math.round(y)); g.scale(dir, sy || 1); g.drawImage(im, n * 100, fila * 100, 100, 100, -50, -PE, 100, 100); g.restore(); }
  function desenhaPovo() {
    if (J.preso) { const p = J.preso; quadroVila(C.VILA[p.id].fila, Math.floor(tempo * 0.7) % 2, p.x + 14, p.y + 1, -1); lugar('gaiola', p.x, p.y + 4); brilhos.push([p.x + 10, p.y - 34, 80, '255,214,170', 0.5]); }
    for (const q of J.povo || []) {
      if (q.dentro || Math.abs(q.x - cam.x - D.VW / 2) > D.VW) continue; const c = (tempo + q.x * 0.01) % 4;
      const n = q.tGolpe > 0 ? 5 : q.tTrab > 0 ? 4 : Math.abs(q.vx) > 8 ? [2, 0, 3, 1][Math.floor(q.andou / 13) % 4] : c < 2.6 ? 0 : 1;
      sombra(q.x, q.y, 12); quadroVila(q.id === 'fam' ? q.fila : C.VILA[q.id].fila, n, q.x, q.y + 1 + (q.tTrab > 0 ? Math.abs(Math.sin(tempo * 5)) : 0), q.dir);
    }
  }
  function predio(n, x, y, o) {
    const p = A2.cidade && A2.cidade[n]; if (!p || !img.cidade || x + p[2] < cam.x - 10 || x - p[2] > cam.x + D.VW + 10) return; o = o || {};
    g.save(); g.translate(Math.round(x), Math.round(y)); if (o.v) g.scale(-1, 1); g.drawImage(img.cidade, p[0], p[1], p[2], p[3], Math.round(-p[2] / 2), -p[3], p[2], p[3]); g.restore();
  }
  function desenhaCidade(y) {
    const L = J.save.lar, lug = F.atual.lugar, t = (k) => (L[k] && L[k].n) || 0, noite = J.ehNoite();
    if (t('arsenal')) predio('arsenal', lug.arsenal, y + 5);
    J.torres().forEach((x, i) => { predio('torre', x, y + 5, { v: i === 1 }); const fx = x + (i ? 30 : -30); brilhos.push([fx, y - 112, 90 + Math.sin(tempo * 8 + i) * 5, '255,170,80', 0.8]); if (Math.random() < 0.12) J.poe({ tipo: 'brasa', x: fx, y: y - 116, vx: 0, vy: -24, vida: 0.7, max: 0.7, cor: '#ffb060', tam: 1.2 }); });
    if (t('poco')) predio('poco', lug.poco, y + 4);
    if (t('celeiro')) predio('celeiro', lug.celeiro, y + 5);
    if (t('praca')) { predio('praca', lug.praca, y + 5); brilhos.push([lug.praca + 2, y - 62, 80 + Math.sin(tempo * 1.6) * 8, '255,160,90', 0.8]); if (Math.random() < 0.06) J.poe({ tipo: 'alma', x: lug.praca + (Math.random() - 0.5) * 30, y: y - 50, vy: -14, vida: 1.6, max: 1.6, cor: '#ffcf8a', tam: 1.4 }); }
    for (let i = 0; i < t('casario'); i++) { const x = J.loteDe(i), f = J.familias().find((q) => q.lote === i); predio(i < 2 ? 'fam1' : 'fam2', x, y + 5, { v: i % 2 === 1 }); if (f) { brilhos.push([x, y - 34, noite ? 84 : 50, '255,190,110', noite ? 0.7 : 0.14]); if (i >= 2 && Math.random() < 0.06) J.poe({ tipo: 'poeira', x: x + (i % 2 ? -30 : 30), y: y - 114, vy: -20, vx: 6, vida: 1.8, max: 1.8, tam: 4 }); } }
    if (J.mercador() && !J.raid) { predio('mercado', lug.mercador, y + 5); quadroVila(6, Math.floor(tempo * 0.6) % 2, lug.mercador - 8, y + 1, 1); brilhos.push([lug.mercador, y - 40, 70, '255,190,120', 0.2]); }
  }
  function tendasVila(y) { for (const id of J.moradores()) { const x = J.vagaDe(id), v = J.save.vila[id], n = J.save.dia - v.dia >= 6 ? 'casa3' : J.save.dia - v.dia >= 2 ? 'casa2' : 'casa1'; if (x < cam.x - 120 || x > cam.x + D.VW + 120) continue; peca(n, x, y + 4, { e: n === 'casa3' ? 0.72 : 0.86, v: C.VILA[id].fila % 2 === 1 }); brilhos.push([x, y - 22, 54, '255,180,100', J.ehNoite() ? 0.4 : 0.16]); if (id === 'ferreiro') { peca('cepo', x + 40, y + 3, { e: 0.8 }); if (Math.random() < 0.1) J.poe({ tipo: 'brasa', x: x + 40, y: y - 18, vx: 0, vy: -30, vida: 0.8, max: 0.8, cor: '#ff9a40', tam: 1.3 }); } if (id === 'cacador') peca('varal', x - 44, y + 3, { e: 0.7 }); if (id === 'curandeira') prop('planta', x + 40, y + 3, { e: 0.7 }); } }
  function barraObra(x, y, o, cheio) { if (!o || o.hp >= cheio || !cheio) return; g.fillStyle = '#0a0808d0'; g.fillRect(x - 21, y, 42, 4); g.fillStyle = o.hp < cheio * 0.35 ? '#d0482e' : '#a8845a'; g.fillRect(x - 20, y + 1, 40 * Math.max(0, o.hp / cheio), 2); }
  function desenhaLar(frenteDe) {
    const A = F.atual, L = J.save.lar; if (!A.lugar || !L) return; const lug = A.lugar, y = A.terreno.piso;
    if (!frenteDe) {
      const n = L.casa.n;
      if (n) {
        peca('casa' + n, lug.casa, y + 4);
        const cheio = C.CASAS[n].hp; if (L.casa.hp < cheio * 0.5 && Math.random() < 0.15) J.poe({ tipo: 'poeira', x: lug.casa + (Math.random() - 0.5) * 60, y: y - 50, vy: -20, vida: 0.9, max: 0.9, tam: 5 });
        barraObra(lug.casa, y - A2.casa['casa' + n][3] - 8, L.casa, cheio);
        if (n >= 3) brilhos.push([lug.casa + (n === 5 ? 44 : -10), y - 26, 60, '255,190,110', 0.55]);
        if (n === 5 && Math.random() < 0.08) J.poe({ tipo: 'poeira', x: lug.casa + 44, y: y - 116, vy: -22, vx: 6, vida: 1.6, max: 1.6, tam: 4 });
      } else { const a = 0.16 + 0.06 * Math.sin(tempo * 2); peca('casa1', lug.casa, y + 4, { a }); for (const d of [-44, -18, 18, 44]) { g.fillStyle = '#3a2a1c'; g.fillRect(lug.casa + d - 1, y - 9, 3, 10); g.fillStyle = '#8a6a48'; g.fillRect(lug.casa + d - 1, y - 9, 1, 9); } }
      if (L.varal && L.varal.n) { peca('varal', lug.varal, y + 3); if (!(L.varal.carnes || L.varal.secas)) { g.fillStyle = 'rgba(0,0,0,0)'; } }
      if (L.horta && L.horta.n) peca('horta', lug.horta, y + 8, { a: 1 });
      if (L.bau && L.bau.n) { const bx = Math.round(lug.bau), by = y + 2; for (const [q, w, h1, cx, cy] of [['#0c0906', 30, 20, -15, -20], ['#4a3220', 28, 18, -14, -19], ['#6a4a2e', 28, 6, -14, -19], ['#8a6640', 28, 1, -14, -19], ['#2c1d12', 28, 1, -14, -13], ['#2c1d12', 1, 18, -6, -19], ['#2c1d12', 1, 18, 5, -19], ['#1a1410', 28, 2, -14, -3], ['#8a8078', 5, 6, -2, -15], ['#1a1410', 1, 2, 0, -13]]) { g.fillStyle = q; g.fillRect(bx + cx, by + cy, w, h1); } }
      if (L.berco && L.berco.n) { peca('berco', lug.berco, y + 3); if ((J.gente || []).some((q) => q.bebe)) { g.fillStyle = '#b87850'; g.beginPath(); g.arc(lug.berco - 6, y - 24 + Math.sin(tempo * 2) * 0.6, 4, 0, 7); g.fill(); g.fillStyle = '#2a1c14'; g.fillRect(lug.berco - 10, y - 29, 8, 3); } }
      desenhaCidade(y); tendasVila(y); lago(lug.lago, y);
      if (L.curtume && L.curtume.n) { peca('varal', lug.curtume, y + 3, { e: 0.8 }); itemEm(g, 'couro', lug.curtume - 16, y - 40, 0.9); itemEm(g, 'pele', lug.curtume + 2, y - 40, 0.8); }
      peca('cepo', lug.cepo, y + 3); if (L.lenha > 0) peca('lenha', lug.lenha, y + 3, { e: 0.5 + Math.min(0.4, L.lenha / 80) });
      for (const k of ['cercaE', 'cercaD']) if (L[k] && L[k].n) { const o = L[k]; if (o.hp > 0) { peca('cerca', lug[k], y + 4, { e: 0.62 + o.n * 0.1 }); barraObra(lug[k], y - 92, o, J.cheioObra(k)); } else peca('lenha', lug[k], y + 4, { e: 0.5 }); }
    } else for (const k of ['estacasE', 'estacasD']) if (L[k] && L[k].n && L[k].hp > 0) peca('estacas', lug[k], y + 6);
  }
  function lago(x, y) {
    const w = 62, R = regiao(); g.fillStyle = '#0a1416'; g.fillRect(x - w - 4, y - 2, w * 2 + 8, 12); g.fillStyle = '#16383e'; g.fillRect(x - w, y, w * 2, 9); g.fillStyle = 'rgba(' + R.nevoa + ',0.35)'; g.fillRect(x - w, y, w * 2, 2);
    for (let i = 0; i < 9; i++) { const k = (tempo * 0.12 + i * 0.137) % 1, xx = x - w + 6 + ((hash(i) * w * 2 + k * 24) % (w * 2 - 22)); g.globalAlpha = Math.sin(k * Math.PI) * 0.6; g.fillStyle = '#bfe4ee'; g.fillRect(Math.round(xx), y + 2 + (i % 3) * 2, 8 + (i % 4) * 3, 1); } g.globalAlpha = 1;
    prop('planta', x - w - 6, y + 4, { e: 0.6 }); prop('samambaia', x + w + 8, y + 4, { e: 0.6 });
  }
  // ---------- o tempo que faz ----------
  function desenhaClima(dt) {
    const c = J.clima; if (!c || c.forca < 0.02 || c.tipo === 'limpo') return; const f = c.forca, VW = D.VW, VH = D.VH, ab = J.abrigado() ? 0.15 : 1;
    if (c.tipo === 'chuva' || c.tipo === 'tempestade') {
      const t2 = c.tipo === 'tempestade' ? 1.6 : 1, n = Math.round(110 * f * t2 * ab), inc = c.lado * (c.tipo === 'tempestade' ? 5 : 2.4); g.fillStyle = 'rgba(190,220,235,0.42)';
      for (let i = 0; i < n; i++) { const v = 420 + hash(i) * 260, x = ((hash(i * 7) * (VW + 120) + tempo * inc * 42 - cam.x * (0.6 + hash(i) * 0.5)) % (VW + 120) + VW + 120) % (VW + 120) - 60, y = (hash(i * 13) * VH + tempo * v) % (VH + 30) - 20; for (let k = 0; k < 4; k++) g.fillRect(Math.round(x + inc * k * 0.5), Math.round(y + k * 3), 1, 3); }
      if (ab === 1) for (let i = 0; i < 8 * f; i++) { const x = cam.x + Math.random() * VW, y = F.chao(x); fxPingo.push([x - cam.x, y - cam.y, 0.16]); }
      g.fillStyle = 'rgba(210,232,240,0.5)'; for (let i = fxPingo.length - 1; i >= 0; i--) { const q = fxPingo[i]; q[2] -= dt; if (q[2] <= 0) { fxPingo.splice(i, 1); continue; } g.fillRect(Math.round(q[0]) - 2, Math.round(q[1]) - 2, 1, 1); g.fillRect(Math.round(q[0]) + 2, Math.round(q[1]) - 2, 1, 1); g.fillRect(Math.round(q[0]), Math.round(q[1]) - 1, 1, 1); }
      g.fillStyle = 'rgba(40,60,76,' + 0.16 * f * t2 + ')'; g.fillRect(0, 0, VW, VH);
    } else if (c.tipo === 'neve') {
      const n = Math.round(150 * f * ab); for (let i = 0; i < n; i++) { const z = 0.5 + hash(i * 3), x = ((hash(i * 7) * (VW + 60) + Math.sin(tempo * (0.6 + hash(i)) + i) * 14 + tempo * c.lado * 26 * z - cam.x * z * 0.8) % (VW + 60) + VW + 60) % (VW + 60) - 30, y = (hash(i * 11) * VH + tempo * 46 * z) % (VH + 10) - 5; g.fillStyle = 'rgba(226,236,248,' + (0.35 + 0.4 * z) + ')'; const t3 = z > 1.15 ? 2 : 1; g.fillRect(Math.round(x), Math.round(y), t3, t3); }
      g.fillStyle = 'rgba(190,206,230,' + 0.1 * f + ')'; g.fillRect(0, 0, VW, VH);
    } else if (c.tipo === 'neblina') {
      const R = regiao(); g.save(); for (let i = 0; i < 7; i++) { const x = ((tempo * (8 + i * 2.4) * c.lado - cam.x * (0.5 + i * 0.12) + i * 190) % (VW + 420) + VW + 420) % (VW + 420) - 210, y = VH * (0.28 + (i % 4) * 0.17); g.globalAlpha = 0.2 * f; g.drawImage(mancha(corFio(R)), x - 210, y - 80, 420, 170); } g.globalAlpha = 0.16 * f; g.fillStyle = 'rgb(' + corFio(R) + ')'; g.fillRect(0, 0, VW, VH); g.restore();
    } else if (c.tipo === 'cinza') {
      const n = Math.round(110 * f * ab); for (let i = 0; i < n; i++) { const z = 0.5 + hash(i * 3), x = ((hash(i * 7) * (VW + 60) + Math.sin(tempo + i) * 10 + tempo * 18 * z - cam.x * z * 0.8) % (VW + 60) + VW + 60) % (VW + 60) - 30, y = (hash(i * 11) * VH + tempo * 22 * z) % (VH + 10) - 5, br = hash(i * 5) < 0.14; g.fillStyle = br ? 'rgba(255,140,60,0.8)' : 'rgba(150,140,136,' + (0.3 + 0.3 * z) + ')'; g.fillRect(Math.round(x), Math.round(y), z > 1.1 ? 2 : 1, 1); }
      g.fillStyle = 'rgba(70,40,24,' + 0.1 * f + ')'; g.fillRect(0, 0, VW, VH);
    } else if (c.tipo === 'vento') {
      g.fillStyle = 'rgba(220,230,244,0.3)'; for (let i = 0; i < 26 * f * ab; i++) { const x = ((hash(i * 7) * (VW + 200) + tempo * c.lado * (330 + hash(i) * 260)) % (VW + 200) + VW + 200) % (VW + 200) - 100, y = hash(i * 13) * VH + Math.sin(tempo * 2 + i) * 6; g.fillRect(Math.round(x), Math.round(y), 22 + hash(i) * 30, 1); }
    }
  }
  const fxPingo = [];
  function desenhaCerco() {
    if (F.fechos) for (const c of F.fechos) { const x = c * T + 8, y = F.atual.topo[c] * T; for (let i = 0; i < 9; i++) { const h1 = 90 + hash(c + i * 3) * 120, bx = x - 14 + i * 3.4, o = Math.sin(tempo * 1.4 + i) * 2; g.fillStyle = '#0c0a08'; g.beginPath(); g.moveTo(bx - 3, y + 3); g.quadraticCurveTo(bx + (hash(i) - 0.5) * 34 + o, y - h1 * 0.5, bx + (hash(i * 7 + c) - 0.5) * 18, y - h1); g.lineTo(bx + 4, y + 3); g.fill(); g.strokeStyle = 'rgba(110,84,58,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(bx, y); g.quadraticCurveTo(bx + (hash(i) - 0.5) * 34 + o, y - h1 * 0.5, bx + (hash(i * 7 + c) - 0.5) * 18, y - h1); g.stroke(); } }
    if (J.cativeiro) { const c = J.cativeiro; quadroGente('mulher', 'dormir', 1, c.x, c.y + 1, { dir: -1 }); peca('cerca', c.x, c.y + 4, { e: 0.55, a: 0.72 }); brilhos.push([c.x, c.y - 30, 70, '255,214,170', 0.4]); }
    const e = F.atual.resgate; if (e && !J.save.hum && !J.emb && !J.hum && J.save.fugiu !== J.save.dia) { const y = F.chao(e.resgate); quadroGente('mulher', 'dormir', 1, e.resgate, y + 1, { dir: -1 }); brilhos.push([e.resgate, y - 30, 80, '255,214,170', 0.5]); }
  }

  // ---------- vida no ar ----------
  const ar = [];
  function ambiente(dt, ox, oy) {
    const R = regiao(), n = 44;
    while (ar.length < n) { const tipo = R.ar[Math.floor(Math.random() * R.ar.length)], cai = ['folha', 'cinza', 'neve'].includes(tipo); ar.push({ tipo, x: ox + Math.random() * D.VW, y: cai && ar.cheio ? oy - 10 : oy + Math.random() * D.VH, vida: 6 + Math.random() * 6, fase: Math.random() * 7, reg: F.atual.regiao, z: 0.6 + Math.random() * 0.8 }); }
    ar.cheio = true;
    for (let i = ar.length - 1; i >= 0; i--) {
      const a = ar[i]; a.vida -= dt; a.fase += dt;
      if (a.tipo === 'vagalume') { a.x += Math.sin(a.fase * 0.9) * 12 * dt; a.y += Math.cos(a.fase * 1.3) * 9 * dt; }
      else if (a.tipo === 'folha') { a.x += (Math.sin(a.fase * 2) * 20 - 10) * dt; a.y += 18 * dt; }
      else if (a.tipo === 'neve') { a.x += (Math.sin(a.fase * 1.2) * 10 - 22) * dt; a.y += 26 * a.z * dt; }
      else if (a.tipo === 'cinza') { a.x += (Math.sin(a.fase) * 6 - 4) * dt; a.y += 12 * dt; }
      else if (a.tipo === 'brasinha' || a.tipo === 'esporo') { a.x += Math.sin(a.fase * 1.7) * 8 * dt; a.y -= 14 * dt; }
      else if (a.tipo === 'nevoa') a.x += 8 * dt;
      if (a.vida <= 0 || a.reg !== F.atual.regiao) { ar.splice(i, 1); continue; }
      if (a.x < ox - 30) a.x += D.VW + 50; if (a.x > ox + D.VW + 30) a.x -= D.VW + 50;
      if (a.y > oy + D.VH + 20) a.y -= D.VH + 30; if (a.y < oy - 30) a.y += D.VH + 40;
    }
  }
  function desenhaAr() {
    for (const a of ar) {
      const f = Math.max(0, Math.min(1, a.vida)), x = a.x | 0, y = a.y | 0;
      if (a.tipo === 'vagalume') { const b = 0.35 + 0.65 * Math.max(0, Math.sin(a.fase * 2.2)); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = '#d8ff70'; g.globalAlpha = f * b; g.fillRect(x, y, 2, 2); g.globalAlpha = f * b * 0.25; g.fillRect(x - 2, y - 2, 6, 6); g.restore(); if (a.z > 1.1) brilhos.push([x, y, 22, '200,255,110', b * 0.35]); }
      else if (a.tipo === 'folha') { g.globalAlpha = f * 0.9; g.fillStyle = a.z > 1 ? '#5a8a5a' : '#3a6a54'; g.fillRect(x, y, Math.abs(Math.sin(a.fase * 3)) > 0.5 ? 3 : 1, 2); g.globalAlpha = 1; }
      else if (a.tipo === 'neve') { g.globalAlpha = f * 0.7; g.fillStyle = '#d8e4f4'; g.fillRect(x, y, a.z > 1 ? 2 : 1, a.z > 1 ? 2 : 1); g.globalAlpha = 1; }
      else if (a.tipo === 'cinza') { g.globalAlpha = f * 0.6; g.fillStyle = '#b8aab8'; g.fillRect(x, y, 1, 1); g.globalAlpha = 1; }
      else if (a.tipo === 'brasinha' || a.tipo === 'esporo') { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = f * (0.5 + 0.5 * Math.sin(a.fase * 5)); g.fillStyle = a.tipo === 'esporo' ? '#80c8a0' : '#ff8a40'; g.fillRect(x, y, a.z > 1 ? 2 : 1, a.z > 1 ? 2 : 1); g.restore(); }
      else if (a.tipo === 'nevoa') { g.globalAlpha = 0.07 * f; g.drawImage(mancha(regiao().nevoa), x - 46, y - 46, 92, 92); g.globalAlpha = 1; }
    }
  }
  // folhagem preta bem perto da câmera
  function frente() {
    const passo = 300, off = cam.x * 1.35, i0 = Math.floor(off / passo) - 1;
    for (let i = i0; i < i0 + Math.ceil(D.VW / passo) + 3; i++) {
      const r = hash(i * 53 + 5); if (r < 0.45) continue;
      const n = r < 0.7 ? 'samambaia' : 'planta', t = tingida(n, F.atual.regiao, '3,6,8', 0.88); if (!t) continue;
      const e = 1.9 + r, x = Math.round(i * passo - off + r * 120), w = t.width * e, h = t.height * e, y = D.VH + 34 - (cam.y - 190) * 0.1;
      g.drawImage(t, Math.round(x - w / 2), Math.round(y - h), Math.round(w), Math.round(h));
    }
  }

  // ---------- o quadro ----------
  const brilhos = [];
  D.centrar = function () { const h = J.heroi; cam.x = alvoX(h); cam.y = alvoY(h); };
  const limX = (x) => Math.max(2 * T, Math.min(F.W * T - D.VW - 8, x)), limY = (y) => Math.max(-40, Math.min(y, F.H * T - D.VH));
  const alvoX = (h) => limX(h.x - D.VW / 2 + cam.olha + D.VW * (D.lado || 0));
  const alvoY = (h) => limY(h.y - D.VH * 0.68);
  D.quadro = function (dt) {
    const h = J.heroi; if (!h || !F.atual) return;
    D.dt = dt; tempo += dt; D.tempo = tempo; brilhos.length = 0;
    const R = regiao(); noiteK = J.claridade ? 1 - J.claridade() : 0;
    // câmera: olha à frente e só sobe ou desce de verdade quando você pisa
    const olha = h.dir * 34 + Math.max(-40, Math.min(40, h.vx * 0.22)); cam.olha += (olha - cam.olha) * Math.min(1, dt * 1.8);
    cam.x += (alvoX(h) - cam.x) * Math.min(1, dt * 7);
    const ay = alvoY(h) + (h.noChao && J.ent.baixo && Math.abs(h.vx) < 5 ? 50 : 0), dif = ay - cam.y;
    const vy = h.noChao ? 4.5 : Math.abs(dif) > 70 ? 6 : 1.4; cam.y += dif * Math.min(1, dt * vy);
    if (F.fechada && F.atual.arena) { const A = F.atual.arena, lar = A.x1 - A.x0; if (lar > D.VW) cam.x = Math.max(A.x0 - 10, Math.min(A.x1 + 10 - D.VW, cam.x)); }
    if (D.foco) { cam.x += (limX(D.foco.x - D.VW / 2) - cam.x) * Math.min(1, dt * 3); }
    const tr = J.pref && !J.pref.tremor ? 0 : J.tremor, cx0 = cam.x + (tr ? (Math.sin(tempo * 61) * 0.6 + Math.sin(tempo * 97) * 0.4) * tr * 0.62 : 0), cy0 = cam.y + (tr ? (Math.sin(tempo * 73 + 1) * 0.6 + Math.sin(tempo * 113) * 0.4) * tr * 0.55 : 0), ox = Math.floor(cx0), oy = Math.floor(cy0), sbx = cx0 - ox, sby = cy0 - oy;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    fundo();
    g.translate(-ox, -oy);
    const A = F.atual;
    for (const d of A.decor) if (d.c === 0) prop(d.n, d.x, d.y, d);
    fundoGruta(); desenhaLugares();
    { const yv = Math.round(F.chao(cam.x + D.VW / 2) - 150); g.globalAlpha = 0.5; g.drawImage(guarda('faixa' + R.nevoa, 2, 180, (q, w, hh) => { const gr = q.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, 'rgba(' + R.nevoa + ',0)'); gr.addColorStop(0.7, 'rgba(' + R.nevoa + ',0.34)'); gr.addColorStop(1, 'rgba(' + R.nevoa + ',0.2)'); q.fillStyle = gr; q.fillRect(0, 0, w, hh); }), ox, yv, D.VW, 200); g.globalAlpha = 1; }
    for (let tx = Math.max(1, Math.floor(ox / T) - 1); tx <= Math.min(A.W - 2, Math.floor((ox + D.VW) / T) + 1); tx++) {
      const tp = A.topo[tx]; let e = 99, d = 99; for (let k = 1; k <= 16; k++) { e = Math.min(e, A.topo[Math.max(0, tx - k)]); d = Math.min(d, A.topo[Math.min(A.W - 1, tx + k)]); } const borda = Math.max(e, d); if (tp - borda < 3) continue;
      const y0 = borda * T - 4, alt = (tp - borda) * T + 26; g.drawImage(guarda('buraco' + R.terra, 2, 64, (q, w, hh) => { const gr = q.createLinearGradient(0, 0, 0, hh), k = R.terra.map((v) => Math.round(v * 0.22)).join(','); gr.addColorStop(0, 'rgba(' + k + ',0)'); gr.addColorStop(0.35, 'rgba(' + k + ',0.62)'); gr.addColorStop(1, 'rgba(' + k + ',0.97)'); q.fillStyle = gr; q.fillRect(0, 0, w, hh); }), tx * T, y0, T, alt);
    }
    for (const p of A.portas) desenhaPorta(p);
    for (let i = Math.floor(ox / (PED * T)); i <= Math.floor((ox + D.VW) / (PED * T)); i++) if (i >= 0 && i * PED < F.W) g.drawImage(pedaco(i), 0, Math.max(0, oy), PED * T, Math.min(F.H * T - Math.max(0, oy), D.VH + 8), i * PED * T, Math.max(0, oy), PED * T, Math.min(F.H * T - Math.max(0, oy), D.VH + 8));
    for (const d of A.decor) if (d.c === 1) { if (Math.abs(d.x - ox - D.VW / 2) < D.VW * 0.6 && A2.props[d.n]) contato(d.x, d.y - 1, A2.props[d.n][2] * d.e * 0.42); prop(d.n, d.x, d.y, d); if (d.n === 'cogumelos' && Math.abs(d.x - h.x) < D.VW) brilhos.push([d.x, d.y - 18, 54, '90,220,230', 0.5 + 0.15 * Math.sin(tempo * 2 + d.x)]); }
    if (D.vivo) { D.vivo.tapeteAtras(g); D.vivo.atras(g, brilhos); for (let i = Math.floor(ox / (PED * T)); i <= Math.floor((ox + D.VW) / (PED * T)); i++) { const pd = pedacos.get(i); if (pd && pd.luzes) for (const l of pd.luzes) brilhos.push([l[0], l[1], l[2] + Math.sin(tempo * 1.8 + l[0]) * 4, l[3], l[4]]); } }
    desenhaMundo(); desenhaLar(false); desenhaCerco(); desenhaBaus(); if (D.vivo) D.vivo.bichos(g, dt);
    for (const c of A.circulos) desenhaCirculo(c);
    for (const c of A.coleta) desenhaColeta(c);
    for (const f of A.fogos) { if (Math.abs(f.x - ox - D.VW / 2) > D.VW) continue; prop('fogo', f.x, f.y + 4); if (J.save.fogos[f.id] && (A.id !== 'lar' || !J.save.lar || J.save.lar.lenha > 0)) chama(f.x, f.y, h.estado === 'dorme' ? 0.95 : 1.1); else if (J.save.fogos[f.id]) brilhos.push([f.x, f.y - 8, 40, '255,120,60', 0.5]); }
    if (F.fechada && A.arena) for (const x of [A.arena.x0 + 8, A.arena.x1 - 8]) { const gr = g.createLinearGradient(x - 22, 0, x + 22, 0); gr.addColorStop(0, 'rgba(' + R.nevoa + ',0)'); gr.addColorStop(0.5, 'rgba(' + R.nevoa + ',0.75)'); gr.addColorStop(1, 'rgba(' + R.nevoa + ',0)'); g.fillStyle = gr; g.fillRect(x - 22, A.arena.piso - 340, 44, 340); }
    for (const f of J.fx) if (f.tipo === 'circulo') desenhaFx(f);
    for (const m of J.magias) desenhaMagia(m);
    for (const e of J.inimigos) if (!e.vivo || e.estado === 'caido') desenhaInimigo(e);
    for (const e of J.inimigos) if (e.vivo && e.estado !== 'caido') desenhaInimigo(e);
    for (const r of J.restos) { itemEm(g, r.m, Math.round(r.x - 8), Math.round(r.y - 14 + Math.sin(tempo * 4 + r.x) * 1.5), 0.5); brilhos.push([r.x, r.y - 6, 22, '255,236,180', 0.3]); }
    for (const r of J.rastro) { g.globalAlpha = (r.vida / r.max) * 0.5; quadroHeroi(g, J.save.roupa, r.anim, r.q, r.x, r.y, { dir: r.dir, sil: r.cor }); g.globalAlpha = 1; }
    desenhaPovo(); desenhaGente(); desenhaHum(); desenhaPet(); desenhaHeroi(h); desenhaLar(true);
    for (const b of J.balas) desenhaBala(b);
    for (const f of J.fx) if (f.tipo !== 'circulo') desenhaFx(f);
    if (D.vivo) D.vivo.frente(g); for (const d of A.decor) if (d.c === 2) prop(d.n, d.x, d.y, d);
    ambiente(dt, ox, oy); desenhaAr();
    g.setTransform(1, 0, 0, 1, 0, 0);
    frente(); if (D.vivo) D.vivo.moldura(g); desenhaClima(dt);
    // névoa baixa correndo na frente
    g.save(); for (let i = 0; i < 3; i++) { const x = ((tempo * (6 + i * 3) - cam.x * (0.9 + i * 0.15) + i * 260) % (D.VW + 320) + D.VW + 320) % (D.VW + 320) - 160, y = D.VH * (0.78 + i * 0.07); g.globalAlpha = 0.11; g.drawImage(mancha(R.nevoa), x - 150, y - 52, 300, 104); } g.restore();

    // luz
    gl.setTransform(1, 0, 0, 1, 0, 0); gl.globalCompositeOperation = 'source-over';
    const cl0 = R.fundo0 != null ? R.fundo0 : J.claridade ? J.claridade() : 1, dusk = Math.sin(Math.PI * Math.min(1, Math.max(0, cl0))) , k = (D.escuro == null ? 1 : D.escuro) * (0.56 + 0.44 * cl0) * (1 - 0.14 * J.cl('chuva') - 0.28 * J.cl('tempestade') - 0.08 * J.cl('cinza'));
    // a luz muda de trecho para trecho da mesma área
    const zx = cam.x + D.VW / 2, zl = A.zonas; let zt = [1, 1, 1]; for (let i = 0; i < zl.length; i++) { const kz = Math.max(0, Math.min(1, (zx - zl[i].tx * T + 160) / 320)); zt = zt.map((v, j) => v + (zl[i].luz[j] - v) * kz); }
    const tom = [1 - (1 - cl0) * 0.18 + dusk * 0.14, 1 - (1 - cl0) * 0.08, 1 + (1 - cl0) * 0.16 - dusk * 0.1];
    gl.fillStyle = 'rgb(' + R.luz.map((v, i) => Math.min(255, Math.round(v * k * tom[i] * zt[i]))).join(',') + ')'; gl.fillRect(0, 0, D.VW, D.VH);
    const escuros = A.escuros.filter((q) => q.x1 > ox - 60 && q.x0 < ox + D.VW + 60);
    gl.globalCompositeOperation = 'lighter';
    // claridade que desce da copa
    gl.globalAlpha = k; gl.drawImage(guarda('copa' + R.nevoa, 2, 160, (q, w, h) => { const cl = q.createLinearGradient(0, 0, 0, h); cl.addColorStop(0, 'rgba(' + R.nevoa + ',0.42)'); cl.addColorStop(0.6, 'rgba(' + R.nevoa + ',0.2)'); cl.addColorStop(1, 'rgba(' + R.nevoa + ',0)'); q.fillStyle = cl; q.fillRect(0, 0, w, h); }), 0, 0, D.VW, D.VH); gl.globalAlpha = 1;
    // dentro da terra não entra o dia
    gl.globalCompositeOperation = 'source-over';
    for (const q of escuros) { if (!aberto(q)) continue; for (let i = 0; i < 5; i++) { gl.fillStyle = 'rgba(6,8,12,' + [0.3, 0.3, 0.3, 0.28, 0.24][i] + ')'; gl.fillRect(q.x0 - ox + i * 14 - 10, q.y0 - oy - 10, q.x1 - q.x0 - i * 28 + 20, q.y1 - q.y0 + 22); } }
    gl.globalCompositeOperation = 'lighter';
    brilhos.push([h.x, h.y - 32, 104 + noiteK * 46, '255,206,150', 0.5 + noiteK * 0.12], [h.x, h.y - 34, 46, '255,160,90', 0.25 + 0.06 * Math.sin(tempo * 2.2)]);
    if (J.save.tochaAcesa) { const tr2 = Math.sin(tempo * 13) * 4 + Math.sin(tempo * 7.3) * 4; brilhos.push([h.x - h.dir * 6, h.y - 52, 190 + tr2, '255,176,96', 0.9], [h.x, h.y - 40, 300, '255,150,80', 0.28]); }
    for (const b of brilhos) { const x = b[0] - ox, y = b[1] - oy; if (x < -b[2] || x > D.VW + b[2]) continue; gl.globalAlpha = Math.max(0, Math.min(1, b[4])); gl.drawImage(mancha(b[3]), x - b[2], y - b[2], b[2] * 2, b[2] * 2); }
    gl.globalAlpha = 1;
    g.globalCompositeOperation = 'multiply'; g.drawImage(luz, 0, 0); g.globalCompositeOperation = 'source-over';
    // brilho das luzes: o que é claro vaza um pouco em volta
    if (!J.pref || J.pref.brilho) {
      const bw = Math.ceil(D.VW / 4), bh = Math.ceil(D.VH / 4); if (bl.width !== bw || bl.height !== bh) { bl.width = bw; bl.height = bh; bl2.width = Math.ceil(bw / 2); bl2.height = Math.ceil(bh / 2); }
      gb.imageSmoothingEnabled = gb2.imageSmoothingEnabled = true; gb.globalCompositeOperation = 'source-over'; gb.globalAlpha = 1; gb.drawImage(buf, 0, 0, bw, bh); gb.globalCompositeOperation = 'multiply'; gb.drawImage(buf, 0, 0, bw, bh); gb.drawImage(buf, 0, 0, bw, bh); gb.drawImage(buf, 0, 0, bw, bh);
      gb2.globalCompositeOperation = 'source-over'; gb2.drawImage(bl, 0, 0, bl2.width, bl2.height);
      g.save(); g.imageSmoothingEnabled = true; g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.34 + noiteK * 0.3; g.drawImage(bl2, 0, 0, D.VW, D.VH); g.globalAlpha = 0.16 + noiteK * 0.16; g.drawImage(bl, 0, 0, D.VW, D.VH); g.restore(); g.imageSmoothingEnabled = false;
    }
    { const cq = dusk > 0.15 && cl0 > 0 && cl0 < 1 ? ['255,150,80', 0.1 * dusk] : noiteK > 0.5 ? ['60,90,170', 0.08 * noiteK] : ['255,230,180', 0.035]; g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = cq[1] * 3; g.fillStyle = 'rgb(' + cq[0] + ')'; g.fillRect(0, 0, D.VW, D.VH); g.restore(); }
    // escurece as bordas
    g.drawImage(guarda('borda' + D.VW, D.VW, D.VH, (q, w, h) => { const vg = q.createRadialGradient(w / 2, h * 0.52, h * 0.4, w / 2, h * 0.52, w * 0.66); vg.addColorStop(0, 'rgba(2,5,7,0)'); vg.addColorStop(1, 'rgba(2,5,7,0.62)'); q.fillStyle = vg; q.fillRect(0, 0, w, h); }), 0, 0);
    if (J.clarao > 0) { g.globalAlpha = Math.min(0.5, J.clarao * 0.5); g.fillStyle = J.heroi.estado === 'dor' ? '#8a1a10' : '#fff2d8'; g.fillRect(0, 0, D.VW, D.VH); g.globalAlpha = 1; }
    const perigo = h.estado !== 'morto' && h.hp < h.ficha.vida * 0.28; if (perigo) { const pv = g.createRadialGradient(D.VW / 2, D.VH / 2, D.VH * 0.35, D.VW / 2, D.VH / 2, D.VW * 0.6); pv.addColorStop(0, 'rgba(120,10,10,0)'); pv.addColorStop(1, 'rgba(120,10,10,' + (0.28 + 0.12 * Math.sin(tempo * 5)) + ')'); g.fillStyle = pv; g.fillRect(0, 0, D.VW, D.VH); }

    D.zoom = D.zoom || 1; const alvoZ = h.estado === 'dorme' && !h.andaAte && !h.acordando ? 1.55 : 1; if (J.soco > 0) { J.soco = Math.max(0, J.soco - dt * 0.5); } D.zoom += (alvoZ - D.zoom) * Math.min(1, dt * 0.9); if (Math.abs(D.zoom - 1) < 0.004) D.zoom = 1;
    ctx.imageSmoothingEnabled = false;
    const zz = D.zoom + (J.soco || 0);
    if (zz > 1.001) { const zw = D.VW / zz, zh = D.VH / zz, fx0 = h.fogo ? (h.x + h.fogo.x) / 2 : h.x, zx = Math.max(0, Math.min(D.VW - zw, fx0 - ox - zw / 2)), zy = Math.max(0, Math.min(D.VH - zh, h.y - oy - 26 - zh * 0.58)); ctx.drawImage(buf, zx, zy, zw, zh, 0, 0, cv.width, cv.height); }
    else { const e = D.esc; ctx.drawImage(buf, -Math.round(sbx * e), -Math.round(sby * e), D.VW * e, D.VH * e); }
    // números nítidos, por cima
    const ex = D.esc, ey = D.esc, ox2 = ox + (zz > 1.001 ? 0 : sbx), oy2 = oy + (zz > 1.001 ? 0 : sby);
    ctx.textAlign = 'center';
    const semNum = J.pref && !J.pref.numeros;
    for (const t of J.textos) { if (semNum && /^\d+$/.test(t.t)) continue; const a = Math.min(1, t.vida / 0.35), s = (t.grande ? 13 : 10) * (1 + Math.max(0, t.vida - t.max + 0.12) * 4); ctx.globalAlpha = a; ctx.font = '700 ' + Math.round(s * ex) + 'px Cinzel, serif'; ctx.lineWidth = 3 * ex * 0.6; ctx.strokeStyle = 'rgba(6,5,4,0.85)'; const x = (t.x - ox2) * ex, y = (t.y - oy2) * ey; ctx.strokeText(t.t, x, y); ctx.fillStyle = t.cor; ctx.fillText(t.t, x, y); }
    // de onde veio o golpe: um arco vermelho no lado da tela
    if (J.dorLado) { const d = J.dorLado, l = Math.sign(d.x - h.x) || 1, k = d.t / 0.9, gr = ctx.createRadialGradient(l > 0 ? cv.width : 0, cv.height * 0.5, 0, l > 0 ? cv.width : 0, cv.height * 0.5, cv.width * 0.32); gr.addColorStop(0, 'rgba(200,30,20,' + 0.5 * k + ')'); gr.addColorStop(1, 'rgba(200,30,20,0)'); ctx.fillStyle = gr; ctx.fillRect(l > 0 ? cv.width * 0.6 : 0, 0, cv.width * 0.4, cv.height); }
    // quem vem de fora da tela: uma ponta vermelha na beira
    if (h.estado !== 'morto' && h.estado !== 'dorme') for (const e of J.inimigos) {
      if (!e.vivo || !['prep', 'persegue', 'golpe'].includes(e.estado)) continue; const dx = e.x - ox; if ((dx > -6 && dx < D.VW + 6) || dx < -260 || dx > D.VW + 260 || Math.abs(e.y - h.y) > 170) continue;
      const l = dx < 0 ? 1 : -1, x = dx < 0 ? 12 * ex : cv.width - 12 * ex, y = Math.max(60 * ey, Math.min(cv.height * 0.62, (e.y - e.h / 2 - oy2) * ey)), k = e.estado === 'prep' ? 1 : 0.55; ctx.globalAlpha = k * (0.6 + 0.4 * Math.sin(tempo * (e.estado === 'prep' ? 22 : 7))); ctx.fillStyle = '#ff5a3a'; ctx.beginPath(); ctx.moveTo(x - l * 5 * ex, y); ctx.lineTo(x + l * 3 * ex, y - 7 * ey); ctx.lineTo(x + l * 1 * ex, y); ctx.lineTo(x + l * 3 * ex, y + 7 * ey); ctx.fill();
    }
    ctx.globalAlpha = 1; if (D.vivo && dt > 0) D.vivo.sons(dt);
  };
})();
