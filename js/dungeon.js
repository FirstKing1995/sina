/* SINA · masmorras geradas por semente: salas ligadas por corredores largos, escada de saída, escada para baixo
   ou a sala do chefe no último andar, baús, urnas, tochas, ossos, teias, veios de minério e armadilhas. */
(function (G) {
  'use strict';
  const D = G.D;
  const Dg = G.Dungeon = {};
  Dg.FLOOR = 1; Dg.WALL = 0; Dg.LAVA = 2; Dg.WATER = 3;

  Dg.generate = function (id, floor) {
    const dd = D.DUNGEONS[id], N = dd.size;
    const rng = new G.RNG(G.hashStr(id) ^ (floor * 7919));
    const m = { id, floor, N, tile: new Uint8Array(N * N), block: new Uint8Array(N * N).fill(1), objs: [], grid: new Int32Array(N * N).fill(-1), rooms: [], theme: dd.theme, last: floor === dd.floors, seen: new Uint8Array(N * N) };
    const idx = (x, y) => y * N + x;
    const carve = (x, y, t) => { if (x > 0 && y > 0 && x < N - 1 && y < N - 1) { m.tile[idx(x, y)] = t || Dg.FLOOR; } };
    // salas
    const want = 9 + Math.floor(N / 10) + rng.int(0, 3);
    for (let tries = 0; tries < 400 && m.rooms.length < want; tries++) {
      const big = m.last && m.rooms.length === 0;
      const w = big ? rng.int(12, 15) : rng.int(5, 10), h = big ? rng.int(10, 12) : rng.int(5, 8);
      const x = rng.int(2, N - w - 3), y = rng.int(2, N - h - 3);
      if (m.rooms.some((r) => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) continue;
      m.rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1), boss: big });
    }
    for (const r of m.rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) carve(x, y);
    // corredores: liga cada sala à mais próxima já ligada (árvore), e mais uns atalhos
    const linked = [m.rooms[0]], rest = m.rooms.slice(1);
    const corridor = (a, b) => {
      const wdt = 2;
      let x = a.cx, y = a.cy;
      const horizFirst = rng.chance(0.5);
      const stepX = () => { while (x !== b.cx) { for (let k = 0; k < wdt; k++) carve(x, y + k); x += x < b.cx ? 1 : -1; } };
      const stepY = () => { while (y !== b.cy) { for (let k = 0; k < wdt; k++) carve(x + k, y); y += y < b.cy ? 1 : -1; } };
      if (horizFirst) { stepX(); stepY(); } else { stepY(); stepX(); }
      for (let k = 0; k < wdt; k++) { carve(x + k, y); carve(x, y + k); }
    };
    while (rest.length) {
      let bi = 0, bj = 0, bd = 1e9;
      for (let i = 0; i < rest.length; i++) for (let j = 0; j < linked.length; j++) { const d = Math.abs(rest[i].cx - linked[j].cx) + Math.abs(rest[i].cy - linked[j].cy); if (d < bd) { bd = d; bi = i; bj = j; } }
      corridor(rest[bi], linked[bj]);
      linked.push(rest[bi]); rest.splice(bi, 1);
    }
    for (let k = 0; k < 2; k++) { const a = rng.pick(m.rooms), b = rng.pick(m.rooms); if (a !== b) corridor(a, b); }
    // lava no tema de fogo, água no navio e no gelo
    if (dd.theme === 'fogo' || dd.theme === 'navio' || dd.theme === 'raiz') {
      const nz = new G.Simplex(rng.int(1, 1e9));
      for (const r of m.rooms) if (!r.boss && rng.chance(0.5)) for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
        if (nz.noise(x * 0.3, y * 0.3) > 0.45) m.tile[idx(x, y)] = dd.theme === 'fogo' ? Dg.LAVA : Dg.WATER;
      }
    }
    for (let i = 0; i < N * N; i++) m.block[i] = m.tile[i] === Dg.FLOOR || m.tile[i] === Dg.WATER ? 0 : 1;
    // entrada: a sala mais longe da sala do chefe (ou a primeira)
    const bossRoom = m.last ? m.rooms[0] : null;
    const dist = (r, s) => Math.abs(r.cx - s.cx) + Math.abs(r.cy - s.cy);
    const ref = bossRoom || m.rooms[0];
    const startRoom = m.rooms.slice().sort((a, b) => dist(b, ref) - dist(a, ref))[0];
    m.start = [startRoom.cx, startRoom.cy + 1];
    addObj(m, 'stairsUp', startRoom.cx, startRoom.cy);
    if (!m.last) {
      const downRoom = m.rooms.filter((r) => r !== startRoom).sort((a, b) => dist(b, startRoom) - dist(a, startRoom))[0];
      addObj(m, 'stairsDown', downRoom.cx, downRoom.cy);
      m.downRoom = downRoom;
    } else { m.bossRoom = bossRoom; }
    // decoração e tesouro
    const floorFree = (x, y) => m.tile[idx(x, y)] === Dg.FLOOR && m.grid[idx(x, y)] < 0;
    for (const r of m.rooms) {
      const isStart = r === startRoom;
      // tochas nas paredes de cima
      for (let x = r.x + 1; x < r.x + r.w - 1; x += 4) if (m.tile[idx(x, r.y - 1)] === Dg.WALL) addObj(m, 'torch', x, r.y - 1, { wall: true });
      if (r.w >= 9 && r.h >= 7 && !isStart) { for (const [px, py] of [[r.x + 2, r.y + 2], [r.x + r.w - 3, r.y + 2], [r.x + 2, r.y + r.h - 2], [r.x + r.w - 3, r.y + r.h - 2]]) if (floorFree(px, py) && rng.chance(0.7)) addObj(m, 'pillar', px, py); }
      if (r.boss) { addObj(m, 'brazier', r.x + 1, r.y + 1); addObj(m, 'brazier', r.x + r.w - 2, r.y + 1); continue; }
      const k = rng.int(0, 3);
      for (let j = 0; j < k; j++) { const x = rng.int(r.x, r.x + r.w - 1), y = rng.int(r.y, r.y + r.h - 1); if (floorFree(x, y)) addObj(m, 'urn', x, y); }
      if (rng.chance(0.5)) { const x = rng.int(r.x, r.x + r.w - 1), y = rng.int(r.y, r.y + r.h - 1); if (floorFree(x, y)) addObj(m, dd.theme === 'caverna' || dd.theme === 'raiz' ? 'web' : 'bones', x, y); }
      if (!isStart && rng.chance(0.38)) { const x = r.x + rng.int(1, r.w - 2), y = r.y + 1; if (floorFree(x, y)) addObj(m, 'chest', x, y, { rare: rng.chance(0.2), locked: rng.chance(0.3), cid: id + ':' + floor + ':' + m.objs.length }); }
      if ((dd.ore || dd.theme === 'mina' || dd.theme === 'caverna' || dd.theme === 'gelo') && rng.chance(0.4)) { const x = r.x + rng.int(0, r.w - 1), y = r.y; if (floorFree(x, y)) addObj(m, 'ore', x, y, { ore: rng.chance(0.15) ? 'ouro' : rng.chance(0.3) ? 'prata' : 'ferro' }); }
      if ((dd.theme === 'raiz' || dd.theme === 'caverna') && rng.chance(0.3)) { const x = rng.int(r.x, r.x + r.w - 1), y = rng.int(r.y, r.y + r.h - 1); if (floorFree(x, y)) addObj(m, 'herb', x, y, { herb: 'cogumelo' }); }
      if ((dd.theme === 'cripta' || dd.theme === 'ruina' || dd.theme === 'catacumba') && rng.chance(0.35)) { const x = rng.int(r.x + 1, r.x + r.w - 2), y = rng.int(r.y + 1, r.y + r.h - 2); if (floorFree(x, y)) addObj(m, 'spikes', x, y, { trap: true }); }
    }
    for (const o of m.objs) if (BLOCKING[o.k]) m.block[idx(o.x, o.y)] = 1;
    // monstros: grupos por sala (menos a de entrada)
    m.spawns = [];
    const lvl = dd.lvl + (floor - 1);
    for (const r of m.rooms) {
      if (r === startRoom) continue;
      if (r.boss) { m.spawns.push({ x: r.cx, y: r.cy - 1, list: [dd.boss], lvl: lvl + 1, boss: true }); continue; }
      if (rng.chance(0.3)) continue;
      const n = rng.int(1, 3) + (floor > 1 ? 1 : 0) + (dd.lvl >= 8 ? 1 : 0);
      const list = [];
      for (let k = 0; k < n; k++) list.push(G.World.pickW(dd.mons, rng));
      if (rng.chance(0.12)) list.push('elite:' + list[0]);
      m.spawns.push({ x: r.cx, y: r.cy, list, lvl, room: r });
    }
    // uma armadilha de espinhos nos corredores
    return m;
  };
  const BLOCKING = { pillar: 1, chest: 1, urn: 1, brazier: 1, ore: 1, torch: 0, altarSina: 1 };
  Dg.BLOCKING = BLOCKING;
  function addObj(m, k, x, y, props) {
    const o = Object.assign({ k, x, y, id: m.objs.length }, props || {});
    m.objs.push(o); m.grid[y * m.N + x] = o.id;
    return o;
  }
  Dg.addObj = function (m, k, x, y, props) { const o = addObj(m, k, x, y, props); if (BLOCKING[k]) m.block[y * m.N + x] = 1; return o; };
  Dg.removeObj = function (m, o) { o.gone = true; const i = o.y * m.N + o.x; if (m.grid[i] === o.id) m.grid[i] = -1; if (BLOCKING[o.k]) m.block[i] = m.tile[i] === Dg.FLOOR || m.tile[i] === Dg.WATER ? 0 : 1; };
  Dg.blocked = function (m, x, y) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= m.N || y >= m.N) return true; return m.block[y * m.N + x] === 1; };
  Dg.objAt = function (m, x, y) { const o = m.grid[Math.floor(y) * m.N + Math.floor(x)]; return o >= 0 && !m.objs[o].gone ? m.objs[o] : null; };
})(globalThis.G = globalThis.G || {});
