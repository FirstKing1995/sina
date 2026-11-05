/* SINA · desenho: chão em pedaços guardados (com as cores de terreno do Gods), objetos e criaturas ordenados pela
   altura, golpes, projéteis, avisos no chão, luz do dia e da noite, tochas, clima e o mapa de névoa. */
(function (G) {
  'use strict';
  const D = G.D, Gm = G.Game, S = Gm.S, W = G.World, T = W.T, A = G.Art, SP = G.Spr, Dg = G.Dungeon;
  const R = G.Render = {};
  const TS = 16, CH = 32;
  let cv, cx, Z = 3, VW = 0, VH = 0, light, lx;
  const cam = { x: 0, y: 0 };
  R.cam = cam;
  const chunks = new Map();
  let dgCanvas = null, dgKey = '';
  R.heroDirty = true;
  let heroSheet = null;
  const sheets = new Map();

  R.init = function () {
    cv = document.getElementById('view'); cx = cv.getContext('2d');
    light = document.createElement('canvas'); lx = light.getContext('2d');
    R.resize(); addEventListener('resize', R.resize);
  };
  R.resize = function () {
    const dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.floor(innerWidth * dpr); cv.height = Math.floor(innerHeight * dpr);
    cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
    const target = innerWidth < 700 ? 15 : 26;   // quantos tiles de largura
    Z = Math.max(2, Math.round(cv.width / (target * TS)));
    VW = Math.ceil(cv.width / Z); VH = Math.ceil(cv.height / Z);
    light.width = Math.ceil(VW / 2); light.height = Math.ceil(VH / 2);
    R.Z = Z; R.VW = VW; R.VH = VH;
  };
  R.invalidate = function () { chunks.clear(); dgKey = ''; };
  R.toWorld = function (sx, sy) { const dpr = cv.width / innerWidth; return [(sx * dpr / Z + cam.x) / TS, (sy * dpr / Z + cam.y) / TS]; };

  // ---------- cores do chão ----------
  const GODS_REG = { campo: 0, mata: 5, litoral: 1, serra: 3, mangue: 2, sertao: 4, pantano: 6 };
  const EXTRA = {
    [T.ROAD]: ['#7a5e3c', '#8e6e48', '#a68558'], [T.PAVE]: ['#55515a', '#6e6a72', '#8a868c'], [T.WALL]: ['#3a3640', '#6d6672', '#938a8c'],
    [T.ASH]: ['#2a2428', '#36302f', '#463c38'], [T.LAVA]: ['#c8423a', '#f77622', '#f2da72'], [T.SNOW]: ['#b8c2d4', '#d6dde8', '#eef2f8'],
    [T.BOARD]: ['#5e3e28', '#7a5034', '#946644'], [T.MUD]: ['#4a4030', '#584c38', '#665840'], [T.VEU]: ['#3a1e1c', '#5a2a22', '#8a3a24'], [T.FLOWER]: null,
  };
  const WATER = { [T.DEEP]: ['#24425c', '#2c4e6a', '#386078'], [T.SHALLOW]: ['#3a6878', '#457888', '#5e92a0'], [T.RIVER]: ['#3a6878', '#457888', '#5e92a0'] };
  function tones(t, rg) {
    if (EXTRA[t]) return EXTRA[t];
    if (WATER[t] && rg !== 'mangue' && rg !== 'pantano') return WATER[t];
    const base = t === T.FLOWER ? T.GRASS : t;
    const gi = GODS_REG[rg];
    const reg = gi != null && A.REGION_TERRAIN[0][gi] && A.REGION_TERRAIN[0][gi][base];
    if (rg === 'cratera') return EXTRA[T.ASH];
    return reg || A.TERRAIN[0][base] || A.TERRAIN[0][4];
  }
  const hexCache = {};
  function rgb(h) { if (hexCache[h]) return hexCache[h]; const n = parseInt(h.slice(1), 16); return (hexCache[h] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]); }
  const FLOWERS = ['#e0857a', '#f2da72', '#e2cfa4', '#a8587a', '#e08aa9'];
  function bakeChunk(ci, cj) {
    const w = S.world, N = w.N;
    const c = document.createElement('canvas'); c.width = CH * TS; c.height = CH * TS;
    const x = c.getContext('2d'), img = x.createImageData(c.width, c.height), d = img.data;
    const nz = R.nz || (R.nz = new G.Simplex(77));
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
      const gx = ci * CH + tx, gy = cj * CH + ty; if (gx >= N || gy >= N) continue;
      const i = gy * N + gx, t = w.tile[i], rg = D.REGION_ORDER[w.reg[i]];
      const tn = tones(t, rg).map(rgb);
      const isW = t === T.DEEP || t === T.SHALLOW || t === T.RIVER;
      // vizinhos (para a beira)
      const nb = (dx, dy) => { const xx = gx + dx, yy = gy + dy; return xx < 0 || yy < 0 || xx >= N || yy >= N ? t : w.tile[yy * N + xx]; };
      const wN = nb(0, -1), wS = nb(0, 1), wE = nb(1, 0), wWst = nb(-1, 0);
      const watery = (q) => q === T.DEEP || q === T.SHALLOW || q === T.RIVER;
      for (let py = 0; py < TS; py++) for (let px = 0; px < TS; px++) {
        const wx = gx * TS + px, wy = gy * TS + py;
        const h = G.hash2(wx, wy, 13), lo = nz.noise(wx * 0.025, wy * 0.025) + (h - 0.5) * 0.5;
        let k = lo > 0.62 ? 2 : lo < -0.62 ? 0 : 1;
        if (h < 0.06) k = Math.max(0, k - 1); else if (h > 0.95) k = Math.min(2, k + 1);
        let col = tn[k];
        if (t === T.PAVE || t === T.WALL) { const sx = (px + (Math.floor(py / 4) % 2) * 2) % 4, sy = py % 4; if (sx === 0 || sy === 0) col = tn[0]; else if (sx === 1 && sy === 1) col = tn[2]; }
        if (t === T.WALL) { if (py < 5) col = sy0(py) ? tn[2] : tn[1]; else if (py === 5) col = [40, 34, 46]; }
        if (t === T.BOARD) { col = py % 4 === 0 ? tn[0] : (px + Math.floor(py / 4) * 5) % 9 === 0 ? tn[0] : tn[1 + (h > 0.7 ? 1 : 0)]; }
        if (t === T.ROAD && h > 0.97) col = [180, 160, 130];
        if (t === T.FLOWER && h > 0.965) col = rgb(FLOWERS[Math.floor(h * 1000) % 5]);
        if (t === T.LAVA) { const f = nz.noise(wx * 0.15, wy * 0.15); col = f > 0.3 ? tn[2] : f > -0.2 ? tn[1] : tn[0]; }
        if (t === T.VEU) col = tn[(px + py + gx) % 3];
        if (isW) {
          const wave = Math.sin((wx + wy * 0.5) * 0.4 + lo * 3) > 0.92;
          if (wave) col = tn[2];
          // espuma na beira
          if ((py < 2 && !watery(wN)) || (py > 13 && !watery(wS)) || (px > 13 && !watery(wE)) || (px < 2 && !watery(wWst))) col = h > 0.4 ? [190, 210, 200] : tn[2];
        } else if (t !== T.WALL && t !== T.PAVE && t !== T.BOARD) {
          // areia molhada ao lado da água
          if ((py < 2 && watery(wN)) || (py > 13 && watery(wS)) || (px > 13 && watery(wE)) || (px < 2 && watery(wWst))) col = mixC(col, [70, 60, 40], 0.25);
          // a estrada se desfaz no capim
          if (t === T.ROAD) { const edge = (py < 2 && wN !== T.ROAD) || (py > 13 && wS !== T.ROAD) || (px > 13 && wE !== T.ROAD) || (px < 2 && wWst !== T.ROAD); if (edge && h < 0.5) col = rgb(tones(wN !== T.ROAD ? wN : wS !== T.ROAD ? wS : wE !== T.ROAD ? wE : wWst, rg)[1]); }
        }
        const o = (ty * TS + py) * c.width * 4 + (tx * TS + px) * 4;
        d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    // detalhes por cima: tufos de capim
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
      const gx = ci * CH + tx, gy = cj * CH + ty; if (gx >= N || gy >= N) continue;
      const t = w.tile[gy * N + gx];
      if ((t === T.GRASS || t === T.FOREST || t === T.FLOWER) && G.hash2(gx, gy, 5) < 0.18 && w.grid[gy * N + gx] < 0) {
        const rg = D.REGION_ORDER[w.reg[gy * N + gx]], tn = tones(t, rg);
        const px = tx * TS + 3 + Math.floor(G.hash2(gx, gy, 6) * 9), py = ty * TS + 6 + Math.floor(G.hash2(gx, gy, 7) * 7);
        x.fillStyle = tn[2]; x.fillRect(px, py, 1, 2); x.fillRect(px + 2, py - 1, 1, 3); x.fillRect(px + 4, py + 1, 1, 1);
        x.fillStyle = tn[0]; x.fillRect(px + 1, py + 2, 3, 1);
      }
    }
    return c;
  }
  function sy0(py) { return py < 2; }
  function mixC(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function chunk(ci, cj) {
    const k = ci + ',' + cj;
    let c = chunks.get(k);
    if (!c) { c = bakeChunk(ci, cj); chunks.set(k, c); if (chunks.size > 20) chunks.delete(chunks.keys().next().value); }
    else { chunks.delete(k); chunks.set(k, c); }
    return c;
  }

  // ---------- chão de masmorra ----------
  function bakeDungeon(m) {
    const th = SP.THEMES[m.theme], N = m.N;
    const c = document.createElement('canvas'); c.width = N * TS; c.height = N * TS + 16;
    const x = c.getContext('2d'), img = x.createImageData(c.width, c.height), d = img.data;
    const fl = th.floor.map(rgb), wl = th.wall.map(rgb);
    for (let ty = 0; ty < N; ty++) for (let tx = 0; tx < N; tx++) {
      const t = m.tile[ty * N + tx], below = ty + 1 < N ? m.tile[(ty + 1) * N + tx] : 0;
      for (let py = 0; py < TS; py++) for (let px = 0; px < TS; px++) {
        const wx = tx * TS + px, wy = ty * TS + py, h = G.hash2(wx, wy, 21);
        let col;
        if (t === Dg.FLOOR || t === Dg.WATER) {
          const sx = (wx + (Math.floor(wy / 8) % 2) * 4) % 8, sy = wy % 8;
          col = sx === 0 || sy === 0 ? fl[0] : h < 0.1 ? fl[0] : h > 0.9 ? fl[2] : fl[1];
          if (G.hash2(Math.floor((wx + (Math.floor(wy / 8) % 2) * 4) / 8), Math.floor(wy / 8), 3) < 0.25 && sx && sy) col = mixC(col, fl[0], 0.5);
          if (t === Dg.WATER) col = mixC(col, [40, 80, 110], 0.65);
        } else if (t === Dg.LAVA) { const f = Math.sin(wx * 0.3 + wy * 0.2) + h; col = f > 1.2 ? [242, 218, 114] : f > 0.3 ? [247, 118, 34] : [200, 66, 58]; }
        else if (below === Dg.FLOOR || below === Dg.WATER || below === Dg.LAVA) {
          // a face da parede, de frente
          const bx = (px + (Math.floor(py / 4) % 2) * 3) % 6, by = py % 4;
          col = py < 3 ? wl[2] : bx === 0 || by === 0 ? wl[0] : h < 0.15 ? mixC(wl[1], wl[0], 0.4) : wl[1];
          if (py >= 14) col = mixC(wl[0], [0, 0, 0], 0.4);
        } else col = h < 0.15 ? mixC(wl[0], [0, 0, 0], 0.3) : wl[0];
        const o = (wy * c.width + wx) * 4;
        d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    // coisas chatas no chão
    for (const o of m.objs) {
      if (o.gone) continue;
      if (o.k === 'stairsDown' || o.k === 'stairsUp') x.drawImage(SP.stairs(o.k === 'stairsDown'), o.x * TS, o.y * TS);
      if (o.k === 'bones') x.drawImage(SP.bones(), o.x * TS + 3, o.y * TS + 6);
      if (o.k === 'web') x.drawImage(SP.web(), o.x * TS, o.y * TS);
    }
    return c;
  }

  // ---------- folhas de sprite ----------
  function sheetFor(e) {
    if (e.kind === 'npc') { let s = sheets.get('n' + e.id); if (!s) { s = SP.personSheet(e.look); sheets.set('n' + e.id, s); if (sheets.size > 300) sheets.clear(); } return s; }
    return SP.monster(e.mon);
  }
  function heroSheetGet() {
    if (R.heroDirty || !heroSheet) { heroSheet = SP.personSheet(SP.heroLook(S.P)); R.heroDirty = false; }
    return heroSheet;
  }
  R.heroPortrait = function () { return heroSheetGet(); };

  // ---------- o quadro ----------
  let T0 = 0;
  R.frame = function (dt) {
    T0 += dt;
    const P = S.P;
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.imageSmoothingEnabled = false;
    cx.fillStyle = '#0c0a10'; cx.fillRect(0, 0, cv.width, cv.height);
    if (!P || S.mode !== 'play') return;
    // câmera
    const tx = P.x * TS - VW / 2, ty = (P.y - 0.5) * TS - VH / 2;
    cam.x += (tx - cam.x) * Math.min(1, dt * 8); cam.y += (ty - cam.y) * Math.min(1, dt * 8);
    if (Math.abs(tx - cam.x) > VW) { cam.x = tx; cam.y = ty; }
    let sx = 0, sy = 0;
    if (S.shake > 0) { sx = (Math.random() - 0.5) * S.shake; sy = (Math.random() - 0.5) * S.shake; S.shake = Math.max(0, S.shake - dt * 30); }
    const ox = Math.round(cam.x + sx), oy = Math.round(cam.y + sy);
    cx.setTransform(Z, 0, 0, Z, 0, 0);
    // chão
    if (S.map.kind === 'world') {
      const c0 = Math.floor(ox / (CH * TS)), c1 = Math.floor((ox + VW) / (CH * TS)), r0 = Math.floor(oy / (CH * TS)), r1 = Math.floor((oy + VH) / (CH * TS));
      for (let j = r0; j <= r1; j++) for (let i = c0; i <= c1; i++) { if (i < 0 || j < 0 || i * CH >= S.world.N || j * CH >= S.world.N) continue; cx.drawImage(chunk(i, j), i * CH * TS - ox, j * CH * TS - oy); }
    } else {
      const m = S.map.m, key = m.id + ':' + m.floor + ':' + m.objs.length;
      if (key !== dgKey) { dgCanvas = bakeDungeon(m); dgKey = key; }
      cx.drawImage(dgCanvas, -ox, -oy);
    }
    // chão que queima, avisos
    for (const h of S.hazards) { const a = 0.35 + Math.sin(T0 * 12 + h.x) * 0.1; cx.fillStyle = 'rgba(247,118,34,' + a + ')'; circle(h.x * TS - ox, h.y * TS - oy, h.r * TS, 0.55); }
    for (const t of S.tele) drawTele(t, ox, oy);
    // água e véu vivos
    if (S.map.kind === 'world') liveTiles(ox, oy);
    // a lista do que tem altura
    const list = [];
    if (S.map.kind === 'world') collectWorld(list, ox, oy); else collectDg(list, ox, oy);
    for (const e of S.ents) if (onScreen(e.x, e.y, ox, oy, 3)) list.push({ y: e.y, e });
    for (const f of S.fx) if (f.kind === 'drop') list.push({ y: f.y - 0.01, drop: f });
    list.push({ y: P.y, hero: true });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) {
      if (it.hero) drawHero(ox, oy);
      else if (it.e) drawEnt(it.e, ox, oy);
      else if (it.drop) drawDrop(it.drop, ox, oy);
      else if (it.o) drawObj(it.o, ox, oy);
    }
    // projéteis e efeitos
    for (const p of S.projs) drawProj(p, ox, oy);
    drawFx(dt, ox, oy);
    // clima
    weather(dt, ox, oy);
    // luz
    lighting(ox, oy);
    // números de dano
    cx.textAlign = 'center';
    for (const f of S.floats) {
      f.t += dt;
      const a = Math.max(0, 1 - f.t / 0.9), yy = f.y * TS - oy - f.t * 22;
      cx.font = (f.big ? '11' : '8') + 'px "Pixelify Sans", monospace';
      cx.fillStyle = 'rgba(20,16,24,' + a + ')'; cx.fillText(f.txt, f.x * TS - ox + 1, yy + 1);
      cx.fillStyle = f.col; cx.globalAlpha = a; cx.fillText(f.txt, f.x * TS - ox, yy); cx.globalAlpha = 1;
    }
    S.floats = S.floats.filter((f) => f.t < 0.9);
    // nomes e marcas de missão
    labels(ox, oy);
  };
  function onScreen(x, y, ox, oy, m) { const px = x * TS - ox, py = y * TS - oy; return px > -m * TS && py > -m * TS && px < VW + m * TS && py < VH + (m + 1) * TS; }
  function circle(x, y, r, sq) { cx.beginPath(); cx.ellipse(x, y, r, r * (sq || 0.6), 0, 0, Math.PI * 2); cx.fill(); }

  function drawTele(t, ox, oy) {
    const k = Math.min(1, t.t / t.delay), x = t.x * TS - ox, y = t.y * TS - oy;
    if (t.cone) {
      cx.fillStyle = 'rgba(247,118,34,' + (0.15 + k * 0.25) + ')';
      cx.beginPath(); cx.moveTo(x, y - 8); cx.arc(x, y - 8, t.r * TS * k, t.ang - t.arc / 2, t.ang + t.arc / 2); cx.closePath(); cx.fill();
      cx.strokeStyle = 'rgba(255,200,120,0.6)'; cx.lineWidth = 1; cx.beginPath(); cx.arc(x, y - 8, t.r * TS, t.ang - t.arc / 2, t.ang + t.arc / 2); cx.stroke();
      return;
    }
    const col = t.owner === 'p' ? '254,231,97' : t.col === '#b55088' ? '181,80,136' : '200,66,58';
    cx.strokeStyle = 'rgba(' + col + ',0.75)'; cx.lineWidth = 1;
    cx.beginPath(); cx.ellipse(x, y, t.r * TS, t.r * TS * 0.6, 0, 0, Math.PI * 2); cx.stroke();
    cx.fillStyle = 'rgba(' + col + ',' + (0.12 + k * 0.28) + ')';
    cx.beginPath(); cx.ellipse(x, y, t.r * TS * k, t.r * TS * 0.6 * k, 0, 0, Math.PI * 2); cx.fill();
    if (t.meteor && k > 0.5) { cx.fillStyle = '#fee761'; const h = (1 - k) * 80; cx.fillRect(x - 2, y - h - 4, 4, 6); }
  }
  function liveTiles(ox, oy) {
    const w = S.world, N = w.N;
    const x0 = Math.max(0, Math.floor(ox / TS)), y0 = Math.max(0, Math.floor(oy / TS)), x1 = Math.min(N - 1, Math.ceil((ox + VW) / TS)), y1 = Math.min(N - 1, Math.ceil((oy + VH) / TS));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const t = w.tile[y * N + x];
      if (t === T.VEU && !(S.P.flags.veu)) {
        const ph = T0 * 6 + x * 1.7 + y;
        for (let k = 0; k < 3; k++) { const h = 6 + Math.sin(ph + k * 2) * 4 + 6; cx.fillStyle = k === 0 ? 'rgba(200,66,58,0.85)' : k === 1 ? 'rgba(247,118,34,0.85)' : 'rgba(242,218,114,0.8)'; cx.fillRect(x * TS - ox + k * 5 + 1, y * TS - oy + 16 - h - k * 3, 4, h); }
      } else if ((t === T.SHALLOW || t === T.RIVER || t === T.DEEP) && G.hash2(x, y, Math.floor(T0 * 1.5)) < 0.05) {
        cx.fillStyle = 'rgba(230,240,235,0.6)'; cx.fillRect(x * TS - ox + 4 + Math.floor(G.hash2(x, y, 9) * 8), y * TS - oy + 6 + Math.floor(G.hash2(y, x, 9) * 6), 3, 1);
      } else if (t === T.LAVA && Math.random() < 0.01) S.fx.push({ kind: 'p', x: x + Math.random(), y: y + 0.5, vx: 0, vy: -1, t: 0, life: 0.6, col: '#f2da72', g: 0 });
    }
  }
  function collectWorld(list, ox, oy) {
    const w = S.world, N = w.N, seen = new Set();
    const x0 = Math.max(0, Math.floor(ox / TS) - 3), y0 = Math.max(0, Math.floor(oy / TS) - 1), x1 = Math.min(N - 1, Math.ceil((ox + VW) / TS) + 3), y1 = Math.min(N - 1, Math.ceil((oy + VH) / TS) + 5);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const id = w.grid[y * N + x]; if (id < 0 || seen.has(id)) continue;
      seen.add(id); const o = w.objs[id]; if (o.gone) continue;
      list.push({ y: o.y + 0.9, o });
    }
  }
  function collectDg(list, ox, oy) {
    const m = S.map.m;
    for (const o of m.objs) if (!o.gone && o.k !== 'bones' && o.k !== 'web' && o.k !== 'stairsUp' && o.k !== 'stairsDown' && onScreen(o.x, o.y, ox, oy, 2)) list.push({ y: o.y + (o.k === 'torch' ? 0.2 : o.k === 'spikes' || o.k === 'urnBroken' ? 0.1 : 0.9), o });
  }
  const bcache = {};
  function buildingSpr(o) {
    if (o.kind === 'casa') return A.spr.house[o.style] || A.spr.house.barro;
    const k = o.kind + o.style + o.w + o.h;
    return bcache[k] || (bcache[k] = SP.building(o.kind, o.style, o.w, o.h));
  }
  function drawSpr(img, ax, ay, ox, oy, flip) {
    if (!img) return;
    const x = Math.round(ax * TS - ox - img.width / 2), y = Math.round(ay * TS - oy - img.height);
    if (flip) { cx.save(); cx.scale(-1, 1); cx.drawImage(img, -x - img.width, y); cx.restore(); } else cx.drawImage(img, x, y);
  }
  function drawObj(o, ox, oy) {
    const S2 = A.spr, v = o.v || 0, bx = o.x + 0.5, by = o.y + 1;
    switch (o.k) {
      case 'broad': return drawSpr(S2.broad[0][v % 3], bx, by + 0.15, ox, oy);
      case 'nobre': return drawSpr(S2.nobre[0][v % 3], bx, by + 0.15, ox, oy);
      case 'arau': return drawSpr(S2.arau[S.world && W.regionAt(S.world, o.x, o.y) === 'serra' && S.world.tile[o.y * S.world.N + o.x] === T.SNOW ? 3 : 0][v % 3], bx, by + 0.15, ox, oy);
      case 'mangue': return drawSpr(S2.mangue[0][v % 2], bx, by + 0.1, ox, oy);
      case 'cacto': return drawSpr(S2.cacto[1][v % 2], bx, by, ox, oy);
      case 'junco': return drawSpr(S2.junco[0][v % 2], bx, by, ox, oy);
      case 'bush': return drawSpr(S2.bush[0][v % 4], bx, by, ox, oy);
      case 'rock': return drawSpr(S2.rock[Math.min(2, v)][S.map.kind === 'world' && S.world.tile[o.y * S.world.N + o.x] === T.SNOW ? 1 : 0][v % 2], bx, by, ox, oy);
      case 'herb': return drawSpr(SP.herb(o.herb), bx, by - 0.1, ox, oy);
      case 'ore': return drawSpr(SP.ore(o.ore), bx, by, ox, oy);
      case 'chest': return drawSpr(SP.chest(!!o.open, !!o.rare || !!o.locked), bx, by - 0.05, ox, oy);
      case 'campfire': { drawSpr(S2.fire[Math.floor(T0 * 8) % 3], bx, by, ox, oy); return; }
      case 'altar': { drawSpr(A.statue(2), bx, by, ox, oy); return; }
      case 'marco': { drawSpr(SP.marco(), bx, by, ox, oy); return; }
      case 'quadro': return drawSpr(SP.quadro(), bx, by, ox, oy);
      case 'poco': return drawSpr(SP.poco(), bx, by, ox, oy);
      case 'lamp': return drawSpr(SP.lamp(), bx, by, ox, oy);
      case 'barril': return drawSpr(SP.barril(), bx, by, ox, oy);
      case 'caixa': return drawSpr(SP.caixa(), bx, by, ox, oy);
      case 'banca': return drawSpr(SP.banca(o.col), o.x + 1, by, ox, oy);
      case 'entrance': return drawSpr(SP.entrance(o.theme), o.x + 1, by, ox, oy);
      case 'building': { const img = buildingSpr(o); cx.drawImage(img, Math.round(o.x * TS - ox + (o.w * TS - img.width) / 2), Math.round((o.y + 1) * TS - oy - img.height)); return; }
      case 'torch': { const f = Math.floor(T0 * 10 + o.x) % 3; cx.fillStyle = '#4b4553'; cx.fillRect(o.x * TS - ox + 7, o.y * TS - oy + 6, 2, 6); cx.fillStyle = ['#f77622', '#eaaa3c', '#f2da72'][f]; cx.fillRect(o.x * TS - ox + 6, o.y * TS - oy + 2 + (f === 1 ? 1 : 0), 4, 4); cx.fillStyle = '#fff0a0'; cx.fillRect(o.x * TS - ox + 7, o.y * TS - oy + 4, 2, 2); return; }
      case 'pillar': return drawSpr(SP.pillar(SP.THEMES[S.map.m.theme].wall[2]), bx, by, ox, oy);
      case 'brazier': { drawSpr(SP.brazier(), bx, by, ox, oy); const f = Math.floor(T0 * 10) % 3; cx.fillStyle = ['#f77622', '#eaaa3c', '#f2da72'][f]; cx.fillRect(o.x * TS - ox + 5, o.y * TS - oy + 1 + f, 6, 5); return; }
      case 'urn': return drawSpr(SP.urn(false), bx, by, ox, oy);
      case 'urnBroken': return drawSpr(SP.urn(true), bx, by, ox, oy);
      case 'spikes': { const up = o.fired > 0; if (up) o.fired -= 0.016; cx.fillStyle = '#2b2733'; cx.fillRect(o.x * TS - ox + 2, o.y * TS - oy + 2, 12, 12); cx.fillStyle = up ? '#cdc6bb' : '#4b4553'; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cx.fillRect(o.x * TS - ox + 3 + i * 4, o.y * TS - oy + 3 + j * 4 - (up ? 2 : 0), 2, up ? 4 : 2); return; }
      case 'altarSina': { drawSpr(SP.altarSina(), bx, by, ox, oy); return; }
    }
  }
  function drawDrop(f, ox, oy) {
    f.t += 0.016;
    const b = Math.sin(f.t * 4 + f.bob) * 1.5, x = f.x * TS - ox, y = f.y * TS - oy;
    cx.drawImage(A.spr.shadow, Math.round(x - 5), Math.round(y - 1));
    let img;
    if (f.gold) img = SP.coin(); else if (f.stack) img = SP.itemIcon({ id: f.stack }); else img = SP.itemIcon(f.it);
    if (!img) return;
    if (f.it && f.it.rar >= 1) { cx.fillStyle = D.RARITY[f.it.rar].col; cx.globalAlpha = 0.35 + Math.sin(f.t * 5) * 0.15; cx.fillRect(Math.round(x - 1), Math.round(y - 30), 2, 26); cx.globalAlpha = 1; }
    cx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height - 2 + b));
  }
  function frameOf(e) { return e.moving ? 1 + (Math.floor(e.anim * 6) % 2) : 0; }
  function drawSheet(s, e, ox, oy, scale) {
    scale = scale || 1;
    let row = 0, flip = false;
    if (s.dirs === 4) row = e.dir || 0;
    else if (s.dirs === 2) { if (e.dir === 2) e.hdir = 0; else if (e.dir === 3) e.hdir = 1; row = e.hdir || 0; }
    else { if (e.dir === 3) e.hflip = true; else if (e.dir === 2) e.hflip = false; flip = e.hflip; }
    const f = frameOf(e);
    const w = s.fw * scale, h = s.fh * scale;
    const x = Math.round(e.x * TS - ox - w / 2), y = Math.round(e.y * TS - oy - h + 2);
    if (flip) { cx.save(); cx.translate(x + w, y); cx.scale(-1, 1); cx.drawImage(s.img, f * s.fw, row * s.fh, s.fw, s.fh, 0, 0, w, h); cx.restore(); }
    else cx.drawImage(s.img, f * s.fw, row * s.fh, s.fw, s.fh, x, y, w, h);
  }
  function drawEnt(e, ox, oy) {
    const s = sheetFor(e);
    const alpha = e.dead ? Math.max(0, 1 - e.deadT / 1.5) : 1;
    if (alpha <= 0) return;
    cx.globalAlpha = alpha;
    const sh = e.big > 1.3 ? A.spr.bigShadow : A.spr.shadow;
    cx.drawImage(sh, Math.round(e.x * TS - ox - sh.width / 2), Math.round(e.y * TS - oy - sh.height / 2));
    if (e.elite && !e.dead) { cx.strokeStyle = 'rgba(111,168,255,0.7)'; cx.beginPath(); cx.ellipse(e.x * TS - ox, e.y * TS - oy, 8 * e.big, 3.5 * e.big, 0, 0, Math.PI * 2); cx.stroke(); }
    if (e.kind === 'ally') { cx.globalAlpha = alpha * 0.85; }
    if (e.wind > 0 && !e.dead) { cx.fillStyle = 'rgba(200,66,58,0.35)'; cx.beginPath(); cx.ellipse(e.x * TS - ox, e.y * TS - oy, 9 * e.big, 4 * e.big, 0, 0, Math.PI * 2); cx.fill(); }
    if (e.flash > 0) cx.filter = 'brightness(3)';
    if (s.wisp) drawWisp(e, s, ox, oy);
    else if (s.serpent) drawSerpent(e, ox, oy);
    else {
      if (e.dead) { cx.save(); const x = e.x * TS - ox, y = e.y * TS - oy; cx.translate(x, y); cx.rotate(Math.PI / 2 * Math.min(1, e.deadT * 4)); cx.translate(-x, -y); drawSheet(s, e, ox, oy + 4, e.big); cx.restore(); }
      else drawSheet(s, e, ox, oy, e.big);
      if (e.kind !== 'npc' && e.def.plan === 'man' && e.def.look && e.def.look.wpn && e.def.look.wpn !== 'nada' && !e.dead) heldWeapon(e, e.def.look.wpn, 'ferro', ox, oy, e.big);
      if (e.def.plan === 'skel' && !e.dead) heldWeapon(e, e.def.wpn || 'espada', 'ferro', ox, oy, 1);
      if (e.def.plan === 'mula' || (e.def.look && e.def.look.glow === '#f77622')) { if (Math.random() < 0.4) S.fx.push({ kind: 'p', x: e.x + (Math.random() - 0.5) * 0.3, y: e.y - 0.9 * e.big, vx: 0, vy: -1.6, t: 0, life: 0.45, col: Math.random() < 0.5 ? '#f77622' : '#f2da72', g: 0 }); }
      if (e.def.plan === 'curupira' && Math.random() < 0.5) S.fx.push({ kind: 'p', x: e.x + (Math.random() - 0.5) * 0.4, y: e.y - 1.1 * e.big, vx: 0, vy: -1.4, t: 0, life: 0.35, col: Math.random() < 0.5 ? '#e47c2c' : '#f2da72', g: 0 });
    }
    cx.filter = 'none';
    cx.globalAlpha = 1;
    // vida
    if (!e.dead && e.kind === 'mon' && e.hp < e.maxHp && !e.boss) {
      const w = 14, x = Math.round(e.x * TS - ox - w / 2), y = Math.round(e.y * TS - oy - s.fh * e.big - 3);
      cx.fillStyle = '#1f1a24'; cx.fillRect(x - 1, y - 1, w + 2, 4);
      cx.fillStyle = e.elite ? '#6fa8ff' : '#c8423a'; cx.fillRect(x, y, Math.max(0, w * e.hp / e.maxHp), 2);
    }
  }
  function drawWisp(e, s, ox, oy) {
    const x = e.x * TS - ox, y = e.y * TS - oy - 10 + Math.sin(e.t * 3) * 2;
    const g = cx.createRadialGradient(x, y, 0, x, y, 9);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, s.col); g.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = g; cx.fillRect(x - 9, y - 9, 18, 18);
    if (Math.random() < 0.3) S.fx.push({ kind: 'p', x: e.x + (Math.random() - 0.5) * 0.3, y: e.y - 0.6, vx: 0, vy: -0.8, t: 0, life: 0.5, col: s.col, g: 0 });
  }
  function drawSerpent(e, ox, oy) {
    const segs = e.seg;
    for (let i = segs.length - 1; i >= 0; i--) {
      const s = segs[i], r = 7 - i * 0.25, x = s.x * TS - ox, y = s.y * TS - oy - 8;
      const g = cx.createRadialGradient(x, y, 0, x, y, r + 4);
      g.addColorStop(0, '#fff0a0'); g.addColorStop(0.4, '#f77622'); g.addColorStop(0.8, '#a8302c'); g.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = g; cx.fillRect(x - r - 4, y - r - 4, (r + 4) * 2, (r + 4) * 2);
    }
    const x = e.x * TS - ox, y = e.y * TS - oy - 10, a = e.head || 0;
    cx.save(); cx.translate(x, y); cx.rotate(a);
    cx.fillStyle = '#a8302c'; cx.beginPath(); cx.moveTo(13, 0); cx.lineTo(-6, -8); cx.lineTo(-6, 8); cx.closePath(); cx.fill();
    cx.fillStyle = '#f77622'; cx.beginPath(); cx.moveTo(10, 0); cx.lineTo(-4, -5); cx.lineTo(-4, 5); cx.closePath(); cx.fill();
    cx.fillStyle = '#fff0a0'; cx.fillRect(2, -5, 3, 2); cx.fillRect(2, 3, 3, 2);
    cx.restore();
    if (Math.random() < 0.8) S.fx.push({ kind: 'p', x: e.x + (Math.random() - 0.5) * 0.6, y: e.y - 0.6, vx: (Math.random() - 0.5), vy: -1.8, t: 0, life: 0.5, col: Math.random() < 0.5 ? '#f77622' : '#f2da72', g: 0 });
  }
  function heldWeapon(e, kind, mat, ox, oy, scale, aim, swingK) {
    const img = SP.weapon(kind, mat);
    const dir = e.dir || 0;
    let ang, hx, hy;
    const ranged = kind === 'arco' || kind === 'arco_longo' || kind === 'cajado';
    if (aim != null) { ang = aim + Math.PI / 2; }
    else ang = dir === 2 ? 0.5 : dir === 3 ? -0.5 : dir === 1 ? 0.2 : -0.2;
    hx = e.x * TS - ox + (dir === 2 ? 3 : dir === 3 ? -3 : dir === 0 ? 4 : -4) * scale;
    hy = e.y * TS - oy - 6 * scale;
    if (aim != null) { hx = e.x * TS - ox + Math.cos(aim) * 4; hy = e.y * TS - oy - 8 + Math.sin(aim) * 3; }
    if (swingK != null && !ranged) ang += swingK;
    cx.save(); cx.translate(Math.round(hx), Math.round(hy)); cx.rotate(ang); cx.scale(scale, scale);
    cx.drawImage(img, -Math.floor(img.width / 2), -img.height + 3);
    cx.restore();
  }
  function drawHero(ox, oy) {
    const P = S.P, s = heroSheetGet();
    if (S.dead) { cx.globalAlpha = 0.6; }
    const e = { x: P.x, y: P.y, dir: P.dir || 0, moving: P.moving, anim: P.anim };
    cx.drawImage(A.spr.shadow, Math.round(P.x * TS - ox - 5), Math.round(P.y * TS - oy - 2));
    const back = (P.dir || 0) === 1;
    const w = S.st.wpn;
    const swingK = P.swing > 0 ? (1 - P.swing / 0.22 - 0.5) * (w.arc || 100) * Math.PI / 180 * (P.swingPow ? 1.35 : 1) : null;
    const aiming = P.swing > 0 || P.castT > 0;
    if (back && w.base !== 'punho') heldWeapon(e, w.base, w.mat, ox, oy, 1, aiming ? P.aim : null, swingK);
    if (P.roll > 0) {
      cx.save(); const x = P.x * TS - ox, y = P.y * TS - oy - 7; cx.translate(x, y); cx.rotate((1 - P.roll / 0.32) * Math.PI * 2 * (P.rdx < 0 ? -1 : 1)); cx.translate(-x, -y);
      drawSheet(s, e, ox, oy, 1); cx.restore();
    } else {
      if (P.hurtT > 0) cx.filter = 'brightness(2.2) saturate(0.4)';
      if (P.iframes > 0 && !(P.roll > 0) && Math.floor(T0 * 20) % 2) cx.globalAlpha = 0.6;
      drawSheet(s, e, ox, oy, 1);
      cx.filter = 'none'; cx.globalAlpha = 1;
    }
    if (!back && w.base !== 'punho') heldWeapon(e, w.base, w.mat, ox, oy, 1, aiming ? P.aim : null, swingK);
    if (P.ward > 0) { cx.strokeStyle = 'rgba(242,218,114,' + (0.4 + Math.sin(T0 * 6) * 0.2) + ')'; cx.beginPath(); cx.ellipse(P.x * TS - ox, P.y * TS - oy - 8, 10, 12, 0, 0, Math.PI * 2); cx.stroke(); }
    if (P.castT > 0) { cx.fillStyle = 'rgba(155,231,255,0.5)'; circle(P.x * TS - ox + Math.cos(P.aim) * 8, P.y * TS - oy - 9 + Math.sin(P.aim) * 6, 3, 1); }
    if (P.lightT > 0) { const x = P.x * TS - ox - 10, y = P.y * TS - oy - 24 + Math.sin(T0 * 2) * 2; cx.fillStyle = '#fff3c4'; cx.fillRect(x, y, 3, 3); }
    cx.globalAlpha = 1;
    if (G.UI.progressOn()) { const k = G.UI.progressK(); cx.fillStyle = '#1f1a24'; cx.fillRect(P.x * TS - ox - 9, P.y * TS - oy - 26, 18, 4); cx.fillStyle = '#f2da72'; cx.fillRect(P.x * TS - ox - 8, P.y * TS - oy - 25, 16 * k, 2); }
  }
  function drawProj(p, ox, oy) {
    const x = p.x * TS - ox, y = p.y * TS - oy;
    if (p.kind === 'flecha' || p.kind === 'bala') {
      const a = Math.atan2(p.vy, p.vx);
      cx.save(); cx.translate(x, y); cx.rotate(a);
      cx.fillStyle = p.kind === 'bala' ? '#cdc6bb' : '#93683f'; cx.fillRect(-6, -0.5, p.kind === 'bala' ? 3 : 8, 1);
      if (p.kind === 'flecha') { cx.fillStyle = p.elem === 'fogo' ? '#f77622' : p.elem === 'gelo' ? '#9be7ff' : '#cdc6bb'; cx.fillRect(2, -1, 2, 2); cx.fillStyle = '#e2cfa4'; cx.fillRect(-7, -1, 2, 2); }
      cx.restore(); return;
    }
    const col = p.col || '#f77622', r = (p.r || 0.2) * TS * 1.6;
    const g = cx.createRadialGradient(x, y, 0, x, y, r + 3);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = g; cx.fillRect(x - r - 3, y - r - 3, (r + 3) * 2, (r + 3) * 2);
    if (Math.random() < 0.6) S.fx.push({ kind: 'p', x: p.x, y: p.y, vx: -p.vx * 0.05, vy: -p.vy * 0.05, t: 0, life: 0.25, col, g: 0 });
  }
  function drawFx(dt, ox, oy) {
    for (const f of S.fx) {
      if (f.kind === 'drop') continue;
      f.t += dt;
      const k = f.t / f.life;
      if (f.kind === 'p') {
        f.x += f.vx * dt; f.y += f.vy * dt; f.vy += (f.g || 0) * dt;
        cx.globalAlpha = Math.max(0, 1 - k); cx.fillStyle = f.col;
        cx.fillRect(Math.round(f.x * TS - ox), Math.round(f.y * TS - oy), k < 0.5 ? 2 : 1, k < 0.5 ? 2 : 1);
      } else if (f.kind === 'ring') {
        cx.globalAlpha = Math.max(0, 1 - k); cx.strokeStyle = f.col; cx.lineWidth = 2;
        cx.beginPath(); cx.ellipse(f.x * TS - ox, f.y * TS - oy, f.r * TS * (0.3 + k * 0.7), f.r * TS * 0.6 * (0.3 + k * 0.7), 0, 0, Math.PI * 2); cx.stroke(); cx.lineWidth = 1;
      } else if (f.kind === 'slash') {
        cx.globalAlpha = Math.max(0, 1 - k) * 0.8; cx.strokeStyle = f.col; cx.lineWidth = 2;
        const r = f.reach * TS * 0.9, a0 = f.ang - f.arc / 2 + f.arc * Math.min(1, k * 1.6) * 0.0;
        cx.beginPath(); cx.arc(f.x * TS - ox, f.y * TS - oy, r, a0, a0 + f.arc * Math.min(1, k * 2.2)); cx.stroke(); cx.lineWidth = 1;
      } else if (f.kind === 'bolt') {
        cx.globalAlpha = Math.max(0, 1 - k); cx.strokeStyle = f.col; cx.lineWidth = 2;
        cx.beginPath();
        f.pts.forEach(([x, y], i) => { if (!i) cx.moveTo(x * TS - ox, y * TS - oy); else { const [px, py] = f.pts[i - 1]; for (let s = 1; s <= 3; s++) { const t = s / 3; cx.lineTo((px + (x - px) * t) * TS - ox + (s < 3 ? (Math.random() - 0.5) * 6 : 0), (py + (y - py) * t) * TS - oy + (s < 3 ? (Math.random() - 0.5) * 6 : 0)); } } });
        cx.stroke(); cx.lineWidth = 1;
      }
    }
    cx.globalAlpha = 1;
    S.fx = S.fx.filter((f) => f.kind === 'drop' ? !f.dead : f.t < f.life);
  }

  // ---------- clima ----------
  const drops = [];
  function weather(dt, ox, oy) {
    if (S.map.kind !== 'world') return;
    const rg = S.region || 'campo';
    const rainy = (rg === 'mata' || rg === 'pantano' || rg === 'mangue' || rg === 'litoral') && Math.sin(S.day * 1.7 + S.time / 200) > 0.3;
    const snow = rg === 'serra', ash = rg === 'cratera' || rg === 'sertao' && Math.sin(S.day * 2.3) > 0.6;
    S.weather = rainy ? 'chuva' : snow ? 'neve' : ash ? 'cinza' : null;
    if (!S.weather) return;
    const want = rainy ? 140 : snow ? 80 : 50;
    while (drops.length < want) drops.push({ x: Math.random() * VW, y: Math.random() * VH, v: 0.5 + Math.random() });
    for (const d of drops) {
      if (rainy) { d.y += 260 * d.v * dt; d.x -= 40 * dt; cx.fillStyle = 'rgba(180,200,220,0.45)'; cx.fillRect(Math.round(d.x), Math.round(d.y), 1, 4); }
      else if (snow) { d.y += 25 * d.v * dt; d.x += Math.sin(T0 + d.v * 9) * 12 * dt; cx.fillStyle = 'rgba(240,244,250,0.85)'; cx.fillRect(Math.round(d.x), Math.round(d.y), d.v > 1 ? 2 : 1, d.v > 1 ? 2 : 1); }
      else { d.y -= 10 * d.v * dt; d.x += 18 * dt; cx.fillStyle = rg === 'cratera' ? 'rgba(242,170,90,0.7)' : 'rgba(200,180,150,0.5)'; cx.fillRect(Math.round(d.x), Math.round(d.y), 1, 1); }
      if (d.y > VH) { d.y = -5; d.x = Math.random() * VW; } if (d.y < -6) { d.y = VH; d.x = Math.random() * VW; } if (d.x < -5) d.x = VW; if (d.x > VW + 5) d.x = 0;
    }
    if (rg === 'pantano') { cx.fillStyle = 'rgba(180,200,190,0.10)'; cx.fillRect(0, 0, VW, VH); }
    if (rainy) { cx.fillStyle = 'rgba(40,50,70,0.15)'; cx.fillRect(0, 0, VW, VH); }
  }

  // ---------- luz ----------
  function darkness() {
    if (S.map.kind === 'dg') return SP.THEMES[S.map.m.theme].fog * 0.84 * (S.st.night ? 0.62 : 1);
    const h = (S.time / 60) % 24;
    let a = h < 5 ? 0.62 : h < 7 ? 0.62 * (7 - h) / 2 : h < 17.5 ? 0 : h < 20 ? 0.62 * (h - 17.5) / 2.5 : 0.62;
    if (S.region === 'cratera') a = Math.max(a, 0.25);
    if (S.st.night) a *= 0.45;
    return a;
  }
  function tint() {
    if (S.map.kind === 'dg') return null;
    const h = (S.time / 60) % 24;
    if (h > 16.5 && h < 19.5) return 'rgba(255,140,60,' + (0.12 * Math.sin((h - 16.5) / 3 * Math.PI)) + ')';
    if (h > 5 && h < 7.5) return 'rgba(255,180,140,' + (0.08 * Math.sin((h - 5) / 2.5 * Math.PI)) + ')';
    return null;
  }
  function lighting(ox, oy) {
    const a = darkness();
    const tn = tint();
    if (tn) { cx.fillStyle = tn; cx.fillRect(0, 0, VW, VH); }
    if (a <= 0.01) return;
    const lw = light.width, lh = light.height, k = lw / VW;
    lx.globalCompositeOperation = 'source-over';
    lx.clearRect(0, 0, lw, lh);
    lx.fillStyle = S.map.kind === 'dg' ? 'rgba(6,4,10,' + a + ')' : 'rgba(10,14,34,' + a + ')';
    lx.fillRect(0, 0, lw, lh);
    lx.globalCompositeOperation = 'destination-out';
    const P = S.P;
    const hole = (x, y, r, s) => {
      const px = (x * TS - ox) * k, py = (y * TS - oy) * k, rr = r * TS * k;
      if (px < -rr || py < -rr || px > lw + rr || py > lh + rr) return;
      const g = lx.createRadialGradient(px, py, 0, px, py, rr);
      g.addColorStop(0, 'rgba(0,0,0,' + (s || 1) + ')'); g.addColorStop(0.55, 'rgba(0,0,0,' + (s || 1) * 0.7 + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
      lx.fillStyle = g; lx.fillRect(px - rr, py - rr, rr * 2, rr * 2);
    };
    const flick = 1 + Math.sin(T0 * 9) * 0.04;
    hole(P.x, P.y - 0.5, (S.map.kind === 'dg' ? 6.8 : 4.6) * S.st.light * flick * (P.lightT > 0 ? 1.7 : 1));
    if (S.map.kind === 'dg') {
      for (const o of S.map.m.objs) if (!o.gone && (o.k === 'torch' || o.k === 'brazier')) hole(o.x + 0.5, o.y + (o.k === 'torch' ? 0.8 : 0.4), (o.k === 'brazier' ? 6.5 : 4.6) * flick, 0.85);
      if (S.map.m.theme === 'fogo') for (let y = Math.floor(oy / TS); y < (oy + VH) / TS; y += 2) for (let x = Math.floor(ox / TS); x < (ox + VW) / TS; x += 2) { const m = S.map.m; if (x >= 0 && y >= 0 && x < m.N && y < m.N && m.tile[y * m.N + x] === Dg.LAVA) hole(x + 0.5, y + 0.5, 2.5, 0.7); }
    } else {
      const w = S.world, N = w.N;
      const x0 = Math.max(0, Math.floor(ox / TS) - 4), y0 = Math.max(0, Math.floor(oy / TS) - 4), x1 = Math.min(N - 1, Math.ceil((ox + VW) / TS) + 4), y1 = Math.min(N - 1, Math.ceil((oy + VH) / TS) + 4);
      const seen = new Set();
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const id = w.grid[y * N + x]; if (id < 0 || seen.has(id)) continue; seen.add(id);
        const o = w.objs[id]; if (o.gone) continue;
        if (o.k === 'lamp') hole(o.x + 0.5, o.y - 0.6, 4.2 * flick, 0.9);
        else if (o.k === 'campfire') hole(o.x + 0.5, o.y + 0.5, 5 * flick, 1);
        else if (o.k === 'marco') hole(o.x + 0.5, o.y - 0.8, 2.6, 0.7);
      }
      if (S.region === 'cratera') for (let y = y0; y <= y1; y += 2) for (let x = x0; x <= x1; x += 2) { const t = w.tile[y * N + x]; if (t === T.LAVA || t === T.VEU) hole(x + 0.5, y + 0.5, 2.6, 0.75); }
    }
    for (const p of S.projs) if (p.kind !== 'flecha' && p.kind !== 'bala') hole(p.x, p.y, 2.2, 0.8);
    for (const e of S.ents) {
      if (e.dead) continue;
      if (e.def.plan === 'wisp') hole(e.x, e.y - 0.6, 2.5, 0.8);
      else if (e.def.plan === 'serpent') { hole(e.x, e.y, 4, 1); for (let i = 0; i < e.seg.length; i += 3) hole(e.seg[i].x, e.seg[i].y, 3, 0.8); }
      else if (e.def.plan === 'mula' || e.def.plan === 'curupira') hole(e.x, e.y - 0.8, 2.4, 0.7);
      else if (e.kind === 'ally') hole(e.x, e.y - 0.5, 1.6, 0.5);
    }
    for (const h of S.hazards) hole(h.x, h.y, 1.8, 0.6);
    for (const t of S.tele) hole(t.x, t.y, t.r * 1.1, 0.5);
    cx.save(); cx.setTransform(Z * VW / lw, 0, 0, Z * VH / lh, 0, 0); cx.imageSmoothingEnabled = true;
    cx.drawImage(light, 0, 0);
    cx.restore(); cx.imageSmoothingEnabled = false;
  }

  // ---------- nomes ----------
  function labels(ox, oy) {
    const P = S.P;
    cx.textAlign = 'center';
    cx.font = '7px "Pixelify Sans", monospace';
    for (const e of S.ents) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - P.x, e.y - P.y);
      const x = e.x * TS - ox, y = e.y * TS - oy - (SP.PH * e.big) - 4;
      if (e.kind === 'npc') {
        const mark = G.UI.questMark(e);
        if (mark) { const b = Math.sin(T0 * 4) * 1.5; cx.font = '10px "Pixelify Sans", monospace'; cx.fillStyle = '#1f1a24'; cx.fillText(mark, x + 1, y - 2 + b + 1); cx.fillStyle = mark === '!' ? '#f2da72' : '#9be7ff'; cx.fillText(mark, x, y - 2 + b); cx.font = '7px "Pixelify Sans", monospace'; }
        if (d < 4 && e.npc) { cx.fillStyle = 'rgba(20,16,24,0.7)'; const tw = cx.measureText(e.name).width; cx.fillRect(x - tw / 2 - 2, y - 13, tw + 4, 9); cx.fillStyle = '#e2cfa4'; cx.fillText(e.name, x, y - 6); }
      } else if (e.kind === 'mon' && (e.elite || (e.def.unique && !e.boss)) && d < 9) {
        cx.fillStyle = '#1f1a24'; cx.fillText(e.name || e.def.name, x + 1, y + 1); cx.fillStyle = e.elite ? '#6fa8ff' : '#ff9b3d'; cx.fillText(e.name || e.def.name, x, y);
      }
    }
  }
})(globalThis.G = globalThis.G || {});
