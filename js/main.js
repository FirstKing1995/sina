/* SINA · o laço do jogo, a entrada (teclado, mouse e toque), a tela de título e a criação do herói. */
(function (G) {
  'use strict';
  const D = G.D, Gm = G.Game, S = Gm.S, UI = G.UI, Cb = G.Combat;
  const M = G.Main = {};
  const $ = (s) => document.querySelector(s);
  const keys = {};
  const mouse = { x: 0, y: 0, l: false, r: false, lT: 0 };
  const touch = { on: false, jx: 0, jy: 0, jid: null, atk: false, ox: 0, oy: 0 };
  let last = 0;

  M.start = function () {
    G.Art.build();
    G.Render.init();
    UI.init();
    bindInput();
    M.title();
    requestAnimationFrame(loop);
    // pré-gerar o mundo enquanto o título aparece
    setTimeout(() => { if (!S.world) { S.world = G.World.generate(Gm.SEED); S.seen = new Uint8Array(S.world.N * S.world.N); } }, 50);
  };

  // ---------- laço ----------
  let seenT = 0, saveT = 0;
  function loop(t) {
    requestAnimationFrame(loop);
    let dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
    M.step(dt);
  }
  // um passo do jogo (o laço chama; os testes também podem chamar à mão)
  M.step = function (dt) {
    if (S.mode === 'play' && S.P) {
      // morreu: depois de um instante, a tela de voltar (pelo laço, não por temporizador)
      if (S.dead) { S.deadT = (S.deadT || 0) + dt; if (S.deadT > 1 && UI.kind() !== 'dead') { touch.atk = false; mouse.l = false; UI.deathScreen(); } }
      const paused = UI.isOpen();
      if (S.hitstop > 0) { S.hitstop -= dt; dt *= 0.08; }
      if (!paused) {
        const inp = readInput();
        Gm.tick(dt);
        Cb.updatePlayer(dt, inp);
        actions(dt);
        Cb.manage(dt);
        Cb.update(dt);
        G.Acts.autoPick();
        seenT -= dt; if (seenT <= 0) { seenT = 0.4; markSeen(); }
        saveT += dt; if (saveT > 60) { saveT = 0; Gm.save(true); }
        G.Audio.tick(dt);
      }
      G.Render.frame(paused ? 0 : dt);
      UI.frame(dt);
    } else G.Render.frame(dt);
  };
  function markSeen() {
    const P = S.P;
    if (S.map.kind === 'dg') {
      const m = S.map.m; if (!m.seen) m.seen = new Uint8Array(m.N * m.N);
      const r = 7; for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const xx = Math.floor(P.x) + x, yy = Math.floor(P.y) + y; if (xx >= 0 && yy >= 0 && xx < m.N && yy < m.N && x * x + y * y <= r * r) m.seen[yy * m.N + xx] = 1; }
      return;
    }
    const N = S.world.N, r = 11; let ch = false;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const xx = Math.floor(P.x) + x, yy = Math.floor(P.y) + y; if (xx >= 0 && yy >= 0 && xx < N && yy < N && x * x + y * y <= r * r) { const i = yy * N + xx; if (!S.seen[i]) { S.seen[i] = 1; ch = true; } } }
    if (ch) UI.fogDirty();
  }
  // névoa salva em texto curto (corridas de 0 e 1)
  Gm.packSeen = function () { const s = S.seen, out = []; let v = 0, n = 0; for (let i = 0; i < s.length; i++) { if (s[i] === v) n++; else { out.push(n); v = s[i]; n = 1; } } out.push(n); return out.join(','); };
  Gm.unpackSeen = function (str) { const N = S.world.N, s = new Uint8Array(N * N); if (!str) return s; let i = 0, v = 0; for (const p of str.split(',')) { const n = +p; s.fill(v, i, i + n); i += n; v ^= 1; } return s; };
  const save0 = Gm.save;
  Gm.save = function (silent) { if (S.P && S.seen) S.P.seenRLE = Gm.packSeen(); save0(silent); };

  // ---------- entrada ----------
  function bindInput() {
    addEventListener('keydown', (e) => {
      G.Audio.unlock();
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const k = e.key.toLowerCase();
      if (S.mode !== 'play') return;
      if (UI.kind() === 'dlg' && /^[1-9]$/.test(k)) { const b = document.querySelectorAll('.dlg-opts .opt')[+k - 1]; if (b) b.click(); return; }
      if (!keys[k]) onPress(k, e);
      keys[k] = true;
      if (['tab', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    });
    addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
    addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.l = mouse.r = false; });
    const cv = $('#view');
    cv.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
    cv.addEventListener('mousedown', (e) => { G.Audio.unlock(); mouse.x = e.clientX; mouse.y = e.clientY; if (e.button === 0) { mouse.l = true; } if (e.button === 2) { mouse.r = true; power(); } });
    addEventListener('mouseup', (e) => { if (e.button === 0) mouse.l = false; if (e.button === 2) mouse.r = false; });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    // toque
    const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (isTouch) setupTouch();
  }
  function onPress(k, e) {
    if (UI.isOpen() && !['i', 'tab', 'c', 'j', 'm', 'k', 'h'].includes(k)) return;
    if (S.dead) return;
    switch (k) {
      case 'e': G.Acts.use(); break;
      case ' ': { const inp = readInput(); Cb.roll(inp.mx, inp.my); break; }
      case 'q': G.Acts.quickPotion('vida'); break;
      case 'r': G.Acts.quickPotion('mana'); break;
      case 'g': G.Acts.lightFire(); break;
      case '1': case '2': case '3': case '4': castSlot(+k - 1); break;
      case 'i': case 'tab': UI.toggle('inv'); break;
      case 'c': UI.toggle('char'); break;
      case 'k': UI.toggle('magic'); break;
      case 'j': UI.toggle('journal'); break;
      case 'm': UI.toggle('map'); break;
      case 'h': UI.toggle('help'); break;
      case 'escape': if (!UI.isOpen()) UI.openMenu(); break;
      case 'f5': e.preventDefault(); Gm.save(); break;
    }
  }
  function aimPoint() {
    if (touch.on) {
      // mira sozinha: o inimigo mais perto na frente, ou para onde olha
      const P = S.P; let best = null, bd = 9;
      for (const m of S.ents) if (m.kind === 'mon' && !m.dead) { const d = Math.hypot(m.x - P.x, m.y - P.y); if (d < bd) { bd = d; best = m; } }
      if (best) return [best.x, best.y - 0.4 * best.big];
      const dd = [[0, 1], [0, -1], [1, 0], [-1, 0]][P.dir || 0];
      return [P.x + dd[0] * 3, P.y - 0.5 + dd[1] * 3];
    }
    return G.Render.toWorld(mouse.x, mouse.y);
  }
  function castSlot(i) { const sp = S.P.slots[i]; if (!sp) return UI.toast('Atalho ' + (i + 1) + ' vazio. Abra Magias (K).'); const [x, y] = aimPoint(); Cb.cast(sp, x, y); }
  function power() { if (S.mode !== 'play' || UI.isOpen() || S.dead) return; const [x, y] = aimPoint(); Cb.attack(x, y, true); }
  function readInput() {
    let mx = 0, my = 0;
    if (keys.w || keys.arrowup) my -= 1; if (keys.s || keys.arrowdown) my += 1; if (keys.a || keys.arrowleft) mx -= 1; if (keys.d || keys.arrowright) mx += 1;
    if (touch.on && (touch.jx || touch.jy)) { mx = touch.jx; my = touch.jy; }
    const l = Math.hypot(mx, my); if (l > 1) { mx /= l; my /= l; }
    return { mx, my, run: !!keys.shift || (touch.on && Math.hypot(touch.jx, touch.jy) > 0.95) };
  }
  function actions() {
    if (S.dead) return;
    if (mouse.l || touch.atk) { const [x, y] = aimPoint(); Cb.attack(x, y, false); }
  }
  function setupTouch() {
    touch.on = true;
    document.body.classList.add('touch');
    const pad = $('#tpad'), knob = $('#tknob');
    pad.hidden = false; $('#tbtns').hidden = false;
    pad.addEventListener('touchstart', (e) => { G.Audio.unlock(); const t = e.changedTouches[0]; touch.jid = t.identifier; const r = pad.getBoundingClientRect(); touch.ox = r.left + r.width / 2; touch.oy = r.top + r.height / 2; move(t); e.preventDefault(); }, { passive: false });
    pad.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) if (t.identifier === touch.jid) move(t); e.preventDefault(); }, { passive: false });
    const end = (e) => { for (const t of e.changedTouches) if (t.identifier === touch.jid) { touch.jid = null; touch.jx = touch.jy = 0; knob.style.transform = ''; } };
    pad.addEventListener('touchend', end); pad.addEventListener('touchcancel', end);
    // joystick flutuante: qualquer toque na metade esquerda da tela vira o centro do controle
    const cvs = $('#view');
    cvs.addEventListener('touchstart', (e) => {
      G.Audio.unlock();
      for (const t of e.changedTouches) {
        if (touch.jid != null || t.clientX > innerWidth * 0.5) continue;
        touch.jid = t.identifier; touch.ox = t.clientX; touch.oy = t.clientY;
        pad.style.left = (t.clientX - 65) + 'px'; pad.style.top = (t.clientY - 65) + 'px'; pad.style.bottom = 'auto';
        move(t);
      }
      e.preventDefault();
    }, { passive: false });
    cvs.addEventListener('touchmove', (e) => { for (const t of e.changedTouches) if (t.identifier === touch.jid) move(t); e.preventDefault(); }, { passive: false });
    const endC = (e) => { for (const t of e.changedTouches) if (t.identifier === touch.jid) { touch.jid = null; touch.jx = touch.jy = 0; knob.style.transform = ''; pad.style.left = ''; pad.style.top = ''; pad.style.bottom = ''; } };
    cvs.addEventListener('touchend', endC); cvs.addEventListener('touchcancel', endC);
    function move(t) { let dx = (t.clientX - touch.ox) / 50, dy = (t.clientY - touch.oy) / 50; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } touch.jx = dx; touch.jy = dy; knob.style.transform = 'translate(' + dx * 34 + 'px,' + dy * 34 + 'px)'; }
    const btn = (id, down, up) => { const b = $(id); b.addEventListener('touchstart', (e) => { G.Audio.unlock(); e.preventDefault(); down(); }, { passive: false }); if (up) b.addEventListener('touchend', (e) => { e.preventDefault(); up(); }); };
    btn('#t-atk', () => { touch.atk = true; }, () => { touch.atk = false; });
    btn('#t-pow', power);
    btn('#t-roll', () => { const i = readInput(); Cb.roll(i.mx, i.my); });
    btn('#t-use', () => G.Acts.use());
    btn('#t-pot', () => G.Acts.quickPotion('vida'));
    btn('#t-menu', () => (UI.isOpen() ? UI.close() : UI.openMenu()));
    btn('#t-inv', () => UI.toggle('inv'));
    btn('#t-map', () => UI.toggle('map'));
    for (let i = 0; i < 4; i++) btn('#slot' + i, () => castSlot(i));
  }

  // ---------- título ----------
  M.title = function () {
    S.mode = 'title';
    document.body.dataset.mode = 'title';
    $('#hud').hidden = true;
    const t = $('#title'); t.hidden = false; $('#create').hidden = true;
    const list = $('#slots'); list.innerHTML = '';
    for (let s = 1; s <= 3; s++) {
      const info = Gm.saveInfo(s);
      const row = document.createElement('div'); row.className = 'slotrow';
      if (info) {
        row.innerHTML = '<button class="btn gold">Continuar: ' + esc(info.name) + ' · ' + D.RACES[info.race].name + ' nível ' + info.lvl + '</button><button class="btn ghost small" title="Apagar">Apagar</button>';
        row.children[0].onclick = () => { G.Audio.unlock(); loadSlot(s); };
        row.children[1].onclick = () => { if (confirm('Apagar o jogo salvo de ' + info.name + '? Não tem volta (some também da nuvem).')) { Gm.wipe(s); G.Cloud.wipe(s); M.title(); } };
      } else {
        row.innerHTML = '<button class="btn">Novo jogo (espaço ' + s + ')</button>';
        row.children[0].onclick = () => { G.Audio.unlock(); M.create(s); };
      }
      list.appendChild(row);
    }
    G.Audio.title();
    G.Cloud.refreshTitle();
    if (!pulled && G.Cloud.user()) { pulled = true; G.Cloud.pull().then((n) => { if (n > 0) M.title(); }); }
  };
  let pulled = false;
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function ensureWorld() { if (!S.world) { S.world = G.World.generate(Gm.SEED); } if (!S.seen) S.seen = new Uint8Array(S.world.N * S.world.N); }
  function loadSlot(s) {
    ensureWorld();
    const raw = JSON.parse(localStorage.getItem('sina.save.' + s) || 'null');
    if (raw && raw.P) S.seen = Gm.unpackSeen(raw.P.seenRLE);
    if (!Gm.load(s)) return alert('Não deu para abrir este jogo salvo.');
    enterPlay();
    UI.banner('Bem-vindo de volta', S.P.name);
  }
  function enterPlay() {
    $('#title').hidden = true; $('#create').hidden = true; $('#hud').hidden = false;
    document.body.dataset.mode = 'play';
    S.region = null;
    G.Audio.setPlace(S.map.kind === 'dg' ? 'dg' : 'world', S.map.kind === 'dg' ? S.map.m.theme : null);
  }

  // ---------- criação do herói ----------
  const pick = { race: 'humano', origin: 'soldado', sex: 'M', skin: 0, hair: 1, name: '' };
  M.create = function (slot) {
    $('#title').hidden = true; const c = $('#create'); c.hidden = false;
    const races = $('#c-races'); races.innerHTML = '';
    for (const r of D.RACE_ORDER) { const d = D.RACES[r]; const b = document.createElement('button'); b.className = 'card' + (pick.race === r ? ' sel' : ''); b.innerHTML = '<b>' + d.name + '</b><p>' + esc(d.desc) + '</p><small>' + esc(d.dom) + '</small>'; b.onclick = () => { pick.race = r; M.create(slot); }; races.appendChild(b); }
    const ors = $('#c-origins'); ors.innerHTML = '';
    for (const o in D.ORIGINS) { const d = D.ORIGINS[o]; const b = document.createElement('button'); b.className = 'card small' + (pick.origin === o ? ' sel' : ''); b.innerHTML = '<b>' + d.name + '</b><p>' + esc(d.desc) + '</p>'; b.onclick = () => { pick.origin = o; M.create(slot); }; ors.appendChild(b); }
    const look = $('#c-look'); look.innerHTML = '';
    const sexes = document.createElement('div'); sexes.className = 'row';
    for (const [k, n] of [['M', 'Masculino'], ['F', 'Feminino']]) { const b = document.createElement('button'); b.className = 'chip' + (pick.sex === k ? ' sel' : ''); b.textContent = n; b.onclick = () => { pick.sex = k; M.create(slot); }; sexes.appendChild(b); }
    look.appendChild(sexes);
    const skins = document.createElement('div'); skins.className = 'row';
    G.Spr.SKIN[pick.race].forEach((col, i) => { const b = document.createElement('button'); b.className = 'sw' + (pick.skin === i ? ' sel' : ''); b.style.background = col; b.title = 'Pele ' + (i + 1); b.onclick = () => { pick.skin = i; M.create(slot); }; skins.appendChild(b); });
    look.appendChild(skins);
    const hairs = document.createElement('div'); hairs.className = 'row';
    G.Spr.HAIR.forEach((col, i) => { const b = document.createElement('button'); b.className = 'sw' + (pick.hair === i ? ' sel' : ''); b.style.background = col; b.title = 'Cabelo ' + (i + 1); b.onclick = () => { pick.hair = i; M.create(slot); }; hairs.appendChild(b); });
    look.appendChild(hairs);
    // prévia
    const P = { race: pick.race, look: { sex: pick.sex, skin: pick.skin, hair: pick.hair }, equip: {} };
    for (const [base, mat] of D.ORIGINS[pick.origin].kit) { const it = { base, mat, rar: 0 }; const sl = D.WEAPONS[base] ? 'arma' : D.ARMORS[base].slot; P.equip[sl] = it; }
    const sh = G.Spr.personSheet(G.Spr.heroLook(P));
    const pv = $('#c-preview'), x = pv.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, pv.width, pv.height);
    for (let d = 0; d < 4; d++) x.drawImage(sh.img, 0, d * 18, 12, 18, 6 + d * 54, 6, 48, 72);
    const name = $('#c-name'); name.value = pick.name; name.oninput = () => { pick.name = name.value.slice(0, 18); };
    $('#c-start').onclick = () => {
      ensureWorld();
      S.seen = new Uint8Array(S.world.N * S.world.N);
      Gm.newGame({ name: pick.name.trim() || 'Sem-Sina', race: pick.race, origin: pick.origin, sex: pick.sex, skin: pick.skin, hair: pick.hair }, slot);
      enterPlay();
      intro();
    };
    $('#c-back').onclick = () => M.title();
  };
  function intro() {
    const box = document.createElement('div');
    box.className = 'panel-wrap';
    box.innerHTML = '<div class="panel"><header><h2>Aruanã, ano 312 depois da Cauda</h2></header><div class="pbody"><p class="story">Há vinte anos, uma estrela de rabo comprido rachou o céu de Aruanã. Desde então, os mortos não ficam deitados, os bichos do mato enlouqueceram e ninguém dorme sem trancar a porta.</p><p class="story">Você acordou hoje em Vila Alvorada sem lembrar de muita coisa. Só de uma voz: <i>procure a vidente Benta, no templo.</i></p><p class="muted">W A S D anda · mouse ataca · Espaço rola · E interage · H mostra todos os controles. O ponto amarelo no minimapa mostra o objetivo.</p><button class="btn gold">Começar</button></div></div>';
    box.querySelector('button').onclick = () => { box.remove(); UI.banner('Vila Alvorada', 'Campos da Aurora'); };
    $('#ui').appendChild(box);
  }

  // override de load para restaurar a névoa
  addEventListener('DOMContentLoaded', M.start);
})(globalThis.G = globalThis.G || {});
