/* SINA · Parte I: liga tudo. Laço, controles, menus e a resposta aos eventos do jogo. */
(function () {
  'use strict';
  const M = window.Mapa, C = window.Conteudo, J = window.Jogo, Tela = window.Tela, Som = window.Som, T = M.T;
  const $ = (id) => document.getElementById(id);
  const en = J.entrada;
  let rodando = false, modal = null, parada = 0, ultimo = 0;

  // ---------- teclado e mouse ----------
  const teclas = {};
  const ACAO = { Space: 'rola', KeyJ: 'golpe', KeyK: 'forte', KeyQ: 'bebe', KeyE: 'usa', KeyF: 'usa', Tab: 'trava' };
  addEventListener('keydown', (e) => {
    teclas[e.code] = true;
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    Som.ligar();
    if (modal === 'conversa' && ['KeyE', 'Enter', 'Space'].includes(e.code)) return avancarConversa();
    if (modal === 'descanso' && e.code === 'Escape') return fecharDescanso();
    if (!modal && ACAO[e.code]) en[ACAO[e.code]] = true;
  });
  addEventListener('keyup', (e) => { teclas[e.code] = false; });
  addEventListener('blur', () => { for (const k in teclas) teclas[k] = false; });
  function eixo() {
    if (window.SINA.auto) return; // o robô de teste controla o herói
    if (toque.ativo) { en.mx = toque.x; en.my = toque.y; return; }
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
    const man = $('manche'), bola = man.firstElementChild;
    const mover = (t) => {
      const b = man.getBoundingClientRect(), dx = t.clientX - b.left - 60, dy = t.clientY - b.top - 60, m = Math.hypot(dx, dy), k = Math.min(1, m / 50);
      toque.x = m ? (dx / m) * k : 0; toque.y = m ? (dy / m) * k : 0;
      bola.style.transform = 'translate(' + toque.x * 40 + 'px,' + toque.y * 40 + 'px)';
    };
    man.addEventListener('touchstart', (e) => { e.preventDefault(); Som.ligar(); toque.ativo = true; toque.id = e.changedTouches[0].identifier; mover(e.changedTouches[0]); }, { passive: false });
    man.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === toque.id) mover(t); }, { passive: false });
    const solta = (e) => { for (const t of e.changedTouches) if (t.identifier === toque.id) { toque.ativo = false; toque.x = toque.y = 0; en.mx = en.my = 0; bola.style.transform = ''; } };
    man.addEventListener('touchend', solta); man.addEventListener('touchcancel', solta);
    document.querySelectorAll('#toque button').forEach((b) => b.addEventListener('touchstart', (e) => { e.preventDefault(); Som.ligar(); if (!modal) en[b.dataset.a] = true; }, { passive: false }));
    Tela.temToque = true;
  }

  // ---------- avisos ----------
  let timerSus, timerArea;
  function sussurrar(t, dur) { const s = $('sussurro'); s.textContent = t; s.classList.add('ver'); clearTimeout(timerSus); timerSus = setTimeout(() => s.classList.remove('ver'), dur || 4200); }
  function anunciar(t, grande) {
    const a = $('area'); a.textContent = t; a.className = grande ? 'ver grande' : 'ver';
    clearTimeout(timerArea); timerArea = setTimeout(() => a.classList.remove('ver'), 3000);
  }
  let areaAtual = null, entrouCripta = false;
  function verArea() {
    const P = J.P; let nome = null, menor = 1e9;
    for (const [n, x, y, r] of C.AREAS) { const d = Math.hypot(x * T - P.x, y * T - P.y); if (d < r * T && d / r < menor) { menor = d / r; nome = n; } }
    if (nome && nome !== areaAtual) {
      areaAtual = nome; anunciar(nome);
      if (nome === 'Cripta da Alvorada' && !entrouCripta) { entrouCripta = true; cartao('assets/telas/cripta.webp'); }
    }
    for (const p of C.PLACAS) {
      const id = p.x + ':' + p.y;
      if (!J.S.placas.includes(id) && Math.hypot(p.x * T - P.x, p.y * T - P.y) < 74) { J.S.placas.push(id); sussurrar(p.t, 6500); }
    }
    Som.ambiente(P.y >= M.CRIPTA_Y * T ? 'masmorra' : 'noite');
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
  const CORES = { morto: '#6a7a5a', morto_forte: '#6a6a7a', corpo: '#8a7a5a', lobo: '#7a2a24' };
  function tratar(ev) {
    switch (ev.tipo) {
      case 'golpe': Som.tocar(ev.forte ? 'forte' : 'golpe', 0.6); break;
      case 'rola': Som.tocar('golpe', 0.22, 0.6); break;
      case 'semvigor': sussurrar('Sem vigor.', 1000); break;
      case 'acerto': Som.tocar('acerto', 0.8); parada = ev.forte ? 0.09 : 0.05; treme(ev.forte ? 5 : 2.5); Tela.sangue(ev.x, ev.y, ev.forte ? 14 : 8, '#7a1f1a'); break;
      case 'dor': Som.tocar('dor', 0.8); parada = 0.07; treme(6); Tela.sangue(ev.x, ev.y, 10, '#a02a24'); break;
      case 'notou': if (Math.random() < 0.5) Som.tocar(ev.quem === 'lobo' ? 'uivo' : 'inimigoDor', 0.28, 0.8); break;
      case 'prepara': if (ev.grande) { Som.tocar('rugido', 0.8, 0.8); treme(3); } break;
      case 'inimigoGolpe': Som.tocar('golpe', 0.45, 0.72); break;
      case 'tiro': Som.tocar('magia', 0.5); break;
      case 'tremor': Som.tocar('rugido', 0.9, 0.6); treme(9); break;
      case 'quebra': Som.tocar('quebra', 0.8); sussurrar('A guarda dele quebrou. Agora.', 1600); break;
      case 'fase': Som.tocar('rugido', 1, 0.7); treme(10); anunciar('Ele não larga o caco', false); break;
      case 'matou': Som.tocar(ev.chefe ? 'rugido' : 'morte', ev.chefe ? 1 : 0.5); Tela.fagulhas(ev.x, ev.y, ev.chefe ? 60 : 14, '#ff9a3a', 30); if (ev.chefe) { treme(12); parada = 0.25; } break;
      case 'brasas': Som.tocar('moeda', 0.3); break;
      case 'bebeu': Som.tocar('beber', 0.7); Tela.fagulhas(J.P.x, J.P.y - 16, 12, '#7ce0a8', 24); break;
      case 'aviso': sussurrar(ev.t, 2600); break;
      case 'item': { const it = C.ITENS[ev.item]; Som.tocar('raro', 0.7); sussurrar(ev.item === 'brasas' ? ev.qtd + ' brasas.' : it.nome + '. ' + (it.desc || ''), 6000); break; }
      case 'acendeu': Som.tocar('fogo', 0.8); anunciar(ev.nome, true); break;
      case 'descansou': mostrarDescanso(ev.id); break;
      case 'portao': Som.tocar('porta', 0.9); treme(3); sussurrar(ev.nome + ' aberto.', 2600); break;
      case 'passagem': Som.tocar('porta', 0.7); areaAtual = null; break;
      case 'conversa': abrirConversa(ev.falas); break;
      case 'chefe': Som.musica('batalha'); Som.tocar('rugido', 0.9, 0.85); treme(7); anunciar(ev.nome, true); $('chefe-nome').textContent = ev.nome; $('chefe').hidden = false; if (ev.quem === 'corpo') cartao('assets/spr/ilustracao.png'); break;
      case 'chefeCaiu': Som.musica(null); $('chefe').hidden = true; anunciar(ev.final ? 'Um caco de estrela' : 'Derrotado', true); if (ev.final) sussurrar('Leve o fragmento a Benta, nas ruínas de Alvorada. A morte agora é só o caminho de casa.', 8000); break;
      case 'morreu': aoMorrer(); break;
      case 'nasceu': $('chefe').hidden = true; Som.musica(null); break;
      case 'fim': fimPendente = true; break;
      case 'subiu': Som.tocar('raro', 0.6); atualizarDescanso(); break;
    }
  }
  let fimPendente = false;
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
    $('d-brasas').textContent = J.S.brasas; $('d-custo').textContent = custo;
    const box = $('d-niveis'); box.innerHTML = '';
    for (const [k, nome] of ATR) {
      const b = document.createElement('button'); b.className = 'niv';
      b.innerHTML = '<span>' + nome + '</span><em>nível ' + J.S.nivel[k] + '</em>';
      b.disabled = J.S.brasas < custo;
      b.onclick = () => J.subir(k);
      box.appendChild(b);
    }
  }
  function fecharDescanso() { $('descanso').hidden = true; modal = null; }
  $('d-sair').onclick = fecharDescanso;

  // ---------- conversa ----------
  let falas = [], falaI = 0;
  function abrirConversa(l) {
    falas = l; falaI = 0; modal = 'conversa'; $('conversa').hidden = false;
    const r = $('conv-rosto').getContext('2d'), im = Tela.imagem('benta_s0');
    r.imageSmoothingEnabled = false; r.clearRect(0, 0, 64, 64);
    if (im) r.drawImage(im, 16, 2, 32, 32, 0, 0, 64, 64);
    $('conv-texto').textContent = falas[0]; Som.tocar('livro', 0.4);
  }
  function avancarConversa() {
    falaI++;
    if (falaI < falas.length) { $('conv-texto').textContent = falas[falaI]; Som.tocar('livro', 0.25); return; }
    $('conversa').hidden = true; modal = null;
    if (fimPendente) { fimPendente = false; mostrarFim(); }
  }
  $('conversa').onclick = avancarConversa;
  function mostrarFim() {
    modal = 'fim'; $('fim').hidden = false;
    const min = Math.round(J.tempo / 60);
    $('fim-txt').textContent = 'Você levou ' + min + ' minutos e caiu ' + J.S.mortes + ' vezes. A Sina tem cinco cacos. Este é só o primeiro.';
  }
  $('fim-seguir').onclick = () => { $('fim').hidden = true; modal = null; };

  // ---------- HUD ----------
  const pct = (v, m) => Math.max(0, Math.min(100, (v / m) * 100)) + '%';
  function hud() {
    const P = J.P;
    const lv = 100 + J.S.nivel.vida * 9 + J.S.vidaBonus * 20; // a barra cresce com a vida máxima
    $('b-vida').style.width = (lv / 100) * 100 / 1.0 > 0 ? 'min(100%, ' + lv * 2.4 + 'px)' : '';
    $('b-vida').firstElementChild.style.width = pct(P.vida, J.vidaMax());
    $('b-vida').lastElementChild.style.width = pct(P.vida, J.vidaMax());
    $('b-vigor').style.width = 'min(100%, ' + J.vigorMax() * 2.2 + 'px)';
    $('b-vigor').firstElementChild.style.width = pct(P.vigor, J.vigorMax());
    $('n-cabaca').textContent = P.cabaca;
    $('n-brasas').textContent = J.S.brasas;
    const c = J.chefe;
    if (c) { $('b-chefe').firstElementChild.style.width = pct(c.hp, c.hpMax); $('b-chefe').lastElementChild.style.width = pct(c.hp, c.hpMax); }
    const u = P.estado === 'livre' && !modal ? J.pertoDe() : null, box = $('usar');
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
  function comecar(novo) {
    Som.ligar();
    if (novo) J.novo(); else J.carregar();
    $('titulo').hidden = true; $('hud').hidden = false;
    if (Tela.temToque) $('toque').hidden = false;
    J.nascer(); rodando = true;
    entrouCripta = J.S.acesas.includes('cripta');
    Tela.cam.x = J.P.x - 320; Tela.cam.y = J.P.y - 200;
    if (novo) { setTimeout(() => anunciar('Você acorda na terra'), 800); }
    window.SINA.pronto = true;
  }
  Tela.carregar((k) => { $('carrega').textContent = 'Acordando os mortos... ' + Math.round(k * 100) + '%'; }).then(() => {
    Tela.iniciar();
    const m = $('titulo-menu'); m.innerHTML = '';
    if (J.temSave()) { const b = document.createElement('button'); b.textContent = 'Continuar'; b.onclick = () => comecar(false); m.appendChild(b); }
    const n = document.createElement('button'); n.textContent = 'Nova jornada';
    n.onclick = () => { if (!J.temSave() || confirm('Começar de novo apaga a jornada salva. Continuar?')) comecar(true); };
    m.appendChild(n);
    requestAnimationFrame(laco);
  });
  window.SINA = { J, Tela, comecar, passoMundo, entrada: en, get modal() { return modal; } };
  if (location.search.includes('robo')) { const s = document.createElement('script'); s.src = 'js/robo.js'; document.head.appendChild(s); }
})();
