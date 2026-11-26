/* SINA · regras. Física, combate, coleta, criação, perícias, títulos, morte e vidas.
   Posições em pixels do mundo; x é o meio do corpo e y é a sola do pé. */
(function () {
  'use strict';
  const J = window.Jogo = {};
  const F = window.Fase, C = window.Dados, T = F.T;
  const som = (n, v, t) => window.Som && Som.tocar(n, v, t);
  // som que vem de um lugar: mais baixo de longe e para o lado certo
  const voz = (e, q) => { const h = J.heroi; if (!window.Som || !h) return; const d = Math.abs(e.x - h.x); if (d > 620) return; Som.voz(e.tipo, e.T.esp, q, 1 - d / 700, (e.x - h.x) / 420); };
  const sopro = (n) => window.Som && Som.sopro && Som.sopro(n);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const avisa = (t, x, y) => J.aviso && J.aviso(t, x, y);

  const G = 1620, QUEDA = 620, PULO = 560, CORRE = 158;
  J.ent = { esq: 0, dir: 0, cima: 0, baixo: 0, pula: 0, forte: 0, golpe: 0 };
  J.ja = {};
  J.aperta = (a) => { J.ja[a] = 0.15; };
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
      let nx = e.x + e.vx * d;
      const lado = e.vx > 0 ? nx + e.w / 2 : nx - e.w / 2;
      if (e.vx !== 0) {
        let bate = false;
        for (let yy = e.y - e.h + 1; yy < e.y - 1; yy += 8) if (solido(lado, yy)) bate = true;
        if (solido(lado, e.y - 2)) bate = true;
        if (bate) {
          // degrau de um bloco: sobe sozinho, sem parar a corrida
          const topoT = Math.floor((e.y - 2) / T) * T;
          let cabe = e.y - topoT <= T + 1 && !solido(lado, topoT - 2);
          for (let yy = topoT - e.h + 1; cabe && yy < topoT - 1; yy += 8) if (solido(lado, yy) || solido(e.x, yy)) cabe = false;
          if (cabe && e.vy >= -10) { e.y = topoT; e.vy = 0; e.degrau = 0.1; }
          else {
            const col = Math.floor(lado / T);
            nx = e.vx > 0 ? col * T - e.w / 2 - 0.01 : (col + 1) * T + e.w / 2 + 0.01;
            e.naParede = Math.sign(e.vx); e.vx = 0;
          }
        }
      }
      e.x = nx;
      const ny = e.y + e.vy * d;
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
    if (!e.noChao && e.vy >= 0) {
      for (const xx of [e.x - e.w / 2 + 1, e.x + e.w / 2 - 1]) {
        const tp = tipoEm(xx, e.y + 0.5);
        if ((tp === 1 || (tp === 2 && !e.desce)) && Math.abs(e.y - Math.floor((e.y + 0.5) / T) * T) < 0.6) e.noChao = true;
      }
      // degrau de um bloco para baixo: gruda no chão em vez de "cair"
      if (!e.noChao && e.grudado && e.vy < 60 && !e.desce) {
        for (let k = 1; k <= T + 1; k++) {
          const tp = tipoEm(e.x, e.y + k);
          if (tp === 1 || tp === 2) { const y2 = Math.floor((e.y + k) / T) * T; if (y2 >= e.y) { e.y = y2; e.noChao = true; e.vy = 0; } break; }
        }
      }
    }
    e.grudado = e.noChao;
  }
  const caixa = (e) => ({ x0: e.x - e.w / 2, x1: e.x + e.w / 2, y0: e.y - e.h, y1: e.y });
  const cruza = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  J.caixa = caixa;

  // ---------- efeitos ----------
  J.fx = []; J.textos = []; J.rastro = []; J.magias = []; J.balas = []; J.restos = []; J.mortos = [];
  J.tremor = 0; J.soco = 0; J.miraDedo = null; J.pausa = 0; J.clarao = 0; J.lento = 0;
  const fx = (o) => { J.fx.push(Object.assign({ vida: 0.5, max: 0.5, vx: 0, vy: 0, grav: 0, tam: 2, cor: '#fff' }, o)); };
  J.poe = fx;
  J.faiscas = function (x, y, n, cor, forca, tipo) {
    for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), v = rnd(40, 170) * (forca || 1), vida = rnd(0.2, 0.55); fx({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, grav: 400, vida, max: vida, cor, tam: rnd(1, 2.6), tipo: tipo || 'faisca' }); }
  };
  const sangue = (x, y, dir, n, cor) => { for (let i = 0; i < n; i++) { const vida = rnd(0.5, 1.3); fx({ x, y, vx: dir * rnd(30, 210) + rnd(-30, 30), vy: rnd(-190, -20), grav: 800, vida, max: vida, cor: cor || '#8a1a1a', tam: rnd(1, 2.8), tipo: 'gota' }); } };
  const texto = (x, y, t, cor, grande) => J.textos.push({ x, y, t: String(t), cor: cor || '#fff', vida: 0.95, max: 0.95, grande, vx: rnd(-14, 14) });
  J.texto = texto;
  J.anel = (x, y, raio, cor, vida, larg) => fx({ x, y, tipo: 'anel', raio, cor, vida: vida || 0.4, max: vida || 0.4, larg: larg || 2 });
  const treme = (k) => { J.tremor = Math.max(J.tremor, k); };
  const poeira = (x, y, n, dir) => { for (let i = 0; i < n; i++) { const vida = rnd(0.3, 0.6); fx({ tipo: 'poeira', x: x + rnd(-5, 5), y: y - rnd(0, 3), vx: (dir || 0) * rnd(10, 60) + rnd(-25, 25), vy: rnd(-30, -4), vida, max: vida, tam: rnd(2, 4.5) }); } };

  // ---------- vida guardada ----------
  J.save = null;
  J.novoSave = (nome) => ({ v: 3, abates: {}, reforco: {}, vila: {}, nomeVila: '', familias: [], estagio: 0, nivel: 'normal', amuletos: [], amu: [], tocha: 0, marcos: {}, baus: {}, fracas: {}, mapa: {}, hora: 8, dia: 1, emb: {}, lar: null, hum: null, mae: null, prole: [], nome, area: 'floresta', x: null, hp: null, fome: 100, inv: {}, armas: ['punho'], arma: 'punho', afiado: {}, roupas: ['barro'], roupa: 'barro', per: {}, mortes: { lobo: 0, cobra: 0, zumbi: 0, goblin: 0 }, magias: [], magia2: null, sina: 0, chefes: {}, dicas: {}, fogos: {}, fogo: null, filhos: 0, vida: 1, tempo: 0, colhido: 0, visitas: {}, distancia: 0 });
  const nv = (k) => (J.save.per[k] ? J.save.per[k].n : 0);
  J.nivel = nv;
  J.treina = function (k, xp) {
    const p = J.save.per[k] || (J.save.per[k] = { n: 0, x: 0 });
    p.x += xp;
    while (p.x >= C.xpNivel(p.n)) {
      p.x -= C.xpNivel(p.n); p.n++;
      const h = J.heroi; if (h) { texto(h.x, h.y - 78, C.PERICIAS[k][0] + ' ' + p.n, '#8fe0c8', true); J.anel(h.x, h.y - 30, 34, '#8fe0c8', 0.5, 2); som('livro', 0.5, 1.3); }
      J.recalcular(); avisa('pericia', k);
    }
  };
  J.titulo = (esp) => { const m = J.save.mortes[esp] || 0; let n = 0; for (const t of C.TITULOS[esp]) if (m >= t[0]) n++; return n; };
  const tem = (esp, n) => J.titulo(esp) >= n;
  const amu = (id) => J.save.amu && J.save.amu.includes(id);
  J.amu = amu;
  J.ficha = function () {
    const s = J.save, r = C.ROUPAS[s.roupa], a = C.ARMAS[s.arma];
    const f = { arma: a, armaId: s.arma };
    f.vida = Math.round(80 + nv('corpo') * 6 + (r.vida || 0)) + (s.cha === s.dia ? 20 : 0);
    f.vigor = Math.round(70 + nv('folego') * 5 + (r.vigor || 0));
    f.sina = 100;
    f.def = Math.min(0.64, r.def + nv('corpo') * 0.008 + (s.reforco[s.roupa] || 0) * 0.03);
    f.vel = 1 + nv('pernas') * 0.012 + (tem('lobo', 2) ? 0.12 : 0);
    f.pulo = 1 + Math.min(0.14, nv('pernas') * 0.006);
    f.dano = a.dano * (1 + nv(a.per) * C.BONUS) * (1 + (s.afiado[s.arma] || 0) * 0.04);
    f.magia = 1 + nv('magia') * 0.07;
    f.critico = (a.critico || 0.04) + (tem('goblin', 2) ? 0.15 : 0) + (amu('presas') ? 0.1 : 0);
    f.rola = 18 * (tem('lobo', 2) ? 0.5 : 1) * (r.rola || 1);
    if (amu('pena')) f.pulo += 0.07;
    if (J.bonusVila) J.bonusVila(f); f.vida = Math.round(f.vida);
    return f;
  };
  J.recalcular = function () { const h = J.heroi; if (!h) return; const antes = h.ficha ? h.ficha.vida : 0; h.ficha = J.ficha(); if (antes && h.ficha.vida > antes && h.estado !== 'morto') h.hp += h.ficha.vida - antes; h.hp = Math.min(h.hp, h.ficha.vida); };

  // ---------- o herói ----------
  J.criarHeroi = function (px, py) {
    const s = J.save, f = J.ficha();
    J.heroi = { x: px, y: py, vx: 0, vy: 0, w: 14, h: 54, dir: 1, noChao: true, coyote: 0, estado: 'livre', t: 0, combo: 0, fila: 0, ficha: f,
      hp: s.hp == null ? f.vida : Math.min(f.vida, s.hp), vigor: f.vigor, sina: s.sina || 0, inv: 0, semVigor: 0, espera: {}, vento: 0, arDash: true, carga: 0, amassa: 0, andou: 0,
      ultimoSeguro: { x: px, y: py }, acertou: new Set(), dirGolpe: 'frente', desce: false, veneno: 0, venT: 0, virou: 0 };
  };
  J.entrarArea = function (id, porta) {
    const s = J.save, a = F.entrar(id);
    const p = porta && a.portas.find((q) => q.id === porta);
    const guarda = !p && s.x != null && s.area === id;
    const x = p ? p.x : guarda ? s.x : a.inicio.x;
    const y = p ? p.y : guarda ? s.y : F.chao(x);
    s.area = id; s.visitas[id] = 1; F.aplicaFracas(s.fracas);
    if (!J.heroi) J.criarHeroi(x, y);
    const h = J.heroi; h.x = x; h.y = guarda && (solido(x, y - 20) || solido(x, y - 4)) ? F.chao(x) : y; h.vx = h.vy = 0; h.ultimoSeguro = { x, y }; h.estado = 'livre'; h.t = 0; h.inv = 1; h.desce = false;
    J.cativeiro = null; J.povoar(); if (J.trazGente) J.trazGente(); J.fx = []; J.textos = []; J.rastro = []; J.restos = [];
    J.salvar();
  };

  // ---------- inimigos ----------
  J.inimigos = [];
  function nasce(t, x, y, extra) {
    const tp = C.TIPOS[t], manha = tp.chefe ? 1 : extra && extra.manha != null ? extra.manha : J.manhaDe(t, x), hp = Math.round(tp.hp * (tp.chefe ? 1.15 : J.dureza() * (1.1 + manha * 1.75)) * (J.nv ? J.nv().hp : 1));
    const e = { tipo: t, T: tp, x, y, ox: x, oy: y, vx: 0, vy: 0, w: tp.w, h: tp.h, dir: Math.random() < 0.5 ? -1 : 1, hp, hpMax: hp, estado: 'vaga', t: rnd(0, 2), firmeza: tp.firme, flash: 0, andou: rnd(0, 50), seguidos: 0, noChao: true, vivo: true, uivos: 0, acertou: new Set(), pisca: 0, veneno: 0, levantou: 0, esc: (tp.esc || 1) * (tp.chefe ? 1 : 0.93 + Math.random() * 0.15), manha, viu: J.golpeId };
    return Object.assign(e, extra || {});
  }
  J.nasce = nasce;
  J.povoar = function () {
    J.inimigos = []; J.balas = []; J.magias = []; J.mortos = [];
    for (const i of F.atual.inimigos) {
      const tp = C.TIPOS[i.t];
      if (tp.chefe && J.save.chefes[i.t]) continue;
      J.inimigos.push(nasce(i.t, i.x, i.y));
    }
    F.fecharArena(false); J.chefeAtivo = null; J.emb = null; if (J.poeGuardas) J.poeGuardas(); if (F.atual.fechos) F.fechar(false);
  };

  // ---------- dano ----------
  J.feriHeroi = function (dano, dex, quem, o) {
    const h = J.heroi; o = o || {};
    if (!h || h.estado === 'morto' || h.estado === 'nasce' || h.estado === 'dorme') return false;
    if (h.estado === 'rola' && h.t < 0.3) {
      if (!h.esquivou) { h.esquivou = true; J.lento = 0.18; J.treina('folego', 3); h.vigor = Math.min(h.ficha.vigor, h.vigor + 14); texto(h.x, h.y - 62, 'por um fio', '#9fd8ff'); J.anel(h.x, h.y - 28, 30, '#9fd8ff', 0.4, 2); }
      return false;
    }
    if (h.inv > 0) return false;
    if (h.estado === 'carga' && h.t < 0.24 && h.ficha.arma.per === 'espada' && C.TIPOS[quem] && dex != null && Math.sign(dex - h.x) === h.dir) {
      const q = J.inimigos.find((e) => e.vivo && e.tipo === quem && Math.abs(e.x - dex) < 6);
      texto(h.x, h.y - 66, 'aparou', '#ffe9a0', true); som('quebra', 0.8, 1.7); J.faiscas(h.x + h.dir * 18, h.y - 38, 20, '#fff1c8', 1.4); J.anel(h.x + h.dir * 18, h.y - 38, 30, '#ffe9a0', 0.3, 3); J.pausa = 0.1; J.lento = 0.25; h.inv = 0.5; h.vigor = Math.min(h.ficha.vigor, h.vigor + 16); J.treina('espada', 4);
      if (q && !q.T.atira) { if (q.T.chefe) q.firmeza -= 3; else { q.estado = 'cambaleia'; q.t = 0; q.dur = 1.1; q.couraca = false; q.vx = h.dir * 120; } }
      return false;
    }
    let d = dano * (1 - h.ficha.def);
    const tp = C.TIPOS[quem]; if (tp && tem(tp.esp, 2)) d *= 0.8;
    if (tp && tp.esp === 'cobra' && amu('escama')) d *= 0.75;
    d = Math.max(1, Math.round(d * rnd(0.92, 1.1)));
    h.hp -= d; h.inv = 0.6; J.pausa = 0.08; treme(6); J.combo = 0; J.dorLado = { x: dex == null ? h.x - h.dir : dex, t: 0.9 }; if (window.UI) UI.vibra(34); J.clarao = 0.3; J.ultimoDano = tp ? tp.esp : quem;
    texto(h.x, h.y - 62, d, '#ff6a5a', d > 20);
    const lado = Math.sign(h.x - (dex == null ? h.x - h.dir : dex)) || -h.dir;
    sangue(h.x, h.y - 32, lado, 12, '#b0502a');
    J.faiscas(h.x, h.y - 32, 8, '#ff9a50', 0.8, 'brasa');
    som('dor', 0.8);
    if (o.prende) h.lerdo = Math.max(h.lerdo || 0, 1.2);
    const rv = C.ROUPAS[J.save.roupa];
    if (o.veneno && !tem('cobra', 2)) h.veneno = Math.max(h.veneno, o.veneno * (rv.veneno || 1) * (amu('escama') ? 0.6 : 1));
    // a prata devolve parte do golpe de quem está colado
    if (rv.volta && tp && dex != null) { const q = J.inimigos.find((e) => e.vivo && e.tipo === quem && Math.abs(e.x - dex) < 4 && Math.abs(e.x - h.x) < 110); if (q) { J.faiscas(q.x, q.y - q.h / 2, 8, '#dfe8f0', 1); feriInimigo(q, d * rv.volta + 2, Math.sign(q.x - h.x) || 1, { magia: true, deHum: true, quebra: 0.5 }); } }
    J.treina('corpo', 2 + d * 0.12);
    if (h.hp <= 0) { h.hp = 0; J.morrer(J.ultimoDano); return true; }
    if (rv.firme && ['carga', 'forte'].includes(h.estado) && !o.forte) return true;
    h.estado = 'dor'; h.t = rv.firme ? 0.12 : 0; h.carga = 0; h.cheia = false; h.vx = lado * (o.forte ? 260 : 170); h.vy = -190; h.dir = -lado;
    return true;
  };
  function feriInimigo(e, dano, dir, o) {
    if (!e.vivo || e.estado === 'morto' || e.estado === 'caido') return false;
    o = o || {};
    const h = J.heroi, esp = e.T.esp;
    if (e.sob) return false;
    // dono só luta dentro da arena: de fora, nada pega
    if (e.T.chefe && !J.chefeAtivo && F.atual.arena && (J.heroi.x < F.atual.arena.x0 + 50 || J.heroi.x > F.atual.arena.x1 - 30)) return false;
    if (e.esq > 0 && !o.magia && !o.deLonge) { texto(e.x, e.y - e.h - 8, 'esquivou', '#b8c8d8'); return false; }
    // escudo: de frente não passa, a não ser golpe forte carregado
    if (e.T.escudo && (e.estado === 'bloqueia' || (e.estado === 'persegue' && Math.random() < 0.35 * e.manha)) && Math.sign(dir) === -e.dir && !o.magia) {
      if (o.carregado) { e.estado = 'cambaleia'; e.t = 0; e.dur = 0.9; e.firmeza = e.T.firme; e.semCamb = 2; texto(e.x, e.y - e.h - 8, 'guarda quebrada', '#ffd27a', true); som('quebra', 0.7, 1.2); }
      else { e.estado = 'bloqueia'; e.t = 0.1; J.faiscas(e.x + e.dir * 14, e.y - e.h * 0.55, 10, '#e8d8a0', 1); som('quebra', 0.5, 1.7); texto(e.x, e.y - e.h - 8, 'aparou', '#c8b890'); if (!o.deLonge) { h.vx = -h.dir * 130; h.vigor -= 6; } J.pausa = 0.04; return false; }
    }
    const casca = e.T.casca && !o.magia && !o.forte && !h.ficha.arma.fura && !['porrete', 'machado'].includes(h.ficha.arma.per) && (e.dir === -Math.sign(dir)) && e.estado !== 'recua';
    if (casca) dano *= 0.4;
    let d = dano;
    const aberto = e.estado === 'cambaleia' || (e.estado === 'recua' && e.T.bruto), nuca = e.estado === 'vaga';
    if (aberto) d *= 1.3;
    if (nuca) d *= 1.6;
    if (tem(esp, 1)) d *= tem(esp, 2) ? 1.3 : 1.12;
    if (esp === 'goblin' && amu('orelhas')) d *= 1.2;
    if ((J.save.abates[e.tipo] || 0) >= 10) d *= 1.08;
    const crit = !o.magia && Math.random() < h.ficha.critico;
    if (crit) d *= 1.8;
    d = Math.max(1, Math.round(d * rnd(0.9, 1.1)));
    e.hp -= d; e.flash = 0.13; e.ferido = 0.25; if (!o.deHum) { J.combo = (J.combo || 0) + 1; J.comboT = 2.6; if (J.combo >= 5 && J.combo % 5 === 0) { h.sina = Math.min(h.ficha.sina, h.sina + 6); avisa('combo', J.combo); } }
    const forte = o.forte || aberto || crit || nuca;
    texto(e.x + rnd(-6, 6), e.y - e.h - 8, d, crit ? '#ffd24a' : aberto || nuca ? '#ffd27a' : forte ? '#ffe9b0' : '#ffffff', forte);
    const ix = e.x - dir * e.w * 0.28, iy = clamp(o.y || e.y - e.h * 0.55, e.y - e.h * 0.7, e.y - e.h * 0.35);
    J.faiscas(ix, iy, forte ? 14 : 8, forte ? '#ffd27a' : '#fff1c8', forte ? 1.4 : 1);
    sangue(ix, iy, dir, forte ? 14 : 7, esp === 'zumbi' ? '#3a4a2a' : esp === 'cobra' ? '#6a1a2a' : '#8a1a1a');
    fx({ tipo: 'corte', x: ix, y: iy, vida: 0.18, max: 0.18, dir, tam: forte ? 34 : 24, cor: crit ? '#ffd24a' : '#ffffff', ang: rnd(-0.9, 0.4) });
    fx({ tipo: 'estrela', x: ix, y: iy, vida: 0.12, max: 0.12, tam: forte ? 16 : 10, cor: '#fff6d8' });
    { const per = h.ficha.arma.per, ferro = ['adaga', 'espada', 'machado_ferro', 'lanca_prata'].includes(h.ficha.armaId); if (o.magia || o.deLonge || per === 'punho') som('acerto', 0.75, forte ? 0.8 : 1); else { som('acerto', 0.5, forte ? 0.8 : 1); som(per === 'porrete' ? 'madeira' : ferro ? 'lamina' : 'pedra', forte ? 0.55 : 0.4, per === 'porrete' ? 0.8 : per === 'machado' ? 0.75 : 1.05); } }
    if (crit) som('quebra', 0.35, 1.5); if (casca) { som('quebra', 0.4, 1.8); J.faiscas(ix, iy, 8, '#dfe8f0', 1.1); }
    if (!o.magia) { h.sina = Math.min(h.ficha.sina, h.sina + (o.forte ? 13 : 7) * (amu('apito') ? 1.5 : 1) * (J.cl && J.cl('cinza') > 0.4 ? 1.35 : 1)); J.treina(h.ficha.arma.per, 1.2 + Math.min(4, d * 0.04)); if (tem('cobra', 2)) e.veneno = 4; if (h.ficha.arma.veneno) e.veneno = Math.max(e.veneno, h.ficha.arma.veneno); } else if (!o.deHum) J.treina('magia', 2.2);
    J.pausa = Math.max(J.pausa, forte ? 0.06 : 0.028); treme(forte ? 4 : 1.6); if (forte && !o.deHum) { J.soco = Math.max(J.soco || 0, crit || o.carregado ? 0.035 : 0.018); if (window.UI) UI.vibra(crit ? 22 : 14); }
    if (e.hp <= 0) { morreInimigo(e, dir, forte); return true; }
    if (Math.random() < 0.7) voz(e, 'dor');
    e.firmeza -= (o.quebra || 1) * (o.forte ? 1 : 0.55);
    const peso = e.T.chefe ? 0.12 : e.T.bruto ? 0.25 : 1;
    // o atordoamento tem limite, e quem está revidando não para
    if (e.firmeza <= 0 && (e.semCamb || 0) <= 0 && !e.couraca && e.estado !== 'golpe' && e.estado !== 'virada' && !(e.estado === 'prep' && e.t > (e.prepDur || 0.3) * 0.55 && !o.carregado)) {
      e.estado = 'cambaleia'; e.t = 0; e.dur = e.T.chefe ? 1.7 : 0.34; e.firmeza = e.T.firme; e.semCamb = e.T.chefe ? 7 : 2.4; if (e.T.chefe) { texto(e.x, e.y - e.h - 14, 'postura quebrada', '#ffd27a', true); som('quebra', 0.8, 1.1); J.anel(e.x, e.y - e.h / 2, 60, '#ffd27a', 0.5, 3); }
      e.vx = dir * 150 * peso * (o.empurra || 1); if (!e.T.chefe && !e.T.bruto) e.vy = -90;
    } else {
      if (!e.T.chefe && e.estado !== 'golpe') e.vx += dir * 34 * peso * (o.empurra || 1);
      if (e.estado === 'vaga') { e.estado = 'persegue'; e.t = 0.2; J.alerta(e, 300); if (e.T.chefe) J.acordaChefe(e); }
      if (e.T.chefe) J.apanhouDono(e); else J.apanhou(e, o.forte, aberto);
    }
    if (e.estado === 'vaga') { e.estado = 'persegue'; e.t = 0; J.alerta(e, 300); if (e.T.chefe) J.acordaChefe(e); }
    if (e.T.foge && e.hp < e.hpMax * e.T.foge && !e.fugiu && Math.random() < 0.5) { e.fugiu = true; e.estado = 'foge'; e.t = 0.5; }
    if (esp === 'lobo' && tem('lobo', 3) && e.hp < e.hpMax * 0.4 && !e.T.chefe) { e.estado = 'foge'; e.t = 0; }
    return true;
  }
  J.feriInimigo = feriInimigo;
  function morreInimigo(e, dir, forte) {
    const h = J.heroi, s = J.save, esp = e.T.esp;
    // zumbi pode levantar uma vez, se o golpe final não for forte
    if (e.T.levanta && !e.levantou && !forte && Math.random() < e.T.levanta) { e.levantou = 1; e.hp = Math.round(e.hpMax * 0.5); e.estado = 'caido'; e.t = 0; e.vx = dir * 60; som('morte', 0.4, 0.8); return; }
    e.estado = 'morto'; e.t = 0; e.vivo = false; e.vx = dir * (e.T.chefe ? 20 : 110); e.vy = e.T.chefe ? 0 : -130;
    voz(e, 'morte'); som('morte', 0.22, 1);
    J.faiscas(e.x, e.y - e.h / 2, 14, '#c8b08a', 1.1, 'brasa');
    J.lento = Math.max(J.lento, e.T.chefe ? 1.2 : forte ? 0.12 : 0);
    for (const m in e.T.cai) {
      let q = e.T.cai[m]; q = q >= 1 ? q : Math.random() < q ? 1 : 0;
      if (q && tem('goblin', 2)) q *= 2;
      for (let i = 0; i < q; i++) J.restos.push({ m, x: e.x + rnd(-6, 6), y: e.y - e.h / 2, vx: rnd(-70, 70), vy: rnd(-220, -120), w: 6, h: 8, t: 0 });
    }
    if (e.roubo) J.restos.push(...Array.from({ length: e.roubo[1] }, () => ({ m: e.roubo[0], x: e.x, y: e.y - 20, vx: rnd(-60, 60), vy: -180, w: 6, h: 8, t: 0 })));
    if (e.T.gas) { J.magias.push({ tipo: 'gas', x: e.x, y: e.y, t: 0, dur: 4, raio: 58, dano: 5 }); som('quebra', 0.6, 0.6); J.faiscas(e.x, e.y - 30, 24, '#a8c050', 1.3, 'brasa'); }
    s.abates[e.tipo] = (s.abates[e.tipo] || 0) + 1; if ([1, 4, 10].includes(s.abates[e.tipo]) && !e.T.chefe) avisa('caderno', [e.tipo, s.abates[e.tipo]]);
    const antes = J.titulo(esp); s.mortes[esp] = (s.mortes[esp] || 0) + 1;
    const n = J.titulo(esp);
    if (n > antes) { const t = C.TITULOS[esp][n - 1]; s.titulo = t[1]; J.recalcular(); avisa('titulo', t); som('raro', 0.9); J.anel(h.x, h.y - 28, 70, '#e9c47a', 0.9, 3); J.faiscas(h.x, h.y - 28, 30, '#e9c47a', 1.4, 'brasa'); }
    if (esp === 'zumbi' && tem('zumbi', 2)) { h.hp = Math.min(h.ficha.vida, h.hp + 6); texto(h.x, h.y - 66, '+6', '#9cff8a'); }
    if (esp === 'zumbi' && tem('zumbi', 3)) { J.anel(e.x, e.y - 24, 44, '#ff9a40', 0.4, 3); J.faiscas(e.x, e.y - 24, 24, '#ff9a40', 1.6, 'brasa'); for (const o of J.inimigos) if (o !== e && o.vivo && Math.abs(o.x - e.x) < 54) feriInimigo(o, 24, Math.sign(o.x - e.x) || 1, { magia: true }); }
    if (e.T.chefe) J.venceuChefe(e); else if (!e.chamado && !e.raid) J.mortos.push({ t: e.tipo, x: e.ox, y: e.oy, espera: 70 * (J.nv ? J.nv().volta : 1) });
  }

  // ---------- golpes do herói ----------
  function golpeCaixa(h) {
    const a = h.ficha.arma, alc = a.alcance + (h.estado === 'forte' ? 12 : 0) + (h.final ? 6 : 0), meia = a.altura / 2;
    if (h.dirGolpe === 'cima') return { x0: h.x - 24, x1: h.x + 24, y0: h.y - h.h - alc, y1: h.y - h.h + 14 };
    if (h.dirGolpe === 'baixo') return { x0: h.x - 18, x1: h.x + 18, y0: h.y - 14, y1: h.y + Math.min(40, alc) - 8 };
    if (h.estado === 'forte' && h.pesado === 'giro') return { x0: h.x - alc - 4, x1: h.x + alc + 4, y0: h.y - 56, y1: h.y - 1 };
    if (h.estado === 'forte' && h.pesado === 'passa') return { x0: h.x - 22, x1: h.x + 22, y0: h.y - 54, y1: h.y - 1 };
    if (h.estado === 'forte' && h.pesado === 'gancho') return { x0: h.x - 8 - (h.dir < 0 ? 34 : 0), x1: h.x + 8 + (h.dir > 0 ? 34 : 0), y0: h.y - 84, y1: h.y - 8 };
    const y0 = a.estoca ? h.y - 46 : h.y - 34 - meia, y1 = a.estoca ? h.y - 8 : h.y - 1;
    return h.dir > 0 ? { x0: h.x - 4, x1: h.x + alc + 6, y0, y1 } : { x0: h.x - alc - 6, x1: h.x + 4, y0, y1 };
  }
  J.golpeCaixa = golpeCaixa;
  const gasta = (h, v) => { if (h.vento > 0) v *= 0.3; h.vigor -= v; h.semVigor = 0.85; };
  J.golpeId = 1; J.relogio = 0;
  // mira assistida: sem direção apertada, o golpe vira para quem está colado
  function viraParaAlvo(h) {
    const m = J.miraDedo; if (m) { if (Math.abs(Math.cos(m.a)) > 0.35) h.dir = Math.cos(m.a) > 0 ? 1 : -1; return; }
    if (J.ent.esq || J.ent.dir || !J.pref || !J.pref.assist || J.save.nivel === 'pesadelo') return; let q = null, md = h.ficha.arma.tiro ? 300 : 78 + h.ficha.arma.alcance; for (const e of J.inimigos) { if (!e.vivo || e.estado === 'caido' || Math.abs(e.y - h.y) > 90) continue; const d = Math.abs(e.x - h.x) * (Math.sign(e.x - h.x) === h.dir ? 0.7 : 1); if (d < md) { md = d; q = e; } } if (q && Math.abs(q.x - h.x) > 4) h.dir = Math.sign(q.x - h.x);
  }
  function comecaGolpe(h) {
    viraParaAlvo(h);
    const a = h.ficha.arma;
    if (h.vigor <= 0) { texto(h.x, h.y - 66, 'sem fôlego', '#9fc49a'); return; }
    if (a.tiro) { comecaMira(h); return; }
    J.golpeId++; h.estado = 'golpe'; h.t = 0; h.acertou = new Set(); h.fila = 0; h.investida = false; h.bateu = false;
    const seq = C.ESTILOS[a.per].seq; h.combo = h.combo >= seq.length ? 1 : h.combo + 1;
    { const md = J.miraDedo, sm = md ? Math.sin(md.a) : 0; h.dirGolpe = J.ent.cima || sm < -0.75 ? 'cima' : (J.ent.baixo || sm > 0.75) && !h.noChao ? 'baixo' : 'frente'; }
    if (h.dirGolpe !== 'frente') h.combo = 1;
    const pg = h.pg = seq[h.combo - 1]; h.final = h.dirGolpe === 'frente' && !!pg.f; h.maxCombo = seq.length;
    h.dur = a.tempo * pg.t + 0.04;
    gasta(h, a.custo * 1.15 * (pg.c || 1));
    if (h.noChao && h.dirGolpe === 'frente') { h.vx = h.dir * pg.v; poeira(h.x - h.dir * 6, h.y, 2, -h.dir); }
    if (a.per === 'lamina' || a.per === 'espada' || a.per === 'lanca') som('corte', 0.34, a.per === 'lamina' ? 1.35 : a.per === 'lanca' ? 1.1 : 0.95);
    som('golpe', a.per === 'lamina' ? 0.3 : 0.5, (h.final ? 0.82 : 1 + h.combo * 0.05) * (a.tempo < 0.26 ? 1.2 : a.tempo > 0.4 ? 0.85 : 1));
  }
  function comecaMira(h) {
    if ((J.save.inv.flecha || 0) <= 0) { texto(h.x, h.y - 66, 'sem flechas', '#e0b070'); return; }
    h.estado = 'mira'; h.t = 0; h.carga = 0; h.combo = 0; h.cheia = false;
  }
  // para onde a flecha sai: o dedo manda; sem ele, as teclas; sem elas, a mira procura o alvo
  J.anguloMira = function (h, k) {
    const m = J.miraDedo; if (m) return clamp(Math.atan2(Math.sin(m.a), Math.abs(Math.cos(m.a))), -1.25, 0.9);
    if (J.ent.cima) return -0.55; if (J.ent.baixo) return 0.35;
    if (J.pref && J.pref.assist && J.save.nivel !== 'pesadelo') { let q = null, md = 340; for (const e of J.inimigos) { const dx = (e.x - h.x) * h.dir; if (e.vivo && e.estado !== 'caido' && dx > 24 && dx < md && Math.abs(e.y - h.y) < 150) { md = dx; q = e; } } if (q) { const v = 300 + 260 * k, gv = 260 * (1.3 - k), dx = Math.abs(q.x - h.x) - 20, dy = q.y - q.h * 0.55 - (h.y - 41), tt = dx / v; return clamp(Math.atan2(dy - gv * tt * tt / 2, dx), -0.8, 0.6); } }
    return -0.05;
  };
  function soltaFlecha(h) {
    const k = clamp(h.t / 0.8, 0.25, 1), s = J.save;
    s.inv.flecha--; gasta(h, 8 + k * 6);
    const ang = J.anguloMira(h, k), v = 300 + 260 * k;
    J.balas.push({ dono: 'h', tipo: 'flecha', x: h.x + h.dir * 20, y: h.y - 41, vx: h.dir * v * Math.cos(ang), vy: v * Math.sin(ang), grav: 260 * (1.3 - k), r: 4, dano: h.ficha.dano * (0.5 + k), vida: 2, cor: '#e8d8b0', forte: k > 0.95, flecha: true });
    h.estado = 'soltou'; h.t = 0; som('golpe', 0.6, 1.6);
    if (k > 0.95) J.anel(h.x + h.dir * 24, h.y - 41, 12, '#fff1c8', 0.2, 2);
  }
  function soltaForte(h) {
    if (h.ficha.arma.tiro) { // três flechas em leque
      const kk = clamp(h.carga / 0.9, 0.2, 1), s = J.save; s.inv.flecha -= 3; gasta(h, 26); for (const a of [-0.22, -0.04, 0.14]) { const v = 320 + 220 * kk; J.balas.push({ dono: 'h', tipo: 'flecha', x: h.x + h.dir * 20, y: h.y - 41, vx: h.dir * v * Math.cos(a), vy: v * Math.sin(a), grav: 260 * (1.3 - kk), r: 4, dano: h.ficha.dano * (0.45 + kk * 0.75), vida: 2, cor: '#e8d8b0', forte: kk > 0.95, flecha: true }); } h.estado = 'soltou'; h.t = 0; som('golpe', 0.7, 1.4); return;
    }
    const k = clamp(h.carga / 0.9, 0, 1);
    J.golpeId++; h.estado = 'forte'; h.t = 0; h.acertou = new Set(); h.dur = 0.46; h.forcaCarga = k; h.dirGolpe = 'frente'; h.bateu = false; h.combo = 99; h.final = true; h.pesado = C.ESTILOS[h.ficha.arma.per].pesado;
    gasta(h, 20 + k * 12);
    h.vx = h.dir * (140 + 180 * k);
    // cada arma solta a carga do seu jeito
    if (h.pesado === 'passa') { h.vx = h.dir * (420 + 160 * k); h.dur = 0.34; h.inv = Math.max(h.inv, 0.3); }
    else if (h.pesado === 'carga') { h.vx = h.dir * (380 + 170 * k); h.dur = 0.44; }
    else if (h.pesado === 'salto') { h.vx = h.dir * (170 + 110 * k); h.vy = -300 - 90 * k; h.noChao = false; h.dur = 0.62; h.racha = true; }
    else if (h.pesado === 'giro') { h.vx = h.dir * 90; h.dur = 0.5; }
    else if (h.pesado === 'gancho') { h.vx = h.dir * (190 + 80 * k); h.dur = 0.4; }
    som('forte', 0.8, 1 - k * 0.2);
    if (k > 0.95) { treme(3); J.anel(h.x + h.dir * 20, h.y - 30, 34, '#ffe2a0', 0.3, 3); }
  }
  function lancaMagia(h, id) {
    const M = C.MAGIAS[id];
    if (!M || (h.espera[id] || 0) > 0) return;
    if (h.sina < M.custo) { texto(h.x, h.y - 66, 'falta Sina', '#ffb070'); return; }
    h.sina -= M.custo; h.espera[id] = M.espera;
    h.estado = 'magia'; h.t = 0; h.dur = 0.46; h.magia = id; h.magiaFeita = false;
    if (h.noChao) h.vx = 0; else h.vy = Math.min(h.vy, -60);
    sopro('sina'); fx({ tipo: 'circulo', x: h.x, y: h.y, vida: 0.7, max: 0.7, cor: M.cor, tam: 30 });
  }
  function soltaMagia(h) {
    const id = h.magia, M = C.MAGIAS[id], k = h.ficha.magia, d = h.dir;
    const mx = h.x + d * 30, my = h.y - 40;
    J.anel(mx, my, 20, M.cor, 0.3, 2); J.faiscas(mx, my, 10, M.cor, 0.8, 'brasa'); J.treina('magia', 3);
    if (id === 'brasa') {
      // procura o alvo mais perto à frente, para a brasa descer até bicho baixo
      let alvo = null; for (const e of J.inimigos) { const dx = (e.x - h.x) * d; if (e.vivo && e.estado !== 'caido' && dx > 0 && dx < 300 && Math.abs(e.y - h.y) < 90 && (!alvo || dx < (alvo.x - h.x) * d)) alvo = e; }
      const vyb = alvo ? clamp(((alvo.y - alvo.h * 0.5 - my) / Math.max(24, Math.abs(alvo.x - mx))) * 360, -220, 320) : 0;
      J.balas.push({ dono: 'h', tipo: 'brasa', x: mx - d * 14, y: my, vx: d * 360, vy: vyb, r: 8, dano: 34 * k * (1 - 0.25 * (J.cl ? J.cl('chuva', 'tempestade') : 0)), vida: 1.3, cor: M.cor, explode: 38 }); som('fogo', 0.7); h.vx = -d * 60; }
    else if (id === 'vento') { h.vento = 6; som('magia', 0.6, 1.3); J.faiscas(h.x, h.y - 20, 20, M.cor, 1); }
    else if (id === 'espinhos') { for (const a of [-0.14, 0, 0.14]) J.balas.push({ dono: 'h', tipo: 'espinho', x: mx, y: my, vx: d * 420 * Math.cos(a), vy: 420 * Math.sin(a), r: 6, dano: 22 * k, vida: 0.8, cor: M.cor, fura: true, ja: new Set() }); som('magia', 0.7, 1.2); }
    else if (id === 'folego') { const cura = Math.round(h.ficha.vida * 0.33); h.hp = Math.min(h.ficha.vida, h.hp + cura); h.vigor = h.ficha.vigor; texto(h.x, h.y - 66, '+' + cura, '#9cff8a', true); som('beber', 0.6, 1.2); for (let i = 0; i < 26; i++) fx({ tipo: 'alma', x: h.x + rnd(-18, 18), y: h.y - rnd(0, 50), vy: rnd(-70, -20), vida: 0.9, max: 0.9, cor: '#ffe39a', tam: 2 }); }
    else if (id === 'tremor') { if (!h.noChao) { h.vy = 560; h.tremorNoAr = true; } else ondas(h); }
  }
  // machado: o chão racha dos dois lados; porrete: a pancada corre para a frente
  function rachaChao(h) {
    const k = h.forcaCarga || 0, x = h.x + h.dir * 24; treme(7 + k * 3); som('quebra', 0.9, 0.65); J.faiscas(x, h.y - 2, 22, '#8a7458', 1.4, 'pedra'); poeira(x, h.y, 12, 0);
    for (const d of [-1, 1]) J.magias.push({ tipo: 'onda', x, y: h.y, d, t: 0, dur: 0.36, alc: 70 + 60 * k, dano: h.ficha.dano * (0.5 + 0.5 * k), ja: new Set(), cor: '#c8a878' });
    h.acertou = new Set(); for (const e of J.inimigos) if (e.vivo && Math.abs(e.x - x) < 46 + e.w / 2 && Math.abs(e.y - h.y) < 50) feriInimigo(e, h.ficha.dano * (1.6 + k * 1.4), Math.sign(e.x - h.x) || 1, { carregado: k > 0.35, forte: true, quebra: h.ficha.arma.quebra * (2 + k * 2), y: h.y - 20 });
  }
  function ondas(h) {
    treme(7); som('quebra', 0.8, 0.7);
    for (const d of [-1, 1]) J.magias.push({ tipo: 'onda', x: h.x, y: h.y, d, t: 0, dur: 0.75, dano: 26 * h.ficha.magia, ja: new Set(), cor: '#d8b070' });
    J.faiscas(h.x, h.y - 2, 24, '#a08060', 1.4, 'pedra');
  }

  // ---------- herói: um quadro ----------
  function passoHeroi(dt) {
    const h = J.heroi, e = J.ent, f = h.ficha, s = J.save;
    h.t += dt; h.inv = Math.max(0, h.inv - dt); h.vento = Math.max(0, h.vento - dt); h.degrau = Math.max(0, (h.degrau || 0) - dt);
    for (const k in h.espera) h.espera[k] = Math.max(0, h.espera[k] - dt);
    h.amassa = Math.max(0, h.amassa - dt * 5); h.virou = Math.max(0, h.virou - dt);
    h.semVigor -= dt;
    if (h.semVigor <= 0 && !['golpe', 'forte', 'rola', 'carga', 'mira'].includes(h.estado)) h.vigor = Math.min(f.vigor, h.vigor + (s.fome < 15 ? 24 : 46) * (J.cl && J.cl('neve') > 0.4 && ['barro', 'folhas'].includes(s.roupa) && !s.tochaAcesa && !J.abrigado() ? 0.62 : 1) * dt);
    h.lerdo = Math.max(0, (h.lerdo || 0) - dt);
    if (h.estado === 'dorme') { h.vx = 0; h.vy = Math.min(QUEDA, h.vy + G * dt); mover(h, dt); return; }
    if (h.estado === 'morto' || h.estado === 'nasce') { h.vy = Math.min(QUEDA, h.vy + G * dt); h.vx *= 0.9; mover(h, dt); return; }
    // fome e veneno
    s.fome = Math.max(0, s.fome - (dt / 9) * (amu('raiz') ? 0.6 : 1)); s.tempo += dt;
    if (s.tocha > 0 && s.tochaAcesa) { s.tocha -= dt; if (s.tocha <= 0) { s.tocha = 0; s.tochaAcesa = false; texto(h.x, h.y - 74, 'a tocha apagou', '#c8a060'); } }
    if (amu('brasa') && h.hp < f.vida) { h.brT = (h.brT || 0) + dt; if (h.brT > 2) { h.brT = 0; if (!J.inimigos.some((e) => e.vivo && e.estado !== 'vaga' && Math.abs(e.x - h.x) < 260)) h.hp = Math.min(f.vida, h.hp + 1); } }
    if (s.fome <= 0) { h.fomeT = (h.fomeT || 0) + dt; if (h.fomeT > 2) { h.fomeT = 0; h.hp -= 2; texto(h.x, h.y - 62, 'fome', '#c8a060'); if (h.hp <= 0) { h.hp = 0; J.morrer('fome'); return; } } }
    if (h.veneno > 0) { h.veneno -= dt; h.venT += dt; if (h.venT > 0.7) { h.venT = 0; h.hp -= 2; texto(h.x, h.y - 62, 2, '#b8e060'); J.faiscas(h.x, h.y - 30, 3, '#b8e060', 0.4, 'brasa'); if (h.hp <= 0) { h.hp = 0; J.morrer('cobra'); return; } } }

    const eixo = (e.dir ? 1 : 0) - (e.esq ? 1 : 0);
    const vel = CORRE * f.vel * (h.vento > 0 ? 1.35 : 1) * (h.lerdo > 0 ? 0.45 : 1);
    const livre = h.estado === 'livre';
    h.coyote = h.noChao ? 0.11 : h.coyote - dt;
    if (h.noChao) { h.arDash = true; if (tipoEm(h.x, h.y + 2) === 1 && !beiraEspinho(h)) h.ultimoSeguro = { x: h.x, y: h.y }; }

    if (livre || h.estado === 'come') {
      const alvo = eixo * vel * (h.estado === 'come' ? 0.3 : 1);
      const vira = eixo && Math.sign(h.vx) === -eixo;
      const ac = h.noChao ? (eixo ? (vira ? 2600 : 1300) : 1700) : eixo ? 1100 : 500;
      if (alvo > h.vx) h.vx = Math.min(alvo, h.vx + ac * dt); else h.vx = Math.max(alvo, h.vx - ac * dt);
      if (eixo && livre) { if (h.dir !== eixo && h.noChao && Math.abs(h.vx) > 90) { poeira(h.x, h.y, 4, -eixo); h.virou = 0.12; } h.dir = eixo; }
    } else if (h.estado === 'golpe' || h.estado === 'magia') {
      if (h.noChao) h.vx *= Math.pow(h.investida ? 0.02 : 0.0008, dt); else h.vx += (eixo * vel * 0.8 - h.vx) * Math.min(1, dt * 8);
    } else if (h.estado === 'forte') h.vx *= Math.pow(0.002, dt);
    else if (['carga', 'mira', 'soltou', 'colhe', 'pesca'].includes(h.estado)) { if (h.noChao) h.vx *= Math.pow(0.0001, dt); }
    else if (h.estado === 'dor') h.vx *= Math.pow(0.05, dt);

    // pular
    const podePular = livre || (h.estado === 'golpe' && h.t > h.dur * 0.55) || h.estado === 'colhe';
    if (podePular && J.ja.pula > 0) {
      if (e.baixo && h.noChao && tipoEm(h.x, h.y + 2) === 2) { h.desce = true; h.y += 2; h.noChao = false; h.grudado = false; J.ja.pula = 0; h.desceT = 0.25; }
      else if (h.coyote > 0) {
        J.ja.pula = 0; h.vy = -PULO * f.pulo; h.coyote = 0; h.noChao = false; h.grudado = false; h.estado = 'livre';
        sopro('pulo'); poeira(h.x, h.y, 6, 0); J.treina('pernas', 0.35);
      }
    }
    if (h.desceT > 0) { h.desceT -= dt; if (h.desceT <= 0) h.desce = false; }
    if (!e.pula && h.vy < -130 && (h.estado === 'livre' || h.estado === 'golpe')) h.vy *= Math.pow(0.0006, dt);

    // esquiva
    const podeRolar = livre || ['come', 'colhe', 'mira', 'carga'].includes(h.estado) || (h.estado === 'golpe' && h.t > h.dur * 0.4) || (h.estado === 'magia' && h.t > 0.25);
    if (podeRolar && J.ja.rola > 0 && (h.noChao || h.arDash)) {
      J.ja.rola = 0;
      if (h.vigor > 0) {
        if (!h.noChao) h.arDash = false;
        if (eixo) h.dir = eixo;
        h.estado = 'rola'; h.t = 0; h.noAr = !h.noChao; h.esquivou = false; h.carga = 0; h.cheia = false;
        gasta(h, f.rola); J.treina('folego', 0.6); sopro('esquiva'); if (h.noChao) poeira(h.x, h.y, 5, -h.dir);
      } else texto(h.x, h.y - 66, 'sem fôlego', '#9fc49a');
    }
    if (h.estado === 'rola') {
      const D = h.noAr ? (amu('pena') ? 0.32 : 0.26) : 0.42, k = h.t / D;
      h.vx = h.dir * (h.noAr ? 360 : 290) * (k < 0.7 ? 1 : 0.55);
      if (h.noAr) h.vy = Math.min(h.vy, 20);
      if (h.noAr && (h.t * 60 | 0) % 3 === 0) J.rastro.push({ x: h.x, y: h.y, dir: h.dir, anim: 'rola', q: 0, vida: 0.22, max: 0.22, cor: '#c8744a' });
      if (h.t > D) { h.estado = 'livre'; h.t = 0; }
    }
    if (h.vento > 0 && Math.abs(h.vx) > 80 && Math.random() < 0.35) J.rastro.push({ x: h.x, y: h.y, dir: h.dir, anim: h.anim || 'correr', q: h.quadro || 0, vida: 0.2, max: 0.2, cor: '#9fd8ff' });

    // investida: golpear no meio da esquiva
    if (h.estado === 'rola' && h.t > 0.12 && !h.noAr && J.ja.golpe > 0 && h.vigor > 0 && !f.arma.tiro) {
      J.ja.golpe = 0; h.combo = 0; comecaGolpe(h); h.investida = true; h.dirGolpe = 'frente'; h.dur = f.arma.tempo * 1.25; h.vx = h.dir * 300; h.combo = 1; h.final = false;
      J.rastro.push({ x: h.x, y: h.y, dir: h.dir, anim: 'golpe1', q: 2, vida: 0.25, max: 0.25, cor: '#ffe2a0' });
    }
    if (J.pref && J.pref.repete && e.golpe && !f.arma.tiro && !(J.ja.golpe > 0)) { h.segura = (h.segura || 0) + dt; if (h.segura > 0.28 && ((h.estado === 'livre' && h.noChao) || (h.estado === 'golpe' && h.t > h.dur * 0.5)) && h.vigor > f.arma.custo * 1.2) J.ja.golpe = 0.1; } else if (!e.golpe) h.segura = 0;
    const podeGolpe = h.estado === 'livre' || h.estado === 'colhe' || (h.estado === 'golpe' && h.t > h.dur * 0.6);
    if (h.estado === 'golpe' && h.t > h.dur * 0.25 && J.ja.golpe > 0 && h.combo < (h.maxCombo || 3)) { h.fila = 1; J.ja.golpe = 0; }
    if (podeGolpe && (usa('golpe') || (h.estado === 'golpe' && h.fila))) {
      if (h.estado !== 'golpe' && h.desde > 0.35) h.combo = 0;
      if (eixo) h.dir = eixo;
      comecaGolpe(h);
    }
    h.desde = h.estado === 'golpe' ? 0 : (h.desde || 0) + dt;
    if (h.estado === 'mira') { if (eixo) h.dir = eixo; if (h.t > 0.8 && !h.cheia) { h.cheia = true; J.anel(h.x + h.dir * 22, h.y - 41, 14, '#fff1c8', 0.25, 2); som('magia', 0.3, 1.7); } if (!e.golpe && h.t > 0.22) { h.cheia = false; soltaFlecha(h); } }
    if (h.estado === 'soltou' && h.t > 0.25) { h.estado = 'livre'; h.t = 0; }
    if (h.estado === 'livre' && e.forte && h.vigor > 0 && h.noChao && !(J.ja.golpe > 0) && (!f.arma.tiro || (s.inv.flecha || 0) >= 3)) { h.estado = 'carga'; h.t = 0; h.carga = 0; sopro('carga'); }
    if (h.estado === 'carga') {
      h.carga += dt;
      if (h.carga > 0.9 && !h.cheia) { h.cheia = true; J.anel(h.x, h.y - 30, 34, '#ffe2a0', 0.3, 2); som('magia', 0.35, 1.6); }
      if (Math.random() < 0.6) fx({ tipo: 'alma', x: h.x + rnd(-30, 30), y: h.y - rnd(0, 56), alvo: true, vida: 0.4, max: 0.4, cor: h.cheia ? '#ffe2a0' : '#ff9a50', tam: 1.8 });
      if (eixo) h.dir = eixo;
      if (!e.forte) { h.cheia = false; soltaForte(h); }
    }
    if ((h.estado === 'golpe' || h.estado === 'forte') && h.t > h.dur) { h.estado = 'livre'; h.t = 0; }
    if (h.estado === 'golpe' || h.estado === 'forte') {
      const k = h.t / h.dur;
      if (h.estado === 'forte' && h.pesado === 'salto') { if (h.racha && k > 0.95) h.t = h.dur * 0.94; }
      else if (k > (h.estado === 'forte' && ['passa', 'carga'].includes(h.pesado) ? 0.05 : 0.22) && k < (h.estado === 'forte' && ['passa', 'carga'].includes(h.pesado) ? 0.85 : 0.62)) acertaComGolpe(h);
      if (h.estado === 'forte' && h.pesado === 'onda' && !h.ondaFeita && k > 0.45 && h.noChao) { h.ondaFeita = true; J.magias.push({ tipo: 'onda', x: h.x + h.dir * 26, y: h.y, d: h.dir, t: 0, dur: 0.5, alc: 120 + 130 * (h.forcaCarga || 0), dano: f.dano * (0.6 + 0.6 * (h.forcaCarga || 0)), ja: new Set(), cor: '#d8b070' }); } else if (h.estado !== 'forte') h.ondaFeita = false;
      if (h.estado === 'forte' && ['passa', 'carga'].includes(h.pesado) && k < 0.7) { h.vx = h.dir * Math.max(260, Math.abs(h.vx)); if ((h.t * 60 | 0) % 3 === 0) J.rastro.push({ x: h.x, y: h.y, dir: h.dir, anim: 'golpe1', q: 2, vida: 0.22, max: 0.22, cor: '#ffe2a0' }); }
      // o terceiro golpe pesado e o forte batem no chão
      if (!h.bateu && h.noChao && k > 0.45 && ((h.estado === 'forte' && !['passa', 'carga', 'salto', 'giro', 'gancho'].includes(h.pesado)) || (h.estado === 'golpe' && h.final && f.arma.quebra >= 1.4))) { h.bateu = true; const bx = h.x + h.dir * 26; J.faiscas(bx, h.y - 2, h.estado === 'forte' ? 18 : 8, '#8a7458', 1, 'pedra'); poeira(bx, h.y, 7, h.dir); treme(h.estado === 'forte' ? 5 : 3); som('quebra', 0.4, 0.8); }
    }
    // magia
    if ((h.estado === 'livre' || (h.estado === 'golpe' && h.t > h.dur * 0.5)) && s.magias.length) { if (usa('magia1')) lancaMagia(h, s.magias[0]); else if (s.magia2 && usa('magia2')) lancaMagia(h, s.magia2); }
    if (h.estado === 'magia') { if (!h.magiaFeita && h.t > 0.22) { h.magiaFeita = true; soltaMagia(h); } if (h.t > h.dur) { h.estado = 'livre'; h.t = 0; } }
    if (h.estado === 'livre' && usa('come')) J.comer();
    if (h.estado === 'come' && h.t > 0.55) { h.estado = 'livre'; h.t = 0; }
    if (h.estado === 'colhe') { if (!h.pegou && h.t > 0.22) { h.pegou = true; J.recolhe(h.alvo); } if (h.t > 0.42) { h.estado = 'livre'; h.t = 0; } }
    if (h.estado === 'pesca' && (eixo || J.ja.rola > 0 || J.ja.pula > 0) && h.t > 0.3) { h.estado = 'livre'; h.t = 0; }
    if (h.estado === 'dor' && h.t > 0.34) { h.estado = 'livre'; h.t = 0; }

    // gravidade e movimento
    const noAr = !h.noChao;
    if (!(h.estado === 'rola' && h.noAr)) h.vy = Math.min(QUEDA, h.vy + G * dt * (h.vy > 0 ? 1.18 : Math.abs(h.vy) < 60 ? 0.65 : 1));
    if (h.estado === 'magia' && noAr) h.vy = Math.min(h.vy, 60);
    const vyAntes = h.vy, xAntes = h.x;
    mover(h, dt);
    const fez = Math.abs(h.x - xAntes);
    h.andou += fez; s.distancia += fez; if (fez > 0) J.treina('pernas', fez * 0.0012);
    if (noAr && h.noChao) {
      h.amassa = Math.min(1, vyAntes / 520);
      if (vyAntes > 250) { sopro('pouso'); poeira(h.x, h.y, 5 + vyAntes / 90, 0); if (vyAntes > 560) treme(2); }
      if (h.racha) { h.racha = false; h.estado = 'forte'; h.t = h.dur * 0.75; rachaChao(h); }
      if (h.tremorNoAr) { h.tremorNoAr = false; ondas(h); }
      if (h.estado === 'golpe' && h.dirGolpe === 'baixo') { h.estado = 'livre'; h.t = 0; }
    }
    if (h.naParede && h.estado === 'rola') { h.estado = 'livre'; h.t = 0; }
    h.passoT = (h.passoT || 0) - dt;
    if (h.noChao && Math.abs(h.vx) > 90 && h.passoT <= 0 && h.estado === 'livre') { h.passoT = 0.26; poeira(h.x - h.dir * 6, h.y, 1, -h.dir); passo(h); }
    if (tipoEm(h.x, h.y - 2) === 3 || tipoEm(h.x, h.y + 1) === 3) {
      h.inv = 0; J.feriHeroi(18 / (1 - h.ficha.def), h.x, 'espinhos');
      if (h.estado !== 'morto') { const q = h.ultimoSeguro; h.x = q.x; h.y = q.y; h.vx = 0; h.vy = 0; h.estado = 'livre'; h.inv = 1.2; J.clarao = 0.5; J.faiscas(h.x, h.y - 26, 14, '#c9a45a', 0.8, 'brasa'); }
    }
    if (h.y > F.H * T + 60) { const q = h.ultimoSeguro; h.x = q.x; h.y = q.y; h.vy = 0; }
  }
  // o pé muda com o chão: mato, lama, neve, pedra, terra batida e madeira
  function passo(h) {
    const r = F.atual.regiao, galho = tipoEm(h.x, h.y + 2) === 2, w = window.Som; if (!w) return;
    if (galho) som('madeira', 0.12, 1.5); else if (J.abrigado && J.abrigado()) som('passop', 0.3, 1); else if (r === 'cobras' || (J.cl && J.cl('chuva', 'tempestade') > 0.6)) som('lama', 0.2, 1.3); else if (r === 'lobos') w.sopro('neve'); else if (r === 'zumbis') som('passop', 0.22, 0.85); else if (r === 'goblins') w.sopro('terra'); else w.sopro('mato');
    if (['osso', 'prata'].includes(J.save.roupa) && Math.random() < 0.5) som('malha', 0.09, J.save.roupa === 'osso' ? 1.6 : 1.1);
  }
  function beiraEspinho(h) { for (const dx of [-26, 26]) if (tipoEm(h.x + dx, h.y + 70) === 3 || tipoEm(h.x + dx, h.y + 2) === 3 || tipoEm(h.x + dx, h.y + 2) === 0) return true; return false; }
  function acertaComGolpe(h) {
    const cx = golpeCaixa(h), f = h.ficha, forte = h.estado === 'forte';
    const mult = forte ? 1.6 + (h.forcaCarga || 0) * 1.3 : h.investida ? 1.4 : h.dirGolpe === 'frente' && h.pg ? h.pg.d : 1;
    for (const e of J.inimigos) {
      if (!e.vivo || h.acertou.has(e) || !cruza(cx, caixa(e))) continue;
      h.acertou.add(e);
      feriInimigo(e, f.dano * mult, h.dir, { carregado: forte && h.forcaCarga > 0.35, forte: forte || h.final, quebra: f.arma.quebra * (forte ? 2 + (h.forcaCarga || 0) * 2 : (h.pg && h.pg.q) || 1), empurra: forte ? 2 : 1, y: h.y - 34 });
      if (forte && h.pesado === 'gancho' && !e.T.chefe && !e.T.bruto && e.vivo) { e.vy = -330; e.noChao = false; e.esq = 0; }
      if (h.dirGolpe === 'baixo') { h.vy = -430; h.arDash = true; h.estado = 'livre'; h.t = 0; J.anel(h.x, h.y + 6, 18, '#fff1c8', 0.25, 2); }
    }
    for (const fr of F.atual.fracas) if (!J.save.fracas[fr.id] && !h.acertou.has(fr) && (h.dirGolpe === 'baixo' || forte || h.final) && cruza({ x0: cx.x0, x1: cx.x1, y0: cx.y0, y1: cx.y1 + 18 }, { x0: fr.c0 * T, x1: (fr.c1 + 1) * T, y0: fr.y0 * T, y1: (fr.y1 + 1) * T })) { h.acertou.add(fr); J.bateFraca(fr, forte ? 2 : 1); if (h.dirGolpe === 'baixo') { h.vy = -260; h.estado = 'livre'; h.t = 0; } }
    if (h.dirGolpe === 'baixo' && !h.acertou.has('chao') && tipoEm(h.x, cx.y1) === 3) { h.acertou.add('chao'); h.vy = -430; h.arDash = true; J.faiscas(h.x, h.y + 10, 8, '#fff', 0.8); som('quebra', 0.4, 1.6); }
    for (const b of J.balas) if (b.dono === 'i' && cruza(cx, { x0: b.x - b.r, x1: b.x + b.r, y0: b.y - b.r, y1: b.y + b.r })) { b.dono = 'h'; b.vx = -b.vx * 1.4; b.vy = -Math.abs(b.vy) * 0.4; b.dano *= 1.6; b.cor = '#ffe2a0'; J.faiscas(b.x, b.y, 10, '#ffe2a0', 1); som('quebra', 0.5, 1.5); J.pausa = 0.06; }
  }

  // ---------- balas, magias, espólio no chão ----------
  function passoBalas(dt) {
    const h = J.heroi;
    for (const b of J.balas) {
      b.vida -= dt; b.vy += (b.grav || 0) * dt;
      if (b.segue && b.dono === 'i') { const a = Math.atan2(h.y - 34 - b.y, h.x - b.x), v = Math.hypot(b.vx, b.vy); let da = a - Math.atan2(b.vy, b.vx); da = Math.atan2(Math.sin(da), Math.cos(da)); const n = Math.atan2(b.vy, b.vx) + clamp(da, -b.segue * dt, b.segue * dt); b.vx = Math.cos(n) * v; b.vy = Math.sin(n) * v; } b.x += b.vx * dt; b.y += b.vy * dt;
      if (!b.flecha && b.tipo !== 'pedra' && Math.random() < 0.8) fx({ tipo: 'brasa', x: b.x + rnd(-3, 3), y: b.y + rnd(-3, 3), vx: -b.vx * 0.12 + rnd(-14, 14), vy: rnd(-30, 14), vida: 0.4, max: 0.4, cor: b.cor, tam: rnd(1.2, 2.8) });
      if (solido(b.x, b.y)) {
        b.vida = 0;
        if (b.flecha) { if (Math.random() < (b.inimiga ? 0.25 : 0.55)) J.restos.push({ m: 'flecha', x: b.x - Math.sign(b.vx) * 8, y: b.y - 4, vx: 0, vy: 0, w: 6, h: 8, t: 0 }); J.faiscas(b.x, b.y, 4, '#c8b08a', 0.5); } else { if (b.estoura || b.poca) J.caiuBala(b); estoura(b); }
        continue;
      }
      const bx = { x0: b.x - b.r, x1: b.x + b.r, y0: b.y - b.r, y1: b.y + b.r };
      if (b.dono === 'h') {
        for (const e of J.inimigos) {
          if (!e.vivo || e.estado === 'caido' || (b.ja && b.ja.has(e)) || !cruza(bx, caixa(e))) continue;
          feriInimigo(e, b.dano, Math.sign(b.vx) || 1, b.deHum ? { magia: true, deHum: true, quebra: 0.6, y: b.y } : b.flecha ? { deLonge: true, forte: b.forte, quebra: 0.8, y: b.y } : { magia: true, forte: true, quebra: 2, y: b.y });
          if (b.fura) b.ja.add(e); else { b.vida = 0; if (!b.flecha) estoura(b); break; }
        }
      } else if (cruza(bx, caixa(h)) && h.estado !== 'dorme' && J.feriHeroi(b.dano, b.x, b.quem, { veneno: b.veneno })) { b.vida = 0; if (b.estoura) J.caiuBala(b); if (!b.flecha) estoura(b); }
      else if (J.hum && J.hum.viva && !J.hum.caida && !J.hum.dentro && b.dono === 'i' && cruza(bx, caixa(J.hum)) && J.feriHum(b.dano, b)) b.vida = 0;
    }
    J.balas = J.balas.filter((b) => b.vida > 0);
  }
  function estoura(b) {
    J.faiscas(b.x, b.y, b.explode ? 24 : 10, b.cor, b.explode ? 1.5 : 0.9, 'brasa');
    J.anel(b.x, b.y, b.explode || 12, b.cor, 0.3, 3);
    if (b.explode) {
      fx({ tipo: 'bola', x: b.x, y: b.y, vida: 0.28, max: 0.28, tam: b.explode, cor: b.cor });
      for (const e of J.inimigos) if (e.vivo && Math.hypot(e.x - b.x, e.y - e.h / 2 - b.y) < b.explode + e.w / 2) feriInimigo(e, b.dano * 0.5, Math.sign(e.x - b.x) || 1, { magia: true });
      treme(4); som('fogo', 0.6, 1.1);
    }
  }
  function passoMagias(dt) {
    const h = J.heroi;
    for (const m of J.magias) {
      m.t += dt;
      if (J.passoMagiaDono) J.passoMagiaDono(m);
      if (m.tipo === 'raio') J.passoRaio(m);
      if (m.tipo === 'onda') {
        const k = m.t / m.dur, px = m.x + m.d * k * (m.alc || 210); m.px = px;
        if (Math.random() < 0.8) fx({ tipo: 'pedra', x: px + rnd(-4, 4), y: m.y - 2, vx: m.d * rnd(0, 40), vy: rnd(-220, -90), grav: 700, vida: 0.5, max: 0.5, cor: m.inimiga ? '#8a6a50' : '#8a7458', tam: rnd(1.5, 4) });
        const box = { x0: px - 12, x1: px + 12, y0: m.y - 30, y1: m.y + 2 };
        if (m.inimiga) { if (!m.ja.has('h') && cruza(box, caixa(h))) { m.ja.add('h'); J.feriHeroi(m.dano, px - m.d * 10, m.quem); } }
        else for (const e of J.inimigos) if (e.vivo && !m.ja.has(e) && cruza(box, caixa(e))) { m.ja.add(e); feriInimigo(e, m.dano, m.d, { magia: true, forte: true, quebra: 3 }); if (!e.T.chefe) e.vy = -220; }
        if (solido(px + m.d * 8, m.y - 22)) m.t = m.dur;
      } else if (m.tipo === 'gas') {
        if (Math.random() < 0.6) fx({ tipo: 'nuvem', x: m.x + rnd(-m.raio, m.raio), y: m.y - rnd(0, 34), vx: rnd(-8, 8), vy: rnd(-12, -2), vida: 0.9, max: 0.9, cor: '140,170,60', tam: rnd(9, 18) });
        m.tic = (m.tic || 0) - dt;
        if (m.tic <= 0) { m.tic = 0.5; if (Math.abs(h.x - m.x) < m.raio && Math.abs(h.y - m.y) < 60 && h.inv <= 0 && h.estado !== 'rola') { h.veneno = Math.max(h.veneno, 2.5); h.hp -= m.dano * 0.5; texto(h.x, h.y - 62, Math.ceil(m.dano * 0.5), '#b8e060'); if (h.hp <= 0) { h.hp = 0; J.morrer(m.quem || 'zumbi'); } } }
      } else if (m.tipo === 'maos') {
        if (m.t < 0) { if (Math.random() < 0.4) fx({ tipo: 'pedra', x: m.x + rnd(-10, 10), y: m.y - 1, vy: rnd(-70, -20), grav: 500, vida: 0.4, max: 0.4, cor: '#5a4a58', tam: 2 }); }
        else if (m.t < m.dur * 0.6 && !m.ja.has('h') && cruza({ x0: m.x - 14, x1: m.x + 14, y0: m.y - 46, y1: m.y }, caixa(h))) { m.ja.add('h'); J.feriHeroi(m.dano, m.x, 'carcereiro'); }
      }
    }
    J.magias = J.magias.filter((m) => m.t < m.dur);
  }
  function passoRestos(dt) {
    const h = J.heroi;
    for (const r of J.restos) {
      r.t += dt;
      const d = Math.hypot(h.x - r.x, h.y - 26 - r.y);
      if (r.t < 0.5 || d > 46) { r.vy = Math.min(400, r.vy + 900 * dt); r.vx *= Math.pow(0.1, dt); mover(r, dt); }
      else { const a = Math.atan2(h.y - 26 - r.y, h.x - r.x); r.x += Math.cos(a) * 260 * dt; r.y += Math.sin(a) * 260 * dt; if (d < 14) { r.pego = true; J.ganha(r.m, 1, r.x, r.y); } }
    }
    J.restos = J.restos.filter((r) => !r.pego && r.t < 60);
  }

  // ---------- coleta, comida, criação ----------
  J.ganha = function (m, q, x, y) {
    const s = J.save, h = J.heroi; s.inv[m] = (s.inv[m] || 0) + q;
    som('pegar', 0.5, 1.1); for (let k = 0; k < 4; k++) fx({ tipo: 'alma', x: (x == null ? h.x : x) + rnd(-8, 8), y: (y == null ? h.y - 40 : y) - rnd(0, 12), alvo: true, vida: 0.45, max: 0.45, cor: '#ffe9b0', tam: 1.8 });
    avisa('ganhou', m, q);
  };
  J.colhidos = {}; // id -> segundos até brotar de novo
  const TEM_MACHADO = () => J.save.armas.includes('machado') || J.save.armas.includes('machado_ferro');
  J.colher = function (c) { const h = J.heroi; if (h.estado !== 'livre') return; if (c.m === 'madeira' && !TEM_MACHADO()) { texto(h.x, h.y - 66, 'precisa de um machado', '#e0b070'); return; } h.estado = 'colhe'; h.t = 0; h.alvo = c; h.pegou = false; h.dir = Math.sign(c.x - h.x) || h.dir; h.vx = 0; };
  J.recolhe = function (c) {
    if (!c || J.colhidos[c.id] > 0) return;
    if (c.m === 'madeira') { c.talho = (c.talho || 0) + 1; som('minerar', 0.7, 0.8); J.faiscas(c.x, c.y - 26, 10, '#a8804a', 0.9, 'pedra'); treme(2); if (c.talho < 3) { J.treina('coleta', 1.5); return; } c.talho = 0; J.ganha('madeira', 2 + (J.nivel('coleta') > 4 ? 1 : 0), c.x, c.y - 30); J.ganha('galho', 1, c.x, c.y - 12); J.colhidos[c.id] = 240; J.save.colhido++; J.treina('coleta', 6); return; }
    J.colhidos[c.id] = 150; J.save.colhido++;
    const q = 1 + (Math.random() < 0.25 + J.nivel('coleta') * 0.05 ? 1 : 0);
    J.ganha(c.m, q, c.x, c.y - 10); J.faiscas(c.x, c.y - 10, 8, '#a8c080', 0.6, 'folha'); J.treina('coleta', 3);
  };
  J.comer = function (qual) {
    const s = J.save, h = J.heroi;
    const ferido = h.hp < h.ficha.vida * 0.55 || h.veneno > 0;
    const ordem = qual ? [qual] : ferido ? ['curativo', 'erva', 'seca', 'peixe', 'carne', 'fruta'] : ['fruta', 'peixe', 'seca', 'carne'];
    const m = ordem.find((k) => s.inv[k] > 0);
    if (!m) { texto(h.x, h.y - 66, 'nada para comer', '#c9bfa2'); return false; }
    const c = C.COMER[m]; s.inv[m]--;
    const cu = J.nv ? J.nv().cura : 1; s.fome = Math.min(100, s.fome + c.fome); h.hp = Math.min(h.ficha.vida, h.hp + Math.round(c.vida * cu)); if (c.cura) h.veneno = 0;
    texto(h.x, h.y - 66, (c.vida ? '+' + Math.round(c.vida * cu) + ' vida ' : '') + (c.fome ? '+' + c.fome + ' fome' : ''), '#9cff8a'); som('beber', 0.6, 1.1);
    if (h.estado === 'livre') { h.estado = 'come'; h.t = 0; }
    return true;
  };
  J.pode = (r) => { for (const m in r.custo) if ((J.save.inv[m] || 0) < r.custo[m]) return false; return nv('oficio') >= (r.oficio || 0); };
  // dois amuletos no pescoço; o terceiro toma o lugar do mais antigo
  J.poeAmuleto = function (id) { const s = J.save; if (!s.amuletos.includes(id)) return; if (s.amu.includes(id)) s.amu = s.amu.filter((a) => a !== id); else { s.amu.push(id); if (s.amu.length > 2) s.amu.shift(); } J.recalcular(); som('pegar', 0.5, 1.2); J.salvar(); };
  J.tocha = function () { const s = J.save, h = J.heroi; if (s.tochaAcesa) { s.tochaAcesa = false; som('golpe', 0.2, 0.6); return; } if (!(s.tocha > 0)) { if (!(s.inv.tocha > 0)) { texto(h.x, h.y - 74, 'sem tocha', '#e0b070'); return; } s.inv.tocha--; s.tocha = 300; } s.tochaAcesa = true; som('fogo', 0.5); J.faiscas(h.x, h.y - 50, 10, '#ff9a40', 0.8, 'brasa'); };
  J.jaTem = (r) => (r.tipo === 'amuleto' && J.save.amuletos.includes(r.id)) || (r.tipo === 'arma' && J.save.armas.includes(r.id)) || (r.tipo === 'roupa' && J.save.roupas.includes(r.id)) || (r.vai === 'afiar' && ((J.save.afiado[J.save.arma] || 0) >= 5 || J.save.arma === 'punho'));
  J.criar = function (r) {
    const s = J.save; if (!J.pode(r) || J.jaTem(r)) return false;
    let peso = 0; for (const m in r.custo) { s.inv[m] -= r.custo[m]; peso += r.custo[m]; }
    if (r.tipo === 'arma') { s.armas.push(r.id); s.arma = r.id; if (r.id === 'arco') s.inv.flecha = (s.inv.flecha || 0) + 6; }
    else if (r.tipo === 'roupa') { s.roupas.push(r.id); s.roupa = r.id; avisa('roupa', r.id); }
    else if (r.tipo === 'amuleto') { s.amuletos.push(r.id); J.poeAmuleto(r.id); }
    else if (r.vai === 'curativo') s.inv.curativo = (s.inv.curativo || 0) + 1;
    else if (r.vai === 'afiar') s.afiado[s.arma] = (s.afiado[s.arma] || 0) + 1;
    else s.inv[r.id] = (s.inv[r.id] || 0) + r.qtd;
    J.treina('oficio', 3 + peso * 1.4); J.recalcular(); som('minerar', 0.7); J.salvar(); avisa('criou', r);
    return true;
  };
  J.empunhar = function (id) { if (!J.save.armas.includes(id) || (J.heroi && J.heroi.estado === 'golpe')) return; J.save.arma = id; J.recalcular(); som(['espada', 'adaga'].includes(id) ? 'saca' : 'pegar', 0.45, 0.9); J.salvar(); avisa('arma', id); };
  J.proximaArma = function () { const l = C.ORDEM_ARMAS.filter((a) => J.save.armas.includes(a)); if (l.length < 2) return; J.empunhar(l[(l.indexOf(J.save.arma) + 1) % l.length]); };
  J.vestir = function (id) { if (!J.save.roupas.includes(id)) return; J.save.roupa = id; J.recalcular(); som(id === 'prata' || id === 'osso' ? 'malha' : 'pano', 0.5, 1); J.salvar(); avisa('roupa', id); };
  J.aprende = function (id) { const s = J.save, h = J.heroi; if (s.magias.includes(id)) return; s.magias.push(id); if (s.magias.length > 1 && !s.magia2) s.magia2 = id; h.sina = 100; som('raro', 0.9); J.clarao = 0.8; treme(6); J.anel(h.x, h.y - 30, 90, C.MAGIAS[id].cor, 1, 4); J.faiscas(h.x, h.y - 30, 50, C.MAGIAS[id].cor, 1.8, 'brasa'); J.salvar(); avisa('magia', id); };

  J.perto = function () {
    const h = J.heroi; if (!h || !h.noChao) return null;
    const A = F.atual, dy = (o, k) => Math.abs(o.y - h.y) < (k || 40);
    const lar = J.pertoLar && J.pertoLar(h); if (lar) return lar;
    for (const c of A.coleta) if (!(J.colhidos[c.id] > 0) && Math.abs(c.x - h.x) < 24 && dy(c, 50)) return { tipo: 'coleta', o: c };
    for (const b of A.baus) if (!J.save.baus[b.id] && Math.abs(b.x - h.x) < 28 && dy(b)) return { tipo: 'bau', o: b };
    for (const c of A.circulos) if (!J.save.magias.includes(c.magia) && Math.abs(c.x - h.x) < 50 && dy(c) && !(A.arena && !J.save.chefes[A.arena.chefe])) return { tipo: 'circulo', o: c };
    if (!J.chefeAtivo && !J.emb && !J.raid) for (const f of A.fogos) if (Math.abs(f.x - h.x) < 30 && dy(f)) return { tipo: 'fogo', o: f };
    if (!J.chefeAtivo && !J.emb && !J.raid) for (const p of A.portas) if (Math.abs(p.x - h.x) < 34 && dy(p)) return { tipo: 'porta', o: p };
    return null;
  };
  // ---------- chão rachado e baús ----------
  J.bateFraca = function (fr, k) {
    fr.hp = (fr.hp == null ? 2 : fr.hp) - k; const x = ((fr.c0 + fr.c1 + 1) / 2) * T, y = fr.y0 * T;
    J.faiscas(x, y, 16, '#8a7c66', 1.2, 'pedra'); treme(4); som('quebra', 0.6, 1);
    if (fr.hp > 0) return;
    fr.hp = null; J.save.fracas[fr.id] = 1; F.aplicaFracas(J.save.fracas); if (window.Desenho) Desenho.repintar(); treme(8); som('quebra', 1, 0.7); for (let i = 0; i < 5; i++) poeira(x + rnd(-26, 26), y + rnd(0, 30), 6, 0);
    J.treina('coleta', 4); avisa('oco', fr); J.salvar();
  };
  const ESPOLIO = { floresta: ['couro', 'fibra', 'erva', 'ferro', 'fruta'], lobos: ['couro', 'presa', 'osso', 'ferro', 'carne'], cobras: ['pele', 'presa', 'erva', 'prata', 'fibra'], zumbis: ['osso', 'ferro', 'trapo', 'ferro', 'erva'], goblins: ['ferro', 'couro', 'flecha', 'ferro', 'orelha'], vale: ['ferro', 'couro', 'erva', 'prata', 'madeira'] };
  J.abreBau = function (b) {
    const s = J.save; if (s.baus[b.id]) return; s.baus[b.id] = 1; som('tranca', 0.6, 1); som('abrir', 0.8, 0.9); som('raro', 0.5); J.faiscas(b.x, b.y - 20, 20, '#ffe2a0', 1, 'brasa'); J.anel(b.x, b.y - 16, 40, '#ffe2a0', 0.6, 2);
    const l = ESPOLIO[F.atual.regiao], n = 4 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) J.restos.push({ m: l[Math.floor(Math.random() * l.length)], x: b.x + rnd(-8, 8), y: b.y - 24, vx: rnd(-90, 90), vy: rnd(-260, -150), w: 6, h: 8, t: 0 });
    if (b.loot && b.loot.amu && !s.amuletos.includes(b.loot.amu)) { s.amuletos.push(b.loot.amu); if (s.amu.length < 2) J.poeAmuleto(b.loot.amu); avisa('amuleto', b.loot.amu); } else if (Math.random() < 0.35) { s.inv.curativo = (s.inv.curativo || 0) + 1; texto(b.x, b.y - 46, '+1 Curativo', '#d8e0b0'); }
    J.treina('coleta', 8); J.salvar();
  };
  // o que você já viu: o mapa guarda trechos de 20 blocos
  J.passoMapa = function () {
    const s = J.save, h = J.heroi, A = F.atual, n = Math.ceil(A.W / 20), c = Math.floor(h.x / T / 20);
    let m = s.mapa[A.id]; if (!m || m.length !== n) m = '0'.repeat(n);
    for (const k of [c, c + 1]) if (k < n && m[k] !== '1') m = m.slice(0, k) + '1' + m.slice(k + 1);
    s.mapa[A.id] = m;
    for (const q of A.marcos) if (!s.marcos[q.id] && Math.abs(q.x - h.x) < 70 && Math.abs(q.y - h.y) < 110) { s.marcos[q.id] = 1; J.treina('coleta', 6); avisa('marco', q); }
    const z = F.zonaEm(h.x); if (z !== J.zona) { J.zona = z; if (z) avisa('zona', z); }
  };
  J.descansar = function (f) {
    const s = J.save, h = J.heroi;
    s.fogos[f.id] = 1; s.fogo = { area: s.area, id: f.id };
    h.hp = h.ficha.vida; h.vigor = h.ficha.vigor; h.veneno = 0; h.sina = Math.max(h.sina, s.magias.length ? 50 : 0); 
    J.povoar(); J.salvar();
  };

  // ---------- chefe ----------
  J.chefeAtivo = null;
  J.acordaChefe = function (e) { if (J.chefeAtivo) return; J.chefeAtivo = e; F.fecharArena(true); som('rugido', 1); treme(10); voz(e, 'alerta'); avisa('chefe', e); };
  J.venceuChefe = function (e) {
    J.save.chefes[e.tipo] = true; F.fecharArena(false); J.chefeAtivo = null;
    for (const o of J.inimigos) if (o.chamado && o.vivo) { o.vivo = false; o.estado = 'morto'; o.t = 0; }
    J.silencio = 7;
    J.clarao = 1; treme(12); J.pausa = 0.35; avisa('venceu', e); J.salvar();
  };

  // ---------- morte ----------
  J.morrer = function (quem) {
    const h = J.heroi, s = J.save; h.estado = 'morto'; h.t = 0; h.vy = -160; h.vx = -h.dir * 60; J.causa = quem;
    som('morte', 0.9, 0.8); treme(10); J.pausa = 0.35; J.lento = 1.5;
    J.faiscas(h.x, h.y - 30, 40, '#ff9a50', 1.4, 'brasa');
    // quem tem um filho crescido continua nele, com parte do que aprendeu; quem não tem, acaba aqui
    const her = J.herdeiro ? J.herdeiro() : null;
    if (her) { J.memoria(); const pai = s.nome; J.herda(her); J.salvar(true); avisa('morte', { herda: true, quem, pai }); }
    else { J.memoria(); J.apagar(); avisa('morte', { herda: false, quem, pequeno: s.prole && s.prole.length ? s.prole[0].nome : null }); }
  };
  J.memoria = function () { if (J.semSalvar) return; try { const s = J.save, m = J.memorias(); m.unshift({ nome: s.nome, tempo: Math.round(s.tempo), titulo: s.titulo || '', mortes: Object.values(s.mortes).reduce((a, b) => a + b, 0), causa: J.causa, arma: s.arma, area: s.area }); localStorage.setItem('sina_memoria', JSON.stringify(m.slice(0, 8))); } catch (e) { /* nada */ } };
  J.memorias = () => { try { return JSON.parse(localStorage.getItem('sina_memoria') || '[]'); } catch (e) { return []; } };

  // ---------- quadro inteiro ----------
  let saveT = 8;
  J.passo = function (dt) {
    for (const k in J.ja) J.ja[k] = Math.max(0, J.ja[k] - dt);
    J.tremor = Math.max(0, J.tremor - dt * 18); if (J.comboT > 0) { J.comboT -= dt; if (J.comboT <= 0) J.combo = 0; } if (J.dorLado) { J.dorLado.t -= dt; if (J.dorLado.t <= 0) J.dorLado = null; } J.clarao = Math.max(0, J.clarao - dt * 2.5);
    if (J.pausa > 0) { J.pausa -= dt; return; }
    if (J.lento > 0) { J.lento -= dt; dt *= 0.35; }
    const h = J.heroi; J.relogio += dt;
    passoHeroi(dt);
    if (J.passoClima && h.estado !== 'morto') J.passoClima(dt);
    if (J.formacao) J.formacao(dt);
    J.quadroN = (J.quadroN || 0) + 1;
    for (const e of J.inimigos) { const d = Math.abs(e.x - h.x); if (e.T.chefe || e.raid || e.estado === 'morto') { J.passoInimigo(e, dt); continue; } if (d > 640) continue; if (d > 380 && e.estado === 'vaga') { e.acum = (e.acum || 0) + dt; if ((J.quadroN + (e.ox | 0)) % 3) continue; J.passoInimigo(e, e.acum); e.acum = 0; continue; } J.passoInimigo(e, dt); }
    if (J.passoVida) J.passoVida(dt);
    J.inimigos = J.inimigos.filter((e) => e.vivo || e.t < (e.T.chefe ? 3 : 1.8));
    if (h.estado === 'dorme') { for (const k in J.ja) J.ja[k] = 0; }
    // o bando volta com o tempo, longe dos seus olhos
    for (const m of J.mortos) { m.espera -= dt; if (m.espera <= 0 && Math.abs(m.x - h.x) > 560 && !J.emb) { m.feito = true; J.inimigos.push(nasce(m.t, m.x, m.y)); } }
    J.mortos = J.mortos.filter((m) => !m.feito);
    for (const k in J.colhidos) if (J.colhidos[k] > 0) J.colhidos[k] -= dt;
    passoBalas(dt); passoMagias(dt); passoRestos(dt);
    for (const f of J.fx) {
      f.vida -= dt;
      if (f.alvo) { f.x += (h.x - f.x) * dt * 8; f.y += (h.y - 30 - f.y) * dt * 8; }
      else { f.vy += (f.grav || 0) * dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.tipo === 'poeira') { f.vx *= Math.pow(0.05, dt); f.vy *= Math.pow(0.2, dt); } }
      if ((f.tipo === 'gota' || f.tipo === 'pedra') && f.vy > 0 && solido(f.x, f.y)) { f.vx = 0; f.vy = 0; f.grav = 0; f.preso = true; }
    }
    J.fx = J.fx.filter((f) => f.vida > 0);
    if (J.fx.length > 600) J.fx.splice(0, J.fx.length - 600);
    for (const t of J.textos) { t.vida -= dt; t.y -= 34 * dt * (t.vida / t.max); t.x += (t.vx || 0) * dt; }
    J.textos = J.textos.filter((t) => t.vida > 0);
    for (const r of J.rastro) r.vida -= dt;
    J.rastro = J.rastro.filter((r) => r.vida > 0);
    J.mapaT = (J.mapaT || 0) - dt; if (J.mapaT <= 0 && h.estado !== 'morto' && h.estado !== 'nasce') { J.mapaT = 0.4; J.passoMapa(); }
    saveT -= dt; if (saveT <= 0 && h.estado !== 'morto') { saveT = 8; J.salvar(); }
  };

  // peças que os outros arquivos usam (bando.js e lar.js)
  J.k = { mover, solido, tipoEm, caixa, cruza, fx, sangue, poeira, treme, som, sopro, voz, rnd, clamp, tem, nasce, texto, feriInimigo, morreInimigo, avisa, G, QUEDA, CORRE, PULO };

  // ---------- guardar ----------
  const CHAVE = 'sina_primeiro';
  J.salvar = (semLugar) => { const s = J.save, h = J.heroi; if (!s) return; if (!semLugar && h && h.estado !== 'morto') { s.x = h.ultimoSeguro.x; s.y = h.ultimoSeguro.y; s.hp = h.hp; s.sina = h.sina; } if (J.semSalvar) return; try { localStorage.setItem(CHAVE, JSON.stringify(s)); } catch (e) { /* sem espaço ou bloqueado */ } };
  J.carregar = () => { try { const s = JSON.parse(localStorage.getItem(CHAVE)); return s && s.nome ? s : null; } catch (e) { return null; } };
  J.apagar = () => { if (J.semSalvar) return; try { localStorage.removeItem(CHAVE); } catch (e) { /* nada */ } };
})();
