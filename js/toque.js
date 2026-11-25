/* SINA · controles de toque: manche solto à esquerda, leque de botões à direita em volta do golpe, mira arrastando o próprio golpe,
   botões que o jogador muda de lugar e de tamanho. E o cartão das armas, o trilho do caminho e o próximo passo. */
(function () {
  'use strict';
  const J = window.Jogo, F = window.Fase, C = window.Dados, D = window.Desenho, UI = window.UI;
  const $ = (id) => document.getElementById(id), el = UI.el;

  // onde cada botão mora: canto (r direita, l esquerda), distância da borda, de baixo, tamanho (em pontos de uma tela de 390 de altura)
  const LUGAR = {
    golpe: { r: 92, b: 42, t: 96 }, pula: { r: 14, b: 96, t: 72 }, rola: { r: 18, b: 18, t: 66 }, forte: { r: 196, b: 20, t: 62 },
    magia1: { r: 186, b: 94, t: 60 }, magia2: { r: 130, b: 146, t: 60 }, come: { r: 62, b: 178, t: 50 }, tocha: { r: 8, b: 182, t: 46 }, golpe2: { l: 30, b: 208, t: 66 },
  };
  let lug = {};
  function leLugar() { let g = null; try { g = JSON.parse(localStorage.getItem('sina_toque')); } catch (e) { /* nada */ } lug = {}; for (const k in LUGAR) lug[k] = Object.assign({}, LUGAR[k], g && g[k]); }
  const guardaLugar = () => { try { localStorage.setItem('sina_toque', JSON.stringify(lug)); } catch (e) { /* nada */ } };
  function poe() { for (const k in lug) { const b = document.querySelector('#botoes [data-a=' + k + ']'), o = lug[k]; if (!b) continue; b.style.setProperty('--t', o.t); b.style.setProperty('--px', o.l != null ? o.l : o.r); b.style.setProperty('--py', o.b); b.classList.toggle('esq', o.l != null); } }

  UI.criarToque = function (api) {
    const { usar, abreMenu, pode } = api;
    leLugar(); poe();
    document.body.classList.add('toque');
    const zona = $('zona-manche'), man = $('manche'), bola = man.querySelector('i'), som = api.som;
    // ---------- manche ----------
    let id = null, ox = 0, oy = 0; const RAIO = () => 62 * (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--b')) || 1);
    let raio = 62;
    zona.addEventListener('pointerdown', (ev) => {
      ev.preventDefault(); if (id !== null) return; if (window.Som) Som.ligar(); raio = RAIO(); id = ev.pointerId; ox = Math.max(raio * 0.8, ev.clientX); oy = Math.min(innerHeight - raio * 0.7, ev.clientY); man.style.left = ox + 'px'; man.style.top = oy + 'px'; man.style.bottom = 'auto'; man.classList.add('vivo'); try { zona.setPointerCapture(id); } catch (e) { /* ponteiro sintético */ }
    });
    zona.addEventListener('pointermove', (ev) => {
      if (ev.pointerId !== id) return;
      let dx = ev.clientX - ox, dy = ev.clientY - oy; const d0 = Math.hypot(dx, dy), lim = raio * 1.15;
      if (d0 > lim) { ox += (dx / d0) * (d0 - lim); oy += (dy / d0) * (d0 - lim); dx = ev.clientX - ox; dy = ev.clientY - oy; man.style.left = ox + 'px'; man.style.top = oy + 'px'; }
      const d = Math.min(raio * 0.72, Math.hypot(dx, dy)), a = Math.atan2(dy, dx), m = raio * 0.22, v = raio * 0.46;
      bola.style.transform = 'translate(' + Math.cos(a) * d + 'px,' + Math.sin(a) * d + 'px)'; man.style.setProperty('--ang', a + 'rad'); man.classList.toggle('longe', d > m);
      J.ent.esq = dx < -m ? 1 : 0; J.ent.dir = dx > m ? 1 : 0; J.ent.cima = dy < -v && Math.abs(dy) > Math.abs(dx) * 0.7 ? 1 : 0; J.ent.baixo = dy > v && Math.abs(dy) > Math.abs(dx) * 0.7 ? 1 : 0;
    });
    const fim = (ev) => { if (ev.pointerId !== id) return; id = null; J.ent.esq = J.ent.dir = J.ent.cima = J.ent.baixo = 0; bola.style.transform = ''; man.classList.remove('vivo', 'longe'); man.style.top = man.style.left = man.style.bottom = ''; };
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) zona.addEventListener(t, fim);

    // ---------- botões ----------
    let editando = false;
    for (const b of document.querySelectorAll('#botoes button')) {
      const a0 = b.dataset.a, a = a0 === 'golpe2' ? 'golpe' : a0; let pid = null, sx = 0, sy = 0;
      b.addEventListener('pointerdown', (ev) => {
        ev.preventDefault(); ev.stopPropagation(); if (editando) return; if (window.Som) Som.ligar(); if (!pode()) return; if (pid !== null) return;
        pid = ev.pointerId; sx = ev.clientX; sy = ev.clientY; try { b.setPointerCapture(pid); } catch (e) { /* sintético */ } b.classList.add('ativa'); UI.vibra(a === 'golpe' ? 7 : 10);
        if (a === 'tocha') { J.tocha(); return; }
        if (a === 'pula') J.ent.pula = 1;
        if (a === 'golpe') { J.ent.golpe = 1; J.miraDedo = null; }
        if (a === 'forte') { J.ent.forte = 1; return; }
        J.aperta(a);
      });
      // arrastar em cima do golpe mira: vira o corpo, golpeia para cima ou para baixo e dá o ângulo da flecha
      b.addEventListener('pointermove', (ev) => {
        if (ev.pointerId !== pid || (a !== 'golpe' && a !== 'forte')) return; const dx = ev.clientX - sx, dy = ev.clientY - sy, d = Math.hypot(dx, dy);
        if (d < 16) { J.miraDedo = null; b.style.removeProperty('--mx'); return; }
        J.miraDedo = { a: Math.atan2(dy, dx), d }; b.style.setProperty('--mx', Math.cos(J.miraDedo.a) * Math.min(18, d * 0.4) + 'px'); b.style.setProperty('--my', Math.sin(J.miraDedo.a) * Math.min(18, d * 0.4) + 'px');
      });
      const f2 = (ev) => { if (pid === null || (ev && ev.pointerId !== pid)) return; pid = null; b.classList.remove('ativa'); b.style.removeProperty('--mx'); b.style.removeProperty('--my'); if (a === 'pula' || a === 'forte' || a === 'golpe') J.ent[a] = 0; if (a === 'golpe' || a === 'forte') setTimeout(() => { if (!J.ent.golpe && !J.ent.forte) J.miraDedo = null; }, 60); };
      for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(t, f2);
    }

    // ---------- mudar de lugar ----------
    let sel = null;
    function edita() {
      editando = true; document.body.classList.add('editando'); $('toque').hidden = false; for (const b of document.querySelectorAll('#botoes button')) { b.dataset.eh = b.hidden ? 1 : ''; b.hidden = false; }
      const p = $('edita'); p.hidden = false; p.innerHTML = ''; p.append(el('b', '', 'Arraste os botões para onde preferir'));
      const l = el('label', 'vol'), r = el('input'); r.type = 'range'; r.min = 36; r.max = 130; r.value = 60; r.disabled = true; r.oninput = () => { if (sel) { lug[sel].t = +r.value; poe(); } }; l.append(el('span', '', 'Tamanho'), r); p.append(l);
      const f = el('div', 'e-bot'); const bt = (t, fn, c) => { const b = el('button', c, t); b.onclick = fn; f.append(b); };
      bt('Voltar ao padrão', () => { for (const k in LUGAR) lug[k] = Object.assign({}, LUGAR[k]); poe(); }); bt('Pronto', sai, 'ir'); p.append(f);
      p._r = r;
    }
    function sai() { editando = false; sel = null; document.body.classList.remove('editando'); $('edita').hidden = true; for (const b of document.querySelectorAll('#botoes button')) { b.hidden = !!b.dataset.eh; b.classList.remove('sel'); } guardaLugar(); api.voltaMenu(); }
    let arr = null;
    $('botoes').addEventListener('pointerdown', (ev) => { if (!editando) return; const b = ev.target.closest('button'); if (!b) return; ev.preventDefault(); pegou(b, ev); }, true);
    function pegou(b, ev) { for (const q of document.querySelectorAll('#botoes .sel')) q.classList.remove('sel'); b.classList.add('sel'); sel = b.dataset.a; const o = lug[sel]; $('edita')._r.disabled = false; $('edita')._r.value = o.t; arr = { b, x: ev.clientX, y: ev.clientY, o0: Object.assign({}, o), id: ev.pointerId }; }
    addEventListener('pointermove', (ev) => {
      if (!arr || ev.pointerId !== arr.id) return; const k = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--b')) || 1, o = lug[sel], dx = (ev.clientX - arr.x) / k, dy = (ev.clientY - arr.y) / k, W = innerWidth / k, Hh = innerHeight / k;
      if (o.l != null) o.l = Math.max(0, Math.min(W * 0.5 - o.t, arr.o0.l + dx)); else o.r = Math.max(0, Math.min(W * 0.62, arr.o0.r - dx)); o.b = Math.max(0, Math.min(Hh - o.t, arr.o0.b - dy)); poe();
    });
    addEventListener('pointerup', (ev) => { if (arr && ev.pointerId === arr.id) arr = null; });
    void usar; void abreMenu; void som;
    return { edita, get editando() { return editando; } };
  };

  // ---------- o que muda nos botões a cada instante ----------
  let vArma = '', vMag = '';
  UI.passoToque = function () {
    const h = J.heroi, s = J.save; if (!h) return;
    const q = (a) => document.querySelector('#botoes [data-a=' + a + ']');
    const ka = s.arma; if (ka !== vArma) { vArma = ka; for (const a of ['golpe', 'golpe2']) { const b = q(a); if (!b) continue; const i = b.querySelector('.bi'); i.innerHTML = ''; i.append(s.arma === 'punho' ? UI.ico('punho') : UI.item(s.arma, 48)); } }
    const km = s.magias[0] + '|' + s.magia2; if (km !== vMag) { vMag = km; for (const [a, m] of [['magia1', s.magias[0]], ['magia2', s.magia2]]) { const b = q(a); if (!b) continue; b.hidden = !m; if (m) { const i = b.querySelector('.bi'); i.innerHTML = ''; i.append(UI.ico(m)); b.style.setProperty('--cor', C.MAGIAS[m].cor); } } }
    for (const [a, m] of [['magia1', s.magias[0]], ['magia2', s.magia2]]) { const b = q(a); if (!b || !m) continue; const M = C.MAGIAS[m]; b.style.setProperty('--c', Math.min(1, (h.espera[m] || 0) / M.espera).toFixed(2)); b.classList.toggle('falta', h.sina < M.custo); }
    const cm = ['curativo', 'erva', 'seca', 'peixe', 'carne', 'fruta'].reduce((t, m) => t + (s.inv[m] || 0), 0), bc = q('come'); if (bc) { bc.querySelector('em').textContent = cm; bc.classList.toggle('falta', !cm); bc.classList.toggle('urge', cm > 0 && (h.hp < h.ficha.vida * 0.35 || s.fome < 18)); }
    const bt = q('tocha'); if (bt) { bt.hidden = !(s.tocha > 0 || s.inv.tocha > 0); bt.classList.toggle('acesa', !!s.tochaAcesa); }
    for (const a of ['rola', 'forte', 'golpe', 'golpe2']) { const b = q(a); if (b) b.classList.toggle('falta', h.vigor <= 0); }
    const bf = q('forte'); if (bf) { bf.style.setProperty('--c', h.estado === 'carga' ? (1 - Math.min(1, h.carga / 0.9)).toFixed(2) : 0); bf.classList.toggle('cheio', h.estado === 'carga' && h.cheia); }
    const bg = q('golpe2'); if (bg) bg.hidden = !UI.pref.golpeE;
  };
  UI.zeraToque = () => { vArma = vMag = ''; };

  // ---------- cartões das armas ----------
  let chave = '';
  UI.passoArmas = function () {
    const s = J.save, cx = $('h-armas'), l = C.ORDEM_ARMAS.filter((a) => s.armas.includes(a)), k = l.join() + s.arma + (s.inv.flecha || 0) + JSON.stringify(s.afiado); if (k === chave) return; chave = k;
    // a da mão e as três mais fortes
    const extra = l.filter((a) => a !== s.arma && a !== 'punho').sort((a, b) => C.ARMAS[b].dano - C.ARMAS[a].dano).slice(0, 2), most = [s.arma, ...extra].sort((a, b) => C.ORDEM_ARMAS.indexOf(a) - C.ORDEM_ARMAS.indexOf(b));
    cx.innerHTML = '';
    for (const a of most) { const b = el('button', 'arma' + (a === s.arma ? ' atual' : '')); b.append(UI.iconeArma(a, 40)); if (C.ARMAS[a].tiro) b.append(el('em', s.inv.flecha > 0 ? '' : 'zero', s.inv.flecha || 0)); if (s.afiado[a]) b.append(el('u', '', '+' + s.afiado[a])); if (a === s.arma) b.append(el('small', '', C.ARMAS[a].nome)); b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); if (J.heroi && a !== J.save.arma) { J.empunhar(a); UI.vibra(8); } }); cx.append(b); }
  };

  // ---------- trilho do caminho: onde você está na área ----------
  let trT = 0;
  UI.passoTrilho = function (dt) {
    trT -= dt; if (trT > 0) return; trT = 0.3; const c = $('h-trilho'), A = F.atual, h = J.heroi, s = J.save; if (!c || !A) return; const w = c.width, q = c.getContext('2d'), X = (x) => 10 + (x / (A.W * 16)) * (w - 20), y = 11; q.clearRect(0, 0, w, c.height);
    q.fillStyle = '#05080acc'; q.fillRect(6, y - 3, w - 12, 6); const m = s.mapa && s.mapa[A.id];
    q.fillStyle = '#5a5040'; q.fillRect(8, y - 1, w - 16, 2); void m;
    const ponto = (x, cor, r) => { q.fillStyle = '#05080a'; q.beginPath(); q.arc(X(x), y, r + 1.5, 0, 7); q.fill(); q.fillStyle = cor; q.beginPath(); q.arc(X(x), y, r, 0, 7); q.fill(); };
    const visto = (x) => Math.abs(x - h.x) < 900 || (J.vistoMapa ? J.vistoMapa(A.id, x) : true);
    for (const p of A.portas) if (visto(p.x)) ponto(p.x, p.id === 'covil' ? '#d0483a' : '#9fd8ff', 3); for (const f of A.fogos) if (s.fogos[f.id]) ponto(f.x, '#ffb050', 3.4); else if (visto(f.x)) ponto(f.x, '#6a6a60', 2.6);
    const px = X(h.x); q.fillStyle = '#05080a'; q.beginPath(); q.moveTo(px - 6, 0); q.lineTo(px + 6, 0); q.lineTo(px, 10); q.fill(); q.fillStyle = '#ffe9b0'; q.beginPath(); q.moveTo(px - 4, 1); q.lineTo(px + 4, 1); q.lineTo(px, 8); q.fill();
  };

  // ---------- o próximo passo ----------
  UI.proximoPasso = function () {
    const s = J.save, h = J.heroi, i = s.inv, ch = Object.keys(s.chefes).length, n = (m) => i[m] || 0;
    if (J.emb) return ['caveira', 'Sobreviva à emboscada'];
    if (J.raid) return ['escudo', 'Segure a noite'];
    if (J.chefeAtivo) return ['caveira', 'Derrube ' + J.chefeAtivo.T.nome];
    if (J.hum && J.hum.caida) return ['vida', 'Levante ' + (s.hum ? s.hum.nome : 'quem caiu')];
    if (s.hum && s.hum.onde === 'levada') return ['alvo', 'Resgate ' + s.hum.nome];
    if (s.fome < 15) return ['fome', 'Coma alguma coisa'];
    if (h.hp < h.ficha.vida * 0.3 && (n('erva') || n('curativo'))) return ['vida', 'Cure as feridas'];
    if (s.armas.length < 2) return n('galho') >= 3 ? ['bigorna', 'Faça um porrete em Criar'] : ['mao', 'Junte galhos: ' + n('galho') + ' de 3'];
    if (!Object.keys(s.fogos).length) return ['fogueira', 'Ache uma fogueira e acenda'];
    if (s.roupas.length < 2) return n('folha') >= 8 && n('fibra') >= 4 ? ['bigorna', 'Faça uma roupa de folhas'] : ['cesto', 'Para se vestir: folhas ' + Math.min(8, n('folha')) + '/8, fibras ' + Math.min(4, n('fibra')) + '/4'];
    if (C.RECEITAS.some((r) => r.tipo && r.tipo !== 'item' && J.pode(r) && !J.jaTem(r))) return ['bigorna', 'Há algo novo para fazer'];
    if (J.ehNoite() && s.area !== 'lar' && !s.tochaAcesa) return ['lua', 'Anoiteceu: procure um fogo'];
    if (!s.visitas.lobos && !s.visitas.cobras && !s.visitas.zumbis && !s.visitas.goblins) return ['mapa', 'Siga até a clareira dos quatro caminhos'];
    if (ch < 2) return ['caveira', 'Derrube os donos dos caminhos: ' + ch + ' de 2'];
    if (!s.lar) return ['casa', 'Atravesse o vale até a Clareira do Rio'];
    if (!s.lar.casa.n) return ['casa', 'Levante uma casa'];
    if (!s.hum && !s.mae) return ['vida', 'Alguém gritou no vale'];
    if (J.moradores().length < 4) return ['cadeado', 'Solte quem está preso nos caminhos: ' + J.moradores().length + ' de 4'];
    if (ch < 4) return ['caveira', 'Derrube os donos dos caminhos: ' + ch + ' de 4'];
    const f = J.faltaEstagio(); return f ? ['familia', f] : ['taca', 'A cidade é sua. Cuide dela.'];
  };
  let mtT = 0, mtV = '';
  UI.passoMeta = function (dt) { mtT -= dt; if (mtT > 0) return; mtT = 0.8; const m = $('h-meta'); m.hidden = !UI.pref.meta; if (!UI.pref.meta) return; const p = UI.proximoPasso(); if (p[1] === mtV) return; const novo = mtV; mtV = p[1]; m.innerHTML = ''; m.append(UI.ico(p[0]), el('span', '', p[1])); if (novo) { m.classList.remove('muda'); void m.offsetWidth; m.classList.add('muda'); } };
})();
