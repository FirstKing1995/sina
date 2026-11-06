/* SINA · Parte I: regras. Vigor, rolamento, golpes, inimigos, fogueiras, morte e brasas. Nada de desenho aqui. */
(function (raiz) {
  'use strict';
  const M = raiz.Mapa, C = raiz.Conteudo, T = M.T;
  const J = raiz.Jogo = {};
  const CHAVE_SAVE = 'sina.parte1.save';

  const novoSave = () => ({
    fogueira: null, // a última em que descansou; sem nenhuma, volta à cova
    acesas: [], brasas: 0, resto: null, itens: {}, tesouros: [], portoes: [], chefesMortos: [], placas: [],
    nivel: { vida: 0, vigor: 0, forca: 0 }, cabacaMax: 3, vidaBonus: 0, falouBenta: 0, mortes: 0, tempo: 0, fim: false,
  });
  J.S = novoSave();
  J.temSave = () => { try { return !!localStorage.getItem(CHAVE_SAVE); } catch (e) { return false; } };
  J.salvar = () => { try { J.S.tempo = J.tempo; localStorage.setItem(CHAVE_SAVE, JSON.stringify(J.S)); } catch (e) { /* sem espaço */ } };
  J.carregar = () => { try { J.S = Object.assign(novoSave(), JSON.parse(localStorage.getItem(CHAVE_SAVE))); J.tempo = J.S.tempo || 0; } catch (e) { J.S = novoSave(); } };
  J.novo = () => { J.S = novoSave(); J.tempo = 0; J.salvar(); };
  J.tempo = 0;

  // ---------- estado do mundo ----------
  J.P = null; J.inimigos = []; J.tiros = []; J.fx = []; J.chefe = null; J.preso = false;
  const eventos = J.eventos = []; // o que a tela e o som precisam saber
  const avisa = (tipo, dados) => eventos.push(Object.assign({ tipo }, dados));

  const vidaMax = () => 100 + J.S.nivel.vida * 9 + J.S.vidaBonus * 20;
  const vigorMax = () => 90 + J.S.nivel.vigor * 8;
  const danoBase = () => 21 + J.S.nivel.forca * 3;
  J.vidaMax = vidaMax; J.vigorMax = vigorMax;
  J.custoNivel = () => { const n = J.S.nivel.vida + J.S.nivel.vigor + J.S.nivel.forca; return Math.round(70 * Math.pow(1.17, n)); };

  // ---------- colisão ----------
  const solidos = []; // círculos fixos (árvores, pedras...) em baldes por bloco
  const balde = new Map();
  J.solidos = solidos;
  J.addSolido = function (x, y, r) {
    const s = { x, y, r }; solidos.push(s);
    const k = (Math.floor(x / 64) << 12) | Math.floor(y / 64);
    if (!balde.has(k)) balde.set(k, []); balde.get(k).push(s);
  };
  function emPortao(px, py) {
    const bx = px / T, by = py / T;
    for (const id in M.PORTOES) {
      if (J.S.portoes.includes(id)) continue;
      const p = M.PORTOES[id];
      if (bx >= p.x0 && bx <= p.x1 + 1 && by >= p.y0 && by <= p.y1 + 1) return true;
    }
    return false;
  }
  function livre(x, y, r) {
    for (const [dx, dy] of [[-r, 0], [r, 0], [0, -r], [0, r], [0, 0]]) if (!M.anda(Math.floor((x + dx) / T), Math.floor((y + dy) / T))) return false;
    if (emPortao(x, y)) return false;
    const a = Math.floor(x / 64), b = Math.floor(y / 64);
    for (let i = a - 1; i <= a + 1; i++) for (let j = b - 1; j <= b + 1; j++) {
      const l = balde.get((i << 12) | j); if (!l) continue;
      for (const s of l) if (Math.hypot(s.x - x, (s.y - y) * 1.25) < s.r + r * 0.6) return false;
    }
    if (J.preso && J.chefe) { // a névoa fecha a arena até um dos dois cair
      const ar = J.chefe.arenaR;
      if (Math.hypot(x - J.chefe.arenaX, y - J.chefe.arenaY) > ar) return false;
    }
    return true;
  }
  J.livre = livre;
  function mover(o, dx, dy, r) {
    let moveu = false;
    if (dx && livre(o.x + dx, o.y, r)) { o.x += dx; moveu = true; }
    if (dy && livre(o.x, o.y + dy, r)) { o.y += dy; moveu = true; }
    return moveu;
  }

  // ---------- início ----------
  function ponto() {
    const f = J.S.fogueira && C.FOGUEIRAS[J.S.fogueira];
    const c = M.p(28, 172); return f ? { x: f.x * T + 26, y: f.y * T + 22 } : { x: c[0] * T, y: c[1] * T };
  }
  J.nascer = function () {
    const p = ponto();
    J.P = { x: p.x, y: p.y, ang: Math.PI / 2, vida: vidaMax(), vigor: vigorMax(), cabaca: J.S.cabacaMax, estado: 'livre', t: 0, inv: 0, espera: 0, passo: 0, batido: null, alvo: null, r: 10, dirX: 1, dirY: 0, duro: 0 };
    J.preso = false; J.chefe = null; J.tiros.length = 0;
    J.levantarMortos();
    avisa('nasceu');
  };
  J.levantarMortos = function () {
    J.inimigos = C.INIMIGOS.filter(([tipo]) => !(C.TIPOS[tipo].chefe && J.S.chefesMortos.includes(tipo))).map(([tipo, bx, by], i) => {
      const d = C.TIPOS[tipo];
      const e = { id: i, tipo, d, x: bx * T + 16, y: by * T + 16, cx: bx * T + 16, cy: by * T + 16, hp: d.hp, hpMax: d.hp, estado: 'ronda', t: Math.random() * 3, ang: Math.random() * 6.28, passo: Math.random() * 6, flash: 0, atord: 0, resta: 0, batida: false, firme: d.firme, fase: 1, vagar: 0, brilho: 0 };
      if (d.chefe) { e.estado = 'dorme'; e.arenaX = e.cx; e.arenaY = e.cy; e.arenaR = d.arena === 'ze' ? 12.2 * T : 15 * T; }
      return e;
    });
  };

  // ---------- ações do herói ----------
  const entrada = J.entrada = { mx: 0, my: 0, mira: null, golpe: false, forte: false, rola: false, bebe: false, usa: false, trava: false };
  J.rolar = function () {
    const P = J.P;
    if (P.estado !== 'livre' && !(P.estado === 'golpe' && P.t > P.dGolpe * 0.65)) return false;
    if (P.vigor < 8) return false;
    const m = Math.hypot(entrada.mx, entrada.my);
    if (m) { P.dirX = entrada.mx / m; P.dirY = entrada.my / m; } else { P.dirX = Math.cos(P.ang); P.dirY = Math.sin(P.ang); }
    P.ang = Math.atan2(P.dirY, P.dirX);
    P.estado = 'rola'; P.t = 0; P.vigor -= 22; P.espera = 0.75; avisa('rola');
    return true;
  };
  function golpear(forte) {
    const P = J.P;
    if (P.estado !== 'livre') return;
    const custo = forte ? 32 : 17;
    if (P.vigor < 6) { avisa('semvigor'); return; }
    P.vigor -= custo; P.espera = 0.8; P.estado = 'golpe'; P.t = 0; P.forte = forte; P.batido = new Set();
    P.dGolpe = forte ? 0.78 : 0.46; P.hitIni = forte ? 0.36 : 0.14; P.hitFim = P.hitIni + 0.14;
    if (P.alvo) P.ang = Math.atan2(P.alvo.y - P.y, P.alvo.x - P.x);
    else if (entrada.mira != null) P.ang = entrada.mira;
    avisa('golpe', { forte });
  }
  function beber() {
    const P = J.P;
    if (P.estado !== 'livre') return;
    if (P.cabaca <= 0) { avisa('aviso', { t: 'A cabaça está vazia.' }); return; }
    P.estado = 'bebe'; P.t = 0;
  }
  J.ferir = function (dano, ox, oy, forteEmpurrao) {
    const P = J.P;
    if (P.inv > 0 || P.estado === 'morto') return false;
    P.vida -= dano; P.inv = 0.5; P.duro = 0.3;
    if (P.estado !== 'rola') { P.estado = 'dor'; P.t = 0; }
    const d = Math.hypot(P.x - ox, P.y - oy) || 1, k = forteEmpurrao ? 15 : 8;
    mover(P, ((P.x - ox) / d) * k, ((P.y - oy) / d) * k, P.r);
    avisa('dor', { x: P.x, y: P.y, dano });
    if (P.vida <= 0) morrer();
    return true;
  };
  function morrer() {
    const P = J.P;
    P.vida = 0; P.estado = 'morto'; P.t = 0;
    J.S.mortes++;
    J.S.resto = J.S.brasas > 0 ? { x: P.x, y: P.y, qtd: J.S.brasas } : null; // a mancha anterior, se houver, se apaga aqui
    J.S.brasas = 0;
    J.salvar();
    avisa('morreu');
  }

  // ---------- combate do herói ----------
  function alcanceGolpe(e) {
    const P = J.P, d = Math.hypot(e.x - P.x, e.y - P.y) - e.d.r;
    if (d > (P.forte ? 46 : 38)) return false;
    let dif = Math.atan2(e.y - P.y, e.x - P.x) - P.ang;
    while (dif > Math.PI) dif -= 2 * Math.PI; while (dif < -Math.PI) dif += 2 * Math.PI;
    return Math.abs(dif) < (P.forte ? 1.25 : 1.05);
  }
  function acertar(e) {
    const P = J.P;
    const pelasCostas = e.estado === 'recua' ? 1.25 : 1; // castiga quem acabou de atacar
    const dano = Math.round(danoBase() * (P.forte ? 2.1 : 1) * pelasCostas);
    e.hp -= dano; e.flash = 0.12;
    if (e.estado === 'dorme') acordar(e);
    if (!e.d.chefe || e.estado === 'ronda') e.estado = e.estado === 'ronda' ? 'caca' : e.estado;
    avisa('acerto', { x: e.x, y: e.y, dano, forte: P.forte });
    const d = Math.hypot(e.x - P.x, e.y - P.y) || 1;
    if (e.firme > 0) e.firme -= P.forte ? 2 : 1;
    if (e.firme <= 0 && e.hp > 0) { // sem firmeza: interrompe o ataque e dá uma brecha
      e.estado = 'atordoado'; e.t = 0; e.atord = e.d.chefe ? 1.0 : 0.42; e.firme = e.d.firme;
      mover(e, ((e.x - P.x) / d) * 10, ((e.y - P.y) / d) * 10, e.d.r);
      if (e.d.chefe) avisa('quebra', { x: e.x, y: e.y });
    }
    if (e.hp <= 0) matar(e);
  }
  function matar(e) {
    e.estado = 'morto'; e.t = 0;
    J.S.brasas += e.d.brasas;
    avisa('brasas', { x: e.x, y: e.y, qtd: e.d.brasas });
    avisa('matou', { x: e.x, y: e.y, chefe: e.d.chefe });
    if (e.d.chefe) {
      J.S.chefesMortos.push(e.tipo); J.preso = false; J.chefe = null;
      if (e.d.deixa) { J.S.itens[e.d.deixa] = 1; avisa('item', { item: e.d.deixa }); }
      avisa('chefeCaiu', { nome: e.d.nome, final: e.d.final });
      J.salvar();
    }
  }
  function acordar(e) {
    if (e.estado !== 'dorme') return;
    e.estado = 'caca'; e.t = 0;
    J.chefe = e; J.preso = true;
    avisa('chefe', { nome: e.d.nome, quem: e.tipo });
  }

  // ---------- inimigos ----------
  function passoInimigo(e, dt) {
    const P = J.P, d = e.d;
    e.flash = Math.max(0, e.flash - dt);
    if (e.estado === 'morto') { e.t += dt; return; }
    const dx = P.x - e.x, dy = P.y - e.y, dist = Math.hypot(dx, dy);
    const longe = Math.abs(dx) > 520 || Math.abs(dy) > 400;
    if (longe && !d.chefe) { if (e.estado !== 'ronda') { e.estado = 'ronda'; e.x = e.cx; e.y = e.cy; e.hp = e.hpMax; } return; }
    e.t += dt;
    const fase2 = d.chefe && e.hp < e.hpMax * 0.5;
    if (fase2 && e.fase === 1) { e.fase = 2; avisa('fase', { x: e.x, y: e.y, nome: d.nome }); e.estado = 'recua'; e.t = 0; e.resta = 1.4; }
    const velK = fase2 ? 1.35 : 1, prepK = fase2 ? 0.8 : 1;
    switch (e.estado) {
      case 'dorme':
        if (dist < 7.5 * T) acordar(e);
        break;
      case 'ronda': {
        if (dist < d.visao && P.estado !== 'morto') { e.estado = 'caca'; e.t = 0; avisa('notou', { x: e.x, y: e.y, quem: e.tipo }); break; }
        e.vagar -= dt;
        if (e.vagar < -1.8) { e.vagar = 1 + Math.random() * 1.6; e.ang = Math.random() * 6.28; }
        if (e.vagar > 0) {
          const nx = Math.cos(e.ang) * d.vel * 0.35 * dt, ny = Math.sin(e.ang) * d.vel * 0.35 * dt;
          if (Math.hypot(e.x + nx - e.cx, e.y + ny - e.cy) < 58) { mover(e, nx, ny, d.r); e.passo += dt * 4; }
        }
        break;
      }
      case 'caca': {
        if (P.estado === 'morto') { e.estado = 'ronda'; break; }
        if (!d.chefe && (Math.hypot(e.x - e.cx, e.y - e.cy) > 420 || dist > d.visao * 2.4)) { e.estado = 'volta'; break; }
        e.ang = Math.atan2(dy, dx);
        const longeOk = d.atira ? dist > d.distancia : dist > d.alcance * 0.75;
        if (longeOk) {
          const anda = mover(e, Math.cos(e.ang) * d.vel * velK * dt, Math.sin(e.ang) * d.vel * velK * dt, d.r);
          e.passo += dt * (d.vel > 60 ? 12 : 8);
          if (!anda) { // contorna o obstáculo em vez de empacar
            const lado = e.id % 2 ? 1.2 : -1.2;
            mover(e, Math.cos(e.ang + lado) * d.vel * dt, Math.sin(e.ang + lado) * d.vel * dt, d.r);
          }
        } else if (d.atira && dist < d.distancia * 0.6) {
          mover(e, -Math.cos(e.ang) * d.vel * dt, -Math.sin(e.ang) * d.vel * dt, d.r); e.passo += dt * 7;
        }
        if (dist < d.alcance && e.t > 0.25) {
          e.estado = 'prepara'; e.t = 0; e.seq = d.seguidos || 1; e.resta = d.prep * prepK;
          e.tipoGolpe = escolherGolpe(e, dist, fase2);
          avisa('prepara', { x: e.x, y: e.y, quem: e.tipo, grande: e.tipoGolpe === 'tremor' });
        }
        break;
      }
      case 'volta':
        if (dist < d.visao * 0.8) { e.estado = 'caca'; break; }
        e.ang = Math.atan2(e.cy - e.y, e.cx - e.x);
        mover(e, Math.cos(e.ang) * d.vel * dt, Math.sin(e.ang) * d.vel * dt, d.r); e.passo += dt * 7;
        e.hp = Math.min(e.hpMax, e.hp + e.hpMax * 0.2 * dt);
        if (Math.hypot(e.x - e.cx, e.y - e.cy) < 20) { e.estado = 'ronda'; e.hp = e.hpMax; }
        break;
      case 'prepara':
        // acompanha o herói até perto do golpe: quem rola cedo demais é pego
        if (e.t < e.resta * 0.7) e.ang = Math.atan2(dy, dx);
        if (e.t >= e.resta) { e.estado = 'golpe'; e.t = 0; e.batida = false; e.resta = d.golpe; desferir(e); }
        break;
      case 'golpe': {
        const avanco = d.salta ? 260 : e.tipoGolpe === 'estocada' ? 300 : 95;
        if (!d.atira && e.tipoGolpe !== 'tremor') mover(e, Math.cos(e.ang) * avanco * dt, Math.sin(e.ang) * avanco * dt, d.r);
        if (!e.batida && !d.atira && e.tipoGolpe !== 'tremor') {
          let dif = Math.atan2(P.y - e.y, P.x - e.x) - e.ang;
          while (dif > Math.PI) dif -= 2 * Math.PI; while (dif < -Math.PI) dif += 2 * Math.PI;
          const alc = (d.salta ? 24 : d.alcance) + P.r + 4;
          if (Math.hypot(P.x - e.x, P.y - e.y) < alc && Math.abs(dif) < 1.15) {
            if (J.ferir(Math.round(d.dano * (e.tipoGolpe === 'estocada' ? 1.2 : 1)), e.x, e.y, d.chefe)) e.batida = true;
          }
        }
        if (e.t >= e.resta) {
          e.seq--;
          if (e.seq > 0) { e.estado = 'prepara'; e.t = 0; e.resta = d.prep * 0.5 * prepK; }
          else { e.estado = 'recua'; e.t = 0; e.resta = d.recua * (fase2 ? 0.8 : 1); }
        }
        break;
      }
      case 'recua':
        if (e.t >= e.resta) { e.estado = 'caca'; e.t = 0; }
        break;
      case 'atordoado':
        if (e.t >= e.atord) { e.estado = 'recua'; e.t = 0; e.resta = 0.2; }
        break;
    }
    // separa quem está empilhado
    if (!d.chefe) for (const o of J.inimigos) {
      if (o === e || o.estado === 'morto') continue;
      const a = e.x - o.x, b = e.y - o.y, m = Math.hypot(a, b);
      if (m > 0 && m < 18) mover(e, (a / m) * 16 * dt, (b / m) * 16 * dt, d.r);
    }
  }
  function escolherGolpe(e, dist, fase2) {
    if (!e.d.chefe) return 'corte';
    const r = Math.random();
    if (e.tipo === 'corpo' && fase2 && r < 0.3) return 'tremor';
    if (r < 0.28 && dist > e.d.alcance * 0.45) return 'estocada';
    return 'corte';
  }
  function desferir(e) {
    const P = J.P, d = e.d;
    avisa('inimigoGolpe', { x: e.x, y: e.y, quem: e.tipo, golpe: e.tipoGolpe });
    if (d.atira) {
      const a = Math.atan2(P.y - e.y, P.x - e.x);
      J.tiros.push({ x: e.x, y: e.y - 18, vx: Math.cos(a) * 165, vy: Math.sin(a) * 165, vida: 2.4, dano: d.dano });
      avisa('tiro', { x: e.x, y: e.y });
    }
    if (e.tipoGolpe === 'tremor') { // anel que cresce no chão: tem de rolar através dele no momento certo
      J.fx.push({ tipo: 'anel', x: e.x, y: e.y, r: 12, vel: 150, max: 230, dano: d.dano * 0.9, batido: false, t: 0 });
      avisa('tremor', { x: e.x, y: e.y });
    }
  }

  function passoTiros(dt) {
    const P = J.P;
    for (const t of J.tiros) {
      t.x += t.vx * dt; t.y += t.vy * dt; t.vida -= dt;
      if (!M.anda(Math.floor(t.x / T), Math.floor((t.y + 18) / T))) t.vida = 0;
      if (t.vida > 0 && Math.hypot(t.x - P.x, t.y - (P.y - 18)) < 14 && J.ferir(t.dano, t.x, t.y)) t.vida = 0;
    }
    J.tiros = J.tiros.filter((t) => t.vida > 0);
    for (const f of J.fx) {
      if (f.tipo !== 'anel') continue;
      f.r += f.vel * dt; f.t += dt;
      const d = Math.hypot(P.x - f.x, P.y - f.y);
      if (!f.batido && Math.abs(d - f.r) < 11) { if (J.ferir(Math.round(f.dano), f.x, f.y, true)) f.batido = true; }
    }
    J.fx = J.fx.filter((f) => f.tipo !== 'anel' || f.r < f.max);
  }

  // ---------- interações ----------
  J.pertoDe = function () { // o que dá para usar agora, do mais importante ao menos
    const P = J.P;
    const r = J.S.resto;
    if (r && Math.hypot(r.x - P.x, r.y - P.y) < 34) return { tipo: 'resto', texto: 'Recolher brasas' };
    for (const id in C.FOGUEIRAS) {
      const f = C.FOGUEIRAS[id];
      if (Math.hypot(f.x * T + 16 - P.x, f.y * T + 16 - P.y) < 46) return { tipo: 'fogueira', id, texto: J.S.acesas.includes(id) ? 'Descansar' : 'Acender a fogueira' };
    }
    for (const t of C.TESOUROS) if (!J.S.tesouros.includes(t.id) && Math.hypot(t.x * T + 16 - P.x, t.y * T + 16 - P.y) < 34) return { tipo: 'tesouro', t, texto: 'Abrir' };
    if (Math.hypot(J.BENTA.x - P.x, J.BENTA.y - P.y) < 40) return { tipo: 'benta', texto: 'Falar com Benta' };
    for (const id in M.PORTOES) {
      if (J.S.portoes.includes(id)) continue;
      const p = M.PORTOES[id], cx = (p.x0 + 1) * T, cy = ((p.y0 + p.y1 + 1) / 2) * T;
      if (Math.abs(P.x - cx) < 84 && Math.abs(P.y - cy) < (p.y1 - p.y0 + 2) * T / 2) {
        const leste = P.x > cx;
        if (p.abre === 'leste') return leste ? { tipo: 'portao', id, texto: 'Abrir o portão' } : { tipo: 'trancado', texto: 'Não abre deste lado' };
        return J.S.itens[p.chave] ? { tipo: 'portao', id, texto: 'Usar a chave de ferro' } : { tipo: 'trancado', texto: 'Trancado. Precisa de uma chave' };
      }
    }
    for (const q of J.PORTAIS) if (Math.hypot(q.x - P.x, q.y - P.y) < 42) return { tipo: 'portal', q, texto: q.texto };
    return null;
  };
  const em = (x, y) => { const c = M.p(x, y); return { x: c[0] * T, y: c[1] * T }; };
  J.BENTA = em(40, 134);
  J.PORTAIS = [
    Object.assign(em(226, 152), { vai: em(18, 206), texto: 'Descer à cripta' }),
    Object.assign(em(18, 202), { vai: em(226, 155), texto: 'Subir ao cemitério' }),
  ];
  J.usar = function () {
    const alvo = J.pertoDe(); if (!alvo) return;
    const P = J.P;
    if (alvo.tipo === 'resto') {
      J.S.brasas += J.S.resto.qtd; avisa('brasas', { x: P.x, y: P.y, qtd: J.S.resto.qtd }); avisa('aviso', { t: 'Suas brasas voltaram.' });
      J.S.resto = null; J.salvar();
    } else if (alvo.tipo === 'fogueira') {
      if (!J.S.acesas.includes(alvo.id)) { J.S.acesas.push(alvo.id); avisa('acendeu', { nome: C.FOGUEIRAS[alvo.id].nome }); }
      J.descansar(alvo.id);
    } else if (alvo.tipo === 'tesouro') {
      J.S.tesouros.push(alvo.t.id);
      const t = alvo.t;
      if (t.item === 'brasas') { J.S.brasas += t.qtd; avisa('brasas', { x: P.x, y: P.y, qtd: t.qtd }); }
      if (t.item === 'caco_cabaca') { J.S.cabacaMax++; P.cabaca++; }
      if (t.item === 'pedra_vida') { J.S.vidaBonus++; P.vida = vidaMax(); }
      avisa('item', { item: t.item, qtd: t.qtd }); J.salvar();
    } else if (alvo.tipo === 'benta') {
      avisa('conversa', { falas: falasBenta() });
    } else if (alvo.tipo === 'portao') {
      J.S.portoes.push(alvo.id); avisa('portao', { nome: M.PORTOES[alvo.id].nome }); J.salvar();
    } else if (alvo.tipo === 'trancado') {
      avisa('aviso', { t: alvo.texto });
    } else if (alvo.tipo === 'portal') {
      P.x = alvo.q.vai.x; P.y = alvo.q.vai.y; avisa('passagem');
    }
  };
  function falasBenta() {
    const S = J.S;
    if (S.itens.fragmento) { S.fim = true; J.salvar(); setTimeout(() => avisa('fim'), 0); return C.CONVERSAS.benta4; }
    if (S.falouBenta === 0) { S.falouBenta = 1; J.salvar(); return C.CONVERSAS.benta1; }
    return S.itens.chave_ferro ? C.CONVERSAS.benta3 : C.CONVERSAS.benta2;
  }
  J.descansar = function (id) {
    const P = J.P;
    J.S.fogueira = id;
    P.vida = vidaMax(); P.vigor = vigorMax(); P.cabaca = J.S.cabacaMax; P.estado = 'livre';
    J.tiros.length = 0;
    J.levantarMortos();
    J.salvar();
    avisa('descansou', { id });
  };
  J.subir = function (atr) {
    const custo = J.custoNivel();
    if (J.S.brasas < custo) return false;
    J.S.brasas -= custo; J.S.nivel[atr]++;
    J.P.vida = vidaMax(); J.P.vigor = vigorMax();
    J.salvar(); avisa('subiu');
    return true;
  };
  J.viajar = function (id) {
    const f = C.FOGUEIRAS[id]; J.P.x = f.x * T + 26; J.P.y = f.y * T + 22;
    J.descansar(id); avisa('passagem');
  };

  // ---------- passo do jogo ----------
  J.passo = function (dt) {
    const P = J.P; if (!P) return;
    J.tempo += dt;
    P.t += dt; P.inv = Math.max(0, P.inv - dt); P.duro = Math.max(0, P.duro - dt);
    if (P.espera > 0) P.espera -= dt;
    else if (P.estado !== 'rola' && P.estado !== 'golpe') P.vigor = Math.min(vigorMax(), P.vigor + (P.estado === 'bebe' ? 12 : 36) * dt);

    // entrada de um toque
    if (entrada.rola) { entrada.rola = false; J.rolar(); }
    if (entrada.golpe) { entrada.golpe = false; golpear(false); }
    if (entrada.forte) { entrada.forte = false; golpear(true); }
    if (entrada.bebe) { entrada.bebe = false; beber(); }
    if (entrada.usa) { entrada.usa = false; if (P.estado === 'livre') J.usar(); }
    if (entrada.trava) { entrada.trava = false; travar(); }
    if (P.alvo && (P.alvo.estado === 'morto' || Math.hypot(P.alvo.x - P.x, P.alvo.y - P.y) > 340)) P.alvo = null;

    switch (P.estado) {
      case 'livre': {
        const m = Math.hypot(entrada.mx, entrada.my);
        if (m > 0.1) {
          const k = Math.min(1, m), v = (P.alvo ? 60 : 76) * k;
          mover(P, (entrada.mx / m) * v * dt, (entrada.my / m) * v * dt, P.r);
          P.passo += dt * 9 * k;
          if (!P.alvo) P.ang = Math.atan2(entrada.my, entrada.mx);
          J.P.andando = true;
        } else J.P.andando = false;
        if (P.alvo) P.ang = Math.atan2(P.alvo.y - P.y, P.alvo.x - P.x);
        break;
      }
      case 'rola': {
        const dur = 0.46, k = P.t / dur;
        P.inv = Math.max(P.inv, k > 0.06 && k < 0.72 ? 0.02 : 0);
        const v = 215 * (1 - k * 0.55);
        mover(P, P.dirX * v * dt, P.dirY * v * dt, P.r);
        if (P.t >= dur) { P.estado = 'livre'; P.t = 0; }
        break;
      }
      case 'golpe': {
        const ativo = P.t >= P.hitIni && P.t <= P.hitFim;
        const avan = P.t < P.hitFim ? (P.forte ? 44 : 34) : 0;
        mover(P, Math.cos(P.ang) * avan * dt, Math.sin(P.ang) * avan * dt, P.r);
        if (ativo) for (const e of J.inimigos) {
          if (e.estado === 'morto' || P.batido.has(e.id)) continue;
          if (alcanceGolpe(e)) { P.batido.add(e.id); acertar(e); }
        }
        if (P.t >= P.dGolpe) { P.estado = 'livre'; P.t = 0; }
        break;
      }
      case 'bebe':
        if (P.t >= 0.9) {
          P.cabaca--; P.vida = Math.min(vidaMax(), P.vida + 45 + vidaMax() * 0.12);
          P.estado = 'livre'; P.t = 0; avisa('bebeu');
        }
        break;
      case 'dor':
        if (P.t >= 0.32) { P.estado = 'livre'; P.t = 0; }
        break;
      case 'morto': break;
    }
    if (P.estado !== 'morto') for (const e of J.inimigos) passoInimigo(e, dt);
    else for (const e of J.inimigos) e.flash = 0;
    passoTiros(dt);
    J.inimigos = J.inimigos.filter((e) => !(e.estado === 'morto' && e.t > 3));
  };
  function travar() {
    const P = J.P;
    if (P.alvo) { P.alvo = null; return; }
    let melhor = null, nota = 1e9;
    for (const e of J.inimigos) {
      if (e.estado === 'morto' || e.estado === 'dorme') continue;
      const d = Math.hypot(e.x - P.x, e.y - P.y);
      if (d < 280 && d < nota) { nota = d; melhor = e; }
    }
    P.alvo = melhor;
  }
  J.morreu = () => J.P && J.P.estado === 'morto';
})(typeof window !== 'undefined' ? window : globalThis);
