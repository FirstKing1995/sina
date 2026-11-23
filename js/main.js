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
    await S.carregarUm(D.ANDA, c.anda, { w: 64, h: 64, n: 6, fundo: null }, { contorno: true, aro: true });
    await S.carregarUm(D.GOLPE, c.golpe, { w: c.golpeW, h: c.golpeW, n: c.golpeW === 88 ? 7 : 6, fundo: null }, { contorno: true, aro: true });
  }

  // ---------- telas ----------
  const telas = ['titulo', 'criacao', 'morte', 'descanso', 'pausa', 'fim'];
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
    J.apagar(); comecar(J.novoSave(Object.assign({}, ficha)));
  };

  async function comecar(save) {
    $('titulo-menu').innerHTML = '<div id="carrega">Vestindo o herói...</div>';
    if (modo === 'criacao') mostra('titulo');
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
    else if (p.tipo === 'npc') conversa(p.o, J.save.chefes.lobisomem ? C.CONVERSAS.bentaDepois : C.CONVERSAS.benta);
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

  let falas = null, falaI = 0;
  function conversa(n, lista) {
    falas = lista; falaI = 0; modo = 'conversa'; mostra('conversa'); $('conversa').hidden = false;
    $('conv-nome').textContent = n.nome; $('conv-texto').textContent = falas[0];
    const i = S.info(n.spr), g = $('conv-rosto').getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 64, 64);
    if (i) g.drawImage(i.img, 16, 4, 32, 32, 0, 0, 64, 64);
    som('livro', 0.4);
  }
  function segueConversa() {
    falaI++;
    if (falaI >= falas.length) { $('conversa').hidden = true; modo = 'jogo'; mostra(null); return; }
    $('conv-texto').textContent = falas[falaI];
  }
  $('conversa').onclick = segueConversa;

  function pausa() {
    modo = 'pausa'; mostra('pausa');
    const h = J.heroi, f = h.ficha, s = J.save;
    $('p-ficha').innerHTML = '<div class="ficha"><span>' + s.ficha.nome + ', ' + Hr.RACAS[s.ficha.raca].nome + ' ' + Hr.ESPECIALIDADES[s.ficha.esp].nome.toLowerCase() + '</span><em></em>' +
      '<span>Vida</span><em>' + Math.ceil(h.hp) + ' / ' + f.vida + '</em><span>Vigor</span><em>' + f.vigor + '</em><span>Sina</span><em>' + Math.floor(h.sina) + ' / ' + f.sina + '</em>' +
      '<span>Arma</span><em>' + f.arma.nome + ' (' + Math.round(f.dano) + ')</em><span>Brasas</span><em>' + s.brasas + '</em><span>Cacos da Sina</span><em>' + (s.chefes.lobisomem ? 1 : 0) + ' / 3</em></div>' +
      '<ul class="mag-lista">' + f.magias.map((id, i) => { const M = Hr.MAGIAS[id]; return '<li><b>' + (toque ? '' : (i ? 'F' : 'R') + ' · ') + M.nome + '</b> <span style="color:#a8a292">(' + M.custo + ' de Sina)</span><small>' + M.desc + '</small></li>'; }).join('') + '</ul>';
  }
  $('p-voltar').onclick = levantar;
  $('p-titulo').onclick = () => { J.salvar(); if (window.Som) Som.musica(null); titulo(); };
  $('fim-seguir').onclick = levantar;

  // avisos do motor
  J.aviso = function (tipo, x) {
    if (tipo === 'chefe') J.mostraArea(x.T.nome, true);
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
    if (ev.code === 'Escape' || ev.code === 'KeyI') { if (modo === 'jogo') pausa(); else if (modo === 'pausa' || modo === 'descanso') levantar(); return; }
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

  // ---------- laço ----------
  let antes = performance.now();
  function laco(agora) {
    const dt = Math.min(1 / 30, (agora - antes) / 1000); antes = agora;
    desenhaPrevia(dt);
    if (modo === 'jogo' || modo === 'morte' || modo === 'conversa' || modo === 'fim') {
      if (modo === 'jogo' || modo === 'morte') J.passo(dt);
      D.quadro(dt);
      if (J.heroi) hud(dt);
      if (modo === 'jogo') {
        const h = J.heroi;
        const r = F.regiao(h.x);
        if (r !== regiaoAtual && h.estado !== 'acorda') { if (regiaoAtual) J.mostraArea(r); else if (window.Som) Som.ambiente(r.amb); regiaoAtual = r; }
        const p = J.perto(), u = $('usar');
        if (p) { u.hidden = false; u.innerHTML = '<b>' + (toque ? 'Usar' : 'E') + '</b>' + (p.tipo === 'fogueira' ? (J.save.acesas[p.o.id] ? 'Descansar' : 'Acender a fogueira') : p.tipo === 'bau' ? 'Abrir o baú' : 'Falar com ' + p.o.nome); } else u.hidden = true;
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
  carregar().then(() => { titulo(); requestAnimationFrame(laco); });
  window.SINA = { J, F, D }; // para testar pelo console
})();
