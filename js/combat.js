/* SINA · combate e vida no mapa: monstros (IA e chefes), aliados, gente das cidades, projéteis, áreas marcadas,
   efeitos (fogo, veneno, sangue, lentidão), golpes do herói, feitiços, dano, morte e saque. */
(function (G) {
  'use strict';
  const D = G.D, Gm = G.Game, S = Gm.S;
  const Cb = G.Combat = {};
  const Fx = G.Fx = {};
  const rnd = Math.random, hyp = Math.hypot;
  let EID = 1;

  // ---------- efeitos visuais ----------
  Fx.burst = function (x, y, col, n, spd, up) {
    for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, s = (0.5 + rnd()) * (spd || 2); S.fx.push({ kind: 'p', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.7 - (up || 0), t: 0, life: 0.35 + rnd() * 0.4, col, g: 4 }); }
  };
  Fx.float = function (x, y, txt, col, big) { S.floats.push({ x: x + (rnd() - 0.5) * 0.3, y, txt: String(txt), col, t: 0, big }); };
  Fx.shake = (n) => { S.shake = Math.max(S.shake, n); };
  Fx.ring = (x, y, r, col) => S.fx.push({ kind: 'ring', x, y, r, col, t: 0, life: 0.35 });
  Fx.slash = (x, y, ang, arc, reach, col) => S.fx.push({ kind: 'slash', x, y, ang, arc, reach, col, t: 0, life: 0.18 });
  Fx.bolt = (pts, col) => S.fx.push({ kind: 'bolt', pts, col, t: 0, life: 0.22 });

  // ---------- criar ----------
  Cb.spawn = function (mon, x, y, lvl, o) {
    o = o || {};
    let elite = false;
    if (mon.indexOf('elite:') === 0) { mon = mon.slice(6); elite = true; }
    const d = D.MON[mon]; if (!d) return null;
    const L = Math.max(1, lvl || 1);
    const e = {
      id: EID++, kind: d.ally ? 'ally' : 'mon', mon, def: d, lvl: L, x, y, vx: 0, vy: 0, dir: 0, anim: 0, r: d.r || 0.35,
      maxHp: Math.round(d.hp * (1 + 0.22 * (L - 1)) * (elite ? 1.9 : 1)), dmg: d.dmg * (1 + 0.13 * (L - 1)) * (elite ? 1.3 : 1), arm: d.arm * (1 + 0.1 * (L - 1)),
      spd: d.spd, xp: Math.round(d.xp * (1 + 0.2 * (L - 1)) * (elite ? 2.5 : 1)), elite, boss: d.ai === 'boss', cd: 0.5 + rnd(), state: 'idle', t: 0, st: {}, home: [x, y], aggro: false, flash: 0, wind: 0, skill: 3 + rnd() * 3, phase: 0,
      big: (d.big || 1) * (elite ? 1.15 : 1), spawnRef: o.spawnRef, dg: o.dg,
    };
    e.hp = e.maxHp;
    if (d.plan === 'serpent') { e.seg = []; for (let i = 0; i < 14; i++) e.seg.push({ x, y: y + i * 0.5 }); e.trail = []; }
    if (elite) e.name = 'Campeão ' + d.name.toLowerCase();
    S.ents.push(e);
    return e;
  };
  Cb.summon = function (unit, dur) {
    const P = S.P, n = P.perks.matilha ? 2 : 1;
    for (const a of S.ents.filter((e) => e.kind === 'ally' && e.mon === unit)) a.dead = true;
    for (let i = 0; i < n; i++) {
      const e = Cb.spawn(unit, P.x + (i ? -0.8 : 0.8), P.y + 0.3, P.lvl);
      const boost = (1 + P.skills.conjuracao.lv * 0.012) * (P.perks.senhor ? 1.5 : 1);
      e.maxHp = e.hp = Math.round(e.maxHp * boost); e.dmg *= boost;
      e.life = dur * (P.perks.laco ? 2 : 1);
      Fx.burst(e.x, e.y - 0.4, '#9fb6ff', 18, 2.5, 1);
    }
  };

  // ---------- movimento com colisão ----------
  function tryMove(e, dx, dy, fly) {
    const r = e.r * 0.8;
    const blocked = (x, y) => {
      if (Gm.mapBlocked(x, y)) {
        if (fly && S.map.kind === 'world') { const t = S.world.tile[Math.floor(y) * S.world.N + Math.floor(x)]; return t === G.World.T.WALL || t === G.World.T.MOUNTAIN || t === G.World.T.VEU; }
        if (fly && S.map.kind === 'dg') { const m = S.map.m, t = m.tile[Math.floor(y) * m.N + Math.floor(x)]; return t === 0; }
        return true;
      }
      return false;
    };
    const free = (x, y) => !blocked(x - r, y - r * 0.5) && !blocked(x + r, y - r * 0.5) && !blocked(x - r, y + r * 0.3) && !blocked(x + r, y + r * 0.3);
    let moved = false;
    if (dx && free(e.x + dx, e.y)) { e.x += dx; moved = true; }
    if (dy && free(e.x, e.y + dy)) { e.y += dy; moved = true; }
    return moved;
  }
  Cb.tryMove = tryMove;
  function face(e, dx, dy) { if (Math.abs(dx) > Math.abs(dy)) e.dir = dx > 0 ? 2 : 3; else e.dir = dy > 0 ? 0 : 1; }
  Cb.face = face;

  // mapa de distâncias até o herói (para os monstros contornarem paredes)
  let flow = null, flowT = 0;
  function buildFlow() {
    const P = S.P, R = 26;
    const x0 = Math.floor(P.x) - R, y0 = Math.floor(P.y) - R, w = R * 2 + 1;
    const d = new Int16Array(w * w).fill(-1), q = new Int32Array(w * w);
    const sx = Math.floor(P.x) - x0, sy = Math.floor(P.y) - y0;
    let qh = 0, qt = 0; d[sy * w + sx] = 0; q[qt++] = sy * w + sx;
    while (qh < qt) {
      const c = q[qh++], cx = c % w, cy = (c / w) | 0;
      for (let k = 0; k < 4; k++) {
        const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < 0 || ny < 0 || nx >= w || ny >= w) continue;
        const i = ny * w + nx; if (d[i] >= 0) continue;
        if (Gm.mapBlocked(nx + x0 + 0.5, ny + y0 + 0.5)) { d[i] = 9999; continue; }
        d[i] = d[c] + 1; q[qt++] = i;
      }
    }
    flow = { x0, y0, w, d };
  }
  function flowDir(e) {
    if (!flow) return null;
    const tx = Math.floor(e.x) - flow.x0, ty = Math.floor(e.y) - flow.y0, w = flow.w;
    if (tx < 1 || ty < 1 || tx >= w - 1 || ty >= w - 1) return null;
    let best = flow.d[ty * w + tx], bx = 0, by = 0;
    if (best < 0) best = 9999;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const v = flow.d[(ty + dy) * w + tx + dx];
      if (v >= 0 && v < best && (dx === 0 || dy === 0 || (flow.d[ty * w + tx + dx] < 9999 && flow.d[(ty + dy) * w + tx] < 9999))) { best = v; bx = dx; by = dy; }
    }
    if (!bx && !by) return null;
    const gx = Math.floor(e.x) + bx + 0.5 - e.x, gy = Math.floor(e.y) + by + 0.5 - e.y, l = hyp(gx, gy) || 1;
    return [gx / l, gy / l];
  }
  function los(ax, ay, bx, by) {
    const d = hyp(bx - ax, by - ay), n = Math.ceil(d * 2);
    for (let i = 1; i < n; i++) { const t = i / n; if (Gm.mapBlocked(ax + (bx - ax) * t, ay + (by - ay) * t)) return false; }
    return true;
  }
  Cb.los = los;

  // ---------- dano ----------
  // no herói
  Cb.hurtPlayer = function (raw, elem, from, o) {
    o = o || {};
    const P = S.P, st = S.st;
    if (S.dead || P.iframes > 0 || S.godMode) return;
    let dmg = raw;
    const lvl = from ? from.lvl : P.lvl;
    if (!o.true) dmg *= 1 - Math.min(0.8, st.arm / (st.arm + 60 + 9 * lvl));
    if (elem && st.res[elem]) dmg *= 1 - st.res[elem];
    if (P.perks.firmeza) dmg *= 0.92;
    dmg = Math.max(1, Math.round(dmg));
    if (P.ward > 0) { const a = Math.min(P.ward, dmg); P.ward -= a; dmg -= a; Fx.ring(P.x, P.y - 0.5, 0.8, '#f2da72'); if (!dmg) return; }
    P.hp -= dmg;
    P.hurtT = 0.25;
    Fx.float(P.x, P.y - 1.2, dmg, '#ff6b6b');
    Fx.burst(P.x, P.y - 0.6, elem === 'fogo' ? '#f77622' : elem === 'gelo' ? '#9be7ff' : '#c8423a', 6, 2);
    Fx.shake(Math.min(6, 2 + dmg / 10));
    G.Audio.sfx('dor');
    if (from && !P.perks.firmeza && !o.noKnock) { const a = Math.atan2(P.y - from.y, P.x - from.x); P.kx = Math.cos(a) * 5; P.ky = Math.sin(a) * 5; }
    if (o.poison) P.poison = { t: 4, dps: o.poison };
    if (o.slow) P.slowT = 1.5;
    if (o.burn) P.burn = { t: 3, dps: o.burn };
    Gm.skillXp('defesa', dmg * 0.25 * (st.arm > 20 ? 1 : 0.4));
    if (P.perks.segundo_folego && P.hp > 0 && P.hp < S.st.maxHp * 0.2 && !(P.sfT > 0)) { P.hp += S.st.maxHp * 0.35; P.sfT = 120; G.UI.toast('Segundo fôlego!', 'gold'); }
    if (P.hp <= 0) Cb.playerDie();
  };
  // num monstro
  Cb.hurt = function (e, raw, elem, o) {
    o = o || {};
    if (e.dead || e.kind === 'npc') return 0;
    const P = S.P;
    let dmg = raw;
    const arm = e.arm * (1 - (o.pen || 0));
    if (!o.true) dmg *= 1 - Math.min(0.75, arm / (arm + 40 + 6 * P.lvl));
    const res = e.def.resist && elem ? e.def.resist[elem] || 0 : 0;
    dmg *= 1 - res;
    let crit = false;
    if (o.canCrit && rnd() < S.st.crit) { dmg *= 1.8; crit = true; }
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg; e.flash = 0.12; e.aggro = true; e.hitBy = o.src || 'p';
    Fx.float(e.x, e.y - 1.1 * e.big, dmg, crit ? '#f2da72' : elem === 'fogo' ? '#ff9b3d' : elem === 'gelo' ? '#9be7ff' : elem === 'raio' ? '#d8f0ff' : '#ffffff', crit);
    Fx.burst(e.x, e.y - 0.5 * e.big, e.def.plan === 'skel' || e.def.plan === 'golem' ? '#cdc6bb' : e.def.plan === 'wisp' ? e.def.col : '#a8302c', crit ? 10 : 5, 2);
    if (o.knock && !e.boss) { const a = Math.atan2(e.y - P.y, e.x - P.x); e.kx = Math.cos(a) * o.knock; e.ky = Math.sin(a) * o.knock; }
    if (o.burn) e.st.burn = { t: 3, dps: o.burn };
    if (o.slow) e.st.slow = 2;
    if (o.bleed) e.st.bleed = { t: 3, dps: o.bleed };
    if (o.src === 'p' && S.st.leech) P.hp = Math.min(S.st.maxHp, P.hp + dmg * S.st.leech);
    if (e.hp <= 0) Cb.kill(e, o);
    return dmg;
  };
  Cb.kill = function (e, o) {
    if (e.dead) return;
    e.dead = true; e.deadT = 0;
    const P = S.P;
    G.Audio.sfx(e.boss ? 'chefe_morre' : 'morte');
    Fx.burst(e.x, e.y - 0.5, e.def.plan === 'wisp' ? e.def.col : '#8a2a2c', e.boss ? 40 : 14, 3, 1);
    if (e.kind === 'ally') return;
    if (e.boss) { Fx.shake(14); S.hitstop = 0.25; }
    Gm.gainXp(e.xp);
    Gm.onKill(e.mon);
    // ruína: explode
    if (o && o.magic && P.perks.ruina) { Cb.area(e.x, e.y, 2.2, S.st.magic * 15, 'fogo', 'p'); Fx.ring(e.x, e.y, 2.2, '#f77622'); }
    // saque
    const d = e.def.drops || {}, gm = S.st.goldMul;
    if (d.gold) { const g = Math.round(Gm.ri(d.gold[0], d.gold[1]) * (1 + 0.15 * (e.lvl - 1)) * gm * (e.elite ? 2 : 1)); Gm.dropGold(e.x, e.y, g); }
    else if (rnd() < 0.25) Gm.dropGold(e.x, e.y, Math.round(Gm.ri(1, 4 + e.lvl) * gm));
    for (const k in d) {
      if (k === 'gold' || k === 'item' || k === 'item2' || k === 'unique') continue;
      const ch = d[k];
      if (ch >= 1) Gm.dropStack(e.x, e.y, k, Math.floor(ch));
      else if (rnd() < ch) Gm.dropStack(e.x, e.y, k, 1);
    }
    if (d.unique && !(e.def.unique && P.uniqDead[e.mon] > 1)) Gm.dropItem(e.x, e.y, Gm.unique(d.unique));
    if (d.item && rnd() < d.item) Gm.dropItem(e.x, e.y, Gm.loot(e.lvl, e.boss ? 3 : e.elite ? 2 : 0));
    if (d.item2 && rnd() < d.item2) Gm.dropItem(e.x, e.y, Gm.loot(e.lvl, 2));
    if (e.elite) Gm.dropItem(e.x, e.y, Gm.loot(e.lvl, 2));
    if (rnd() < 0.06) Gm.dropStack(e.x, e.y, rnd() < 0.6 ? 'pocao_vida' : 'pocao_mana', 1);
    if (e.boss) Gm.onBossDown(e);
    if (e.spawnRef) { const sp = e.spawnRef; sp.alive = (sp.alive || 1) - 1; if (sp.alive <= 0) { sp.deadDay = S.day; sp.active = false; } }
  };
  Cb.area = function (x, y, r, dmg, elem, src, o) {
    const hits = [];
    if (src === 'p') { for (const e of S.ents) if (!e.dead && e.kind === 'mon' && hyp(e.x - x, e.y - y) < r + e.r) { Cb.hurt(e, dmg, elem, Object.assign({ src: 'p', magic: true }, o)); hits.push(e); } }
    else if (hyp(S.P.x - x, S.P.y - y) < r + 0.3) Cb.hurtPlayer(dmg, elem, null, o);
    return hits;
  };

  // ---------- o herói ataca ----------
  Cb.attack = function (aimX, aimY, power) {
    const P = S.P, st = S.st, w = st.wpn;
    if (P.atkCd > 0 || S.dead || P.roll > 0) return;
    const cost = power ? 20 : w.ranged ? 3 : 5;
    if (P.st < cost * 0.5) { G.UI.toast('Sem fôlego.'); return; }
    P.st = Math.max(0, P.st - cost); P.stRest = 0.8;
    P.atkCd = 1 / w.spd;
    const ang = Math.atan2(aimY - (P.y - 0.5), aimX - P.x);
    P.aim = ang; P.swing = 0.22; P.swingPow = power;
    face(P, Math.cos(ang), Math.sin(ang));
    const dmgRoll = () => w.min + rnd() * (w.max - w.min);
    if (w.magic) {
      if (P.mp < 3) { G.UI.toast('Sem mana.'); return; }
      P.mp -= 3;
      Cb.shoot('p', P.x, P.y - 0.6, ang, 11, dmgRoll() * st.magic * (power ? 1.8 : 1), { kind: 'magia', elem: 'raio', col: '#9be7ff', life: w.reach / 11, magic: true });
      G.Audio.sfx('magia');
      Gm.skillXp('destruicao', 0.6);
      return;
    }
    if (w.ranged) {
      const fire = (a) => Cb.shoot('p', P.x, P.y - 0.6, a, power ? 18 : 15, dmgRoll() * (power ? 1.8 : 1) + w.fire + w.ice + w.shock, { kind: 'flecha', life: w.reach / 15, pierce: power ? 2 : 0, elem: w.fire ? 'fogo' : w.ice ? 'gelo' : null, burn: w.fire ? w.fire * 0.3 : 0, slow: w.ice > 0, skill: 'arco', canCrit: true });
      fire(ang);
      if (P.perks.flecha_dupla && rnd() < 0.25) fire(ang + 0.08);
      if (power && P.perks.leque) { fire(ang - 0.22); fire(ang + 0.22); }
      G.Audio.sfx('arco');
      return;
    }
    // corpo a corpo
    const spin = power && P.perks.redemoinho;
    const arc = (spin ? 360 : w.arc * (power ? 1.35 : 1)) * Math.PI / 180, reach = w.reach * (power ? 1.15 : 1);
    Fx.slash(P.x, P.y - 0.5, ang, arc, reach, power ? '#f2da72' : '#ffffff');
    G.Audio.sfx(power ? 'golpe_forte' : 'golpe');
    let hit = false;
    for (const e of S.ents) {
      if (e.dead || e.kind !== 'mon') continue;
      const dx = e.x - P.x, dy = (e.y - 0.4) - (P.y - 0.5), d = hyp(dx, dy);
      if (d > reach + e.r * e.big) continue;
      let da = Math.atan2(dy, dx) - ang; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
      if (Math.abs(da) > arc / 2 && d > e.r + 0.3) continue;
      const base = dmgRoll() * (power ? 2 : 1);
      const done = Cb.hurt(e, base + w.fire + w.ice + w.shock, w.fire ? 'fogo' : w.ice ? 'gelo' : w.shock ? 'raio' : null, { src: 'p', knock: power ? 7 : 3.5, pen: w.pen, canCrit: true, burn: w.fire ? w.fire * 0.3 : 0, slow: w.ice > 0, bleed: P.perks.sangrar ? base * 0.12 : 0 });
      Gm.skillXp('lamina', done * 0.12);
      hit = true;
    }
    // urnas quebram no golpe
    if (S.map.kind === 'dg') for (const o of S.map.m.objs) if (o.k === 'urn' && !o.gone && hyp(o.x + 0.5 - P.x, o.y + 0.5 - P.y) < reach + 0.4) Cb.breakUrn(o);
    if (hit) { S.hitstop = power ? 0.07 : 0.035; Fx.shake(power ? 4 : 2); G.Audio.sfx('acerto'); }
  };
  Cb.breakUrn = function (o) {
    G.Dungeon.removeObj(S.map.m, o);
    G.Audio.sfx('quebra');
    Fx.burst(o.x + 0.5, o.y + 0.5, '#a8643a', 10, 2);
    if (rnd() < 0.6) Gm.dropGold(o.x + 0.5, o.y + 0.6, Math.round(Gm.ri(2, 6 + S.map.m.floor * 3) * S.st.goldMul));
    if (rnd() < 0.08) Gm.dropStack(o.x + 0.5, o.y + 0.6, 'pocao_vida', 1);
    S.map.m.objs.push(Object.assign({}, o, { k: 'urnBroken', id: S.map.m.objs.length, gone: false }));
  };
  Cb.roll = function (dx, dy) {
    const P = S.P;
    if (P.roll > 0 || P.st < 20 || S.dead) return;
    if (!dx && !dy) { const a = P.aim || 0; dx = Math.cos(a); dy = Math.sin(a); }
    const l = hyp(dx, dy) || 1;
    P.st -= 22; P.stRest = 1; P.roll = 0.32; P.iframes = 0.36; P.rdx = dx / l; P.rdy = dy / l;
    G.Audio.sfx('rolar');
  };

  // ---------- feitiços ----------
  Cb.cast = function (sp, aimX, aimY) {
    const P = S.P, d = D.SPELLS[sp];
    if (!d || S.dead) return;
    P.cds = P.cds || {};
    if (P.cds[sp] > 0) return;
    let cost = d.mana;
    if (d.school === 'destruicao' && P.perks.economia) cost *= 0.75;
    if (P.mp < cost) { G.UI.toast('Sem mana para ' + d.name + '.'); G.Audio.sfx('erro'); return; }
    P.mp -= cost; P.cds[sp] = d.cd;
    const ang = Math.atan2(aimY - (P.y - 0.6), aimX - P.x);
    P.aim = ang; P.castT = 0.25; face(P, Math.cos(ang), Math.sin(ang));
    const skill = P.skills[d.school].lv;
    const mag = d.school === 'destruicao' ? S.st.magic : 1 + skill * 0.008;
    const dmg = d.dmg ? (d.dmg[0] + rnd() * (d.dmg[1] - d.dmg[0])) * mag * (1 + P.lvl * 0.06) : 0;
    Gm.skillXp(d.school, d.mana * 0.18);
    G.Audio.sfx(d.kind === 'heal' || d.kind === 'ward' ? 'cura' : d.elem === 'gelo' ? 'gelo' : d.elem === 'raio' ? 'raio' : 'fogo');
    if (d.kind === 'bolt') Cb.shoot('p', P.x, P.y - 0.6, ang, d.speed, dmg, { kind: sp, elem: d.elem, col: d.color, life: 1.4, explode: d.explode, burn: d.elem === 'fogo' ? dmg * 0.08 : 0, magic: true, r: d.explode ? 0.3 : 0.2 });
    else if (d.kind === 'chain') {
      let from = { x: P.x, y: P.y - 0.6 }, hitSet = new Set(), pts = [[from.x, from.y]];
      for (let j = 0; j <= d.jumps; j++) {
        let best = null, bd = j === 0 ? 8 : 4.5;
        for (const e of S.ents) {
          if (e.dead || e.kind !== 'mon' || hitSet.has(e)) continue;
          const dd = hyp(e.x - from.x, e.y - 0.5 - from.y);
          if (j === 0) { let da = Math.atan2(e.y - 0.5 - from.y, e.x - from.x) - ang; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; if (Math.abs(da) > 0.6) continue; }
          if (dd < bd && los(from.x, from.y, e.x, e.y - 0.4)) { bd = dd; best = e; }
        }
        if (!best) { if (j === 0) pts.push([from.x + Math.cos(ang) * 6, from.y + Math.sin(ang) * 6]); break; }
        hitSet.add(best); pts.push([best.x, best.y - 0.5]);
        Cb.hurt(best, dmg * Math.pow(0.85, j), 'raio', { src: 'p', magic: true, slow: false });
        from = { x: best.x, y: best.y - 0.5 };
      }
      Fx.bolt(pts, d.color);
    } else if (d.kind === 'nova') {
      Fx.ring(P.x, P.y - 0.3, d.radius, d.color);
      for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; S.fx.push({ kind: 'p', x: P.x, y: P.y - 0.4, vx: Math.cos(a) * 9, vy: Math.sin(a) * 6.5, t: 0, life: 0.35, col: d.color, g: 0 }); }
      Cb.area(P.x, P.y, d.radius, dmg, d.elem, 'p', { slow: true });
    } else if (d.kind === 'meteor') {
      const dd = Math.min(9, hyp(aimX - P.x, aimY - P.y)), tx = P.x + Math.cos(ang) * dd, ty = P.y + Math.sin(ang) * dd;
      for (let i = 0; i < 5; i++) { const ox = tx + (rnd() - 0.5) * 3, oy = ty + (rnd() - 0.5) * 2.4; S.tele.push({ x: ox, y: oy, r: 1.4, t: 0, delay: 0.5 + i * 0.18, dmg: dmg / 2.2, elem: 'raio', owner: 'p', col: '#fee761', meteor: true }); }
    } else if (d.kind === 'heal') {
      const amt = d.amount * (1 + skill * 0.012) * (P.perks.mao_leve ? 1.3 : 1);
      P.hp = Math.min(S.st.maxHp, P.hp + amt); P.poison = null; P.burn = null;
      Fx.burst(P.x, P.y - 0.6, d.color, 16, 1.5, 1.5); Fx.float(P.x, P.y - 1.4, '+' + Math.round(amt), '#9cf28a');
      for (const a of S.ents) if (a.kind === 'ally' && hyp(a.x - P.x, a.y - P.y) < 4) a.hp = Math.min(a.maxHp, a.hp + amt);
    } else if (d.kind === 'ward') { P.ward = d.amount * (1 + skill * 0.012); P.wardT = d.dur; Fx.ring(P.x, P.y - 0.4, 1, d.color); }
    else if (d.kind === 'light') { P.lightT = d.dur; }
    else if (d.kind === 'summon') Cb.summon(d.unit, d.dur);
  };

  // ---------- projéteis ----------
  Cb.shoot = function (owner, x, y, ang, spd, dmg, o) {
    o = o || {};
    S.projs.push(Object.assign({ owner, x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, dmg, t: 0, life: o.life || 1.5, r: o.r || 0.18, hit: new Set() }, o));
  };
  function updateProjs(dt) {
    const P = S.P;
    for (const p of S.projs) {
      p.t += dt;
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      const wall = Gm.mapBlocked(nx, ny + 0.5) && !(S.map.kind === 'world' && G.World.isWater(S.world, nx, ny + 0.5) && !G.World.blocked(S.world, nx, ny + 0.5));
      if (p.t > p.life || (wall && !p.ghost)) { p.dead = true; if (p.explode) explode(p); else Fx.burst(p.x, p.y, p.col || '#cdc6bb', 4, 1); continue; }
      p.x = nx; p.y = ny;
      if (p.owner === 'p' || p.owner === 'a') {
        for (const e of S.ents) {
          if (e.dead || e.kind !== 'mon' || p.hit.has(e)) continue;
          if (hyp(e.x - p.x, (e.y - 0.45 * e.big) - p.y) < e.r * e.big + p.r) {
            p.hit.add(e);
            if (p.explode) { p.dead = true; explode(p); break; }
            const done = Cb.hurt(e, p.dmg, p.elem, { src: 'p', knock: 2, burn: p.burn, slow: p.slow, magic: p.magic, canCrit: p.canCrit });
            if (p.skill) Gm.skillXp(p.skill, done * 0.14);
            if (p.pierce > 0) p.pierce--; else { p.dead = true; break; }
          }
        }
      } else {
        if (P.roll > 0 && hyp(P.x - p.x, P.y - 0.5 - p.y) < 0.6) continue;
        if (hyp(P.x - p.x, (P.y - 0.5) - p.y) < 0.35 + p.r) {
          p.dead = true;
          if (p.explode) explode(p); else Cb.hurtPlayer(p.dmg, p.elem, p.from, { poison: p.poison, slow: p.slow, burn: p.elem === 'fogo' ? p.dmg * 0.1 : 0 });
        }
        for (const a of S.ents) if (!p.dead && a.kind === 'ally' && !a.dead && hyp(a.x - p.x, a.y - 0.4 - p.y) < a.r + p.r) { p.dead = true; hurtAlly(a, p.dmg); }
      }
    }
    S.projs = S.projs.filter((p) => !p.dead);
  }
  function explode(p) {
    const r = p.explode || 1.6;
    Fx.ring(p.x, p.y + 0.4, r, p.col || '#f77622'); Fx.burst(p.x, p.y, p.col || '#f77622', 22, 4); Fx.shake(5);
    G.Audio.sfx('explosao');
    if (p.owner === 'p') Cb.area(p.x, p.y + 0.4, r, p.dmg, p.elem, 'p', { burn: p.burn });
    else if (hyp(S.P.x - p.x, S.P.y - p.y) < r) Cb.hurtPlayer(p.dmg, p.elem, p.from);
  }
  function hurtAlly(a, dmg) { a.hp -= Math.max(1, Math.round(dmg * (1 - a.arm / (a.arm + 50)))); a.flash = 0.12; if (a.hp <= 0) { a.dead = true; Fx.burst(a.x, a.y - 0.4, '#9fb6ff', 14, 2); } }

  // áreas marcadas (o aviso vermelho antes do golpe) e chão que queima
  function updateTele(dt) {
    const P = S.P;
    for (const t of S.tele) {
      t.t += dt;
      if (t.t >= t.delay && !t.done) {
        t.done = true;
        if (t.owner === 'p') { Cb.area(t.x, t.y, t.r, t.dmg, t.elem, 'p'); Fx.burst(t.x, t.y - 0.3, t.col || '#fee761', 18, 4, 2); Fx.shake(4); G.Audio.sfx('explosao'); }
        else {
          if (t.cone) {
            const dx = P.x - t.x, dy = P.y - t.y, d = hyp(dx, dy);
            let da = Math.atan2(dy, dx) - t.ang; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
            if (d < t.r && Math.abs(da) < t.arc / 2 && !(P.roll > 0)) Cb.hurtPlayer(t.dmg, t.elem, t.from, { burn: t.elem === 'fogo' ? t.dmg * 0.12 : 0 });
            Fx.burst(t.x + Math.cos(t.ang) * t.r * 0.6, t.y + Math.sin(t.ang) * t.r * 0.6, t.col || '#f77622', 20, 3);
          } else if (hyp(P.x - t.x, P.y - t.y) < t.r && !(P.roll > 0)) Cb.hurtPlayer(t.dmg, t.elem, t.from, { slow: t.slow });
          if (!t.cone) Fx.burst(t.x, t.y - 0.2, t.col || '#c8423a', 14, 3, 1);
          Fx.shake(t.big ? 8 : 4); G.Audio.sfx('impacto');
          if (t.fire) S.hazards.push({ x: t.x, y: t.y, r: t.r * 0.8, t: 0, life: 4, dps: t.dmg * 0.25, elem: 'fogo' });
        }
      }
    }
    S.tele = S.tele.filter((t) => t.t < t.delay + 0.25);
    for (const h of S.hazards) {
      h.t += dt;
      if (hyp(P.x - h.x, P.y - h.y) < h.r) { h.tick = (h.tick || 0) - dt; if (h.tick <= 0) { h.tick = 0.5; Cb.hurtPlayer(h.dps * 0.5, h.elem, null, { noKnock: true }); } }
    }
    S.hazards = S.hazards.filter((h) => h.t < h.life);
  }

  // ---------- o herói, a cada quadro ----------
  Cb.updatePlayer = function (dt, inp) {
    const P = S.P, st = S.st;
    if (S.dead) return;
    for (const k of ['atkCd', 'swing', 'roll', 'iframes', 'hurtT', 'castT', 'slowT', 'sfT', 'lightT', 'wardT', 'trapT', 'stRest']) if (P[k] > 0) P[k] -= dt;
    if (P.wardT <= 0) P.ward = 0;
    if (P.cds) for (const k in P.cds) if (P.cds[k] > 0) P.cds[k] -= dt;
    // movimento
    let mx = inp.mx, my = inp.my;
    const ml = hyp(mx, my);
    let speed = st.speed * Gm.mapSpeed(P.x, P.y) * (P.slowT > 0 ? 0.6 : 1);
    const running = inp.run && ml > 0 && P.st > 1;
    if (running) { speed *= 1.55; P.st -= 14 * dt; P.stRest = 0.6; }
    if (P.roll > 0) { tryMove(P, P.rdx * 11 * dt, P.rdy * 11 * dt); }
    else if (ml > 0.1) {
      const k = Math.min(1, ml);
      tryMove(P, mx / ml * speed * k * dt, my / ml * speed * k * dt);
      P.anim += dt * speed * 2.2;
      if (!(P.swing > 0) && !(P.castT > 0)) face(P, mx, my);
      P.moving = true;
    } else { P.moving = false; P.anim = 0; }
    if (P.kx || P.ky) { tryMove(P, P.kx * dt, P.ky * dt); P.kx *= 0.82; P.ky *= 0.82; if (Math.abs(P.kx) < 0.05) P.kx = 0; if (Math.abs(P.ky) < 0.05) P.ky = 0; }
    // regeneração
    P.hp = Math.min(st.maxHp, P.hp + st.hpRegen * dt);
    P.mp = Math.min(st.maxMp, P.mp + st.mpRegen * dt);
    if (!(P.stRest > 0)) P.st = Math.min(st.maxSt, P.st + 22 * dt);
    if (P.food > 0) { const r = Math.min(P.food, 6 * dt); P.food -= r; P.hp = Math.min(st.maxHp, P.hp + r); }
    if (P.poison) { P.poison.t -= dt; P.hp -= P.poison.dps * dt; if (P.poison.t <= 0) P.poison = null; }
    if (P.burn) { P.burn.t -= dt; P.hp -= P.burn.dps * dt; if (rnd() < 0.3) S.fx.push({ kind: 'p', x: P.x + (rnd() - 0.5) * 0.4, y: P.y - 0.6, vx: 0, vy: -1.5, t: 0, life: 0.4, col: '#f77622', g: 0 }); if (P.burn.t <= 0) P.burn = null; }
    if (S.godMode) P.hp = st.maxHp;
    if (P.hp <= 0) Cb.playerDie();
    // armadilhas
    if (S.map.kind === 'dg' && !(P.trapT > 0)) { const o = Gm.objAt(P.x, P.y); if (o && o.k === 'spikes' && !(P.roll > 0)) { P.trapT = 1.2; o.fired = 0.4; Cb.hurtPlayer(st.maxHp * 0.12, null, null, { true: true, noKnock: true }); G.Audio.sfx('espinho'); } }
  };
  Cb.playerDie = function () {
    if (S.dead) return;
    const P = S.P;
    S.dead = true; S.deadT = 0; P.hp = 0; P.deaths++;
    G.Audio.sfx('morte_heroi');
    Fx.burst(P.x, P.y - 0.5, '#8a2a2c', 30, 3);
    setTimeout(() => G.UI.deathScreen(), 900);
  };
  Cb.respawn = function () {
    const P = S.P;
    const lost = Math.floor(P.gold * 0.1);
    P.gold -= lost;
    const c = S.world.cities[P.lastMarco || 'alvorada'];
    S.dead = false;
    Gm.refresh();
    P.hp = S.st.maxHp; P.mp = S.st.maxMp; P.st = S.st.maxSt; P.poison = P.burn = null;
    Gm.enterWorld(c.cx + 0.5, c.cy + 1.5);
    G.UI.toast('Você acordou no Marco da Sina de ' + D.CITIES[c.id].name + '. Perdeu ' + lost + ' de ouro.');
  };

  // ---------- IA ----------
  function updateEnt(e, dt) {
    const P = S.P;
    if (e.dead) { e.deadT += dt; return; }
    e.t += dt; e.anim += dt;
    if (e.flash > 0) e.flash -= dt;
    if (e.cd > 0) e.cd -= dt;
    if (e.skill > 0) e.skill -= dt;
    // efeitos
    const s = e.st;
    let slow = 1;
    if (s.slow > 0) { s.slow -= dt; slow = 0.5; }
    if (s.burn) { s.burn.t -= dt; e.hp -= s.burn.dps * dt; if (rnd() < 0.25) S.fx.push({ kind: 'p', x: e.x + (rnd() - 0.5) * 0.4, y: e.y - 0.5, vx: 0, vy: -1.5, t: 0, life: 0.4, col: '#f77622', g: 0 }); if (s.burn.t <= 0) s.burn = null; }
    if (s.bleed) { s.bleed.t -= dt; e.hp -= s.bleed.dps * dt; if (s.bleed.t <= 0) s.bleed = null; }
    if (e.hp <= 0 && !e.dead) { Cb.kill(e, {}); return; }
    if (e.kx || e.ky) { tryMove(e, e.kx * dt, e.ky * dt, e.def.fly); e.kx *= 0.8; e.ky *= 0.8; if (Math.abs(e.kx) < 0.05) e.kx = 0; if (Math.abs(e.ky) < 0.05) e.ky = 0; }
    if (e.kind === 'npc') return updateNpc(e, dt);
    if (e.kind === 'ally') return updateAlly(e, dt);
    const dx = P.x - e.x, dy = P.y - e.y, d = hyp(dx, dy);
    // acordar
    const sight = e.boss ? 11 : e.aggro ? 16 : (Gm.isNight() && !S.st.night && S.map.kind === 'world' ? 6 : 8);
    if (!e.aggro && d < sight && !S.dead && los(e.x, e.y - 0.3, P.x, P.y - 0.3)) { e.aggro = true; if (e.boss) G.UI.bossBar(e); }
    // alvo: o herói ou um aliado mais perto
    let tgt = P, td = d;
    for (const a of S.ents) if (a.kind === 'ally' && !a.dead) { const ad = hyp(a.x - e.x, a.y - e.y); if (ad < td - 1) { tgt = a; td = ad; } }
    if (S.dead) { e.aggro = false; tgt = null; }
    if (!e.aggro || !tgt) {
      // perambula perto de casa
      if (!e.wander || e.t > e.wanderT) { e.wanderT = e.t + 2 + rnd() * 3; const a = rnd() * Math.PI * 2; e.wander = rnd() < 0.4 ? null : [e.home[0] + Math.cos(a) * 3, e.home[1] + Math.sin(a) * 3]; }
      if (e.wander) { const wx = e.wander[0] - e.x, wy = e.wander[1] - e.y, wl = hyp(wx, wy); if (wl > 0.3) { tryMove(e, wx / wl * e.spd * 0.35 * dt, wy / wl * e.spd * 0.35 * dt, e.def.fly); face(e, wx, wy); e.moving = true; } else e.moving = false; }
      else e.moving = false;
      return;
    }
    if (d > 30 && !e.boss) { e.aggro = false; return; }
    const tx = tgt.x - e.x, ty = tgt.y - e.y;
    if (e.boss) return G.Boss.update(e, dt, tgt, td, slow);
    // telegrafando um golpe
    if (e.wind > 0) {
      e.wind -= dt;
      if (e.wind <= 0) strike(e, tgt);
      return;
    }
    if (e.dash > 0) {
      e.dash -= dt;
      tryMove(e, e.dvx * dt, e.dvy * dt, e.def.fly);
      if (!e.dashHit && hyp(tgt.x - e.x, tgt.y - e.y) < e.r + 0.5) { e.dashHit = true; hitTarget(e, tgt, e.dmg * 1.3); }
      return;
    }
    const ai = e.def.ai, reach = e.def.reach * (e.big > 1.2 ? 1.2 : 1);
    let want = 0; // 1 aproxima, -1 afasta
    if (ai === 'ranged' || ai === 'caster') {
      if (td > reach * 0.85 || !los(e.x, e.y - 0.4, tgt.x, tgt.y - 0.4)) want = 1; else if (td < reach * 0.4) want = -1;
      if (td < reach && e.cd <= 0 && los(e.x, e.y - 0.4, tgt.x, tgt.y - 0.4)) { e.wind = 0.45; e.cd = e.def.cd * (0.8 + rnd() * 0.4); face(e, tx, ty); return; }
    } else if (ai === 'charger') {
      if (td > 2.5 && td < 7 && e.cd <= 0 && los(e.x, e.y, tgt.x, tgt.y)) { e.wind = 0.5; e.charge = true; e.cd = e.def.cd * 2; face(e, tx, ty); return; }
      want = td > reach * 0.8 ? 1 : 0;
      if (td <= reach + tgt.r && e.cd <= 0) { e.wind = 0.32; e.charge = false; e.cd = e.def.cd; return; }
    } else {
      want = td > reach * 0.75 ? 1 : 0;
      if (ai === 'swarm' && td < 3) { e.zig = (e.zig || 0) + dt * 6; }
      if (td <= reach + (tgt.r || 0.3) && e.cd <= 0) { e.wind = ai === 'swarm' ? 0.18 : 0.38; e.cd = e.def.cd * (0.85 + rnd() * 0.3); face(e, tx, ty); return; }
    }
    if (want) {
      let vx = tx / td, vy = ty / td;
      if (want > 0 && !e.def.fly && !los(e.x, e.y, tgt.x, tgt.y)) { const f = tgt === P ? flowDir(e) : null; if (f) { vx = f[0]; vy = f[1]; } }
      if (want < 0) { vx = -vx; vy = -vy; }
      if (e.zig) { const z = Math.sin(e.zig) * 0.8; const px = -vy, py = vx; vx += px * z; vy += py * z; }
      // separação entre monstros
      for (const o of S.ents) if (o !== e && !o.dead && o.kind === 'mon') { const ox = e.x - o.x, oy = e.y - o.y, ol = hyp(ox, oy); if (ol < 0.7 && ol > 0) { vx += ox / ol * 0.6; vy += oy / ol * 0.6; } }
      const l = hyp(vx, vy) || 1, sp = e.spd * slow * (S.map.kind === 'world' && !e.def.fly ? Gm.mapSpeed(e.x, e.y) : 1);
      const ok = tryMove(e, vx / l * sp * dt, vy / l * sp * dt, e.def.fly);
      if (!ok) tryMove(e, -vy / l * sp * dt, vx / l * sp * dt, e.def.fly);
      face(e, tx, ty); e.moving = true;
    } else e.moving = false;
  }
  function strike(e, tgt) {
    const ai = e.def.ai, P = S.P;
    const tx = tgt.x - e.x, ty = tgt.y - e.y, td = hyp(tx, ty), ang = Math.atan2(ty - 0.1, tx);
    if (ai === 'ranged' || ai === 'caster') {
      const kind = e.def.proj || 'flecha';
      Cb.shoot('m', e.x, e.y - 0.5 * e.big, ang, kind === 'flecha' || kind === 'bala' ? 11 : 6.5, e.dmg, { kind, elem: e.def.elem, from: e, life: 2, poison: e.def.poison, col: projCol(kind), r: kind === 'flecha' ? 0.15 : 0.25 });
      G.Audio.sfx(kind === 'flecha' ? 'arco' : 'magia_m', e.x, e.y);
      return;
    }
    if (ai === 'charger' && e.charge) {
      e.dash = 0.42; e.dashHit = false; const l = td || 1; e.dvx = tx / l * e.spd * 3.2; e.dvy = ty / l * e.spd * 3.2;
      G.Audio.sfx('investida', e.x, e.y);
      return;
    }
    if (td <= e.def.reach * e.big + (tgt.r || 0.3) + 0.35) hitTarget(e, tgt, e.dmg);
    G.Audio.sfx('mordida', e.x, e.y);
  }
  function hitTarget(e, tgt, dmg) {
    if (tgt === S.P) {
      if (S.P.roll > 0) return;
      Cb.hurtPlayer(dmg, e.def.elem, e, { poison: e.def.poison });
      if (e.def.drain) e.hp = Math.min(e.maxHp, e.hp + dmg * e.def.drain);
    } else hurtAlly(tgt, dmg);
  }
  Cb.hitTarget = hitTarget;
  function projCol(k) { return { orbe_verde: '#9fe0a0', orbe_roxo: '#b55088', orbe_azul: '#7cc8d0', cuspe: '#8fb35a', chama_m: '#f77622', bala: '#cdc6bb', pedra: '#8a858a' }[k] || '#cdc6bb'; }
  Cb.projCol = projCol;

  function updateAlly(e, dt) {
    const P = S.P;
    e.life -= dt;
    if (e.life <= 0) { e.dead = true; Fx.burst(e.x, e.y - 0.4, '#9fb6ff', 12, 2); return; }
    let tgt = null, td = 9;
    for (const m of S.ents) if (m.kind === 'mon' && !m.dead && (m.aggro || hyp(m.x - P.x, m.y - P.y) < 7)) { const d = hyp(m.x - e.x, m.y - e.y); if (d < td) { td = d; tgt = m; } }
    if (e.wind > 0) { e.wind -= dt; if (e.wind <= 0 && tgt && hyp(tgt.x - e.x, tgt.y - e.y) < e.def.reach + tgt.r + 0.4) { Cb.hurt(tgt, e.dmg, null, { src: 'a', knock: 2 }); G.Audio.sfx('mordida', e.x, e.y); } return; }
    let gx, gy, stop;
    if (tgt) { gx = tgt.x; gy = tgt.y; stop = e.def.reach * 0.8; if (td <= e.def.reach + tgt.r && e.cd <= 0) { e.wind = 0.25; e.cd = e.def.cd; return; } }
    else { gx = P.x - 1; gy = P.y + 0.5; stop = 1.2; }
    const dx = gx - e.x, dy = gy - e.y, d = hyp(dx, dy);
    if (d > 14) { e.x = P.x - 0.8; e.y = P.y + 0.4; return; }
    if (d > stop) { const sp = e.spd * (tgt ? 1 : Math.min(1.4, d / 2)); tryMove(e, dx / d * sp * dt, dy / d * sp * dt); face(e, dx, dy); e.moving = true; } else e.moving = false;
  }

  // ---------- gente das cidades ----------
  function updateNpc(e, dt) {
    const P = S.P;
    const near = hyp(P.x - e.x, P.y - e.y) < 2.2;
    if (near) { face(e, P.x - e.x, P.y - e.y); e.moving = false; return; }
    if (e.fixed) { e.moving = false; if (hyp(e.x - e.home[0], e.y - e.home[1]) > 0.3) { const dx = e.home[0] - e.x, dy = e.home[1] - e.y, l = hyp(dx, dy); tryMove(e, dx / l * 1.5 * dt, dy / l * 1.5 * dt); face(e, dx, dy); e.moving = true; } return; }
    if (!e.wander || e.t > e.wanderT) { e.wanderT = e.t + 3 + rnd() * 4; const a = rnd() * Math.PI * 2, r = rnd() * e.range; e.wander = rnd() < 0.35 ? null : [e.home[0] + Math.cos(a) * r, e.home[1] + Math.sin(a) * r]; }
    if (e.wander) { const wx = e.wander[0] - e.x, wy = e.wander[1] - e.y, wl = hyp(wx, wy); if (wl > 0.3) { if (!tryMove(e, wx / wl * 1.4 * dt, wy / wl * 1.4 * dt)) e.wander = null; face(e, wx, wy); e.moving = true; } else e.moving = false; }
    else e.moving = false;
  }
  Cb.spawnCity = function (cid) {
    const c = S.world.cities[cid], C = D.CITIES[cid], P = S.P;
    const mk = (o) => { const e = Object.assign({ id: EID++, kind: 'npc', x: 0, y: 0, dir: 0, anim: 0, r: 0.3, hp: 1, maxHp: 1, arm: 0, st: {}, t: rnd() * 5, big: 1, def: { plan: 'man' } }, o); S.ents.push(e); return e; };
    for (const nid in D.NPCS) {
      const n = D.NPCS[nid]; if (n.city !== cid) continue;
      let spot = n.spot === 'casa' ? c.houses[G.hashStr(nid) % Math.max(1, c.houses.length)] : c.spots[n.spot];
      if (!spot) spot = c.spots.praca;
      const [sx, sy] = spot;
      mk({ npc: nid, name: n.name, x: sx + 0.5, y: sy + 0.7, home: [sx + 0.5, sy + 0.7], fixed: true, look: npcLook(n), role: n.role });
    }
    const race = C.race === 'mix' ? null : C.race;
    const rng = new G.RNG(G.hashStr(cid) + S.day);
    for (let i = 0; i < Math.round(C.w / 5); i++) {
      const r = race || D.RACE_ORDER[rng.int(0, 3)], sex = rng.chance(0.5) ? 'F' : 'M';
      const hx = c.cx + rng.int(-C.w / 2 + 3, C.w / 2 - 3) + 0.5, hy = c.cy + rng.int(-2, 2) + 0.5;
      mk({ name: D.NAMES[r][sex][rng.int(0, 9)], x: hx, y: hy, home: [hx, hy], range: 8, look: npcLook({ race: r, sex, look: { cloth: ['#93683f', '#64923f', '#a8587a', '#3a86a8', '#c47a3e', '#5e3a5c'][rng.int(0, 5)], hair: G.Spr.HAIR[rng.int(0, 6)] } }), idle: r, role: 'povo' });
    }
    if (C.walls) for (const g of c.gates.slice(0, 2)) {
      const gx = Math.min(c.x1 - 1, Math.max(c.x0 + 1, g[0])) + 0.5, gy = Math.min(c.y1 - 1, Math.max(c.y0 + 1, g[1])) + 0.5;
      mk({ name: 'Guarda', x: gx + 1.5, y: gy, home: [gx + 1.5, gy], fixed: true, role: 'guarda', idle: race || 'humano', look: npcLook({ race: race || 'humano', sex: 'M', look: { cloth: '#6d6672', armor: true, helm: true } }) });
    }
    void P;
  };
  function npcLook(n) {
    const L = n.look || {}, race = n.race || 'humano';
    const sk = G.Spr.SKIN[race][G.hashStr(n.name || race) % 3];
    return { skin: sk, hair: L.hair || '#3a2428', cloth: L.cloth || '#93683f', long: n.sex === 'F', beard: L.beard || (race === 'anao' && n.sex === 'M'), short: race === 'anao', ears: race === 'elfo' ? 'elfo' : race === 'fera' ? 'fera' : null, tail: race === 'fera', hat: L.hat, crown: L.crown, armor: L.armor, helm: L.helm ? '#9aa4b4' : null, old: L.old };
  }

  // ---------- quem nasce e quem some, perto do herói ----------
  let spawnT = 0;
  Cb.manage = function (dt) {
    const P = S.P;
    flowT -= dt; if (flowT <= 0) { flowT = 0.35; buildFlow(); }
    spawnT -= dt; if (spawnT > 0) return; spawnT = 0.5;
    if (S.map.kind !== 'world') return;
    const w = S.world;
    for (const sp of w.spawns) {
      const d = hyp(sp.x - P.x, sp.y - P.y);
      if (!sp.active && d < 21 && d > 9) {
        if (sp.deadDay && S.day - sp.deadDay < 2) continue;
        if (sp.unique && P.uniqDead[sp.unique]) continue;
        sp.active = true; sp.alive = 0;
        const night = Gm.isNight();
        sp.list.forEach((mon, k) => { const e = Cb.spawn(mon, sp.x + (k % 2) * 1.2 + 0.5, sp.y + Math.floor(k / 2) * 1.1 + 0.5, sp.lvl + (night ? 1 : 0), { spawnRef: sp }); if (e) sp.alive++; });
      } else if (sp.active && d > 34) {
        sp.active = false;
        S.ents = S.ents.filter((e) => e.spawnRef !== sp || e.dead);
      }
    }
    // cidades
    const cid = G.World.cityAt(w, P.x, P.y);
    const near = cid || nearCity(w, P.x, P.y);
    if (near !== S.cityOn) {
      S.ents = S.ents.filter((e) => e.kind !== 'npc');
      S.cityOn = near;
      if (near) Cb.spawnCity(near);
    }
    if (cid && !P.found.cities[cid]) { P.found.cities[cid] = 1; G.UI.banner(D.CITIES[cid].name, D.CITIES[cid].desc); Gm.gainXp(25); }
    // aviso de região
    const rg = G.World.regionAt(w, P.x, P.y);
    if (rg !== S.region) { if (S.region && !cid) G.UI.banner(D.REGIONS[rg].name, 'Nível ' + D.REGIONS[rg].lvl[0] + ' a ' + D.REGIONS[rg].lvl[1]); S.region = rg; G.Audio.setRegion(rg); }
    S.ents = S.ents.filter((e) => !(e.dead && e.deadT > 3));
  };
  function nearCity(w, x, y) {
    for (const id in w.cities) { const c = w.cities[id]; if (x >= c.x0 - 10 && x <= c.x1 + 10 && y >= c.y0 - 10 && y <= c.y1 + 10) return id; }
    return null;
  }

  // ---------- passo de tudo ----------
  Cb.update = function (dt) {
    for (const e of S.ents) updateEnt(e, dt);
    updateProjs(dt);
    updateTele(dt);
    if (S.map.kind === 'dg') S.ents = S.ents.filter((e) => !(e.dead && e.deadT > 3));
    S.ents = S.ents.filter((e) => !(e.kind === 'ally' && e.dead));
  };
  Cb.hurtAlly = hurtAlly;
})(globalThis.G = globalThis.G || {});
