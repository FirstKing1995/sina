/* SINA · o mundo em áreas. Grade de blocos de 16 px: 0 vazio, 1 terra, 2 galho (dá para atravessar por baixo), 3 espinho.
   Cada área é montada por um construtor com semente fixa: o mapa é sempre o mesmo, e dá para voltar a qualquer lugar. */
(function () {
  'use strict';
  const F = window.Fase = {};
  const T = (F.T = 16), H = (F.H = 46);
  const areas = {};
  F.W = 0; F.grade = null; F.atual = null;
  F.tile = (tx, ty) => { if (tx < 0 || tx >= F.W) return 1; if (ty < 0) return 0; if (ty >= H) return 1; return F.grade[ty * F.W + tx]; };
  F.poe = (tx, ty, v) => { if (tx >= 0 && ty >= 0 && tx < F.W && ty < H) F.grade[ty * F.W + tx] = v; };

  function sorte(semente) { let s = semente >>> 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---------- construtor ----------
  function Obra(id, regiao, W, semente) {
    const g = new Uint8Array(W * H), r = sorte(semente);
    const a = { id, regiao, W, grade: g, topo: new Int16Array(W).fill(H), inimigos: [], coleta: [], fogos: [], portas: [], decor: [], placas: [], circulos: [], marcos: [], pecas: [], baus: [], escuros: [], fracas: [], zonas: [], emboscadas: [], obras: [], arena: null, inicio: null, nome: null };
    let x = 0, y = 30;
    const set = (tx, ty, v) => { if (tx >= 0 && ty >= 0 && tx < W && ty < H) g[ty * W + tx] = v; };
    const coluna = (tx, ty) => { for (let k = ty; k < H; k++) set(tx, k, 1); if (tx >= 0 && tx < W) a.topo[tx] = ty; };
    const px = (tx) => tx * T + 8;
    const o = {
      a, r,
      get x() { return x; }, get y() { return y; }, set y(v) { y = v; },
      ent: (m, n) => m + Math.floor(r() * (n - m + 1)),
      um: (l) => l[Math.floor(r() * l.length)],
      plano(n) { for (let i = 0; i < n; i++) coluna(x++, y); return o; },
      ondula(n) { let resta = n; while (resta > 0) { const k = Math.min(resta, o.ent(4, 9)); o.plano(k); resta -= k; if (resta > 0) { const d = r() < 0.5 ? -1 : 1; if (y + d > 22 && y + d < 36) y += d; } } return o; },
      sobe(n) { for (let i = 0; i < n; i++) { if (y > 16) y--; o.plano(o.ent(2, 3)); } return o; },
      desce(n) { for (let i = 0; i < n; i++) { if (y < 37) y++; o.plano(o.ent(2, 3)); } return o; },
      muro(h, larg) { if (y - h >= 10) y -= h; o.plano(larg || 4); return o; },
      queda(h) { if (y + h <= 37) y += h; return o; },
      galho(tx, ty, w) { for (let i = 0; i < w; i++) if (tx + i < W && g[ty * W + tx + i] === 0) set(tx + i, ty, 2); return o; },
      // vão com espinhos no fundo
      vao(w, comGalho) {
        const x0 = x;
        for (let i = 0; i < w; i++) { coluna(x, y + 6); set(x, y + 5, 3); x++; }
        if (comGalho) { const passo = 6; for (let k = 2; k + 3 <= w - 1; k += passo) o.galho(x0 + k, y - o.ent(0, 2), 3); }
        return o;
      },
      // subida por galhos até um platô alto
      escada(h) {
        if (y - h < 13) h = Math.max(3, y - 13);
        const x0 = x; let yy = y; o.plano(o.ent(8, 10)); let lado = 0;
        for (let k = 3; k < h; k += 3) { o.galho(x0 + 1 + lado * 4, yy - k, 4); lado = 1 - lado; }
        o.galho(x0 + 1 + lado * 4, yy - h + 1, 4);
        y -= h; return o;
      },
      enf(n, dx, camada, esc) { a.decor.push({ n, x: px(x + (dx || 0)), y: y * T, c: camada || 0, e: esc || 1, v: r() < 0.5 }); return o; },
      pega(m, dx) { const tx = x + (dx || -2); a.coleta.push({ id: a.id + a.coleta.length, m, x: px(tx), tx }); return o; },
      pegaAlto(m, tx, ty) { a.coleta.push({ id: a.id + a.coleta.length, m, x: px(tx), y: ty * T, tx }); return o; },
      bicho(t, dx) { const tx = x + (dx || -3); a.inimigos.push({ t, x: px(tx), tx }); return o; },
      fogo(nome) { a.fogos.push({ id: a.id + '_f' + a.fogos.length, nome, x: px(x - 3), tx: x - 3 }); return o; },
      porta(id, para, nome, desenho, dx) { const tx = x + (dx == null ? -4 : dx); a.portas.push({ id, para, nome, d: desenho || 'caverna', x: px(tx), tx }); return o; },
      placa(dica, dx) { a.placas.push({ dica, x: px(x + (dx || 0)) }); return o; },
      circulo(magia, dx) { a.circulos.push({ magia, x: px(x + (dx || -5)), tx: x + (dx || -5) }); return o; },
      // emboscada: as saídas fecham e as ondas vêm uma depois da outra
      embosca(ondas, larg) { const x0 = x; o.plano(larg || 46); a.emboscadas.push({ id: a.id + '_e' + a.emboscadas.length, x0: x0 * T, x1: x * T, piso: y * T, ondas }); return o; },
      // ---------- lugares ----------
      zona(nome, luz) { a.zonas.push({ tx: x, nome, luz: luz || [1, 1, 1] }); return o; },
      marco(n, nome, texto, dx, e) { const tx = x + (dx || -6); a.marcos.push({ id: a.id + '_m' + a.marcos.length, n, nome, texto, x: px(tx), tx, e: e || 1 }); return o; },
      peca(n, dx, e, v) { a.pecas.push({ n, x: px(x + dx), e: e || 1, v }); return o; },
      bau(dx, loot, ty) { const tx = x + dx; a.baus.push({ id: a.id + '_b' + a.baus.length, x: px(tx), tx, y: ty == null ? null : ty * T, loot: loot || null }); return o; },
      // gruta: um túnel escuro, com teto de pedra
      gruta(n, f) {
        if (y < 23) o.queda(23 - y); o.plano(6); const x0 = x, yy = y; o.plano(n);
        for (let tx = x0; tx < x0 + n; tx++) { const borda = Math.min(tx - x0, x0 + n - 1 - tx), alto = borda < 2 ? 3 : 0; for (let ty = yy - 14 + alto + Math.floor(r() * 2); ty <= yy - 7 - (r() < 0.25 && borda > 3 ? 1 : 0); ty++) set(tx, ty, 1); if (borda > 3 && r() < 0.12) set(tx, yy - 6, 1); }
        a.escuros.push({ x0: (x0 + 1) * T, x1: (x0 + n - 1) * T, y0: (yy - 7) * T, y1: yy * T });
        for (let k = 4; k < n - 4; k += 5 + Math.floor(r() * 4)) a.decor.push({ n: r() < 0.6 ? 'cogumelos' : 'ossos', x: px(x0 + k), y: 0, c: 1, e: 0.9, v: r() < 0.5 });
        if (f) f(x0, n); return o.plano(6);
      },
      // chão oco: três blocos rachados escondem uma câmara com baú
      secreto(loot) {
        if (y > 35) o.muro(3, 4);
        const x0 = x, yy = y; o.plano(14);
        for (let tx = x0 + 2; tx < x0 + 11; tx++) for (let k = 2; k <= 5; k++) set(tx, yy + k, 0);
        a.fracas.push({ id: a.id + '_c' + a.fracas.length, c0: x0 + 6, c1: x0 + 8, y0: yy, y1: yy + 1 });
        for (let i = 0; i < 3; i++) set(x0 + 2 + i, yy + 4, 2);
        a.escuros.push({ x0: (x0 + 2) * T, x1: (x0 + 11) * T, y0: (yy + 2) * T, y1: (yy + 6) * T, oco: true });
        a.baus.push({ id: a.id + '_b' + a.baus.length, x: px(x0 + 9), tx: x0 + 9, y: (yy + 6) * T, loot: loot || null });
        return o.plano(3);
      },
      // ruína: escada de pedra quebrada com um baú lá em cima
      ruina(nome, texto, loot) {
        if (y < 25) o.queda(25 - y).plano(4);
        const x0 = x, yy = y, mina = a.regiao === 'minas'; o.plano(26); o.marco(mina ? 'elevador' : 'torre', nome, texto, -9);
        o.galho(x0 + 4, yy - 4, 4).galho(x0 + 9, yy - 8, 4).galho(x0 + 4, yy - 12, 5);
        if (!mina) a.decor.push({ n: 'pilar', x: px(x0 + 3), y: 0, c: 0, e: 1 }, { n: 'pilar', x: px(x0 + 13), y: 0, c: 0, e: 0.9 });
        a.baus.push({ id: a.id + '_b' + a.baus.length, x: px(x0 + 6), tx: x0 + 6, y: (yy - 12) * T, loot: loot || null });
        return o.plano(4);
      },
      // acampamento: gente da espécie em volta de um baú
      acampa(esp, k, nome, texto, loot) {
        const x0 = x; o.plano(36); o.marco(esp === 'goblin' ? 'tenda' : esp === 'zumbi' ? 'mausoleu' : esp === 'lobo' ? 'costela' : 'caveiras', nome, texto, -24);
        a.marcos[a.marcos.length - 1].acampa = true;
        o.peca('tocha', -30).peca('tocha', -8).peca(esp === 'goblin' ? 'gaiola' : 'caveiras', -13, 1, true);
        if (esp === 'goblin') o.peca('tenda', -17, 0.85, true);
        for (let i = 0; i < 5; i++) o.bicho(varia(esp, Math.min(1, k + 0.15), r), -30 + i * 5);
        return o.bau(-19, loot);
      },
      fim() { while (x < W) coluna(x++, y - (x > W - 4 ? 14 : 0)); for (let i = 0; i < 2; i++) for (let k = 0; k < H; k++) set(i, k, 1); acaba(a, r); return a; },
    };
    return o;
  }
  // assenta tudo no chão de verdade e espalha os enfeites
  function acaba(a, r) {
    const W = a.W, chao = (tx) => a.topo[Math.max(0, Math.min(W - 1, tx))] * T;
    for (const l of [a.inimigos, a.coleta, a.fogos, a.portas, a.circulos, a.marcos, a.baus]) for (const o of l) { if (o.y == null) o.y = chao(o.tx); }
    for (const p of a.placas) p.y = chao(Math.floor(p.x / T));
    for (const d of a.decor) d.y = chao(Math.floor(d.x / T));
    for (const d of a.pecas) d.y = chao(Math.floor(d.x / T));
    const dentro = (x) => a.escuros.some((q) => x > q.x0 - 30 && x < q.x1 + 30);
    const livre = (tx, larg) => { const y0 = a.topo[tx]; for (let k = -larg; k <= larg; k++) { const t = a.topo[Math.max(0, Math.min(W - 1, tx + k))]; if (Math.abs(t - y0) > 1) return false; } return true; };
    const perto = (x, l, d) => l.some((o) => Math.abs(o.x - x) < d);
    const PLANTAS = { vale: ['samambaia', 'planta', 'pedras', 'frutas', 'tronco', 'planta'],  floresta: ['samambaia', 'planta', 'cogumelos', 'pedras', 'tronco', 'frutas'], lobos: ['pedras', 'pedrao', 'galhada', 'samambaia', 'ossos'], cobras: ['planta', 'samambaia', 'ninho', 'cogumelos', 'tronco', 'planta'], zumbis: ['lapide', 'lapide', 'ossos2', 'galhada', 'pilar', 'cogumelos'], goblins: ['totem', 'ossos', 'galhada', 'pedras', 'pedrao', 'ossos2'], minas: ['pedras', 'pedrao', 'ossos', 'pedras', 'ossos2', 'tronco'], mangue: ['planta', 'samambaia', 'tronco', 'pedras', 'ossos', 'planta'], ruinas: ['pedras', 'pedrao', 'ossos2', 'pedras', 'pilar', 'ossos'], forno: ['pedras', 'ossos', 'pedras', 'ossos2', 'tronco', 'pedrao'] }[a.regiao];
    for (let tx = 4; tx < W - 4; tx += 2 + Math.floor(r() * 4)) {
      const x = tx * T + 8;
      if (perto(x, a.portas, 110) || perto(x, a.circulos, 100) || perto(x, a.fogos, 46) || perto(x, a.coleta, 26) || perto(x, a.baus, 34)) continue;
      const k = r();
      if (a.semMata && k < 0.5 && tx > a.semMata[0] && tx < a.semMata[1]) continue;
      if (k < 0.16 && (dentro(x) || perto(x, a.marcos, 120))) continue;
      if (dentro(x) && k > 0.5) continue;
      if (k < 0.16 && livre(tx, 4) && a.regiao !== 'minas' && a.regiao !== 'ruinas' && a.regiao !== 'forno') a.decor.push({ n: r() < (a.regiao === 'floresta' || a.regiao === 'cobras' || a.regiao === 'vale' ? 0.55 : 0.25) ? 'arvorao' : 'arvore', x, y: chao(tx) + 3, c: 0, e: 0.85 + r() * 0.3, v: r() < 0.5 });
      else if (k < 0.62 && livre(tx, 1)) { const n = PLANTAS[Math.floor(r() * PLANTAS.length)]; a.decor.push({ n, x, y: chao(tx) + 2, c: 1, e: 0.8 + r() * 0.35, v: r() < 0.5 }); }
      else if (k < 0.7 && livre(tx, 1)) a.decor.push({ n: r() < 0.5 ? 'samambaia' : 'planta', x, y: chao(tx) + 10, c: 2, e: 1.3 + r() * 0.5, v: r() < 0.5 });
    }
    a.decor.sort((p, q) => p.c - q.c);
  }

  // quem aparece de cada espécie, conforme o quanto já se andou (k de 0 a 1)
  const VARIA = {
    mutante: [['fundido', 0, 1], ['queimado', 0, 0.8], ['sentinela', 0.45, 0.25]],
    barro: [['boneco', 0, 1], ['pote', 0, 0.8], ['guardiao', 0.45, 0.22]],
    mare: [['caranguejo', 0, 1], ['afogado', 0.1, 0.6], ['guaiamum', 0.45, 0.22]],
    pedra: [['rastejante', 0, 1], ['minerador', 0.12, 0.6], ['golem', 0.3, 0.42], ['golem_ferro', 0.55, 0.2]],
    lobo: [['lobo', 0, 1], ['lobo_negro', 0.22, 0.42], ['lobo_rubro', 0.4, 0.24]],
    cobra: [['cobra', 0, 1], ['cobra_coral', 0.18, 0.4], ['cobra_cuspe', 0.28, 0.4], ['cobra_prata', 0.45, 0.28]],
    zumbi: [['zumbi', 0, 1], ['zumbi_mulher', 0.14, 0.42], ['zumbi_machado', 0.3, 0.32], ['zumbi_lanca', 0.36, 0.36], ['zumbi_inchado', 0.5, 0.18]],
    goblin: [['goblin', 0, 1], ['goblin_pedra', 0.1, 0.3], ['goblin_arco', 0.22, 0.36], ['goblin_guerreiro', 0.34, 0.36], ['goblin_xama', 0.46, 0.2], ['goblin_porrete', 0.5, 0.22]],
  };
  function varia(esp, k, r) { const l = VARIA[esp].filter((v) => k >= v[1]); let t = 0; for (const v of l) t += v[2]; let q = r() * t; for (const v of l) { q -= v[2]; if (q <= 0) return v[0]; } return l[0][0]; }
  F.varia = varia;

  // ---------- Floresta Antiga ----------
  function floresta() {
    const o = Obra('floresta', 'floresta', 2350, 7);
    o.zona('Mata do Barro'); o.plano(16); o.a.inicio = { x: 15 * T };
    o.a.decor.push({ n: 'barro', x: 13 * T, y: 0, c: 0, e: 1 });
    o.plano(8).placa('andar').ondula(14).pega('galho').plano(6).placa('colher', -4).pega('folha').ondula(10).pega('galho').pega('pedra', -6).plano(6).pega('fibra').ondula(10).pega('galho').placa('criar').pega('folha', -7);
    o.sobe(2).plano(8).pega('fruta').plano(6).pega('fibra').desce(2).ondula(12).pega('pedra').pega('folha', -8);
    // primeiro perigo
    o.plano(14).placa('golpe', -12).bicho('lobo').ondula(10).pega('folha').pega('galho', -6).vao(5).plano(10).pega('fruta').muro(3, 6).pega('pedra').queda(3).plano(12).bicho('cobra').pega('fibra', -9);
    o.escada(10).plano(10).pega('erva').pega('fruta', -6).placa('baixo', -8).desce(3).vao(8, true).plano(9).bicho('lobo').pega('folha').ondula(16).bicho('lobo').pega('galho');
    o.muro(3, 5).muro(3, 6).pega('pedra').queda(4).plano(14).bicho('cobra').bicho('cobra', -8).vao(12, true).plano(12).pega('fibra').pega('folha', -7).ondula(18).bicho('lobo').bicho('lobo', -9).pega('fruta');
    o.plano(18).marco('estatua', 'As mãos que ficaram', 'Alguém esculpiu quem moldou você. As mãos de pedra estão vazias.', -9).plano(6);
    // primeira fogueira
    o.plano(20).fogo('Fogueira da Raiz Grande').placa('fogo', -8).placa('comer', 2).plano(8);
    o.ondula(20).bicho('goblin').pega('pedra').sobe(4).plano(10).bicho('lobo').pega('erva').vao(6).muro(2, 8).pega('galho').desce(4).plano(14).bicho('goblin').bicho('cobra', -9).pega('fibra');
    o.escada(13).plano(12).pega('galho').pega('fruta', -8).bicho('cobra').vao(14, true).plano(8).pega('erva').queda(5).plano(16).bicho('zumbi').placa('forte', -14).ondula(20).bicho('zumbi').pega('pedra').pega('folha', -9);
    o.vao(5).plano(6).vao(5).plano(6).vao(6).plano(14).bicho('lobo').bicho('lobo', -6).bicho('lobo', -10).pega('galho').ondula(20).pega('fibra').bicho('goblin');
    o.muro(3, 5).muro(4, 5).escada(9).plano(10).pega('pedra').bicho('goblin').galho(o.x - 8, o.y - 5, 5).pegaAlto('erva', o.x - 6, o.y - 5).queda(6).plano(6).queda(6).plano(16).bicho('cobra').bicho('cobra', -6).pega('folha');
    o.embosca([['lobo', 'lobo'], ['lobo', 'lobo', 'lobo_negro']], 46);
    o.secreto({ amu: 'olho' });
    o.zona('Ruínas Afundadas', [0.94, 1, 1.08]);
    // ruínas e o círculo
    o.ondula(16).enf('pilar', -10).plano(10).enf('arco', -4, 0).plano(12).enf('pilar', -4).plano(16).circulo('brasa', -7).plano(8).enf('pilar', -5).placa('magia').plano(10).enf('arco', -5, 0).ondula(14).bicho('zumbi').bicho('zumbi', -6);
    o.plano(14).fogo('Fogueira das Ruínas').plano(6).desce(3).ondula(24).bicho('lobo').bicho('lobo', -6).pega('fruta').pega('galho', -9).vao(10, true).plano(10).bicho('goblin').bicho('goblin', -5).pega('fibra');
    o.escada(12).plano(14).bicho('cobra').pega('erva').vao(16, true).plano(8).pega('pedra').queda(4).plano(14).bicho('zumbi').bicho('zumbi', -5).ondula(24).bicho('lobo').bicho('lobo', -5).bicho('lobo', -9).pega('folha');
    o.muro(2, 6).vao(6).muro(2, 6).vao(6).muro(2, 8).pega('fruta').queda(3).plano(10).bicho('goblin').queda(3).ondula(26).bicho('goblin').bicho('cobra', -8).pega('galho').pega('fibra', -5);
    o.vao(8, true).plano(12).bicho('zumbi').vao(9, true).plano(14).bicho('lobo').bicho('lobo', -7).pega('erva').ondula(20).pega('pedra').pega('galho', -8);
    // a mata fechada: longa, com variedades, emboscadas e três fogueiras até a clareira
    const PARADAS = [
      [1060, () => { o.zona('Mata Fechada', [0.8, 0.92, 0.86]); o.gruta(34, (x0) => { o.bicho('cobra_coral', -20).bicho('zumbi', -12).bicho('cobra', -8); o.bau(-5); }); }],
      [1120, () => o.plano(8).fogo('Fogueira do Tronco Caído').plano(8)],
      [1200, () => o.embosca([['cobra', 'cobra_coral', 'cobra'], ['cobra_coral', 'cobra_cuspe', 'cobra']], 46)],
      [1330, () => o.embosca([['zumbi', 'zumbi_mulher'], ['zumbi', 'zumbi', 'zumbi_machado']], 48)],
      [1270, () => o.ruina('Torre sem dono', 'Antes de você houve gente. Olhavam para longe e não viram o que vinha de perto.')],
      [1400, () => o.plano(8).fogo('Fogueira da Pedra Partida').plano(8)],
      [1540, () => o.embosca([['goblin', 'goblin', 'goblin_arco'], ['goblin_guerreiro', 'goblin', 'goblin_arco']], 50)],
      [1480, () => { o.zona('Charco Velho', [1.02, 1, 0.82]); o.plano(16).marco('poco', 'Poço mudo', 'A pedra que você joga não faz barulho no fundo.', -7).plano(4); }],
      [1600, () => o.acampa('goblin', 0.55, 'Acampamento das Orelhas', 'Eles contam as orelhas em voz alta, antes de dormir.')],
      [1650, () => o.plano(8).fogo('Fogueira do Barranco Velho').plano(8)],
      [1790, () => o.embosca([['lobo', 'lobo_negro', 'lobo'], ['lobo_rubro', 'lobo_negro'], ['lobo_rubro', 'lobo', 'lobo']], 54)],
      [1840, () => { o.zona('Beira da Clareira', [1.1, 1.05, 1]); o.secreto(); }],
      [1870, () => o.gruta(30, () => { o.bicho('zumbi_mulher', -18).bicho('zumbi', -12); o.bau(-5, { amu: 'brasa' }); })],
      [1900, () => o.plano(8).fogo('Última fogueira da mata').plano(8)],
    ];
    const ESP = ['lobo', 'cobra', 'zumbi', 'goblin'];
    let k = 0, par = 0;
    while (o.x < 2130) {
      if (par < PARADAS.length && o.x >= PARADAS[par][0]) { PARADAS[par++][1](); continue; }
      const q = (o.x / 2320) * 0.8, esp = o.um(ESP);
      if (o.y < 20) o.queda(4).plano(8);
      switch (k % 7) {
        case 1: o.vao(o.ent(5, 7)).plano(8); break;
        case 2: if (o.y > 24) o.sobe(o.ent(2, 4)); break;
        case 3: if (o.y > 27) o.escada(o.ent(7, 11)).plano(10); break;
        case 4: o.vao(o.ent(10, 15), true).plano(9); break;
        case 5: if (o.y < 33) o.queda(o.ent(3, 4)).plano(8); else o.sobe(3); break;
        case 6: if (o.y > 24) o.muro(o.ent(2, 4), 5).plano(6); break;
      }
      o.ondula(o.ent(14, 22)).bicho(varia(esp, q, o.r)).bicho(varia(esp, q, o.r), -8);
      if (o.r() < 0.45) o.bicho(varia(o.um(ESP), q, o.r), -13);
      o.pega(o.um(['galho', 'pedra', 'folha', 'fibra', 'fruta', 'galho'])); if (o.r() < 0.6) o.pega(o.um(['erva', 'fruta', 'pedra', 'fibra', 'madeira']), -9);
      k++;
    }
    // a clareira dos quatro caminhos
    o.y = 30; o.plano(10).placa('caminhos').fogo('Fogueira da Clareira').plano(22).enf('ossos', -13, 1).enf('placa', -11, 1).enf('ossos', 3, 1).porta('p_lobos', ['lobos', 'volta'], 'Serra dos Uivos').plano(24).enf('ninho', -13, 1).enf('placa', -11, 1).enf('ninho', 3, 1).porta('p_cobras', ['cobras', 'volta'], 'Alagado das Presas').plano(24).enf('lapide', -13, 1).enf('placa', -11, 1).enf('lapide', 3, 1).porta('p_zumbis', ['zumbis', 'volta'], 'Chão dos Enterrados', 'arco').plano(24).enf('totem', -13, 1).enf('placa', -11, 1).enf('totem', 3, 1).porta('p_goblins', ['goblins', 'volta'], 'Barrancos do Fortim').plano(24).enf('frutas', -12, 1).enf('placa', -10, 1).porta('p_vale', ['vale', 'volta'], 'Vale do Rio Manso', 'arco').plano(24).enf('pedrao', -13, 1).enf('placa', -11, 1).enf('pedras', 3, 1).porta('p_minas', ['minas', 'volta'], 'Minas de Ferro').plano(22).enf('tronco', -12, 1).enf('placa', -9, 1).porta('p_mangue', ['mangue', 'volta'], 'Mangue das Marés').plano(22).enf('pilar', -12, 1).enf('pedras', -8, 1).porta('p_ruinas', ['ruinas', 'volta'], 'Ruínas do Oleiro').plano(6);
    o.a.portas.find((p) => p.id === 'p_vale').precisa = 2; o.a.portas.find((p) => p.id === 'p_minas').precisa = 4; o.a.portas.find((p) => p.id === 'p_mangue').precisa = 5; o.a.portas.find((p) => p.id === 'p_ruinas').precisa = 6;
    return o.fim();
  }
  // ---------- um caminho ----------
  function caminho(id, semente, cfg) {
    const LAR = 1320, o = Obra(id, id, LAR, semente), esp = cfg.b;
    o.plano(14).porta('volta', cfg.entrada || ['floresta', 'p_' + id], cfg.entradaNome || 'Voltar à clareira', null, -7); o.a.inicio = { x: 10 * T };
    let k = 0, fogo = 0;
    let emb = 0, lug = 0;
    o.zona(cfg.zonas[0]);
    const q = () => o.x / LAR;
    const grupo = () => { const n = o.ent(2, cfg.bando); for (let i = 0; i < n; i++) o.bicho(o.r() < 0.9 ? varia(esp, q(), o.r) : varia(o.um(['lobo', 'cobra', 'zumbi', 'goblin']), q() * 0.6, o.r), -3 - i * 4); };
    const onda = (n) => { const l = []; for (let i = 0; i < n; i++) l.push(varia(esp, Math.min(1, q() + 0.12), o.r)); return l; };
    while (o.x < LAR - 84) {
      const tipo = o.um(cfg.terreno);
      if (tipo === 'ondula') o.ondula(o.ent(16, 26));
      else if (tipo === 'sobe') { if (o.y > 22) o.sobe(o.ent(3, 5)); o.plano(8); }
      else if (tipo === 'desce') { if (o.y < 34) o.desce(o.ent(3, 5)); o.plano(8); }
      else if (tipo === 'vao') { o.vao(o.ent(5, 7)); o.plano(o.ent(10, 14)); }
      else if (tipo === 'vaoG') { o.vao(o.ent(9, 15), true); o.plano(o.ent(10, 14)); }
      else if (tipo === 'escada') { if (o.y > 26) o.escada(o.ent(7, 11)); o.plano(12); }
      else if (tipo === 'muro') { if (o.y > 22) o.muro(o.ent(2, 4), 5); o.plano(10); }
      else if (tipo === 'queda') { if (o.y < 32) o.queda(o.ent(3, 4)); o.plano(12); }
      if (o.y < 20) { o.queda(5); o.plano(8); }
      grupo();
      o.pega(o.um(cfg.pega), -6); if (o.r() < 0.4) o.pega(o.um(['erva', 'fruta', 'galho']), -9);
      k++;
      if (k % 6 === 3) o.pega('madeira', -11);
      if (o.x > 300 && lug === 0) { o.acampa(esp, 0.3, cfg.lug[0], cfg.lug[1]); lug = 1; }
      if (o.x > 440 && lug === 1) { o.zona(cfg.zonas[1], cfg.zonas[2]); o.gruta(40, () => { for (let i = 0; i < 4; i++) o.bicho(varia(esp, q(), o.r), -32 + i * 7); o.bau(-5); }); lug = 2; }
      if (o.x > 700 && lug === 2) { o.ruina(cfg.lug[2], cfg.lug[3], cfg.amu ? { amu: cfg.amu } : null); lug = 3; }
      if (o.x > 900 && lug === 3) { o.zona(cfg.zonas[3], cfg.zonas[4]); o.secreto(); lug = 4; }
      if (o.x > 1040 && lug === 4) { o.acampa(esp, 0.8, cfg.lug[4], cfg.lug[5]); lug = 5; }
      if (o.x > 230 && fogo === 0) { o.plano(16).fogo(cfg.fogos[0]).plano(6); fogo = 1; }
      if (o.x > 380 && emb === 0) { o.embosca([onda(2), onda(3)], 46).plano(8); emb = 1; }
      if (o.x > 600 && fogo === 1) { o.plano(16).porta('meio', cfg.meio, cfg.meioNome, 'arco', -6).plano(8).plano(8).fogo(cfg.fogos[2]).plano(6); fogo = 2; }
      if (o.x > 800 && emb === 1) { o.embosca([onda(3), onda(3)], 48).plano(8); emb = 2; }
      if (o.x > 960 && fogo === 2) { o.plano(14).fogo(cfg.fogos[1]).plano(6); fogo = 3; }
      if (o.x > 1120 && emb === 2) { o.embosca([onda(3), onda(3), [cfg.elite, varia(esp, 1, o.r), window.Dados.TIPOS[cfg.b] ? cfg.b : cfg.outro ? cfg.outro[0] : VARIA[esp][0][0]]], 52).plano(8); emb = 3; }
    }
    o.plano(10).porta('cruza', cfg.cruza, cfg.cruzaNome, 'arco', -2).plano(22).porta('covil', ['covil_' + id, 'volta'], cfg.covil, 'caverna').plano(10);
    return o.fim();
  }
  function covil(id, regiao, semente, chefe, nome, volta) {
    const o = Obra(id, regiao, 150, semente); o.a.nome = nome;
    o.plano(14).porta('volta', volta, 'Sair', null, -7); o.a.inicio = { x: 10 * T };
    o.ondula(16).bicho(chefe.b).bicho(chefe.b, -8); o.plano(10).fogo('Última fogueira').plano(6);
    const x0 = o.x; o.plano(54); o.a.arena = { x0: x0 * T, x1: (x0 + 54) * T, chefe: chefe.id, piso: o.y * T };
    o.a.inimigos.push({ t: chefe.id, x: (x0 + 40) * T, tx: x0 + 40 });
    o.galho(x0 + 12, o.y - 5, 5); o.galho(x0 + 36, o.y - 5, 5);
    o.plano(12).circulo(chefe.magia, -4).plano(10);
    if (chefe.desce) { o.plano(4).porta(chefe.desce[0], chefe.desce[1], chefe.desce[2], chefe.desce[4] || null, -3); o.a.portas[o.a.portas.length - 1].precisa = chefe.desce[3]; }
    return o.fim();
  }
  // ---------- o vale: onde alguém está perdido ----------
  function vale() {
    const o = Obra('vale', 'vale', 700, 71), ESP = ['lobo', 'cobra', 'zumbi', 'goblin'];
    o.plano(14).porta('volta', ['floresta', 'p_vale'], 'Voltar à clareira', 'arco', -7); o.a.inicio = { x: 10 * T };
    let k = 0, fogo = 0, res = 0;
    let lug = 0; o.zona('Boca do Vale');
    while (o.x < 620) {
      if (o.x > 230 && !lug) { lug = 1; o.ruina('Posto Queimado', 'As marcas na parede contam dias. Param no quadragésimo.'); }
      if (o.x > 470 && lug === 1) { lug = 2; o.zona('Margem Alta', [1.08, 1.04, 0.96]); o.secreto(); }
      if (o.x > 150 && !fogo) { o.plano(10).fogo('Fogueira do Vau').plano(8); fogo = 1; }
      if (o.x > 300 && !res) { // a humana perdida, cercada
        o.plano(10).placa('grito', -6); const x0 = o.x;
        o.embosca([['lobo', 'lobo_negro', 'lobo'], ['lobo_negro', 'lobo_rubro'], ['lobo_rubro', 'lobo_negro', 'lobo']], 56);
        const e = o.a.emboscadas[o.a.emboscadas.length - 1]; e.resgate = (x0 + 30) * T; o.a.resgate = e;
        o.plano(10).fogo('Fogueira do Encontro').plano(8); res = 1;
      }
      const esp = ESP[k % 4], n = o.ent(2, 4);
      if (k % 4 === 1) o.vao(o.ent(5, 7)).plano(8); if (k % 5 === 2 && o.y > 24) o.sobe(3).plano(6); if (k % 5 === 4 && o.y < 33) o.queda(3).plano(8); if (o.y < 20) o.queda(5).plano(8);
      o.ondula(o.ent(16, 24)); for (let i = 0; i < n; i++) o.bicho(varia(esp, 0.75, o.r), -3 - i * 4);
      o.pega(o.um(['madeira', 'fruta', 'folha', 'galho']), -6).pega(o.um(['erva', 'fibra', 'pedra', 'madeira']), -11);
      k++;
    }
    o.plano(14).porta('lar', ['lar', 'volta'], 'Clareira do rio', 'arco', -4).plano(8);
    return o.fim();
  }
  // ---------- o lar: terra vazia; tudo aqui é você que levanta ----------
  function lar() {
    const o = Obra('lar', 'vale', 262, 88); o.a.nome = 'Clareira do Rio'; o.a.semMata = [34, 232];
    o.plano(14).porta('volta', ['vale', 'lar'], 'Voltar ao vale', 'arco', -7); o.a.inicio = { x: 12 * T };
    o.plano(6).pega('madeira').plano(5).pega('galho').plano(6).pega('madeira').plano(5);
    const x0 = o.x; // 36: começo do terreno
    o.plano(190);
    o.a.terreno = { x0: x0 * T, x1: (x0 + 190) * T, piso: o.y * T };
    const px = (d) => (x0 + d) * T;
    o.a.lugar = { lago: px(5), curtume: px(38), casa: px(50), fogo: px(62), varal: px(34), horta: px(76), berco: px(43), bau: px(57), cercaE: px(16), cercaD: px(178), estacasE: px(10), estacasD: px(184), cepo: px(26), lenha: px(68), torre: px(23), arsenal: px(30), poco: px(81), celeiro: px(88), mercador: px(96), praca: px(103), casario: px(142), torreD: px(174) };
    o.a.fogos.push({ id: 'lar_f0', nome: 'O fogo do lar', x: px(62), tx: x0 + 62, y: o.y * T });
    o.plano(6).pega('madeira').plano(5).pega('pedra').plano(4).pega('madeira').plano(4).pega('fibra').plano(4).pega('folha').plano(4);
    return o.fim();
  }
  // a mina tem teto: pedra por cima, sempre uns quinze blocos acima do chão mais alto em volta
  function teto(a, folga) {
    const W = a.W;
    for (let tx = 0; tx < W; tx++) { let m = 99; for (let k = -16; k <= 16; k++) m = Math.min(m, a.topo[Math.max(0, Math.min(W - 1, tx + k))]); const c = m - folga - (Math.sin(tx * 0.37) > 0.6 ? 1 : 0); for (let ty = 0; ty < c; ty++) if (a.grade[ty * W + tx] === 0) a.grade[ty * W + tx] = 1; }
    return a;
  }
  // paredes de minério: fecham o túnel até a picareta abrir
  function rochas(a) {
    a.rochas = []; const W = a.W; for (let tx = 160; tx < W - 120; tx += 150) {
      let ok = -1; for (let k = 0; k < 40 && ok < 0; k++) { const c = tx + k; let p = true; for (let d = -4; d <= 4; d++) if (a.topo[c + d] !== a.topo[c]) p = false; if (p && !a.portas.some((q) => Math.abs(q.tx - c) < 12) && !a.fogos.some((q) => Math.abs(q.tx - c) < 12) && !a.emboscadas.some((e) => c * T > e.x0 - 60 && c * T < e.x1 + 60)) ok = c; }
      if (ok < 0) continue; const y = a.topo[ok]; a.rochas.push({ id: a.id + '_r' + ok, c0: ok, c1: ok + 1, y0: y - 16, y1: y - 1, x: (ok + 1) * T });
      for (let c = ok; c <= ok + 1; c++) for (let ty = y - 16; ty < y; ty++) a.grade[ty * W + c] = 1;
    }
    return a;
  }
  F.aplicaRochas = function (abertas) { const a = F.atual; if (!a.rochas) return; for (const r of a.rochas) if (abertas && abertas[r.id]) for (let c = r.c0; c <= r.c1; c++) for (let ty = r.y0; ty <= r.y1; ty++) F.poe(c, ty, 0); };
  const MONTA = {
    minas: () => rochas(teto(caminho('minas', 77, { zonas: ['Boca da Mina', 'Galerias', [0.86, 0.86, 0.96], 'Veio Fundo', [1.08, 0.9, 0.8]], lug: ['O Elevador Caído', 'A corda foi cortada. Do lado de cima.', 'Refeitório dos Mineiros', 'Os pratos ainda estão na mesa. Cobertos de pó, não de comida.', 'Sala do Capataz', 'Uma lista de nomes. Todos riscados, menos o dele.'], elite: 'golem_ferro', b: 'pedra', bando: 3, outro: ['minerador', 1], terreno: ['ondula', 'ondula', 'sobe', 'desce', 'muro', 'vao', 'queda', 'vaoG'], pega: ['pedra', 'pedra', 'ferro', 'galho', 'osso'], fogos: ['Fogueira da Boca', 'Fogueira dos Trilhos', 'Fogueira do Poço Velho'], meio: ['floresta', 'p_minas'], meioNome: 'Saída para a clareira', cruza: ['floresta', 'p_minas'], cruzaNome: 'Poço de luz para a clareira', covil: 'O Fundo da Mina' }), 15)),
    mangue: () => caminho('mangue', 91, { zonas: ['Lama Rasa', 'Raízes Altas', [0.9, 1, 0.96], 'Boca do Rio', [1.05, 0.95, 0.85]], lug: ['O Barco Virado', 'O casco ainda tem um nome pintado. Ninguém lembra dele.', 'Palafitas dos Pescadores', 'As redes estão secando há anos.', 'Altar do Caboclo', 'Fumo, cachaça e espelhos. Algumas oferendas são de ontem.'], elite: 'guaiamum', b: 'mare', bando: 3, outro: ['afogado', 1], terreno: ['ondula', 'ondula', 'vao', 'desce', 'sobe', 'vaoG', 'ondula', 'queda'], pega: ['galho', 'fibra', 'carne', 'osso', 'fruta'], fogos: ['Fogueira da Lama', 'Fogueira das Palafitas', 'Fogueira do Barco'], meio: ['floresta', 'p_mangue'], meioNome: 'Saída para a clareira', cruza: ['floresta', 'p_mangue'], cruzaNome: 'Trilha de volta para a clareira', covil: 'O Altar do Caboclo' }),
    ruinas: () => caminho('ruinas', 103, { zonas: ['Pátio dos Cacos', 'Rua dos Fornos', [1.08, 0.95, 0.86], 'Oficina do Oleiro', [1.12, 1, 0.9]], lug: ['As Mãos Vazias', 'Duas estátuas ajoelhadas oferecem nada. Ou esperam alguma coisa.', 'Fila dos Fornos', 'Ainda quentes. Ninguém alimenta o fogo.', 'A Mesa do Oleiro', 'Barro fresco e marcas de dedos. Alguém trabalhou aqui ontem.'], elite: 'guardiao', b: 'barro', bando: 3, outro: ['pote', 1], terreno: ['ondula', 'sobe', 'desce', 'escada', 'vao', 'ondula', 'queda', 'muro'], pega: ['pedra', 'galho', 'fibra', 'osso', 'ferro'], fogos: ['Fogueira do Pátio', 'Fogueira dos Fornos', 'Fogueira da Oficina'], meio: ['floresta', 'p_ruinas'], meioNome: 'Saída para a clareira', cruza: ['floresta', 'p_ruinas'], cruzaNome: 'Trilha de volta para a clareira', covil: 'A Oficina do Oleiro' }),
    forno: () => rochas(teto(caminho('forno', 117, { zonas: ['Boca do Forno', 'Tijolo que vira Ferro', [0.9, 0.95, 1.08], 'O Coração', [0.8, 1, 1.15]], lug: ['A Primeira Rachadura', 'Atrás do tijolo, uma parede lisa. Fria. Ninguém faz isso com barro.', 'Os Canos', 'Tubos grossos como troncos, levando calor para algum lugar lá embaixo.', 'A Porta Redonda', 'Letras gravadas no metal. Você não sabe ler. Ainda.'], elite: 'sentinela', b: 'mutante', bando: 3, outro: ['queimado', 1], terreno: ['ondula', 'sobe', 'desce', 'escada', 'vao', 'ondula', 'queda', 'muro'], pega: ['pedra', 'ferro', 'osso', 'galho', 'prata'], fogos: ['Fogueira da Boca', 'Fogueira dos Canos', 'Fogueira da Porta'], entrada: ['covil_ruinas', 'p_forno'], entradaNome: 'Subir à Oficina do Oleiro', meio: ['covil_ruinas', 'p_forno'], meioNome: 'Subir à Oficina', cruza: ['covil_ruinas', 'p_forno'], cruzaNome: 'Subir à Oficina', covil: 'O Coração do Forno' }), 15)),
    covil_forno: () => teto(covil('covil_forno', 'forno', 118, { id: 'mutacao', b: 'fundido', magia: 'pulso', desce: ['antiga', ['covil_forno', 'volta'], 'A Porta Antiga', 8, 'metal'] }, 'O Coração do Forno', ['forno', 'covil']), 17),
    covil_ruinas: () => covil('covil_ruinas', 'ruinas', 104, { id: 'molde', b: 'boneco', magia: 'cacos', desce: ['p_forno', ['forno', 'volta'], 'Descer ao Forno', 7] }, 'A Oficina do Oleiro', ['ruinas', 'covil']),
    covil_mangue: () => covil('covil_mangue', 'mangue', 92, { id: 'caboclo', b: 'caranguejo', magia: 'mare' }, 'O Altar do Caboclo', ['mangue', 'covil']),
    covil_minas: () => teto(covil('covil_minas', 'minas', 78, { id: 'capataz', b: 'golem', magia: 'ferro' }, 'O Fundo da Mina', ['minas', 'covil']), 17),
    vale, lar,
    floresta,
    lobos: () => caminho('lobos', 21, { zonas: ['Encosta', 'Garganta do Vento', [0.9, 0.96, 1.12], 'Alto dos Ossos', [1.12, 1.1, 1.14]], lug: ['O Grande Caído', 'Um bicho maior que a mata morreu aqui. Os lobos ainda comem dele.', 'Vigia do Vento', 'Daqui dava para ver a fumaça das outras casas. Não há mais fumaça.', 'Mesa da Matilha', 'Os ossos estão arrumados por tamanho.'], amu: 'pena', elite: 'lobo_rubro', b: 'lobo', bando: 4, outro: ['lobo', 1], terreno: ['ondula', 'sobe', 'desce', 'muro', 'vao', 'escada', 'queda'], pega: ['pedra', 'galho', 'osso'], fogos: ['Fogueira da Encosta', 'Fogueira do Penhasco', 'Fogueira da Trilha Velha'], meio: ['cobras', 'meio'], meioNome: 'Trilha para o Alagado', cruza: ['goblins', 'cruza'], cruzaNome: 'Passagem dos Barrancos', covil: 'Toca do Alfa' }),
    cobras: () => caminho('cobras', 33, { zonas: ['Junco Raso', 'Água Parada', [0.92, 1, 0.8], 'Mangue Fundo', [0.8, 0.92, 0.88]], lug: ['Monte de Mudas', 'Pele velha até a cintura. Nenhuma delas era pequena.', 'Torre Afogada', 'A água subiu um andar por geração.', 'Ninho Pisado', 'Alguém passou aqui antes de você, e não voltou.'], elite: 'cobra_prata', b: 'cobra', bando: 4, outro: ['cobra_cuspe', 0.4], terreno: ['ondula', 'vaoG', 'vaoG', 'vao', 'ondula', 'escada', 'queda'], pega: ['fibra', 'folha', 'erva'], fogos: ['Fogueira da Ilha Seca', 'Fogueira do Mangue', 'Fogueira do Junco'], meio: ['lobos', 'meio'], meioNome: 'Trilha para a Serra', cruza: ['zumbis', 'cruza'], cruzaNome: 'Passagem dos Enterrados', covil: 'Ninho da Rainha' }),
    zumbis: () => caminho('zumbis', 45, { zonas: ['Lápides', 'Vala Comum', [0.85, 0.86, 1.04], 'Cidade sem Nome', [1.06, 0.96, 1.06]], lug: ['A Porta de Ferro', 'Está trancada por fora.', 'Campanário', 'O sino caiu. Às vezes ainda toca.', 'Cova Aberta', 'Tem o seu tamanho.'], amu: 'raiz', elite: 'zumbi_inchado', b: 'zumbi', bando: 4, outro: ['zumbi', 1], terreno: ['ondula', 'ondula', 'vao', 'muro', 'desce', 'sobe', 'queda'], pega: ['osso', 'trapo', 'pedra'], fogos: ['Fogueira das Lápides', 'Fogueira da Cripta', 'Fogueira do Sino'], meio: ['goblins', 'meio'], meioNome: 'Trilha para os Barrancos', cruza: ['cobras', 'cruza'], cruzaNome: 'Passagem do Alagado', covil: 'A Cripta Fechada' }),
    goblins: () => caminho('goblins', 57, { zonas: ['Paliçada', 'Fornos', [1.14, 0.96, 0.82], 'Barranco Vermelho', [1.1, 0.86, 0.82]], lug: ['Tendas da Frente', 'Cheira a gordura e a ferro.', 'Torre Tomada', 'Os donos antigos estão pendurados do lado de fora.', 'Tendas do Gurgo', 'Aqui ninguém dorme de barriga cheia, só ele.'], elite: 'goblin_porrete', b: 'goblin', bando: 4, outro: ['goblin_pedra', 0.35], terreno: ['muro', 'escada', 'vao', 'vaoG', 'queda', 'ondula', 'sobe'], pega: ['pedra', 'galho', 'ferro'], fogos: ['Fogueira da Paliçada', 'Fogueira do Barranco', 'Fogueira do Caldeirão'], meio: ['zumbis', 'meio'], meioNome: 'Trilha para os Enterrados', cruza: ['lobos', 'cruza'], cruzaNome: 'Passagem da Serra', covil: 'O Fortim' }),
    covil_lobos: () => covil('covil_lobos', 'lobos', 61, { id: 'alfa', b: 'lobo', magia: 'vento' }, 'Toca do Alfa', ['lobos', 'covil']),
    covil_cobras: () => covil('covil_cobras', 'cobras', 62, { id: 'rainha', b: 'cobra', magia: 'espinhos' }, 'Ninho da Rainha', ['cobras', 'covil']),
    covil_zumbis: () => covil('covil_zumbis', 'zumbis', 63, { id: 'carcereiro', b: 'zumbi', magia: 'folego' }, 'A Cripta Fechada', ['zumbis', 'covil']),
    covil_goblins: () => covil('covil_goblins', 'goblins', 64, { id: 'chefe', b: 'goblin', magia: 'tremor' }, 'O Fortim', ['goblins', 'covil']),
  };
  F.IDS = Object.keys(MONTA);
  F.area = (id) => areas[id] || (areas[id] = MONTA[id]());
  F.zonaEm = (x) => { const l = F.atual.zonas; let z = null; for (const q of l) if (x >= q.tx * T) z = q; return z; };
  // chão rachado: quebrado ou inteiro, conforme a vida guardada
  F.aplicaFracas = function (quebradas) { for (const f of F.atual.fracas) for (let c = f.c0; c <= f.c1; c++) for (let k = f.y0; k <= f.y1; k++) F.poe(c, k, quebradas[f.id] ? 0 : 1); };
  F.entrar = function (id) { const a = F.area(id); F.atual = a; F.W = a.W; F.grade = a.grade; F.fechada = false; if (window.Jogo && window.Jogo.save) F.aplicaRochas(window.Jogo.save.rochas); return a; };
  F.chao = (x) => F.atual.topo[Math.max(0, Math.min(F.W - 1, Math.floor(x / T)))] * T;
  // fecha um trecho (emboscada): duas paredes de raiz
  F.fechar = function (sim, x0, x1) {
    const a = F.atual; if (sim) a.fechos = [Math.floor(x0 / T) + 1, Math.floor(x1 / T) - 2]; if (!a.fechos) return;
    for (const c of a.fechos) { const t = a.topo[c]; for (let k = 0; k < t; k++) F.poe(c, k, sim ? 1 : 0); }
    F.fechos = sim ? a.fechos : null; if (!sim) a.fechos = null;
  };
  F.fecharArena = function (sim) {
    const A = F.atual && F.atual.arena; if (!A || F.fechada === sim) return; F.fechada = sim;
    for (const c of [Math.floor(A.x0 / T), Math.floor(A.x1 / T) - 1]) { const t = F.atual.topo[c]; for (let k = 0; k < t; k++) F.poe(c, k, sim ? 1 : 0); }
  };
})();
