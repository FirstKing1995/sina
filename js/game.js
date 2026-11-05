/* SINA · o estado do jogo: o herói, atributos, perícias, itens e saque, o mapa atual (mundo ou masmorra),
   as missões (a ponte Q usada pelas conversas), o tempo, salvar e carregar. */
(function (G) {
  'use strict';
  const D = G.D, W = G.World, Dg = G.Dungeon;
  const Gm = G.Game = {};
  const S = Gm.S = { P: null, world: null, map: null, ents: [], projs: [], hazards: [], tele: [], fx: [], floats: [], toasts: [], time: 8 * 60, day: 1, shake: 0, hitstop: 0, mode: 'title', uid: 1, shops: {}, boards: {}, dgCache: {} };
  Gm.SEED = 20261104;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rnd = () => Math.random();
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  Gm.ri = ri;

  // ---------- o herói ----------
  Gm.newHero = function (o) {
    const R = D.RACES[o.race], O = D.ORIGINS[o.origin];
    const P = {
      name: o.name || 'Sem-Sina', race: o.race, origin: o.origin, look: { sex: o.sex || 'M', skin: o.skin | 0, hair: o.hair | 0 },
      lvl: 1, xp: 0, perkPts: 0, attrPts: 0, picks: { hp: 0, mp: 0, st: 0 }, perks: {},
      skills: {}, gold: O.gold || 30, inv: [], stack: {}, tools: {}, equip: {}, spells: (O.spells || []).slice(), slots: [null, null, null, null],
      q: {}, minis: [], flags: {}, found: { cities: {}, dungeons: {}, altars: {} }, blessing: null, kills: {}, dg: {}, opened: {}, taken: {},
      x: 0, y: 0, map: 'world', hp: 1, mp: 1, st: 1, buffs: {}, deaths: 0, played: 0, ending: null, uniqDead: {}, version: D.VERSION,
    };
    for (const k of D.SKILL_ORDER) P.skills[k] = { lv: 15 + (R.skills[k] || 0) + (O.skills[k] || 0), xp: 0 };
    for (const [base, mat] of O.kit) { const it = Gm.makeItem(base, mat, 0, 1); Gm.equip(P, it, true); }
    for (const t of O.tools || []) P.tools[t] = 1;
    P.stack.pocao_vida = 3; P.stack.pocao_mana = O.spells ? 3 : 1; P.stack.pao = 3;
    P.spells.forEach((s, i) => { if (i < 4) P.slots[i] = s; });
    P.q.main = { s: 1, n: 0 };
    return P;
  };

  // ---------- atributos derivados ----------
  Gm.stats = function (P) {
    const R = D.RACES[P.race], e = P.equip;
    const aff = {};
    let arm = 0;
    for (const sl of D.SLOTS) {
      const it = e[sl]; if (!it) continue;
      for (const k in it.aff) aff[k] = (aff[k] || 0) + it.aff[k];
      const b = D.ARMORS[it.base];
      if (b && b.arm) arm += b.arm * D.MATS[it.mat].mult * (1 + (it.up || 0) * 0.12) * (D.RARITY[it.rar].mult);
    }
    const sk = (k) => P.skills[k].lv + (aff['sk_' + k] || 0);
    const bl = P.blessing, bf = P.buffs;
    const s = { aff, sk };
    s.maxHp = Math.round(100 + R.hp + P.picks.hp * 10 + (P.lvl - 1) * 4 + (aff.vida || 0) + (bl === 'mar' ? 40 : 0));
    s.maxMp = Math.round((80 + R.mp + P.picks.mp * 10 + (aff.mana || 0)) * (bl === 'mago' ? 1.25 : 1));
    s.maxSt = Math.round(90 + R.st + P.picks.st * 10 + (aff.vigor || 0));
    s.arm = (arm + (aff.armad || 0)) * (1 + sk('defesa') * 0.005) * (P.perks.couro_grosso ? 1.15 : 1) * (bl === 'montanha' ? 1.25 : 1) * (bf.pedra ? 1.4 : 1);
    s.speed = 4.4 * (R.speed || 1) * (1 + Math.min(30, aff.passo || 0) / 100) * (bl === 'andarilho' ? 1.1 : 1);
    s.crit = Math.min(40, 5 + (aff.critico || 0)) / 100;
    s.leech = Math.min(10, aff.roubo || 0) / 100;
    s.atkSpd = 1 + Math.min(40, aff.veloc || 0) / 100;
    s.res = { fogo: (R.resist && R.resist.fogo || 0) + (aff.res_fogo || 0) / 100 + (bl === 'sol' ? 0.25 : 0) + (bf.antifogo ? 0.5 : 0), gelo: (aff.res_gelo || 0) / 100 + (bl === 'mar' ? 0.25 : 0), raio: (aff.res_raio || 0) / 100 };
    for (const k in s.res) s.res[k] = Math.min(0.8, s.res[k]);
    s.hpRegen = (R.hpRegen || 0) + (aff.regen || 0) + (P.perks.vigilia ? 1.5 : 0) + (bl === 'lua' && Gm.isNight() ? 1.5 : 0) + 0.3;
    s.mpRegen = (1.6 + (aff.mregen || 0)) * (R.mpRegen || 1) * (P.perks.fonte ? 1.5 : 1) * (bl === 'mago' ? 1.3 : 1);
    s.goldMul = 1 + (aff.ouro || 0) / 100 + (bl === 'andarilho' ? 0.25 : 0) + (P.perks.mercador ? 0.2 : 0);
    s.magic = 1 + sk('destruicao') * 0.009 + (aff.magia || 0) / 100 + (P.perks.chama_viva ? 0.25 : 0);
    s.light = (R.light || 1) * (P.tools.tocha ? 1.35 : 1);
    s.night = !!R.night || bl === 'lua';
    // arma
    const wp = e.arma, wb = wp ? D.WEAPONS[wp.base] : null;
    if (wb) {
      const m = D.MATS[wp.mat].mult * (1 + (wp.up || 0) * 0.1) * D.RARITY[wp.rar].mult;
      const skill = wb.ranged && !wb.magic ? sk('arco') : wb.magic ? sk('destruicao') : sk('lamina');
      const sm = 1 + skill * 0.008 * (wb.magic ? 0.6 : 1);
      let pm = 1;
      if (!wb.ranged && P.perks.golpe_firme) pm *= 1.2;
      if (wb.ranged && !wb.magic && P.perks.mira) pm *= 1.2;
      if (bl === 'guerreiro' && !wb.magic) pm *= 1.15;
      if (bf.forca) pm *= 1.25;
      s.wpn = { base: wp.base, def: wb, min: (wb.dmg[0] * m + (aff.dano || 0)) * sm * pm, max: (wb.dmg[1] * m + (aff.dano || 0)) * sm * pm,
        fire: (aff.fogo || 0) * (bl === 'sol' ? 1.25 : 1), ice: aff.gelo || 0, shock: aff.raio || 0, spd: wb.spd * s.atkSpd, reach: wb.reach, arc: wb.arc || 100, ranged: !!wb.ranged, magic: !!wb.magic, pen: wb.armorPen || 0, mat: wp.mat };
      if (wb.magic) s.magic += wb.spell || 0;
    } else s.wpn = { base: 'punho', def: { name: 'Punhos' }, min: 2, max: 4, fire: 0, ice: 0, shock: 0, spd: 2, reach: 1.0, arc: 80, ranged: false, magic: false, pen: 0 };
    return s;
  };
  Gm.refresh = function () { const P = S.P; S.st = Gm.stats(P); P.hp = Math.min(P.hp, S.st.maxHp); P.mp = Math.min(P.mp, S.st.maxMp); P.st = Math.min(P.st, S.st.maxSt); };
  Gm.isNight = function () { const h = (S.time / 60) % 24; return h < 5.5 || h > 19.5; };

  // ---------- experiência ----------
  Gm.xpNeed = (l) => Math.round(70 * Math.pow(l, 1.55));
  Gm.gainXp = function (n) {
    const P = S.P; n = Math.round(n * (D.RACES[P.race].xp || 1));
    P.xp += n;
    while (P.xp >= Gm.xpNeed(P.lvl)) {
      P.xp -= Gm.xpNeed(P.lvl); P.lvl++; P.perkPts++; P.attrPts++;
      Gm.refresh(); P.hp = S.st.maxHp; P.mp = S.st.maxMp; P.st = S.st.maxSt;
      G.UI.toast('Nível ' + P.lvl + '! Escolha um atributo e um talento (tecla C).', 'gold');
      G.Audio.sfx('nivel');
      G.Fx.burst(P.x, P.y - 0.6, '#f2da72', 30, 3);
    }
  };
  Gm.skillXp = function (k, n) {
    const P = S.P, s = P.skills[k];
    if (!s || s.lv >= 100) return;
    s.xp += n;
    let need = 6 + s.lv * 1.15;
    while (s.xp >= need && s.lv < 100) {
      s.xp -= need; s.lv++; need = 6 + s.lv * 1.15;
      G.UI.toast(D.SKILLS[k].name + ' subiu para ' + s.lv + '.', 'skill');
      Gm.gainXp(4 + s.lv * 0.6);
      Gm.refresh();
    }
  };

  // ---------- itens ----------
  Gm.uid = () => 'i' + (Date.now() % 1e8).toString(36) + (S.uid++).toString(36);
  Gm.makeItem = function (base, mat, rar, lvl, affFix) {
    const it = { uid: Gm.uid(), base, mat, rar: rar || 0, lvl: lvl || 1, up: 0, aff: {} };
    if (affFix) it.aff = Object.assign({}, affFix);
    else if (rar > 0) {
      const R = D.RARITY[rar], kind = D.WEAPONS[base] ? 'a' : D.ARMORS[base].jewel ? 'j' : 'r';
      const pool = Object.keys(D.AFFIX).filter((k) => D.AFFIX[k].w.indexOf(kind) >= 0);
      const n = ri(R.aff[0], R.aff[1]);
      for (let i = 0; i < n && pool.length; i++) {
        const k = pool.splice(ri(0, pool.length - 1), 1)[0], A = D.AFFIX[k];
        let v = (A.base + A.per * lvl) * (0.7 + Math.random() * 0.6) * (rar === 3 ? 1.3 : 1);
        if (A.cap) v = Math.min(A.cap, v);
        it.aff[k] = A.dec ? Math.round(v * 10) / 10 : Math.max(1, Math.round(v));
      }
    }
    it.name = Gm.itemName(it);
    return it;
  };
  const PREF = ['Ardente', 'Trovejante', 'Veloz', 'Fiel', 'Selvagem', 'Errante', 'Brilhante', 'Feroz', 'Imortal', 'Voraz', 'Celeste', 'Leal'];
  Gm.itemName = function (it) {
    if (it.unique) return D.UNIQUES[it.unique].name;
    const b = D.WEAPONS[it.base] || D.ARMORS[it.base], m = D.MATS[it.mat];
    const jewel = b.jewel;
    let n = b.name + (jewel ? (it.mat === 'ouro' ? ' de ouro' : ' de prata') : ' ' + m.name);
    if (jewel) n = b.name + ' ' + (['de cobre', 'de prata', 'de ouro', 'de estrela'][it.rar] || '');
    const h = G.hashStr(it.uid) >>> 0;
    if (it.rar === 1) n += ' ' + D.SUFFIX[h % D.SUFFIX.length];
    if (it.rar >= 2) n = b.name + ' ' + PREF[h % PREF.length] + ' ' + D.SUFFIX[(h >>> 4) % D.SUFFIX.length];
    return n;
  };
  Gm.unique = function (id) {
    const U = D.UNIQUES[id], it = Gm.makeItem(U.base, U.mat, 3, 15, U.aff);
    it.unique = id; it.name = U.name;
    return it;
  };
  // saque aleatório pelo nível
  Gm.loot = function (lvl, boost) {
    boost = boost || 0;
    const r = Math.random() * 100 - boost * 12;
    const rar = r < 2 ? 3 : r < 13 ? 2 : r < 42 ? 1 : 0;
    const tier = clamp(Math.floor((lvl + Math.random() * 3 + 1) / 4) + 1, 1, 6);
    const t = Math.random();
    let base, mat;
    if (t < 0.48) { base = pick(Object.keys(D.WEAPONS)); mat = D.MAT_BY_TIER[tier]; }
    else if (t < 0.9) {
      const heavy = Math.random() < 0.5, slot = pick(['cabeca', 'corpo', 'maos', 'pes']);
      base = slot + (heavy ? '_pesada' : '_leve'); mat = heavy ? D.MAT_BY_TIER[tier] : D.LIGHT_BY_TIER[tier];
      if (heavy && mat === 'pano') mat = 'ferro';
    } else { base = Math.random() < 0.6 ? 'anel' : 'amuleto'; mat = 'ferro'; }
    return Gm.makeItem(base, mat, D.ARMORS[base] && D.ARMORS[base].jewel ? Math.max(1, rar) : rar, lvl);
  };
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  Gm.pick = pick;
  Gm.value = function (it) {
    if (!it.base) { const s = D.STACK[it.id]; return it.id === 'tomo' ? (D.SPELLS[it.spell].price || 200) : s ? s.price : 1; }
    const b = D.WEAPONS[it.base] || D.ARMORS[it.base];
    return Math.round(b.price * Math.pow(D.MATS[it.mat].mult, 1.35) * (1 + it.rar * 0.9 + (it.unique ? 2 : 0)) * (1 + (it.up || 0) * 0.25) + Object.keys(it.aff).length * 12 + it.lvl * 2);
  };
  Gm.slotOf = (it) => (D.WEAPONS[it.base] ? 'arma' : D.ARMORS[it.base] ? D.ARMORS[it.base].slot : null);
  Gm.equip = function (P, it, fresh) {
    const sl = Gm.slotOf(it); if (!sl) return;
    const i = P.inv.indexOf(it); if (i >= 0) P.inv.splice(i, 1);
    if (P.equip[sl]) P.inv.push(P.equip[sl]);
    P.equip[sl] = it;
    if (!fresh) { Gm.refresh(); G.Audio.sfx('equipar'); G.Render.heroDirty = true; }
  };
  Gm.unequip = function (P, sl) { const it = P.equip[sl]; if (!it) return; if (P.inv.length >= 48) return G.UI.toast('A mochila está cheia.'); P.inv.push(it); delete P.equip[sl]; Gm.refresh(); G.Render.heroDirty = true; };
  Gm.addItem = function (it, quiet) {
    const P = S.P;
    if (P.inv.length >= 48) { G.UI.toast('A mochila está cheia. O item ficou no chão.'); Gm.dropItem(P.x, P.y, it); return false; }
    P.inv.push(it);
    if (!quiet) G.UI.toast('Pegou ' + it.name + '.', D.RARITY[it.rar] ? 'r' + it.rar : '');
    return true;
  };
  Gm.give = function (id, n, quiet) {
    const P = S.P; n = n || 1;
    if (D.TOOLS[id]) { P.tools[id] = 1; if (!quiet) G.UI.toast('Ferramenta: ' + D.TOOLS[id].name + '.'); return; }
    P.stack[id] = (P.stack[id] || 0) + n;
    if (!quiet) G.UI.toast('+' + n + ' ' + D.STACK[id].name);
    Gm.checkQuests();
  };
  Gm.take = function (id, n) { const P = S.P; P.stack[id] = Math.max(0, (P.stack[id] || 0) - n); if (!P.stack[id]) delete P.stack[id]; };
  Gm.count = (id) => S.P.stack[id] || 0;
  Gm.addGold = function (n, quiet) { S.P.gold += n; if (!quiet && n) G.UI.toast((n > 0 ? '+' : '') + n + ' de ouro', 'gold'); };

  // ---------- coisas no chão ----------
  Gm.dropItem = function (x, y, it) { S.fx.push({ kind: 'drop', x: x + (Math.random() - 0.5) * 0.8, y: y + (Math.random() - 0.5) * 0.6, it, t: 0, life: 600, bob: Math.random() * 6 }); };
  Gm.dropGold = function (x, y, n) { S.fx.push({ kind: 'drop', x: x + (Math.random() - 0.5) * 0.8, y: y + (Math.random() - 0.5) * 0.6, gold: n, t: 0, life: 600, bob: Math.random() * 6 }); };
  Gm.dropStack = function (x, y, id, n) { S.fx.push({ kind: 'drop', x: x + (Math.random() - 0.5) * 0.8, y: y + (Math.random() - 0.5) * 0.6, stack: id, n: n || 1, t: 0, life: 600, bob: Math.random() * 6 }); };

  // ---------- o mapa atual (mundo ou andar de masmorra) ----------
  const WM = {
    blocked: (x, y) => W.blocked(S.world, x, y), speed: (x, y) => W.speedAt(S.world, x, y), objAt: (x, y) => W.objAt(S.world, x, y),
  };
  Gm.M = WM;
  Gm.mapBlocked = function (x, y) { return S.map.kind === 'world' ? W.blocked(S.world, x, y) : Dg.blocked(S.map.m, x, y); };
  Gm.mapSpeed = function (x, y) { if (S.map.kind === 'world') return W.speedAt(S.world, x, y); const m = S.map.m, t = m.tile[Math.floor(y) * m.N + Math.floor(x)]; return t === Dg.WATER ? 0.6 : 1; };
  Gm.objAt = function (x, y) { return S.map.kind === 'world' ? W.objAt(S.world, x, y) : Dg.objAt(S.map.m, x, y); };
  Gm.inWorld = () => S.map.kind === 'world';

  Gm.enterWorld = function (x, y) {
    const P = S.P;
    S.map = { kind: 'world' };
    P.map = 'world'; P.x = x; P.y = y;
    S.ents = S.ents.filter((e) => e.ally); S.projs = []; S.hazards = []; S.tele = []; S.fx = S.fx.filter((f) => f.kind !== 'drop');
    for (const sp of S.world.spawns) sp.active = false;
    S.cityOn = null;
    for (const a of S.ents) { a.x = x + 0.5; a.y = y; }
    G.Render.invalidate();
    G.Audio.setPlace('world');
  };
  Gm.enterDungeon = function (id, floor, fromBelow) {
    const P = S.P, dd = D.DUNGEONS[id];
    const m = Dg.generate(id, floor);
    const st = P.dg[id] || (P.dg[id] = { cleared: false, best: 0 });
    st.best = Math.max(st.best, floor);
    // baús já abertos ficam abertos (por 7 dias)
    for (const o of m.objs) if (o.k === 'chest' && P.opened[o.cid] && S.day - P.opened[o.cid] < 7) o.open = true;
    S.map = { kind: 'dg', id, floor, m };
    P.map = 'dg:' + id + ':' + floor;
    const at = fromBelow && m.downRoom ? [m.downRoom.cx, m.downRoom.cy + 1] : m.start;
    P.x = at[0] + 0.5; P.y = at[1] + 0.5;
    S.ents = S.ents.filter((e) => e.ally); S.projs = []; S.hazards = []; S.tele = []; S.fx = S.fx.filter((f) => f.kind !== 'drop');
    for (const a of S.ents) { a.x = P.x + 0.5; a.y = P.y; }
    for (const sp of m.spawns) {
      if (sp.boss && st.cleared && floor === dd.floors) continue;
      sp.list.forEach((mon, k) => G.Combat.spawn(mon, sp.x + (k % 3) - 1 + Math.random() * 0.4, sp.y + Math.floor(k / 3) - 0.5 + Math.random() * 0.4, sp.lvl, { boss: sp.boss, dg: true }));
    }
    if (st.cleared && floor === dd.floors) {
      if (id === 'coracao_cauda' && !P.ending) Dg.addObj(m, 'altarSina', m.bossRoom.cx, m.bossRoom.cy - 2);
      Dg.addObj(m, 'stairsUp', m.bossRoom.cx + 2, m.bossRoom.cy + 2, { exit: true });
    }
    G.Render.invalidate();
    G.UI.banner(dd.name, floor > 1 || dd.floors > 1 ? 'Andar ' + floor + ' de ' + dd.floors : 'Nível ' + dd.lvl);
    G.Audio.setPlace('dg', dd.theme);
    if (!P.found.dungeons[id]) { P.found.dungeons[id] = 1; Gm.gainXp(20); }
  };
  Gm.leaveDungeon = function () {
    const id = S.map.id, d = S.world.dungeons[id];
    Gm.enterWorld(d.x + 0.5, d.y + 1.6);
    G.UI.banner(G.World.TNAME ? D.REGIONS[W.regionAt(S.world, d.x, d.y)].name : '', '');
  };

  // ---------- missões (a ponte com as conversas) ----------
  const Q = Gm.Q = {
    stage: (id) => { const q = S.P.q[id]; return !q ? 0 : q.s; },
    setStage: (id, s) => { const P = S.P; P.q[id] = P.q[id] || { s: 0, n: 0 }; P.q[id].s = s; P.q[id].n = 0; G.UI.toast('Diário: ' + D.QUESTS[id].stages[s].txt, 'quest'); G.Audio.sfx('missao'); Gm.checkQuests(); },
    start: (id) => { if (S.P.q[id]) return; S.P.q[id] = { s: 1, n: 0 }; G.UI.toast('Nova missão: ' + D.QUESTS[id].name, 'quest'); G.Audio.sfx('missao'); Gm.checkQuests(); },
    finish: (id) => { S.P.q[id] = { s: 'done', n: 0 }; G.UI.toast('Missão concluída: ' + D.QUESTS[id].name, 'gold'); G.Audio.sfx('nivel'); },
    give: (id, n, quiet) => Gm.give(id, n, quiet),
    take: (id, n) => Gm.take(id, n),
    count: (id) => Gm.count(id),
    gold: (n) => Gm.addGold(n),
    xp: (n) => Gm.gainXp(n),
    note: (t) => G.UI.toast(t),
    perk: (k) => !!S.P.perks[k],
    skill: (k) => S.P.skills[k].lv,
    skillUp: (k, n) => { S.P.skills[k].lv = Math.min(100, S.P.skills[k].lv + n); G.UI.toast(D.SKILLS[k].name + ' +' + n + '.', 'skill'); Gm.refresh(); },
    learn: (sp) => Gm.learn(sp),
    giveItem: (rar, lvl, base) => { let it; if (base) it = Gm.makeItem(base, 'ferro', rar, lvl); else { it = Gm.loot(lvl, 2); if (it.rar < rar) { it = Gm.makeItem(it.base, it.mat, rar, lvl); } } Gm.addItem(it); },
    giveUnique: (id) => Gm.addItem(Gm.unique(id)),
    shop: () => G.UI.openShop(S.talkNpc), forge: () => G.UI.openForge(), alchemy: () => G.UI.openAlchemy(), inn: () => G.UI.inn(S.talkNpc), rumor: () => G.UI.toast(pick(D.RUMORS)),
    mainHint: () => { const s = Q.stage('main'); const st = D.QUESTS.main.stages[s]; return st ? st.txt : ''; },
  };
  Gm.learn = function (sp) {
    const P = S.P;
    if (P.spells.indexOf(sp) >= 0) return G.UI.toast('Você já sabe ' + D.SPELLS[sp].name + '.');
    P.spells.push(sp);
    const free = P.slots.indexOf(null); if (free >= 0) P.slots[free] = sp;
    G.UI.toast('Aprendeu o feitiço ' + D.SPELLS[sp].name + '!', 'gold'); G.Audio.sfx('nivel');
  };
  // checa objetivos automáticos (matar, masmorra, item, altares)
  Gm.checkQuests = function () {
    const P = S.P; if (!P) return;
    for (const id in P.q) {
      const q = P.q[id]; if (q.s === 'done') continue;
      const st = D.QUESTS[id] && D.QUESTS[id].stages[q.s]; if (!st || !st.next) continue;
      const g = st.goal;
      let ok = false;
      if (g.type === 'kill') ok = q.n >= g.n;
      else if (g.type === 'dungeon') ok = P.dg[g.id] && P.dg[g.id].cleared;
      else if (g.type === 'item') ok = Gm.count(g.item) >= g.n;
      else if (g.type === 'altars') ok = Object.keys(P.found.altars).length >= g.n;
      if (ok) Q.setStage(id, st.next);
    }
    G.Minis.check();
  };
  Gm.onKill = function (mon) {
    const P = S.P;
    P.kills[mon] = (P.kills[mon] || 0) + 1;
    for (const id in P.q) {
      const q = P.q[id]; if (q.s === 'done') continue;
      const st = D.QUESTS[id] && D.QUESTS[id].stages[q.s];
      if (st && st.goal.type === 'kill' && st.goal.mon === mon) { q.n++; if (q.n <= st.goal.n) G.UI.toast(D.QUESTS[id].name + ': ' + q.n + ' de ' + st.goal.n); }
    }
    G.Minis.onKill(mon);
    Gm.checkQuests();
  };
  Gm.onBossDown = function (e) {
    const P = S.P;
    if (S.map.kind === 'dg') {
      const id = S.map.id, dd = D.DUNGEONS[id];
      if (S.map.floor === dd.floors) {
        const first = !P.dg[id].cleared;
        P.dg[id].cleared = true;
        const m = S.map.m, r = m.bossRoom;
        Dg.addObj(m, 'stairsUp', r.cx + 2, r.cy + 2, { exit: true });
        if (id === 'coracao_cauda' && !P.ending) Dg.addObj(m, 'altarSina', r.cx, r.cy - 2);
        G.Render.invalidate();
        if (first) { G.UI.banner(dd.name, 'Masmorra limpa'); Gm.gainXp(60 + dd.lvl * 15); }
        Gm.checkQuests();
        G.Minis.onDungeon(id);
      }
    }
    if (e.def.unique) P.uniqDead[e.mon] = 1;
    Gm.save();
  };

  // ---------- tempo ----------
  Gm.tick = function (dt) {
    const prevDay = S.day;
    S.time += dt * 2;   // 1 segundo = 2 minutos do jogo (um dia em 12 minutos)
    if (S.time >= 24 * 60) { S.time -= 24 * 60; S.day++; }
    if (S.day !== prevDay) { S.shops = {}; S.boards = {}; }
    const P = S.P;
    P.played += dt;
    for (const b in P.buffs) { P.buffs[b] -= dt; if (P.buffs[b] <= 0) { delete P.buffs[b]; Gm.refresh(); } }
  };

  // ---------- salvar ----------
  const KEY = 'sina.save.';
  Gm.slot = 1;
  Gm.save = function (silent) {
    const P = S.P; if (!P || S.dead) return;
    const data = { v: 1, P, time: S.time, day: S.day, at: Date.now(), worldTaken: S.world ? collectTaken() : null, inDg: S.map && S.map.kind === 'dg' ? [S.map.id, S.map.floor] : null };
    try { localStorage.setItem(KEY + Gm.slot, JSON.stringify(data)); if (!silent) G.UI.toast('Jogo salvo.'); } catch (e) { if (!silent) G.UI.toast('Não deu para salvar neste navegador.'); }
  };
  function collectTaken() { return S.P.taken; }
  Gm.hasSave = function (slot) { try { return !!localStorage.getItem(KEY + slot); } catch (e) { return false; } };
  Gm.saveInfo = function (slot) { try { const d = JSON.parse(localStorage.getItem(KEY + slot)); return d && d.P ? { name: d.P.name, lvl: d.P.lvl, race: d.P.race, at: d.at, played: d.P.played } : null; } catch (e) { return null; } };
  Gm.load = function (slot) {
    let d;
    try { d = JSON.parse(localStorage.getItem(KEY + slot)); } catch (e) { return false; }
    if (!d || !d.P) return false;
    Gm.slot = slot;
    Gm.boot(d.P);
    S.time = d.time; S.day = d.day;
    applyTaken();
    if (d.inDg) Gm.enterDungeon(d.inDg[0], d.inDg[1]);
    return true;
  };
  Gm.wipe = function (slot) { try { localStorage.removeItem(KEY + slot); } catch (e) { /* nada */ } };
  // o que o herói já tirou do mundo (ervas, minério, baús) some de novo ao carregar
  function applyTaken() {
    const P = S.P, w = S.world;
    for (const k in P.taken) {
      const o = w.objs[+k]; if (!o) continue;
      const when = P.taken[k], regrow = o.k === 'herb' ? 3 : o.k === 'ore' ? 5 : o.k === 'chest' ? 7 : 999;
      if (S.day - when < regrow) { if (o.k === 'chest') o.open = true; else W.removeObj(w, o); }
      else delete P.taken[k];
    }
  }
  Gm.applyTaken = applyTaken;

  // ---------- começar ----------
  Gm.boot = function (P) {
    if (!S.world) S.world = W.generate(Gm.SEED);
    S.P = P; S.ents = []; S.projs = []; S.fx = []; S.floats = []; S.hazards = []; S.tele = []; S.dead = false;
    S.st = Gm.stats(P);
    if (P.hp <= 1) { P.hp = S.st.maxHp; P.mp = S.st.maxMp; P.st = S.st.maxSt; }
    P.hp = Math.min(P.hp, S.st.maxHp); P.mp = Math.min(P.mp, S.st.maxMp); P.st = Math.min(P.st, S.st.maxSt);
    if (!P.x) { const c = S.world.cities.alvorada; P.x = c.cx + 0.5; P.y = c.cy + 3.5; P.lastMarco = 'alvorada'; P.found.cities.alvorada = 1; }
    S.map = { kind: 'world' };
    Gm.enterWorld(P.x, P.y);
    S.mode = 'play';
    G.Render.heroDirty = true;
  };
  Gm.newGame = function (o, slot) {
    Gm.slot = slot || 1;
    S.time = 8 * 60; S.day = 1;
    const P = Gm.newHero(o);
    Gm.boot(P);
    Gm.save(true);
  };
})(globalThis.G = globalThis.G || {});
