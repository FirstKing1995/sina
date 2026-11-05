/* SINA · os chefes: cada um com o seu jeito de lutar, golpes avisados no chão e uma fase de fúria abaixo da metade. */
(function (G) {
  'use strict';
  const S = G.Game.S, Cb = G.Combat, Fx = G.Fx;
  const B = G.Boss = {};
  const rnd = Math.random, hyp = Math.hypot;

  function approach(e, tgt, sp, dt, stop) {
    const dx = tgt.x - e.x, dy = tgt.y - e.y, d = hyp(dx, dy);
    if (d <= (stop || 0)) { e.moving = false; return; }
    let vx = dx / d, vy = dy / d;
    if (!Cb.los(e.x, e.y, tgt.x, tgt.y)) { vx += (rnd() - 0.5) * 0.6; vy += (rnd() - 0.5) * 0.6; }
    if (!Cb.tryMove(e, vx * sp * dt, vy * sp * dt, e.def.fly)) Cb.tryMove(e, -vy * sp * dt, vx * sp * dt, e.def.fly);
    Cb.face(e, dx, dy); e.moving = true;
  }
  function slam(e, r, dmg, delay, at) { S.tele.push({ x: at ? at.x : e.x, y: at ? at.y : e.y, r, t: 0, delay, dmg, owner: 'm', from: e, col: '#c8423a', big: r > 2.5, elem: e.def.elem }); }
  function spread(e, ang, n, arc, kind, dmg, spd) {
    for (let i = 0; i < n; i++) { const a = ang + (n > 1 ? (i / (n - 1) - 0.5) * arc : 0); Cb.shoot('m', e.x, e.y - 0.6 * e.big, a, spd, dmg, { kind, elem: e.def.elem, from: e, life: 2.4, col: Cb.projCol(kind), r: 0.26, poison: e.def.poison }); }
    G.Audio.sfx('magia_m', e.x, e.y);
  }
  function ring(e, n, kind, dmg, spd, off) { for (let i = 0; i < n; i++) spread(e, (i / n) * Math.PI * 2 + (off || 0), 1, 0, kind, dmg, spd); }
  function summon(e, mon, n) {
    for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2; const x = e.x + Math.cos(a) * 1.8, y = e.y + Math.sin(a) * 1.4; if (!G.Game.mapBlocked(x, y)) { const m = Cb.spawn(mon, x, y, Math.max(1, e.lvl - 2), { dg: true }); if (m) { m.aggro = true; m.xp = Math.round(m.xp * 0.3); m.def = Object.assign({}, m.def, { drops: {} }); } Fx.burst(x, y - 0.4, '#b55088', 12, 2); } }
  }
  function blink(e, tgt, r) {
    for (let k = 0; k < 12; k++) {
      const a = rnd() * Math.PI * 2, x = tgt.x + Math.cos(a) * r, y = tgt.y + Math.sin(a) * r;
      if (!G.Game.mapBlocked(x, y) && Cb.los(x, y, tgt.x, tgt.y)) { Fx.burst(e.x, e.y - 0.5, '#b55088', 14, 2); e.x = x; e.y = y; Fx.burst(x, y - 0.5, '#b55088', 14, 2); G.Audio.sfx('teleporte', x, y); return true; }
    }
    return false;
  }
  function melee(e, tgt, td, dmgMul) {
    if (td <= e.def.reach * e.big + 0.4 && e.cd <= 0) { e.wind = 0.42; e.cd = e.def.cd * (e.phase ? 0.75 : 1); e.windMul = dmgMul || 1; Cb.face(e, tgt.x - e.x, tgt.y - e.y); return true; }
    return false;
  }

  B.update = function (e, dt, tgt, td, slow) {
    const kind = e.def.boss;
    const angT = Math.atan2(tgt.y - e.y, tgt.x - e.x);
    if (!e.phase && e.hp < e.maxHp * 0.5) { e.phase = 1; G.UI.toast(e.def.name + ' se enfurece!', 'boss'); Fx.shake(10); G.Audio.sfx('rugido'); e.spd *= 1.18; }
    if (e.wind > 0) {
      e.wind -= dt;
      if (e.wind <= 0 && hyp(tgt.x - e.x, tgt.y - e.y) <= e.def.reach * e.big + 0.7) Cb.hitTarget(e, tgt, e.dmg * (e.windMul || 1));
      return;
    }
    if (e.dash > 0) {
      e.dash -= dt; Cb.tryMove(e, e.dvx * dt, e.dvy * dt);
      if (!e.dashHit && hyp(tgt.x - e.x, tgt.y - e.y) < e.r + 0.6) { e.dashHit = true; Cb.hitTarget(e, tgt, e.dmg * 1.2); }
      if (e.dash <= 0 && e.chain > 0) { e.chain--; e.dash = 0.35; e.dashHit = false; const a = Math.atan2(tgt.y - e.y, tgt.x - e.x); e.dvx = Math.cos(a) * e.spd * 3.4; e.dvy = Math.sin(a) * e.spd * 3.4; }
      return;
    }
    if (e.busy > 0) { e.busy -= dt; return; }
    const sp = e.spd * slow;
    switch (kind) {
      case 'brute':
        if (e.skill <= 0) { e.skill = e.phase ? 4.5 : 6.5; e.busy = 0.9; slam(e, 2.6 * Math.min(1.4, e.big), e.dmg * 1.5, 0.9); G.Audio.sfx('rugido', e.x, e.y); return; }
        if (!melee(e, tgt, td)) approach(e, tgt, sp, dt, e.def.reach * 0.7);
        break;
      case 'saci':
        if (e.skill <= 0) { e.skill = 3.5; blink(e, tgt, 1.6); e.cd = 0.2; if (e.phase) ring(e, 6, 'orbe_verde', e.dmg * 0.6, 5, rnd()); return; }
        if (!melee(e, tgt, td)) approach(e, tgt, sp, dt, 0.8);
        break;
      case 'curupira':
        if (e.skill <= 0) {
          e.skill = e.phase ? 3.5 : 5;
          if (rnd() < 0.35) summon(e, rnd() < 0.5 ? 'fogo_fatuo' : 'onca', e.phase ? 2 : 1);
          else { spread(e, angT, e.phase ? 5 : 3, 0.7, 'chama_m', e.dmg * 0.7, 7); }
          e.busy = 0.4; return;
        }
        if (!melee(e, tgt, td)) approach(e, tgt, sp, dt, 1);
        break;
      case 'rei_pedra':
        if (e.skill <= 0) {
          e.skill = e.phase ? 4 : 5.5;
          if (rnd() < 0.5) { slam(e, 3.2, e.dmg * 1.4, 1.0); e.busy = 1.0; }
          else { for (let i = 0; i < (e.phase ? 4 : 2); i++) slam(e, 1.3, e.dmg, 1.1 + i * 0.2, { x: tgt.x + (rnd() - 0.5) * 3, y: tgt.y + (rnd() - 0.5) * 3 }); e.busy = 0.5; }
          if (e.phase && !e.called) { e.called = true; summon(e, 'mao_pedra', 2); }
          return;
        }
        if (!melee(e, tgt, td)) approach(e, tgt, sp, dt, 1.2);
        break;
      case 'brood':
        if (e.skill <= 0) { e.skill = e.phase ? 5 : 7; summon(e, 'filhote', e.phase ? 4 : 3); spread(e, angT, 3, 0.5, 'cuspe', e.dmg * 0.6, 6); e.busy = 0.5; return; }
        if (!melee(e, tgt, td)) approach(e, tgt, sp, dt, 1);
        break;
      case 'lobisomem':
        if (e.skill <= 0) {
          e.skill = e.phase ? 3.2 : 4.5;
          e.busy = 0.5; e.dash = 0; setTimeout(() => { if (e.dead) return; const a = Math.atan2(tgt.y - e.y, tgt.x - e.x); e.dash = 0.38; e.dashHit = false; e.chain = e.phase ? 2 : 1; e.dvx = Math.cos(a) * e.spd * 3.4; e.dvy = Math.sin(a) * e.spd * 3.4; G.Audio.sfx('investida', e.x, e.y); }, 450);
          slam(e, 0.01, 0, 0.45);
          return;
        }
        if ((e.hp < e.maxHp * 0.6 && !e.howl1) || (e.hp < e.maxHp * 0.3 && !e.howl2)) { if (!e.howl1) e.howl1 = true; else e.howl2 = true; summon(e, 'lobo', 2); G.Audio.sfx('uivo', e.x, e.y); e.busy = 0.8; return; }
        if (!melee(e, tgt, td)) approach(e, tgt, sp, dt, 0.9);
        break;
      case 'caster_boss':
        if (e.skill <= 0) { e.skill = e.phase ? 4 : 6; ring(e, e.phase ? 12 : 8, 'orbe_azul', e.dmg * 0.7, 5.5, rnd()); e.busy = 0.5; if (e.phase && rnd() < 0.5) summon(e, 'pirata', 2); return; }
        if (!melee(e, tgt, td)) approach(e, tgt, sp, dt, 1);
        break;
      case 'cuca':
        if (e.skill <= 0) {
          e.skill = e.phase ? 3 : 4.2;
          const r = rnd();
          if (r < 0.4) { for (let i = 0; i < 3; i++) S.tele.push({ x: tgt.x + (rnd() - 0.5) * 2.5, y: tgt.y + (rnd() - 0.5) * 2, r: 1.5, t: 0, delay: 1 + i * 0.15, dmg: e.dmg, owner: 'm', from: e, col: '#b55088', slow: true, elem: 'gelo' }); }
          else if (r < 0.7) spread(e, angT, 5, 0.9, 'orbe_roxo', e.dmg * 0.7, 6);
          else { summon(e, 'sapo', e.phase ? 2 : 1); blink(e, tgt, 6); }
          e.busy = 0.45; return;
        }
        if (td < 3) approach(e, { x: e.x * 2 - tgt.x, y: e.y * 2 - tgt.y }, sp, dt); else if (td > 7) approach(e, tgt, sp, dt, 5);
        else if (e.cd <= 0) { e.cd = e.def.cd; spread(e, angT, 1, 0, 'orbe_roxo', e.dmg * 0.8, 7.5); }
        break;
      case 'morvan':
        if (e.skill <= 0) {
          e.skill = e.phase ? 2.8 : 3.8;
          const r = rnd();
          if (r < 0.3) blink(e, tgt, 5);
          else if (r < 0.65) { for (let i = 0; i < (e.phase ? 5 : 3); i++) S.tele.push({ x: tgt.x + (rnd() - 0.5) * 3, y: tgt.y + (rnd() - 0.5) * 2.5, r: 1.4, t: 0, delay: 0.9 + i * 0.2, dmg: e.dmg * 1.1, owner: 'm', from: e, col: '#b55088', fire: true, elem: 'fogo' }); }
          else ring(e, e.phase ? 14 : 10, 'orbe_roxo', e.dmg * 0.6, 5, rnd());
          if (e.phase && !e.called) { e.called = true; summon(e, 'cultista_lam', 2); summon(e, 'cultista', 1); }
          e.busy = 0.4; return;
        }
        if (td < 4) approach(e, { x: e.x * 2 - tgt.x, y: e.y * 2 - tgt.y }, sp, dt);
        else if (td > 8) approach(e, tgt, sp, dt, 6);
        else if (e.cd <= 0) { e.cd = e.def.cd; spread(e, angT, 3, 0.35, 'orbe_roxo', e.dmg * 0.7, 8); }
        break;
      case 'boitata': return boitata(e, dt, tgt, td, sp, angT);
      default:
        if (!melee(e, tgt, td)) approach(e, tgt, sp, dt, 1);
    }
  };

  // o Boitatá: cobra de fogo. A cabeça persegue em curvas, o corpo segue o rastro e queima quem encosta
  function boitata(e, dt, tgt, td, sp, angT) {
    e.head = e.head == null ? angT : e.head;
    let da = angT - e.head; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    e.head += Math.max(-1, Math.min(1, da)) * dt * (e.phase ? 2.6 : 2.0) + Math.sin(e.t * 2.2) * dt * 0.9;
    if (e.skill <= 0) {
      e.skill = e.phase ? 3.2 : 4.5;
      const r = rnd();
      if (r < 0.45) { S.tele.push({ x: e.x, y: e.y, r: 5, t: 0, delay: 0.9, dmg: e.dmg * 1.2, owner: 'm', from: e, col: '#f77622', cone: true, ang: angT, arc: 0.9, elem: 'fogo' }); e.busy = 1.0; G.Audio.sfx('rugido', e.x, e.y); return; }
      if (r < 0.75) { ring(e, e.phase ? 16 : 10, 'chama_m', e.dmg * 0.55, 5, rnd()); e.busy = 0.4; return; }
      for (let i = 0; i < 4; i++) S.tele.push({ x: tgt.x + (rnd() - 0.5) * 4, y: tgt.y + (rnd() - 0.5) * 3, r: 1.5, t: 0, delay: 1 + i * 0.15, dmg: e.dmg, owner: 'm', from: e, col: '#f77622', fire: true, elem: 'fogo' });
      if (e.phase && !e.called) { e.called = true; summon(e, 'brasa_viva', 3); }
      e.busy = 0.3; return;
    }
    const v = sp * (td > 6 ? 1.25 : 0.9);
    const nx = Math.cos(e.head) * v * dt, ny = Math.sin(e.head) * v * dt;
    if (!Cb.tryMove(e, nx, ny)) e.head += Math.PI * 0.6;
    Cb.face(e, nx, ny); e.moving = true;
    // o corpo segue a cabeça
    let px = e.x, py = e.y;
    for (const s of e.seg) { const dx = px - s.x, dy = py - s.y, l = hyp(dx, dy); if (l > 0.55) { s.x += dx / l * (l - 0.55); s.y += dy / l * (l - 0.55); } px = s.x; py = s.y; }
    e.burnT = (e.burnT || 0) - dt;
    if (e.burnT <= 0) {
      for (const s of e.seg) if (hyp(S.P.x - s.x, S.P.y - s.y) < 0.7) { Cb.hurtPlayer(e.dmg * 0.35, 'fogo', null, { noKnock: true, burn: e.dmg * 0.05 }); e.burnT = 0.6; break; }
      if (td < 1.2) { Cb.hitTarget(e, tgt, e.dmg * 0.8); e.burnT = 0.8; }
    }
    if (rnd() < dt * 2) S.hazards.push({ x: e.seg[e.seg.length - 1].x, y: e.seg[e.seg.length - 1].y, r: 0.7, t: 0, life: 3, dps: e.dmg * 0.2, elem: 'fogo' });
  }
})(globalThis.G = globalThis.G || {});
