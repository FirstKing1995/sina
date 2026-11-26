/* SINA · o mundo que se mexe com as mãos: árvores altas para escalar (com ninho lá em cima), terra fofa para cavar com a pá,
   veios de minério nos barrancos para a picareta, e tocha que se finca no chão. Tudo nasce igual em cada área (semente fixa). */
(function () {
  'use strict';
  const J = window.Jogo, F = window.Fase, C = window.Dados, T = F.T, K = J.k;
  const { som, rnd, texto, fx, poeira, treme, avisa } = K;
  const hash = (n) => { let k = (n * 374761393) | 0; k = Math.imul(k ^ (k >>> 13), 1274126177); return ((k ^ (k >>> 16)) >>> 0) / 4294967296; };
  const um = (l) => l[Math.floor(Math.random() * l.length)];

  // ---------- coisas novas na mochila e na bancada ----------
  Object.assign(C.MAT, { ovo: 'Ovo de ninho', pa: 'Pá de pedra', picareta: 'Picareta de pedra', mel: 'Favo de mel' });
  Object.assign(C.COMER, { ovo: { fome: 18, vida: 14 }, mel: { fome: 10, vida: 30, cura: true } });
  C.RECEITAS.push(
    { id: 'pa', tipo: 'item', nome: 'Pá de pedra', qtd: 1, custo: { galho: 3, pedra: 2, fibra: 2 }, desc: 'Cava a terra fofa (o chão que brilha) e acha o que ficou enterrado.' },
    { id: 'picareta', tipo: 'item', nome: 'Picareta de pedra', qtd: 1, custo: { galho: 2, pedra: 4, fibra: 2 }, oficio: 1, desc: 'Quebra os veios brilhantes dos barrancos: ferro e, às vezes, prata.' },
  );
  const LIMITE = { pa: 1, picareta: 1 }; const jaTem0 = J.jaTem; J.jaTem = (r) => jaTem0(r) || (LIMITE[r.id] && (J.save.inv[r.id] || 0) >= LIMITE[r.id]);
  // o que cada lugar guarda lá em cima e debaixo da terra
  const NINHO = { floresta: ['ovo', 'ovo', 'mel', 'fruta', 'erva', 'fibra'], vale: ['ovo', 'mel', 'mel', 'fruta', 'erva'], lobos: ['ovo', 'presa', 'osso', 'couro'], cobras: ['ovo', 'pele', 'mel', 'erva'], zumbis: ['ovo', 'trapo', 'osso', 'ferro'], goblins: ['ovo', 'ferro', 'trapo', 'orelha'] };
  const ENTERRADO = { ruinas: ['pedra', 'prata', 'ferro', 'osso', 'pedra'], mangue: ['osso', 'prata', 'ferro', 'presa', 'trapo'], minas: ['ferro', 'ferro', 'prata', 'osso', 'pedra'], floresta: ['osso', 'ferro', 'pedra', 'trapo', 'prata'], vale: ['pedra', 'ferro', 'osso', 'trapo', 'prata'], lobos: ['osso', 'osso', 'ferro', 'presa', 'prata'], cobras: ['pele', 'prata', 'osso', 'ferro'], zumbis: ['osso', 'trapo', 'ferro', 'ferro', 'prata'], goblins: ['ferro', 'ferro', 'orelha', 'trapo', 'prata'] };

  // ---------- monta os extras da área (uma vez) ----------
  J.extras = function (A) {
    if (A.extras) return A.extras; const W = A.W, E = (A.extras = { arvores: [], montes: [], veios: [] }), reg = A.regiao, sem = W * 7 + A.id.length * 131;
    const livre = (tx, l) => { const y0 = A.topo[tx]; for (let k = -l; k <= l; k++) { const q = A.topo[tx + k]; if (q !== y0) return false; } return true; };
    const perto = (x, l, d) => l.some((o) => Math.abs(o.x - x) < d);
    const vazio = (tx, ty0, ty1, l) => { for (let x = tx - l; x <= tx + l; x++) for (let y = ty0; y <= ty1; y++) if (F.tile(x, y) !== 0) return false; return true; };
    const proibido = (x) => perto(x, A.portas, 120) || perto(x, A.fogos, 70) || perto(x, A.circulos, 120) || perto(x, A.baus, 60) || (A.arena && x > A.arena.x0 - 60 && x < A.arena.x1 + 60) || A.emboscadas.some((e) => x > e.x0 - 30 && x < e.x1 + 30) || (A.terreno && x > A.terreno.x0 - 20 && x < A.terreno.x1 + 20) || A.escuros.some((e) => x > e.x0 - 40 && x < e.x1 + 40);
    const ant = F.grade; F.grade = A.grade; const antW = F.W; F.W = W;
    // árvores altas: tronco com cipó, galhos lá em cima com um ninho
    for (let tx = 24; tx < W - 24; tx += 30 + Math.floor(hash(sem + tx) * 30)) {
      const x = tx * T + 8; if (hash(sem + tx * 3) > (A.id.startsWith('covil') || reg === 'minas' || reg === 'ruinas' ? 0 : reg === 'goblins' || reg === 'zumbis' ? 0.45 : 0.62) || !livre(tx, 3) || proibido(x)) continue;
      const g = A.topo[tx], alt = 9 + Math.floor(hash(tx * 7 + sem) * 4), top = g - alt; if (top < 6 || !vazio(tx, top - 3, g - 1, 3)) continue;
      for (let k = -2; k <= 2; k++) F.poe(tx + k, top, 2);
      E.arvores.push({ x, tx, y0: g * T, y1: top * T, id: A.id + '_a' + tx });
      A.coleta.push({ id: A.id + '_ni' + tx, m: um2(NINHO[reg] || NINHO.floresta, tx), x: x + 14, tx: tx + 1, y: top * T, alto: true });
      if (hash(tx * 11) < 0.5) A.coleta.push({ id: A.id + '_nj' + tx, m: um2(NINHO[reg] || NINHO.floresta, tx * 5), x: x - 16, tx: tx - 1, y: top * T, alto: true });
      E.arvores[E.arvores.length - 1].ninho = x + 26;
    }
    // terra fofa
    for (let tx = 14; tx < W - 14; tx += 16 + Math.floor(hash(sem + tx * 5) * 26)) { const x = tx * T + 8; if (hash(tx * 13 + sem) > 0.55 || !livre(tx, 1) || proibido(x) || perto(x, E.arvores, 50)) continue; E.montes.push({ x, y: A.topo[tx] * T, id: A.id + '_m' + tx, tx }); }
    // veios: na cara dos barrancos de três blocos ou mais
    for (let tx = 6; tx < W - 6; tx++) for (const d of [-1, 1]) { const des = A.topo[tx + d] - A.topo[tx]; if (des < 3 || des > 18 || hash(tx * 17 + d + sem) > (reg === 'minas' ? 0.7 : 0.32)) continue; const x = d > 0 ? (tx + 1) * T + 2 : tx * T - 2; if (proibido(x)) continue; const ty = A.topo[tx] + 1 + Math.floor(hash(tx) * Math.min(4, des - 1)); E.veios.push({ x, y: ty * T + 8, id: A.id + '_v' + tx + d, d, prata: hash(tx * 3) < 0.18 }); }
    F.grade = ant; F.W = antW;
    return E;
  };
  const um2 = (l, s) => l[Math.floor(hash(s * 7 + 3) * l.length)];
  const entrar0 = F.entrar; F.entrar = function (id) { const a = entrar0(id); J.extras(a); return a; };

  // ---------- perto de quê ----------
  J.pertoMundo = function (h) {
    const A = F.atual, E = A.extras, s = J.save; if (!E) return null; s.cavados = s.cavados || {}; s.minados = s.minados || {};
    for (const a of E.arvores) if (Math.abs(a.x - h.x) < 16 && Math.abs(h.y - a.y0) < 6) return { tipo: 'escalar', o: a };
    for (const m of E.montes) if (!s.cavados[m.id] && Math.abs(m.x - h.x) < 22 && Math.abs(m.y - h.y) < 30) return { tipo: 'cavar', o: m };
    if (A.rochas) for (const r of A.rochas) if (!(s.rochas && s.rochas[r.id]) && Math.abs(r.x - h.x) < 34 && Math.abs(r.y1 * T - h.y) < 30) return { tipo: 'romper', o: r };
    for (const v of E.veios) if (!(s.minados[v.id] > J.save.dia - 3) && Math.abs(v.x - h.x) < 26 && Math.abs(v.y - (h.y - 26)) < 40) return { tipo: 'minerar', o: v };
    return null;
  };
  J.rotuloMundo = (p) => (p.tipo === 'romper' ? ((J.save.inv.picareta || 0) > 0 ? 'Abrir a parede de minério' : 'Parede de minério: precisa de picareta') : p.tipo === 'escalar' ? 'Escalar a árvore' : p.tipo === 'cavar' ? ((J.save.inv.pa || 0) > 0 ? 'Cavar a terra fofa' : 'Terra fofa: precisa de uma pá') : p.tipo === 'minerar' ? ((J.save.inv.picareta || 0) > 0 ? 'Quebrar o veio' : 'Veio de minério: precisa de picareta') : null);

  // ---------- usar ----------
  J.usaMundo = function (p) {
    const h = J.heroi, s = J.save;
    if (p.tipo === 'escalar') { h.estado = 'escala'; h.t = 0; h.arv = p.o; h.x = p.o.x - h.dir * 6; h.vx = 0; h.vy = 0; som('pano', 0.4, 1.2); return; }
    if (p.tipo === 'cavar') { if (!(s.inv.pa > 0)) { texto(h.x, h.y - 66, 'precisa de uma pá', '#e0b070'); return; } h.estado = 'cava'; h.t = 0; h.vx = 0; h.alvoM = p.o; h.dir = Math.sign(p.o.x - h.x) || h.dir; h.golpes = 0; return; }
    if (p.tipo === 'romper') { if (!(s.inv.picareta > 0)) { texto(h.x, h.y - 66, 'precisa de picareta', '#e0b070'); return; } const r = p.o; h.estado = 'minera'; h.t = 0; h.vx = 0; h.alvoV = { x: r.x, y: h.y - 30, d: Math.sign(h.x - r.x) || 1, id: r.id, rocha: r }; h.dir = Math.sign(r.x - h.x) || h.dir; h.golpes = 0; return; }
    if (p.tipo === 'minerar') { if (!(s.inv.picareta > 0)) { texto(h.x, h.y - 66, 'precisa de picareta', '#e0b070'); return; } h.estado = 'minera'; h.t = 0; h.vx = 0; h.alvoV = p.o; h.dir = p.o.d > 0 ? -1 : 1; if (Math.abs(p.o.x - h.x) > 4) h.dir = Math.sign(p.o.x - h.x); h.golpes = 0; }
  };
  // cada batida: cavar três, minerar quatro
  J.passoMundo = function (h, dt, e) {
    const s = J.save;
    if (h.estado === 'escala') {
      const a = h.arv, sobe = e.cima ? -1 : e.baixo ? 1 : 0; h.vx = 0; h.vy = 0; h.x += (a.x - h.dir * 6 - h.x) * Math.min(1, dt * 12); h.y += sobe * 96 * dt * (h.ficha.vel || 1);
      if (sobe) { h.passoE = (h.passoE || 0) + dt; if (h.passoE > 0.28) { h.passoE = 0; som('madeira', 0.12, 1.6 + Math.random() * 0.3); if (Math.random() < 0.5) fx({ tipo: 'folha', x: h.x + rnd(-6, 6), y: h.y - 40, vx: rnd(-20, 20), vy: rnd(10, 40), grav: 120, vida: 1, max: 1, cor: '#3e6a4c', tam: 2 }); } }
      h.andou += Math.abs(sobe) * 96 * dt;
      if (h.y <= a.y1 + 2) { h.y = a.y1; h.estado = 'livre'; h.t = 0; h.noChao = true; h.x = a.x + h.dir * 10; J.treina('pernas', 3); som('pano', 0.4, 1.4); }
      else if (h.y >= a.y0) { h.y = a.y0; h.estado = 'livre'; h.t = 0; }
      if (J.ja.pula > 0) { J.ja.pula = 0; h.estado = 'livre'; h.t = 0; h.vy = -320; h.vx = (e.esq ? -1 : e.dir ? 1 : -h.dir) * 170; h.dir = Math.sign(h.vx); h.noChao = false; }
      if (h.ferido) { h.estado = 'livre'; }
      return true;
    }
    if (h.estado === 'cava' || h.estado === 'minera') {
      h.vx = 0; const ritmo = h.estado === 'cava' ? 0.42 : 0.36, n = h.estado === 'cava' ? 3 : 4;
      if (h.t > ritmo * (h.golpes + 1) - 0.12 && h.golpes < n) {
        h.golpes++; const o = h.estado === 'cava' ? h.alvoM : h.alvoV;
        if (h.estado === 'cava') { som('lama', 0.4, 0.9 + h.golpes * 0.1); poeira(o.x, o.y, 8, 0); for (let i = 0; i < 6; i++) fx({ tipo: 'pedra', x: o.x + rnd(-6, 6), y: o.y - 2, vx: rnd(-80, 80), vy: rnd(-200, -90), grav: 700, vida: 0.6, max: 0.6, cor: 'rgb(' + C.REGIOES[F.atual.regiao].terra.map((v) => v + 50).join(',') + ')', tam: rnd(1.5, 3) }); }
        else { som('minerar', 0.6, 0.9 + Math.random() * 0.2); J.faiscas(o.x, o.y, 10, o.prata ? '#dfe8f0' : '#ffd89a', 1, 'faisca'); treme(1.6); }
        if (h.golpes === n) {
          if (h.estado === 'cava') { s.cavados[o.id] = 1; const l = ENTERRADO[F.atual.regiao] || ENTERRADO.floresta, q = 2 + Math.floor(Math.random() * 2); for (let i = 0; i < q; i++) J.restos.push({ m: um(l), x: o.x + rnd(-4, 4), y: o.y - 8, vx: rnd(-70, 70), vy: rnd(-260, -160), w: 6, h: 8, t: 0 }); if (Math.random() < 0.2) { s.inv.pa--; texto(h.x, h.y - 80, 'a pá quebrou', '#e0b070'); } J.treina('coleta', 6); som('raro', 0.4, 1.3); }
          else if (o.rocha) { s.rochas = s.rochas || {}; s.rochas[o.id] = 1; F.aplicaRochas(s.rochas); if (window.Desenho) Desenho.repintar(); treme(8); for (let i = 0; i < 4; i++) J.restos.push({ m: i === 0 && Math.random() < 0.6 ? 'ferro' : 'pedra', x: o.x, y: o.y, vx: rnd(-90, 90), vy: rnd(-240, -120), w: 6, h: 8, t: 0 }); for (let i = 0; i < 8; i++) poeira(o.x + rnd(-10, 10), h.y - rnd(0, 60), 6, 0); som('quebra', 1, 0.6); J.treina('oficio', 6); }
          else { s.minados[o.id] = s.dia; const q = 1 + (Math.random() < 0.4 ? 1 : 0); for (let i = 0; i < q; i++) J.restos.push({ m: o.prata && i === 0 ? 'prata' : 'ferro', x: o.x - o.d * 8, y: o.y, vx: -o.d * rnd(40, 110), vy: rnd(-220, -120), w: 6, h: 8, t: 0 }); J.restos.push({ m: 'pedra', x: o.x, y: o.y, vx: rnd(-60, 60), vy: -150, w: 6, h: 8, t: 0 }); if (Math.random() < 0.15) { s.inv.picareta--; texto(h.x, h.y - 80, 'a picareta quebrou', '#e0b070'); } J.treina('oficio', 4); som('quebra', 0.6, 0.9); }
          J.salvar();
        }
      }
      if (h.t > ritmo * n + 0.2 || J.ja.rola > 0 || J.ja.pula > 0) { h.estado = 'livre'; h.t = 0; }
      return true;
    }
    return false;
  };

  // ---------- fincar a tocha no chão: luz que fica ----------
  J.fincaTocha = function () { const s = J.save, h = J.heroi; if (!(s.inv.tocha > 0)) { texto(h.x, h.y - 66, 'sem tocha', '#e0b070'); return false; } if (!h.noChao) return false; s.inv.tocha--; s.fincadas = s.fincadas || {}; (s.fincadas[s.area] = s.fincadas[s.area] || []).push(Math.round(h.x + h.dir * 14)); som('fogo', 0.6); J.faiscas(h.x + h.dir * 14, h.y - 20, 12, '#ff9a40', 0.8, 'brasa'); J.salvar(); return true; };
  J.fincadas = () => (J.save.fincadas && J.save.fincadas[J.save.area]) || [];
  // bicho evita a luz fincada à noite
  J.temLuzPerto = (x) => J.fincadas().some((tx) => Math.abs(tx - x) < 110);
  void avisa;
})();
