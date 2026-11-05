/* SINA · o mundo aberto de Aruanã: terreno por região, estradas, cidades, masmorras, altares e acampamentos.
   O mundo é sempre o mesmo (semente fixa), para a história caber nele. Usa o ruído e a fila de prioridade do Gods. */
(function (G) {
  'use strict';
  const D = G.D;
  const T = { DEEP: 0, SHALLOW: 1, RIVER: 2, SAND: 3, GRASS: 4, FOREST: 5, HILL: 6, MOUNTAIN: 7, DRY: 8, ROAD: 9, PAVE: 10, WALL: 11, ASH: 12, SNOW: 13, BOARD: 14, MUD: 15, LAVA: 16, VEU: 17, FLOWER: 18 };
  const BLOCK_T = new Uint8Array(32); [T.DEEP, T.MOUNTAIN, T.WALL, T.LAVA, T.VEU].forEach((t) => (BLOCK_T[t] = 1));
  const SLOW_T = new Float32Array(32).fill(1);
  SLOW_T[T.SHALLOW] = 0.55; SLOW_T[T.RIVER] = 0.6; SLOW_T[T.MUD] = 0.82; SLOW_T[T.SNOW] = 0.88; SLOW_T[T.ROAD] = 1.08; SLOW_T[T.PAVE] = 1.08; SLOW_T[T.BOARD] = 1.05; SLOW_T[T.SAND] = 0.92;
  const RIDX = {}; D.REGION_ORDER.forEach((r, i) => (RIDX[r] = i));
  const W = G.World = { T, BLOCK_T, SLOW_T, RIDX };
  W.TNAME = ['Mar', 'Água rasa', 'Rio', 'Areia', 'Campo', 'Mata', 'Colina', 'Montanha', 'Campo seco', 'Estrada', 'Calçamento', 'Muralha', 'Cinza', 'Neve', 'Tablado', 'Lama', 'Lava', 'Véu de fogo', 'Campo florido'];

  W.generate = function (seed) {
    seed = seed >>> 0;
    const N = D.MAP, n = N * N;
    const w = { N, seed, tile: new Uint8Array(n), reg: new Uint8Array(n), block: new Uint8Array(n), grid: new Int32Array(n).fill(-1), objs: [], cities: {}, dungeons: {}, altars: {}, spawns: [], town: new Uint8Array(n) };
    const nE = new G.Simplex(seed), nM = new G.Simplex(seed ^ 0x51ed27), nR = new G.Simplex(seed ^ 0x2b7e15), nW = new G.Simplex(seed ^ 0x9e3779);
    const rng = new G.RNG(seed ^ 0xabcdef);
    const idx = (x, y) => y * N + x;
    const C = D.REGIONS.cratera.c;
    // regiões: Voronoi com o contorno torto
    const centers = D.REGION_ORDER.filter((r) => r !== 'cratera').map((r) => [RIDX[r], D.REGIONS[r].c[0], D.REGIONS[r].c[1]]);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = idx(x, y);
      const wx = x + nW.fbm(x * 0.018, y * 0.018, 3, 2, 0.5) * 34, wy = y + nW.fbm(x * 0.018 + 50, y * 0.018 + 50, 3, 2, 0.5) * 34;
      let best = 1e9, br = 0;
      for (const [ri, cx, cy] of centers) { const d = (wx - cx) ** 2 + (wy - cy) ** 2; if (d < best) { best = d; br = ri; } }
      const dc = Math.hypot(x - C[0], y - C[1]) + nW.noise(x * 0.08, y * 0.08) * 3;
      if (dc < 26) br = RIDX.cratera;
      w.reg[i] = br;
      // a ilha: um quadrado arredondado com a costa torta
      const dx = Math.abs(x - N / 2) / (N / 2), dy = Math.abs(y - N / 2) / (N / 2);
      const sq = Math.pow(dx ** 4 + dy ** 4, 0.25) + nE.fbm(x * 0.02, y * 0.02, 4, 2, 0.5) * 0.09;
      const e = nE.fbm(x * 0.012 + 9, y * 0.012 + 9, 4, 2, 0.5) * 0.5 + 0.5, m = nM.fbm(x * 0.03, y * 0.03, 3, 2, 0.5) * 0.5 + 0.5;
      const r = Math.abs(nR.fbm(x * 0.009, y * 0.009, 3, 2, 0.5));
      let t;
      if (sq > 0.985) t = T.DEEP;
      else if (sq > 0.955) t = T.SHALLOW;
      else if (sq > 0.93) t = T.SAND;
      else t = terrain(w.reg[i], e, m, x, y);
      if (t !== T.DEEP && t !== T.SHALLOW && t !== T.SAND && r < 0.018 && w.reg[i] !== RIDX.cratera && w.reg[i] !== RIDX.sertao && sq < 0.9) t = T.RIVER;
      if (w.reg[i] === RIDX.cratera) {
        if (dc > 21.2 && dc < 23) t = T.VEU;
        else if (dc <= 21.2) t = nW.noise(x * 0.2, y * 0.2) > 0.62 && dc > 4 ? T.LAVA : T.ASH;
      }
      w.tile[i] = t;
    }
    function terrain(rg, e, m, x, y) {
      const R = D.REGION_ORDER[rg], h = G.hash2(x, y, 77);
      switch (R) {
        case 'campo': return m > 0.66 ? T.FOREST : (m < 0.36 && h < 0.5) ? T.FLOWER : e > 0.74 ? T.HILL : T.GRASS;
        case 'mata': return m < 0.32 ? T.GRASS : T.FOREST;
        case 'litoral': return m > 0.7 ? T.FOREST : m < 0.3 ? T.SAND : T.GRASS;
        case 'serra': return e > 0.7 ? T.MOUNTAIN : e > 0.6 ? T.SNOW : e > 0.48 ? T.HILL : m > 0.6 ? T.FOREST : T.GRASS;
        case 'mangue': return m > 0.62 ? T.SHALLOW : m > 0.45 ? T.MUD : T.GRASS;
        case 'sertao': return e > 0.73 ? T.HILL : m < 0.35 ? T.SAND : T.DRY;
        case 'pantano': return m > 0.64 ? T.SHALLOW : m > 0.42 ? T.MUD : m < 0.3 ? T.FOREST : T.GRASS;
        default: return T.ASH;
      }
    }
    // rio contínuo: onde dois pedaços só se tocam na diagonal, enche o canto (senão vira quadradinho solto)
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
      const i = idx(x, y); if (w.tile[i] !== T.RIVER) continue;
      for (const dx of [-1, 1]) {
        const j = idx(x + dx, y + 1);
        if (w.tile[j] === T.RIVER && w.tile[idx(x + dx, y)] !== T.RIVER && w.tile[idx(x, y + 1)] !== T.RIVER) { const k = idx(x, y + 1); if (!BLOCK_T[w.tile[k]]) w.tile[k] = T.RIVER; }
      }
    }
    // ---------- estradas (antes das cidades, para os portões nascerem onde a estrada passa) ----------
    const cost = (t) => (t === T.DEEP || t === T.LAVA || t === T.VEU ? 0 : t === T.MOUNTAIN ? 14 : t === T.SHALLOW ? 7 : t === T.RIVER ? 5 : t === T.FOREST ? 2.2 : t === T.HILL ? 2.5 : t === T.MUD ? 2 : t === T.ROAD ? 0.5 : 1.3);
    for (const [a, b] of D.ROADS) {
      const A0 = D.CITIES[a].at, B0 = D.CITIES[b].at;
      const path = astar(w, A0[0], A0[1], B0[0], B0[1], cost);
      if (!path) continue;
      // estrada de 2 de largura: cada passo pinta um quadrado 2x2 (a diagonal fica menos em escada)
      for (const i of path) for (const j of [i, i + 1, i + N, i + N + 1]) {
        const t = w.tile[j];
        if (t === T.DEEP || t === T.VEU || t === T.LAVA || !(j % N)) continue;
        w.tile[j] = t === T.RIVER || t === T.SHALLOW ? T.BOARD : T.ROAD;
      }
    }
    // ---------- cidades ----------
    for (const id of D.CITY_ORDER) G.Town.stamp(w, id, rng);
    // ---------- natureza ----------
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
      const i = idx(x, y);
      if (w.town[i] || w.grid[i] >= 0) continue;
      const t = w.tile[i], rg = D.REGION_ORDER[w.reg[i]], h = G.hash2(x, y, 101), h2 = G.hash2(x, y, 202);
      if (t === T.ROAD || t === T.BOARD || t === T.DEEP || t === T.VEU || t === T.LAVA) continue;
      if (nearRoad(w, x, y)) continue;
      let k = null;
      if (t === T.FOREST) {
        if (h < (rg === 'mata' ? 0.42 : 0.3)) k = rg === 'mata' ? (h2 < 0.55 ? 'nobre' : 'broad') : rg === 'serra' ? 'arau' : rg === 'pantano' ? (h2 < 0.5 ? 'mangue' : 'broad') : 'broad';
        else if (h < 0.36) k = 'bush';
      } else if (t === T.GRASS || t === T.FLOWER) {
        if (h < 0.035) k = rg === 'serra' ? 'arau' : rg === 'mangue' ? 'mangue' : 'broad';
        else if (h < 0.05) k = 'bush'; else if (h < 0.06) k = 'rock';
      } else if (t === T.HILL) { if (h < 0.08) k = 'rock'; else if (h < 0.12 && rg === 'serra') k = 'arau'; }
      else if (t === T.SNOW) { if (h < 0.05) k = 'rock'; else if (h < 0.09) k = 'arau'; }
      else if (t === T.DRY || t === T.SAND) { if (rg === 'sertao' && h < 0.04) k = 'cacto'; else if (h < 0.055) k = 'rock'; }
      else if (t === T.MUD) { if (h < 0.08) k = rg === 'mangue' ? 'mangue' : 'junco'; else if (h < 0.12) k = 'junco'; }
      else if (t === T.ASH) { if (h < 0.025) k = 'rock'; }
      else if (t === T.SHALLOW && rg !== 'campo') { if (h < 0.05) k = 'junco'; }
      if (k) addObj(w, k, x, y, { v: Math.floor(h2 * 3) });
      // ervas e minério
      else if (h2 < 0.006 && t !== T.SHALLOW && t !== T.RIVER) {
        const herbs = D.REGIONS[rg].herb;
        if (herbs.length) addObj(w, 'herb', x, y, { herb: herbs[Math.floor(h * 997) % herbs.length] });
      } else if (h2 > 0.996 && (t === T.HILL || t === T.SNOW || (rg === 'serra' && t !== T.SHALLOW))) {
        addObj(w, 'ore', x, y, { ore: h < 0.6 ? 'ferro' : h < 0.85 ? 'prata' : 'ouro' });
      }
    }
    // ---------- masmorras, altares ----------
    for (const id in D.DUNGEONS) {
      const dd = D.DUNGEONS[id];
      const [x, y] = id === 'coracao_cauda' ? dd.at : freeNear(w, dd.at[0], dd.at[1], 3);
      clearArea(w, x - 2, y - 2, x + 2, y + 1);
      if (id === 'coracao_cauda') for (let yy = y - 3; yy <= y + 3; yy++) for (let xx = x - 3; xx <= x + 3; xx++) w.tile[idx(xx, yy)] = T.ASH;
      const o = addObj(w, 'entrance', x, y, { dg: id, theme: dd.theme, w: 2, h: 1 });
      w.dungeons[id] = { x, y, o };
    }
    for (const id in D.ALTARS) {
      const [x, y] = freeNear(w, D.ALTARS[id].at[0], D.ALTARS[id].at[1], 2);
      clearArea(w, x - 2, y - 2, x + 2, y + 1);
      w.altars[id] = { x, y, o: addObj(w, 'altar', x, y, { altar: id }) };
    }
    // baús perdidos e fogueiras de acampamento
    for (let k = 0; k < 46; k++) {
      const x = rng.int(12, N - 12), y = rng.int(12, N - 12), i = idx(x, y);
      if (w.town[i] || BLOCK_T[w.tile[i]] || w.grid[i] >= 0 || w.tile[i] === T.SHALLOW || w.tile[i] === T.RIVER) continue;
      if (w.reg[i] === RIDX.cratera && Math.hypot(x - C[0], y - C[1]) > 21) continue;
      addObj(w, 'chest', x, y, { lvlReg: D.REGION_ORDER[w.reg[i]], locked: rng.chance(0.35), cid: 'w' + k });
      if (rng.chance(0.5)) { const [fx, fy] = freeNear(w, x + 2, y + 1, 2); addObj(w, 'campfire', fx, fy, {}); }
    }
    // ---------- grupos de monstros ----------
    const cell = 11;
    for (let cy = 0; cy < N; cy += cell) for (let cx = 0; cx < N; cx += cell) {
      if (!rng.chance(0.42)) continue;
      const x = cx + rng.int(1, cell - 2), y = cy + rng.int(1, cell - 2);
      if (x < 4 || y < 4 || x >= N - 4 || y >= N - 4) continue;
      const i = idx(x, y);
      if (BLOCK_T[w.tile[i]] || w.tile[i] === T.SHALLOW || w.town[i]) continue;
      let nearTown = false;
      for (const c in w.cities) { const cc = w.cities[c]; if (Math.abs(x - cc.cx) < cc.w / 2 + 10 && Math.abs(y - cc.cy) < cc.h / 2 + 10) nearTown = true; }
      if (nearTown) continue;
      const rg = D.REGION_ORDER[w.reg[i]], R = D.REGIONS[rg];
      if (rg === 'cratera' && Math.hypot(x - C[0], y - C[1]) > 21) continue;
      const mon = pickW(R.mons, rng);
      const nMax = mon === 'bandido' || mon === 'lobo' || mon === 'lobo_neve' || mon === 'pirata' || mon === 'afogado' || mon === 'urubu' ? 4 : 3;
      const lvl = rng.int(R.lvl[0], R.lvl[1]);
      const list = [];
      for (let k = rng.int(1, nMax); k > 0; k--) list.push(k === 1 && R.mons.bandido_arq && mon === 'bandido' ? 'bandido_arq' : k === 1 && mon === 'cangaceiro' ? 'cangaceiro_arq' : mon);
      if (rng.chance(0.08)) list.push('elite:' + mon);
      w.spawns.push({ x, y, list, lvl, rg, id: w.spawns.length });
    }
    // os únicos
    const uniq = [['saci', 192, 252, 4], ['escorpiao_rei', 272, 184, 14], ['mapinguari', 40, 96, 18]];
    for (const [mon, ux, uy, lvl] of uniq) { const [x, y] = freeNear(w, ux, uy, 4); w.spawns.push({ x, y, list: [mon], lvl, rg: D.REGION_ORDER[w.reg[idx(x, y)]], id: w.spawns.length, unique: mon }); }
    // bloqueio final
    for (let i = 0; i < n; i++) if (BLOCK_T[w.tile[i]]) w.block[i] = 1;
    for (const o of w.objs) if (!o.gone) markBlock(w, o);
    return w;
  };
  function pickW(weights, rng) {
    let tot = 0; for (const k in weights) tot += weights[k];
    let r = rng.next() * tot; for (const k in weights) { r -= weights[k]; if (r <= 0) return k; }
    return Object.keys(weights)[0];
  }
  W.pickW = pickW;
  function nearRoad(w, x, y) {
    const N = w.N;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const t = w.tile[(y + dy) * N + x + dx]; if (t === T.ROAD || t === T.BOARD) return true; }
    return false;
  }
  // que tiles um objeto bloqueia
  const OBJ_BLOCK = { broad: 1, nobre: 1, arau: 1, mangue: 1, cacto: 1, rock: 1, ore: 1, building: 1, altar: 1, marco: 1, poco: 1, barril: 1, caixa: 1, banca: 1, quadro: 1, entrance: 1, chest: 1, lamp: 1, wallTower: 1 };
  W.OBJ_BLOCK = OBJ_BLOCK;
  function addObj(w, k, x, y, props) {
    const o = Object.assign({ k, x, y, id: w.objs.length }, props || {});
    w.objs.push(o);
    const N = w.N, ow = o.w || 1, oh = o.h || 1;
    for (let yy = y - oh + 1; yy <= y; yy++) for (let xx = x; xx < x + ow; xx++) if (xx >= 0 && yy >= 0 && xx < N && yy < N) w.grid[yy * N + xx] = o.id;
    return o;
  }
  W.addObj = addObj;
  function markBlock(w, o) {
    if (!OBJ_BLOCK[o.k]) return;
    const N = w.N, ow = o.w || 1, oh = o.h || 1;
    for (let yy = o.y - oh + 1; yy <= o.y; yy++) for (let xx = o.x; xx < o.x + ow; xx++) if (xx >= 0 && yy >= 0 && xx < N && yy < N) w.block[yy * N + xx] = 1;
  }
  W.markBlock = markBlock;
  W.removeObj = function (w, o) {
    o.gone = true;
    const N = w.N, ow = o.w || 1, oh = o.h || 1;
    for (let yy = o.y - oh + 1; yy <= o.y; yy++) for (let xx = o.x; xx < o.x + ow; xx++) { const i = yy * N + xx; if (w.grid[i] === o.id) w.grid[i] = -1; w.block[i] = BLOCK_T[w.tile[i]]; }
  };
  function clearArea(w, x0, y0, x1, y1) {
    const N = w.N;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * N + x; const o = w.grid[i];
      if (o >= 0 && !w.objs[o].gone && w.objs[o].k !== 'building') { w.objs[o].gone = true; w.grid[i] = -1; }
      if (BLOCK_T[w.tile[i]] && w.tile[i] !== T.WALL) w.tile[i] = T.GRASS;
    }
  }
  W.clearArea = clearArea;
  function freeNear(w, x, y, r) {
    const N = w.N;
    for (let rr = 0; rr < 30; rr++) for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 3 || yy < 3 || xx >= N - 3 || yy >= N - 3) continue;
      const i = yy * N + xx, t = w.tile[i];
      if (BLOCK_T[t] || t === T.SHALLOW || t === T.RIVER || w.town[i] || w.grid[i] >= 0) continue;
      return [xx, yy];
    }
    return [x, y];
  }
  W.freeNear = freeNear;
  // A* em tiles (4 vizinhos), com custo por tipo
  function astar(w, sx, sy, gx, gy, cost) {
    const N = w.N, n = N * N, g = new Float32Array(n).fill(1e9), from = new Int32Array(n).fill(-1), done = new Uint8Array(n);
    const h = new G.Heap(), s = sy * N + sx, goal = gy * N + gx;
    g[s] = 0; h.push(0, s);
    while (h.size()) {
      const cur = h.pop();
      if (cur === goal) break;
      if (done[cur]) continue; done[cur] = 1;
      const cx = cur % N, cy = (cur / N) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = cx + dx, y = cy + dy; if (x < 1 || y < 1 || x >= N - 1 || y >= N - 1) continue;
        const i = y * N + x, c = cost(w.tile[i]); if (!c) continue;
        const ng = g[cur] + c + (G.hash2(x, y, 3) * 0.3);
        if (ng < g[i]) { g[i] = ng; from[i] = cur; h.push(ng + (Math.abs(gx - x) + Math.abs(gy - y)) * 0.9, i); }
      }
    }
    if (from[goal] < 0) return null;
    const out = []; for (let c = goal; c !== s && c >= 0; c = from[c]) out.push(c);
    return out;
  }
  W.astar = astar;

  // ---------- consultas ----------
  W.blocked = function (w, x, y) {
    const N = w.N; x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= N || y >= N) return true;
    return w.block[y * N + x] === 1;
  };
  W.speedAt = function (w, x, y) { const i = Math.floor(y) * w.N + Math.floor(x); return SLOW_T[w.tile[i]] || 1; };
  W.regionAt = function (w, x, y) { return D.REGION_ORDER[w.reg[Math.floor(y) * w.N + Math.floor(x)]] || 'campo'; };
  W.objAt = function (w, x, y) { const o = w.grid[Math.floor(y) * w.N + Math.floor(x)]; return o >= 0 && !w.objs[o].gone ? w.objs[o] : null; };
  W.isWater = function (w, x, y) { const t = w.tile[Math.floor(y) * w.N + Math.floor(x)]; return t === T.DEEP || t === T.SHALLOW || t === T.RIVER; };
  W.cityAt = function (w, x, y) {
    for (const id in w.cities) { const c = w.cities[id]; if (x >= c.x0 - 2 && x <= c.x1 + 2 && y >= c.y0 - 2 && y <= c.y1 + 2) return id; }
    return null;
  };
})(globalThis.G = globalThis.G || {});
