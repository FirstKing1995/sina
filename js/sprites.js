/* SINA · sprites novos, feitos por código (no mesmo acabamento do Gods): heróis e gente das cidades, monstros,
   ícones dos itens, prédios das cidades, entradas de masmorra, baús e o chão das masmorras.
   A natureza (árvores, pedras, cactos, mangue), os bichos do campo e as casas pequenas vêm prontos do Gods (art.js). */
(function (G) {
  'use strict';
  const A = G.Art, H = A.H, Buf = H.Buf, mk = A.mk, mix = H.mix, lighten = A.lighten;
  const SP = G.Spr = {};
  const INK = '#1f1a24';
  const dk = (c, t) => mix(c, INK, t == null ? 0.35 : t);
  const lt = (c, t) => mix(c, '#fff4d8', t == null ? 0.3 : t);

  // contorno automático: todo pixel vazio encostado num cheio vira tinta
  function outline(b, col) {
    const add = [];
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      if (b.get(x, y)) continue;
      if (b.get(x - 1, y) || b.get(x + 1, y) || b.get(x, y - 1) || b.get(x, y + 1)) add.push(x, y);
    }
    for (let i = 0; i < add.length; i += 2) b.set(add[i], add[i + 1], col || INK);
    return b;
  }
  function rows(rs, map, pad) {
    pad = pad || 0;
    const w = rs[0].length + pad * 2, h = rs.length + pad * 2, b = new Buf(w, h);
    rs.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const c = map[r[x]]; if (c) b.set(x + pad, y + pad, c); } });
    return b;
  }
  function mirror(b) { return H.mirrorBuf(b); }
  const rect = (b, x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) b.set(x, y, c); };
  SP.outline = outline; SP.rows = rows;

  // ---------- gente (12 x 18): 4 lados (frente, costas, direita, esquerda) x 3 quadros ----------
  SP.PW = 12; SP.PH = 18;
  function personBuf(o, dir, f) {
    const b = new Buf(12, 18);
    const sk = o.skin, skd = dk(sk, 0.3), hair = o.hair, cl = o.cloth, cl2 = o.cloth2 || dk(cl, 0.35);
    const pants = o.pants || dk(cl2, 0.2), boots = o.boots || '#3a2a20';
    const oy = o.short ? 2 : 0, side = dir >= 2;
    const swing = f === 0 ? 0 : f === 1 ? 1 : -1;
    // pernas
    const legTop = 12 + (o.short ? 1 : 0), legBot = 16;
    if (o.oneLeg) {
      rect(b, 5, legTop, 6, legBot - 1, sk); rect(b, 5, legBot, 6, legBot, boots);
    } else if (!side) {
      const l = f === 1 ? -1 : 0, r = f === 2 ? -1 : 0;
      rect(b, 4, legTop, 5, legBot - 1 + l, pants); rect(b, 4, legBot + l, 5, legBot + l, boots);
      rect(b, 6, legTop, 7, legBot - 1 + r, pants); rect(b, 6, legBot + r, 7, legBot + r, boots);
    } else {
      if (f === 0) { rect(b, 5, legTop, 6, legBot - 1, pants); rect(b, 5, legBot, 7, legBot, boots); }
      else {
        const a = f === 1 ? 1 : -1;
        rect(b, 5 + a, legTop + 1, 6 + a, legBot - 1, pants); rect(b, 5 + a, legBot, 6 + a + 1, legBot, boots);
        rect(b, 5 - a, legTop + 1, 6 - a, legBot - 2, dk(pants, 0.25)); rect(b, 5 - a, legBot - 1, 6 - a + 1, legBot - 1, dk(boots, 0.2));
        rect(b, 5, legTop, 6, legTop, pants);
      }
    }
    // tronco
    const tx0 = o.short || o.wide ? 2 : 3, tx1 = o.short || o.wide ? 9 : 8, ty0 = 7 + oy, ty1 = 11 + (o.short ? 1 : 0);
    if (!side) {
      rect(b, tx0, ty0, tx1, ty1, cl);
      for (let y = ty0; y <= ty1; y++) b.set(tx1, y, cl2);
      rect(b, tx0, ty1, tx1, ty1, o.belt || cl2);
      if (o.armor) { rect(b, tx0 + 1, ty0, tx1 - 1, ty0, lt(cl, 0.35)); b.set(tx0 + 2, ty0 + 2, lt(cl, 0.5)); }
      if (o.ribs) for (let y = ty0 + 1; y < ty1; y += 2) rect(b, tx0 + 1, y, tx1 - 1, y, dk(cl, 0.5));
      if (dir === 1 && o.cape) rect(b, tx0, ty0, tx1, ty1 + 2, o.cape);
      // braços
      const ay = swing;
      rect(b, tx0 - 1, ty0 + (ay > 0 ? 1 : 0), tx0 - 1, ty1 - 1 + (ay > 0 ? 1 : 0), cl2); b.set(tx0 - 1, ty1 + (ay > 0 ? 1 : 0), sk);
      rect(b, tx1 + 1, ty0 + (ay < 0 ? 1 : 0), tx1 + 1, ty1 - 1 + (ay < 0 ? 1 : 0), cl2); b.set(tx1 + 1, ty1 + (ay < 0 ? 1 : 0), sk);
    } else {
      rect(b, 4, ty0, 7, ty1, cl); for (let y = ty0; y <= ty1; y++) b.set(4, y, cl2);
      rect(b, 4, ty1, 7, ty1, o.belt || cl2);
      if (o.cape) rect(b, 3, ty0, 3, ty1 + 2, o.cape);
      if (o.tail) { b.set(3, ty1, hair); b.set(2, ty1 + 1, hair); b.set(2, ty1 + 2, hair); b.set(1, ty1 + 2, lt(hair, 0.2)); }
      const ax = 6 + swing;
      rect(b, ax, ty0 + 1, ax, ty1, cl2); b.set(ax, ty1 + 1, sk);
    }
    // cabeça
    const hy = 1 + oy;
    if (!side) {
      rect(b, 3, hy, 8, hy + 5, sk);
      for (let y = hy; y <= hy + 5; y++) b.set(8, y, skd);
      // cabelo
      if (dir === 1) { rect(b, 3, hy, 8, hy + 4, hair); rect(b, 3, hy + 5, 8, hy + 5, dk(hair, 0.2)); if (o.long) rect(b, 3, hy + 5, 8, hy + 8, hair); }
      else {
        rect(b, 3, hy, 8, hy + 1, hair); b.set(3, hy + 2, hair); b.set(8, hy + 2, hair);
        if (o.long) { rect(b, 2, hy + 2, 2, hy + 7, hair); rect(b, 9, hy + 2, 9, hy + 7, hair); }
        const ey = o.ink || INK;
        b.set(4, hy + 3, o.glow || ey); b.set(7, hy + 3, o.glow || ey);
        if (o.beard) { rect(b, 4, hy + 4, 7, hy + 6, hair); b.set(5, hy + 4, sk); b.set(6, hy + 4, sk); }
        if (o.snout) { rect(b, 4, hy + 4, 7, hy + 6, o.snout); b.set(4, hy + 6, '#ffffff'); b.set(7, hy + 6, '#ffffff'); b.set(5, hy + 4, INK); b.set(6, hy + 4, INK); }
        if (o.skull) { b.set(4, hy + 3, INK); b.set(7, hy + 3, INK); b.set(4, hy + 2, INK); b.set(7, hy + 2, INK); rect(b, 4, hy + 5, 7, hy + 5, dk(sk, 0.4)); b.set(5, hy + 5, sk); }
      }
    } else {
      rect(b, 4, hy, 8, hy + 5, sk);
      rect(b, 4, hy, 8, hy + 1, hair); rect(b, 4, hy + 2, 5, hy + 4, hair);
      if (o.long) rect(b, 3, hy + 2, 4, hy + 7, hair);
      b.set(7, hy + 3, o.glow || INK);
      if (o.beard) { rect(b, 6, hy + 4, 8, hy + 6, hair); }
      if (o.snout) { rect(b, 8, hy + 3, 9, hy + 5, o.snout); b.set(9, hy + 5, '#ffffff'); }
      if (o.skull) { b.set(7, hy + 2, INK); rect(b, 6, hy + 5, 8, hy + 5, dk(sk, 0.4)); }
    }
    // orelhas
    if (o.ears === 'elfo') { if (!side) { b.set(2, hy + 2, sk); b.set(1, hy + 1, sk); b.set(9, hy + 2, skd); b.set(10, hy + 1, skd); } else { b.set(5, hy + 2, sk); b.set(4, hy + 1, sk); b.set(3, hy, sk); } }
    if (o.ears === 'fera') { if (!side) { rect(b, 3, hy - 1, 4, hy - 1, hair); b.set(3, hy - 2 < 0 ? 0 : hy - 2, hair); rect(b, 7, hy - 1, 8, hy - 1, hair); b.set(8, hy - 2 < 0 ? 0 : hy - 2, hair); b.set(4, hy - 1, lt(hair, 0.4)); b.set(7, hy - 1, lt(hair, 0.4)); } else { rect(b, 5, hy - 1, 6, hy - 1, hair); b.set(5, Math.max(0, hy - 2), hair); } }
    // chapéus e elmos
    if (o.helm) {
      const m = o.helm;
      if (!side) { rect(b, 3, hy, 8, hy + 2, m); b.set(3, hy + 3, m); b.set(8, hy + 3, dk(m)); if (dir === 0) rect(b, 4, hy + 2, 7, hy + 2, INK); else rect(b, 3, hy + 3, 8, hy + 4, m); rect(b, 4, hy, 6, hy, lt(m, 0.4)); }
      else { rect(b, 4, hy, 8, hy + 2, m); rect(b, 4, hy + 3, 5, hy + 4, m); b.set(8, hy + 2, INK); b.set(7, hy + 2, INK); }
    }
    if (o.hood) {
      const m = o.hood;
      if (!side) { rect(b, 2, hy - 1 < 0 ? 0 : hy - 1, 9, hy + 1, m); rect(b, 2, hy + 2, 2, hy + 6, m); rect(b, 9, hy + 2, 9, hy + 6, dk(m)); if (dir === 1) rect(b, 2, hy, 9, hy + 6, m); else { b.set(4, hy + 3, o.glow || INK); b.set(7, hy + 3, o.glow || INK); rect(b, 3, hy + 2, 8, hy + 2, dk(m, 0.55)); } }
      else { rect(b, 3, hy - 1 < 0 ? 0 : hy - 1, 8, hy + 1, m); rect(b, 3, hy + 2, 5, hy + 6, m); }
    }
    if (o.hat === 'palha') { rect(b, 1, hy + 1, 10, hy + 1, '#d0a46a'); rect(b, 3, hy - 1 < 0 ? 0 : hy - 1, 8, hy, '#e2cfa4'); }
    if (o.hat === 'canga') { rect(b, 1, hy + 1, 10, hy + 1, '#6e4a35'); rect(b, 3, hy - 1 < 0 ? 0 : hy - 1, 8, hy, '#93683f'); b.set(1, hy, '#6e4a35'); b.set(10, hy, '#6e4a35'); if (!side) b.set(5, hy, '#eaaa3c'); }
    if (o.hat === 'pirata') { rect(b, 2, hy, 9, hy + 1, '#2b2733'); rect(b, 4, hy - 1 < 0 ? 0 : hy - 1, 7, hy - 1 < 0 ? 0 : hy - 1, '#2b2733'); if (!side) b.set(5, hy, '#cdc6bb'); }
    if (o.hat === 'saci') { rect(b, 3, hy, 8, hy + 1, '#c8423a'); rect(b, 4, Math.max(0, hy - 1), 7, Math.max(0, hy - 1), '#c8423a'); b.set(side ? 3 : 8, Math.max(0, hy - 1), '#e0857a'); }
    if (o.crown) { rect(b, 3, hy, 8, hy, '#eaaa3c'); b.set(3, Math.max(0, hy - 1), '#eaaa3c'); b.set(5, Math.max(0, hy - 1), '#f2da72'); b.set(8, Math.max(0, hy - 1), '#eaaa3c'); }
    if (o.fireHair) { for (let x = 3; x <= 8; x++) { b.set(x, Math.max(0, hy - 1), x % 2 ? '#e47c2c' : '#f2da72'); } b.set(4, Math.max(0, hy - 2), '#f2da72'); b.set(7, Math.max(0, hy - 2), '#e47c2c'); }
    if (o.old && dir === 0) b.set(5, hy + 4, skd);
    return outline(b);
  }
  // folha 36 x 72
  SP.personSheet = function (o) {
    const [c, x] = mk(36, 72);
    A.polishWith(() => {
      for (let d = 0; d < 4; d++) for (let f = 0; f < 3; f++) {
        const dd = d === 3 ? 2 : d;
        let b = personBuf(o, dd, f);
        if (d === 3) b = mirror(b);
        x.drawImage(b.canvas(), f * 12, d * 18);
      }
    });
    return { img: c, fw: 12, fh: 18, dirs: 4, frames: 3 };
  };

  // o visual do herói vem do povo e do que ele veste
  const SKIN = { humano: ['#e8b796', '#c28569', '#8a5a3a'], elfo: ['#f0d0b0', '#d8b090', '#b8a090'], anao: ['#e0a080', '#c08060', '#8a5a40'], fera: ['#b88a5a', '#93683f', '#6e5a4a'] };
  const HAIR = ['#3a2428', '#6e4a35', '#c47a3e', '#e2cfa4', '#1f1a24', '#a8482c', '#cdc6bb'];
  SP.SKIN = SKIN; SP.HAIR = HAIR;
  SP.heroLook = function (P) {
    const D = G.D, eq = P.equip || {};
    const mat = (it) => (it ? D.MATS[it.mat] : null);
    const corpo = eq.corpo, cab = eq.cabeca, pes = eq.pes;
    const sk = SKIN[P.race][P.look.skin % 3];
    const o = { skin: sk, hair: HAIR[P.look.hair % HAIR.length], cloth: '#8a7a64', cloth2: '#5e5044', long: P.look.sex === 'F', beard: P.race === 'anao' && P.look.sex === 'M', short: P.race === 'anao', ears: P.race === 'elfo' ? 'elfo' : P.race === 'fera' ? 'fera' : null, tail: P.race === 'fera' };
    if (corpo) { const m = mat(corpo); o.cloth = m.col; o.cloth2 = m.col2; o.armor = D.ARMORS[corpo.base].heavy; if (corpo.rar >= 2) o.cape = corpo.rar === 3 ? '#a8482c' : '#2a4a6e'; }
    if (cab) { const m = mat(cab); if (D.ARMORS[cab.base].heavy) o.helm = m.col; else o.hood = m.col2; }
    if (pes) o.boots = mat(pes).col2;
    if (eq.maos) o.belt = mat(eq.maos).col2;
    return o;
  };

  // ---------- armas na mão (de pé, empunhadura embaixo) ----------
  const wcache = {};
  SP.weapon = function (kind, matId) {
    const k = kind + ':' + matId;
    if (wcache[k]) return wcache[k];
    const m = G.D.MATS[matId] || G.D.MATS.ferro, a = m.col, bb = m.col2, w = '#6e4a35', g = '#eaaa3c';
    const map = { a, b: bb, w, g, l: lt(a, 0.4), s: '#c8a66c', o: '#7cc8d0' };
    const R = {
      adaga: ['.l.', 'ab.', 'ab.', 'ab.', 'ggg', '.w.', '.w.'],
      espada: ['.l.', 'ab.', 'ab.', 'ab.', 'ab.', 'ab.', 'ab.', 'ggg', '.w.', '.w.'],
      machado: ['aab', 'aabw', 'ab.w', '...w', '...w', '...w', '...w', '...w', '...w'],
      maca: ['.a.', 'aab', 'abb', '.b.', '.w.', '.w.', '.w.', '.w.', '.w.'],
      montante: ['.l.', 'ab.', 'ab.', 'ab.', 'ab.', 'ab.', 'ab.', 'ab.', 'ab.', 'ab.', 'ggggg', '..w..', '..w..', '..w..'],
      martelo: ['aaaab', 'aaaab', 'bbbbb', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..', '..w..'],
      arco: ['.w', 'w.', 'w.', 'ws', 'ws', 'w.', 'w.', '.w'],
      arco_longo: ['.w', 'w.', 'w.', 'w.', 'ws', 'ws', 'w.', 'w.', 'w.', '.w'],
      cajado: ['.o.', 'aoa', '.a.', '.w.', '.w.', '.w.', '.w.', '.w.', '.w.', '.w.', '.w.', '.w.'],
    };
    const r = R[kind] || R.espada, wd = Math.max(...r.map((s) => s.length));
    const b = rows(r.map((s) => (s + '.....').slice(0, wd)), map, 1);
    outline(b);
    return (wcache[k] = A.polishWith(() => b.canvas()));
  };

  // ---------- monstros ----------
  const mcache = {};
  SP.monster = function (id) {
    if (mcache[id]) return mcache[id];
    const d = G.D.MON[id];
    let s = null;
    if (d.plan === 'wolf') {
      let img = A.wolfSheet(d.fur in { 0: 1, 1: 1, 2: 1 } ? d.fur : 0);
      if (d.fur === 3 || d.fur === 9) img = tint(img, d.fur === 3 ? '#eef2f8' : '#8fb0ff', d.fur === 3 ? 0.55 : 0.5);
      s = { img, fw: A.WOLF_W, fh: A.WOLF_H, dirs: 4, frames: 3 };
    } else if (d.plan === 'beast') {
      s = { img: A.beastSheet(d.sp), fw: G.Art.BEAST[d.sp].w || 14, fh: G.Art.BEAST[d.sp].h, dirs: 2, frames: 3 };
      s.fw = s.img.width / 3; s.fh = s.img.height / 2;
    } else if (d.plan === 'man' || d.plan === 'skel' || d.plan === 'saci' || d.plan === 'curupira' || d.plan === 'werewolf' || d.plan === 'cuca') {
      s = SP.personSheet(monLook(d));
    } else s = PLAN[d.plan](d);
    return (mcache[id] = s);
  };
  function monLook(d) {
    const L = d.look || {};
    if (d.plan === 'skel') return { skin: '#e2dccc', hair: '#e2dccc', cloth: '#d0c8b4', cloth2: '#8a8070', pants: '#b8b0a0', boots: '#8a8070', skull: true, ribs: true, glow: '#c8423a' };
    if (d.plan === 'saci') return { skin: '#5a3a2a', hair: '#1f1a24', cloth: '#c8423a', cloth2: '#8a2a2c', pants: '#5a3a2a', hat: 'saci', oneLeg: true };
    if (d.plan === 'curupira') return { skin: '#8a5a3a', hair: '#e47c2c', fireHair: true, cloth: '#40723e', cloth2: '#2c573d', pants: '#6e4a35', boots: '#8a5a3a', glow: '#f2da72' };
    if (d.plan === 'werewolf') return { skin: '#6e5a4a', hair: '#4a3a32', cloth: '#6e5a4a', cloth2: '#4a3a32', pants: '#4a3a32', boots: '#2b2733', ears: 'fera', snout: '#8a7464', wide: true, tail: true, glow: '#f2da72' };
    if (d.plan === 'cuca') return { skin: '#5a8a3a', hair: '#f2da72', long: true, cloth: '#5e3a5c', cloth2: '#3a2448', snout: '#6aa040', hood: null, glow: '#f2da72' };
    return { skin: L.skin || '#c28569', hair: L.hair || '#3a2428', cloth: L.cloth || '#7a4a2a', cloth2: L.cloth2, hood: L.hood ? L.cloth2 || dk(L.cloth) : null, hat: L.hat, glow: L.glow, beard: L.beard, crown: L.crown };
  }
  function tint(img, col, a) {
    const [c, x] = mk(img.width, img.height);
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-atop'; x.globalAlpha = a; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
    return c;
  }
  SP.tint = tint;
  function sheetFrom(frames, mirrorToo) {
    const fw = frames[0].w, fh = frames[0].h, n = frames.length;
    const [c, x] = mk(fw * n, fh * (mirrorToo ? 2 : 1));
    A.polishWith(() => frames.forEach((b, i) => { x.drawImage(b.canvas(), i * fw, 0); if (mirrorToo) x.drawImage(mirror(b).canvas(), i * fw, fh); }));
    return { img: c, fw, fh, dirs: mirrorToo ? 2 : 1, frames: n };
  }
  const PLAN = {
    spider(d) {
      const fr = [0, 1, 2].map((f) => {
        const b = new Buf(16, 12), c = d.col, c2 = d.col2;
        // pernas
        for (let i = 0; i < 4; i++) {
          const y = 3 + i * 2, k = (i + f) % 2 ? 1 : 0;
          b.set(4 - k, y, dk(c, 0.3)); b.set(3 - k, y + 1, dk(c, 0.3)); b.set(2 - k, y + 2 - k, dk(c, 0.3));
          b.set(11 + k, y, dk(c, 0.3)); b.set(12 + k, y + 1, dk(c, 0.3)); b.set(13 + k, y + 2 - k, dk(c, 0.3));
        }
        rect(b, 5, 2, 10, 9, c); rect(b, 6, 1, 9, 1, c); rect(b, 6, 10, 9, 10, c);
        rect(b, 6, 3, 9, 4, c2); b.set(7, 6, c2); b.set(8, 6, c2); b.set(7, 8, c2); b.set(8, 8, c2);
        b.set(6, 10, '#f2da72'); b.set(9, 10, '#f2da72');
        return outline(b);
      });
      return sheetFrom(fr, false);
    },
    scorpion(d) {
      const fr = [0, 1, 2].map((f) => {
        const b = new Buf(18, 16), c = d.col, c2 = d.col2;
        // cauda curva por cima
        const tail = [[8, 9], [8, 8], [8, 7], [9, 6], [9, 5], [9, 4], [8, 3], [7, 3], [6, 4]];
        tail.forEach(([x, y], i) => rect(b, x, y - (f === 1 ? 1 : 0), x + 1, y - (f === 1 ? 1 : 0), i > 6 ? c2 : c));
        b.set(5, 5 - (f === 1 ? 1 : 0), '#f2da72');
        rect(b, 6, 9, 11, 13, c); rect(b, 7, 14, 10, 14, c);
        for (let i = 0; i < 3; i++) { const k = (i + f) % 2; b.set(5 - k, 10 + i * 2, dk(c)); b.set(4 - k, 11 + i * 2, dk(c)); b.set(12 + k, 10 + i * 2, dk(c)); b.set(13 + k, 11 + i * 2, dk(c)); }
        // garras
        rect(b, 3, 13, 4, 15, c2); rect(b, 13, 13, 14, 15, c2); b.set(2, 14, c2); b.set(15, 14, c2);
        b.set(7, 12, '#1f1a24'); b.set(10, 12, '#1f1a24');
        return outline(b);
      });
      return sheetFrom(fr, false);
    },
    golem(d) {
      const fr = [0, 1, 2].map((f) => {
        const b = new Buf(18, 22), c = d.col, c2 = d.col2, gl = d.glow || '#7cc8d0';
        const l = f === 1 ? -1 : 0, r = f === 2 ? -1 : 0;
        rect(b, 5, 15, 8, 20 + l, c2); rect(b, 10, 15, 13, 20 + r, c2);
        rect(b, 3, 6, 14, 15, c); rect(b, 4, 5, 13, 5, c);
        rect(b, 1, 7, 3, 15 + (f === 1 ? 1 : 0), c2); rect(b, 14, 7, 16, 15 + (f === 2 ? 1 : 0), c2);
        rect(b, 6, 1, 11, 5, c); b.set(7, 3, gl); b.set(10, 3, gl);
        for (let y = 7; y < 15; y += 3) for (let x = 4 + (y % 2); x < 14; x += 4) b.set(x, y, dk(c, 0.3));
        b.set(8, 10, gl); b.set(9, 10, gl); b.set(8, 11, lt(gl, 0.4));
        return outline(b);
      });
      return sheetFrom(fr, false);
    },
    bat() {
      const fr = [0, 1, 2].map((f) => {
        const b = new Buf(14, 8), c = '#4a3e44', c2 = '#2b2733';
        rect(b, 6, 2, 7, 5, c); b.set(6, 1, c); b.set(7, 1, c); b.set(6, 3, '#e43b44'); b.set(7, 3, '#e43b44');
        if (f === 1) { rect(b, 1, 1, 5, 2, c2); rect(b, 8, 1, 12, 2, c2); b.set(0, 0, c2); b.set(13, 0, c2); }
        else { rect(b, 1, 4, 5, 5, c2); rect(b, 8, 4, 12, 5, c2); b.set(0, 6, c2); b.set(13, 6, c2); }
        return outline(b);
      });
      return sheetFrom(fr, false);
    },
    bird() {
      const fr = [0, 1, 2].map((f) => {
        const b = new Buf(16, 10), c = '#2b2733', w = '#4b4553';
        rect(b, 6, 3, 9, 7, c); rect(b, 7, 1, 8, 2, '#c8423a'); b.set(7, 0, '#eaaa3c');
        if (f !== 1) { rect(b, 1, 3, 5, 4, w); rect(b, 10, 3, 14, 4, w); b.set(0, 5, w); b.set(15, 5, w); }
        else { rect(b, 2, 1, 5, 2, w); rect(b, 10, 1, 13, 2, w); b.set(1, 0, w); b.set(14, 0, w); }
        b.set(7, 8, c); b.set(8, 8, c);
        return outline(b);
      });
      return sheetFrom(fr, false);
    },
    frog() {
      const fr = [0, 1, 2].map((f) => {
        const b = new Buf(16, 12), c = '#5a7a32', c2 = '#3a5428', y0 = f === 1 ? 1 : 0;
        rect(b, 3, 4 + y0, 12, 10, c); rect(b, 4, 3 + y0, 11, 3 + y0, c);
        rect(b, 4, 2 + y0, 5, 3 + y0, '#c8b44a'); rect(b, 10, 2 + y0, 11, 3 + y0, '#c8b44a'); b.set(5, 3 + y0, INK); b.set(10, 3 + y0, INK);
        rect(b, 5, 7 + y0, 10, 9, '#a8b45a');
        rect(b, 1, 9, 3, 11, c2); rect(b, 12, 9, 14, 11, c2);
        for (let x = 4; x < 12; x += 3) b.set(x, 5 + y0, c2);
        return outline(b);
      });
      return sheetFrom(fr, false);
    },
    mula() {
      const fr = [0, 1, 2].map((f) => {
        const b = new Buf(20, 14), c = '#3a2a24', c2 = '#2a1c18';
        rect(b, 3, 4, 15, 9, c); rect(b, 14, 2, 17, 6, c);   // corpo e pescoço (sem cabeça)
        rect(b, 1, 5, 2, 7, c2);   // rabo
        const k = f === 0 ? 0 : f === 1 ? 1 : -1;
        rect(b, 4 + k, 10, 5 + k, 13, c2); rect(b, 7 - k, 10, 8 - k, 13, c2); rect(b, 11 + k, 10, 12 + k, 13, c2); rect(b, 14 - k, 10, 15 - k, 13, c2);
        rect(b, 15, 0, 17, 1, '#f77622'); b.set(16, 0, '#f2da72'); b.set(18, 1, '#e47c2c');
        for (let x = 4; x < 15; x += 3) b.set(x, 5, lt(c, 0.2));
        return outline(b);
      });
      return sheetFrom(fr, true);
    },
    mapinguari() {
      const fr = [0, 1, 2].map((f) => {
        const b = new Buf(24, 28), c = '#5a4632', c2 = '#3a2c20';
        const l = f === 1 ? -1 : 0, r = f === 2 ? -1 : 0;
        rect(b, 6, 21, 10, 26 + l, c2); rect(b, 13, 21, 17, 26 + r, c2);
        rect(b, 4, 6, 19, 21, c); rect(b, 6, 3, 17, 5, c); rect(b, 8, 1, 15, 2, c);
        rect(b, 1, 8, 4, 20 + (f === 1 ? 1 : 0), c2); rect(b, 19, 8, 22, 20 + (f === 2 ? 1 : 0), c2);
        b.set(1, 21, '#e2dccc'); b.set(22, 21, '#e2dccc');
        rect(b, 10, 4, 13, 6, '#f2da72'); rect(b, 11, 5, 12, 5, '#c8423a');   // o olho só
        rect(b, 8, 13, 15, 17, '#3a1418'); for (let x = 8; x <= 15; x += 2) { b.set(x, 13, '#e2dccc'); b.set(x + 1, 17, '#e2dccc'); }   // a boca na barriga
        for (let y = 7; y < 21; y += 2) for (let x = 5 + (y % 4 ? 1 : 0); x < 19; x += 3) b.set(x, y, lt(c, 0.12));
        return outline(b);
      });
      return sheetFrom(fr, false);
    },
    wisp(d) { return { wisp: true, col: d.col, fw: 8, fh: 8 }; },
    serpent() { return { serpent: true, fw: 24, fh: 24 }; },
  };

  // ---------- ícones dos itens (12 x 12) ----------
  const icache = {};
  const ICO = {
    espada: ['..........ll', '.........lab', '........lab.', '.......lab..', '......lab...', '.....lab....', '..g.lab.....', '...gab......', '...wg.......', '..w..g......', '.w..........', 'w...........'],
    adaga: ['............', '............', '.........ll.', '........lab.', '.......lab..', '......lab...', '...g.lab....', '....gab.....', '....wg......', '...w..g.....', '..w.........', '............'],
    machado: ['......aab...', '.....aaab...', '.....aabw...', '......abw...', '.......w....', '......w.....', '.....w......', '....w.......', '...w........', '..w.........', '.w..........', '............'],
    maca: ['........a...', '.......aab..', '......aaabb.', '.......abb..', '......w.b...', '.....w......', '....w.......', '...w........', '..w.........', '.w..........', '............', '............'],
    montante: ['...........l', '..........lb', '.........lb.', '........lb..', '.......lb...', '......lb....', '.....lb.....', '.g..lb......', '..glb.......', '..wg........', '.w..g.......', 'w...........'],
    martelo: ['.......aa...', '......aaab..', '.....aaabb..', '......abbw..', '.......bw...', '......w.....', '.....w......', '....w.......', '...w........', '..w.........', '.w..........', '............'],
    arco: ['....ww......', '...w..s.....', '..w....s....', '..w.....s...', '.w......s...', '.w......s...', '.w......s...', '.w......s...', '..w.....s...', '..w....s....', '...w..s.....', '....ww......'],
    arco_longo: ['...ww.......', '..w..s......', '.w....s.....', '.w.....s....', 'w......s....', 'w......s....', 'w......s....', 'w......s....', '.w.....s....', '.w....s.....', '..w..s......', '...ww.......'],
    cajado: ['.........oo.', '........oaao', '........oaao', '.........aa.', '........w...', '.......w....', '......w.....', '.....w......', '....w.......', '...w........', '..w.........', '.w..........'],
    cabeca_leve: ['............', '....cccc....', '...cccccc...', '..cccccccd..', '..cc....cd..', '..c.ssss.d..', '..c.ssss.d..', '..c.ssss.d..', '..cc....cd..', '...cccccd...', '............', '............'],
    cabeca_pesada: ['............', '....aaaa....', '...alaaab...', '..alaaaabb..', '..aaaaaabb..', '..akkkkkkb..', '..aaaaaabb..', '..aaa..abb..', '..aa....bb..', '...a....b...', '............', '............'],
    corpo_leve: ['............', '..cc....cc..', '.cccc..cccc.', '.cccccccccc.', '..ccccccccd.', '...cccccdd..', '...ccccccd..', '...ddddddd..', '...cccccdd..', '...cccccdd..', '...cccccdd..', '............'],
    corpo_pesada: ['............', '..aa....aa..', '.alaa..aabb.', '.aalaaaaabb.', '..aaaaaaab..', '...aaaaabb..', '...abbbabb..', '...aaaaabb..', '...abbbbbb..', '...aaaaabb..', '....aaabb...', '............'],
    maos: ['............', '...c.c.c....', '...c.c.c.c..', '...ccccccc..', '...ccccccc..', '...ccccccd..', '...cccccdd..', '....cccdd...', '....dddd....', '....cccd....', '............', '............'],
    pes: ['............', '............', '...cc..cc...', '...cc..cc...', '...cc..cc...', '...cc..cc...', '...cc..cc...', '...ccc.ccc..', '..cccc.cccc.', '..dddd.dddd.', '............', '............'],
    anel: ['............', '............', '.....oo.....', '....oooo....', '....gggg....', '...g....g...', '..g......g..', '..g......g..', '..g......g..', '...g....g...', '....gggg....', '............'],
    amuleto: ['..g......g..', '...g....g...', '....g..g....', '.....gg.....', '.....gg.....', '....gooa....', '...goooog...', '...gooooa...', '...gooooa...', '....goog....', '.....gg.....', '............'],
    pocao: ['............', '.....ww.....', '.....ww.....', '....eeee....', '.....ee.....', '....eeee....', '...ecccce...', '..ecclccde..', '..ecccccde..', '..eccccdde..', '...edddde...', '....eeee....'],
    erva: ['............', '......c.....', '.....ccl....', '....cccl....', '...ccclc....', '...cclcc..c.', '..ccclc..cc.', '..cclcc.ccl.', '...lcc.cclc.', '....w.cclc..', '....w..w....', '....w.w.....'],
    minerio: ['............', '............', '....mmmm....', '...mmcmmn...', '..mmmmmcmn..', '..mcmmmmmn..', '.mmmmcmmmnn.', '.mmmmmmcmnn.', '.mcmmmmmmnn.', '..nnnnnnnn..', '............', '............'],
    lingote: ['............', '............', '............', '....lccc....', '...lcccccd..', '..lcccccdd..', '..cccccddd..', '..ddddddd...', '............', '............', '............', '............'],
    gema: ['............', '....llcc....', '...lccccc...', '..lccccccd..', '..cccccccd..', '...cccccd...', '....cccd....', '.....cd.....', '............', '............', '............', '............'],
    tomo: ['............', '..cccccccc..', '..cgggggcc..', '..cgccccgc..', '..cgcllcgc..', '..cgccccgc..', '..cgggggcc..', '..ccccccce..', '..ccccccce..', '..eeeeeeee..', '..wwwwwwww..', '............'],
    chave: ['............', '...gggg.....', '..g....g....', '..g.oo.g....', '..g....g....', '...gggg.....', '.....g......', '.....g......', '.....ggg....', '.....g......', '.....gg.....', '............'],
    fragmento: ['.....l......', '.....ll.....', '....lcl.....', '....lcc.....', '...lccco....', '..lccccco...', '...lccco....', '....lcc.....', '....lco.....', '.....co.....', '.....o......', '............'],
    carta: ['............', '............', '.pppppppppp.', '.pqppppppqp.', '.ppqppppqpp.', '.pppqrrqppp.', '.ppppqrpppp.', '.pppppppppp.', '.pppppppppp.', '............', '............', '............'],
    trofeu: ['............', '..gg....gg..', '..g.gggg.g..', '..g.gggg.g..', '...gggggg...', '....gggg....', '.....gg.....', '.....gg.....', '....gggg....', '...wwwwww...', '...wwwwww...', '............'],
    joia: ['............', '............', '....gggg....', '...gccccg...', '..gcclcccg..', '..gcccccdg..', '...gcccdg...', '....gccg....', '.....gg.....', '............', '............', '............'],
    peixe: ['............', '............', '............', '...ccc....d.', '..ccclcc.dd.', '.ckcccccdd..', '.ccccccccdd.', '..ccccc...d.', '...ccc......', '............', '............', '............'],
    carne: ['............', '............', '....ccc.....', '...ccccc....', '..cclccccc..', '..ccccccccc.', '..cccccccw..', '...ccccc.ww.', '.........ww.', '............', '............', '............'],
    pao: ['............', '............', '............', '....cccc....', '...cllllc...', '..cllccllc..', '..cccccccc..', '..dddddddd..', '............', '............', '............', '............'],
    cinza: ['............', '............', '.....o......', '....ooo.....', '...ccccc....', '..ccoccccc..', '..cccccocc..', '.cccocccccc.', '.dddddddddd.', '............', '............', '............'],
    cristal: ['......l.....', '.....lc.....', '.....lcc....', '....lccc....', '...lllccc...', '...lcccccd..', '...lcccccd..', '....lcccd...', '....lccd....', '.....ccd....', '......d.....', '............'],
    ouro: ['............', '............', '....gggg....', '...gllggg...', '..glggggod..', '..ggggggod..', '..gggggood..', '..ggggoood..', '...gooood...', '....dddd....', '............', '............'],
    picareta: ['..aaaa......', '.a....aa....', '......waa...', '.....w..a...', '....w....a..', '...w.....a..', '..w.........', '.w..........', 'w...........', '............', '............', '............'],
    gazua: ['............', '.......aa...', '......a..a..', '......a..a..', '.......aa...', '......a.....', '.....a......', '....a.......', '...aaa......', '...a........', '............', '............'],
    vara: ['...........w', '..........w.', '.........w.s', '........w..s', '.......w...s', '......w....s', '.....w.....s', '....w......o', '...w........', '..w.........', '.w..........', 'w...........'],
    tocha: ['....oo......', '...oyyo.....', '...oyyo.....', '....oo......', '....ww......', '....ww......', '....ww......', '....ww......', '....ww......', '....ww......', '............', '............'],
    machadinha: ['............', '......aab...', '.....aaabw..', '......abw...', '.......w....', '......w.....', '.....w......', '....w.......', '............', '............', '............', '............'],
  };
  const HERB_COL = { guaco: '#40723e', mandacaru: '#e0857a', cogumelo: '#a89cc8', musgo: '#7a8a5a', raiz_mangue: '#8a5a3a', ipe: '#e08aa9' };
  const POT_COL = { pocao_v: '#c8423a', pocao_v2: '#ff5a64', pocao_m: '#3a6ad8', pocao_s: '#64923f', pocao_f: '#e47c2c', pocao_p: '#8a858a', pocao_r: '#7cc8d0' };
  SP.icon = function (key, mat) {
    const k = key + ':' + (mat || '');
    if (icache[k]) return icache[k];
    const m = G.D.MATS[mat] || G.D.MATS.ferro;
    let shape = key, map = { a: m.col, b: m.col2, l: lt(m.col, 0.45), g: '#eaaa3c', w: '#6e4a35', s: '#e2cfa4', o: '#7cc8d0', c: m.col, d: m.col2, k: INK, e: '#cdc6bb', y: '#f2da72' };
    if (POT_COL[key]) { shape = 'pocao'; map.c = POT_COL[key]; map.d = dk(POT_COL[key], 0.35); map.l = lt(POT_COL[key], 0.5); map.e = '#b8c8d0'; map.w = '#93683f'; }
    else if (key.indexOf('erva_') === 0) { const hk = { erva_g: 'guaco', erva_c: 'mandacaru', erva_m: 'cogumelo', erva_p: 'musgo', erva_r: 'raiz_mangue', erva_i: 'ipe' }[key]; shape = 'erva'; map.c = HERB_COL[hk]; map.l = lt(map.c, 0.35); map.w = '#4a6a2a'; }
    else if (key.indexOf('min_') === 0) { shape = 'minerio'; map.m = '#676e84'; map.n = '#454a5c'; map.c = { min_f: '#c47a3e', min_p: '#e2e8f0', min_o: '#f2da72' }[key]; }
    else if (key.indexOf('ling_') === 0) { shape = 'lingote'; const c = { ling_f: '#9aa4b4', ling_p: '#e2e8f0', ling_o: '#eaaa3c' }[key]; map.c = c; map.d = dk(c); map.l = lt(c, 0.5); }
    else if (key === 'gema') { map.c = '#a8587a'; map.d = '#5e3a5c'; map.l = '#f6c4d0'; }
    else if (key === 'cristal') { map.c = '#9be7ff'; map.d = '#3a86a8'; map.l = '#ffffff'; }
    else if (key === 'tomo' || key === 'tomo_n') { shape = 'tomo'; map.c = key === 'tomo_n' ? '#2b2733' : (mat || '#5e3a5c'); map.e = '#e2cfa4'; map.l = '#f2da72'; }
    else if (key === 'fragmento') { map.c = '#c8e8ff'; map.l = '#ffffff'; map.o = '#f2da72'; }
    else if (key === 'carta') { map.p = '#e2cfa4'; map.q = '#b8a080'; map.r = '#c8423a'; }
    else if (key === 'joia') { map.c = '#3a86a8'; map.d = '#2a4a6e'; map.l = '#bfe8f0'; }
    else if (key === 'peixe' || key === 'peixe_a') { shape = 'peixe'; map.c = key === 'peixe' ? '#8a9ab0' : '#c47a3e'; map.l = lt(map.c, 0.4); map.d = dk(map.c); }
    else if (key === 'carne' || key === 'carne_a') { shape = 'carne'; map.c = key === 'carne' ? '#c8423a' : '#8a4a2a'; map.l = lt(map.c, 0.35); map.w = '#e2dccc'; }
    else if (key === 'pao') { map.c = '#c8a050'; map.l = '#eac878'; map.d = '#8a6430'; }
    else if (key === 'cinza') { map.c = '#5a5662'; map.d = '#3a3640'; map.o = '#f2da72'; }
    else if (key === 'ouro') { map.d = '#8a6420'; map.o = '#c48a2c'; map.l = '#fff0a0'; }
    else if (key === 'arco_q') shape = 'arco';
    else if (key.indexOf('_leve') > 0 || key === 'maos' || key === 'pes') { map.c = m.col; map.d = m.col2; map.s = '#1f1a24'; }
    if (key === 'maos' || key === 'pes') { map.c = m.col; map.d = m.col2; }
    const r = ICO[shape] || ICO.joia;
    const b = rows(r, map, 1);
    outline(b);
    return (icache[k] = A.polishWith(() => b.canvas()));
  };
  SP.itemIcon = function (it) {
    if (!it) return null;
    const D = G.D;
    if (it.base) {
      if (D.WEAPONS[it.base]) return SP.icon(it.base, it.mat);
      const ar = D.ARMORS[it.base];
      if (ar.jewel) return SP.icon(it.base, it.mat);
      if (ar.slot === 'maos' || ar.slot === 'pes') return SP.icon(ar.slot, it.mat);
      return SP.icon(it.base, it.mat);
    }
    const s = D.STACK[it.id];
    if (it.id === 'tomo') return SP.icon('tomo', G.D.SPELLS[it.spell] ? ({ destruicao: '#a8482c', restauracao: '#c8a050', conjuracao: '#5e3a5c' })[G.D.SPELLS[it.spell].school] : null);
    return SP.icon(s ? s.ic : 'joia');
  };

  // ---------- prédios das cidades ----------
  const ROOF = {
    madeira: { kind: 'thatch' },
    mata: { kind: 'shingle', cols: ['#1d3a2c', '#28503a', '#3a6a3c', '#5e8a40', '#8cb05a'] },
    pedra: { kind: 'shingle', cols: ['#22202a', '#3a3a48', '#545668', '#727690', '#9aa0b4'] },
    barro: { kind: 'shingle', cols: ['#4a1e18', '#7a3424', '#a8482c', '#c8643a', '#e08a5a'] },
    capital: { kind: 'shingle', cols: ['#16243a', '#22385a', '#2e4c7a', '#40669a', '#6a90c0'] },
    palafita: { kind: 'thatch' },
  };
  function wallFill(b, style, x0, y0, x1, y1) {
    if (style === 'pedra' || style === 'capital') {
      for (let y = y0; y <= y1; y++) {
        const row = Math.floor((y - y0) / 3), off = row % 2 ? 3 : 0;
        for (let x = x0; x <= x1; x++) {
          const j = (y - y0) % 3 === 2 || (x + off) % 6 === 0;
          const base = style === 'capital' ? ['#a8a49c', '#d8d0c0', '#ece4d4'] : ['#3a4466', '#5a6988', '#7a86a0'];
          b.set(x, y, j ? base[0] : G.hash2(Math.floor((x + off) / 6), row, 3) < 0.4 ? base[1] : base[2]);
          if (x === x0 || x === x1) b.set(x, y, base[0]);
        }
      }
    } else if (style === 'barro') {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const h = G.hash2(x, y, 11);
        b.set(x, y, x === x0 || x === x1 ? '#8a5a30' : h < 0.12 ? '#b07a44' : h > 0.92 ? '#e2b47a' : '#cc985a');
      }
    } else H.plankWall(b, x0, y0, x1, y1);
  }
  const SIGN = {
    ferreiro: ['..kkkkk..', '.kaaaaak.', 'kaaaaaaak', '...kak...', '..kaaak..'],
    alquimista: ['...kkk...', '...krk...', '..krrrk..', '.krrrrrk.', '..kkkkk..'],
    mercado: ['..kk.kk..', '.kgggggk.', '.kgggggk.', '.kgggggk.', '..kkkkk..'],
    mago: ['....k....', '...kyk...', 'kkkyyykkk', '..kyyyk..', '.kyk.kyk.'],
    estalagem: ['.kkkkk...', '.kwwwkkk.', '.kwwwk.k.', '.kwwwkkk.', '.kkkkk...'],
    quadro: ['.........', '.........', '.........', '.........', '.........'],
  };
  SP.building = function (kind, style, w, h) {
    // w, h em tiles; o sprite tem w*16 por h*16 + 8 (o telhado passa do topo)
    const W = w * 16, Hh = h * 16 + 8, b = new Buf(W, Hh);
    const wallTop = Math.round(Hh * 0.5), base = Hh - 2;
    wallFill(b, style, 2, wallTop, W - 3, base);
    rect(b, 2, base + 1, W - 3, base + 1, '#2b2733');
    if (style === 'palafita') { for (let x = 4; x < W - 3; x += 8) rect(b, x, base - 2, x + 1, base + 1, '#4e2e22'); }
    // telhado
    const R = ROOF[style] || ROOF.madeira, cx = Math.floor(W / 2);
    if (R.kind === 'thatch') H.thatch(b, cx, 2, wallTop + 1, Math.round(W * 0.22), Math.floor(W / 2) - 1, w * 7 + h);
    else H.shingles(b, cx, 2, wallTop + 1, Math.round(W * 0.22), Math.floor(W / 2) - 1, R.cols);
    // porta e janelas
    const dw = kind === 'templo' ? 8 : 6, dx0 = cx - dw / 2, dy0 = base - 11;
    H.door(b, dx0, dy0, dx0 + dw - 1, base, true);
    if (kind === 'templo') rect(b, dx0 + 1, dy0 + 1, dx0 + dw - 2, base, '#3a2428');
    for (let x = 6; x < W - 8; x += 12) if (Math.abs(x + 1 - cx) > dw) H.windowAt(b, x, wallTop + 6, 4, 4);
    // à noite as janelas acendem (guardamos onde ficam)
    // placa
    const sg = SIGN[kind];
    if (sg && kind !== 'quadro') {
      const map = { k: INK, a: '#9aa4b4', r: '#c8423a', g: '#eaaa3c', y: '#f2da72', w: '#d0a46a' };
      const sx = dx0 + dw + 2, sy = dy0 - 2;
      rect(b, sx - 1, sy - 1, sx + 9, sy + 5, '#d0a46a'); rect(b, sx - 1, sy - 1, sx + 9, sy - 1, '#6e4a35');
      sg.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (map[r[x]]) b.set(sx + x, sy + y, map[r[x]]); });
    }
    if (kind === 'templo') {   // a estrela da Sina no alto
      const sx = cx, sy = wallTop - 6;
      [[0, -2], [0, -1], [-1, 0], [0, 0], [1, 0], [0, 1], [-2, 0], [2, 0], [0, 2]].forEach(([x, y]) => b.set(sx + x, sy + y, '#f2da72'));
    }
    if (kind === 'ferreiro') { rect(b, W - 10, 0, W - 6, wallTop - 2, '#4b4553'); rect(b, W - 10, 0, W - 6, 0, '#2b2733'); }
    return A.polishWith(() => b.canvas());
  };

  // ---------- coisas do mundo ----------
  const ocache = {};
  function once(k, fn) { return ocache[k] || (ocache[k] = A.polishWith(fn)); }
  SP.chest = (open, rare) => once('chest' + open + rare, () => {
    const b = new Buf(14, 12), w = rare ? '#5e3a5c' : '#93683f', w2 = rare ? '#3a2448' : '#6e4a35', g = '#eaaa3c';
    if (!open) { rect(b, 1, 2, 12, 5, w); rect(b, 2, 1, 11, 1, w); rect(b, 1, 6, 12, 10, w2); rect(b, 1, 5, 12, 5, g); rect(b, 6, 4, 7, 7, g); b.set(6, 6, INK); }
    else { rect(b, 1, 0, 12, 2, dk(w)); rect(b, 1, 3, 12, 5, '#2b1d1a'); rect(b, 3, 4, 10, 5, g); b.set(5, 4, '#fff0a0'); rect(b, 1, 6, 12, 10, w2); rect(b, 1, 6, 12, 6, g); }
    return outline(b).canvas();
  });
  SP.urn = (broken) => once('urn' + broken, () => {
    const b = new Buf(10, 12), c = '#a8643a', c2 = '#7a4428';
    if (!broken) { rect(b, 3, 1, 6, 1, c2); rect(b, 2, 2, 7, 3, c); rect(b, 1, 4, 8, 8, c); rect(b, 2, 9, 7, 10, c2); rect(b, 2, 5, 7, 5, '#e2cfa4'); }
    else { rect(b, 1, 8, 3, 10, c); rect(b, 5, 9, 8, 10, c2); b.set(4, 7, c); }
    return outline(b).canvas();
  });
  SP.herb = (id) => once('herb' + id, () => {
    const c = HERB_COL[id] || '#40723e', b = new Buf(12, 10);
    if (id === 'cogumelo') { rect(b, 2, 3, 5, 4, c); rect(b, 3, 5, 4, 7, '#e2dccc'); rect(b, 6, 4, 9, 5, c); rect(b, 7, 6, 8, 8, '#e2dccc'); b.set(3, 3, lt(c, 0.5)); }
    else if (id === 'mandacaru' || id === 'ipe') { rect(b, 5, 4, 6, 9, '#40723e'); [[5, 1], [3, 3], [8, 3], [5, 5]].forEach(([x, y]) => { rect(b, x, y, x + 1, y + 1, c); b.set(x, y, lt(c, 0.5)); }); }
    else { for (let i = 0; i < 5; i++) { const x = 1 + i * 2; rect(b, x, 3 + (i % 2) * 2, x + 1, 9, i % 2 ? c : dk(c, 0.2)); b.set(x, 3 + (i % 2) * 2, lt(c, 0.4)); } }
    return outline(b).canvas();
  });
  SP.ore = (kind) => once('ore' + kind, () => {
    const b = new Buf(16, 12), sp = { ferro: '#c47a3e', prata: '#e2e8f0', ouro: '#f2da72', gema: '#e08aa9' }[kind] || '#c47a3e';
    rect(b, 2, 4, 13, 10, '#5a5662'); rect(b, 4, 2, 11, 3, '#6e6a74'); rect(b, 3, 3, 12, 4, '#6e6a74'); rect(b, 2, 10, 13, 10, '#3a3640');
    [[4, 5], [7, 3], [10, 6], [6, 8], [11, 9], [3, 8], [9, 4]].forEach(([x, y]) => { b.set(x, y, sp); b.set(x + 1, y, dk(sp, 0.2)); });
    return outline(b).canvas();
  });
  SP.marco = () => once('marco', () => {
    const b = new Buf(12, 30);
    rect(b, 3, 8, 8, 26, '#6d6672'); rect(b, 4, 6, 7, 7, '#6d6672'); rect(b, 5, 4, 6, 5, '#6d6672'); for (let y = 8; y < 26; y++) b.set(8, y, '#4b4553');
    rect(b, 1, 26, 10, 28, '#4b4553');
    for (let y = 10; y < 24; y += 3) b.set(5, y, '#7cc8d0');
    [[5, 0], [6, 0], [4, 1], [7, 1], [5, 2], [6, 2], [5, 1], [6, 1]].forEach(([x, y]) => b.set(x, y, '#f2da72'));
    return outline(b).canvas();
  });
  SP.quadro = () => once('quadro', () => {
    const b = new Buf(18, 18);
    rect(b, 2, 12, 3, 17, '#6e4a35'); rect(b, 14, 12, 15, 17, '#6e4a35');
    rect(b, 0, 1, 17, 12, '#93683f'); rect(b, 1, 2, 16, 11, '#b88a5a');
    [[2, 3, 6, 6], [8, 3, 12, 7], [3, 8, 7, 10], [10, 8, 15, 10]].forEach(([x0, y0, x1, y1]) => rect(b, x0, y0, x1, y1, '#e2cfa4'));
    b.set(4, 3, '#c8423a'); b.set(10, 3, '#c8423a'); b.set(5, 8, '#c8423a'); b.set(12, 8, '#c8423a');
    return outline(b).canvas();
  });
  SP.poco = () => once('poco', () => {
    const b = new Buf(20, 22);
    rect(b, 2, 10, 17, 19, '#6d6672'); rect(b, 4, 10, 15, 12, '#22413a'); for (let x = 2; x <= 17; x += 3) b.set(x, 15, '#4b4553');
    rect(b, 3, 1, 4, 10, '#6e4a35'); rect(b, 15, 1, 16, 10, '#6e4a35'); rect(b, 1, 0, 18, 2, '#93683f'); rect(b, 9, 3, 10, 7, '#cdc6bb');
    return outline(b).canvas();
  });
  SP.lamp = () => once('lamp', () => {
    const b = new Buf(8, 26);
    rect(b, 3, 6, 4, 24, '#2b2733'); rect(b, 1, 24, 6, 25, '#2b2733');
    rect(b, 1, 1, 6, 5, '#2b2733'); rect(b, 2, 2, 5, 4, '#f2da72'); b.set(3, 0, '#2b2733'); b.set(4, 0, '#2b2733');
    return outline(b).canvas();
  });
  SP.barril = () => once('barril', () => {
    const b = new Buf(10, 12);
    rect(b, 1, 1, 8, 10, '#93683f'); rect(b, 1, 3, 8, 3, '#4b4553'); rect(b, 1, 8, 8, 8, '#4b4553'); for (let y = 1; y < 11; y++) b.set(4, y, '#6e4a35'); rect(b, 2, 0, 7, 0, '#6e4a35');
    return outline(b).canvas();
  });
  SP.caixa = () => once('caixa', () => {
    const b = new Buf(12, 11);
    rect(b, 1, 1, 10, 9, '#b88a5a'); rect(b, 1, 1, 10, 1, '#d0a46a'); for (let i = 1; i < 10; i++) { b.set(i, i, '#6e4a35'); b.set(i + 1, i, '#6e4a35'); }
    rect(b, 1, 9, 10, 9, '#6e4a35');
    return outline(b).canvas();
  });
  SP.banca = (col) => once('banca' + col, () => {
    const b = new Buf(32, 26), c = col || '#c8423a';
    rect(b, 2, 4, 3, 24, '#6e4a35'); rect(b, 28, 4, 29, 24, '#6e4a35');
    for (let x = 0; x < 32; x++) for (let y = 0; y < 6; y++) b.set(x, y, Math.floor(x / 4) % 2 ? c : '#e2cfa4');
    for (let x = 0; x < 32; x += 4) b.set(x + 1, 6, Math.floor(x / 4) % 2 ? c : '#e2cfa4');
    rect(b, 1, 15, 30, 19, '#93683f'); rect(b, 1, 15, 30, 15, '#d0a46a');
    [[5, '#c8423a'], [10, '#eaaa3c'], [15, '#64923f'], [20, '#e08aa9'], [25, '#c47a3e']].forEach(([x, cc]) => rect(b, x, 12, x + 3, 14, cc));
    return outline(b).canvas();
  });
  // entradas de masmorra
  SP.entrance = (theme) => once('ent' + theme, () => {
    const b = new Buf(36, 30);
    if (theme === 'cripta' || theme === 'catacumba' || theme === 'ruina') {
      const st = theme === 'ruina' ? ['#8a6a44', '#b09060', '#cdb07a'] : ['#4b4553', '#6d6672', '#938a8c'];
      rect(b, 2, 6, 33, 28, st[1]); for (let y = 6; y < 28; y += 4) rect(b, 2, y, 33, y, st[0]); for (let x = 2; x < 34; x += 6) rect(b, x, 6, x, 28, st[0]);
      rect(b, 0, 2, 35, 6, st[2]); rect(b, 4, 0, 31, 2, st[2]);
      rect(b, 11, 12, 24, 28, '#120e16'); rect(b, 12, 10, 23, 11, '#120e16'); rect(b, 14, 9, 21, 9, '#120e16');
      rect(b, 8, 10, 10, 28, st[2]); rect(b, 25, 10, 27, 28, st[2]);
      [[17, 3], [18, 3], [16, 4], [19, 4], [17, 5], [18, 5]].forEach(([x, y]) => b.set(x, y, '#c8423a'));
    } else if (theme === 'mina') {
      for (let y = 4; y < 30; y++) for (let x = 0; x < 36; x++) { const dx = (x - 18) / 18, dy = (y - 30) / 26; if (dx * dx + dy * dy < 1) b.set(x, y, G.hash2(x, y, 5) < 0.3 ? '#5a5662' : '#6e6a74'); }
      rect(b, 10, 10, 25, 29, '#120e16'); rect(b, 8, 8, 10, 29, '#93683f'); rect(b, 25, 8, 27, 29, '#93683f'); rect(b, 7, 7, 28, 9, '#6e4a35');
      rect(b, 12, 26, 23, 26, '#4b4553'); rect(b, 12, 28, 23, 28, '#4b4553');
    } else if (theme === 'navio') {
      rect(b, 2, 14, 33, 26, '#4e2e22'); for (let y = 14; y < 26; y += 3) rect(b, 2, y, 33, y, '#733e39');
      rect(b, 16, 0, 17, 14, '#6e4a35'); rect(b, 8, 2, 16, 10, '#cdc6bb'); rect(b, 12, 18, 21, 26, '#120e16');
      rect(b, 0, 26, 35, 29, '#2a4a6e');
    } else if (theme === 'fogo') {
      for (let y = 4; y < 30; y++) for (let x = 0; x < 36; x++) { const dx = (x - 18) / 18, dy = (y - 30) / 26; if (dx * dx + dy * dy < 1) b.set(x, y, G.hash2(x, y, 6) < 0.25 ? '#2a1c24' : '#3a2a30'); }
      rect(b, 11, 12, 24, 29, '#e47c2c'); rect(b, 13, 14, 22, 29, '#f2da72'); rect(b, 15, 18, 20, 29, '#fff0a0');
    } else {   // caverna, raiz, gelo, covil
      const c = theme === 'gelo' ? ['#8c98ae', '#c6cfdc', '#f2f5fa'] : theme === 'raiz' ? ['#3a2a1c', '#5e4228', '#2c573d'] : ['#454a5c', '#676e84', '#8f98ac'];
      for (let y = 4; y < 30; y++) for (let x = 0; x < 36; x++) { const dx = (x - 18) / 18, dy = (y - 30) / 26; if (dx * dx + dy * dy < 1) b.set(x, y, G.hash2(x, y, 7) < 0.3 ? c[0] : G.hash2(x, y, 8) < 0.2 ? c[2] : c[1]); }
      for (let y = 12; y < 30; y++) for (let x = 0; x < 36; x++) { const dx = (x - 18) / 8, dy = (y - 30) / 17; if (dx * dx + dy * dy < 1) b.set(x, y, '#120e16'); }
      if (theme === 'covil') [[10, 26], [24, 27], [14, 28]].forEach(([x, y]) => rect(b, x, y, x + 2, y, '#e2dccc'));
      if (theme === 'raiz') for (let i = 0; i < 6; i++) H.line(b, 4 + i * 5, 4, 8 + i * 4, 14, '#6e4a35');
    }
    return outline(b).canvas();
  });
  SP.stairs = (down) => once('stairs' + down, () => {
    const b = new Buf(16, 16);
    for (let i = 0; i < 5; i++) rect(b, 1 + i, 2 + i * 3, 14 - i, 3 + i * 3, down ? mix('#8a858a', '#120e16', i / 5) : mix('#4b4553', '#cdc6bb', i / 5));
    return outline(b).canvas();
  });
  SP.altarSina = () => once('altarSina', () => {
    const b = new Buf(28, 26);
    rect(b, 2, 16, 25, 24, '#4b4553'); rect(b, 4, 14, 23, 16, '#6d6672'); rect(b, 2, 24, 25, 25, '#2b2733');
    for (let i = 0; i < 5; i++) { const x = 5 + i * 4; rect(b, x, 8, x + 1, 13, '#6d6672'); b.set(x, 6, '#9be7ff'); b.set(x + 1, 6, '#ffffff'); b.set(x, 7, '#9be7ff'); }
    return outline(b).canvas();
  });
  SP.bones = () => once('bones', () => rows(['..e.....e.', '.eee..eee.', '..eeeeee..', '.ee....ee.'], { e: '#cdc6bb' }).canvas());
  SP.pillar = (c) => once('pillar' + c, () => {
    const b = new Buf(14, 30), s = c || '#6d6672';
    rect(b, 1, 0, 12, 3, lt(s, 0.2)); rect(b, 3, 4, 10, 25, s); for (let y = 4; y < 26; y++) { b.set(3, y, lt(s, 0.25)); b.set(10, y, dk(s, 0.3)); }
    rect(b, 1, 26, 12, 29, dk(s, 0.15));
    return outline(b).canvas();
  });
  SP.brazier = () => once('brazier', () => {
    const b = new Buf(12, 14);
    rect(b, 1, 4, 10, 7, '#4b4553'); rect(b, 4, 8, 7, 11, '#2b2733'); rect(b, 2, 12, 9, 13, '#2b2733'); rect(b, 2, 4, 9, 4, '#6d6672');
    return outline(b).canvas();
  });
  SP.web = () => once('web', () => {
    const b = new Buf(16, 16), c = 'rgba(230,230,240,0.7)';
    for (let i = 0; i < 16; i++) { b.set(i, i, '#cdc6bb'); b.set(15 - i, i, '#cdc6bb'); b.set(8, i, '#cdc6bb'); b.set(i, 8, '#cdc6bb'); }
    return b.canvas();
  });
  SP.coin = () => once('coin', () => rows(['.gg.', 'glgg', 'gggd', '.dd.'], { g: '#eaaa3c', l: '#fff0a0', d: '#8a6420' }).canvas());
  SP.bag = () => once('bag', () => outline(rows(['..ww..', '.cddc.', 'cccccc', 'cclccc', 'cccccd', '.dddd.'], { w: '#6e4a35', c: '#b88a5a', d: '#93683f', l: '#d0a46a' }, 1)).canvas());
  SP.campfire = () => G.Art.spr.fire;

  // ---------- chão de masmorra (por tema) ----------
  SP.THEMES = {
    cripta: { floor: ['#3a3a48', '#45465a', '#52546a'], wall: ['#22202a', '#4b4553', '#6d6672'], fog: 0.9, accent: '#c8423a' },
    catacumba: { floor: ['#4a4440', '#5a544e', '#686058'], wall: ['#2a2420', '#6e665c', '#8a8274'], fog: 0.9, accent: '#b55088' },
    caverna: { floor: ['#4a3e34', '#57493c', '#635444'], wall: ['#241c18', '#4a3a2e', '#6a5440'], fog: 0.88, accent: '#c47a3e' },
    mina: { floor: ['#4a3e34', '#5a4a3a', '#6a5644'], wall: ['#241c18', '#4e4040', '#6e5e54'], fog: 0.86, accent: '#eaaa3c' },
    raiz: { floor: ['#2e3a24', '#3a4a2c', '#465834'], wall: ['#16200e', '#3a2a1c', '#5e4228'], fog: 0.86, accent: '#9fe0a0' },
    gelo: { floor: ['#8090a8', '#94a4bc', '#a8b8d0'], wall: ['#3a4458', '#8c98ae', '#c6cfdc'], fog: 0.75, accent: '#9be7ff' },
    ruina: { floor: ['#8a6a44', '#9a7a50', '#aa8a5c'], wall: ['#3a2a1c', '#8a6a44', '#b09060'], fog: 0.8, accent: '#e47c2c' },
    navio: { floor: ['#5a3a28', '#6a4430', '#7a5038'], wall: ['#1e1410', '#4e2e22', '#733e39'], fog: 0.85, accent: '#7cc8d0' },
    covil: { floor: ['#4a4030', '#584c38', '#665840'], wall: ['#201a14', '#4a3e2e', '#6a5a44'], fog: 0.9, accent: '#c8423a' },
    fogo: { floor: ['#2a1c24', '#33232a', '#3e2a30'], wall: ['#120a10', '#3a2a30', '#5a3a3a'], fog: 0.7, accent: '#f77622', lava: true },
  };
})(globalThis.G = globalThis.G || {});
