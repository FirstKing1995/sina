/* SINA · as cidades: chão, muralha com portões onde a estrada passa, ruas, praça com o Marco da Sina,
   e os prédios em fileiras (templo, estalagem, ferreiro, mercado, alquimista, mago e as casas). */
(function (G) {
  'use strict';
  const D = G.D, W = G.World, T = W.T;
  const Town = G.Town = {};
  const SIZE = { templo: [5, 4], estalagem: [5, 3], ferreiro: [4, 3], alquimista: [4, 3], mago: [4, 3], mercado: [4, 3], casa: [2, 2] };
  const HOUSE = { madeira: 'barro', mata: 'oca', pedra: 'pedra', barro: 'barro', capital: 'pedra', palafita: 'palafita' };
  Town.HOUSE = HOUSE;

  Town.stamp = function (w, id, rng) {
    const c = D.CITIES[id], N = w.N;
    const cx = c.at[0], cy = c.at[1];
    const x0 = cx - Math.floor(c.w / 2), x1 = x0 + c.w - 1, y0 = cy - Math.floor(c.h / 2), y1 = y0 + c.h - 1;
    const st = c.style;
    const ground = st === 'pedra' || st === 'capital' ? T.PAVE : st === 'barro' ? T.DRY : st === 'palafita' ? T.MUD : T.GRASS;
    const street = st === 'pedra' || st === 'capital' ? T.PAVE : st === 'palafita' ? T.BOARD : T.ROAD;
    const gates = [];
    const idx = (x, y) => y * N + x;
    // onde a estrada cruza a borda vira portão
    for (let x = x0; x <= x1; x++) for (const y of [y0, y1]) { const t = w.tile[idx(x, y)]; if (t === T.ROAD || t === T.BOARD) gates.push([x, y]); }
    for (let y = y0; y <= y1; y++) for (const x of [x0, x1]) { const t = w.tile[idx(x, y)]; if (t === T.ROAD || t === T.BOARD) gates.push([x, y]); }
    if (!gates.length) gates.push([cx, y1]);
    // limpa e pinta o chão
    for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) {
      const i = idx(x, y), t = w.tile[i];
      const o = w.grid[i]; if (o >= 0) { w.objs[o].gone = true; w.grid[i] = -1; }
      const inside = x >= x0 && x <= x1 && y >= y0 && y <= y1;
      if (inside) {
        w.town[i] = 1;
        w.tile[i] = t === T.DEEP ? T.BOARD : (t === T.RIVER || t === T.SHALLOW) ? t : ground;
      } else if (W.BLOCK_T[t] || t === T.DEEP) w.tile[i] = t === T.DEEP ? T.BOARD : T.GRASS;
    }
    // ruas principais e praça
    const paint = (x, y, t) => { const i = idx(x, y); w.tile[i] = w.tile[i] === T.RIVER || w.tile[i] === T.SHALLOW ? T.BOARD : t; };
    for (let x = x0; x <= x1; x++) for (let y = cy - 1; y <= cy + 1; y++) paint(x, y, street);
    for (let y = y0; y <= y1; y++) for (let x = cx - 1; x <= cx + 1; x++) paint(x, y, street);
    for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 6; x <= cx + 6; x++) w.tile[idx(x, y)] = st === 'barro' || st === 'madeira' || st === 'mata' ? T.PAVE : street;
    // muralha
    if (c.walls) {
      for (let x = x0; x <= x1; x++) { w.tile[idx(x, y0)] = T.WALL; w.tile[idx(x, y1)] = T.WALL; }
      for (let y = y0; y <= y1; y++) { w.tile[idx(x0, y)] = T.WALL; w.tile[idx(x1, y)] = T.WALL; }
      for (const [gx, gy] of gates) for (let d = -2; d <= 2; d++) {
        const horiz = gy === y0 || gy === y1;
        const x = horiz ? gx + d : gx, y = horiz ? gy : gy + d;
        if (x >= x0 && x <= x1 && y >= y0 && y <= y1 && !((x === x0 || x === x1) && (y === y0 || y === y1))) w.tile[idx(x, y)] = street;
      }
    }
    // prédios
    const roles = new Set(); let templo = false;
    for (const nid in D.NPCS) { const n = D.NPCS[nid]; if (n.city !== id) continue; if (SIZE[n.spot] && n.spot !== 'casa') roles.add(n.spot); if (n.spot === 'templo') templo = true; }
    const need = []; if (templo) need.push('templo');
    for (const r of ['estalagem', 'ferreiro', 'mercado', 'alquimista', 'mago']) if (roles.has(r)) need.push(r);
    const reserved = new Uint8Array(N * N);
    const city = w.cities[id] = { id, x0, y0, x1, y1, cx, cy, w: c.w, h: c.h, spots: {}, houses: [], gates, style: st, marco: [cx, cy + 1] };
    const free = (bx, by, bw, bh) => {
      if (bx < x0 + 2 || bx + bw - 1 > x1 - 2 || by - bh + 1 < y0 + 2 || by + 1 > y1 - 1) return false;
      for (let y = by - bh + 1; y <= by + 1; y++) for (let x = bx - 1; x <= bx + bw; x++) {
        const i = idx(x, y);
        if (reserved[i] || w.tile[i] === T.WALL || w.tile[i] === T.RIVER || w.tile[i] === T.SHALLOW) return false;
        if (x >= cx - 1 && x <= cx + 1) return false;   // a rua vertical
        if (y >= cy - 1 && y <= cy + 1) return false;   // a rua horizontal
        if (y >= cy - 3 && y <= cy + 3 && x >= cx - 6 && x <= cx + 6) return false;   // a praça
      }
      return true;
    };
    const place = (kind, bx, by) => {
      const [bw, bh] = SIZE[kind];
      for (let y = by - bh + 1; y <= by; y++) for (let x = bx; x < bx + bw; x++) reserved[idx(x, y)] = 1;
      for (let x = bx - 1; x <= bx + bw; x++) reserved[idx(x, by + 1)] = 1;   // a frente fica livre
      const o = W.addObj(w, 'building', bx, by, { kind, style: kind === 'casa' ? HOUSE[st] : st, w: bw, h: bh, city: id });
      const door = [bx + Math.floor(bw / 2), by + 1];
      if (kind === 'casa') city.houses.push(door); else city.spots[kind] = door;
      // a rua de terra na frente da porta
      if (w.tile[idx(door[0], door[1])] === ground && ground !== T.PAVE) w.tile[idx(door[0], door[1])] = street;
      return o;
    };
    // fileiras: bottom (linha de baixo do prédio). Ao norte da rua: as portas dão para a praça; ao sul, descem
    const strips = [];
    for (let b = cy - 4; b - 1 > y0 + 2; b -= 5) strips.push(b);
    for (let b = cy + 5; b + 1 < y1 - 1; b += 5) strips.push(b);
    strips.sort((a, b) => Math.abs(a - cy) - Math.abs(b - cy));
    // primeiro os prédios de ofício, o mais perto possível da praça; depois as casas onde couber
    for (const kind of need) {
      const [bw, bh] = SIZE[kind];
      let done = false;
      for (const by of strips) {
        for (let d = 3; d < c.w / 2 && !done; d++) for (const side of [-1, 1]) {
          const bx = side < 0 ? cx - d - bw + 1 : cx + d;
          if (!done && free(bx, by, bw, bh)) { place(kind, bx, by); done = true; }
        }
        if (done) break;
      }
    }
    for (const by of strips) for (let x = x0 + 2; x < x1 - 2; x++) {
      if (free(x, by, 2, 2) && rng.chance(0.75)) { place('casa', x, by); x += 2; }
    }
    // praça: marco, poço, quadro de avisos, bancas
    W.addObj(w, 'marco', cx, cy - 1, { city: id });
    W.addObj(w, 'poco', cx + 4, cy - 1, {});
    W.addObj(w, 'quadro', cx - 4, cy - 1, { city: id });
    city.spots.quadro = [cx - 4, cy];
    city.spots.praca = [cx + 2, cy + 2];
    if (city.spots.mercado) { const [mx, my] = city.spots.mercado; void mx; void my; }
    W.addObj(w, 'banca', cx - 5, cy + 3, { col: ['#c8423a', '#2a4a6e', '#40723e'][rng.int(0, 2)], w: 2 });
    W.addObj(w, 'banca', cx + 4, cy + 3, { col: ['#eaaa3c', '#a8587a', '#3a86a8'][rng.int(0, 2)], w: 2 });
    // portão: onde a guarda fica
    const g0 = gates.slice().sort((a, b) => b[1] - a[1])[0];
    city.spots.portao = [g0[0] + (g0[0] === cx ? 2 : 0), Math.min(y1 - 1, Math.max(y0 + 1, g0[1] + (g0[1] === y1 ? -1 : g0[1] === y0 ? 1 : 0)))];
    // postes de luz, barris, caixas e árvores
    for (let x = x0 + 3; x < x1 - 2; x += 7) for (const y of [cy - 2, cy + 2]) { const i = idx(x, y); if (!reserved[i] && w.grid[i] < 0 && Math.abs(x - cx) > 6) W.addObj(w, 'lamp', x, y, {}); }
    for (let y = y0 + 3; y < y1 - 2; y += 7) for (const x of [cx - 2, cx + 2]) { const i = idx(x, y); if (!reserved[i] && w.grid[i] < 0 && Math.abs(y - cy) > 3) W.addObj(w, 'lamp', x, y, {}); }
    for (let k = 0; k < c.w; k++) {
      const x = rng.int(x0 + 2, x1 - 2), y = rng.int(y0 + 2, y1 - 2), i = idx(x, y);
      if (reserved[i] || w.grid[i] >= 0 || w.tile[i] === street || w.tile[i] === T.WALL || w.tile[i] === T.RIVER || w.tile[i] === T.SHALLOW) continue;
      if (Math.abs(x - cx) <= 2 || Math.abs(y - cy) <= 3) continue;
      const kk = st === 'mata' ? (rng.chance(0.6) ? 'nobre' : 'bush') : rng.chance(0.4) ? 'barril' : rng.chance(0.5) ? 'caixa' : 'bush';
      W.addObj(w, kk, x, y, { v: rng.int(0, 2) });
    }
    return city;
  };
})(globalThis.G = globalThis.G || {});
