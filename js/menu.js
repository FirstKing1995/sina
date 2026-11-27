/* SINA · o menu: trilho de abas, lista de um lado e detalhe do outro. Os ícones saem de assets/ui/icones.webp. */
(function () {
  'use strict';
  const J = window.Jogo, F = window.Fase, C = window.Dados, D = window.Desenho, B = window.BARRO;
  const U = window.UI_ARTE || { icones: {}, linhas: 4 };
  const UI = window.UI = {};
  const el = UI.el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  // ícone pintado do kit
  UI.ico = (n, cls) => { const e = el('i', 'ico' + (cls ? ' ' + cls : '')), p = U.icones[n]; if (p) { e.style.setProperty('--x', p[0]); e.style.setProperty('--y', p[1]); } return e; };
  UI.troca = (e, n) => { const p = U.icones[n]; if (e && p) { e.style.setProperty('--x', p[0]); e.style.setProperty('--y', p[1]); } };
  UI.item = (m, t) => { const c = D.icone(m, t || 34); c.className = 'ic'; return c; };

  // ---------- preferências do jogador ----------
  const PAD = { v: 2, coleta: 1, tremor: 1, vibra: 1, assist: 1, numeros: 1, brilho: 1, repete: 1, golpeE: 0, esc: 1, alfa: 0.9, texto: 1, bichos: 1, meta: 1 };
  UI.pref = Object.assign({}, PAD);
  try { const g = JSON.parse(localStorage.getItem('sina_pref')) || {}; if (!(g.v >= 2)) { g.coleta = 1; g.v = 2; } Object.assign(UI.pref, g); } catch (e) { /* nada guardado */ }
  UI.mudaPref = function (k, v) { UI.pref[k] = v; try { localStorage.setItem('sina_pref', JSON.stringify(UI.pref)); } catch (e) { /* nada */ } UI.aplica(); };
  UI.aplica = function () {
    const r = document.documentElement, p = UI.pref, b = Math.max(0.78, Math.min(1.45, Math.min(innerHeight, innerWidth) / 390));
    r.style.setProperty('--b', (b * p.esc).toFixed(3)); r.style.setProperty('--alfa', p.alfa); r.style.setProperty('--txt', p.texto);
    document.body.classList.toggle('golpe-esq', !!p.golpeE); J.pref = p;
  };
  UI.vibra = (t) => { if (UI.pref.vibra && navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) try { navigator.vibrate(t); } catch (e) { /* sem motor */ } };
  addEventListener('resize', UI.aplica); UI.aplica();

  // qual desenho representa cada coisa
  const ICARMA = { punho: 'punho' };
  UI.iconeArma = (a, t) => (ICARMA[a] ? UI.ico(ICARMA[a]) : UI.item(a, t || 40));
  const icRoupa = (r, t) => (['pele', 'osso', 'prata'].includes(r) ? UI.item('r_' + r, t) : r === 'folhas' ? UI.item('folha', t) : r === 'couro' ? UI.item('couro', t) : UI.ico('escudo'));
  const icReceita = (r, t) => (r.tipo === 'amuleto' ? UI.item('a_' + r.id, t) : r.tipo === 'roupa' ? icRoupa(r.id, t) : r.id === 'isca' ? UI.ico('bigorna') : r.id === 'curativo' ? UI.item('trapo', t) : UI.item(r.id, t));
  const icMat = (m, t) => UI.item(m === 'curativo' ? 'trapo' : m, t);
  const ICPER = { punho: 'punho', porrete: 'porrete', lamina: 'lamina', espada: 'golpe', machado: 'machado', lanca: 'lanca', arco: 'arco', magia: 'olho', corpo: 'vida', folego: 'pulmao', pernas: 'perna', coleta: 'cesto', oficio: 'bigorna' };
  const ICOBRA = { casa: 'casa', cercaE: 'escudo', cercaD: 'escudo', estacasE: 'espinhos', estacasD: 'espinhos', varal: 'comer', horta: 'cesto', curtume: 'braco', bau: 'bau', berco: 'familia', poco: 'gota', celeiro: 'fome', casario: 'casa', torre: 'alvo', arsenal: 'lanca', praca: 'taca' };

  const guardaEscolha = {}; // aba -> o que estava escolhido
  let filtro = {};

  UI.criarMenu = function (api) {
    const { som, sussurra, voltar, titulo, montaMagias, nomeArea, pintaMapa, retratoBicho, toque } = api;
    const ABAS = [['mochila', 'Mochila', 'mochila'], ['criar', 'Criar', 'bigorna'], ['lar', 'Lar', 'casa'], ['mapa', 'Mapa', 'mapa'], ['pericias', 'Perícias', 'braco'], ['titulos', 'Títulos', 'taca'], ['caderno', 'Caderno', 'livro'], ['opcoes', 'Opções', 'engrenagem']];
    const TIT = { mochila: 'Mochila', criar: 'Criar', lar: 'O lar', mapa: 'Mapa', pericias: 'Perícias', titulos: 'Títulos', caderno: 'Caderno do caçador', opcoes: 'Opções' };
    const $ = (id) => document.getElementById(id);
    const bt = (txt, f, cls, ico) => { const b = el('button', cls); if (ico) b.append(UI.ico(ico)); b.append(document.createTextNode(txt)); b.onclick = () => { if (b.disabled) return; if (window.Som) Som.ligar(); som('abrir', 0.4, 1.3); UI.vibra(8); f(); }; return b; };
    const custos = (cu) => { const s = J.save, q = el('div', 'custos'); for (const m in cu) { const t = s.inv[m] || 0, k = el('span', t >= cu[m] ? 'tem' : 'falta'); k.append(icMat(m, 26), el('b', '', t + '/' + cu[m]), el('small', '', C.MAT[m])); q.append(k); } return q; };
    const barra = (v, m, cls) => { const b = el('div', 'medida ' + (cls || '')), i = el('i'); i.style.width = Math.max(0, Math.min(100, (v / m) * 100)) + '%'; b.append(i); return b; };
    const fichas = (l, aba, pinta) => { const f = el('div', 'fichas'); for (const [id, n] of l) { const b = el('button', (filtro[aba] || l[0][0]) === id ? 'ativa' : '', n); b.onclick = () => { filtro[aba] = id; som('abrir', 0.25, 1.6); pinta(); }; f.append(b); } return f; };

    // uma tela de lista + detalhe: grupos = [[titulo, [itens]]]; cada item = {id, ico(), nome, sub, marca, apagado, atual, qtd}
    function duas(c, aba, grupos, detalhe, modoLista) {
      const todos = grupos.flatMap((g) => g[1]); let esc = guardaEscolha[aba]; if (!todos.some((i) => i.id === esc)) esc = todos.length ? (todos.find((i) => i.atual) || todos.find((i) => i.pode) || todos[0]).id : null;
      guardaEscolha[aba] = esc;
      const corpo = el('div', 'duas'), l = el('div', 'lado lista-' + (modoLista || 'grade')), d = el('div', 'lado detalhe');
      for (const [tit, its] of grupos) {
        if (!its.length) continue; if (tit) l.append(el('h3', '', tit));
        const g = el('div', modoLista === 'linhas' ? 'linhas' : 'vagas');
        for (const it of its) {
          const b = el('button', 'vaga' + (it.id === esc ? ' escolhida' : '') + (it.atual ? ' atual' : '') + (it.apagado ? ' apagada' : '') + (it.pode ? ' pode' : ''));
          b.append(it.ico());
          if (modoLista === 'linhas') { const t = el('span', 'v-txt'); t.append(el('b', '', it.nome)); if (it.sub) t.append(el('small', '', it.sub)); b.append(t); if (it.marca) b.append(UI.ico(it.marca, 'mini')); }
          else { if (it.qtd != null) b.append(el('em', '', it.qtd)); if (it.marca) b.append(UI.ico(it.marca, 'mini')); b.append(el('small', '', it.nome)); }
          b.onclick = () => { if (guardaEscolha[aba] === it.id && !corpo.classList.contains('abre')) { corpo.classList.add('abre'); return; } guardaEscolha[aba] = it.id; som('abrir', 0.25, 1.5); for (const q of l.querySelectorAll('.escolhida')) q.classList.remove('escolhida'); b.classList.add('escolhida'); corpo.classList.add('abre'); mostraD(it); };
          g.append(b); it.b = b;
        }
        l.append(g);
      }
      if (!todos.length) l.append(el('p', 'vazio', 'Nada aqui ainda.'));
      function mostraD(it) { d.innerHTML = ''; d.classList.remove('entra'); void d.offsetWidth; d.classList.add('entra'); const f = el('button', 'd-volta', 'Voltar'); f.onclick = () => corpo.classList.remove('abre'); d.append(f); detalhe(d, it); }
      corpo.append(l, d); c.append(corpo);
      const at = todos.find((i) => i.id === esc); if (at) mostraD(at); else d.append(el('p', 'vazio', 'Escolha algo na lista.'));
      if (at && at.b) requestAnimationFrame(() => { const r = at.b.getBoundingClientRect(), q = l.getBoundingClientRect(); if (r.bottom > q.bottom || r.top < q.top) l.scrollTop += r.top - q.top - 60; });
    }
    const topoD = (d, ico, nome, sub) => { const t = el('div', 'd-topo'), m = el('div', 'd-ico'); m.append(ico); const x = el('div'); x.append(el('h2', '', nome)); if (sub) x.append(el('small', '', sub)); t.append(m, x); d.append(t); };
    const num = (d, l) => { const g = el('div', 'numeros'); for (const [a, b, dif] of l) { const q = el('div'); q.append(el('small', '', a), el('b', '', b)); if (dif) q.append(el('em', dif > 0 ? 'sobe' : 'desce', (dif > 0 ? '+' : '') + dif)); g.append(q); } d.append(g); };
    const danoDe = (a) => Math.round(C.ARMAS[a].dano * (1 + J.nivel(C.ARMAS[a].per) * C.BONUS) * (1 + (J.save.afiado[a] || 0) * 0.04));

    // ---------- mochila ----------
    let boneco = null;
    function pintaBoneco() {
      if (!boneco || !boneco.isConnected) return; const q = boneco.getContext('2d'), s = J.save, im = D.img['h_' + s.roupa] || D.img.h_barro; q.clearRect(0, 0, 100, 100); q.imageSmoothingEnabled = false;
      const a = B.anims.parado, n = [0, 0, 1, 3, 3, 1][Math.floor(performance.now() / 420) % 6], k = a[0] + Math.min(a[1] - 1, n); q.drawImage(im, (k % B.cols) * B.q, Math.floor(k / B.cols) * B.q, B.q, B.q, 0, 4, 100, 100);
      setTimeout(pintaBoneco, 210);
    }
    function mochila(c) {
      const s = J.save, h = J.heroi, f = h.ficha, tira = el('div', 'veste');
      const cx = el('div', 'boneco'); boneco = el('canvas'); boneco.width = boneco.height = 100; cx.append(boneco); tira.append(cx);
      const vg = el('div', 'v-vagas'); const V = (rot, ico, t) => { const q = el('div', 'v-vaga'); q.append(ico || el('i', 'nada')); q.append(el('small', '', t || rot)); vg.append(q); };
      V('arma', UI.iconeArma(s.arma, 40), C.ARMAS[s.arma].nome); V('roupa', icRoupa(s.roupa, 40), C.ROUPAS[s.roupa].nome);
      for (let i = 0; i < 2; i++) V('amuleto', s.amu[i] ? UI.item('a_' + s.amu[i], 40) : null, s.amu[i] ? C.AMULETOS[s.amu[i]].nome : 'Amuleto');
      tira.append(vg);
      num(tira, [['Vida', Math.ceil(h.hp) + '/' + f.vida], ['Fôlego', Math.round(f.vigor)], ['Dano', Math.round(f.dano)], ['Defesa', Math.round(f.def * 100) + '%'], ['Crítico', Math.round(f.critico * 100) + '%'], ['Passo', Math.round(f.vel * 100) + '%']]);
      c.append(tira); pintaBoneco();
      const q = filtro.mochila || 'tudo', ve = (k) => q === 'tudo' || q === k;
      c.append(fichas([['tudo', 'Tudo'], ['armas', 'Armas'], ['vestir', 'Vestir'], ['comida', 'Comida'], ['mat', 'Materiais'], ['magia', 'Magias']], 'mochila', pinta));
      const g = [];
      if (ve('armas')) g.push(['Armas', C.ORDEM_ARMAS.filter((a) => s.armas.includes(a)).map((a) => ({ id: 'arma_' + a, t: 'arma', v: a, ico: () => UI.iconeArma(a, 40), nome: C.ARMAS[a].nome + (s.afiado[a] ? ' +' + s.afiado[a] : ''), atual: s.arma === a, marca: s.arma === a ? 'certo' : null }))]);
      if (ve('vestir')) g.push(['Roupas e amuletos', s.roupas.map((r) => ({ id: 'roupa_' + r, t: 'roupa', v: r, ico: () => icRoupa(r, 40), nome: C.ROUPAS[r].nome, atual: s.roupa === r, marca: s.roupa === r ? 'certo' : null })).concat(s.amuletos.map((a) => ({ id: 'amu_' + a, t: 'amu', v: a, ico: () => UI.item('a_' + a, 40), nome: C.AMULETOS[a].nome, atual: s.amu.includes(a), marca: s.amu.includes(a) ? 'certo' : null })))]);
      const mats = Object.keys(C.MAT).filter((m) => s.inv[m] > 0);
      if (ve('comida')) g.push(['Comida e remédio', mats.filter((m) => C.COMER[m]).map((m) => ({ id: 'mat_' + m, t: 'mat', v: m, ico: () => icMat(m, 40), nome: C.MAT[m], qtd: s.inv[m] }))]);
      if (ve('mat')) g.push(['Materiais', mats.filter((m) => !C.COMER[m]).map((m) => ({ id: 'mat_' + m, t: 'mat', v: m, ico: () => icMat(m, 40), nome: C.MAT[m], qtd: s.inv[m] }))]);
      if (ve('magia') && s.magias.length) g.push(['Magias', s.magias.map((m, i) => ({ id: 'mag_' + m, t: 'mag', v: m, ico: () => UI.ico(m), nome: C.MAGIAS[m].nome, atual: !i || s.magia2 === m, marca: !i || s.magia2 === m ? 'certo' : null }))]);
      duas(c, 'mochila', g, (d, it) => {
        if (it.t === 'arma') { const A = C.ARMAS[it.v]; topoD(d, UI.iconeArma(it.v, 64), it.nome, C.PERICIAS[A.per][0]); num(d, [['Dano', danoDe(it.v), s.arma !== it.v ? danoDe(it.v) - danoDe(s.arma) : 0], ['Rapidez', Math.round(60 / A.tempo / 2) + '/min'], ['Alcance', A.alcance], ['Abalo', A.quebra]]); d.append(el('p', '', A.desc), el('p', 'jeito', C.ESTILOS[A.per].nota)); if (s.arma !== it.v) d.append(bt('Empunhar', () => { J.empunhar(it.v); pinta(); }, 'ir', 'golpe')); else d.append(el('p', 'nota', 'Está na sua mão.')); }
        else if (it.t === 'roupa') { const R = C.ROUPAS[it.v]; topoD(d, icRoupa(it.v, 64), R.nome, 'Roupa'); num(d, [['Defesa', Math.round(R.def * 100) + '%', s.roupa !== it.v ? Math.round((R.def - C.ROUPAS[s.roupa].def) * 100) : 0], ['Vida', '+' + (R.vida || 0)], ['Fôlego', '+' + (R.vigor || 0)], ['Reforço', (s.reforco[it.v] || 0) + '/3']]); d.append(el('p', '', R.desc)); if (s.roupa !== it.v) d.append(bt('Vestir', () => { J.vestir(it.v); pinta(); }, 'ir', 'escudo')); else d.append(el('p', 'nota', 'Você está vestindo.')); }
        else if (it.t === 'amu') { const A = C.AMULETOS[it.v], usa = s.amu.includes(it.v); topoD(d, UI.item('a_' + it.v, 64), A.nome, 'Amuleto · ' + s.amu.length + ' de 2 no pescoço'); d.append(el('p', '', A.desc), bt(usa ? 'Tirar' : 'Pendurar', () => { J.poeAmuleto(it.v); pinta(); }, usa ? '' : 'ir')); }
        else if (it.t === 'mag') { const M = C.MAGIAS[it.v], i = s.magias.indexOf(it.v); topoD(d, UI.ico(it.v, 'grande'), M.nome, 'Magia'); num(d, [['Custo', M.custo + ' Sina'], ['Espera', M.espera + ' s']]); d.append(el('p', '', M.desc)); if (i === 0) d.append(el('p', 'nota', 'Sempre no primeiro botão.')); else if (s.magia2 !== it.v) d.append(bt('Pôr no segundo botão', () => { s.magia2 = it.v; J.salvar(); pinta(); montaMagias(); }, 'ir')); else d.append(el('p', 'nota', 'No segundo botão.')); }
        else {
          const m = it.v, K = C.COMER[m]; topoD(d, icMat(m, 64), C.MAT[m], s.inv[m] + ' na mochila');
          if (K) { num(d, [['Vida', '+' + (K.vida || 0)], ['Fome', '+' + (K.fome || 0)]].concat(K.cura ? [['Veneno', 'tira']] : [])); d.append(bt('Usar', () => { J.comer(m); pinta(); }, 'ir', 'comer')); }
          if (m === 'tocha') { d.append(bt(s.tochaAcesa ? 'Apagar (' + Math.ceil(s.tocha / 60) + ' min)' : 'Acender', () => { J.tocha(); pinta(); }, 'ir', 'tocha')); d.append(bt('Fincar no chão aqui', () => { if (J.fincaTocha()) voltar(); }, '', 'fogueira'), el('p', 'nota', 'Fica acesa para sempre neste lugar. Tecla B.')); }
          if (m === 'pa') d.append(el('p', '', 'Procure a terra fofa: um montinho de terra que brilha. Três batidas e o que estava enterrado sobe.'));
          if (m === 'picareta') d.append(el('p', '', 'Os veios brilham na cara dos barrancos. Quatro batidas e sai ferro, às vezes prata. Volta a dar depois de três dias.'));
          const us = C.RECEITAS.filter((r) => r.custo[m]); if (us.length) { d.append(el('h3', '', 'Serve para')); const g2 = el('div', 'serve'); for (const r of us) { const x = el('button', 'chip'); x.append(icReceita(r, 24), document.createTextNode(nomeR(r))); x.onclick = () => { guardaEscolha.criar = r.id; filtro.criar = 'tudo'; UI.aba('criar'); }; g2.append(x); } d.append(g2); }
        }
      });
    }
    const nomeR = (r) => (r.tipo === 'arma' ? C.ARMAS[r.id].nome : r.tipo === 'roupa' ? C.ROUPAS[r.id].nome : r.tipo === 'amuleto' ? C.AMULETOS[r.id].nome : r.nome);

    // ---------- criar ----------
    function criar(c) {
      const s = J.save, q = filtro.criar || 'tudo', nivel = J.nivel('oficio'), po = s.per.oficio || { x: 0 };
      const t = el('div', 'faixa'); t.append(UI.ico('bigorna')); const x = el('div'); x.append(el('b', '', 'Ofício ' + nivel), barra(po.x, C.xpNivel(nivel)), el('small', '', 'Cada coisa feita ensina a fazer melhor.')); t.append(x); c.append(t);
      c.append(fichas([['tudo', 'Tudo'], ['pode', 'Dá para fazer'], ['arma', 'Armas'], ['roupa', 'Roupas'], ['amuleto', 'Amuletos'], ['item', 'Itens']], 'criar', pinta));
      const its = C.RECEITAS.filter((r) => q === 'tudo' || (q === 'pode' ? J.pode(r) && !J.jaTem(r) : (r.tipo || 'item') === q)).map((r) => { const trava = nivel < (r.oficio || 0), tem = J.jaTem(r); return { id: r.id, r, ico: () => icReceita(r, 36), nome: nomeR(r), sub: tem ? 'Já tem' : trava ? 'Ofício ' + r.oficio : J.pode(r) ? 'Pronto para fazer' : 'Faltam materiais', pode: J.pode(r) && !tem, apagado: tem || trava, marca: tem ? 'certo' : trava ? 'cadeado' : null }; });
      its.sort((a, b) => (b.pode ? 1 : 0) - (a.pode ? 1 : 0) || (a.apagado ? 1 : 0) - (b.apagado ? 1 : 0));
      duas(c, 'criar', [['', its]], (d, it) => {
        const r = it.r, A = C.ARMAS[r.id], R = C.ROUPAS[r.id]; topoD(d, icReceita(r, 64), it.nome, r.tipo === 'arma' ? 'Arma · ' + C.PERICIAS[A.per][0] : r.tipo === 'roupa' ? 'Roupa' : r.tipo === 'amuleto' ? 'Amuleto' : 'Item');
        if (r.tipo === 'arma') num(d, [['Dano', danoDe(r.id), danoDe(r.id) - danoDe(s.arma)], ['Rapidez', Math.round(60 / A.tempo / 2) + '/min'], ['Alcance', A.alcance]]);
        if (r.tipo === 'roupa') num(d, [['Defesa', Math.round(R.def * 100) + '%', Math.round((R.def - C.ROUPAS[s.roupa].def) * 100)], ['Vida', '+' + (R.vida || 0)], ['Fôlego', '+' + (R.vigor || 0)]]);
        d.append(custos(r.custo));
        d.append(el('p', '', r.desc || (r.tipo === 'arma' ? A.desc : r.tipo === 'roupa' ? R.desc : r.tipo === 'amuleto' ? C.AMULETOS[r.id].desc : 'Sempre útil.')));
        if (r.tipo === 'arma') d.append(el('p', 'jeito', C.ESTILOS[A.per].nota));
        const trava = nivel < (r.oficio || 0), b = bt(J.jaTem(r) ? 'Já tem' : trava ? 'Precisa de Ofício ' + r.oficio : 'Fazer', () => { if (J.criar(r)) { UI.vibra([12, 30, 18]); pinta(); } }, 'ir grande', J.jaTem(r) ? 'certo' : trava ? 'cadeado' : 'bigorna'); b.disabled = !J.pode(r) || J.jaTem(r); d.append(b);
      }, 'linhas');
    }

    // ---------- lar ----------
    function lar(c) {
      const s = J.save, L = s.lar, aqui = s.area === 'lar', t = el('div', 'faixa larga');
      const P = (ico, n, v, b) => { const q = el('div', 'pino'); q.append(UI.ico(ico)); const x = el('div'); x.append(el('small', '', n), el('b', '', v)); if (b) x.append(b); q.append(x); t.append(q); };
      P('casa', L.casa.n ? C.CASAS[L.casa.n].nome : 'Sem casa', L.casa.n ? Math.ceil(L.casa.hp) + '/' + C.CASAS[L.casa.n].hp : 'só chão', L.casa.n ? barra(L.casa.hp, C.CASAS[L.casa.n].hp) : null);
      P('fogueira', 'Fogo', L.lenha > 0 ? Math.round(L.lenha) + ' h' : 'apagado', barra(L.lenha, 48)); P('familia', C.ESTAGIOS[J.estagio()], J.moradores().length + ' moradores · ' + J.familias().length + ' famílias'); if (L.celeiro && L.celeiro.n) P('fome', 'Celeiro', J.comidaPovo() + '/60', barra(J.comidaPovo(), 60));
      c.append(t);
      c.append(el('p', 'nota', (aqui ? 'Toda noite, às 21 h, alguém vem. Cerca segura, estaca fere, fogo aceso afasta uma onda. ' : 'Para construir e consertar, volte à Clareira do Rio. ') + J.faltaEstagio()));
      const G = [['Teto', ['casa']], ['Defesa', ['cercaE', 'cercaD', 'estacasE', 'estacasD', 'torre', 'arsenal']], ['Sustento', ['varal', 'horta', 'curtume', 'bau', 'berco']], ['Vila', ['poco', 'celeiro', 'casario', 'praca']]];
      const grupos = G.map(([n, l]) => [n, l.map((id) => { const o = J.custoObra(id), n0 = id === 'casa' ? L.casa.n : (L[id] && L[id].n) || 0, hp = id === 'casa' ? L.casa.hp : L[id] ? L[id].hp : 0, ch = J.cheioObra(id); const nome = o ? (id === 'casa' && n0 ? o.nome : o.nome) : id === 'casa' ? C.CASAS[L.casa.n].nome : C.OBRAS[id].nome; return { id, o, n0, hp, ch, ico: () => UI.ico(ICOBRA[id]), nome, sub: n0 && ch > 1 && hp < ch ? 'Precisa de conserto: ' + Math.ceil(hp) + '/' + ch : !o ? 'Pronto' : o.trava ? 'Precisa de ' + o.trava.toLowerCase() : n0 ? (id === 'casa' ? 'Próxima melhoria' : 'Nível ' + n0 + ', dá para melhorar') : 'Por fazer', pode: J.podeObra(id), apagado: !!(o && o.trava) || !o, marca: !o ? 'certo' : o.trava ? 'cadeado' : null }; })]);
      const gente = [];
      if (s.hum) gente.push({ id: 'hum', g: 1, ico: () => UI.ico('vida'), nome: s.hum.nome, sub: J.lacoNome(s.hum.laco), txt: J.lacoNome(s.hum.laco) + (s.hum.onde === 'levada' ? ', levada para ' + nomeArea(s.hum.cativeiro) : s.hum.onde === 'segue' ? ', anda com você' : ', está no lar') + (s.hum.gravida ? '. Espera um filho.' : '.') });
      if (s.mae) gente.push({ id: 'mae', g: 1, ico: () => UI.ico('familia'), nome: s.mae.nome, sub: 'Sua mãe', txt: 'Cuida do lar.' });
      s.prole.forEach((p, i) => { const d = s.dia - p.dia; gente.push({ id: 'p' + i, g: 1, ico: () => UI.ico('familia'), nome: p.nome, sub: d < 2 ? 'Bebê de colo' : d < 5 ? 'Criança' : 'Crescido', txt: d < 2 ? 'Dorme no berço.' : d < 5 ? 'Faltam ' + (5 - d) + ' dias para poder continuar você.' : 'Pode continuar você.' }); });
      for (const m of J.moradores()) gente.push({ id: 'm' + m, g: 1, ico: () => UI.ico({ ferreiro: 'bigorna', curandeira: 'folego', cacador: 'arco', vigia: 'alvo' }[m]), nome: s.vila[m].nome, sub: C.VILA[m].oficio, txt: 'Na vila desde o dia ' + s.vila[m].dia + '. Confiança ' + (s.vila[m].conf || 0) + ' de 5: cada uma dá ' + C.CONFIA[m] + '.' });
      J.familias().forEach((f, i) => gente.push({ id: 'f' + i, g: 1, ico: () => UI.ico('familia'), nome: f.nome, sub: f.fome ? 'Com fome' : 'Família', txt: 'Chegaram no dia ' + f.dia + (f.fome ? '. Sem comida há ' + f.fome + (f.fome > 1 ? ' dias.' : ' dia.') : '.') }));
      grupos.push(['Gente', gente]);
      duas(c, 'lar', grupos, (d, it) => {
        if (it.g) { topoD(d, it.ico(), it.nome, it.sub); d.append(el('p', '', it.txt)); if (it.id[0] === 'm' && J.moradores().length >= 2) { d.append(el('h3', '', 'Nome da vila')); const i = el('input', 'nomevila'); i.maxLength = 22; i.placeholder = 'Nome da vila'; i.value = s.nomeVila || ''; i.onchange = () => { s.nomeVila = i.value.trim(); J.salvar(); }; d.append(i); } if (it.id === 'hum') d.append(el('p', 'nota', 'Filhos: laço de Companhia (60), cabana trançada, berço e uma noite dormida no lar.')); return; }
        topoD(d, UI.ico(ICOBRA[it.id], 'grande'), it.nome, it.n0 && it.id !== 'casa' ? 'Nível ' + it.n0 : it.n0 ? 'Agora: ' + C.CASAS[it.n0].nome : 'Ainda não existe');
                if (it.o) { if (it.o.trava) d.append(el('p', 'alerta', 'Precisa de ' + it.o.trava.toLowerCase() + '.')); d.append(custos(it.o.custo)); }
        d.append(el('p', '', it.o ? it.o.desc : it.id === 'casa' ? 'Não dá para ficar melhor do que isto.' : C.OBRAS[it.id].desc));
        if (it.n0 && it.ch > 1) { d.append(barra(it.hp, it.ch), el('small', 'nota', Math.ceil(it.hp) + ' de ' + it.ch)); if (it.hp < it.ch) { const b = bt('Consertar (2 galhos)', () => { if (J.conserta(it.id)) pinta(); }, '', 'bigorna'); b.disabled = !aqui || (s.inv.galho || 0) < 2 || !!J.raid; d.append(b); } }
        if (it.id === 'curtume' && it.n0 && s.roupa !== 'barro') { const n = s.reforco[s.roupa] || 0, b = bt(n >= 3 ? 'Roupa reforçada ao máximo' : 'Reforçar a roupa (' + n + '/3)', () => { if (J.reforca()) pinta(); }, 'ir'); b.disabled = !aqui || n >= 3 || (s.inv.couro || 0) < 4 || (s.inv.fibra || 0) < 4; d.append(custos({ couro: 4, fibra: 4 }), b); }
        if (it.o) { const b = bt(it.n0 ? 'Melhorar' : 'Levantar', () => { if (J.constroi(it.id)) { UI.vibra([14, 30, 22]); pinta(); } }, 'ir grande', 'bigorna'); b.disabled = !J.podeObra(it.id); d.append(b); if (!aqui) d.append(el('p', 'nota', 'Só na Clareira do Rio.')); }
      }, 'linhas');
    }

    // ---------- perícias ----------
    function pericias(c) {
      const h = J.heroi, f = h.ficha, s = J.save, tp = el('div', 'veste'); num(tp, [['Vida', Math.ceil(h.hp) + '/' + f.vida], ['Fôlego', Math.round(f.vigor)], ['Dano', Math.round(f.dano)], ['Defesa', Math.round(f.def * 100) + '%'], ['Crítico', Math.round(f.critico * 100) + '%'], ['Passo', Math.round(f.vel * 100) + '%']]); c.append(tp, el('p', 'nota', 'Tudo cresce com a repetição. Ninguém dá pontos a você.'));
      const g = el('div', 'cartoes');
      for (const k in C.PERICIAS) { const p = s.per[k] || { n: 0, x: 0 }, q = el('div', 'cartao'), t = el('div', 'c-txt'); const m = el('div', 'd-ico'); m.append(UI.ico(ICPER[k])); const n = el('em', '', p.n); t.append(el('b', '', C.PERICIAS[k][0]), el('small', '', C.PERICIAS[k][1]), barra(p.x, C.xpNivel(p.n))); q.append(m, t, n); g.append(q); }
      c.append(g);
    }
    function titulos(c) {
      const s = J.save, g = el('div', 'cartoes largos');
      for (const e in C.ESPECIES) {
        const n = s.mortes[e] || 0, q = el('div', 'cartao alto'), t = el('div', 'c-cab'); t.append(retratoBicho({ lobo: 'lobo', cobra: 'cobra', zumbi: 'zumbi', goblin: 'goblin', pedra: 'golem', mare: 'caranguejo', barro: 'boneco', mutante: 'queimado' }[e], true), el('b', '', C.ESPECIES[e].nome), el('em', '', n)); q.append(t);
        const tr = el('div', 'trilha'); for (const x of C.TITULOS[e]) { const m = el('div', 'medalha' + (n >= x[0] ? ' ganha' : '')); m.append(UI.ico(n >= x[0] ? 'taca' : 'cadeado')); const y = el('div'); y.append(el('b', '', x[1]), el('small', '', x[2])); m.append(y, el('em', '', n >= x[0] ? 'seu' : n + '/' + x[0])); if (n < x[0]) m.append(barra(n, x[0])); tr.append(m); }
        q.append(tr); g.append(q);
      }
      c.append(g);
    }
    function caderno(c) {
      const s = J.save, todos = Object.keys(C.BICHOS), vis = todos.filter((t) => s.abates[t] > 0); c.append(el('p', 'nota', vis.length + ' de ' + todos.length + ' anotados. Com 4 mortes você entende os hábitos; com 10, a fraqueza e 8% a mais de dano.'));
      duas(c, 'caderno', Object.keys(C.ESPECIES).map((e) => [C.ESPECIES[e].nome, todos.filter((t) => C.TIPOS[t].esp === e).map((t) => { const n = s.abates[t] || 0; return { id: t, n, ico: () => retratoBicho(t, n > 0), nome: n ? C.TIPOS[t].nome : '???', qtd: n || null, apagado: !n, marca: n >= 10 ? 'taca' : null }; })]), (d, it) => {
        const B1 = C.BICHOS[it.id], ch = C.TIPOS[it.id].chefe; topoD(d, retratoBicho(it.id, it.n > 0), it.nome, it.n ? it.n + (it.n > 1 ? ' mortes' : ' morte') : 'Ainda não caiu nenhum'); if (!it.n) { d.append(el('p', '', 'Procure pelos caminhos.')); return; }
        d.append(el('p', '', B1[0])); if (it.n >= 4 || ch) { d.append(el('h3', '', 'Hábitos'), el('p', '', B1[1])); } if (it.n >= 10 || ch) d.append(el('h3', '', 'Fraqueza'), el('p', 'jeito', B1[2])); else { const al = it.n < 4 ? 4 : 10; d.append(barra(it.n, al), el('p', 'nota', 'Faltam ' + (al - it.n) + ' para saber mais.')); }
      });
    }
    // ---------- opções ----------
    function opcoes(c) {
      const g = el('div', 'opcoes'), P = UI.pref;
      const sec = (n, ico) => { const x = el('section'), hh = el('h3'); hh.append(UI.ico(ico), document.createTextNode(n)); x.append(hh); g.append(x); return x; };
      const desl = (x, n, v, f, a, b, p) => { const l = el('label', 'vol'), r = el('input'), o = el('b', '', Math.round(v * 100) + '%'); r.type = 'range'; r.min = a == null ? 0 : a; r.max = b == null ? 1 : b; r.step = p || 0.05; r.value = v; const pos = () => r.style.setProperty('--k', ((r.value - r.min) / (r.max - r.min)) * 100 + '%'); pos(); r.oninput = () => { f(+r.value); o.textContent = Math.round(r.value * 100) + '%'; pos(); }; l.append(el('span', '', n), r, o); x.append(l); };
      const chave = (x, n, k, desc) => { const b = el('button', 'chave' + (P[k] ? ' liga' : '')); const t = el('span'); t.append(el('b', '', n)); if (desc) t.append(el('small', '', desc)); b.append(t, el('i')); b.onclick = () => { UI.mudaPref(k, P[k] ? 0 : 1); b.classList.toggle('liga', !!P[k]); som('abrir', 0.3, P[k] ? 1.6 : 1.1); UI.vibra(8); }; x.append(b); };
      const a = sec('Som', 'alto'); for (const [k, n] of [['efeitos', 'Efeitos'], ['ambiente', 'Ambiente'], ['musica', 'Música']]) desl(a, n, Som.vol[k], (v) => Som.mudaVolume(k, v));
      const j = sec('Jogo', 'golpe'); chave(j, 'Mira assistida', 'assist', 'O golpe vira para o inimigo mais perto e a flecha procura o alvo.'); chave(j, 'Segurar repete o golpe', 'repete', 'Com o dedo no botão, o combo continua.'); chave(j, 'Colher ao passar', 'coleta', 'Sem inimigo por perto, recolhe sozinho o que brilha no caminho.'); chave(j, 'Mostrar o próximo passo', 'meta', 'Uma linha no alto com o que fazer agora.');
      if (toque) { const t = sec('Controles na tela', 'mao'); desl(t, 'Tamanho', P.esc, (v) => UI.mudaPref('esc', v), 0.7, 1.35); desl(t, 'Opacidade', P.alfa, (v) => UI.mudaPref('alfa', v), 0.25, 1); chave(t, 'Botão de golpe à esquerda', 'golpeE', 'Um segundo botão de golpe acima do manche.'); chave(t, 'Vibrar', 'vibra'); t.append(bt('Mudar os botões de lugar', () => api.editaToque(), 'ir', 'troca')); }
      const v = sec('Imagem', 'olho'); chave(v, 'Tremor da tela', 'tremor'); chave(v, 'Números de dano', 'numeros'); chave(v, 'Brilho das luzes', 'brilho', 'Desligue se o aparelho esquentar.'); chave(v, 'Bichinhos do cenário', 'bichos');
      const k = sec('Comandos', 'alvo'); const t = toque ? ['Arraste o lado esquerdo: andar e olhar para cima ou para baixo.', 'Arraste o dedo em cima do Golpe para mirar: para cima, para baixo ou o ângulo da flecha.', 'Segure Forte e solte: golpe carregado.', 'Toque numa arma, embaixo, para trocar.'] : ['A e D andam, Espaço pula, J ou clique golpeia (W ou S muda a direção).', 'K ou botão direito: golpe forte, segure. Shift ou L: esquiva.', 'R e F magias, Q comer, E usar, T ou 1 a 9 arma, V tocha, M mapa, I ou Esc menu.', 'Com o arco, segure o golpe para puxar mais.', 'Controle: A pula, X golpe, B esquiva, Y usar, RB e LB magias, RT forte, LT comer, Select arma.']; for (const q of t) k.append(el('p', 'nota', q));
      c.append(g); const s = el('div', 'pe'); s.append(bt('Continuar', voltar, 'ir', 'certo'), bt('Guardar e sair', () => { J.salvar(); titulo(); }, '', 'sair')); c.append(s);
    }

    let aba = 'mochila';
    function pinta() {
      const s = J.save, ab = $('m-abas'), c = $('m-corpo'); if (aba === 'lar' && !s.lar) aba = 'criar';
      const rolou = c.dataset.aba === aba ? [...c.querySelectorAll('.lado,.rolavel')].map((x) => x.scrollTop) : [];
      ab.innerHTML = ''; const podeCriar = C.RECEITAS.some((r) => r.tipo && r.tipo !== 'item' && J.pode(r) && !J.jaTem(r)), podeLar = s.lar && s.area === 'lar' && Object.keys(ICOBRA).some((id) => J.podeObra(id));
      for (const [id, n, ic] of ABAS) { if (id === 'lar' && !s.lar) continue; const b = el('button', id === aba ? 'ativa' : ''); b.append(UI.ico(ic), el('span', '', n)); if ((id === 'criar' && podeCriar) || (id === 'lar' && podeLar)) b.classList.add('aviso'); b.onclick = () => UI.aba(id); ab.append(b); }
      $('m-titulo').textContent = TIT[aba]; $('m-sub').textContent = s.nome + (s.titulo ? ', ' + s.titulo : '') + ' · dia ' + s.dia + ', ' + J.nomeHora() + ' · ' + nomeArea(s.area);
      c.innerHTML = ''; c.dataset.aba = aba; c.className = 'm-' + aba;
      ({ mochila, criar, lar, pericias, titulos, caderno, opcoes, mapa: (q) => { const r = el('div', 'rolavel'); q.append(r); pintaMapa(r); } })[aba](c);
      [...c.querySelectorAll('.lado,.rolavel')].forEach((x, i) => { if (rolou[i]) x.scrollTop = rolou[i]; });
    }
    UI.aba = (id) => { aba = id; som('livro', 0.35, 1.2); UI.vibra(6); pinta(); };
    return { pinta, get aba() { return aba; }, set aba(v) { aba = v; }, abas: ABAS };
  };
})();
