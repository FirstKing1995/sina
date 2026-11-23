/* SINA 2D · controles, telas e o laço do jogo. */
(function () {
  'use strict';
  const J = window.Jogo, F = window.Fase, Hr = window.Heroi, C = window.Conteudo, S = window.Spr, D = window.Desenho;
  const $ = (id) => document.getElementById(id);
  const toque = matchMedia('(pointer: coarse)').matches;
  let modo = 'titulo'; // titulo | criacao | jogo | descanso | conversa | pausa | morte | fim
  const som = (n, v, t) => window.Som && Som.tocar(n, v, t);

  // ---------- carga ----------
  const PERSONAGENS = new Set(['fogueira']);
  for (const k in C.TIPOS) { PERSONAGENS.add(C.TIPOS[k].spr); if (C.TIPOS[k].ge) PERSONAGENS.add(C.TIPOS[k].ge); }
  const NPC = F.NPCS.map((n) => n.spr);
  const CENARIO = [...new Set([...F.SPRITES_DECOR, 'fogueira_apagada', 'bau', 'cabaca', 'arv_campos0', 'arv_mata0', 'arv_mata1', 'arv_cinzas0', 'cp24', 'arv_campos1', 'mt1', 'mt4', 'st19', 'st22', 'cz19'])];
  async function carregar() {
    const total = PERSONAGENS.size + NPC.length + CENARIO.length; let feito = 0;
    const av = () => { feito++; $('carrega').textContent = 'Acordando os mortos... ' + Math.round((feito / total) * 100) + '%'; };
    await Promise.all([
      S.carregar([...PERSONAGENS].filter((n) => window.ARTE.spr[n]), { contorno: true, aro: true }, null).then(() => { feito += PERSONAGENS.size; av(); }),
      S.carregar(NPC, { contorno: true, aro: true }),
      S.carregar(CENARIO, { aro: false }),
    ]);
  }
  async function vestir(ficha) {
    const c = Hr.caminhos(ficha);
    await S.carregarUm(D.ANDA, c.anda, { w: 64, h: 64, n: 6, fundo: null }, { contorno: true, aro: true, cabeca: true });
    await S.carregarUm(D.GOLPE, c.golpe, { w: c.golpeW, h: c.golpeW, n: c.golpeW === 88 ? 7 : 6, fundo: null }, { contorno: true, aro: true, cabeca: true });
    D.faixa = null;
  }

  // ---------- telas ----------
  const telas = ['titulo', 'criacao', 'morte', 'descanso', 'pausa', 'fim', 'abertura'];
  const mostra = (id) => { for (const t of telas) $(t).hidden = t !== id; $('hud').hidden = !(id === null || id === 'conversa'); $('toque').hidden = !(toque && id === null); };
  function titulo() {
    modo = 'titulo'; mostra('titulo');
    const m = $('titulo-menu'); m.innerHTML = '';
    const salvo = J.carregar();
    const bt = (t, f) => { const b = document.createElement('button'); b.textContent = t; b.onclick = () => { Som.ligar(); f(); }; m.appendChild(b); };
    if (salvo) bt('Continuar: ' + salvo.ficha.nome, () => comecar(salvo));
    bt(salvo ? 'Nova jornada (apaga a atual)' : 'Nova jornada', () => criacao());
  }

  // criação de personagem
  let ficha = Hr.padrao(), previa = null, previaT = 0;
  function criacao() {
    modo = 'criacao'; mostra('criacao');
    const grupo = (id, opcoes, campo, cartao) => {
      const el = $(id); el.innerHTML = '';
      for (const [k, o] of Object.entries(opcoes)) {
        const b = document.createElement('button');
        b.innerHTML = cartao ? '<b>' + o.nome + '</b><small>' + o.desc + '</small>' + (o.magias ? '<em>Magias: ' + o.magias.map((m) => Hr.MAGIAS[m].nome).join(' e ') + '</em>' : '') : o.nome;
        if (ficha[campo] === k) b.classList.add('ativa');
        b.onclick = () => { ficha[campo] = k; criacao(); };
        el.appendChild(b);
      }
    };
    grupo('cria-sexo', { m: { nome: 'Homem' }, f: { nome: 'Mulher' } }, 'sexo');
    grupo('cria-raca', Hr.RACAS, 'raca', true);
    grupo('cria-esp', Hr.ESPECIALIDADES, 'esp', true);
    $('cria-aviso').textContent = Hr.existe(ficha) ? '' : 'Esta combinação ainda não tem desenho próprio; usa a mais parecida.';
    const c = Hr.caminhos(ficha);
    const carrega = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
    Promise.all([carrega(c.anda), carrega(c.golpe)]).then(([a, b]) => { previa = { a, b, gw: c.golpeW, n: c.golpeW === 88 ? 7 : 6 }; });
  }
  function desenhaPrevia(dt) {
    if (modo !== 'criacao' || !previa || !previa.a) return;
    previaT += dt;
    const cv = $('cria-ver'), g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, cv.width, cv.height);
    const gr = g.createLinearGradient(0, 0, 0, cv.height); gr.addColorStop(0, '#141a24'); gr.addColorStop(1, '#2a2430'); g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#2e2419'; g.fillRect(0, 80, cv.width, 16); g.fillStyle = '#4a5a3a'; g.fillRect(0, 80, cv.width, 2);
    const ciclo = previaT % 3, golpe = ciclo > 2;
    if (golpe) { const q = Math.min(previa.n - 1, Math.floor((ciclo - 2) * previa.n)); g.drawImage(previa.b, q * previa.gw, 0, previa.gw, previa.gw, 64 - previa.gw / 2, 82 - previa.gw + (previa.gw === 88 ? 12 : 2), previa.gw, previa.gw); }
    else { const q = Math.floor(previaT * 9) % 6; g.drawImage(previa.a, q * 64, 0, 64, 64, 32, 20, 64, 64); }
    const e = Hr.ESPECIALIDADES[ficha.esp]; g.fillStyle = e.cor; g.globalAlpha = 0.25; g.beginPath(); g.ellipse(64, 82, 22, 3, 0, 0, 7); g.fill(); g.globalAlpha = 1;
  }
  $('cria-voltar').onclick = titulo;
  $('cria-ir').onclick = () => {
    ficha.nome = ($('cria-nome').value || 'Sem-Sina').trim().slice(0, 18);
    J.apagar(); visto.fill(0); guardaVisto();
    const novo = J.novoSave(Object.assign({}, ficha));
    abertura(() => comecar(novo));
  };

  // abertura: três frases antes de acordar na cova
  const ABERTURA = ['Vinte anos atrás, a Cauda rachou o céu de Aruanã.', 'Desde então os mortos não ficam embaixo da terra, e ninguém nasce sem uma sina.', 'Ninguém, a não ser você.'];
  function abertura(depois) {
    modo = 'abertura'; mostra('abertura');
    const el = $('ab-texto'); let i = 0, acabou = false, tm = null;
    const fim = () => { if (acabou) return; acabou = true; clearTimeout(tm); removeEventListener('keydown', fim); $('abertura').removeEventListener('pointerdown', fim); depois(); };
    const proxima = () => {
      if (i >= ABERTURA.length) { tm = setTimeout(fim, 900); return; }
      el.classList.remove('ver');
      tm = setTimeout(() => { el.textContent = ABERTURA[i++]; el.classList.add('ver'); tm = setTimeout(proxima, 3200); }, 700);
    };
    proxima();
    setTimeout(() => { addEventListener('keydown', fim); $('abertura').addEventListener('pointerdown', fim); }, 400);
  }

  async function comecar(save) {
    $('titulo-menu').innerHTML = '<div id="carrega">Vestindo o herói...</div>';
    if (modo === 'criacao' || modo === 'abertura') { mostra('titulo'); modo = 'carregando'; }
    J.save = save;
    await vestir(save.ficha);
    J.criarHeroi(); J.povoar(); J.fx = []; J.textos = []; J.rastro = [];
    D.centrar(); montaMagias(); retrato();
    modo = 'jogo'; mostra(null);
    regiaoAtual = null;
    if (!save.fogueira) sussurra('Você acorda dentro da terra fria.');
  }

  // ---------- HUD ----------
  function montaMagias() {
    const el = $('magias'); el.innerHTML = '';
    const ms = J.heroi.ficha.magias;
    ms.forEach((id, i) => {
      const M = Hr.MAGIAS[id], d = document.createElement('div');
      d.className = 'mg'; d.id = 'mg' + i; d.title = M.nome + ' (' + M.custo + ' de Sina)';
      d.innerHTML = '<img src="assets/ic/' + M.ic + '.png" alt="" style="width:22px;height:22px;image-rendering:pixelated;filter:drop-shadow(0 0 3px ' + M.cor + ')"><b>' + (toque ? '' : i ? 'F' : 'R') + '</b><s></s>';
      el.appendChild(d);
    });
  }
  function retrato() {
    const i = S.info(D.ANDA); if (!i) return;
    const g = $('retrato-c').getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 40, 40);
    g.drawImage(i.img, 12, 2, 40, 40, 0, 2, 40, 40);
  }
  let vidaVista = 1;
  function hud(dt) {
    const h = J.heroi, f = h.ficha;
    const v = Math.max(0, h.hp / f.vida);
    $('b-vida').style.width = Math.min(60, 22 + f.vida / 8) + 'vw';
    $('b-vida').style.maxWidth = (240 + f.vida * 0.8) + 'px';
    $('b-vida').querySelector('i').style.width = v * 100 + '%';
    vidaVista += (v - vidaVista) * Math.min(1, dt * (v < vidaVista ? 1.5 : 10));
    $('b-vida').querySelector('u').style.width = Math.max(v, vidaVista) * 100 + '%';
    $('b-vigor').querySelector('i').style.width = Math.max(0, h.vigor / f.vigor) * 100 + '%';
    $('orbe').querySelector('i').style.height = (h.sina / f.sina) * 100 + '%';
    $('n-cabaca').textContent = h.cabaca;
    $('n-brasas').textContent = J.save.brasas;
    f.magias.forEach((id, i) => {
      const el = $('mg' + i); if (!el) return; const M = Hr.MAGIAS[id];
      el.classList.toggle('falta', h.sina < M.custo);
      el.querySelector('s').style.transform = 'scaleY(' + ((h.espera[id] || 0) / M.espera) + ')';
    });
    const c = J.chefeAtivo;
    $('chefe').hidden = !c;
    if (c) { $('chefe-nome').textContent = c.T.nome; $('b-chefe').querySelector('i').style.width = Math.max(0, c.hp / c.hpMax) * 100 + '%'; $('b-chefe').querySelector('u').style.width = Math.max(0, c.hp / c.hpMax) * 100 + '%'; }
  }
  let sussT = 0;
  function sussurra(t, dur) { const el = $('sussurro'); el.textContent = t; el.classList.add('ver'); sussT = dur || 4; }
  let areaT = 0;
  J.mostraArea = function (r, grande) { const el = $('area'); el.textContent = r.nome || r; el.classList.toggle('grande', !!grande); el.classList.add('ver'); areaT = 3; if (r.amb && window.Som) Som.ambiente(r.amb); };
  let regiaoAtual = null, placaVista = null;

  // ---------- usar (E) ----------
  function usar() {
    const p = J.perto(); if (!p) return;
    if (p.tipo === 'fogueira') descanso(p.o);
    else if (p.tipo === 'bau') J.abrirBau(p.o);
    else if (p.tipo === 'npc') {
      const n = p.o;
      if (n.papel === 'historia') conversa(n, J.save.chefes.lobisomem ? C.CONVERSAS.bentaDepois : C.CONVERSAS.benta);
      else if (!J.save.conversou[n.id]) { J.save.conversou[n.id] = true; conversa(n, C.CONVERSAS[n.id], () => (n.papel === 'loja' ? loja() : forja())); }
      else if (n.papel === 'loja') loja(); else forja();
    }
  }
  function descanso(fg) {
    const nova = !J.save.acesas[fg.id];
    J.descansar(fg); som('fogo', 0.7);
    if (nova) J.mostraArea('Fogueira acesa', true);
    modo = 'descanso'; mostra('descanso');
    $('d-nome').textContent = fg.nome;
    painelNiveis();
    const v = $('d-viagem'); v.innerHTML = '';
    for (const o of F.FOGUEIRAS) {
      if (o.id === fg.id || !J.save.acesas[o.id]) continue;
      const b = document.createElement('button'); b.textContent = o.nome;
      b.onclick = () => { J.save.fogueira = o.id; J.salvar(); J.criarHeroi(); J.povoar(); D.centrar(); levantar(); };
      v.appendChild(b);
    }
    if (!v.children.length) v.innerHTML = '<p class="nota">Acenda outras fogueiras para viajar entre elas.</p>';
  }
  function painelNiveis() {
    const s = J.save, n = s.niv, c = J.custoNivel();
    $('d-nivel').textContent = 1 + n.vida + n.vigor + n.forca + n.sina; $('d-brasas').textContent = s.brasas; $('d-custo').textContent = c;
    const el = $('d-niveis'); el.innerHTML = '';
    for (const [k, nome, efeito] of [['vida', 'Vida', '+14 de vida'], ['vigor', 'Vigor', '+9 de vigor'], ['forca', 'Força', '+9% de dano'], ['sina', 'Sina', '+12 de Sina e magia mais forte']]) {
      const b = document.createElement('button'); b.className = 'niv'; b.disabled = s.brasas < c;
      b.innerHTML = '<span>' + nome + ' ' + n[k] + '</span><em>' + efeito + '</em>';
      b.onclick = () => { if (J.subir(k)) { som('raro', 0.6); painelNiveis(); } };
      el.appendChild(b);
    }
  }
  function levantar() { modo = 'jogo'; mostra(null); }
  $('d-sair').onclick = levantar;

  let falas = null, falaI = 0, depoisFala = null;
  function conversa(n, lista, depois) {
    falas = lista; falaI = 0; depoisFala = depois || null; modo = 'conversa'; mostra('conversa'); $('conversa').hidden = false;
    $('conv-nome').textContent = n.nome; $('conv-texto').textContent = falas[0];
    const i = S.info(n.spr), g = $('conv-rosto').getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 64, 64);
    if (i) g.drawImage(i.img, 16, 4, 32, 32, 0, 0, 64, 64);
    som('livro', 0.4);
  }
  function segueConversa() {
    falaI++;
    if (falaI >= falas.length) { $('conversa').hidden = true; modo = 'jogo'; mostra(null); if (depoisFala) { const d = depoisFala; depoisFala = null; d(); } return; }
    $('conv-texto').textContent = falas[falaI];
  }
  $('conversa').onclick = segueConversa;

  // ---------- loja do Lauro e forja do Bento ----------
  const icone = (ic) => '<img class="ic" src="assets/ic/' + ic + '.png" alt="">';
  const ITENS_LOJA = { caco_cabaca: { nome: 'Caco de cabaça', ic: 'P_Green01', desc: 'A cabaça passa a guardar mais um gole. Só há um.' }, pedra_forja: { nome: 'Pedra de forja', ic: 'I_Rock02', desc: 'Bento usa uma a cada vez que afia sua arma.' } };
  function painel(titulo, nota, linhas) {
    modo = 'loja'; mostra('__'); $('hud').hidden = false; $('loja').hidden = false;
    $('l-titulo').textContent = titulo; $('l-nota').innerHTML = nota;
    const c = $('l-corpo'); c.innerHTML = '';
    for (const l of linhas) {
      const d = document.createElement('div'); d.className = 'linha' + (l.atual ? ' atual' : '');
      d.innerHTML = '<div class="l-txt">' + icone(l.ic) + '<div><b>' + l.nome + '</b><small>' + l.desc + '</small></div></div>';
      if (l.botao) { const b = document.createElement('button'); b.textContent = l.botao; b.disabled = !!l.desliga; b.onclick = l.faz; d.appendChild(b); }
      c.appendChild(d);
    }
  }
  function fechaPainel() { $('loja').hidden = true; levantar(); }
  $('l-fechar').onclick = fechaPainel;
  function loja() {
    const s = J.save;
    painel('Lauro, o mercador', 'Você tem <b style="color:#e9c47a">' + s.brasas + '</b> brasas · ' + s.pedras + ' pedra(s) de forja', J.LOJA.map((id) => {
      const A = Hr.ARMAS[id], I = A || ITENS_LOJA[id], preco = A ? A.preco : J.PRECOS[id];
      const tem = A ? s.armas.includes(id) : id === 'caco_cabaca' && s.comprou.caco;
      const desc = A ? A.desc + ' Dano ' + A.dano + '.' : I.desc;
      return { ic: I.ic, nome: I.nome + (tem ? ' (já tem)' : ''), desc, botao: tem ? 'Comprado' : preco + ' brasas', desliga: tem || s.brasas < preco, faz: () => { if (J.comprar(id)) { loja(); hud(0); } } };
    }));
  }
  function forja() {
    const s = J.save, a = J.heroi.ficha.arma, n = s.forja[s.arma] || 0, c = J.CUSTO_FORJA[n];
    const linhas = [{ ic: a.ic, nome: a.nome + (n ? ' +' + n : ''), desc: n >= 3 ? 'Já está no fio máximo.' : 'Afiar para +' + (n + 1) + ': ' + c + ' brasas e 1 pedra de forja (você tem ' + s.pedras + '). Cada nível dá 15% de dano.',
      botao: n >= 3 ? 'Máximo' : 'Afiar', desliga: n >= 3 || s.brasas < c || s.pedras < 1, faz: () => { if (J.forjar()) { J.mostraArea(a.nome + ' +' + (n + 1)); forja(); } } }];
    painel('Bento, o ferreiro', 'Você tem <b style="color:#e9c47a">' + s.brasas + '</b> brasas. Para afiar outra arma, empunhe-a antes (Pausa).', linhas);
  }

  function pausa() {
    modo = 'pausa'; mostra('pausa');
    const h = J.heroi, f = h.ficha, s = J.save;
    $('p-ficha').innerHTML = '<div class="ficha"><span>' + s.ficha.nome + ', ' + Hr.RACAS[s.ficha.raca].nome + ' ' + Hr.ESPECIALIDADES[s.ficha.esp].nome.toLowerCase() + '</span><em></em>' +
      '<span>Vida</span><em>' + Math.ceil(h.hp) + ' / ' + f.vida + '</em><span>Vigor</span><em>' + f.vigor + '</em><span>Sina</span><em>' + Math.floor(h.sina) + ' / ' + f.sina + '</em>' +
      '<span>Arma</span><em>' + f.arma.nome + (f.arma.forja ? ' +' + f.arma.forja : '') + ' (' + Math.round(f.dano) + ')</em><span>Brasas</span><em>' + s.brasas + '</em><span>Cacos da Sina</span><em>' + (s.chefes.lobisomem ? 1 : 0) + ' / 3</em></div>' +
      '<h3>Mapa</h3><canvas id="p-mapa" class="mapa"></canvas>' +
      '<h3>Armas</h3><div id="p-armas"></div>' +
      '<ul class="mag-lista">' + f.magias.map((id, i) => { const M = Hr.MAGIAS[id]; return '<li><b>' + (toque ? '' : (i ? 'F' : 'R') + ' · ') + M.nome + '</b> <span style="color:#a8a292">(' + M.custo + ' de Sina)</span><small>' + M.desc + '</small></li>'; }).join('') + '</ul>';
    listaArmas(); mapa(); volumes();
    const ct = document.createElement('div');
    ct.innerHTML = '<h3>Controles</h3><p class="nota">' + (toque ? 'Manche anda (para cima/baixo muda a direção do golpe e desce de galhos). Segure Forte para carregar.' :
      'A/D andar · Espaço pular · J ou clique golpe (W para cima, S no ar para baixo) · segure K ou botão direito: golpe forte · Shift esquiva · R e F magias · Q beber · E usar · S + Espaço desce do galho · W/S parado olha.<br>Controle: A pula · X golpe · B esquiva · Y usar · RB e LB magias · RT forte · LT beber · Start pausa.') + '</p>';
    $('p-ficha').appendChild(ct);
  }
  // mapa do que já foi andado: a fase inteira, escurecida onde você nunca passou
  const visto = new Uint8Array(F.W);
  try { const v = JSON.parse(localStorage.getItem('sina2d_visto') || '[]'); v.forEach((i) => { visto[i] = 1; }); } catch (e) { /* nada */ }
  function marcaVisto() { const x = Math.floor(J.heroi.x / F.T); for (let i = Math.max(0, x - 18); i < Math.min(F.W, x + 18); i++) visto[i] = 1; }
  function guardaVisto() { try { const l = []; for (let i = 0; i < F.W; i++) if (visto[i]) l.push(i); localStorage.setItem('sina2d_visto', JSON.stringify(l)); } catch (e) { /* nada */ } }
  function mapa() {
    const c = $('p-mapa'); if (!c) return;
    const y0 = 14, alt = F.H - y0 - 4; c.width = F.W; c.height = alt;
    const g = c.getContext('2d'), im = g.createImageData(F.W, alt), d = im.data;
    for (let y = 0; y < alt; y++) for (let x = 0; x < F.W; x++) {
      const tp = F.tile(x, y + y0), k = (y * F.W + x) * 4, v = visto[x];
      const cor = tp === 1 ? [92, 80, 62] : tp === 2 ? [140, 110, 70] : tp === 3 ? [170, 60, 50] : [14, 18, 22];
      d[k] = cor[0] * (v ? 1 : 0.25); d[k + 1] = cor[1] * (v ? 1 : 0.25); d[k + 2] = cor[2] * (v ? 1 : 0.25); d[k + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    for (const fg of F.FOGUEIRAS) if (J.save.acesas[fg.id]) { g.fillStyle = '#ffa040'; g.fillRect(fg.x / F.T - 1, fg.y / F.T - y0 - 3, 3, 3); }
    if (J.save.perdidas) { g.fillStyle = '#ffe08a'; g.fillRect(J.save.perdidas.x / F.T - 1, J.save.perdidas.y / F.T - y0 - 3, 2, 2); }
    if (!J.save.chefes.lobisomem && visto[480]) { g.fillStyle = '#c0a0ff'; g.fillRect(490, F.ARENA.pisoY - y0 - 4, 3, 3); }
    g.fillStyle = '#fff'; g.fillRect(J.heroi.x / F.T - 1, J.heroi.y / F.T - y0 - 3, 3, 3);
  }
  function volumes() {
    if ($('p-vol')) return;
    const d = document.createElement('div'); d.id = 'p-vol'; d.innerHTML = '<h3>Som</h3>';
    for (const [k, nome] of [['efeitos', 'Efeitos'], ['ambiente', 'Ambiente'], ['musica', 'Música']]) {
      const l = document.createElement('label'); l.className = 'vol'; l.innerHTML = '<span>' + nome + '</span>';
      const r = document.createElement('input'); r.type = 'range'; r.min = 0; r.max = 1; r.step = 0.05; r.value = Som.vol[k];
      r.oninput = () => Som.mudaVolume(k, Number(r.value)); l.appendChild(r); d.appendChild(l);
    }
    $('p-ficha').appendChild(d);
  }
  function listaArmas() {
    const el = $('p-armas'); if (!el) return; el.innerHTML = ''; const s = J.save;
    for (const id of s.armas) {
      const A = Hr.ARMAS[id], n = s.forja[id] || 0, d = document.createElement('div');
      const fraca = A.req && s.niv.forca < A.req;
      d.className = 'linha' + (s.arma === id ? ' atual' : '');
      d.innerHTML = '<div class="l-txt">' + icone(A.ic) + '<div><b>' + A.nome + (n ? ' +' + n : '') + '</b><small>' + A.desc + (fraca ? ' <span style="color:#e07a6a">Força baixa: dano reduzido.</span>' : '') + '</small></div></div>';
      const b = document.createElement('button'); b.textContent = s.arma === id ? 'Na mão' : 'Empunhar'; b.disabled = s.arma === id;
      b.onclick = () => { J.empunhar(id); pausa(); }; d.appendChild(b); el.appendChild(d);
    }
  }
  $('p-voltar').onclick = levantar;
  $('p-titulo').onclick = () => { J.salvar(); if (window.Som) Som.musica(null); titulo(); };
  $('fim-seguir').onclick = levantar;

  // avisos do motor
  J.aviso = function (tipo, x) {
    if (tipo === 'chefe') J.mostraArea(x.T.nome, true);
    else if (tipo === 'venceu' && x.T.mini) { setTimeout(() => J.mostraArea(x.T.nome.split(',')[0] + ' caiu', true), 500); setTimeout(() => sussurra('Ele largou o facão. Empunhe-o na Pausa (Esc).', 6), 2500); }
    else if (tipo === 'venceu') {
      setTimeout(() => {
        J.mostraArea('Caco da Sina', true);
        setTimeout(() => { modo = 'fim'; mostra('fim'); $('fim-txt').textContent = 'O Lobisomem caiu, e o primeiro Caco da Sina pulsa na sua mão. Este é o fim do teste da versão 2D. Os outros dois cacos esperam pelas próximas partes.'; }, 2200);
      }, 600);
    } else if (tipo === 'morte') {
      setTimeout(() => {
        modo = 'morte'; mostra('morte');
        const p = J.save.perdidas;
        $('morte-sub').textContent = p ? p.qtd + ' brasas ficaram onde você caiu. Vá buscá-las antes de morrer de novo.' : 'Levante. A fogueira espera.';
        setTimeout(() => { J.renascer(); D.centrar(); modo = 'jogo'; mostra(null); }, 2600);
      }, 1400);
    }
  };

  // ---------- teclado ----------
  const TECLAS = {
    KeyA: 'esq', ArrowLeft: 'esq', KeyD: 'dir', ArrowRight: 'dir', KeyW: 'cima', ArrowUp: 'cima', KeyS: 'baixo', ArrowDown: 'baixo',
    Space: 'pula', KeyK: 'forte',
  };
  const APERTA = { Space: 'pula', KeyZ: 'pula', KeyJ: 'golpe', KeyX: 'golpe', KeyL: 'rola', KeyC: 'rola', ShiftLeft: 'rola', ShiftRight: 'rola', KeyR: 'magia1', KeyF: 'magia2', KeyQ: 'bebe', KeyE: 'usa' };
  addEventListener('keydown', (ev) => {
    if (ev.target.tagName === 'INPUT') return;
    if (window.Som) Som.ligar();
    if (modo === 'conversa' && ['KeyE', 'Enter', 'Space'].includes(ev.code)) { ev.preventDefault(); if (!ev.repeat) segueConversa(); return; }
    if (ev.code === 'Escape' || ev.code === 'KeyI') { if (modo === 'jogo') pausa(); else if (modo === 'loja') fechaPainel(); else if (modo === 'pausa' || modo === 'descanso') levantar(); return; }
    if (modo !== 'jogo') return;
    if (TECLAS[ev.code]) J.ent[TECLAS[ev.code]] = 1;
    if (ev.code === 'Space' || ev.code === 'KeyZ') J.ent.pula = 1;
    if (!ev.repeat && APERTA[ev.code]) { if (APERTA[ev.code] === 'usa') { if (J.perto()) usar(); } else J.aperta(APERTA[ev.code]); }
    if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(ev.code)) ev.preventDefault();
  });
  addEventListener('keyup', (ev) => {
    if (TECLAS[ev.code]) J.ent[TECLAS[ev.code]] = 0;
    if (['Space', 'KeyZ'].includes(ev.code)) J.ent.pula = 0;
  });
  const cv = $('c');
  cv.addEventListener('mousedown', (ev) => { if (window.Som) Som.ligar(); if (modo !== 'jogo') return; if (ev.button === 0) J.aperta('golpe'); if (ev.button === 2) J.ent.forte = 1; });
  addEventListener('mouseup', (ev) => { if (ev.button === 2) J.ent.forte = 0; });
  cv.addEventListener('contextmenu', (ev) => ev.preventDefault());
  addEventListener('blur', () => { for (const k in J.ent) J.ent[k] = 0; });

  // ---------- toque ----------
  if (toque) {
    const zona = $('zona-manche'), man = $('manche'), bola = man.querySelector('i');
    let id = null, ox = 0, oy = 0;
    zona.addEventListener('pointerdown', (ev) => { Som.ligar(); id = ev.pointerId; ox = ev.clientX; oy = ev.clientY; man.style.left = ox - 58 + 'px'; man.style.top = oy - 58 + 'px'; man.style.bottom = 'auto'; man.classList.add('vivo'); zona.setPointerCapture(id); });
    zona.addEventListener('pointermove', (ev) => {
      if (ev.pointerId !== id) return;
      const dx = ev.clientX - ox, dy = ev.clientY - oy, d = Math.min(40, Math.hypot(dx, dy)), a = Math.atan2(dy, dx);
      bola.style.transform = 'translate(' + Math.cos(a) * d + 'px,' + Math.sin(a) * d + 'px)';
      J.ent.esq = dx < -14 ? 1 : 0; J.ent.dir = dx > 14 ? 1 : 0; J.ent.cima = dy < -24 ? 1 : 0; J.ent.baixo = dy > 24 ? 1 : 0;
    });
    const solta = (ev) => { if (ev.pointerId !== id) return; id = null; J.ent.esq = J.ent.dir = J.ent.cima = J.ent.baixo = 0; bola.style.transform = ''; man.classList.remove('vivo'); man.style.top = ''; man.style.left = ''; man.style.bottom = ''; };
    zona.addEventListener('pointerup', solta); zona.addEventListener('pointercancel', solta);
    for (const b of document.querySelectorAll('#botoes button')) {
      const a = b.dataset.a;
      b.addEventListener('pointerdown', (ev) => {
        ev.preventDefault(); Som.ligar(); b.classList.add('ativa');
        if (a === 'menu') { if (modo === 'jogo') pausa(); return; }
        if (a === 'usa') { usar(); return; }
        if (a === 'pula') J.ent.pula = 1;
        if (a === 'forte') { J.ent.forte = 1; return; }
        J.aperta(a);
      });
      const fim = () => { b.classList.remove('ativa'); if (a === 'pula') J.ent.pula = 0; if (a === 'forte') J.ent.forte = 0; };
      b.addEventListener('pointerup', fim); b.addEventListener('pointercancel', fim); b.addEventListener('pointerleave', fim);
    }
    $('usar').addEventListener('pointerdown', usar);
  }

  // ---------- controle (gamepad) ----------
  // A pula · X golpe · B esquiva · Y usar · RB magia 1 · LB magia 2 · RT golpe forte (segure) · LT beber · Start pausa
  const antesPad = {};
  function controle() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = [...pads].find((q) => q && q.connected); if (!pad) return;
    const bt = (i) => !!(pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > 0.5));
    const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
    const ja = {}; for (let i = 0; i < 16; i++) { const v = bt(i); ja[i] = v && !antesPad[i]; antesPad[i] = v; }
    const novo = (i) => ja[i];
    if (window.Som && pad.buttons.some((b) => b.pressed)) Som.ligar();
    const ativo = Math.abs(ax) > 0.35 || Math.abs(ay) > 0.5 || pad.buttons.some((q) => q.pressed);
    if (modo === 'jogo' && !ativo && padUsado) { padUsado = false; for (const k in J.ent) J.ent[k] = 0; }
    if (modo === 'jogo' && (ativo || padUsado)) {
      J.ent.esq = ax < -0.35 || bt(14) ? 1 : 0; J.ent.dir = ax > 0.35 || bt(15) ? 1 : 0;
      J.ent.cima = ay < -0.5 || bt(12) ? 1 : 0; J.ent.baixo = ay > 0.5 || bt(13) ? 1 : 0;
      J.ent.pula = bt(0) ? 1 : 0; J.ent.forte = bt(7) ? 1 : 0;
      if (novo(0)) J.aperta('pula'); if (novo(2)) J.aperta('golpe'); if (novo(1)) J.aperta('rola');
      if (novo(5)) J.aperta('magia1'); if (novo(4)) J.aperta('magia2'); if (novo(6)) J.aperta('bebe');
      if (novo(3)) usar(); if (novo(9)) pausa();
      padUsado = ativo;
    } else {
      const a = novo(0), s = novo(9), bb = novo(1);
      if (modo === 'conversa' && (a || novo(3))) segueConversa();
      else if ((modo === 'pausa' || modo === 'descanso') && (s || bb)) levantar();
      else if (modo === 'loja' && (s || bb)) fechaPainel();
      else if (modo === 'titulo' && a) { const b0 = document.querySelector('#titulo-menu button'); if (b0) b0.click(); }
      else if (modo === 'fim' && a) levantar();
    }
  }
  let padUsado = false, visT = 5;

  // ---------- laço ----------
  let antes = performance.now();
  function laco(agora) {
    const dt = Math.min(1 / 30, (agora - antes) / 1000); antes = agora;
    controle();
    desenhaPrevia(dt);
    if (modo === 'jogo' || modo === 'morte' || modo === 'conversa' || modo === 'fim') {
      if (modo === 'jogo' || modo === 'morte') J.passo(dt);
      D.quadro(dt);
      if (J.heroi) hud(dt);
      if (modo === 'jogo') {
        const h = J.heroi;
        marcaVisto(); visT -= dt; if (visT <= 0) { visT = 5; guardaVisto(); }
        const r = F.regiao(h.x);
        if (r !== regiaoAtual && h.estado !== 'acorda') { if (regiaoAtual) J.mostraArea(r); else if (window.Som) Som.ambiente(r.amb); regiaoAtual = r; }
        const p = J.perto(), u = $('usar');
        if (p) { u.hidden = false; u.innerHTML = '<b>' + (toque ? 'Usar' : 'E') + '</b>' + (p.tipo === 'fogueira' ? (J.save.acesas[p.o.id] ? 'Descansar' : 'Acender a fogueira') : p.tipo === 'bau' ? 'Abrir o baú' : p.o.papel === 'loja' ? 'Comprar com ' + p.o.nome.split(',')[0] : p.o.papel === 'forja' ? 'Afiar a arma com ' + p.o.nome.split(',')[0] : 'Falar com ' + p.o.nome); } else u.hidden = true;
        const pl = F.PLACAS.find((q) => Math.abs(q.x - h.x) < 40 && Math.abs(q.y - h.y) < 50);
        if (pl && pl !== placaVista) { placaVista = pl; sussurra(toque && pl.toque ? pl.toque : pl.t, 6); }
        if (!pl) placaVista = null;
        if (window.Som) { let k = 0; for (const fg of F.FOGUEIRAS) if (J.save.acesas[fg.id]) k = Math.max(k, 1 - Math.abs(fg.x - h.x) / 220); Som.fogueira(Math.max(0, k) * 0.6); }
      }
    }
    sussT -= dt; if (sussT <= 0) $('sussurro').classList.remove('ver');
    areaT -= dt; if (areaT <= 0) $('area').classList.remove('ver');
    requestAnimationFrame(laco);
  }

  D.iniciar(cv);
  carregar().then(() => D.prepintar((k) => { $('carrega').textContent = 'Erguendo a terra... ' + Math.round(k * 100) + '%'; })).then(() => { titulo(); requestAnimationFrame(laco); });
  window.SINA = { J, F, D }; // para testar pelo console
})();
