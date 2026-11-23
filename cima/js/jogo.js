/* SINA · Aruanã: regras. Vigor, rolamento, golpes, inimigos, fogueiras, morte, equipamentos e missões. Nada de desenho aqui. */
(function (raiz) {
  'use strict';
  const M = raiz.Mapa, C = raiz.Conteudo, T = M.T;
  const J = raiz.Jogo = {};
  const CHAVE_SAVE = 'sina.mundo.save';

  const novoSave = (H) => ({
    jogo: 'aruana', heroi: H || (raiz.Aparencia ? raiz.Aparencia.padrao() : null), fogueira: null, acesas: [], brasas: 0, resto: null, mochila: ['espada', 'trapos'], forja: {}, equip: { arma: 'espada', armadura: 'trapos', amuleto: null },
    materiais: {}, chaves: {}, cacos: 0, tesouros: [], ervas: [], chefesMortos: [], placas: [], visto: {}, missoes: {}, mortos: {},
    nivel: { vida: 0, vigor: 0, forca: 0 }, cabacaMax: 2, hora: 8, tochas: 1, gravetos: 3, vidaBonus: 0, falouBenta: 0, cratera: false, mortes: 0, tempo: 0, fim: false,
  });
  J.S = novoSave();
  J.temSave = () => { try { return !!localStorage.getItem(CHAVE_SAVE); } catch (e) { return false; } };
  J.CHAVE_SAVE = CHAVE_SAVE;
  J.salvar = () => { try { J.S.tempo = J.tempo; J.S.at = Date.now(); localStorage.setItem(CHAVE_SAVE, JSON.stringify(J.S)); if (J.aoSalvar) J.aoSalvar(); } catch (e) { /* sem espaço */ } };
  J.carregar = () => { try { J.S = Object.assign(novoSave(), JSON.parse(localStorage.getItem(CHAVE_SAVE))); J.tempo = J.S.tempo || 0; } catch (e) { J.S = novoSave(); } };
  J.novo = (H) => {
    J.S = novoSave(H); J.tempo = 0;
    const e = esp();
    if (e) {
      for (const id of e.itens) if (!J.S.mochila.includes(id)) J.S.mochila.push(id);
      if (e.arma) J.S.equip.arma = e.arma;
      if (e.veste) J.S.equip.armadura = e.veste;
      J.S.cabacaMax += e.cabaca || 0;
    }
    J.salvar();
  };
  const raca = () => (raiz.Aparencia && J.S.heroi ? raiz.Aparencia.RACAS[J.S.heroi.raca] : null) || {};
  const esp = () => (raiz.Aparencia && J.S.heroi ? raiz.Aparencia.ESPECIALIDADES[J.S.heroi.esp] : null) || null;
  J.poderAtual = () => { const e = esp(); return e ? e.poder : null; };
  J.tempo = 0;

  J.P = null; J.inimigos = []; J.tiros = []; J.fx = []; J.chefe = null; J.preso = false;
  const eventos = J.eventos = [];
  const avisa = (tipo, dados) => eventos.push(Object.assign({}, dados, { tipo }));

  // ---------- atributos ----------
  const item = (id) => (id ? C.ITENS[id] : null);
  J.vidaMax = () => { const e = esp() || {}; return 100 + (raca().vida || 0) + (e.vida || 0) + J.S.nivel.vida * 8 + J.S.vidaBonus * 18; };
  J.vigorMax = () => { const a = item(J.S.equip.amuleto); const e = esp() || {}; return 80 + (raca().vigor || 0) + (e.vigor || 0) + J.S.nivel.vigor * 6 + (a && a.vigor ? a.vigor : 0); };
  J.arma = () => item(J.S.equip.arma);
  J.danoArma = (id) => {
    const a = C.ITENS[id], f = J.S.forja[id] || 0;
    const falta = Math.max(0, (a.req || 0) - J.S.nivel.forca); // arma pesada demais perde muito
    return (a.dano + J.S.nivel.forca * 2.2) * (1 + f * 0.14) * (1 + (raca().dano || 0)) * (falta ? Math.max(0.35, 1 - falta * 0.14) : 1);
  };
  J.defesa = () => {
    const ar = item(J.S.equip.armadura), am = item(J.S.equip.amuleto);
    return (ar ? ar.def : 0) + (am && am.def ? am.def : 0) + (raca().def || 0);
  };
  J.peso = () => { const ar = item(J.S.equip.armadura); return ar ? ar.peso : 0; };
  J.custoNivel = () => { const n = J.S.nivel.vida + J.S.nivel.vigor + J.S.nivel.forca; return Math.round(95 * Math.pow(1.2, n)); };
  J.nivelTotal = () => 1 + J.S.nivel.vida + J.S.nivel.vigor + J.S.nivel.forca;

  // ---------- colisão ----------
  const solidos = [], balde = new Map();
  J.solidos = solidos;
  J.addSolido = function (x, y, r) {
    const s = { x, y, r }; solidos.push(s);
    const k = (Math.floor(x / 64) << 12) | Math.floor(y / 64);
    if (!balde.has(k)) balde.set(k, []); balde.get(k).push(s);
  };
  function livre(x, y, r) {
    for (const [dx, dy] of [[-r, 0], [r, 0], [0, -r], [0, r], [0, 0]]) if (!M.anda(Math.floor((x + dx) / T), Math.floor((y + dy) / T))) return false;
    const a = Math.floor(x / 64), b = Math.floor(y / 64);
    for (let i = a - 1; i <= a + 1; i++) for (let j = b - 1; j <= b + 1; j++) {
      const l = balde.get((i << 12) | j); if (!l) continue;
      for (const s of l) if (Math.hypot(s.x - x, (s.y - y) * 1.25) < s.r + r * 0.6) return false;
    }
    if (J.preso && J.chefe && Math.hypot(x - J.chefe.arenaX, y - J.chefe.arenaY) > J.chefe.arenaR) return false;
    return true;
  }
  J.livre = livre;
  function mover(o, dx, dy, r) {
    let moveu = false;
    if (dx && livre(o.x + dx, o.y, r)) { o.x += dx; moveu = true; }
    if (dy && livre(o.x, o.y + dy, r)) { o.y += dy; moveu = true; }
    return moveu;
  }

  // ---------- gente da vila: vaga por perto, para, e olha para quem se aproxima ----------
  J.gente = C.NPCS.map((n, i) => Object.assign(n, { px: n.x * T, py: n.y * T, cx: n.x * T, cy: n.y * T, espera: 1 + (i % 4), dx: 0, dy: 0, andando: false, vira: false, fase: i * 0.7 }));
  function passoGente(dt) {
    const P = J.P;
    for (const n of J.gente) {
      const dist = Math.hypot(P.x - n.px, P.y - n.py);
      if (dist > 700) continue;
      if (dist < 70) { n.andando = false; n.vira = P.x < n.px; continue; } // para e olha para você
      if (!n.anda) continue;
      n.espera -= dt;
      if (n.espera <= 0) {
        if (n.andando) { n.andando = false; n.espera = 1.5 + Math.random() * 3.5; }
        else {
          const a = Math.random() * 6.283, r = Math.random() * n.anda, ax = n.cx + Math.cos(a) * r, ay = n.cy + Math.sin(a) * r;
          const d = Math.hypot(ax - n.px, ay - n.py) || 1;
          n.dx = ((ax - n.px) / d) * 24; n.dy = ((ay - n.py) / d) * 24;
          n.andando = true; n.espera = d / 24; n.vira = n.dx < 0;
        }
      }
      if (n.andando) { n.px += n.dx * dt; n.py += n.dy * dt; if (!livre(n.px, n.py, 8)) { n.px -= n.dx * dt; n.py -= n.dy * dt; n.andando = false; n.espera = 1; } }
    }
  }

  // ---------- início ----------
  function ponto() {
    const f = J.S.fogueira && C.FOGUEIRAS[J.S.fogueira];
    const c = M.LUGARES.ermo;
    return f ? { x: f.x * T + 26, y: f.y * T + 22 } : { x: c[0] * T, y: c[1] * T };
  }
  J.nascer = function () {
    const p = ponto();
    J.P = { x: p.x, y: p.y, ang: Math.PI / 2, vida: J.vidaMax(), vigor: J.vigorMax(), cabaca: J.S.cabacaMax, estado: 'livre', t: 0, inv: 0, espera: 0, passo: 0, batido: null, alvo: null, r: 10, dirX: 1, dirY: 0, duro: 0 };
    J.preso = false; J.chefe = null; J.tiros.length = 0; J.fx.length = 0;
    J.levantarMortos();
    avisa('nasceu');
  };
  J.levantarMortos = function () {
    J.inimigos = [];
    C.INIMIGOS.forEach(([tipo, bx, by], i) => {
      const d = C.TIPOS[tipo];
      if ((d.chefe || d.lenda) && J.S.chefesMortos.includes(tipo)) return;
      if (tipo === 'cauda' && !J.S.cratera) return;
      // a mesma criatura é pior nas regiões perigosas; na cripta, vale o perigo 4
      const perigo = d.chefe || d.lenda ? 1 : by >= M.CRIPTA_Y ? 4 : M.regiao(bx, by).perigo;
      const kHp = 1 + (perigo - 1) * 0.5, kDano = 1 + (perigo - 1) * 0.3, hp = d.hp * kHp;
      const e = { id: i, tipo, d, x: bx * T + 16, y: by * T + 16, cx: bx * T + 16, cy: by * T + 16, hp, hpMax: hp, dano: d.dano * kDano, brasas: d.brasas * (1 + (perigo - 1) * 0.55), estado: 'ronda', t: Math.random() * 3, ang: Math.random() * 6.28, passo: Math.random() * 6, flash: 0, atord: 0, resta: 0, batida: false, firme: firmeza(d), fase: 1, vagar: 0 };
      if (d.chefe) { e.estado = 'dorme'; e.arenaX = e.cx; e.arenaY = e.cy; e.arenaR = (tipo === 'corpo' ? 15 : 13.4) * T; }
      J.inimigos.push(e);
    });
  };

  // ---------- ações do herói ----------
  const entrada = J.entrada = { mx: 0, my: 0, mira: null, golpe: false, forte: false, rola: false, bebe: false, usa: false, trava: false, poder: false };
  J.rolar = function () {
    const P = J.P;
    if (P.estado !== 'livre' && !(P.estado === 'golpe' && P.t > P.hitFim + 0.04) && !(P.estado === 'dor' && P.t > 0.1) && !(P.estado === 'bebe' && P.t < 0.25)) return false; // emenda a esquiva no fim do golpe, logo após apanhar ou ao desistir de beber
    const custo = J.P.passoCaca > 0 ? 0 : 20 + J.peso() * 7 + (raca().rola || 0);
    if (P.vigor < 10) { avisa('semvigor'); return false; }
    const m = Math.hypot(entrada.mx, entrada.my);
    if (m) { P.dirX = entrada.mx / m; P.dirY = entrada.my / m; } else { P.dirX = Math.cos(P.ang); P.dirY = Math.sin(P.ang); }
    P.ang = Math.atan2(P.dirY, P.dirX);
    P.estado = 'rola'; P.t = 0; P.vigor -= custo; P.espera = 0.6; avisa('rola');
    return true;
  };
  function golpear(forte) {
    const P = J.P;
    const emendaGolpe = P.estado === 'golpe' && P.t > P.hitFim + 0.06, emendaRola = P.estado === 'rola' && P.t > 0.32;
    if (P.estado !== 'livre' && !(P.estado === 'dor' && P.t > 0.1) && !emendaGolpe && !emendaRola) return false; // apanhou: logo já dá para revidar
    const a = J.arma(), custo = a.custo * 0.75 * (forte ? 1.75 : 1);
    if (P.vigor < 8) { avisa('semvigor'); return true; }
    P.vigor -= custo; P.espera = 0.55; P.estado = 'golpe'; P.t = 0; P.forte = forte; P.batido = new Set();
    P.dGolpe = (forte ? 0.86 : 0.5) * a.lento; P.hitIni = (forte ? 0.42 : 0.16) * a.lento; P.hitFim = P.hitIni + 0.14;
    if (P.alvo) P.ang = Math.atan2(P.alvo.y - P.y, P.alvo.x - P.x);
    else if (entrada.mira != null) P.ang = entrada.mira;
    avisa('golpe', { forte });
    return true;
  }
  J.tirosH = [];
  J.usarPoder = function () {
    const P = J.P, pd = J.poderAtual();
    if (!pd || P.estado !== 'livre') return;
    if ((P.esperaPoder || 0) > 0) return avisa('aviso', { t: pd.nome + ' ainda não voltou.' });
    if (P.vigor < pd.vigor) return avisa('semvigor');
    P.vigor -= pd.vigor; P.esperaPoder = pd.espera; if (pd.vigor) P.espera = 0.8;
    if (pd.id === 'guarda') { P.guarda = 4; avisa('poder', { id: 'guarda', x: P.x, y: P.y }); }
    else if (pd.id === 'passo') { P.passoCaca = 5; avisa('poder', { id: 'passo', x: P.x, y: P.y }); }
    else if (pd.id === 'folego') { P.vigor = J.vigorMax(); P.vida = Math.min(J.vidaMax(), P.vida + 24); avisa('poder', { id: 'folego', x: P.x, y: P.y }); }
    else if (pd.id === 'seta') {
      let alvo = P.alvo, nota = 280;
      if (!alvo) for (const e of J.inimigos) { if (e.estado === 'morto' || e.estado === 'dorme') continue; const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < nota) { nota = d; alvo = e; } }
      const a = entrada.mira != null && !alvo ? entrada.mira : alvo ? Math.atan2(alvo.y - P.y, alvo.x - P.x) : P.ang;
      P.ang = a;
      J.tirosH.push({ x: P.x, y: P.y - 20, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, vida: 1.5, dano: 20 + J.S.nivel.forca * 3 });
      avisa('poder', { id: 'seta', x: P.x, y: P.y });
    }
  };
  function beber() {
    const P = J.P;
    if (P.estado !== 'livre') return;
    if (P.cabaca <= 0) { avisa('aviso', { t: 'A cabaça está vazia.' }); return; }
    P.estado = 'bebe'; P.t = 0;
  }
  J.ferir = function (dano, ox, oy, forteEmpurrao) {
    const P = J.P;
    if (P.inv > 0 || P.estado === 'morto') return false;
    const final = Math.round(dano * (1 - J.defesa()) * (P.guarda > 0 ? 0.4 : 1));
    P.vida -= final; P.inv = 0.7; P.duro = 0.3; // o respiro impede que dois bichos emendem golpes
    // golpe em andamento não é cortado, salvo pancada forte; bebendo é interrompido, e o gole se perde
    if (P.estado !== 'rola' && (P.estado !== 'golpe' || forteEmpurrao)) { P.estado = 'dor'; P.t = 0; }
    const d = Math.hypot(P.x - ox, P.y - oy) || 1, k = forteEmpurrao ? 20 : 10;
    mover(P, ((P.x - ox) / d) * k, ((P.y - oy) / d) * k, P.r);
    avisa('dor', { x: P.x, y: P.y, dano: final });
    if (P.vida <= 0) morrer();
    return true;
  };
  function morrer() {
    const P = J.P;
    P.vida = 0; P.estado = 'morto'; P.t = 0;
    J.S.mortes++;
    J.S.resto = J.S.brasas > 0 ? { x: P.x, y: P.y, qtd: J.S.brasas } : null;
    J.S.brasas = 0;
    J.salvar();
    avisa('morreu');
  }

  // ---------- combate do herói ----------
  function alcanceGolpe(e) {
    const P = J.P, a = J.arma(), d = Math.hypot(e.x - P.x, e.y - P.y) - e.d.r;
    if (d > (P.forte ? 44 : 36) * a.alcance) return false;
    let dif = Math.atan2(e.y - P.y, e.x - P.x) - P.ang;
    while (dif > Math.PI) dif -= 2 * Math.PI; while (dif < -Math.PI) dif += 2 * Math.PI;
    return Math.abs(dif) < (P.forte ? 1.2 : 0.95);
  }
  function acertarCom(e, dano, fogo) {
    e.hp -= dano; e.flash = 0.12;
    if (e.estado === 'dorme') acordar(e);
    if (e.estado === 'ronda' || e.estado === 'volta') { e.estado = 'caca'; e.t = 0; alertar(e); }
    avisa('acerto', { x: e.x, y: e.y, dano, fogo: !!fogo });
    if (e.hp <= 0) matar(e);
  }
  // firmeza: quantos golpes seguidos o bicho aguenta sem cambalear. Os pequenos caem com um; o resto pede sequência
  function firmeza(d) { return d.chefe ? d.firme : d.hp <= 36 ? Math.max(1, d.firme) : Math.max(2, d.firme + 1); }
  function acertar(e) {
    const P = J.P;
    // castigo: acertar quem acabou de errar o golpe, ou está atordoado, vale muito mais. É isso que premia esperar.
    // o atordoado vale menos que o golpe errado: o tranco é sorte do herói, a brecha é mérito de quem esperou
    const brecha = e.estado === 'recua' ? 1.6 : e.estado === 'atordoado' ? 1.25 : 1;
    const dano = Math.round(J.danoArma(J.S.equip.arma) * (P.forte ? 2 : 1) * brecha);
    e.hp -= dano; e.flash = 0.12;
    if (e.estado === 'dorme') acordar(e);
    if (e.estado === 'ronda' || e.estado === 'volta') { e.estado = 'caca'; e.t = 0; alertar(e); }
    avisa('acerto', { x: e.x, y: e.y, dano, forte: P.forte, brecha: brecha > 1 });
    if (J.tempo - (e.apanhou || -9) > 2.5) e.firme = firmeza(e.d);
    e.apanhou = J.tempo;
    e.firme -= P.forte ? 2 : 1;
    // só agora ele é interrompido; antes disso, continua vindo. Depois de um tranco, fica um tempo sem tomar outro: nada de prender o bicho para sempre
    // a firmeza também volta sozinha: quem não apanha em sequência não cai
    if (e.firme <= 0 && e.hp > 0 && !e.d.chefe && e.tranco && J.tempo - e.tranco < 3.2) e.firme = firmeza(e.d);
    if (e.firme <= 0 && e.hp > 0) {
      const d = Math.hypot(e.x - P.x, e.y - P.y) || 1;
      e.tranco = J.tempo;
      e.estado = 'atordoado'; e.t = 0; e.atord = e.d.chefe ? 1.1 : 0.34; e.firme = firmeza(e.d);
      mover(e, ((e.x - P.x) / d) * 10, ((e.y - P.y) / d) * 10, e.d.r);
      if (e.d.chefe) avisa('quebra', { x: e.x, y: e.y });
    }
    if (e.hp <= 0) matar(e);
  }
  function darItem(id, qtd) {
    const it = C.ITENS[id]; if (!it) return;
    if (it.tipo === 'brasas') J.S.brasas += qtd || 0;
    else if (id === 'caco') J.S.cacos++;
    else if (it.tipo === 'chave') J.S.chaves[id] = 1;
    else if (it.tipo === 'material') J.S.materiais[id] = (J.S.materiais[id] || 0) + (qtd || 1);
    else if (id === 'caco_cabaca') { J.S.cabacaMax++; J.P.cabaca++; }
    else if (id === 'pedra_vida') { J.S.vidaBonus++; J.P.vida = J.vidaMax(); }
    else if (!J.S.mochila.includes(id)) J.S.mochila.push(id);
    else { J.S.brasas += 150; avisa('aviso', { t: it.nome + ' repetido virou 150 brasas.' }); return; }
    avisa('item', { item: id, qtd });
  }
  J.darItem = darItem;
  function matar(e) {
    if (!e.d.chefe && !e.d.lenda && Math.random() < 0.3) { J.S.gravetos++; avisa('aviso', { t: 'Graveto: ' + J.S.gravetos }); }
    e.estado = 'morto'; e.t = 0;
    const am = item(J.S.equip.amuleto), ge = esp() || {}, ganho = Math.round(e.brasas * (1 + (am && am.brasas ? am.brasas : 0) + (raca().brasas || 0) + (ge.brasas || 0)));
    J.S.brasas += ganho;
    J.S.mortos[e.tipo] = (J.S.mortos[e.tipo] || 0) + 1;
    avisa('brasas', { x: e.x, y: e.y, qtd: ganho });
    avisa('matou', { x: e.x, y: e.y, chefe: !!e.d.chefe });
    if (e.d.lenda) { J.S.chefesMortos.push(e.tipo); (e.d.deixa || []).forEach((id) => darItem(id)); avisa('lendaCaiu', { nome: e.d.nome }); J.salvar(); }
    if (e.d.chefe) {
      J.S.chefesMortos.push(e.tipo); J.preso = false; J.chefe = null;
      J.inimigos.forEach((o) => { if (o.invocado && o.estado !== 'morto') { o.estado = 'morto'; o.t = 2; } });
      J.fx.length = 0;
      (e.d.deixa || []).forEach((id) => darItem(id));
      avisa('chefeCaiu', { nome: e.d.nome, final: e.d.final, tipoChefe: e.tipo });
      if (e.d.final) J.S.fim = true;
      J.salvar();
      if (window.Nuvem) window.Nuvem.enviar(true);
    } else if (!e.d.lenda && Math.random() < 0.035 * (e.brasas / e.d.brasas)) darItem('pedra_forja'); // queda rara, mais comum onde é mais perigoso
  }
  function acordar(e) {
    if (e.estado !== 'dorme') return;
    e.estado = 'caca'; e.t = 0;
    J.chefe = e; J.preso = true;
    avisa('chefe', { nome: e.d.nome, quem: e.tipo });
  }
  function alertar(e) { // o bando acorda junto: quem ouve vem ajudar
    for (const o of J.inimigos) {
      if (o !== e && (o.estado === 'ronda' || o.estado === 'volta') && !o.d.chefe && Math.hypot(o.x - e.x, o.y - e.y) < 170) { o.estado = 'caca'; o.t = 0; }
    }
  }

  // ---------- inimigos ----------
  function passoInimigo(e, dt) {
    const P = J.P, d = e.d;
    e.flash = Math.max(0, e.flash - dt);
    if (e.estado === 'morto') { e.t += dt; return; }
    const dx = P.x - e.x, dy = P.y - e.y;
    if (!d.chefe && (Math.abs(dx) > 620 || Math.abs(dy) > 460)) { // longe demais: volta para casa e não pesa no processador
      if (e.estado !== 'ronda') { e.estado = 'ronda'; e.x = e.cx; e.y = e.cy; e.hp = e.hpMax; e.firme = firmeza(d); }
      return;
    }
    if (d.chefe && e.estado === 'dorme' && Math.abs(dx) > 400) return;
    const dist = Math.hypot(dx, dy);
    e.t += dt;
    const fase2 = (d.chefe || d.lenda) && e.hp < e.hpMax * 0.55;
    if (fase2 && e.fase === 1) { e.fase = 2; avisa('fase', { x: e.x, y: e.y, nome: d.nome }); e.estado = 'recua'; e.t = 0; e.resta = 0.9; poderDeFase(e); }
    if (d.poder && e.fase === 2) poderContinuo(e, dt);
    const velK = fase2 ? 1.3 : 1, prepK = fase2 ? 0.78 : 1;
    switch (e.estado) {
      case 'dorme':
        if (dist < 8 * T) acordar(e);
        break;
      case 'ronda': {
        if (dist < d.visao && P.estado !== 'morto') { e.estado = 'caca'; e.t = 0; alertar(e); avisa('notou', { x: e.x, y: e.y, quem: e.tipo }); break; }
        e.vagar -= dt;
        if (e.vagar < -1.8) { e.vagar = 1 + Math.random() * 1.6; e.ang = Math.random() * 6.28; }
        if (e.vagar > 0) {
          const nx = Math.cos(e.ang) * d.vel * 0.35 * dt, ny = Math.sin(e.ang) * d.vel * 0.35 * dt;
          if (Math.hypot(e.x + nx - e.cx, e.y + ny - e.cy) < 70) { mover(e, nx, ny, d.r); e.passo += dt * 4; }
        }
        break;
      }
      case 'caca': {
        if (P.estado === 'morto') { e.estado = 'ronda'; break; }
        if (!d.chefe && (Math.hypot(e.x - e.cx, e.y - e.cy) > 900 || dist > d.visao * 3.5)) { e.estado = 'volta'; break; }
        e.ang = Math.atan2(dy, dx);
        const longeOk = d.atira ? dist > d.distancia : dist > d.alcance * 0.7;
        if (longeOk) {
          const anda = mover(e, Math.cos(e.ang) * d.vel * velK * dt, Math.sin(e.ang) * d.vel * velK * dt, d.r);
          e.passo += dt * (d.vel > 60 ? 12 : 8);
          if (!anda) { // contorna em vez de empacar
            const lado = e.id % 2 ? 1.2 : -1.2;
            mover(e, Math.cos(e.ang + lado) * d.vel * dt, Math.sin(e.ang + lado) * d.vel * dt, d.r);
          }
        } else if (d.atira && dist < d.distancia * 0.6) {
          mover(e, -Math.cos(e.ang) * d.vel * dt, -Math.sin(e.ang) * d.vel * dt, d.r); e.passo += dt * 7;
        }
        if (dist < d.alcance && e.t > 0.12) {
          e.estado = 'prepara'; e.t = 0; e.seq = d.seguidos || 1; e.resta = d.prep * prepK * (0.85 + Math.random() * 0.4); // tempo variável: não dá para decorar
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
        if (Math.hypot(e.x - e.cx, e.y - e.cy) < 24) { e.estado = 'ronda'; e.hp = e.hpMax; e.firme = firmeza(d); }
        break;
      case 'prepara':
        if (e.t < e.resta * 0.82) e.ang = Math.atan2(dy, dx); // persegue a mira até quase o golpe: rolar cedo não salva
        if (e.t >= e.resta) { e.estado = 'golpe'; e.t = 0; e.batida = false; e.resta = d.golpe; desferir(e, fase2); }
        break;
      case 'golpe': {
        const avanco = d.salta ? 330 : e.tipoGolpe === 'estocada' ? 340 : 130;
        if (!d.atira && e.tipoGolpe !== 'tremor') mover(e, Math.cos(e.ang) * avanco * dt, Math.sin(e.ang) * avanco * dt, d.r);
        if (!e.batida && !d.atira && e.tipoGolpe !== 'tremor' && e.t < e.resta * 0.65) { // só o começo do golpe machuca
          let dif = Math.atan2(P.y - e.y, P.x - e.x) - e.ang;
          while (dif > Math.PI) dif -= 2 * Math.PI; while (dif < -Math.PI) dif += 2 * Math.PI;
          const alc = (d.salta ? 26 + d.r : d.alcance) + P.r + 4;
          if (Math.hypot(P.x - e.x, P.y - e.y) < alc && Math.abs(dif) < 1.2) {
            if (J.ferir(Math.round(e.dano * (e.tipoGolpe === 'estocada' ? 1.25 : 1)), e.x, e.y, !!d.chefe)) { e.batida = true; if (!d.chefe) e.seq = 1; } // o combo para quando acerta; só chefe insiste
          }
        }
        if (e.t >= e.resta) {
          e.seq--;
          if (e.seq > 0) { e.estado = 'prepara'; e.t = 0; e.resta = d.prep * (e.batida ? 0.95 : 0.5) * prepK; } // depois de acertar, o chefe dá tempo de reagir
          else { e.estado = 'recua'; e.t = 0; e.resta = d.recua * (fase2 ? 0.75 : 1); }
        }
        break;
      }
      case 'recua':
        if (e.t >= e.resta) { e.estado = 'caca'; e.t = 0; }
        break;
      case 'atordoado':
        if (e.t >= e.atord) { e.estado = 'caca'; e.t = 0.12; } // volta direto à caça, pronto para revidar
        break;
    }
    if (!d.chefe) for (const o of J.inimigos) { // separa quem está empilhado
      if (o === e || o.estado === 'morto' || Math.abs(o.x - e.x) > 18) continue;
      const a = e.x - o.x, b = e.y - o.y, m = Math.hypot(a, b);
      if (m > 0 && m < 18) mover(e, (a / m) * 16 * dt, (b / m) * 16 * dt, d.r);
    }
  }
  // ---------- poderes dos chefes ----------
  function invocar(e, tipo, n) {
    const d = C.TIPOS[tipo];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283 + Math.random(), x = e.x + Math.cos(a) * 80, y = e.y + Math.sin(a) * 80;
      if (!livre(x, y, d.r)) continue;
      J.inimigos.push({ id: 5000 + Math.floor(Math.random() * 1e6), tipo, d, x, y, cx: x, cy: y, hp: d.hp, hpMax: d.hp, dano: d.dano, brasas: d.brasas * 0.3, estado: 'caca', t: 0, ang: a, passo: 0, flash: 0.3, atord: 0, resta: 0, batida: false, firme: firmeza(d), fase: 1, vagar: 0, invocado: true });
    }
    avisa('invocou', { x: e.x, y: e.y });
  }
  function poderDeFase(e) {
    const p = e.d.poder;
    if (p === 'bando') invocar(e, 'bandido', 2);
    if (p === 'uivo') { invocar(e, 'lobo', 3); avisa('uivo', {}); }
    if (p === 'levanta') invocar(e, 'morto', 3);
  }
  function poderContinuo(e, dt) {
    const p = e.d.poder;
    e.relogio = (e.relogio || 0) + dt;
    if (p === 'rastro' && (e.estado === 'caca' || e.estado === 'golpe') && e.relogio > 0.5) { // quem persegue deixa fogo pelo caminho
      e.relogio = 0;
      J.fx.push({ tipo: 'fogo', x: e.x, y: e.y, r: 22, vida: 5, t: 0, dano: e.dano * 0.34, proximo: 0 });
    }
    if (p === 'meteoro' && e.relogio > 2.6) { // cai onde o herói está: tem de sair do círculo
      e.relogio = 0;
      for (let i = 0; i < 3; i++) J.fx.push({ tipo: 'meteoro', x: J.P.x + (i ? (Math.random() - 0.5) * 170 : 0), y: J.P.y + (i ? (Math.random() - 0.5) * 170 : 0), r: 38, t: 0, cai: 1.05 + i * 0.22, dano: e.dano * 0.8 });
    }
  }
  function escolherGolpe(e, dist, fase2) {
    if (e.d.lenda) return e.d.tremor && fase2 && Math.random() < 0.3 ? 'tremor' : 'corte';
    if (!e.d.chefe) return 'corte';
    const r = Math.random();
    if (e.d.tremor && fase2 && r < 0.32) return 'tremor';
    if (r < 0.34 && dist > e.d.alcance * 0.4) return 'estocada';
    return 'corte';
  }
  function atirar(e, ang, vel) {
    J.tiros.push({ x: e.x, y: e.y - 18, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel, vida: 2.8, dano: Math.round(e.dano * (e.d.chefe ? 0.6 : 1)) });
  }
  function desferir(e, fase2) {
    const P = J.P, d = e.d;
    avisa('inimigoGolpe', { x: e.x, y: e.y, quem: e.tipo, golpe: e.tipoGolpe });
    if (d.atira) {
      // mira onde o herói vai estar: quem anda em linha reta é atingido
      const voo = Math.hypot(P.x - e.x, P.y - e.y) / 210;
      const a = Math.atan2(P.y + entrada.my * 60 * voo - e.y, P.x + entrada.mx * 60 * voo - e.x);
      atirar(e, a, 210);
      avisa('tiro', { x: e.x, y: e.y });
    }
    if (d.atiraFase2 && fase2) {
      const a = Math.atan2(P.y - e.y, P.x - e.x);
      for (const k of [-0.5, 0, 0.5]) atirar(e, a + k, 190);
      avisa('tiro', { x: e.x, y: e.y });
    }
    if (e.tipoGolpe === 'tremor') { // anel no chão: é preciso rolar através dele
      J.fx.push({ tipo: 'anel', x: e.x, y: e.y, r: 12, vel: 175, max: 300, dano: e.dano * 0.9, batido: false, t: 0 });
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
      if (!f.batido && Math.abs(d - f.r) < 11 && J.ferir(Math.round(f.dano), f.x, f.y, true)) f.batido = true;
    }
    for (const f of J.fx) {
      if (f.tipo === 'fogo') {
        f.vida -= dt; f.proximo -= dt;
        if (f.proximo <= 0 && Math.hypot(P.x - f.x, P.y - f.y) < f.r && J.ferir(Math.round(f.dano), f.x, f.y)) f.proximo = 0.8;
        if (f.todos) { // o mato pegando fogo queima quem estiver nele, bicho ou gente
          f.bichos = f.bichos || new Map();
          for (const e of J.inimigos) {
            if (e.estado === 'morto' || e.d.chefe || Math.hypot(e.x - f.x, e.y - f.y) > f.r + e.d.r) continue;
            if ((f.bichos.get(e) || 0) > J.tempo) continue;
            f.bichos.set(e, J.tempo + 0.8); acertarCom(e, Math.round(f.dano * 1.6), true);
          }
        }
      } else if (f.tipo === 'meteoro') {
        f.t += dt;
        if (f.t >= f.cai && !f.caiu) {
          f.caiu = true; f.vida = 0.3;
          avisa('meteoro', { x: f.x, y: f.y });
          if (Math.hypot(P.x - f.x, P.y - f.y) < f.r) J.ferir(Math.round(f.dano), f.x, f.y, true);
        }
        if (f.caiu) f.vida -= dt;
      }
    }
    J.fx = J.fx.filter((f) => (f.tipo === 'anel' ? f.r < f.max : f.tipo === 'fogo' ? f.vida > 0 : f.tipo === 'meteoro' ? !f.caiu || f.vida > 0 : true));
  }

  // ---------- interações ----------
  function portal(l, dentro, descer, subir) {
    return [
      { x: l[0] * T, y: (l[1] - 3) * T, vai: { x: (dentro[0] + 3) * T, y: dentro[1] * T }, texto: descer },
      { x: dentro[0] * T, y: dentro[1] * T, vai: { x: l[0] * T, y: (l[1] + 1) * T }, texto: subir },
    ];
  }
  J.PORTAIS = (() => {
    const c = M.LUGARES.cripta, sai = M.cr(18, 206), volta = M.cr(18, 202);
    return [
      { x: c[0] * T, y: (c[1] + 2) * T, vai: { x: sai[0] * T, y: sai[1] * T }, texto: 'Descer à cripta', chave: 'chave_ferro' },
      { x: volta[0] * T, y: volta[1] * T, vai: { x: c[0] * T, y: (c[1] + 5) * T }, texto: 'Subir ao cemitério' },
      ...portal(M.LUGARES.mina, M.cr(203, 202), 'Descer à Mina do Ferro', 'Subir à pedreira'),
      ...portal(M.LUGARES.gruta, M.cr(403, 207), 'Entrar na Gruta do Mangue', 'Sair para o mangue'),
    ];
  })();
  J.pertoDe = function () {
    const P = J.P;
    const r = J.S.resto;
    if (r && Math.hypot(r.x - P.x, r.y - P.y) < 34) return { tipo: 'resto', texto: 'Recolher brasas' };
    for (const id in C.FOGUEIRAS) {
      const f = C.FOGUEIRAS[id];
      if (Math.hypot(f.x * T + 16 - P.x, f.y * T + 16 - P.y) < 46) return { tipo: 'fogueira', id, texto: J.S.acesas.includes(id) ? 'Descansar' : 'Acender a fogueira' };
    }
    for (const n of J.gente) if (Math.hypot(n.px - P.x, n.py - P.y) < 42) return { tipo: 'npc', npc: n, texto: 'Falar com ' + n.nome };
    for (const t of C.TESOUROS) if (!J.S.tesouros.includes(t.id) && Math.hypot(t.x * T + 16 - P.x, t.y * T + 16 - P.y) < 34) return { tipo: 'tesouro', t, texto: 'Abrir o baú' };
    for (const t of C.ERVAS) if (!J.S.ervas.includes(t.id) && Math.hypot(t.x * T + 16 - P.x, t.y * T + 16 - P.y) < 30) return { tipo: 'erva', t, texto: 'Pegar: ' + C.ITENS[t.item].nome };
    for (const q of J.PORTAIS) if (Math.hypot(q.x - P.x, q.y - P.y) < 46) {
      if (q.chave && !J.S.chaves[q.chave]) return { tipo: 'trancado', texto: 'Trancada. Precisa de uma chave de ferro' };
      return { tipo: 'portal', q, texto: q.texto };
    }
    return null;
  };
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
      const t = alvo.t, tab = C.BAU_TABELA[t.perigo] || C.BAU_TABELA[1];
      J.S.tesouros.push(t.id);
      const id = t.fixo || tab[Math.floor(M.hash(t.x, t.y) * tab.length)];
      darItem(id, id === 'brasas' ? 120 * t.perigo + Math.floor(M.hash(t.y, t.x) * 150) : 1); J.salvar();
    } else if (alvo.tipo === 'erva') {
      J.S.ervas.push(alvo.t.id); darItem(alvo.t.item); J.salvar();
    } else if (alvo.tipo === 'npc') {
      avisa('npc', { npc: alvo.npc });
    } else if (alvo.tipo === 'trancado') {
      avisa('aviso', { t: alvo.texto });
    } else if (alvo.tipo === 'portal') {
      P.x = alvo.q.vai.x; P.y = alvo.q.vai.y; avisa('passagem');
    }
  };
  // conversa de Benta conforme o avanço
  J.falasBenta = function () {
    const S = J.S;
    if (S.fim) return C.CONVERSAS.bentaFim;
    if (S.falouBenta === 0) { S.falouBenta = 1; J.salvar(); return C.CONVERSAS.benta1; }
    if (S.cacos >= 3 && !S.cratera) { S.cratera = true; J.levantarMortos(); J.salvar(); return C.CONVERSAS.bentaTres; }
    if (S.cratera) return C.CONVERSAS.bentaCratera;
    return C.CONVERSAS.bentaFalta(S.cacos);
  };
  // missões
  J.progresso = function (id) {
    const q = C.MISSOES[id], S = J.S;
    if (q.quer.mata) return { tem: Math.max(0, (S.mortos[q.quer.mata] || 0) - (S.missoes[id] ? S.missoes[id].base : 0)), n: q.quer.n };
    return { tem: S.materiais[q.quer.item] || 0, n: q.quer.n };
  };
  J.aceitar = function (id) { const q = C.MISSOES[id]; J.S.missoes[id] = { base: q.quer.mata ? J.S.mortos[q.quer.mata] || 0 : 0, feita: false }; J.salvar(); };
  J.entregar = function (id) {
    const q = C.MISSOES[id];
    if (q.quer.item) J.S.materiais[q.quer.item] -= q.quer.n;
    J.S.missoes[id].feita = true;
    if (q.premio.brasas) J.S.brasas += q.premio.brasas;
    if (q.premio.item) darItem(q.premio.item, q.premio.qtd);
    J.salvar();
  };
  // loja e forja
  J.comprar = function (id) {
    const it = C.ITENS[id];
    if (J.S.brasas < it.preco) return false;
    J.S.brasas -= it.preco; darItem(id); J.salvar(); return true;
  };
  J.forjar = function () {
    const id = J.S.equip.arma, f = J.S.forja[id] || 0, custo = C.CUSTO_FORJA[f];
    if (custo == null || J.S.brasas < custo || !(J.S.materiais.pedra_forja > 0)) return false;
    J.S.brasas -= custo; J.S.materiais.pedra_forja--; J.S.forja[id] = f + 1; J.salvar(); return true;
  };
  J.equipar = function (id) {
    const it = C.ITENS[id];
    J.S.equip[it.tipo] = J.S.equip[it.tipo] === id && it.tipo === 'amuleto' ? null : id;
    J.P.vigor = Math.min(J.P.vigor, J.vigorMax());
    J.salvar();
  };
  // 1 de dia, 0 de noite, e o meio-termo no amanhecer e no entardecer
  J.momento = function () {
    const h = J.S.hora;
    if (h >= 7 && h < 17) return 1;
    if (h >= 19 || h < 5) return 0;
    return h >= 17 ? 1 - (h - 17) / 2 : (h - 5) / 2;
  };
  J.fazerTocha = function () {
    if (J.S.gravetos < 2 || J.S.brasas < 15 || J.S.tochas >= 5) return false;
    J.S.gravetos -= 2; J.S.brasas -= 15; J.S.tochas++;
    J.salvar();
    return true;
  };
  J.descansar = function (id) {
    if (J.momento() < 1) J.S.hora = 7; // quem dorme na fogueira acorda de manhã
    const P = J.P;
    J.S.fogueira = id;
    P.vida = J.vidaMax(); P.vigor = J.vigorMax(); P.cabaca = J.S.cabacaMax; P.estado = 'livre';
    J.tiros.length = 0;
    J.levantarMortos();
    J.salvar();
    avisa('descansou', { id });
    if (window.Nuvem) window.Nuvem.enviar(true);
  };
  J.subir = function (atr) {
    const custo = J.custoNivel();
    if (J.S.brasas < custo) return false;
    J.S.brasas -= custo; J.S.nivel[atr]++;
    J.P.vida = J.vidaMax(); J.P.vigor = J.vigorMax();
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
    else if (P.estado !== 'rola' && P.estado !== 'golpe') P.vigor = Math.min(J.vigorMax(), P.vigor + (P.estado === 'bebe' ? 8 : 34) * dt);

    if (entrada.rola) { entrada.rola = false; P.pedido = { q: 'rola', t: 0.28 }; }
    if (entrada.golpe) { entrada.golpe = false; P.pedido = { q: 'golpe', t: 0.32 }; }
    if (entrada.forte) { entrada.forte = false; P.pedido = { q: 'forte', t: 0.32 }; }
    if (P.pedido) {
      const ok = P.pedido.q === 'rola' ? J.rolar() : golpear(P.pedido.q === 'forte');
      P.pedido.t -= dt;
      if (ok || P.pedido.t <= 0) P.pedido = null;
    }
    if (entrada.bebe) { entrada.bebe = false; beber(); }
    if (entrada.usa) { entrada.usa = false; if (P.estado === 'livre') J.usar(); }
    if (entrada.trava) { entrada.trava = false; travar(); }
    if (entrada.poder) { entrada.poder = false; J.usarPoder(); }
    // hora do dia: uma volta inteira em 10 minutos
    { const antes = J.S.hora; J.S.hora = (J.S.hora + dt * 0.04) % 24; if (antes < 18 && J.S.hora >= 18) avisa('aviso', { t: 'A noite vem caindo. No escuro, uma tocha faz falta.' }); if (antes < 6 && J.S.hora >= 6) avisa('aviso', { t: 'O dia clareia.' }); }
    if (entrada.tocha) {
      entrada.tocha = false;
      if (P.tochaT > 0) P.tochaLiga = !P.tochaLiga;
      else if (J.S.tochas > 0) { J.S.tochas--; P.tochaT = 180; P.tochaLiga = true; avisa('aviso', { t: 'Tocha acesa.' }); }
      else avisa('aviso', { t: 'Sem tochas. Dá para fazer uma na fogueira.' });
    }
    if (P.tochaLiga) { P.tochaT -= dt; if (P.tochaT <= 0) { P.tochaLiga = false; P.tochaT = 0; avisa('aviso', { t: 'A tocha apagou.' }); } }
    P.esperaPoder = Math.max(0, (P.esperaPoder || 0) - dt); P.guarda = Math.max(0, (P.guarda || 0) - dt); P.passoCaca = Math.max(0, (P.passoCaca || 0) - dt);
    for (const t of J.tirosH) {
      t.x += t.vx * dt; t.y += t.vy * dt; t.vida -= dt;
      if (!M.anda(Math.floor(t.x / T), Math.floor((t.y + 20) / T)) && M.CHAO[Math.floor((t.y + 20) / T) * M.W + Math.floor(t.x / T)] !== M.AGUA) t.vida = 0;
      for (const e of J.inimigos) {
        if (t.vida <= 0 || e.estado === 'morto') continue;
        if (Math.hypot(e.x - t.x, e.y - 18 - t.y) < e.d.r + 8) { P.forte = false; t.vida = 0; acertarCom(e, t.dano); }
      }
    }
    J.tirosH = J.tirosH.filter((t) => t.vida > 0);
    if (P.alvo && (P.alvo.estado === 'morto' || Math.hypot(P.alvo.x - P.x, P.alvo.y - P.y) > 340)) P.alvo = null;

    switch (P.estado) {
      case 'livre': {
        const m = Math.hypot(entrada.mx, entrada.my);
        if (m > 0.1) {
          if (P.vigor <= 1) P.cansou = true; else if (P.vigor > 22) P.cansou = false; // esgotou: só volta a correr depois de recuperar um pouco
          const corre = entrada.corre && !P.cansou && !P.alvo;
          if (corre) { P.vigor = Math.max(0, P.vigor - 15 * dt); P.espera = Math.max(P.espera, 0.3); }
          const k = Math.min(1, m), v = (P.alvo ? 60 : 78) * (1 - J.peso() * 0.05 + (raca().vel || 0)) * (P.passoCaca > 0 ? 1.3 : 1) * (corre ? 1.6 : 1) * k;
          mover(P, (entrada.mx / m) * v * dt, (entrada.my / m) * v * dt, P.r);
          P.passo += dt * (corre ? 14 : 9) * k;
          if (!P.alvo) P.ang = Math.atan2(entrada.my, entrada.mx);
          P.andando = true;
        } else P.andando = false;
        if (P.alvo) P.ang = Math.atan2(P.alvo.y - P.y, P.alvo.x - P.x);
        break;
      }
      case 'rola': {
        const dur = 0.46, k = P.t / dur;
        P.inv = Math.max(P.inv, k > 0.08 && k < 0.7 ? 0.02 : 0); // janela de cerca de 0,3 s: é preciso acertar o momento
        const v = 205 * (1 - k * 0.55) * (1 - J.peso() * 0.06);
        mover(P, P.dirX * v * dt, P.dirY * v * dt, P.r);
        if (P.t >= dur) { P.estado = 'livre'; P.t = 0; }
        break;
      }
      case 'golpe': {
        const ativo = P.t >= P.hitIni && P.t <= P.hitFim;
        const avan = P.t < P.hitFim ? (P.forte ? 40 : 30) : 0;
        mover(P, Math.cos(P.ang) * avan * dt, Math.sin(P.ang) * avan * dt, P.r);
        if (ativo) for (const e of J.inimigos) {
          if (e.estado === 'morto' || P.batido.has(e.id)) continue;
          if (alcanceGolpe(e)) { P.batido.add(e.id); acertar(e); }
        }
        if (P.t >= P.dGolpe) { P.estado = 'livre'; P.t = 0; }
        break;
      }
      case 'bebe':
        if (P.t >= 1.15) {
          const am = item(J.S.equip.amuleto);
          P.cabaca--; P.vida = Math.min(J.vidaMax(), P.vida + 42 + (am && am.cura ? am.cura : 0));
          P.estado = 'livre'; P.t = 0; avisa('bebeu');
        }
        break;
      case 'dor':
        if (P.t >= 0.2) { P.estado = 'livre'; P.t = 0; }
        break;
      case 'morto': break;
    }
    if (P.estado !== 'morto') for (const e of J.inimigos) passoInimigo(e, dt);
    else for (const e of J.inimigos) e.flash = 0;
    passoTiros(dt);
    passoGente(dt);
    J.inimigos = J.inimigos.filter((e) => !(e.estado === 'morto' && e.t > 3));
    // mapa: marca o que já foi visto, em quadrados de 8 blocos
    const qx = Math.floor(P.x / T / 8), qy = Math.floor(P.y / T / 8);
    if (!J.S.visto[(qx << 8) | qy]) for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) J.S.visto[((qx + a) << 8) | (qy + b)] = 1;
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
