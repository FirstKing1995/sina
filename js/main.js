/* SINA · Aruanã: liga tudo. Laço, controles, menus, gente de Alvorada e resposta aos eventos do jogo. */
(function () {
  'use strict';
  const M = window.Mapa, C = window.Conteudo, J = window.Jogo, Tela = window.Tela, Som = window.Som, T = M.T;
  const $ = (id) => document.getElementById(id);
  const en = J.entrada;
  let rodando = false, modal = null, parada = 0, ultimo = 0;

  // ---------- teclado e mouse ----------
  const teclas = {};
  const ACAO = { Space: 'rola', KeyJ: 'golpe', KeyK: 'forte', KeyQ: 'bebe', KeyE: 'usa', KeyF: 'usa', Tab: 'trava', KeyR: 'poder', KeyT: 'tocha' };
  addEventListener('keydown', (e) => {
    teclas[e.code] = true;
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    Som.ligar();
    if (modal === 'conversa' && ['KeyE', 'Enter', 'Space'].includes(e.code)) return avancarConversa();
    if (modal === 'criacao') return; // digitando o nome
    if (modal === 'descanso' && e.code === 'Escape') return fecharDescanso();
    if ((modal === 'menu' || modal === 'gente') && ['Escape', 'KeyI', 'KeyM'].includes(e.code)) return fecharPainel();
    if (!modal && rodando) {
      if (e.code === 'KeyI' || e.code === 'Escape') return abrirMenu('heroi');
      if (e.code === 'KeyM') return abrirMenu('mapa');
      if (ACAO[e.code]) en[ACAO[e.code]] = true;
    }
  });
  addEventListener('keyup', (e) => { teclas[e.code] = false; });
  addEventListener('blur', () => { for (const k in teclas) teclas[k] = false; });
  function eixo() {
    if (window.SINA.auto) return; // o robô de teste controla o herói
    if (toque.ativo) { en.mx = toque.x; en.my = toque.y; return; }
    if (!Tela.temToque) en.corre = !!(teclas.ShiftLeft || teclas.ShiftRight);
    en.mx = (teclas.KeyD || teclas.ArrowRight ? 1 : 0) - (teclas.KeyA || teclas.ArrowLeft ? 1 : 0);
    en.my = (teclas.KeyS || teclas.ArrowDown ? 1 : 0) - (teclas.KeyW || teclas.ArrowUp ? 1 : 0);
  }
  const cv = $('c');
  function mirar(e) {
    if (!J.P) return;
    const { esc } = Tela.tamanho();
    en.mira = Math.atan2(e.clientY / esc + Tela.cam.y - (J.P.y - 20), e.clientX / esc + Tela.cam.x - J.P.x);
  }
  cv.addEventListener('mousemove', mirar);
  cv.addEventListener('mousedown', (e) => {
    Som.ligar(); if (modal) return;
    mirar(e);
    if (e.button === 2) en.forte = true; else if (e.button === 0) en.golpe = true;
  });
  addEventListener('contextmenu', (e) => e.preventDefault());

  // ---------- toque ----------
  const toque = { ativo: false, x: 0, y: 0, id: null };
  if ('ontouchstart' in window && matchMedia('(pointer: coarse)').matches) {
    // manche flutuante: nasce onde o dedo encosta na metade esquerda e some de volta ao canto quando solta
    const man = $('manche'), bola = man.firstElementChild, zona = $('zona-manche'), centro = { x: 0, y: 0 };
    const mover = (t) => {
      const raio = man.offsetWidth / 2, dx = t.clientX - centro.x, dy = t.clientY - centro.y, m = Math.hypot(dx, dy), k = Math.min(1, m / (raio * 0.8));
      toque.x = m ? (dx / m) * k : 0; toque.y = m ? (dy / m) * k : 0;
      bola.style.transform = 'translate(' + toque.x * raio * 0.66 + 'px,' + toque.y * raio * 0.66 + 'px)';
    };
    zona.addEventListener('touchstart', (e) => {
      e.preventDefault(); Som.ligar();
      const t = e.changedTouches[0], u = $('usar');
      if (!u.hidden) { const r = u.getBoundingClientRect(); if (t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom) { if (!modal) en.usa = true; return; } }
      if (toque.ativo) return;
      const raio = man.offsetWidth / 2;
      centro.x = Math.max(raio + 4, Math.min(innerWidth - raio - 4, t.clientX)); centro.y = Math.max(raio + 4, Math.min(innerHeight - raio - 4, t.clientY));
      man.style.left = centro.x - raio + 'px'; man.style.top = centro.y - raio + 'px'; man.style.bottom = 'auto';
      man.classList.add('vivo');
      toque.ativo = true; toque.id = t.identifier; mover(t);
    }, { passive: false });
    zona.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === toque.id) mover(t); }, { passive: false });
    const solta = (e) => { for (const t of e.changedTouches) if (t.identifier === toque.id) { toque.ativo = false; toque.id = null; toque.x = toque.y = 0; en.mx = en.my = 0; bola.style.transform = ''; man.classList.remove('vivo'); man.style.left = man.style.top = man.style.bottom = ''; } };
    zona.addEventListener('touchend', solta); zona.addEventListener('touchcancel', solta);
    document.querySelectorAll('#toque button').forEach((b) => b.addEventListener('touchstart', (e) => {
      e.preventDefault(); Som.ligar(); if (modal) return;
      if (b.dataset.a === 'menu') return abrirMenu('heroi');
      if (b.dataset.a === 'corre') { en.corre = !en.corre; b.classList.toggle('ativa', en.corre); return; }
      if (b.dataset.a === 'golpe' || b.dataset.a === 'forte' || b.dataset.a === 'poder') mirarMaisPerto();
      en[b.dataset.a] = true;
    }, { passive: false }));
    Tela.temToque = true;
  }

  // no toque não há mouse: o golpe vai no inimigo mais próximo à frente, ou no mais próximo se estiver colado
  function mirarMaisPerto() {
    const P = J.P; let melhor = null, nota = 110;
    for (const e of J.inimigos) { if (e.estado === 'morto' || e.estado === 'dorme') continue; const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < nota) { nota = d; melhor = e; } }
    en.mira = melhor ? Math.atan2(melhor.y - P.y, melhor.x - P.x) : P.ang;
  }
  $('usar').addEventListener('click', () => { if (!modal) en.usa = true; });
  $('usar').addEventListener('touchstart', (e) => { e.preventDefault(); if (!modal) en.usa = true; }, { passive: false });

  // ---------- avisos ----------
  let timerSus, timerArea;
  function sussurrar(t, dur) { const s = $('sussurro'); s.textContent = t; s.classList.add('ver'); clearTimeout(timerSus); timerSus = setTimeout(() => s.classList.remove('ver'), dur || 4200); }
  function anunciar(t, grande) {
    const a = $('area'); a.textContent = t; a.className = grande ? 'ver grande' : 'ver';
    clearTimeout(timerArea); timerArea = setTimeout(() => a.classList.remove('ver'), 3000);
  }
  let areaAtual = null, entrouCripta = false;
  function verArea() {
    const P = J.P, bx = P.x / T, by = P.y / T;
    let nome = null;
    if (by >= M.CRIPTA_Y) nome = bx >= 395 ? 'Gruta do Mangue' : bx >= 195 ? 'Mina do Ferro' : 'Cripta da Alvorada';
    else {
      for (const [n, k] of C.LUGARES_NOME) { const l = M.LUGARES[k]; if (Math.hypot(bx - l[0], by - l[1]) < l[2]) { nome = n; break; } }
      if (!nome) nome = M.regiao(Math.floor(bx), Math.floor(by)).nome;
    }
    if (nome !== areaAtual) {
      areaAtual = nome; anunciar(nome);
      if (nome === 'Cripta da Alvorada' && !entrouCripta) { entrouCripta = true; cartao('assets/telas/cripta.webp'); }
    }
    for (const p of C.PLACAS) {
      const id = p.x + ':' + p.y;
      if (!J.S.placas.includes(id) && Math.hypot(p.x * T - P.x, p.y * T - P.y) < 80) { J.S.placas.push(id); sussurrar(Tela.temToque && p.toque ? p.toque : p.t, 7000); }
    }
    { const rid = by >= M.CRIPTA_Y ? 'cripta' : M.regiao(Math.floor(bx), Math.floor(by)).id; Som.ambiente({ cripta: 'masmorra', sertao: 'brisa', serra: 'brisa', cinzas: 'brisa', mangue: 'chuva' }[rid] || 'noite'); }
    let fogo = 0;
    for (const id in C.FOGUEIRAS) if (J.S.acesas.includes(id)) { const f = C.FOGUEIRAS[id], d = Math.hypot(f.x * T - P.x, f.y * T - P.y); fogo = Math.max(fogo, 1 - d / 240); }
    Som.fogueira(Math.max(0, fogo) * 0.6);
  }
  function cartao(src) {
    const c = $('cartao'); c.style.backgroundImage = 'url(' + src + ')'; c.hidden = false;
    c.style.animation = 'none'; void c.offsetWidth; c.style.animation = '';
    setTimeout(() => { c.hidden = true; }, 3000);
  }

  // ---------- eventos do jogo ----------
  const cam = Tela.cam;
  const treme = (k) => { cam.tremor = Math.max(cam.tremor, k); };
  function tratar(ev) {
    switch (ev.tipo) {
      case 'golpe': Som.tocar(ev.forte ? 'forte' : 'golpe', 0.6); break;
      case 'rola': Som.tocar('golpe', 0.22, 0.6); break;
      case 'semvigor': sussurrar('Sem vigor.', 900); break;
      case 'acerto': Som.tocar('acerto', 0.8); parada = ev.forte || ev.brecha ? 0.09 : 0.045; treme(ev.forte ? 5 : 2.5); Tela.sangue(ev.x, ev.y, ev.brecha ? 16 : 8, '#7a1f1a'); break;
      case 'dor': Som.tocar('dor', 0.8); parada = 0.08; treme(7); Tela.sangue(ev.x, ev.y, 12, '#a02a24'); break;
      case 'notou': if (Math.random() < 0.5) Som.tocar(ev.quem === 'lobo' ? 'uivo' : 'inimigoDor', 0.28, 0.8); break;
      case 'prepara': if (ev.grande) { Som.tocar('rugido', 0.8, 0.8); treme(3); } break;
      case 'inimigoGolpe': Som.tocar('golpe', 0.45, 0.72); break;
      case 'tiro': Som.tocar('magia', 0.5); break;
      case 'tremor': Som.tocar('rugido', 0.9, 0.6); treme(9); break;
      case 'quebra': Som.tocar('quebra', 0.8); sussurrar('A guarda quebrou. Agora.', 1500); break;
      case 'fase': Som.tocar('rugido', 1, 0.7); treme(10); anunciar((ev.nome || 'Ele') + ' ainda não acabou', false); break;
      case 'invocou': Som.tocar('rugido', 0.7, 1.2); Tela.fagulhas(ev.x, ev.y, 24, '#c8c8d8', 30); treme(5); break;
      case 'uivo': Som.tocar('uivo', 1); sussurrar('O uivo chama a matilha.', 2500); break;
      case 'meteoro': Som.tocar('quebra', 0.8, 0.7); treme(6); Tela.fagulhas(ev.x, ev.y, 18, '#ffb040', 40); break;
      case 'lendaCaiu': Som.tocar('raro', 0.9); anunciar(ev.nome + ' caiu', true); break;
      case 'matou': Som.tocar(ev.chefe ? 'rugido' : 'morte', ev.chefe ? 1 : 0.5); Tela.fagulhas(ev.x, ev.y, ev.chefe ? 60 : 14, '#ff9a3a', 30); if (ev.chefe) { treme(12); parada = 0.25; } break;
      case 'brasas': Som.tocar('moeda', 0.3); break;
      case 'bebeu': Som.tocar('beber', 0.7); Tela.fagulhas(J.P.x, J.P.y - 16, 12, '#7ce0a8', 24); break;
      case 'aviso': sussurrar(ev.t, 2600); break;
      case 'item': { const it = C.ITENS[ev.item]; Som.tocar('raro', 0.7); sussurrar(ev.item === 'brasas' ? ev.qtd + ' brasas.' : it.nome + (it.desc ? '. ' + it.desc : '') + (it.tipo === 'arma' || it.tipo === 'armadura' || it.tipo === 'amuleto' ? ' (I para equipar)' : ''), 6000); break; }
      case 'acendeu': Som.tocar('fogo', 0.8); anunciar(ev.nome, true); break;
      case 'descansou': mostrarDescanso(ev.id); break;
      case 'passagem': Som.tocar('porta', 0.7); areaAtual = null; break;
      case 'npc': falarCom(ev.npc); break;
      case 'chefe': Som.musica('batalha'); Som.tocar('rugido', 0.9, 0.85); treme(7); anunciar(ev.nome, true); $('chefe-nome').textContent = ev.nome; $('chefe').hidden = false; if (ev.quem === 'corpo') cartao('assets/spr/ilustracao.png'); break;
      case 'chefeCaiu':
        Som.musica(null); $('chefe').hidden = true; anunciar(ev.final ? 'Aruanã respira' : 'Derrotado', true);
        if (ev.final) setTimeout(mostrarFim, 3500);
        else if (J.S.cacos >= 3 && !J.S.cratera) sussurrar('Três cacos. Benta, em Alvorada, precisa saber.', 7000);
        break;
      case 'morreu': aoMorrer(); break;
      case 'nasceu': $('chefe').hidden = true; Som.musica(null); break;
      case 'subiu': Som.tocar('raro', 0.6); atualizarDescanso(); break;
      case 'poder': { const pd = J.poderAtual(); if (ev.id === 'seta') Som.tocar('magia', 0.6); else { Som.tocar('raro', 0.6); Tela.fagulhas(ev.x, ev.y, 18, ev.id === 'guarda' ? '#c0d0e8' : ev.id === 'passo' ? '#90d870' : '#ffd070', 30); sussurrar(pd.nome + '.', 1200); } break; }
    }
  }
  function aoMorrer() {
    Som.tocar('morte', 0.9, 0.8); Som.musica(null);
    modal = 'morte';
    const qtd = J.S.resto ? J.S.resto.qtd : 0;
    $('morte-sub').textContent = qtd ? qtd + ' brasas ficaram onde você caiu. Só há uma chance de buscá-las.' : 'Nada ficou para trás.';
    setTimeout(() => { $('morte').hidden = false; }, 700);
    setTimeout(() => {
      $('morte').hidden = true; modal = null;
      J.nascer(); areaAtual = null; Tela.cam.x = J.P.x - 320; Tela.cam.y = J.P.y - 200;
    }, 4300);
  }

  // ---------- fogueira ----------
  const ATR = [['vida', 'Vida'], ['vigor', 'Vigor'], ['forca', 'Força']];
  function mostrarDescanso(id) {
    modal = 'descanso';
    Som.tocar('fogo', 0.6);
    $('d-nome').textContent = C.FOGUEIRAS[id].nome;
    $('descanso').hidden = false;
    atualizarDescanso();
    const v = $('d-viagem'); v.innerHTML = '';
    const outras = J.S.acesas.filter((f) => f !== id);
    $('d-viagem-t').hidden = !outras.length;
    for (const f of outras) {
      const b = document.createElement('button'); b.textContent = C.FOGUEIRAS[f].nome;
      b.onclick = () => { $('descanso').hidden = true; modal = null; J.viajar(f); };
      v.appendChild(b);
    }
  }
  function atualizarDescanso() {
    const custo = J.custoNivel();
    $('d-brasas').textContent = J.S.brasas; $('d-custo').textContent = custo; $('d-nivel').textContent = J.nivelTotal();
    const box = $('d-niveis'); box.innerHTML = '';
    for (const [k, nome] of ATR) {
      const b = document.createElement('button'); b.className = 'niv';
      b.innerHTML = '<span>' + nome + '</span><em>' + J.S.nivel[k] + '</em>';
      b.disabled = J.S.brasas < custo;
      b.onclick = () => J.subir(k);
      box.appendChild(b);
    }
    const fz = document.createElement('button'); fz.className = 'niv';
    fz.innerHTML = '<span>Fazer tocha (2 gravetos, 15 brasas)</span><em>' + J.S.tochas + '</em>';
    fz.title = 'Gravetos: ' + J.S.gravetos;
    fz.disabled = J.S.gravetos < 2 || J.S.brasas < 15 || J.S.tochas >= 5;
    fz.onclick = () => { J.fazerTocha(); atualizarDescanso(); };
    box.appendChild(fz);
  }
  function fecharDescanso() { $('descanso').hidden = true; modal = null; }
  $('d-sair').onclick = fecharDescanso;

  // ---------- conversa ----------
  let falas = [], falaI = 0, aoFimConversa = null;
  function abrirConversa(l, npc, depois) {
    falas = l; falaI = 0; modal = 'conversa'; aoFimConversa = depois || null; $('conversa').hidden = false;
    $('conv-nome').textContent = npc.nome;
    const r = $('conv-rosto').getContext('2d'), im = Tela.imagem(npc.spr);
    r.imageSmoothingEnabled = false; r.clearRect(0, 0, 64, 64);
    if (im) r.drawImage(im, 16, 2, 32, 32, 0, 0, 64, 64);
    $('conv-texto').textContent = falas[0]; Som.tocar('livro', 0.4);
  }
  function avancarConversa() {
    falaI++;
    if (falaI < falas.length) { $('conv-texto').textContent = falas[falaI]; Som.tocar('livro', 0.25); return; }
    $('conversa').hidden = true; modal = null;
    if (aoFimConversa) { const f = aoFimConversa; aoFimConversa = null; f(); }
  }
  $('conversa').onclick = avancarConversa;

  // ---------- gente de Alvorada ----------
  function falarCom(n) {
    if (n.papel === 'historia') return abrirConversa(J.falasBenta(), n);
    if (n.papel === 'povo') return abrirConversa([n.falas[Math.floor(Math.random() * n.falas.length)]], n);
    if (n.papel === 'loja') return abrirLoja(n);
    if (n.papel === 'forja') {
      const q = C.MISSOES[n.id], est = J.S.missoes[n.id];
      if (!est) { J.aceitar(n.id); return abrirConversa([q.pede], n, () => { sussurrar('Nova missão: ' + q.nome + '.', 3500); abrirForja(n); }); }
      if (!est.feita) { const p = J.progresso(n.id); if (p.tem >= p.n) { J.entregar(n.id); return abrirConversa([q.obrigado], n, () => abrirForja(n)); } }
      return abrirForja(n);
    }
    const q = C.MISSOES[n.id], est = J.S.missoes[n.id];
    if (!est) { J.aceitar(n.id); return abrirConversa([q.pede], n, () => sussurrar('Nova missão: ' + q.nome + '. I para ver.', 3500)); }
    if (est.feita) return abrirConversa(['Ainda de pé. Isso já é alguma coisa.'], n);
    const p = J.progresso(n.id);
    if (p.tem >= p.n) { J.entregar(n.id); return abrirConversa([q.obrigado], n); }
    abrirConversa([q.nome + ': ' + p.tem + ' de ' + p.n + '. Volte quando terminar.'], n);
  }
  const icone = (it) => '<img class="ic" src="assets/ic/' + it.ic + '.png" alt="">';
  function descreve(id) {
    const it = C.ITENS[id];
    if (it.tipo === 'arma') {
      const f = J.S.forja[id] || 0, falta = (it.req || 0) - J.S.nivel.forca;
      return 'dano ' + Math.round(J.danoArma(id)) + ' · vigor ' + it.custo + (it.lento < 0.9 ? ' · rápida' : it.lento > 1.2 ? ' · lenta' : '') + (it.alcance > 1.2 ? ' · longa' : '') + (f ? ' · +' + f : '') + (falta > 0 ? ' · exige Força ' + it.req : '');
    }
    if (it.tipo === 'armadura') return 'defesa ' + Math.round(it.def * 100) + '%' + (it.peso ? ' · peso ' + it.peso : '');
    return it.desc || '';
  }
  function painel(titulo, nome) { modal = nome; $('gente').hidden = false; $('g-titulo').textContent = titulo; const c = $('g-corpo'); c.innerHTML = ''; return c; }
  function fecharPainel() { $('gente').hidden = true; modal = null; }
  $('g-fechar').onclick = fecharPainel;
  function linha(pai, html, texto, acao, desliga) {
    const d = document.createElement('div'); d.className = 'linha'; d.innerHTML = '<div class="l-txt">' + html + '</div>';
    if (texto) { const b = document.createElement('button'); b.textContent = texto; b.disabled = !!desliga; b.onclick = acao; d.appendChild(b); }
    pai.appendChild(d); return d;
  }
  function abrirLoja(n) {
    const c = painel(n.nome, 'gente');
    const topo = document.createElement('p'); topo.className = 'nota forte'; topo.textContent = J.S.brasas + ' brasas'; c.appendChild(topo);
    for (const id of n.loja || C.LOJA) {
      const it = C.ITENS[id], tem = J.S.mochila.includes(id);
      linha(c, icone(it) + '<div><b>' + it.nome + '</b><small>' + descreve(id) + '</small></div>', tem ? 'Já tem' : it.preco + ' brasas', () => { if (J.comprar(id)) { Som.tocar('moeda', 0.7); abrirLoja(n); } }, tem || J.S.brasas < it.preco);
    }
  }
  function abrirForja(n) {
    const c = painel(n.nome, 'gente'), id = J.S.equip.arma, it = C.ITENS[id], f = J.S.forja[id] || 0, custo = C.CUSTO_FORJA[f], pedras = J.S.materiais.pedra_forja || 0;
    const topo = document.createElement('p'); topo.className = 'nota forte'; topo.textContent = J.S.brasas + ' brasas · ' + pedras + ' pedra(s) de forja'; c.appendChild(topo);
    linha(c, icone(it) + '<div><b>' + it.nome + (f ? ' +' + f : '') + '</b><small>' + descreve(id) + '</small></div>', custo == null ? 'No máximo' : 'Afiar: ' + custo, () => { if (J.forjar()) { Som.tocar('raro', 0.7); abrirForja(n); } }, custo == null || J.S.brasas < custo || !pedras);
    const p = document.createElement('p'); p.className = 'nota'; p.textContent = 'Cada afiação custa brasas e uma pedra de forja. Pedras caem de inimigos, saem de baús e Lauro vende.'; c.appendChild(p);
  }

  // ---------- menu: herói, equipamentos, missões, mapa ----------
  function abrirMenu(aba) {
    const c = painel((J.S.heroi ? J.S.heroi.nome : 'Sem-Sina') + ' · nível ' + J.nivelTotal(), 'menu');
    const abas = document.createElement('div'); abas.className = 'abas';
    for (const [k, nome] of [['heroi', 'Equipamento'], ['missoes', 'Missões'], ['mapa', 'Mapa']]) {
      const b = document.createElement('button'); b.textContent = nome; if (k === aba) b.className = 'ativa'; b.onclick = () => abrirMenu(k); abas.appendChild(b);
    }
    c.appendChild(abas);
    if (aba === 'heroi') menuHeroi(c);
    if (aba === 'missoes') menuMissoes(c);
    if (aba === 'mapa') menuMapa(c);
  }
  function menuHeroi(c) {
    const r = document.createElement('p'); r.className = 'nota forte';
    const fic = document.createElement('p'); fic.className = 'nota'; { const H = J.S.heroi, AP = window.Aparencia, pd = J.poderAtual(); fic.textContent = H.nome + ' · ' + (H.sexo === 'f' ? 'Mulher' : 'Homem') + ' · ' + AP.RACAS[H.raca].nome + ' · ' + AP.ESPECIALIDADES[H.esp].nome + (pd ? ' · ' + pd.nome + ': ' + pd.desc : ''); } c.appendChild(fic);
    r.textContent = 'Vida ' + J.vidaMax() + ' · Vigor ' + J.vigorMax() + ' · Dano ' + Math.round(J.danoArma(J.S.equip.arma)) + ' · Defesa ' + Math.round(J.defesa() * 100) + '% · Cabaça ' + J.S.cabacaMax;
    c.appendChild(r);
    for (const tipo of ['arma', 'armadura', 'amuleto']) {
      const lista = J.S.mochila.filter((id) => C.ITENS[id].tipo === tipo);
      if (!lista.length) continue;
      const h = document.createElement('h3'); h.textContent = { arma: 'Armas', armadura: 'Armaduras', amuleto: 'Amuletos' }[tipo]; c.appendChild(h);
      for (const id of lista) {
        const it = C.ITENS[id], usa = J.S.equip[tipo] === id;
        linha(c, icone(it) + '<div><b>' + it.nome + '</b><small>' + descreve(id) + '</small></div>', usa ? (tipo === 'amuleto' ? 'Tirar' : 'Em uso') : 'Usar', () => { J.equipar(id); Som.tocar('pegar', 0.5); abrirMenu('heroi'); }, usa && tipo !== 'amuleto');
      }
    }
    const coisas = [];
    if (J.S.cacos) coisas.push('Cacos da Sina: ' + J.S.cacos + ' de 3');
    if (J.S.chaves.chave_ferro) coisas.push('Chave de ferro');
    for (const k in J.S.materiais) if (J.S.materiais[k] > 0) coisas.push(C.ITENS[k].nome + ': ' + J.S.materiais[k]);
    if (coisas.length) { const p = document.createElement('p'); p.className = 'nota'; p.textContent = coisas.join(' · '); c.appendChild(p); }
  }
  function textoPrincipal() {
    const S = J.S;
    if (S.fim) return 'O Filho da Cauda caiu. Aruanã respira, por enquanto.';
    if (S.cratera) return 'Vá ao Altar da Cauda, no fundo da Cratera, ao nordeste.';
    if (S.cacos >= 3) return 'Leve os três cacos a Benta, em Alvorada.';
    if (!S.falouBenta) return 'Procure a vidente Benta, nas ruínas de Alvorada, ao norte de onde você acordou.';
    const falta = [];
    if (!S.chefesMortos.includes('lobisomem')) falta.push('o Lobisomem, ao norte');
    if (!S.chefesMortos.includes('ticao')) falta.push('o Capitão Tição, a leste');
    if (!S.chefesMortos.includes('corpo')) falta.push('o Corpo-seco, na cripta a sudeste' + (S.chaves.chave_ferro ? '' : ' (a chave está com Zé Facão, a noroeste)'));
    return 'Cacos: ' + S.cacos + ' de 3. Faltam ' + falta.join('; ') + '.';
  }
  function menuMissoes(c) {
    linha(c, '<div><b>A Sina Partida</b><small>' + textoPrincipal() + '</small></div>');
    const ativas = Object.keys(J.S.missoes);
    for (const id of ativas) {
      const q = C.MISSOES[id], est = J.S.missoes[id], p = J.progresso(id);
      linha(c, '<div><b>' + q.nome + '</b><small>' + (est.feita ? 'Concluída.' : p.tem >= p.n ? 'Pronta. Volte a Alvorada.' : p.tem + ' de ' + p.n + '.') + '</small></div>');
    }
    if (!ativas.length) { const n = document.createElement('p'); n.className = 'nota'; n.textContent = 'Há gente em Alvorada que pode ter trabalho para você.'; c.appendChild(n); }
  }
  let fundoMapa = null;
  function menuMapa(c) {
    const cv2 = document.createElement('canvas'); cv2.width = Math.ceil(M.W / 2); cv2.height = Math.ceil(M.CRIPTA_Y / 2); cv2.className = 'mapa';
    const g = cv2.getContext('2d');
    if (!fundoMapa) { // o desenho do terreno é feito uma vez só
      fundoMapa = document.createElement('canvas'); fundoMapa.width = cv2.width; fundoMapa.height = cv2.height;
      const f = fundoMapa.getContext('2d');
      const CORES = { campos: '#3e5a3a', mata: '#1e4240', mangue: '#3f4a22', serra: '#4a5560', sertao: '#7a6238', cinzas: '#5a2c26' };
      for (let y = 0; y < cv2.height; y++) for (let x = 0; x < cv2.width; x++) {
        const bx = x * 2, by = y * 2;
        if (!M.anda(bx, by)) { f.fillStyle = '#0c1412'; f.fillRect(x, y, 1, 1); continue; }
        f.fillStyle = M.CHAO[by * M.W + bx] === M.TERRA ? '#6a5236' : CORES[M.regiao(bx, by).id];
        f.fillRect(x, y, 1, 1);
      }
    }
    g.fillStyle = '#05080a'; g.fillRect(0, 0, cv2.width, cv2.height);
    for (const chave in J.S.visto) { // só aparece o que já foi visto
      const qx = chave >> 8, qy = chave & 255;
      if (qx >= 0 && qy >= 0) g.drawImage(fundoMapa, qx * 4, qy * 4, 4, 4, qx * 4, qy * 4, 4, 4);
    }
    for (const id of J.S.acesas) { const f = C.FOGUEIRAS[id]; if (f.y < M.CRIPTA_Y) { g.fillStyle = '#ffb040'; g.fillRect(f.x / 2 - 1, f.y / 2 - 1, 3, 3); } }
    if (J.S.resto && J.S.resto.y < M.CRIPTA_Y * T) { g.fillStyle = '#ff5a30'; g.fillRect(J.S.resto.x / T / 2 - 1, J.S.resto.y / T / 2 - 1, 3, 3); }
    const py = Math.min(J.P.y / T, M.CRIPTA_Y - 1);
    g.fillStyle = '#fff'; g.fillRect(J.P.x / T / 2 - 1, py / 2 - 1, 3, 3);
    c.appendChild(cv2);
    const n = document.createElement('p'); n.className = 'nota'; n.textContent = 'Branco: você. Laranja: fogueiras acesas. Vermelho: suas brasas. Benta sabe para onde ir, se você perguntar.'; c.appendChild(n);
  }

  function mostrarFim() {
    modal = 'fim'; $('fim').hidden = false;
    const min = Math.round(J.tempo / 60);
    $('fim-txt').textContent = 'Você levou ' + min + ' minutos, chegou ao nível ' + J.nivelTotal() + ' e caiu ' + J.S.mortes + ' vezes. Aruanã continua aberta para quem quiser andar por ela.';
  }
  $('fim-seguir').onclick = () => { $('fim').hidden = true; modal = null; };

  // ---------- HUD ----------
  const pct = (v, m) => Math.max(0, Math.min(100, (v / m) * 100)) + '%';
  function hud() {
    const P = J.P;
    $('b-vida').style.width = 'min(100%, ' + J.vidaMax() * 2.4 + 'px)';
    $('b-vida').firstElementChild.style.width = pct(P.vida, J.vidaMax());
    $('b-vida').lastElementChild.style.width = pct(P.vida, J.vidaMax());
    $('b-vigor').style.width = 'min(100%, ' + J.vigorMax() * 2.4 + 'px)';
    $('b-vigor').firstElementChild.style.width = pct(P.vigor, J.vigorMax());
    $('n-cabaca').textContent = P.cabaca;
    { const pd = J.poderAtual(), h_ = $('poder-hud'); if (pd) { const e_ = P.esperaPoder || 0; h_.innerHTML = '<b>' + (Tela.temToque ? '' : 'R') + '</b>' + pd.nome + (e_ > 0.05 ? ' (' + Math.ceil(e_) + ')' : ''); h_.style.opacity = e_ > 0.05 ? 0.55 : 1; } }
    {
      const m_ = J.momento(), h__ = J.S.hora, fase = P.y >= M.CRIPTA_Y * T ? 'Subterrâneo' : m_ >= 1 ? 'Dia' : m_ <= 0 ? 'Noite' : h__ < 12 ? 'Amanhecer' : 'Entardecer';
      $('poder-hud').innerHTML += '<br><b>' + (Tela.temToque ? '' : 'T') + '</b>Tocha ' + (P.tochaLiga ? Math.ceil(P.tochaT) + ' s' : J.S.tochas) + ' · gravetos ' + J.S.gravetos + ' · ' + fase;
    }
    $('n-brasas').textContent = J.S.brasas;
    const c = J.chefe;
    if (c) { $('b-chefe').firstElementChild.style.width = pct(c.hp, c.hpMax); $('b-chefe').lastElementChild.style.width = pct(c.hp, c.hpMax); }
    const u = P.estado === 'livre' && !modal ? J.pertoDe() : null, box = $('usar');
    const av = $('nuvem-aviso'); if (N.sessao()) { av.hidden = false; av.textContent = N.estado === 'salva' ? 'Salvo na nuvem' : N.estado === 'offline' ? 'Sem conexão: salvando aqui' : N.estado === 'erro' ? 'Nuvem: ' + N.ultimoErro : N.estado === 'sessao' ? 'Entre de novo para salvar na nuvem' : N.estado === 'cheia' ? 'Nuvem cheia: os 3 espaços têm jogos antigos' : ''; } else av.hidden = true;
    if (u) { box.hidden = false; box.innerHTML = '<b>' + (Tela.temToque ? 'Usar' : 'E') + '</b>' + u.texto; } else box.hidden = true;
  }

  // ---------- laço ----------
  function passoMundo(dt) {
    eixo();
    if (parada > 0) { parada -= dt; return; }
    if (!modal) { J.passo(dt); verArea(); }
    else if (modal === 'morte') J.passo(dt);
    while (J.eventos.length) tratar(J.eventos.shift());
  }
  function laco(t) {
    const dt = Math.min(0.05, (t - ultimo) / 1000 || 0); ultimo = t;
    if (rodando) { passoMundo(dt); Tela.desenhar(dt); hud(); }
    requestAnimationFrame(laco);
  }

  // ---------- início ----------
  let salvando = false;
  // ---------- conta na tela de título ----------
  const N = window.Nuvem, esc = N.esc;
  function desenharConta() {
    const box = $('conta'); box.innerHTML = '';
    if (!N.ligada()) return;
    const u = N.sessao();
    const bt = (t, f) => { const b = document.createElement('button'); b.textContent = t; b.onclick = f; box.appendChild(b); };
    if (u) {
      const l = document.createElement('div'); l.className = 'linha-conta'; l.innerHTML = 'Na nuvem como <b>' + esc(u.usuario.nome) + '</b>'; box.appendChild(l);
      bt('Ranking', abrirRanking); bt('Sair da conta', async () => { await N.sair(); desenharConta(); });
    } else {
      bt('Entrar', () => formConta('entrar')); bt('Criar conta', () => formConta('cadastrar')); bt('Ranking', abrirRanking);
      const l = document.createElement('div'); l.className = 'linha-conta'; l.textContent = 'Com conta, sua jornada vai junto para qualquer aparelho.'; box.appendChild(l);
    }
  }
  function formConta(tipo) {
    const c = painel(tipo === 'cadastrar' ? 'Criar conta' : 'Entrar', 'gente');
    const f = document.createElement('form');
    f.innerHTML = (tipo === 'cadastrar' ? '<label class="campo">Nome no ranking<input name="nome" maxlength="18" required autocomplete="nickname"></label>' : '') + '<label class="campo">E-mail<input name="email" type="email" required autocomplete="email"></label><label class="campo">Senha<input name="senha" type="password" minlength="6" required autocomplete="' + (tipo === 'cadastrar' ? 'new-password' : 'current-password') + '"></label><p class="msg">' + (tipo === 'cadastrar' ? 'Senha com 6 ou mais caracteres. A mesma conta vale para o SINA antigo.' : '') + '</p><button type="submit">' + (tipo === 'cadastrar' ? 'Criar conta' : 'Entrar') + '</button>';
    c.appendChild(f);
    f.onsubmit = async (e) => {
      e.preventDefault();
      const d = new FormData(f), msg = f.querySelector('.msg'), b = f.querySelector('button[type=submit]');
      b.disabled = true; msg.textContent = 'Falando com o servidor, pode levar alguns segundos...';
      const r = await N.entrar(tipo, { nome: d.get('nome'), email: d.get('email'), senha: d.get('senha') });
      b.disabled = false;
      if (!r.ok) { msg.textContent = r.erro; return; }
      fecharPainel(); desenharConta(); montarTitulo();
    };
  }
  async function abrirRanking() {
    const c = painel('Heróis de Aruanã', 'gente');
    c.innerHTML = '<p class="nota">Buscando...</p>';
    const r = await N.ranking();
    if (!r.ok) { c.innerHTML = '<p class="nota">' + esc(r.erro) + '</p>'; return; }
    if (!r.lista.length) { c.innerHTML = '<p class="nota">Ninguém ainda. O primeiro nome pode ser o seu.</p>'; return; }
    c.innerHTML = '<table class="ranking"><tr><th>#</th><th>Herói</th><th>Nível</th><th>Chefes</th><th>Cacos</th></tr>' + r.lista.map((h, i) => '<tr><td>' + (i + 1) + '</td><td><b>' + esc(h.heroi) + '</b></td><td>' + h.nivel + '</td><td>' + h.masmorras + '</td><td>' + (h.final ? 'Fim' : h.etapa) + '</td></tr>').join('') + '</table>';
  }
  // ---------- criação de personagem ----------
  const AP = window.Aparencia;
  let ficha = AP.padrao(), verTimer = null, verFrames = null, verChave = null;
  function grupo(id, opcoes, chave, html) {
    const box = $(id); box.innerHTML = '';
    for (const [valor, rotulo] of opcoes) {
      const b = document.createElement('button'); b.type = 'button';
      b.innerHTML = html ? html(valor, rotulo) : rotulo;
      if (ficha[chave] === valor) b.className = 'ativa';
      b.onclick = () => { ficha[chave] = valor; pintarCriacao(); };
      box.appendChild(b);
    }
  }
  function efeitos(o) {
    const l = [];
    const f = (n, v, suf) => { if (v) l.push((v > 0 ? '+' : '') + (suf ? Math.round(v * 100) + '% ' : v + ' ') + n); };
    f('vida', o.vida); f('vigor', o.vigor); f('dano', o.dano, true); f('defesa', o.def, true); f('velocidade', o.vel, true); f('brasas', o.brasas, true);
    if (o.cabaca) l.push('+1 gole');
    return l.join(' · ');
  }
  function pintarCriacao() {
    grupo('cria-sexo', [['m', 'Homem'], ['f', 'Mulher']], 'sexo');
    grupo('cria-raca', Object.entries(AP.RACAS).map(([k, r]) => [k, r]), 'raca', (k, r) => '<b>' + r.nome + '</b><small>' + r.desc + '</small><em>' + efeitos(r) + '</em>');
    grupo('cria-esp', Object.entries(AP.ESPECIALIDADES).map(([k, r]) => [k, r]), 'esp', (k, r) => '<b>' + r.nome + '</b><small>' + r.desc + '</small><em>' + r.poder.nome + ': ' + r.poder.desc + '</em>');
    const k_ = AP.melhor(ficha), pedido = AP.chave(ficha);
    $('cria-aviso').textContent = AP.existe(ficha) ? '' : 'Esta combinação ainda não tem arte própria: por enquanto aparece a mais parecida.';
    verChave = k_;
    if (k_ === 'm_humano_andarilho') verFrames = ['heroi_s', 'heroi_e', 'heroi_n'].map((n) => ({ c: Tela.original(n) || Tela.imagem(n), w: 64, n: 6 }));
    else AP.carrega(k_).then((o) => { if (verChave === k_) verFrames = ['heroi_s', 'heroi_e', 'heroi_n'].map((n) => ({ c: o[n], w: 64, n: 6 })).filter((f) => f.c); });
    void pedido;
  }
  function abrirCriacao() {
    ficha = AP.padrao();
    modal = 'criacao'; $('titulo').hidden = true; $('criacao').hidden = false;
    $('cria-nome').value = ficha.nome;
    pintarCriacao();
    clearInterval(verTimer);
    let t = 0;
    verTimer = setInterval(() => {
      t++;
      const g = $('cria-ver').getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 64, 64);
      if (!verFrames || !verFrames.length) return;
      const v = verFrames[Math.floor(t / 24) % verFrames.length], q = t % v.n;
      g.drawImage(v.c, q * v.w, 0, v.w, 64, 0, 0, 64, 64);
    }, 130);
  }
  function fecharCriacao() { clearInterval(verTimer); $('criacao').hidden = true; modal = null; }
  $('cria-voltar').onclick = () => { fecharCriacao(); $('titulo').hidden = false; };
  $('cria-ir').onclick = () => { ficha.nome = ($('cria-nome').value || '').trim().slice(0, 18) || 'Sem-Sina'; fecharCriacao(); comecar(ficha); };

  function montarTitulo() {
    const m = $('titulo-menu'); m.innerHTML = '';
    if (J.temSave()) { const b = document.createElement('button'); b.textContent = 'Continuar'; b.onclick = () => comecar(false); m.appendChild(b); }
    const n = document.createElement('button'); n.textContent = 'Nova jornada';
    n.onclick = () => { if (!J.temSave() || confirm('Começar de novo apaga a jornada salva. Continuar?')) abrirCriacao(); };
    m.appendChild(n);
  }
  function comecar(novo) {
    Som.ligar();
    if (Tela.temToque && document.documentElement.requestFullscreen) { document.documentElement.requestFullscreen().then(() => { Tela.medir(); }).catch(() => {}); }
    if (novo) J.novo(typeof novo === 'object' ? novo : undefined); else J.carregar();
    if (!J.S.heroi) J.S.heroi = window.Aparencia.padrao();
    window.Aparencia.vestir(J.S.heroi); // carrega em segundo plano; até lá aparece o herói original
    $('titulo').hidden = true; $('hud').hidden = false;
    if (Tela.temToque) $('toque').hidden = false;
    J.nascer(); rodando = true;
    entrouCripta = J.S.acesas.includes('cripta');
    Tela.cam.x = J.P.x - 320; Tela.cam.y = J.P.y - 200;
    if (novo) setTimeout(() => anunciar('Você acorda na terra'), 800);
    if (!salvando) { salvando = true; setInterval(() => { if (rodando && !J.morreu()) J.salvar(); }, 30000); }
    N.enviar(true); // explorar também fica salvo
  }
  Tela.carregar((k) => { $('carrega').textContent = 'Acordando os mortos... ' + Math.round(k * 100) + '%'; }).then(() => {
    Tela.iniciar();
    montarTitulo(); desenharConta();
    if (N.sessao()) N.baixar().then((trocou) => { if (trocou) montarTitulo(); });
    N.acordar();
    requestAnimationFrame(laco);
  });
  window.SINA = { J, Tela, comecar, passoMundo, entrada: en, abrirMenu, fecharPainel, get modal() { return modal; } };
  if (location.search.includes('robo')) { const s = document.createElement('script'); s.src = 'js/robo.js'; document.head.appendChild(s); }
})();
