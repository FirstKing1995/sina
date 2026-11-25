/* SINA · a vila cresce: poço, celeiro, casas, torres, arsenal e praça; famílias que chegam, pedidos, mercador e o cerco da cidade. */
(function () {
  'use strict';
  const J = window.Jogo, F = window.Fase, C = window.Dados, K = J.k, T = F.T;
  const { som, rnd, avisa, mover, nasce } = K;
  const um = (l) => l[Math.floor(Math.random() * l.length)];

  Object.assign(C.OBRAS, {
    poco: { nome: 'Poço', vila: 1, niveis: [{ hp: 1, custo: { pedra: 14, madeira: 6, galho: 6 } }], desc: 'Água limpa. Uma vez por dia, beber cura metade da vida. Sem poço, família nenhuma fica.' },
    celeiro: { nome: 'Celeiro', vila: 2, niveis: [{ hp: 1, custo: { madeira: 14, pedra: 8, fibra: 10 } }], desc: 'Guarda comida para o povo. Cada família come uma porção por dia.' },
    casario: { nome: 'Casa de família', vila: 2, niveis: [0, 1, 2, 3, 4].map((i) => ({ hp: 1, custo: i < 2 ? { madeira: 10, galho: 14, fibra: 8 } : { madeira: 12, pedra: 14 + i * 2, fibra: 6 } })), desc: 'Cada casa recebe uma família. Elas chegam de manhã, se houver água e comida.' },
    torre: { nome: 'Torre de vigia', vila: 2, niveis: [{ hp: 1, custo: { madeira: 16, pedra: 8, fibra: 8 } }, { hp: 1, custo: { madeira: 20, pedra: 12, ferro: 4 } }], desc: 'Atira sozinha na noite de ataque. A primeira fica à esquerda, a segunda à direita.' },
    arsenal: { nome: 'Arsenal', vila: 3, niveis: [{ hp: 1, custo: { madeira: 14, ferro: 8, couro: 6 } }], desc: 'Arma o povo: um de cada família luta na noite de ataque.' },
    praca: { nome: 'Praça do Barro', vila: 4, niveis: [{ hp: 1, custo: { pedra: 36, ferro: 8, osso: 12, trapo: 6 } }], desc: 'Uma estátua de quem veio do chão. Com cinco famílias em volta, isto vira cidade.' },
  });
  C.OBRAS_VILA = ['poco', 'celeiro', 'casario', 'torre', 'arsenal', 'praca'];
  const LOTES = [142, 149, 156, 163, 170];
  const NOMES = ['Os Tavares do Brejo', 'Os da Lenha', 'Os do Vale Seco', 'A gente da Olaria', 'Os Três Irmãos', 'A casa de Moreia', 'Os do Norte', 'A gente do Cedro', 'Os Sem Nome', 'A casa de Iberê'];
  const FALAS = ['Aqui a gente dorme. Lá, só fechava o olho.', 'As crianças já perguntam o seu nome.', 'Ouvi falar de um fogo que não apaga. É este?', 'Trouxe semente. Se pegar, divido.', 'Minha avó falava de gente feita de barro. Eu ria.', 'O poço tem gosto de pedra boa.', 'De noite eu conto as tochas. Se bater o número, durmo.'];
  C.ESTAGIOS = ['Clareira', 'Acampamento', 'Aldeia', 'Vila', 'Cidade'];
  const n = (k) => { const L = J.save.lar; return (L && L[k] && L[k].n) || 0; };
  J.familias = () => J.save.familias || [];
  J.estagio = function () {
    const m = J.moradores().length, f = J.familias().length;
    if (m >= 4 && f >= 5 && n('praca') && n('torre') >= 2) return 4;
    if (m >= 3 && f >= 2 && n('poco') && n('celeiro')) return 3;
    return m >= 2 ? 2 : m ? 1 : 0;
  };
  J.faltaEstagio = function () {
    const e = J.estagio(), m = J.moradores().length, f = J.familias().length, l = [];
    if (e === 4) return '';
    if (e < 2) return 'Para virar aldeia: solte mais ' + (2 - m) + (2 - m > 1 ? ' pessoas' : ' pessoa') + ' dos caminhos.';
    const alvo = e === 2 ? 3 : 4, fam = e === 2 ? 2 : 5;
    if (m < alvo) l.push(alvo - m > 1 ? 'mais ' + (alvo - m) + ' moradores' : 'mais um morador');
    if (e === 2) { if (!n('poco')) l.push('poço'); if (!n('celeiro')) l.push('celeiro'); } else { if (n('torre') < 2) l.push('duas torres'); if (!n('praca')) l.push('praça'); }
    if (f < fam) l.push((fam - f) + (fam - f > 1 ? ' famílias' : ' família'));
    return 'Para virar ' + (e === 2 ? 'vila' : 'cidade') + ': ' + l.join(', ') + '.';
  };
  J.confereEstagio = function () { const s = J.save, e = J.estagio(), antes = s.estagio || 0; s.estagio = e; if (e > (s.estagioMax || 0)) { s.estagioMax = e; if (e >= 3) avisa('estagio', e); } if (e !== antes) J.recalcular(); };

  // ---------- comida do povo ----------
  const PORCAO = C.PORCAO = { carne: 2, seca: 3, peixe: 2, fruta: 1 };
  J.comidaPovo = () => (n('celeiro') && J.save.lar.celeiro.comida) || 0;
  J.doaComida = function (m) { const s = J.save, o = s.lar.celeiro; if (!o || !(s.inv[m] > 0) || (o.comida || 0) >= 60) return false; s.inv[m]--; o.comida = Math.min(60, (o.comida || 0) + PORCAO[m]); som('pegar', 0.5); J.salvar(); return true; };

  // ---------- manhã: quem chega, quem come, quem traz ----------
  J.cidadeAmanhece = function (traz) {
    const s = J.save, L = s.lar; if (!L) return; let foi = false; s.familias = s.familias || [];
    if (n('celeiro')) {
      let c = (L.celeiro.comida || 0) + (n('horta') ? 1 : 0);
      for (let i = s.familias.length - 1; i >= 0; i--) {
        const f = s.familias[i];
        if (c >= 1) { c--; f.fome = 0; traz(um(['madeira', 'pedra', 'fibra', 'galho', 'fruta', 'trapo']), 1); if (Math.random() < 0.35) traz(um(['ferro', 'couro', 'osso', 'erva']), 1); }
        else if (++f.fome >= 3 && !foi) { foi = true; s.familias.splice(i, 1); if (J.povo) J.povo = J.povo.filter((q) => q.f !== f); avisa('familiaFoi', f); }
      }
      L.celeiro.comida = Math.min(60, c);
      if (n('poco') && s.familias.length < n('casario') && c >= s.familias.length + 2 && Math.random() < 0.7) {
        const usados = s.familias.map((f) => f.nome);
        const f = { nome: um(NOMES.filter((q) => !usados.includes(q))), dia: s.dia, fome: 0, lote: LOTES.findIndex((_, i) => !s.familias.some((q) => q.lote === i)) };
        s.familias.push(f); avisa('familia', f); if (s.area === 'lar' && F.atual.lugar) poeFamilia(f);
      }
    }
    if (J.estagio() === 4) traz('ferro', 1);
    J.confereEstagio();
  };
  const lote = J.loteDe = (i) => F.atual.terreno.x0 + LOTES[i] * T;
  function poeFamilia(f) { for (let k = 0; k < 2; k++) { const x = lote(f.lote) + rnd(-30, 30); J.povo.push({ id: 'fam', f, k, fila: 4 + (f.lote * 2 + k) % 4, x, y: F.chao(x), vx: 0, vy: 0, w: 14, h: 52, dir: 1, noChao: true, t: rnd(0, 3), andou: 0, vai: null, cd: 1 }); } }
  J.poeCidade = function () { const s = J.save; s.familias = s.familias || []; J.torreCd = [0, 0]; if (F.atual.lugar) { for (const f of s.familias) poeFamilia(f); J.confereEstagio(); } };
  J.falaFamilia = () => um(FALAS);

  // ---------- o que dá para usar ----------
  J.bebePoco = function () { const s = J.save, o = s.lar.poco, h = J.heroi; if (!o || o.deu === s.dia) return false; o.deu = s.dia; h.hp = Math.min(h.ficha.vida, h.hp + h.ficha.vida * 0.5); h.veneno = 0; som('beber', 0.8); J.anel(h.x, h.y - 28, 30, '#9ad8ff', 0.6, 2); J.salvar(); return true; };
  J.pertoCidade = function (h) {
    const lug = F.atual.lugar; if (!lug || !J.save.lar || J.raid) return null; const p = (k, d) => Math.abs(lug[k] - h.x) < (d || 26);
    if (n('poco') && p('poco') && J.save.lar.poco.deu !== J.save.dia) return { tipo: 'poco' };
    if (J.mercador() && Math.abs(lug.mercador - h.x) < 34) return { tipo: 'mercador' };
    if (n('celeiro') && p('celeiro', 34)) return { tipo: 'celeiro' };
    return null;
  };

  // ---------- mercador: passa a cada três dias, de dia, a partir da vila ----------
  const TROCAS = [[{ couro: 4 }, 'ferro', 3], [{ osso: 6 }, 'ferro', 3], [{ peixe: 3 }, 'trapo', 4], [{ fruta: 8 }, 'curativo', 2], [{ orelha: 5 }, 'flecha', 14], [{ presa: 4 }, 'ferro', 4], [{ pele: 4 }, 'trapo', 6], [{ pedra: 12 }, 'madeira', 5], [{ galho: 14 }, 'tocha', 2], [{ ferro: 5 }, 'prata', 1], [{ seca: 3 }, 'curativo', 2], [{ erva: 5 }, 'seca', 3]];
  J.mercador = () => { const s = J.save; return J.estagio() >= 3 && s.dia % 3 === 0 && s.hora >= 7 && s.hora < 18; };
  J.trocas = function () {
    const s = J.save;
    if (!s.merc || s.merc.dia !== s.dia) { const ordem = (i) => (i * 73 + s.dia * 31 * (i + 1)) % 97, l = TROCAS.map((_, i) => i).sort((a, b) => ordem(a) - ordem(b)); s.merc = { dia: s.dia, l: l.slice(0, J.estagio() === 4 ? 5 : 4), feito: {} }; }
    return s.merc.l.map((i) => ({ i, custo: TROCAS[i][0], da: TROCAS[i][1], n: TROCAS[i][2], resta: 2 - (s.merc.feito[i] || 0) }));
  };
  J.podeTroca = (t) => t.resta > 0 && Object.keys(t.custo).every((m) => (J.save.inv[m] || 0) >= t.custo[m]);
  J.troca = function (t) { const s = J.save; if (!J.podeTroca(t)) return false; for (const m in t.custo) s.inv[m] -= t.custo[m]; s.inv[t.da] = (s.inv[t.da] || 0) + t.n; s.merc.feito[t.i] = (s.merc.feito[t.i] || 0) + 1; som('raro', 0.5); J.salvar(); return true; };

  // ---------- pedidos: um por morador, novo dois dias depois ----------
  const PEDE = { ferreiro: [['ferro', 4], ['madeira', 6], ['pedra', 10]], curandeira: [['erva', 5], ['fruta', 6], ['fibra', 8]], cacador: [['couro', 4], ['osso', 6], ['galho', 10]], vigia: [['trapo', 4], ['pedra', 10], ['tocha', 2]] };
  C.CONFIA = { ferreiro: '+4% de dano', curandeira: '+8 de vida', cacador: '+2% de golpe certeiro', vigia: '+1% de defesa' };
  J.pedido = function (id) { const s = J.save, v = s.vila[id]; if (!v || (v.conf || 0) >= 5) return null; if (!v.pede && s.dia >= (v.prox || 0)) { const p = PEDE[id][(v.conf || 0) % 3]; v.pede = { m: p[0], n: p[1] + (v.conf || 0) }; } return v.pede || null; };
  J.atende = function (id) { const s = J.save, v = s.vila[id], p = J.pedido(id); if (!p || (s.inv[p.m] || 0) < p.n) return false; s.inv[p.m] -= p.n; v.pede = null; v.prox = s.dia + 2; v.conf = Math.min(5, (v.conf || 0) + 1); J.treina('oficio', 12); J.recalcular(); som('raro', 0.6); J.salvar(); avisa('confia', [id, v.conf]); return true; };
  J.bonusVila = function (f) {
    const s = J.save, c = (id) => (s.vila && s.vila[id] && s.vila[id].conf) || 0;
    f.dano *= 1 + c('ferreiro') * 0.04; f.vida += c('curandeira') * 8; f.critico += c('cacador') * 0.02; f.def = Math.min(0.66, f.def + c('vigia') * 0.01);
    if (s.estagio === 4) { f.vida += 15; f.vigor += 10; }
  };

  // ---------- a noite: torres e povo ----------
  function atira(x, y, alvo, dano, flecha) { const d = Math.sign(alvo.x - x) || 1, v = 420, t = Math.max(0.15, Math.abs(alvo.x - x) / v); J.balas.push({ dono: 'h', tipo: flecha ? 'flecha' : 'pedra', flecha, x: x + d * 10, y, vx: d * v, vy: (alvo.y - alvo.h / 2 - y) / t - 120 * t, grav: 240, r: 4, dano, vida: 1.8, cor: '#b0aaa0', deHum: true }); }
  const perto = (x, d) => J.inimigos.filter((e) => e.vivo && e.raid && Math.abs(e.x - x) < d).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
  J.torres = () => { const lug = F.atual.lugar; return lug ? [lug.torre, lug.torreD].slice(0, n('torre')) : []; };
  function passoLuta(q) {
    const a = perto(q.x, 340); q.vai = null; q.vx = 0;
    if (a) { q.dir = Math.sign(a.x - q.x) || 1; if (Math.abs(a.x - q.x) < 80) q.vx = -q.dir * 80; if (q.cd <= 0) { q.cd = 2.6; q.tGolpe = 0.4; atira(q.x, q.y - 40, a, 20, false); } return; }
    const z = perto(q.x, 1e5); if (!z) return; // longe da briga: vai até perto dela
    const d = z.x + (q.x < z.x ? -1 : 1) * (190 + q.f.lote * 18) - q.x; q.vx = Math.abs(d) > 12 ? Math.sign(d) * 120 : 0; if (q.vx) q.dir = Math.sign(q.vx);
  }
  function passoDia(q, dt) {
    const c = lote(q.f.lote), noite = J.ehNoite();
    if (q.t > 4 + (q.k * 1.7 + q.f.lote) % 5) { q.t = 0; const r = Math.random(); q.vai = noite ? c : r < 0.2 && n('poco') ? F.atual.lugar.poco + rnd(-24, 24) : r < 0.34 && n('praca') ? F.atual.lugar.praca + rnd(-50, 50) : c + rnd(-44, 44); if (!noite && Math.random() < 0.25) q.tTrab = 2.2; }
    q.tTrab = Math.max(0, (q.tTrab || 0) - dt); const d = q.vai == null ? 0 : q.vai - q.x; q.vx = Math.abs(d) > 8 && q.tTrab <= 0 ? Math.sign(d) * 44 : 0; if (q.vx) q.dir = Math.sign(q.vx);
    if (noite && Math.abs(c - q.x) < 12) q.dentro = true;
  }
  J.passoCidade = function (dt) {
    if (J.raid) J.torres().forEach((x, i) => { J.torreCd[i] -= dt; if (J.torreCd[i] > 0) return; const a = perto(x, 560); if (a) { J.torreCd[i] = 1.3; atira(x, F.atual.terreno.piso - 92, a, 34, true); som('corte', 0.2, 1.4); } });
    for (const q of J.povo || []) if (q.id === 'fam') {
      q.t += dt; q.cd -= dt; q.tGolpe = Math.max(0, (q.tGolpe || 0) - dt); const luta = J.raid && n('arsenal') && q.k === 0; q.dentro = !!J.raid && !luta;
      if (luta) passoLuta(q); else passoDia(q, dt);
      q.vy = Math.min(K.QUEDA, q.vy + K.G * dt); const x0 = q.x; mover(q, dt); q.andou += Math.abs(q.x - x0);
    }
  };
  J.defesaCidade = () => n('torre') * 12 + (n('arsenal') ? 10 : 0) + J.familias().length * 3;
  // a cada sete dias a cidade é cercada: a última onda traz um forte de cada espécie
  J.ehCerco = () => J.estagio() === 4 && J.save.dia % 7 === 0;
  J.ondaCerco = function () { ['lobo_rubro', 'cobra_prata', 'zumbi_inchado', 'goblin_porrete'].forEach((t, i) => { const lado = i % 2 ? 1 : -1, x = lado > 0 ? (F.W - 7) * T - i * 14 : 8 * T + i * 14; J.inimigos.push(nasce(t, x, F.chao(x), { estado: 'persegue', raid: true, chamado: true, t: -i * 0.4, dir: -lado })); }); };
})();
