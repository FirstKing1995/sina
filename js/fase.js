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
    const a = { id, regiao, W, grade: g, topo: new Int16Array(W).fill(H), inimigos: [], coleta: [], fogos: [], portas: [], decor: [], placas: [], circulos: [], arena: null, inicio: null, nome: null };
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
      fim() { while (x < W) coluna(x++, y - (x > W - 4 ? 14 : 0)); for (let i = 0; i < 2; i++) for (let k = 0; k < H; k++) set(i, k, 1); acaba(a, r); return a; },
    };
    return o;
  }
  // assenta tudo no chão de verdade e espalha os enfeites
  function acaba(a, r) {
    const W = a.W, chao = (tx) => a.topo[Math.max(0, Math.min(W - 1, tx))] * T;
    for (const l of [a.inimigos, a.coleta, a.fogos, a.portas, a.circulos]) for (const o of l) { if (o.y == null) o.y = chao(o.tx); }
    for (const p of a.placas) p.y = chao(Math.floor(p.x / T));
    for (const d of a.decor) d.y = chao(Math.floor(d.x / T));
    const livre = (tx, larg) => { const y0 = a.topo[tx]; for (let k = -larg; k <= larg; k++) { const t = a.topo[Math.max(0, Math.min(W - 1, tx + k))]; if (Math.abs(t - y0) > 1) return false; } return true; };
    const perto = (x, l, d) => l.some((o) => Math.abs(o.x - x) < d);
    const PLANTAS = { floresta: ['samambaia', 'planta', 'cogumelos', 'pedras', 'tronco', 'frutas'], lobos: ['pedras', 'pedrao', 'galhada', 'samambaia', 'ossos'], cobras: ['planta', 'samambaia', 'ninho', 'cogumelos', 'tronco', 'planta'], zumbis: ['lapide', 'lapide', 'ossos2', 'galhada', 'pilar', 'cogumelos'], goblins: ['totem', 'ossos', 'galhada', 'pedras', 'pedrao', 'ossos2'] }[a.regiao];
    for (let tx = 4; tx < W - 4; tx += 2 + Math.floor(r() * 4)) {
      const x = tx * T + 8;
      if (perto(x, a.portas, 110) || perto(x, a.circulos, 100) || perto(x, a.fogos, 46) || perto(x, a.coleta, 26)) continue;
      const k = r();
      if (k < 0.16 && livre(tx, 4)) a.decor.push({ n: r() < (a.regiao === 'floresta' || a.regiao === 'cobras' ? 0.55 : 0.25) ? 'arvorao' : 'arvore', x, y: chao(tx) + 3, c: 0, e: 0.85 + r() * 0.3, v: r() < 0.5 });
      else if (k < 0.62 && livre(tx, 1)) { const n = PLANTAS[Math.floor(r() * PLANTAS.length)]; a.decor.push({ n, x, y: chao(tx) + 2, c: 1, e: 0.8 + r() * 0.35, v: r() < 0.5 }); }
      else if (k < 0.7 && livre(tx, 1)) a.decor.push({ n: r() < 0.5 ? 'samambaia' : 'planta', x, y: chao(tx) + 10, c: 2, e: 1.3 + r() * 0.5, v: r() < 0.5 });
    }
    a.decor.sort((p, q) => p.c - q.c);
  }

  // ---------- Floresta Antiga ----------
  function floresta() {
    const o = Obra('floresta', 'floresta', 1180, 7);
    o.plano(16); o.a.inicio = { x: 15 * T };
    o.a.decor.push({ n: 'barro', x: 13 * T, y: 0, c: 0, e: 1 });
    o.plano(8).placa('andar').ondula(14).pega('galho').plano(6).placa('colher', -4).pega('folha').ondula(10).pega('galho').pega('pedra', -6).plano(6).pega('fibra').ondula(10).pega('galho').placa('criar').pega('folha', -7);
    o.sobe(2).plano(8).pega('fruta').plano(6).pega('fibra').desce(2).ondula(12).pega('pedra').pega('folha', -8);
    // primeiro perigo
    o.plano(14).placa('golpe', -12).bicho('lobo').ondula(10).pega('folha').pega('galho', -6).vao(5).plano(10).pega('fruta').muro(3, 6).pega('pedra').queda(3).plano(12).bicho('cobra').pega('fibra', -9);
    o.escada(10).plano(10).pega('erva').pega('fruta', -6).placa('baixo', -8).desce(3).vao(8, true).plano(9).bicho('lobo').pega('folha').ondula(16).bicho('lobo').pega('galho');
    o.muro(3, 5).muro(3, 6).pega('pedra').queda(4).plano(14).bicho('cobra').bicho('cobra', -8).vao(12, true).plano(12).pega('fibra').pega('folha', -7).ondula(18).bicho('lobo').bicho('lobo', -9).pega('fruta');
    // primeira fogueira
    o.plano(20).fogo('Fogueira da Raiz Grande').placa('fogo', -8).placa('comer', 2).plano(8);
    o.ondula(20).bicho('goblin').pega('pedra').sobe(4).plano(10).bicho('lobo').pega('erva').vao(6).muro(2, 8).pega('galho').desce(4).plano(14).bicho('goblin').bicho('cobra', -9).pega('fibra');
    o.escada(13).plano(12).pega('galho').pega('fruta', -8).bicho('cobra').vao(14, true).plano(8).pega('erva').queda(5).plano(16).bicho('zumbi').placa('forte', -14).ondula(20).bicho('zumbi').pega('pedra').pega('folha', -9);
    o.vao(5).plano(6).vao(5).plano(6).vao(6).plano(14).bicho('lobo').bicho('lobo', -6).bicho('lobo', -10).pega('galho').ondula(20).pega('fibra').bicho('goblin');
    o.muro(3, 5).muro(4, 5).escada(9).plano(10).pega('pedra').bicho('goblin').galho(o.x - 8, o.y - 5, 5).pegaAlto('erva', o.x - 6, o.y - 5).queda(6).plano(6).queda(6).plano(16).bicho('cobra').bicho('cobra', -6).pega('folha');
    // ruínas e o círculo
    o.ondula(16).enf('pilar', -10).plano(10).enf('arco', -4, 0).plano(12).enf('pilar', -4).plano(16).circulo('brasa', -7).plano(8).enf('pilar', -5).placa('magia').plano(10).enf('arco', -5, 0).ondula(14).bicho('zumbi').bicho('zumbi', -6);
    o.plano(14).fogo('Fogueira das Ruínas').plano(6).desce(3).ondula(24).bicho('lobo').bicho('lobo', -6).pega('fruta').pega('galho', -9).vao(10, true).plano(10).bicho('goblin').bicho('goblin', -5).pega('fibra');
    o.escada(12).plano(14).bicho('cobra').pega('erva').vao(16, true).plano(8).pega('pedra').queda(4).plano(14).bicho('zumbi').bicho('zumbi', -5).ondula(24).bicho('lobo').bicho('lobo', -5).bicho('lobo', -9).pega('folha');
    o.muro(2, 6).vao(6).muro(2, 6).vao(6).muro(2, 8).pega('fruta').queda(3).plano(10).bicho('goblin').queda(3).ondula(26).bicho('goblin').bicho('cobra', -8).pega('galho').pega('fibra', -5);
    o.vao(8, true).plano(12).bicho('zumbi').vao(9, true).plano(14).bicho('lobo').bicho('lobo', -7).pega('erva').ondula(20).pega('pedra').pega('galho', -8);
    // enche o que falta até a clareira
    let k = 0; while (o.x < 1040) { o.ondula(o.ent(16, 24)).bicho(o.um(['lobo', 'cobra', 'zumbi', 'goblin'])); if (k % 2) o.bicho(o.um(['lobo', 'goblin']), -7); o.pega(o.um(['galho', 'pedra', 'folha', 'fibra', 'fruta'])); if (k++ % 3 === 1) o.vao(o.ent(5, 7)); if (k % 4 === 2) o.sobe(2); if (k % 4 === 0) o.desce(2); }
    // a clareira dos quatro caminhos
    o.y = 30; o.plano(10).placa('caminhos').fogo('Fogueira da Clareira').plano(22).enf('ossos', -13, 1).enf('placa', -11, 1).enf('ossos', 3, 1).porta('p_lobos', ['lobos', 'volta'], 'Serra dos Uivos').plano(24).enf('ninho', -13, 1).enf('placa', -11, 1).enf('ninho', 3, 1).porta('p_cobras', ['cobras', 'volta'], 'Alagado das Presas').plano(24).enf('lapide', -13, 1).enf('placa', -11, 1).enf('lapide', 3, 1).porta('p_zumbis', ['zumbis', 'volta'], 'Chão dos Enterrados', 'arco').plano(24).enf('totem', -13, 1).enf('placa', -11, 1).enf('totem', 3, 1).porta('p_goblins', ['goblins', 'volta'], 'Barrancos do Fortim').plano(8);
    return o.fim();
  }
  // ---------- um caminho ----------
  function caminho(id, semente, cfg) {
    const o = Obra(id, id, 760, semente);
    o.plano(14).porta('volta', ['floresta', 'p_' + id], 'Voltar à clareira', null, -7); o.a.inicio = { x: 10 * T };
    let k = 0, fogo = 0;
    const grupo = () => { const n = o.ent(2, cfg.bando); for (let i = 0; i < n; i++) o.bicho(r(i), -3 - i * 4); };
    const r = (i) => (i && o.r() < cfg.outro[1] ? cfg.outro[0] : o.r() < 0.86 ? cfg.b : o.um(['lobo', 'cobra', 'zumbi', 'goblin']));
    while (o.x < 690) {
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
      if (o.x > 220 && fogo === 0) { o.plano(16).fogo(cfg.fogos[0]).plano(6); fogo = 1; }
      if (o.x > 380 && fogo === 1) { o.plano(16).porta('meio', cfg.meio, cfg.meioNome, 'arco', -6).plano(8); fogo = 2; }
      if (o.x > 560 && fogo === 2) { o.plano(14).fogo(cfg.fogos[1]).plano(6); fogo = 3; }
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
    return o.fim();
  }
  const MONTA = {
    floresta,
    lobos: () => caminho('lobos', 21, { b: 'lobo', bando: 4, outro: ['lobo', 1], terreno: ['ondula', 'sobe', 'desce', 'muro', 'vao', 'escada', 'queda'], pega: ['pedra', 'galho', 'osso'], fogos: ['Fogueira da Encosta', 'Fogueira do Penhasco'], meio: ['cobras', 'meio'], meioNome: 'Trilha para o Alagado', cruza: ['goblins', 'cruza'], cruzaNome: 'Passagem dos Barrancos', covil: 'Toca do Alfa' }),
    cobras: () => caminho('cobras', 33, { b: 'cobra', bando: 4, outro: ['cobra_cuspe', 0.4], terreno: ['ondula', 'vaoG', 'vaoG', 'vao', 'ondula', 'escada', 'queda'], pega: ['fibra', 'folha', 'erva'], fogos: ['Fogueira da Ilha Seca', 'Fogueira do Mangue'], meio: ['lobos', 'meio'], meioNome: 'Trilha para a Serra', cruza: ['zumbis', 'cruza'], cruzaNome: 'Passagem dos Enterrados', covil: 'Ninho da Rainha' }),
    zumbis: () => caminho('zumbis', 45, { b: 'zumbi', bando: 4, outro: ['zumbi', 1], terreno: ['ondula', 'ondula', 'vao', 'muro', 'desce', 'sobe', 'queda'], pega: ['osso', 'trapo', 'pedra'], fogos: ['Fogueira das Lápides', 'Fogueira da Cripta'], meio: ['goblins', 'meio'], meioNome: 'Trilha para os Barrancos', cruza: ['cobras', 'cruza'], cruzaNome: 'Passagem do Alagado', covil: 'A Cripta Fechada' }),
    goblins: () => caminho('goblins', 57, { b: 'goblin', bando: 4, outro: ['goblin_pedra', 0.35], terreno: ['muro', 'escada', 'vao', 'vaoG', 'queda', 'ondula', 'sobe'], pega: ['pedra', 'galho', 'ferro'], fogos: ['Fogueira da Paliçada', 'Fogueira do Barranco'], meio: ['zumbis', 'meio'], meioNome: 'Trilha para os Enterrados', cruza: ['lobos', 'cruza'], cruzaNome: 'Passagem da Serra', covil: 'O Fortim' }),
    covil_lobos: () => covil('covil_lobos', 'lobos', 61, { id: 'alfa', b: 'lobo', magia: 'vento' }, 'Toca do Alfa', ['lobos', 'covil']),
    covil_cobras: () => covil('covil_cobras', 'cobras', 62, { id: 'rainha', b: 'cobra', magia: 'espinhos' }, 'Ninho da Rainha', ['cobras', 'covil']),
    covil_zumbis: () => covil('covil_zumbis', 'zumbis', 63, { id: 'carcereiro', b: 'zumbi', magia: 'folego' }, 'A Cripta Fechada', ['zumbis', 'covil']),
    covil_goblins: () => covil('covil_goblins', 'goblins', 64, { id: 'chefe', b: 'goblin', magia: 'tremor' }, 'O Fortim', ['goblins', 'covil']),
  };
  F.IDS = Object.keys(MONTA);
  F.area = (id) => areas[id] || (areas[id] = MONTA[id]());
  F.entrar = function (id) { const a = F.area(id); F.atual = a; F.W = a.W; F.grade = a.grade; F.fechada = false; return a; };
  F.chao = (x) => F.atual.topo[Math.max(0, Math.min(F.W - 1, Math.floor(x / T)))] * T;
  F.fecharArena = function (sim) {
    const A = F.atual && F.atual.arena; if (!A || F.fechada === sim) return; F.fechada = sim;
    for (const c of [Math.floor(A.x0 / T), Math.floor(A.x1 / T) - 1]) { const t = F.atual.topo[c]; for (let k = 0; k < t; k++) F.poe(c, k, sim ? 1 : 0); }
  };
})();
