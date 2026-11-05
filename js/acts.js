/* SINA · o que o herói faz com a tecla E: falar, abrir baú, colher erva, minerar, pescar, assar na fogueira,
   tocar altar, usar o Marco da Sina, ler o quadro de avisos, entrar e sair de masmorra. E as mini-missões do quadro. */
(function (G) {
  'use strict';
  const D = G.D, Gm = G.Game, S = Gm.S, W = G.World, Dg = G.Dungeon, Cb = G.Combat, Fx = G.Fx;
  const Ac = G.Acts = {};
  const hyp = Math.hypot;

  // o que está ao alcance (para o aviso na tela e para o E)
  Ac.target = function () {
    const P = S.P;
    if (!P || S.dead) return null;
    let best = null, bd = 1.7;
    for (const e of S.ents) if (e.kind === 'npc' && !e.dead) { const d = hyp(e.x - P.x, e.y - P.y); if (d < bd) { bd = d; best = { type: 'npc', e, label: 'Falar com ' + e.name }; } }
    if (best) return best;
    for (const f of S.fx) if (f.kind === 'drop' && hyp(f.x - P.x, f.y - P.y) < 1.1) return { type: 'drop', f, label: 'Pegar' };
    // objetos em volta
    const fx = Math.floor(P.x), fy = Math.floor(P.y);
    bd = 2.2;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const o = Gm.objAt(fx + dx, fy + dy); if (!o || o.gone) continue;
      const ox = o.x + (o.w || 1) / 2, oy = o.y + 0.5, d = hyp(ox - P.x, oy - P.y);
      if (d >= bd) continue;
      const lab = labelOf(o); if (!lab) continue;
      bd = d; best = { type: 'obj', o, label: lab };
    }
    if (best) return best;
    // portas de prédio (no mundo)
    if (Gm.inWorld()) {
      const o = Gm.objAt(fx, fy - 1);
      if (o && o.k === 'building') { const door = o.x + Math.floor(o.w / 2); if (Math.abs(door - fx) <= 1) return { type: 'door', o, label: doorLabel(o) }; }
      // água na frente: pescar
      if (P.tools.vara) { const [ax, ay] = facing(); if (W.isWater(S.world, ax, ay)) return { type: 'fish', label: 'Pescar' }; }
    }
    return null;
  };
  function facing() { const P = S.P, d = [[0, 1], [0, -1], [1, 0], [-1, 0]][P.dir || 0]; return [P.x + d[0] * 1.1, P.y + d[1] * 1.1 - 0.2]; }
  function doorLabel(o) { return { templo: 'Templo', estalagem: 'Estalagem', ferreiro: 'Ferreiro', mercado: 'Mercado', alquimista: 'Alquimista', mago: 'Torre do mago', casa: 'Casa' }[o.kind] + ' (fechado: fale com quem está na porta)'; }
  function labelOf(o) {
    switch (o.k) {
      case 'chest': return o.open ? null : o.locked ? 'Baú trancado' + (S.P.tools.gazua ? ' (usar gazuas)' : ' (precisa de gazuas)') : 'Abrir o baú';
      case 'herb': return 'Colher ' + D.STACK[o.herb].name.toLowerCase();
      case 'ore': return S.P.tools.picareta ? 'Minerar' : 'Veio de minério (precisa de picareta)';
      case 'campfire': return 'Fogueira: assar e descansar';
      case 'altar': return D.ALTARS[o.altar].name;
      case 'marco': return 'Marco da Sina (viajar)';
      case 'quadro': return 'Quadro de avisos';
      case 'entrance': return D.DUNGEONS[o.dg].name;
      case 'stairsUp': return o.exit ? 'Sair da masmorra' : S.map.floor > 1 ? 'Subir' : 'Sair da masmorra';
      case 'stairsDown': return 'Descer';
      case 'urn': return 'Quebrar a urna';
      case 'altarSina': return 'O Altar da Sina';
      case 'poco': return 'Beber água do poço';
      default: return null;
    }
  }

  Ac.use = function () {
    const t = Ac.target(); if (!t) return;
    const P = S.P;
    if (t.type === 'npc') return talk(t.e);
    if (t.type === 'drop') return pickup(t.f);
    if (t.type === 'door') return G.UI.toast(t.label);
    if (t.type === 'fish') return fish();
    const o = t.o;
    switch (o.k) {
      case 'chest': return openChest(o);
      case 'herb': {
        const n = (P.perks.coletor ? 2 : 1);
        Gm.give(o.herb, n); Gm.skillXp('alquimia', 2);
        removeWorldOrDg(o); G.Audio.sfx('colher');
        return;
      }
      case 'ore': {
        if (!P.tools.picareta) return G.UI.toast('Precisa de uma picareta. Os mercadores vendem.');
        G.UI.progress('Minerando...', 1.2, () => {
          const mul = D.RACES[P.race].mine || 1, id = 'min_' + o.ore;
          Gm.give(id, (1 + (Math.random() < 0.4 ? 1 : 0)) * mul);
          if (Math.random() < 0.08) Gm.give('gema', 1);
          Gm.skillXp('forja', 2);
          removeWorldOrDg(o); G.Audio.sfx('minerar');
          Fx.burst(o.x + 0.5, o.y + 0.4, '#8a858a', 12, 2);
        });
        G.Audio.sfx('minerar');
        return;
      }
      case 'campfire': return G.UI.openCamp();
      case 'altar': {
        const first = !P.found.altars[o.altar];
        P.found.altars[o.altar] = 1;
        P.blessing = o.altar; Gm.refresh();
        G.UI.banner(D.ALTARS[o.altar].name, D.ALTARS[o.altar].desc);
        G.Audio.sfx('nivel'); Fx.burst(o.x + 0.5, o.y - 1, '#9be7ff', 30, 2, 2);
        if (first) Gm.gainXp(40);
        Gm.checkQuests();
        return;
      }
      case 'marco': {
        P.lastMarco = o.city; P.found.cities[o.city] = 1;
        P.hp = S.st.maxHp; Gm.save(true);
        G.UI.openMap(true);
        return;
      }
      case 'quadro': return G.UI.openBoard(o.city);
      case 'entrance': {
        const dd = D.DUNGEONS[o.dg];
        if (dd.sealed && !P.flags.veu) {
          if (Gm.count('chave_selo')) { P.flags.veu = 1; G.UI.toast('A Chave do Selo brilha. O Véu se abre.', 'gold'); }
          else return G.UI.toast('Um selo de fogo fecha a passagem. Só a Chave do Selo abre.');
        }
        Gm.save(true);
        return Gm.enterDungeon(o.dg, 1);
      }
      case 'stairsUp': if (o.exit || S.map.floor <= 1) return Gm.leaveDungeon(); return Gm.enterDungeon(S.map.id, S.map.floor - 1, true);
      case 'stairsDown': return Gm.enterDungeon(S.map.id, S.map.floor + 1);
      case 'urn': return Cb.breakUrn(o);
      case 'altarSina': return G.UI.finale();
      case 'poco': P.st = S.st.maxSt; G.UI.toast('Água fresca. Vigor cheio.'); return;
    }
  };
  function removeWorldOrDg(o) {
    if (Gm.inWorld()) { W.removeObj(S.world, o); S.P.taken[o.id] = S.day; G.Render.invalidate(); }
    else Dg.removeObj(S.map.m, o);
  }
  function pickup(f) {
    f.dead = true; S.fx = S.fx.filter((x) => x !== f);
    if (f.gold) { Gm.addGold(f.gold); G.Audio.sfx('moeda'); return; }
    if (f.stack) { Gm.give(f.stack, f.n); G.Audio.sfx('pegar'); return; }
    if (f.it) { if (Gm.addItem(f.it)) G.Audio.sfx('pegar'); }
  }
  Ac.pickup = pickup;
  // pega moedas e coisas sozinho quando passa por cima
  Ac.autoPick = function () {
    const P = S.P;
    for (const f of S.fx) if (f.kind === 'drop' && !f.dead && f.t > 0.4 && (f.gold || f.stack) && hyp(f.x - P.x, f.y - P.y) < 0.8) pickup(f);
  };
  function openChest(o) {
    const P = S.P;
    if (o.locked && !P.tools.gazua) return G.UI.toast('Trancado. Gazuas abririam.');
    o.open = true;
    G.Audio.sfx('bau');
    const lvl = S.map.kind === 'dg' ? D.DUNGEONS[S.map.id].lvl + S.map.floor - 1 : (D.REGIONS[o.lvlReg] || D.REGIONS.campo).lvl[1];
    const x = o.x + 0.5, y = o.y + 1;
    Gm.dropGold(x, y, Math.round(Gm.ri(8, 20 + lvl * 6) * S.st.goldMul * (o.rare ? 2 : 1)));
    const n = (o.rare ? 2 : 1) + (o.locked ? 1 : 0);
    for (let i = 0; i < n; i++) Gm.dropItem(x, y, Gm.loot(lvl, o.rare ? 3 : o.locked ? 1.5 : 0.5));
    if (Math.random() < 0.5) Gm.dropStack(x, y, Gm.pick(['pocao_vida', 'pocao_mana', 'pocao_vigor', 'pocao_vida2']), 1);
    if (Math.random() < 0.12) { const sp = Gm.pick(['geada', 'luz', 'egide', 'lobo', 'centelha']); S.fx.push({ kind: 'drop', x, y, it: { uid: Gm.uid(), id: 'tomo', spell: sp, name: 'Tomo: ' + D.SPELLS[sp].name, rar: 1 }, t: 0, life: 600, bob: 0 }); }
    if (o.cid) P.opened[o.cid] = S.day;
    if (Gm.inWorld()) { P.taken[o.id] = S.day; G.Render.invalidate(); }
  }
  function fish() {
    G.UI.progress('Pescando...', 2.2, () => {
      if (Math.random() < 0.72) { Gm.give('peixe', 1); G.Audio.sfx('pegar'); if (Math.random() < 0.04) Gm.give('joia_velha', 1); }
      else G.UI.toast('Escapou.');
    });
    G.Audio.sfx('agua');
  }
  function talk(e) {
    S.talkNpc = e;
    if (e.npc && D.DLG[e.npc]) return G.UI.dialog(e, D.DLG[e.npc](Gm.Q));
    // quem só tem ofício
    const role = e.role || (e.npc && D.NPCS[e.npc].role);
    const o = [];
    if (role === 'mercador' || role === 'ferreiro' || role === 'alquimista' || role === 'mago') o.push({ t: role === 'mago' ? 'Quero ver seus tomos.' : 'Quero comprar e vender.', do: () => G.UI.openShop(e) });
    if (role === 'ferreiro') o.push({ t: 'Quero usar a forja.', do: () => G.UI.openForge() });
    if (role === 'alquimista') o.push({ t: 'Quero usar a bancada.', do: () => G.UI.openAlchemy() });
    if (role === 'estalagem') { o.push({ t: 'Quero um quarto (10 de ouro).', do: () => G.UI.inn(e) }); o.push({ t: 'Ouviu alguma coisa?', do: () => G.UI.toast(Gm.pick(D.RUMORS)) }); }
    o.push({ t: 'Até mais.' });
    const lines = D.IDLE[e.idle || (e.npc && D.NPCS[e.npc].race) || 'humano'] || D.IDLE.humano;
    const greet = role === 'mercador' ? 'Mercadoria boa, preço justo. Quase sempre.' : role === 'ferreiro' ? 'Precisa de aço? Ou de conserto?' : role === 'alquimista' ? 'Ervas, poções e remédios.' : role === 'mago' ? 'Conhecimento custa caro. Mas vale.' : role === 'estalagem' ? 'Cama limpa, sopa quente.' : role === 'guarda' ? Gm.pick(['Circulando.', 'Nada de confusão aqui dentro.', 'Cuidado na estrada à noite.']) : Gm.pick(lines);
    G.UI.dialog(e, { start: { t: greet, o } });
  }
  Ac.talk = talk;

  // ---------- fogueira e comida ----------
  Ac.cook = function () {
    let n = 0;
    for (const [raw, done] of [['peixe', 'peixe_assado'], ['carne', 'carne_assada']]) { const k = Gm.count(raw); if (k) { Gm.take(raw, k); Gm.give(done, k, true); n += k; } }
    G.UI.toast(n ? 'Assou ' + n + ' porção(ões).' : 'Nada para assar. Pesque ou cace.');
    if (n) G.Audio.sfx('fogo');
  };
  Ac.lightFire = function () {
    const P = S.P;
    if (!P.tools.machadinha) return G.UI.toast('Precisa de uma machadinha para cortar lenha.');
    if (!Gm.inWorld()) return G.UI.toast('Aqui dentro não dá para acender fogueira.');
    const x = Math.floor(P.x + 1), y = Math.floor(P.y);
    if (W.blocked(S.world, x, y) || W.objAt(S.world, x, y)) return G.UI.toast('Sem espaço aqui.');
    const o = W.addObj(S.world, 'campfire', x, y, { temp: S.day });
    void o; G.Render.invalidate(); G.Audio.sfx('fogo'); G.UI.toast('Fogueira acesa.');
  };
  Ac.useStack = function (id) {
    const P = S.P, d = D.STACK[id];
    if (!Gm.count(id) || !d || !d.use) return;
    const pot = 1 + P.skills.alquimia.lv * 0.006 + (P.perks.boticario ? 0.25 : 0);
    Gm.take(id, 1);
    if (d.use === 'heal') { P.hp = Math.min(S.st.maxHp, P.hp + d.v * pot); Fx.float(P.x, P.y - 1.4, '+' + Math.round(d.v * pot), '#9cf28a'); G.Audio.sfx('beber'); }
    else if (d.use === 'mana') { P.mp = Math.min(S.st.maxMp, P.mp + d.v * pot); G.Audio.sfx('beber'); }
    else if (d.use === 'stam') { P.st = Math.min(S.st.maxSt, P.st + d.v * pot); G.Audio.sfx('beber'); }
    else if (d.use === 'food') { P.food = (P.food || 0) + d.v; G.Audio.sfx('comer'); }
    else if (d.use === 'buff') { P.buffs[d.buff] = d.dur * pot; Gm.refresh(); G.Audio.sfx('beber'); G.UI.toast(d.desc); }
  };
  Ac.quickPotion = function (kind) {
    const order = kind === 'mana' ? ['pocao_mana'] : ['pocao_vida', 'pocao_vida2', 'carne_assada', 'peixe_assado', 'pao'];
    const P = S.P;
    if (kind !== 'mana' && P.hp > S.st.maxHp * 0.7 && Gm.count('pocao_vida2')) order.reverse();
    for (const id of order) if (Gm.count(id)) return Ac.useStack(id);
    G.UI.toast(kind === 'mana' ? 'Sem poção de mana.' : 'Sem poção de vida.'); G.Audio.sfx('erro');
  };

  // ---------- mini-missões do quadro de avisos ----------
  const Mi = G.Minis = {};
  Mi.board = function (cid) {
    if (S.boards[cid]) return S.boards[cid];
    const rng = new G.RNG(G.hashStr(cid) * 31 + S.day * 977);
    const C = D.CITIES[cid], R = D.REGIONS[C.region], lvl = R.lvl[1];
    const list = [];
    const monsters = Object.keys(R.mons);
    const m1 = monsters[rng.int(0, monsters.length - 1)];
    list.push({ type: 'kill', mon: m1, n: rng.int(4, 8), city: cid });
    if (R.herb.length) list.push({ type: 'item', item: R.herb[rng.int(0, R.herb.length - 1)], n: rng.int(3, 6), city: cid });
    const near = Object.keys(D.DUNGEONS).filter((k) => !D.DUNGEONS[k].story && Math.abs(D.DUNGEONS[k].lvl - lvl) < 6);
    if (near.length) list.push({ type: 'dungeon', dg: near[rng.int(0, near.length - 1)], city: cid });
    const others = D.CITY_ORDER.filter((c) => c !== cid);
    list.push({ type: 'deliver', to: others[rng.int(0, others.length - 1)], city: cid });
    for (const m of list) {
      m.id = cid + ':' + S.day + ':' + m.type;
      m.lvl = lvl;
      const base = m.type === 'kill' ? 14 * m.n : m.type === 'item' ? 12 * m.n : m.type === 'dungeon' ? 160 : 90;
      m.gold = Math.round(base * (1 + lvl * 0.12));
      m.xp = Math.round(base * 0.8 * (1 + lvl * 0.1));
      m.title = Mi.title(m);
    }
    return (S.boards[cid] = list);
  };
  Mi.title = function (m) {
    if (m.type === 'kill') return 'Recompensa: abater ' + m.n + ' ' + D.MON[m.mon].name.toLowerCase() + (m.n > 1 ? '(s)' : '');
    if (m.type === 'item') return 'Procura-se: ' + m.n + ' ' + D.STACK[m.item].name.toLowerCase();
    if (m.type === 'dungeon') return 'Limpar a masmorra: ' + D.DUNGEONS[m.dg].name;
    return 'Levar uma encomenda a ' + D.CITIES[m.to].name;
  };
  Mi.accept = function (m) {
    const P = S.P;
    if (P.minis.length >= 3) return G.UI.toast('Você já tem 3 avisos aceitos.');
    if (P.minis.some((x) => x.id === m.id)) return;
    const q = Object.assign({}, m, { n0: m.type === 'kill' ? (P.kills[m.mon] || 0) : 0, done: false, dgBase: m.type === 'dungeon' ? false : null });
    if (m.type === 'deliver') Gm.give('encomenda', 1, true);
    P.minis.push(q);
    G.UI.toast('Aviso aceito: ' + m.title, 'quest');
    Mi.check();
  };
  Mi.progress = function (q) {
    const P = S.P;
    if (q.type === 'kill') return Math.min(q.n, (P.kills[q.mon] || 0) - q.n0) + ' de ' + q.n;
    if (q.type === 'item') return Math.min(q.n, Gm.count(q.item)) + ' de ' + q.n;
    if (q.type === 'dungeon') return q.done ? 'feito' : 'falta';
    return q.done ? 'entregue' : 'leve ao quadro de ' + D.CITIES[q.to].name;
  };
  Mi.check = function () {
    const P = S.P; if (!P) return;
    for (const q of P.minis) {
      if (q.done) continue;
      if (q.type === 'kill' && (P.kills[q.mon] || 0) - q.n0 >= q.n) { q.done = true; G.UI.toast('Aviso cumprido: volte a um quadro de avisos.', 'quest'); }
      if (q.type === 'item' && Gm.count(q.item) >= q.n) q.ready = true;
    }
  };
  Mi.onKill = function () { Mi.check(); };
  Mi.onDungeon = function (id) { for (const q of S.P.minis) if (q.type === 'dungeon' && q.dg === id && !q.done) { q.done = true; G.UI.toast('Aviso cumprido: volte a um quadro de avisos.', 'quest'); } };
  // entregar no quadro
  Mi.claim = function (cid) {
    const P = S.P;
    let n = 0;
    for (const q of P.minis.slice()) {
      let ok = q.done;
      if (q.type === 'item' && Gm.count(q.item) >= q.n) { Gm.take(q.item, q.n); ok = true; }
      if (q.type === 'deliver' && cid === q.to && Gm.count('encomenda')) { Gm.take('encomenda', 1); ok = true; }
      if (!ok) continue;
      P.minis.splice(P.minis.indexOf(q), 1);
      Gm.addGold(q.gold); Gm.gainXp(q.xp);
      if (Math.random() < 0.35) Gm.addItem(Gm.loot(q.lvl, 1));
      n++;
    }
    if (n) { G.UI.toast(n + ' aviso(s) entregue(s).', 'gold'); G.Audio.sfx('missao'); }
    return n;
  };
  D.STACK.encomenda = { name: 'Encomenda', ic: 'caixa_i', price: 0, quest: true, desc: 'Um pacote amarrado. Entregue no quadro de avisos da cidade de destino.' };
})(globalThis.G = globalThis.G || {});
