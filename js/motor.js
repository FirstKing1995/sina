/* SINA 2D · regras. Física de plataforma, combate, magias, inimigos, fogueiras, morte e brasas.
   Posições em pixels do mundo; x é o meio do corpo e y é a sola do pé. */
(function () {
  'use strict';
  const J = window.Jogo = {};
  const F = window.Fase, C = window.Conteudo, Hr = window.Heroi, T = F.T;
  const som = (n, v, t) => window.Som && Som.tocar(n, v, t);
  const sopro = (n) => window.Som && Som.sopro && Som.sopro(n);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  const G = 1500, QUEDA = 560, PULO = 462, CORRE = 120;
  J.ent = { esq: 0, dir: 0, cima: 0, baixo: 0, pula: 0, forte: 0 };
  J.ja = {}; // botões apertados neste quadro
  J.aperta = (a) => { J.ja[a] = 0.14; }; // fica guardado um instante (pulo e golpe "antecipados")
  const usa = (a) => { if (J.ja[a] > 0) { J.ja[a] = 0; return true; } return false; };

  // ---------- colisão com a grade ----------
  const solido = (px, py) => F.tile(Math.floor(px / T), Math.floor(py / T)) === 1;
  const tipoEm = (px, py) => F.tile(Math.floor(px / T), Math.floor(py / T));
  J.solido = solido;
  function mover(e, dt) {
    const passos = Math.max(1, Math.ceil(Math.max(Math.abs(e.vx), Math.abs(e.vy)) * dt / 6));
    const d = dt / passos;
    e.noChao = false; e.naParede = 0;
    for (let s = 0; s < passos; s++) {
      // horizontal
      let nx = e.x + e.vx * d;
      const lado = e.vx > 0 ? nx + e.w / 2 : nx - e.w / 2;
      if (e.vx !== 0) {
        let bate = false;
        for (let yy = e.y - e.h + 1; yy < e.y - 1; yy += 8) if (solido(lado, yy)) bate = true;
        if (solido(lado, e.y - 2)) bate = true;
        if (bate) {
          const col = Math.floor(lado / T);
          nx = e.vx > 0 ? col * T - e.w / 2 - 0.01 : (col + 1) * T + e.w / 2 + 0.01;
          e.naParede = Math.sign(e.vx); e.vx = 0;
        }
      }
      e.x = nx;
      // vertical
      const vely = e.vy * d, ny = e.y + vely;
      if (e.vy > 0) {
        let pousa = null;
        for (const xx of [e.x - e.w / 2 + 1, e.x, e.x + e.w / 2 - 1]) {
          const tp = tipoEm(xx, ny), topoT = Math.floor(ny / T) * T;
          if (tp === 1 || (tp === 2 && !e.desce && e.y <= topoT + 0.5)) pousa = topoT;
        }
        if (pousa != null) { e.y = pousa; e.vy = 0; e.noChao = true; } else e.y = ny;
      } else {
        let bate = false;
        for (const xx of [e.x - e.w / 2 + 1, e.x + e.w / 2 - 1]) if (solido(xx, ny - e.h)) bate = true;
        if (bate) { e.y = (Math.floor((ny - e.h) / T) + 1) * T + e.h; e.vy = 0; } else e.y = ny;
      }
    }
    // em pé sobre algo? (para não "flutuar" um quadro)
    if (!e.noChao && e.vy >= 0) {
      for (const xx of [e.x - e.w / 2 + 1, e.x + e.w / 2 - 1]) {
        const tp = tipoEm(xx, e.y + 0.5);
        if ((tp === 1 || (tp === 2 && !e.desce)) && Math.abs(e.y - Math.floor((e.y + 0.5) / T) * T) < 0.6) e.noChao = true;
      }
    }
  }
  J.mover = mover;
  const caixa = (e) => ({ x0: e.x - e.w / 2, x1: e.x + e.w / 2, y0: e.y - e.h, y1: e.y });
  const cruza = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  J.caixa = caixa;

  // ---------- efeitos (desenhados em desenho.js) ----------
  J.fx = []; J.textos = []; J.rastro = []; J.magias = []; J.balas = [];
  J.tremor = 0; J.pausa = 0; J.clarao = 0;
  const fx = (o) => { J.fx.push(Object.assign({ vida: 0.5, max: 0.5, vx: 0, vy: 0, grav: 0, tam: 2, cor: '#fff' }, o)); };
  J.faiscas = function (x, y, n, cor, forca, tipo) {
    for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), v = rnd(40, 160) * (forca || 1), vida = rnd(0.2, 0.5); fx({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, grav: 400, vida, max: vida, cor, tam: rnd(1, 2.5), tipo: tipo || 'faisca' }); }
  };
  const sangue = (x, y, dir, n, cor) => { for (let i = 0; i < n; i++) { const vida = rnd(0.3, 0.7); fx({ x, y, vx: dir * rnd(30, 170) + rnd(-30, 30), vy: rnd(-160, -20), grav: 700, vida, max: vida, cor: cor || '#8a1a1a', tam: rnd(1, 2.6), tipo: 'gota' }); } };
  const texto = (x, y, t, cor, grande) => J.textos.push({ x, y, t: String(t), cor: cor || '#fff', vida: 0.9, max: 0.9, grande });
  J.anel = (x, y, raio, cor, vida, larg) => fx({ x, y, tipo: 'anel', raio, cor, vida: vida || 0.4, max: vida || 0.4, larg: larg || 2 });
  const treme = (k) => { J.tremor = Math.max(J.tremor, k); };

  // ---------- o herói ----------
  J.save = null;
  J.novoSave = (ficha) => ({ ficha, niv: { vida: 0, vigor: 0, forca: 0, sina: 0 }, brasas: 0, fogueira: null, acesas: {}, abertos: {}, chefes: {}, perdidas: null, cabacaExtra: 0, conversou: {}, armas: [Hr.armaInicial(ficha)], arma: Hr.armaInicial(ficha), forja: {}, pedras: 0, comprou: {} });
  J.fichaDe = (s) => { if (!s.armas) { s.armas = [Hr.armaInicial(s.ficha)]; s.arma = s.armas[0]; s.forja = {}; s.pedras = 0; s.comprou = {}; } return Hr.ficha(s.ficha, s.niv, { arma: s.arma, forja: s.forja }); };
  const grande = (tp) => !!(tp.chefe || tp.mini);
  J.criarHeroi = function () {
    const s = J.save, f = J.fichaDe(s);
    const fg = F.FOGUEIRAS.find((x) => x.id === s.fogueira);
    const p = fg ? { x: fg.x + 20, y: fg.y } : F.INICIO;
    J.heroi = { x: p.x, y: p.y, vx: 0, vy: 0, w: 12, h: 30, dir: 1, noChao: true, coyote: 0, estado: fg ? 'livre' : 'acorda', t: 0, combo: 0, fila: 0,
      ficha: f, hp: f.vida, vigor: f.vigor, sina: fg ? f.sina * 0.5 : 0, cabaca: f.cabaca + s.cabacaExtra, inv: 0, semVigor: 0, espera: {}, guarda: 0, passo: 0,
      arDash: true, carga: 0, andou: 0, amassa: 0, ultimoSeguro: { x: p.x, y: p.y }, acertou: new Set(), dirGolpe: 'frente', desce: false };
  };
  J.recalcular = function () { const h = J.heroi; const f = J.fichaDe(J.save); h.ficha = f; h.hp = Math.min(h.hp, f.vida); h.vigor = Math.min(h.vigor, f.vigor); };

  // ---------- inimigos ----------
  J.inimigos = [];
  J.povoar = function () {
    J.inimigos = [];
    for (const i of F.INIMIGOS) {
      const tp = C.TIPOS[i.t];
      if (grande(tp) && J.save.chefes[i.t]) continue;
      J.inimigos.push({ tipo: i.t, T: tp, x: i.x, y: i.y, ox: i.x, oy: i.y, vx: 0, vy: 0, w: tp.w, h: tp.h, dir: -1, hp: tp.hp, hpMax: tp.hp,
        estado: 'vaga', t: rnd(0, 2), firmeza: tp.firme, flash: 0, andou: rnd(0, 50), seguidos: 0, noChao: true, vivo: true, fase: 1, uivos: 0, alvoY: i.y, acertou: false, pisca: 0 });
    }
    J.balas = []; J.magias = [];
    F.fecharArena(false); J.chefeAtivo = null;
  };

  // ---------- dano ----------
  J.feriHeroi = function (dano, dex, quem) {
    const h = J.heroi;
    if (!h || h.estado === 'morto' || h.inv > 0 || (h.estado === 'rola' && h.t < 0.26)) return false;
    let d = dano * (1 - h.ficha.def);
    if (h.guarda > 0) { d *= 0.4; J.faiscas(h.x, h.y - 18, 10, '#bfe0ff', 1); som('quebra', 0.4, 1.4); }
    d = Math.round(d);
    h.hp -= d; h.inv = 0.7; J.pausa = 0.07; treme(5); J.clarao = 0.25;
    texto(h.x, h.y - 36, d, '#ff6a5a');
    sangue(h.x, h.y - 18, Math.sign(h.x - (dex == null ? h.x - h.dir : dex)) || 1, 8);
    som('dor', 0.8);
    if (h.hp <= 0) { h.hp = 0; J.morrer(quem); return true; }
    if (h.guarda <= 0) {
      h.estado = 'dor'; h.t = 0; h.carga = 0;
      const lado = Math.sign(h.x - (dex == null ? h.x - h.dir : dex)) || -h.dir;
      h.vx = lado * 160; h.vy = -180;
    }
    return true;
  };
  function feriInimigo(e, dano, dir, o) {
    if (!e.vivo || e.estado === 'morto') return false;
    o = o || {};
    const h = J.heroi;
    let d = dano;
    const aberto = e.estado === 'recua' || e.estado === 'golpe';
    if (aberto) d *= 1.6;
    d = Math.round(d * rnd(0.92, 1.08));
    e.hp -= d; e.flash = 0.12;
    const forte = o.forte || aberto;
    texto(e.x + rnd(-6, 6), e.y - e.h - 6, d, aberto ? '#ffd27a' : forte ? '#ffe9b0' : '#ffffff', forte);
    J.faiscas(e.x - dir * e.w * 0.3, e.y - e.h * 0.55, forte ? 14 : 8, aberto ? '#ffd27a' : '#fff1c8', forte ? 1.4 : 1);
    sangue(e.x, e.y - e.h * 0.5, dir, forte ? 10 : 5, e.T.voa || ['alma', 'morto', 'morto_forte', 'esqueleto', 'apagado'].includes(e.tipo) ? '#5a4a6a' : '#8a1a1a');
    fx({ tipo: 'corte', x: e.x, y: e.y - e.h * 0.55, vida: 0.16, max: 0.16, dir, tam: forte ? 26 : 18, cor: aberto ? '#ffd27a' : '#ffffff' });
    som('acerto', 0.7, forte ? 0.8 : 1);
    if (!o.magia) h.sina = Math.min(h.ficha.sina, h.sina + (o.forte ? 16 : 10));
    J.pausa = Math.max(J.pausa, forte ? 0.085 : 0.05); treme(forte ? 4 : 2);
    if (e.hp <= 0) { morreInimigo(e, dir); return true; }
    som('inimigoDor', 0.45);
    e.firmeza -= o.quebra || 1;
    const peso = grande(e.T) ? 0.25 : e.T.pesado ? 0.5 : 1;
    if (e.firmeza <= 0 || o.atordoa) {
      e.estado = 'cambaleia'; e.t = 0; e.dur = o.atordoa || 0.55; e.firmeza = e.T.firme;
      e.vx = dir * 120 * peso * (o.empurra || 1);
      if (!e.T.voa && !grande(e.T)) e.vy = -100 * peso;
    } else if (!grande(e.T)) e.vx += dir * 60 * peso * (o.empurra || 1);
    if (e.estado === 'vaga') { e.estado = 'persegue'; e.t = 0; }
    return true;
  }
  J.feriInimigo = feriInimigo;
  function morreInimigo(e, dir) {
    e.estado = 'morto'; e.t = 0; e.vivo = false; e.vx = dir * 80; e.vy = e.T.voa ? 0 : -120;
    som('morte', 0.6);
    J.faiscas(e.x, e.y - e.h / 2, 18, '#e9c47a', 1.2, 'brasa');
    const qtd = Math.round(e.T.brasas * J.heroi.ficha.brasas);
    J.save.brasas += qtd;
    for (let i = 0; i < Math.min(14, 3 + qtd / 10); i++) fx({ tipo: 'alma', x: e.x + rnd(-8, 8), y: e.y - e.h / 2 + rnd(-8, 8), vx: rnd(-60, 60), vy: rnd(-90, -20), vida: rnd(0.8, 1.3), max: 1.3, cor: '#ffcf6a', tam: 2 });
    texto(e.x, e.y - e.h - 16, '+' + qtd, '#e9c47a');
    if (grande(e.T)) J.venceuChefe(e);
  }

  // ---------- herói: um quadro ----------
  function golpeCaixa(h) {
    const a = h.ficha.arma, alc = a.alcance + (h.estado === 'forte' ? 10 : 0);
    if (h.dirGolpe === 'cima') return { x0: h.x - 18, x1: h.x + 18, y0: h.y - h.h - alc, y1: h.y - h.h + 8 };
    if (h.dirGolpe === 'baixo') return { x0: h.x - 16, x1: h.x + 16, y0: h.y - 6, y1: h.y + alc - 4 };
    return h.dir > 0 ? { x0: h.x, x1: h.x + alc + 6, y0: h.y - h.h / 2 - a.altura / 2 - 4, y1: h.y - h.h / 2 + a.altura / 2 + 4 }
      : { x0: h.x - alc - 6, x1: h.x, y0: h.y - h.h / 2 - a.altura / 2 - 4, y1: h.y - h.h / 2 + a.altura / 2 + 4 };
  }
  J.golpeCaixa = golpeCaixa;
  const gasta = (h, v) => { h.vigor -= v; h.semVigor = 0.7; };

  function comecaGolpe(h) {
    const a = h.ficha.arma;
    if (h.vigor <= 0) { texto(h.x, h.y - 40, 'sem vigor', '#9fc49a'); return; }
    h.estado = 'golpe'; h.t = 0; h.acertou = new Set(); h.fila = 0; h.investida = false;
    h.combo = h.combo >= 3 ? 1 : h.combo + 1;
    h.dirGolpe = J.ent.cima ? 'cima' : J.ent.baixo && !h.noChao ? 'baixo' : 'frente';
    if (h.dirGolpe !== 'frente') h.combo = 1;
    h.dur = a.tempo * (h.combo === 3 ? 1.25 : 1);
    gasta(h, a.custo * (h.combo === 3 ? 1.3 : 1));
    if (h.noChao && h.dirGolpe === 'frente') h.vx = h.dir * (h.combo === 3 ? 170 : 90);
    som('golpe', 0.55, h.combo === 3 ? 0.85 : 1 + h.combo * 0.06);
  }
  function soltaForte(h) {
    const k = clamp(h.carga / 0.9, 0, 1);
    h.estado = 'forte'; h.t = 0; h.acertou = new Set(); h.dur = 0.42; h.forcaCarga = k; h.dirGolpe = 'frente';
    gasta(h, 24 + k * 10);
    h.vx = h.dir * (140 + 160 * k);
    som('forte', 0.8, 1 - k * 0.2);
    if (k > 0.95) { treme(3); J.anel(h.x + h.dir * 20, h.y - 16, 30, '#ffe2a0', 0.3, 3); }
  }

  function lancaMagia(h, qual) {
    const id = h.ficha.magias[qual], M = Hr.MAGIAS[id];
    if (!M || (h.espera[id] || 0) > 0) return;
    if (h.sina < M.custo) { texto(h.x, h.y - 42, 'falta Sina', '#ffb070'); return; }
    h.sina -= M.custo; h.espera[id] = M.espera;
    h.estado = 'magia'; h.t = 0; h.dur = 0.36; h.magia = id; h.magiaFeita = false;
    if (h.noChao) h.vx = 0; else h.vy = Math.min(h.vy, -40);
    sopro('sina');
  }
  function soltaMagia(h) {
    const id = h.magia, M = Hr.MAGIAS[id], k = h.ficha.magia, d = h.dir;
    const mx = h.x + d * 14, my = h.y - 18;
    J.anel(h.x, h.y - 16, 22, M.cor, 0.35, 2);
    fx({ tipo: 'circulo', x: h.x, y: h.y, vida: 0.6, max: 0.6, cor: M.cor, tam: 26 });
    if (id === 'seta') {
      J.balas.push({ dono: 'h', tipo: 'brasa', x: mx, y: my, vx: d * 330, vy: 0, r: 6, dano: 34 * k, vida: 1.4, cor: M.cor, explode: 26 });
      som('fogo', 0.7);
    } else if (id === 'coluna') {
      // procura o chão à frente
      let cx = h.x + d * 56, cy = h.y;
      for (let yy = h.y - 40; yy < h.y + 120; yy += 4) if (solido(cx, yy)) { cy = Math.floor(yy / T) * T; break; }
      J.magias.push({ tipo: 'coluna', x: cx, y: cy, t: 0, dur: 0.9, dano: 26 * k, bate: 0.18, ultimo: {}, cor: M.cor, w: 30, h: 110 });
      som('fogo', 0.9, 0.8);
    } else if (id === 'guarda') {
      h.guarda = 5; som('magia', 0.6, 0.8); J.faiscas(h.x, h.y - 16, 16, '#bfe0ff', 1);
    } else if (id === 'tremor') {
      if (!h.noChao) { h.vy = 520; h.tremorNoAr = true; return; }
      ondas(h);
    } else if (id === 'passo') {
      h.passo = 6; som('magia', 0.6, 1.3); J.faiscas(h.x, h.y - 10, 16, M.cor, 1);
    } else if (id === 'lancas') {
      for (const a of [-0.16, 0, 0.16]) J.balas.push({ dono: 'h', tipo: 'lanca', x: mx, y: my - 4, vx: d * 380 * Math.cos(a), vy: 380 * Math.sin(a) - 10, r: 5, dano: 20 * k, vida: 0.9, cor: M.cor, fura: true, ja: new Set() });
      som('magia', 0.7, 1.2);
    } else if (id === 'folego') {
      h.vigor = h.ficha.vigor; const cura = Math.round(h.ficha.vida * 0.33); h.hp = Math.min(h.ficha.vida, h.hp + cura);
      texto(h.x, h.y - 40, '+' + cura, '#9cff8a'); som('beber', 0.6, 1.2);
      for (let i = 0; i < 20; i++) fx({ tipo: 'alma', x: h.x + rnd(-14, 14), y: h.y - rnd(0, 30), vx: 0, vy: rnd(-60, -20), vida: 0.9, max: 0.9, cor: '#ffe39a', tam: 2 });
    } else if (id === 'lampejo') {
      J.magias.push({ tipo: 'lampejo', x: h.x, y: h.y - 16, t: 0, dur: 0.5, dano: 30 * k, raio: 70, feito: false, cor: M.cor });
      J.clarao = 0.5; treme(3); som('magia', 0.9, 0.7);
    }
  }
  function ondas(h) {
    treme(6); som('quebra', 0.8, 0.7);
    for (const d of [-1, 1]) J.magias.push({ tipo: 'onda', x: h.x, y: h.y, d, t: 0, dur: 0.7, dano: 24 * h.ficha.magia, ja: new Set(), cor: '#d8b070' });
    J.faiscas(h.x, h.y - 2, 20, '#a08060', 1.3, 'pedra');
  }

  function passoHeroi(dt) {
    const h = J.heroi, e = J.ent, f = h.ficha;
    h.t += dt; h.inv = Math.max(0, h.inv - dt); h.guarda = Math.max(0, h.guarda - dt); h.passo = Math.max(0, h.passo - dt);
    for (const k in h.espera) h.espera[k] = Math.max(0, h.espera[k] - dt);
    h.amassa = Math.max(0, h.amassa - dt * 5);
    // vigor volta depois de um descanso
    h.semVigor -= dt;
    if (h.semVigor <= 0 && !['golpe', 'forte', 'rola', 'carga'].includes(h.estado)) h.vigor = Math.min(f.vigor, h.vigor + 52 * dt);
    if (h.estado === 'morto') { h.vy = Math.min(QUEDA, h.vy + G * dt); h.vx *= 0.9; mover(h, dt); return; }
    if (h.estado === 'acorda') { if (h.t > 1.6) { h.estado = 'livre'; J.mostraArea(F.regiao(h.x)); } return; }

    const eixo = (e.dir ? 1 : 0) - (e.esq ? 1 : 0);
    const vel = CORRE * f.vel * (h.passo > 0 ? 1.35 : 1);
    const livre = h.estado === 'livre';
    // pulo guardado e "tempo de coiote"
    h.coyote = h.noChao ? 0.1 : h.coyote - dt;
    if (h.noChao) { h.arDash = true; if (tipoEm(h.x, h.y + 2) === 1 && !tipoEmBuraco(h)) h.ultimoSeguro = { x: h.x, y: h.y }; }

    if (livre || h.estado === 'beber') {
      const alvo = eixo * vel * (h.estado === 'beber' ? 0.3 : 1);
      const ac = h.noChao ? 1500 : 1000;
      if (alvo > h.vx) h.vx = Math.min(alvo, h.vx + ac * dt); else h.vx = Math.max(alvo, h.vx - ac * dt);
      if (eixo && livre) h.dir = eixo;
    } else if (h.estado === 'golpe' || h.estado === 'magia') {
      if (h.noChao) h.vx *= Math.pow(h.investida ? 0.02 : 0.0005, dt); else { const alvo = eixo * vel * 0.8; h.vx += (alvo - h.vx) * Math.min(1, dt * 8); }
    } else if (h.estado === 'forte') h.vx *= Math.pow(0.002, dt);
    else if (h.estado === 'carga') h.vx *= Math.pow(0.0001, dt);
    else if (h.estado === 'dor') h.vx *= Math.pow(0.05, dt);

    // pular (também cancela o fim de um golpe)
    const podePular = livre || (h.estado === 'golpe' && h.t > h.dur * 0.6);
    if (podePular && J.ja.pula > 0) {
      if (e.baixo && h.noChao && tipoEm(h.x, h.y + 2) === 2) { h.desce = true; h.y += 2; h.noChao = false; J.ja.pula = 0; h.desceT = 0.25; }
      else if (h.coyote > 0) {
        J.ja.pula = 0; h.vy = -PULO * f.pulo; h.coyote = 0; h.noChao = false; if (h.estado !== 'livre') h.estado = 'livre';
        sopro('pulo'); J.faiscas(h.x, h.y, 5, '#a89a80', 0.4, 'poeira');
      }
    }
    if (h.desceT > 0) { h.desceT -= dt; if (h.desceT <= 0) h.desce = false; }
    if (!e.pula && h.vy < -120 && h.estado === 'livre') h.vy *= Math.pow(0.0008, dt); // soltar cedo = pulo curto

    // esquiva: rolamento no chão, avanço no ar (uma vez por pulo)
    const podeRolar = livre || h.estado === 'beber' || (h.estado === 'golpe' && h.t > h.dur * 0.45) || h.estado === 'magia' && h.t > 0.25;
    if (podeRolar && usa('rola') && (h.noChao || h.arDash) && (h.vigor > 0 || h.passo > 0)) {
      if (!h.noChao) h.arDash = false;
      if (eixo) h.dir = eixo;
      h.estado = 'rola'; h.t = 0; h.noAr = !h.noChao;
      if (h.passo <= 0) gasta(h, f.rola);
      sopro('esquiva');
    }
    if (h.estado === 'rola') {
      const k = h.t / 0.34;
      h.vx = h.dir * (h.noAr ? 300 : 270) * (k < 0.75 ? 1 : 0.5);
      if (h.noAr) h.vy = Math.min(h.vy, 30);
      if ((h.t * 60 | 0) % 2 === 0) J.rastro.push({ x: h.x, y: h.y, dir: h.dir, rot: h.noAr ? 0 : k * Math.PI * 2 * h.dir, vida: 0.22, max: 0.22, noAr: h.noAr, cor: h.passo > 0 ? '#9cff8a' : h.ficha.cor });
      if (h.t > 0.34) { h.estado = 'livre'; h.t = 0; }
    }
    if (h.passo > 0 && Math.abs(h.vx) > 60 && Math.random() < 0.4) J.rastro.push({ x: h.x, y: h.y, dir: h.dir, vida: 0.18, max: 0.18, cor: '#9cff8a', anda: true });

    // golpes
    // investida: golpear no meio da esquiva vira uma estocada forte
    if (h.estado === 'rola' && h.t > 0.1 && !h.noAr && J.ja.golpe > 0 && h.vigor > 0) {
      J.ja.golpe = 0; h.combo = 2; comecaGolpe(h); h.investida = true; h.dirGolpe = 'frente'; h.dur = h.ficha.arma.tempo * 1.2; h.vx = h.dir * 260;
      J.rastro.push({ x: h.x, y: h.y, dir: h.dir, vida: 0.25, max: 0.25, cor: '#ffe2a0', anda: true });
    }
    const podeGolpe = livre || (h.estado === 'golpe' && h.t > h.dur * 0.55);
    if (h.estado === 'golpe' && h.t > h.dur * 0.3 && J.ja.golpe > 0 && h.combo < 3) { h.fila = 1; J.ja.golpe = 0; }
    if (podeGolpe && (usa('golpe') || (h.estado === 'golpe' && h.fila))) {
      if (h.estado === 'livre') h.combo = 0;
      comecaGolpe(h);
    }
    if (h.estado === 'livre' && e.forte && h.vigor > 0 && h.noChao && !J.ja.golpe) { h.estado = 'carga'; h.t = 0; h.carga = 0; sopro('carga'); }
    if (h.estado === 'carga') {
      h.carga += dt;
      if (h.carga > 0.9 && !h.cheia) { h.cheia = true; J.anel(h.x, h.y - 16, 26, '#ffe2a0', 0.3, 2); som('magia', 0.35, 1.6); }
      if (Math.random() < 0.5) fx({ tipo: 'alma', x: h.x + rnd(-20, 20), y: h.y - rnd(0, 34), vx: 0, vy: 0, alvo: true, vida: 0.4, max: 0.4, cor: h.cheia ? '#ffe2a0' : '#c9a45a', tam: 1.5 });
      if (eixo) h.dir = eixo;
      if (!e.forte) { h.cheia = false; soltaForte(h); }
    }
    if ((h.estado === 'golpe' || h.estado === 'forte') && h.t > h.dur) { h.estado = 'livre'; h.t = 0; }
    if (h.estado === 'golpe' || h.estado === 'forte') {
      const k = h.t / h.dur;
      if (k > 0.2 && k < 0.65) acertaComGolpe(h);
    }
    // magia
    if ((h.estado === 'livre' || (h.estado === 'golpe' && h.t > h.dur * 0.5)) && (usa('magia1') ? (lancaMagia(h, 0), 1) : usa('magia2') ? (lancaMagia(h, 1), 1) : 0)) { /* feito */ }
    if (h.estado === 'magia') { if (!h.magiaFeita && h.t > 0.12) { h.magiaFeita = true; soltaMagia(h); } if (h.t > h.dur) { h.estado = 'livre'; h.t = 0; } }
    // beber
    if (h.estado === 'livre' && usa('bebe')) {
      if (h.cabaca > 0) { h.estado = 'beber'; h.t = 0; h.bebeu = false; som('beber', 0.7); } else texto(h.x, h.y - 40, 'cabaça vazia', '#c9bfa2');
    }
    if (h.estado === 'beber') {
      if (!h.bebeu && h.t > 0.45) { h.bebeu = true; h.cabaca--; const c = Math.round(h.ficha.vida * 0.42); h.hp = Math.min(h.ficha.vida, h.hp + c); texto(h.x, h.y - 40, '+' + c, '#9cff8a'); for (let i = 0; i < 12; i++) fx({ tipo: 'alma', x: h.x + rnd(-10, 10), y: h.y - rnd(0, 28), vy: rnd(-50, -20), vida: 0.7, max: 0.7, cor: '#9cff8a', tam: 1.6 }); }
      if (h.t > 0.8) { h.estado = 'livre'; h.t = 0; }
    }
    if (h.estado === 'dor' && h.t > 0.32) { h.estado = 'livre'; h.t = 0; }

    // gravidade e movimento
    const noAr = !h.noChao;
    if (!(h.estado === 'rola' && h.noAr)) h.vy = Math.min(QUEDA, h.vy + G * dt * (h.vy > 0 ? 1.15 : 1));
    if (h.estado === 'magia' && h.noAr) h.vy = Math.min(h.vy, 60);
    const vyAntes = h.vy;
    mover(h, dt);
    if (noAr && h.noChao) {
      h.amassa = Math.min(1, vyAntes / 500);
      if (vyAntes > 250) { sopro('pouso'); J.faiscas(h.x, h.y, 6, '#8a7c66', 0.5, 'poeira'); }
      if (h.tremorNoAr) { h.tremorNoAr = false; ondas(h); }
    }
    if (h.naParede && h.estado === 'rola') { h.estado = 'livre'; }
    // poeira dos passos
    h.passoT = (h.passoT || 0) - dt;
    if (h.noChao && Math.abs(h.vx) > 70 && h.passoT <= 0 && h.estado === 'livre') {
      h.passoT = 0.28; const r = F.regiao(h.x);
      fx({ tipo: 'poeira', x: h.x - h.dir * 4, y: h.y - 1, vx: -h.dir * rnd(10, 30), vy: rnd(-14, -4), vida: 0.4, max: 0.4, cor: r.id === 'clareira' ? '#4a4048' : r.id === 'mata' ? '#3a4a30' : '#6a5c48', tam: rnd(1.5, 2.5) });
    }
    // espinhos
    if (tipoEm(h.x, h.y - 2) === 3 || tipoEm(h.x, h.y + 1) === 3) {
      J.feriHeroi(30, h.x, 'espinhos');
      if (h.estado !== 'morto') {
        const s = h.ultimoSeguro; h.x = s.x; h.y = s.y; h.vx = 0; h.vy = 0; h.estado = 'livre'; h.inv = 1.1; J.clarao = 0.4;
        J.faiscas(h.x, h.y - 16, 12, '#c9a45a', 0.8, 'brasa');
      }
    }
  }
  function tipoEmBuraco(h) { for (const dx of [-24, 24]) if (tipoEm(h.x + dx, h.y + 2) === 3 || tipoEm(h.x + dx, h.y - 2) === 3) return true; return false; }

  function acertaComGolpe(h) {
    const cx = golpeCaixa(h), a = h.ficha.arma;
    let mult = h.estado === 'forte' ? 1.7 + (h.forcaCarga || 0) * 1.3 : h.investida ? 1.5 : h.combo === 3 ? 1.35 : 1;
    if (h.dirGolpe === 'baixo') mult *= 1.1;
    for (const e of J.inimigos) {
      if (!e.vivo || h.acertou.has(e)) continue;
      if (!cruza(cx, caixa(e))) continue;
      h.acertou.add(e);
      const forte = h.estado === 'forte';
      feriInimigo(e, h.ficha.dano * mult, h.dir, { forte: forte || h.combo === 3, quebra: (forte ? 2 + Math.round(h.forcaCarga * 2) : 1) + (h.ficha.arma.id === 'machado' ? 1 : 0), empurra: forte ? 2 : 1 });
      if (h.dirGolpe === 'baixo') { h.vy = -400; h.arDash = true; h.estado = 'livre'; J.anel(h.x, h.y + 6, 16, '#fff1c8', 0.25, 2); }
    }
    // golpe para baixo também quica em espinho
    if (h.dirGolpe === 'baixo' && !h.acertou.has('chao') && (tipoEm(h.x, cx.y1) === 3)) { h.acertou.add('chao'); h.vy = -380; h.arDash = true; J.faiscas(h.x, h.y + 10, 8, '#fff', 0.8); som('quebra', 0.4, 1.6); }
    // balas inimigas podem ser rebatidas
    for (const b of J.balas) if (b.dono === 'i' && cruza(cx, { x0: b.x - b.r, x1: b.x + b.r, y0: b.y - b.r, y1: b.y + b.r })) {
      b.dono = 'h'; b.vx = -b.vx * 1.3; b.vy = -b.vy; b.dano *= 1.5; b.cor = '#ffe2a0'; J.faiscas(b.x, b.y, 10, '#ffe2a0', 1); som('quebra', 0.5, 1.5); J.pausa = 0.05;
    }
  }

  // ---------- inimigos: um quadro ----------
  function veHeroi(e) {
    const h = J.heroi; if (!h || h.estado === 'morto') return false;
    const dx = h.x - e.x, dy = h.y - e.y;
    return Math.abs(dx) < e.T.visao && Math.abs(dy) < (e.T.voa ? 140 : 90);
  }
  function chaoAFrente(e, d) {
    const px = e.x + d * (e.w / 2 + 3);
    const tp = tipoEm(px, e.y + 3), tp2 = tipoEm(px, e.y + T + 3);
    if (solido(px, e.y - 6)) return false; // parede
    return (tp === 1 || tp === 2 || tp2 === 1 || tp2 === 2) && tipoEm(px, e.y - 2) !== 3 && tp !== 3;
  }
  function passoInimigo(e, dt) {
    const tp = e.T, h = J.heroi;
    e.t += dt; e.flash = Math.max(0, e.flash - dt); e.pisca = Math.max(0, e.pisca - dt);
    if (e.estado === 'morto') {
      if (!tp.voa) e.vy = Math.min(QUEDA, e.vy + G * dt); else e.vy += 200 * dt;
      e.vx *= Math.pow(0.05, dt); mover(e, dt);
      return;
    }
    const dx = h.x - e.x, dist = Math.abs(dx), lado = Math.sign(dx) || 1;
    const fase2 = grande(tp) && e.hp < e.hpMax * 0.5;
    const vel = tp.vel * (fase2 ? 1.2 : 1);
    const prep = tp.prep * (fase2 ? 0.8 : 1);
    // chefe: uiva em 66% e 33% chamando a matilha
    if (tp.poder === 'uivo' && e.estado !== 'uiva' && ((e.uivos === 0 && e.hp < e.hpMax * 0.66) || (e.uivos === 1 && e.hp < e.hpMax * 0.33))) {
      e.uivos++; e.estado = 'uiva'; e.t = 0; e.vx = 0; som('uivo', 1); treme(8);
    }
    if (tp.poder === 'bando' && !e.chamou && e.hp < e.hpMax * 0.5 && e.estado !== 'morto') { e.chamou = true; e.estado = 'chama'; e.t = 0; som('rugido', 0.8, 1.3); }
    switch (e.estado) {
      case 'vaga': {
        if (tp.voa) { e.vx = Math.cos(e.t * 0.8) * 30; e.vy = Math.sin(e.t * 2.1) * 20; }
        else {
          const alvo = e.ox + Math.sin(e.t * 0.5 + e.ox) * 40;
          const d = Math.sign(alvo - e.x);
          if (Math.abs(alvo - e.x) > 4 && chaoAFrente(e, d)) { e.vx = d * vel * 0.35; e.dir = d; } else e.vx = 0;
        }
        if (veHeroi(e) && (!tp.chefe || h.x > F.ARENA.x0 + 48)) { e.estado = 'persegue'; e.t = 0; e.pisca = 0.5; if (grande(tp)) J.acordaChefe(e); }
        break;
      }
      case 'persegue': {
        e.dir = lado;
        if (!veHeroi(e) && e.t > 3 && !tp.chefe) { e.estado = 'volta'; e.t = 0; if (J.chefeAtivo === e) J.soltaChefe(); break; }
        if (tp.voa) {
          const ax = h.x - lado * (tp.atira ? tp.distancia : 34), ay = h.y - 46 + Math.sin(e.t * 3) * 10;
          e.vx += (Math.sign(ax - e.x) * vel - e.vx) * Math.min(1, dt * 3);
          e.vy += (clamp((ay - e.y) * 3, -vel, vel) - e.vy) * Math.min(1, dt * 3);
          if (Math.abs(h.x - e.x) < tp.alcance + 10 && e.t > 0.6) { e.estado = 'prep'; e.t = 0; }
        } else if (tp.atira) {
          const quer = dist < tp.distancia * 0.7 ? -lado : dist > tp.alcance * 0.8 ? lado : 0;
          e.vx = quer && chaoAFrente(e, quer) ? quer * vel : 0;
          if (dist < tp.alcance && e.t > 0.5) { e.estado = 'prep'; e.t = 0; }
        } else {
          if (tp.poder === 'uivo' && dist > 150 && e.t > 1.2 && e.noChao) { e.estado = 'salto'; e.t = 0; e.vx = 0; break; }
          const perto = dist < tp.alcance * 0.8;
          e.vx = !perto && chaoAFrente(e, lado) ? lado * vel : 0;
          if (dist < tp.alcance + 4 && Math.abs(h.y - e.y) < 40 && e.t > 0.25) { e.estado = 'prep'; e.t = 0; e.seguidos = 0; }
        }
        break;
      }
      case 'volta': {
        const d = Math.sign(e.ox - e.x);
        if (tp.voa) { e.vx = d * vel * 0.6; e.vy = clamp((e.oy - e.y), -40, 40); } else e.vx = chaoAFrente(e, d) ? d * vel * 0.6 : 0;
        e.dir = d || e.dir;
        if (Math.abs(e.ox - e.x) < 8 || e.t > 5) { e.estado = 'vaga'; e.t = 0; }
        if (veHeroi(e) && e.t > 0.6) { e.estado = 'persegue'; e.t = 0; }
        break;
      }
      case 'prep': {
        e.vx *= Math.pow(0.001, dt); if (tp.voa) e.vy *= Math.pow(0.01, dt);
        if (e.t < prep * 0.7) e.dir = lado;
        if (e.t > prep) {
          e.estado = 'golpe'; e.t = 0; e.acertou = false;
          if (tp.atira) atira(e);
          else if (tp.salta) { e.vx = e.dir * Math.max(200, vel * 2.6); if (!tp.voa) e.vy = -200; else e.vy = clamp((h.y - 14 - e.y) * 3, -200, 260); som('mordida', 0.5); }
          else { e.vx = e.dir * 70; som('golpe', 0.45, 0.8); }
        }
        break;
      }
      case 'golpe': {
        if (!tp.atira) {
          const box = tp.salta ? caixa(e) : (e.dir > 0 ? { x0: e.x, x1: e.x + tp.alcance + 6, y0: e.y - e.h, y1: e.y } : { x0: e.x - tp.alcance - 6, x1: e.x, y0: e.y - e.h, y1: e.y });
          if (tp.salta) { box.x0 -= 4; box.x1 += 4; }
          if (!e.acertou && e.t > tp.golpe * 0.25 && cruza(box, caixa(h))) { e.acertou = true; J.feriHeroi(tp.dano * (fase2 ? 1.15 : 1), e.x, e.tipo); }
          if (!tp.salta) e.vx *= Math.pow(0.01, dt);
        }
        const dur = tp.salta ? Math.max(tp.golpe, 0.32) : tp.golpe;
        if (e.t > dur && (e.noChao || tp.voa)) {
          e.seguidos++;
          if (tp.seguidos && e.seguidos < tp.seguidos && dist < tp.alcance * 1.6) { e.estado = 'prep'; e.t = prep * 0.45; e.dir = lado; }
          else { e.estado = 'recua'; e.t = 0; e.seguidos = 0; }
        }
        break;
      }
      case 'recua': {
        e.vx *= Math.pow(0.002, dt);
        if (tp.voa) { e.vy += (-60 - e.vy) * Math.min(1, dt * 3); e.vx = -lado * 30; }
        if (e.t > tp.recua * (fase2 ? 0.75 : 1)) { e.estado = 'persegue'; e.t = 0; }
        break;
      }
      case 'cambaleia': {
        e.vx *= Math.pow(0.02, dt); if (tp.voa) e.vy *= Math.pow(0.05, dt);
        if (e.t > e.dur) { e.estado = 'persegue'; e.t = 0; }
        break;
      }
      case 'chama': { // Zé grita e o bando aparece dos lados
        e.vx = 0;
        if (e.t > 0.35 && e.t - dt <= 0.35) {
          J.anel(e.x, e.y - 30, 60, '#ffb070', 0.5, 3); treme(5);
          for (const s of [-1, 1]) {
            const x = e.x + s * 150, tp2 = C.TIPOS.bandido;
            if (solido(x, e.y - 10)) continue;
            J.inimigos.push({ tipo: 'bandido', T: tp2, x, y: e.y - 40, ox: x, oy: e.y, vx: 0, vy: 0, w: tp2.w, h: tp2.h, dir: -s, hp: tp2.hp, hpMax: tp2.hp, estado: 'persegue', t: 0, firmeza: 1, flash: 0, andou: 0, seguidos: 0, vivo: true, chamado: true, acertou: false, pisca: 0.6 });
          }
        }
        if (e.t > 1) { e.estado = 'persegue'; e.t = 0; }
        break;
      }
      case 'uiva': {
        e.vx = 0;
        if (e.t > 0.4 && e.t - dt <= 0.4) {
          J.anel(e.x, e.y - 40, 80, '#c0a0ff', 0.6, 3); J.anel(e.x, e.y - 40, 130, '#8060c0', 0.8, 2);
          for (const s of [-1, 1]) {
            const x = clamp(e.x + s * 140, F.ARENA.x0 + 30, F.ARENA.x1 - 30);
            const tp2 = C.TIPOS.lobo;
            J.inimigos.push({ tipo: 'lobo', T: tp2, x, y: F.ARENA.pisoY * T - 60, ox: x, oy: F.ARENA.pisoY * T, vx: 0, vy: 0, w: tp2.w, h: tp2.h, dir: -s, hp: tp2.hp, hpMax: tp2.hp, estado: 'persegue', t: 0, firmeza: 1, flash: 0, andou: 0, seguidos: 0, vivo: true, chamado: true, acertou: false, pisca: 0.6 });
          }
        }
        if (e.t > 1.3) { e.estado = 'persegue'; e.t = 0; }
        break;
      }
      case 'salto': { // o chefe agacha, pula alto e cai em cima de onde você estava
        if (e.t < 0.45) { e.vx = 0; e.dir = lado; }
        else if (!e.pulou) { e.pulou = true; e.alvoX = h.x; e.vy = -560; e.vx = clamp((h.x - e.x) / 0.75, -380, 380); som('rugido', 0.7); }
        else if (e.noChao && e.t > 0.6) {
          e.pulou = false; treme(9); som('quebra', 0.9, 0.6);
          J.faiscas(e.x, e.y, 24, '#8a7c66', 1.4, 'pedra');
          for (const d of [-1, 1]) J.magias.push({ tipo: 'onda', inimiga: true, x: e.x, y: e.y, d, t: 0, dur: 0.6, dano: tp.dano * 0.8, ja: new Set(), cor: '#a080c0' });
          e.estado = 'recua'; e.t = 0;
        }
        break;
      }
    }
    // física
    if (!tp.voa) e.vy = Math.min(QUEDA, e.vy + G * dt);
    const antes = e.x;
    mover(e, dt);
    e.andou += Math.abs(e.x - antes);
    if (e.chamado === undefined && !grande(tp) && !tp.voa && tipoEm(e.x, e.y - 2) === 3) feriInimigoSilencioso(e);
  }
  function feriInimigoSilencioso(e) { e.hp = 0; e.estado = 'morto'; e.vivo = false; }
  function atira(e) {
    const h = J.heroi, ox = e.x + e.dir * 10, oy = e.y - e.h * 0.6;
    const ang = Math.atan2(h.y - 16 - oy, h.x - ox), v = 190;
    J.balas.push({ dono: 'i', tipo: 'sombra', x: ox, y: oy, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, r: 5, dano: e.T.dano, vida: 2.4, cor: e.tipo === 'alma' ? '#8ac8ff' : '#b070ff' });
    som('magia', 0.4, 0.7);
  }

  // ---------- balas e magias ----------
  function passoBalas(dt) {
    const h = J.heroi;
    for (const b of J.balas) {
      b.vida -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (Math.random() < 0.7) fx({ tipo: 'brasa', x: b.x + rnd(-2, 2), y: b.y + rnd(-2, 2), vx: -b.vx * 0.1 + rnd(-10, 10), vy: rnd(-20, 10), vida: 0.35, max: 0.35, cor: b.cor, tam: rnd(1, 2.2) });
      if (solido(b.x, b.y)) { b.vida = 0; estoura(b); continue; }
      const bx = { x0: b.x - b.r, x1: b.x + b.r, y0: b.y - b.r, y1: b.y + b.r };
      if (b.dono === 'h') {
        for (const e of J.inimigos) {
          if (!e.vivo || (b.ja && b.ja.has(e))) continue;
          if (cruza(bx, caixa(e))) {
            feriInimigo(e, b.dano, Math.sign(b.vx) || 1, { magia: true, forte: true });
            if (b.fura) b.ja.add(e); else { b.vida = 0; estoura(b); break; }
          }
        }
      } else if (cruza(bx, caixa(h))) {
        if (J.feriHeroi(b.dano, b.x, 'bala')) { b.vida = 0; estoura(b); }
      }
    }
    J.balas = J.balas.filter((b) => b.vida > 0);
  }
  function estoura(b) {
    J.faiscas(b.x, b.y, 12, b.cor, 1);
    J.anel(b.x, b.y, b.explode || 12, b.cor, 0.25, 2);
    if (b.explode) {
      for (const e of J.inimigos) if (e.vivo && Math.hypot(e.x - b.x, e.y - e.h / 2 - b.y) < b.explode + e.w / 2) feriInimigo(e, b.dano * 0.5, Math.sign(e.x - b.x) || 1, { magia: true });
      treme(2); som('fogo', 0.5, 1.2);
    }
  }
  function passoMagias(dt) {
    const h = J.heroi;
    for (const m of J.magias) {
      m.t += dt;
      if (m.tipo === 'coluna') {
        const box = { x0: m.x - m.w / 2, x1: m.x + m.w / 2, y0: m.y - m.h * Math.min(1, m.t / 0.12), y1: m.y };
        if (Math.random() < 0.9) for (let i = 0; i < 2; i++) fx({ tipo: 'brasa', x: m.x + rnd(-m.w / 2, m.w / 2), y: m.y - rnd(0, m.h * 0.8), vx: rnd(-20, 20), vy: rnd(-140, -60), vida: 0.5, max: 0.5, cor: Math.random() < 0.5 ? '#ffd27a' : '#ff6a2a', tam: rnd(1, 3) });
        if (m.t < m.dur - 0.15) for (const e of J.inimigos) {
          if (!e.vivo || (m.ultimo[J.inimigos.indexOf(e)] || -1) > m.t - m.bate) continue;
          if (cruza(box, caixa(e))) { m.ultimo[J.inimigos.indexOf(e)] = m.t; feriInimigo(e, m.dano, Math.sign(e.x - m.x) || h.dir, { magia: true, forte: true }); if (!grande(e.T) && e.vivo) e.vy = -160; }
        }
        if (m.t < 0.05) treme(4);
      } else if (m.tipo === 'onda') {
        const k = m.t / m.dur, px = m.x + m.d * k * 190;
        m.px = px;
        if (Math.random() < 0.8) fx({ tipo: 'pedra', x: px + rnd(-4, 4), y: m.y - 2, vx: m.d * rnd(0, 40), vy: rnd(-180, -80), grav: 700, vida: 0.5, max: 0.5, cor: m.inimiga ? '#6a5a80' : '#8a7458', tam: rnd(1.5, 3.5) });
        const box = { x0: px - 10, x1: px + 10, y0: m.y - 26, y1: m.y + 2 };
        if (m.inimiga) { if (!m.ja.has('h') && cruza(box, caixa(h))) { m.ja.add('h'); J.feriHeroi(m.dano, px - m.d * 10, 'onda'); } }
        else for (const e of J.inimigos) if (e.vivo && !m.ja.has(e) && !e.T.voa && cruza(box, caixa(e))) { m.ja.add(e); feriInimigo(e, m.dano, m.d, { magia: true, forte: true, quebra: 3 }); if (!grande(e.T)) e.vy = -220; }
        if (solido(px + m.d * 8, m.y - 8) || !solido(px, m.y + 4)) m.t = m.dur;
      } else if (m.tipo === 'lampejo') {
        if (!m.feito && m.t > 0.06) {
          m.feito = true;
          for (const e of J.inimigos) if (e.vivo && Math.hypot(e.x - m.x, e.y - e.h / 2 - m.y) < m.raio + e.w / 2) feriInimigo(e, m.dano, Math.sign(e.x - m.x) || 1, { magia: true, forte: true, atordoa: grande(e.T) ? 0.6 : 1.6 });
          for (const b of J.balas) if (b.dono === 'i' && Math.hypot(b.x - m.x, b.y - m.y) < m.raio) b.vida = 0;
          J.faiscas(m.x, m.y, 30, '#fff2c0', 2);
        }
      }
    }
    J.magias = J.magias.filter((m) => m.t < m.dur);
  }

  // ---------- chefe ----------
  J.chefeAtivo = null;
  J.acordaChefe = function (e) {
    if (J.chefeAtivo) return;
    J.chefeAtivo = e; if (e.T.chefe) F.fecharArena(true);
    som('rugido', 1); treme(10); if (window.Som) Som.musica('batalha');
    J.aviso && J.aviso('chefe', e);
  };
  J.soltaChefe = function () { J.chefeAtivo = null; if (window.Som) Som.musica(null); };
  J.venceuChefe = function (e) {
    J.save.chefes[e.tipo] = true; F.fecharArena(false); J.chefeAtivo = null;
    if (e.T.deixa && !J.save.armas.includes(e.T.deixa)) { J.save.armas.push(e.T.deixa); texto(e.x, e.y - e.h - 30, Hr.ARMAS[e.T.deixa].nome + '!', '#ffd27a', true); som('raro', 0.8); }
    for (const o of J.inimigos) if (o.chamado && o.vivo) { o.vivo = false; o.estado = 'morto'; o.t = 0; }
    if (window.Som) Som.musica(null);
    J.clarao = 1; treme(12); J.pausa = 0.4;
    J.aviso && J.aviso('venceu', e);
    J.salvar();
  };

  // ---------- morte, fogueiras, baús ----------
  J.morrer = function (quem) {
    const h = J.heroi; h.estado = 'morto'; h.t = 0; h.vy = -200;
    som('morte', 0.9, 0.8); treme(10); J.pausa = 0.3;
    const s = J.save;
    s.perdidas = s.brasas > 0 ? { x: h.ultimoSeguro.x, y: h.ultimoSeguro.y, qtd: s.brasas } : null;
    s.brasas = 0;
    if (J.chefeAtivo && window.Som) Som.musica(null);
    J.salvar();
    J.aviso && J.aviso('morte', quem);
  };
  J.renascer = function () { J.criarHeroi(); J.povoar(); J.fx = []; J.rastro = []; J.textos = []; };
  J.descansar = function (fg) {
    const s = J.save; s.fogueira = fg.id; s.acesas[fg.id] = true;
    const h = J.heroi, f = J.fichaDe(s); h.ficha = f;
    h.hp = f.vida; h.vigor = f.vigor; h.sina = f.sina; h.cabaca = f.cabaca + s.cabacaExtra; h.espera = {};
    J.povoar(); J.salvar();
  };
  J.custoNivel = () => { const n = J.save.niv, t = n.vida + n.vigor + n.forca + n.sina; return Math.round(180 * Math.pow(1.13, t) + t * 30); };
  J.subir = function (atr) {
    const c = J.custoNivel(); if (J.save.brasas < c) return false;
    J.save.brasas -= c; J.save.niv[atr]++; J.recalcular();
    const h = J.heroi, f = h.ficha; h.hp = f.vida; h.vigor = f.vigor; h.sina = f.sina;
    J.salvar(); return true;
  };
  J.perto = function () { // o que dá para usar agora
    const h = J.heroi; if (!h) return null;
    for (const fg of F.FOGUEIRAS) if (Math.abs(fg.x - h.x) < 26 && Math.abs(fg.y - h.y) < 30) return { tipo: 'fogueira', o: fg };
    for (const b of F.BAUS) if (!J.save.abertos[b.id] && Math.abs(b.x - h.x) < 24 && Math.abs(b.y - h.y) < 30) return { tipo: 'bau', o: b };
    for (const n of F.NPCS) if (Math.abs(n.x - h.x) < 28 && Math.abs(n.y - h.y) < 30) return { tipo: 'npc', o: n };
    return null;
  };
  J.abrirBau = function (b) {
    const s = J.save; s.abertos[b.id] = true; s.brasas += b.brasas; som('bau', 0.8); som('moeda', 0.6);
    texto(b.x, b.y - 30, '+' + b.brasas + ' brasas', '#e9c47a', true);
    J.faiscas(b.x, b.y - 10, 20, '#e9c47a', 1, 'brasa');
    if (b.cabaca) { s.cabacaExtra++; J.heroi.cabaca++; texto(b.x, b.y - 46, 'Caco de cabaça: +1 gole', '#9cff8a', true); som('raro', 0.7); }
    J.salvar();
  };

  // ---------- loja e forja ----------
  J.LOJA = ['adaga', 'espada', 'lanca', 'machado', 'caco_cabaca', 'pedra_forja'];
  J.PRECOS = { caco_cabaca: 1200, pedra_forja: 350 };
  J.comprar = function (id) {
    const s = J.save, preco = Hr.ARMAS[id] ? Hr.ARMAS[id].preco : J.PRECOS[id];
    if (s.brasas < preco) return false;
    if (Hr.ARMAS[id]) { if (s.armas.includes(id)) return false; s.armas.push(id); }
    else if (id === 'caco_cabaca') { if (s.comprou.caco) return false; s.comprou.caco = true; s.cabacaExtra++; J.heroi.cabaca++; }
    else if (id === 'pedra_forja') s.pedras++;
    s.brasas -= preco; som('moeda', 0.7); J.salvar(); return true;
  };
  J.CUSTO_FORJA = [400, 1100, 2600];
  J.forjar = function () {
    const s = J.save, n = s.forja[s.arma] || 0, c = J.CUSTO_FORJA[n];
    if (n >= 3 || s.brasas < c || s.pedras < 1) return false;
    s.brasas -= c; s.pedras--; s.forja[s.arma] = n + 1; J.recalcular(); som('minerar', 0.8); som('raro', 0.5); J.salvar(); return true;
  };
  J.empunhar = function (id) { const s = J.save; if (!s.armas.includes(id)) return; s.arma = id; J.recalcular(); som('equipar', 0.7); J.salvar(); };

  // ---------- quadro inteiro ----------
  J.passo = function (dt) {
    for (const k in J.ja) J.ja[k] = Math.max(0, J.ja[k] - dt);
    J.tremor = Math.max(0, J.tremor - dt * 18); J.clarao = Math.max(0, J.clarao - dt * 2.5);
    if (J.pausa > 0) { J.pausa -= dt; return; }
    const h = J.heroi;
    passoHeroi(dt);
    for (const e of J.inimigos) {
      if (Math.abs(e.x - h.x) > 700 && e.estado !== 'morto' && !grande(e.T)) continue; // longe demais: dorme
      passoInimigo(e, dt);
    }
    J.inimigos = J.inimigos.filter((e) => e.vivo || e.t < 1.2);
    if (J.chefeAtivo && J.chefeAtivo.T.mini && Math.abs(J.chefeAtivo.x - h.x) > 520) J.soltaChefe();
    passoBalas(dt); passoMagias(dt);
    // brasas perdidas
    const p = J.save.perdidas;
    if (p && h.estado !== 'morto' && Math.abs(p.x - h.x) < 18 && Math.abs(p.y - h.y) < 30) {
      J.save.brasas += p.qtd; texto(h.x, h.y - 44, '+' + p.qtd + ' brasas recuperadas', '#e9c47a', true); J.save.perdidas = null; som('raro', 0.7);
      J.faiscas(p.x, p.y - 10, 24, '#e9c47a', 1.2, 'brasa'); J.salvar();
    }
    for (const f of J.fx) {
      f.vida -= dt;
      if (f.alvo) { f.x += (h.x - f.x) * dt * 8; f.y += (h.y - 16 - f.y) * dt * 8; }
      else { f.vy += (f.grav || 0) * dt; f.x += f.vx * dt; f.y += f.vy * dt; }
      if (f.tipo === 'gota' && solido(f.x, f.y)) { f.vx = 0; f.vy = 0; f.grav = 0; f.preso = true; }
    }
    J.fx = J.fx.filter((f) => f.vida > 0);
    if (J.fx.length > 700) J.fx.splice(0, J.fx.length - 700);
    for (const t of J.textos) { t.vida -= dt; t.y -= 26 * dt; }
    J.textos = J.textos.filter((t) => t.vida > 0);
    for (const r of J.rastro) r.vida -= dt;
    J.rastro = J.rastro.filter((r) => r.vida > 0);
  };

  // ---------- guardar ----------
  const CHAVE = 'sina2d_save';
  J.salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(J.save)); } catch (e) { /* sem espaço ou bloqueado */ } };
  J.carregar = () => { try { const s = JSON.parse(localStorage.getItem(CHAVE)); return s && s.ficha ? s : null; } catch (e) { return null; } };
  J.apagar = () => { try { localStorage.removeItem(CHAVE); } catch (e) { /* nada */ } };
})();
