/* SINA · a interface: tela de título, criação do herói, HUD (vida, mana, vigor, atalhos, missão, minimapa),
   mochila, ficha (atributos, perícias, talentos, magias), diário, mapa com viagem rápida, conversas, lojas,
   forja, alquimia, fogueira, estalagem, quadro de avisos, morte e o final. */
(function (G) {
  'use strict';
  const D = G.D, Gm = G.Game, S = Gm.S, SP = G.Spr;
  const UI = G.UI = {};
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const icoURL = (c) => (c ? c.toDataURL() : '');
  const icache = new Map();
  function ico(it) { const k = it.uid || it.id + (it.spell || ''); if (icache.has(k)) return icache.get(k); const u = icoURL(SP.itemIcon(it)); icache.set(k, u); return u; }
  UI.ico = ico;
  let panel = null, panelKind = null;

  UI.init = function () {
    UI.hud = $('#hud');
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panelKind && panelKind !== 'dead' && panelKind !== 'final') { UI.close(); e.stopPropagation(); } }, true);
  };
  UI.isOpen = () => !!panelKind;
  UI.kind = () => panelKind;

  // ---------- avisos ----------
  UI.toast = function (msg, cls) {
    const box = $('#toasts'); if (!box) return;
    const t = el('div', 'toast ' + (cls || ''), esc(msg));
    box.appendChild(t);
    while (box.children.length > 6) box.firstChild.remove();
    setTimeout(() => t.classList.add('out'), 3800);
    setTimeout(() => t.remove(), 4400);
  };
  UI.banner = function (title, sub) {
    const b = $('#banner'); if (!b || !title) return;
    b.innerHTML = '<div class="b-title">' + esc(title) + '</div>' + (sub ? '<div class="b-sub">' + esc(sub) + '</div>' : '');
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  };
  let boss = null;
  UI.bossBar = function (e) { boss = e; $('#bossbar').hidden = false; $('#boss-name').textContent = e.name || e.def.name; G.Audio.boss(true); };
  let prog = null;
  UI.progress = function (label, dur, cb) { if (prog) return; prog = { t: 0, dur, cb, x: S.P.x, y: S.P.y }; UI.toast(label); };
  UI.progressOn = () => !!prog;
  UI.progressK = () => (prog ? Math.min(1, prog.t / prog.dur) : 0);

  // ---------- HUD ----------
  let hudT = 0;
  UI.frame = function (dt) {
    if (prog) { prog.t += dt; if (Math.hypot(S.P.x - prog.x, S.P.y - prog.y) > 0.4 || S.dead) { prog = null; UI.toast('Interrompido.'); } else if (prog.t >= prog.dur) { const cb = prog.cb; prog = null; cb(); } }
    hudT -= dt; if (hudT > 0) return; hudT = 0.1;
    const P = S.P, st = S.st;
    if (!P || S.mode !== 'play') return;
    bar('#b-hp', P.hp, st.maxHp); bar('#b-mp', P.mp, st.maxMp); bar('#b-st', P.st, st.maxSt);
    $('#b-xp').style.width = (100 * P.xp / Gm.xpNeed(P.lvl)) + '%';
    $('#lvl').textContent = P.lvl;
    $('#gold').textContent = P.gold;
    const pts = P.perkPts + P.attrPts; $('#pts').hidden = !pts; $('#pts').textContent = pts ? '+' + pts : '';
    // atalhos
    for (let i = 0; i < 4; i++) {
      const s = P.slots[i], b = $('#slot' + i), d = s && D.SPELLS[s];
      b.querySelector('.sl-name').textContent = d ? d.name : '';
      b.classList.toggle('empty', !d);
      const cd = d && P.cds && P.cds[s] > 0 ? P.cds[s] / d.cd : 0;
      b.querySelector('.sl-cd').style.height = (cd * 100) + '%';
      b.classList.toggle('nomana', !!d && P.mp < d.mana);
      if (d) b.style.setProperty('--sc', d.color);
    }
    $('#q-count').textContent = (Gm.count('pocao_vida') + Gm.count('pocao_vida2')) || '0';
    $('#r-count').textContent = Gm.count('pocao_mana') || '0';
    // missão
    const qs = D.QUESTS.main.stages[Gm.Q.stage('main')];
    let html = qs ? '<div class="qt-main"><b>A Sina Partida</b><br>' + esc(qs.txt) + '</div>' : '<div class="qt-main"><b>A Sina Partida</b><br>Concluída.</div>';
    const side = Object.keys(P.q).filter((k) => k !== 'main' && P.q[k].s !== 'done').slice(0, 2);
    for (const k of side) { const s2 = D.QUESTS[k].stages[P.q[k].s]; const g = s2.goal; html += '<div class="qt-side"><b>' + esc(D.QUESTS[k].name) + '</b><br>' + esc(s2.txt) + (g.type === 'kill' ? ' (' + Math.min(P.q[k].n, g.n) + '/' + g.n + ')' : g.type === 'item' ? ' (' + Math.min(Gm.count(g.item), g.n) + '/' + g.n + ')' : '') + '</div>'; }
    $('#tracker').innerHTML = html;
    // aviso de interação
    const t = G.Acts.target();
    const pr = $('#prompt');
    if (t && !panelKind) { pr.hidden = false; pr.innerHTML = '<kbd>E</kbd> ' + esc(t.label); } else pr.hidden = true;
    // chefe
    if (boss) { if (boss.dead || !S.ents.includes(boss)) { boss = null; $('#bossbar').hidden = true; G.Audio.boss(false); } else $('#boss-fill').style.width = (100 * Math.max(0, boss.hp) / boss.maxHp) + '%'; }
    // relógio e lugar
    const h = Math.floor(S.time / 60), m = Math.floor(S.time % 60);
    const where = S.map.kind === 'dg' ? D.DUNGEONS[S.map.id].name + ' · andar ' + S.map.floor : (S.cityOn && G.World.cityAt(S.world, P.x, P.y) ? D.CITIES[S.cityOn].name : D.REGIONS[S.region || 'campo'].name);
    $('#clock').textContent = 'Dia ' + S.day + ' · ' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    $('#where').textContent = where;
    $('#buffs').innerHTML = (P.blessing ? '<span class="buff" title="' + esc(D.ALTARS[P.blessing].desc) + '">' + esc(D.ALTARS[P.blessing].name.replace('Altar d', 'Bênção d')) + '</span>' : '') + Object.keys(P.buffs).map((b) => '<span class="buff">' + ({ forca: 'Força', pedra: 'Pedra', antifogo: 'Brasa' }[b] || b) + ' ' + Math.ceil(P.buffs[b]) + 's</span>').join('') + (P.poison ? '<span class="buff bad">Veneno</span>' : '') + (P.burn ? '<span class="buff bad">Queimando</span>' : '') + (P.ward > 0 ? '<span class="buff">Égide ' + Math.round(P.ward) + '</span>' : '');
    UI.minimap();
  };
  function bar(sel, v, max) { const e = $(sel); e.querySelector('i').style.width = (100 * Math.max(0, v) / max) + '%'; e.querySelector('span').textContent = Math.ceil(Math.max(0, v)) + ' / ' + Math.round(max); }

  // minimapa: um pixel por tile, com a névoa
  let mapImg = null;
  UI.mapImage = function () {
    if (mapImg) return mapImg;
    const w = S.world, N = w.N, c = document.createElement('canvas'); c.width = N; c.height = N;
    const x = c.getContext('2d'), img = x.createImageData(N, N);
    const col = { 0: [42, 64, 92], 1: [70, 104, 120], 2: [80, 120, 140], 3: [214, 180, 110], 4: [104, 132, 52], 5: [56, 84, 38], 6: [130, 130, 60], 7: [110, 106, 116], 8: [170, 146, 70], 9: [150, 118, 76], 10: [130, 126, 136], 11: [70, 64, 76], 12: [60, 52, 54], 13: [220, 226, 236], 14: [130, 90, 60], 15: [92, 80, 56], 16: [230, 110, 40], 17: [200, 70, 40], 18: [120, 150, 60] };
    for (let i = 0; i < N * N; i++) { const c2 = w.town[i] ? [190, 170, 130] : col[w.tile[i]] || [0, 0, 0]; img.data[i * 4] = c2[0]; img.data[i * 4 + 1] = c2[1]; img.data[i * 4 + 2] = c2[2]; img.data[i * 4 + 3] = 255; }
    x.putImageData(img, 0, 0);
    return (mapImg = c);
  };
  let fogC = null, fogDirty = true;
  UI.fogDirty = () => { fogDirty = true; };
  function fogCanvas() {
    const N = S.world.N;
    if (!fogC) { fogC = document.createElement('canvas'); fogC.width = N; fogC.height = N; }
    if (fogDirty) {
      fogDirty = false;
      const x = fogC.getContext('2d'), img = x.createImageData(N, N), seen = S.seen;
      for (let i = 0; i < N * N; i++) { img.data[i * 4 + 3] = seen[i] ? 0 : 215; img.data[i * 4] = 14; img.data[i * 4 + 1] = 12; img.data[i * 4 + 2] = 20; }
      x.putImageData(img, 0, 0);
    }
    return fogC;
  }
  UI.minimap = function () {
    const c = $('#minimap'); if (!c) return;
    const x = c.getContext('2d'), P = S.P, W2 = c.width, H2 = c.height;
    x.imageSmoothingEnabled = false;
    x.fillStyle = '#0e0c14'; x.fillRect(0, 0, W2, H2);
    if (S.map.kind === 'dg') {
      const m = S.map.m, k = Math.min(W2, H2) / m.N;
      for (let y = 0; y < m.N; y++) for (let xx = 0; xx < m.N; xx++) { const t = m.tile[y * m.N + xx]; if (t && m.seen && m.seen[y * m.N + xx]) { x.fillStyle = t === 2 ? '#a8482c' : '#5a5466'; x.fillRect(xx * k, y * k, k + 0.5, k + 0.5); } }
      for (const o of m.objs) if (!o.gone && (o.k === 'stairsDown' || o.k === 'stairsUp') && m.seen[o.y * m.N + o.x]) { x.fillStyle = o.k === 'stairsDown' ? '#f2da72' : '#9be7ff'; x.fillRect(o.x * k - 1, o.y * k - 1, 3, 3); }
      for (const e of S.ents) if (!e.dead && e.kind === 'mon' && e.aggro) { x.fillStyle = '#c8423a'; x.fillRect(e.x * k - 1, e.y * k - 1, 2, 2); }
      x.fillStyle = '#ffffff'; x.fillRect(P.x * k - 1.5, P.y * k - 1.5, 3, 3);
      return;
    }
    const R2 = 40, sc = W2 / (R2 * 2);
    x.save(); x.translate(W2 / 2, H2 / 2); x.scale(sc, sc); x.translate(-P.x, -P.y);
    x.drawImage(UI.mapImage(), 0, 0); x.drawImage(fogCanvas(), 0, 0);
    x.restore();
    const at = (wx, wy) => [W2 / 2 + (wx - P.x) * sc, H2 / 2 + (wy - P.y) * sc];
    for (const id in S.world.dungeons) { if (!S.P.found.dungeons[id] && !S.seen[S.world.dungeons[id].y * S.world.N + S.world.dungeons[id].x]) continue; const [a, b] = at(S.world.dungeons[id].x, S.world.dungeons[id].y); x.fillStyle = S.P.dg[id] && S.P.dg[id].cleared ? '#8a858a' : '#c8423a'; x.fillRect(a - 2, b - 2, 4, 4); }
    const tgt = UI.questTarget();
    if (tgt) { let [a, b] = at(tgt[0], tgt[1]); const dx = a - W2 / 2, dy = b - H2 / 2, l = Math.hypot(dx, dy), lim = W2 / 2 - 5; if (l > lim) { a = W2 / 2 + dx / l * lim; b = H2 / 2 + dy / l * lim; } x.fillStyle = '#f2da72'; x.beginPath(); x.arc(a, b, 3.2, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#1f1a24'; x.stroke(); }
    for (const e of S.ents) if (!e.dead && e.kind === 'mon' && Math.hypot(e.x - P.x, e.y - P.y) < R2) { const [a, b] = at(e.x, e.y); x.fillStyle = e.boss || e.def.unique ? '#ff9b3d' : '#c8423a'; x.fillRect(a - 1, b - 1, 2, 2); }
    x.fillStyle = '#ffffff'; x.fillRect(W2 / 2 - 1.5, H2 / 2 - 1.5, 3, 3);
  };
  // onde fica o objetivo da missão principal
  UI.questTarget = function () {
    const P = S.P, s = Gm.Q.stage('main'), st = D.QUESTS.main.stages[s];
    if (!st) return null;
    const g = st.goal;
    if (g.type === 'talk') { const n = D.NPCS[g.npc]; const c = S.world.cities[n.city]; return [c.cx, c.cy]; }
    if (g.type === 'dungeon') { const d = S.world.dungeons[g.id]; return S.map.kind === 'dg' && S.map.id === g.id ? null : [d.x, d.y]; }
    void P;
    return null;
  };
  UI.questMark = function (e) {
    if (!e.npc) return null;
    const P = S.P;
    for (const id in D.QUESTS) {
      const q = D.QUESTS[id], s = P.q[id];
      if (q.giver === e.npc && !s) return '!';
      if (s && s.s !== 'done') { const st = q.stages[s.s]; if (st && st.goal.type === 'talk' && st.goal.npc === e.npc) return '?'; }
    }
    return null;
  };

  // ---------- painéis ----------
  function open(kind, title, body, wide) {
    UI.close(true);
    panelKind = kind;
    panel = el('div', 'panel-wrap');
    const p = el('div', 'panel ' + (wide ? 'wide' : ''));
    p.innerHTML = '<header><h2>' + esc(title) + '</h2><button class="x" aria-label="Fechar">×</button></header><div class="pbody"></div>';
    p.querySelector('.x').onclick = () => UI.close();
    p.querySelector('.pbody').appendChild(body);
    panel.appendChild(p);
    panel.addEventListener('mousedown', (e) => { if (e.target === panel) UI.close(); });
    $('#ui').appendChild(panel);
    G.Audio.sfx('abrir');
    return p;
  }
  UI.panel = open;
  UI.close = function (quiet) {
    if (panel) panel.remove();
    panel = null; const was = panelKind; panelKind = null;
    if (!quiet && was) G.Audio.sfx('fechar');
  };
  UI.toggle = function (kind) { if (panelKind === kind) return UI.close(); ({ inv: UI.openInv, char: UI.openChar, journal: UI.openJournal, map: () => UI.openMap(false), menu: UI.openMenu, help: UI.openHelp, magic: UI.openMagic })[kind](); };

  // ---------- mochila ----------
  let invSel = null;
  UI.openInv = function () {
    const body = el('div', 'inv');
    open('inv', 'Mochila', body, true);
    drawInv(body);
  };
  function drawInv(body) {
    const P = S.P;
    body.innerHTML = '';
    const left = el('div', 'inv-left'), right = el('div', 'inv-right');
    // equipamento
    const eq = el('div', 'equip');
    for (const sl of D.SLOTS) {
      const it = P.equip[sl];
      const c = el('button', 'eslot' + (it ? ' r' + it.rar : ''), it ? '<img src="' + ico(it) + '">' : '<span>' + D.SLOT_NAME[sl] + '</span>');
      c.title = it ? it.name : D.SLOT_NAME[sl];
      c.onclick = () => { invSel = it ? { it, eq: sl } : null; drawInv(body); };
      eq.appendChild(c);
    }
    left.appendChild(el('h3', '', 'Equipado'));
    left.appendChild(eq);
    const s = S.st;
    left.appendChild(el('div', 'mini-stats', 'Dano ' + Math.round(s.wpn.min) + ' a ' + Math.round(s.wpn.max) + (s.wpn.fire ? ' +' + Math.round(s.wpn.fire) + ' fogo' : '') + '<br>Armadura ' + Math.round(s.arm) + ' · Ouro ' + P.gold));
    // ferramentas
    const tl = Object.keys(P.tools);
    left.appendChild(el('h3', '', 'Cinto'));
    left.appendChild(el('div', 'tools', tl.length ? tl.map((t) => '<span class="tool" title="' + esc(D.TOOLS[t].desc) + '"><img src="' + icoURL(SP.icon(t)) + '">' + esc(D.TOOLS[t].name) + '</span>').join('') : '<span class="muted">Nada. Os mercadores vendem picareta, gazuas, vara, tocha e machadinha.</span>'));
    // itens
    right.appendChild(el('h3', '', 'Itens (' + P.inv.length + ' de 48)'));
    const grid = el('div', 'grid');
    P.inv.forEach((it) => {
      const c = el('button', 'cell r' + (it.rar || 0) + (invSel && invSel.it === it ? ' sel' : ''), '<img src="' + ico(it) + '">');
      c.title = it.name;
      c.onclick = () => { invSel = { it }; drawInv(body); };
      c.ondblclick = () => { invSel = { it }; quickUse(it, body); };
      grid.appendChild(c);
    });
    for (let i = P.inv.length; i < 48; i++) grid.appendChild(el('div', 'cell empty'));
    right.appendChild(grid);
    // empilháveis
    right.appendChild(el('h3', '', 'Consumíveis e materiais'));
    const st2 = el('div', 'stacks');
    for (const id of Object.keys(P.stack).sort()) {
      const d = D.STACK[id]; if (!d) continue;
      const c = el('button', 'stk' + (invSel && invSel.stack === id ? ' sel' : ''), '<img src="' + ico({ id }) + '"><span>' + esc(d.name) + '</span><b>' + P.stack[id] + '</b>');
      c.title = d.desc;
      c.onclick = () => { invSel = { stack: id }; drawInv(body); };
      st2.appendChild(c);
    }
    right.appendChild(st2);
    // detalhe (na coluna da esquerda, sempre à vista)
    if (invSel) left.insertBefore(detailBox(invSel, body), left.children[3]);
    body.appendChild(left); body.appendChild(right);
  }
  function quickUse(it, body) {
    if (it.id === 'tomo') { readTome(it); drawInv(body); return; }
    if (Gm.slotOf(it)) { Gm.equip(S.P, it); invSel = null; drawInv(body); }
  }
  function readTome(it) { const P = S.P; const i = P.inv.indexOf(it); if (i >= 0) P.inv.splice(i, 1); Gm.learn(it.spell); invSel = null; }
  UI.itemHTML = function (it, cmp) {
    if (it.id === 'tomo') { const d = D.SPELLS[it.spell]; return '<div class="it-name r1">' + esc(it.name) + '</div><div class="it-sub">Tomo de ' + D.SKILLS[d.school].name.toLowerCase() + '</div><p>' + esc(d.desc) + '</p><p class="muted">Mana ' + d.mana + '</p>'; }
    const b = D.WEAPONS[it.base] || D.ARMORS[it.base], m = D.MATS[it.mat];
    let h = '<div class="it-name r' + it.rar + '">' + esc(it.name) + (it.up ? ' +' + it.up : '') + '</div><div class="it-sub">' + D.RARITY[it.rar].name + ' · ' + (D.WEAPONS[it.base] ? (b.two ? 'duas mãos' : 'uma mão') : D.SLOT_NAME[b.slot] + (b.jewel ? '' : b.heavy ? ', pesada' : ', leve')) + ' · nível ' + it.lvl + '</div>';
    if (D.WEAPONS[it.base]) {
      const mul = m.mult * (1 + (it.up || 0) * 0.1) * D.RARITY[it.rar].mult, a = (it.aff.dano || 0);
      h += '<div class="it-main">Dano ' + Math.round(b.dmg[0] * mul + a) + ' a ' + Math.round(b.dmg[1] * mul + a) + ' · ' + b.spd.toFixed(1) + ' golpes/s' + (b.ranged ? ' · alcance ' + b.reach : '') + '</div>';
    } else if (b.arm) h += '<div class="it-main">Armadura ' + Math.round(b.arm * m.mult * (1 + (it.up || 0) * 0.12) * D.RARITY[it.rar].mult) + '</div>';
    for (const k in it.aff) { if (k === 'dano' && D.WEAPONS[it.base]) continue; if (!D.AFFIX[k] || !it.aff[k]) continue; h += '<div class="aff">' + esc(D.AFFIX[k].name.replace('{v}', it.aff[k])) + '</div>'; }
    if (it.unique) h += '<p class="lore">' + esc(D.UNIQUES[it.unique].lore) + '</p>';
    h += '<div class="it-val">Vale ' + Gm.value(it) + ' de ouro</div>';
    if (cmp && cmp !== it) h += '<div class="cmp"><span class="muted">Equipado agora:</span> ' + esc(cmp.name) + '</div>';
    return h;
  };
  function detailBox(sel, body) {
    const P = S.P, box = el('div', 'detail');
    if (sel.stack) {
      const d = D.STACK[sel.stack];
      box.innerHTML = '<div class="it-name">' + esc(d.name) + ' (' + Gm.count(sel.stack) + ')</div><p>' + esc(d.desc) + '</p><div class="it-val">Vale ' + d.price + ' de ouro cada</div>';
      const acts = el('div', 'acts');
      if (d.use) { const b = el('button', 'btn', 'Usar'); b.onclick = () => { G.Acts.useStack(sel.stack); if (!Gm.count(sel.stack)) invSel = null; drawInv(body); }; acts.appendChild(b); }
      if (!d.quest) { const b = el('button', 'btn ghost', 'Largar 1'); b.onclick = () => { Gm.take(sel.stack, 1); Gm.dropStack(P.x, P.y + 0.6, sel.stack, 1); if (!Gm.count(sel.stack)) invSel = null; drawInv(body); }; acts.appendChild(b); }
      box.appendChild(acts);
      return box;
    }
    const it = sel.it, sl = Gm.slotOf(it);
    box.innerHTML = UI.itemHTML(it, sl ? P.equip[sl] : null);
    const acts = el('div', 'acts');
    if (sel.eq) { const b = el('button', 'btn', 'Tirar'); b.onclick = () => { Gm.unequip(P, sel.eq); invSel = null; drawInv(body); }; acts.appendChild(b); }
    else if (it.id === 'tomo') { const b = el('button', 'btn', 'Ler'); b.onclick = () => { readTome(it); drawInv(body); }; acts.appendChild(b); }
    else if (sl) { const b = el('button', 'btn', 'Equipar'); b.onclick = () => { Gm.equip(P, it); invSel = null; drawInv(body); }; acts.appendChild(b); }
    if (!sel.eq) { const b = el('button', 'btn ghost', 'Largar'); b.onclick = () => { P.inv.splice(P.inv.indexOf(it), 1); Gm.dropItem(P.x, P.y + 0.6, it); invSel = null; drawInv(body); }; acts.appendChild(b); }
    box.appendChild(acts);
    return box;
  }

  // ---------- ficha ----------
  UI.openChar = function () {
    const body = el('div', 'char');
    open('char', 'Personagem', body, true);
    drawChar(body);
  };
  function drawChar(body) {
    const P = S.P, s = S.st, R = D.RACES[P.race];
    body.innerHTML = '';
    const a = el('div', 'char-left');
    const pv = document.createElement('canvas'); pv.width = 72; pv.height = 108; pv.className = 'portrait';
    const pc = pv.getContext('2d'); pc.imageSmoothingEnabled = false; pc.drawImage(G.Render.heroPortrait().img, 0, 0, 12, 18, 0, 0, 72, 108);
    a.appendChild(pv);
    a.appendChild(el('div', 'who', '<b>' + esc(P.name) + '</b><br>' + R.name + ' · ' + D.ORIGINS[P.origin].name + '<br>Nível ' + P.lvl + ' (' + P.xp + ' / ' + Gm.xpNeed(P.lvl) + ')<br><span class="muted">' + esc(R.dom) + '</span>'));
    const tbl = [['Vida', Math.round(s.maxHp)], ['Mana', Math.round(s.maxMp)], ['Vigor', Math.round(s.maxSt)], ['Armadura', Math.round(s.arm)], ['Dano', Math.round(s.wpn.min) + ' a ' + Math.round(s.wpn.max)], ['Crítico', Math.round(s.crit * 100) + '%'], ['Poder mágico', Math.round(s.magic * 100) + '%'], ['Resistências', 'fogo ' + Math.round(s.res.fogo * 100) + '% · gelo ' + Math.round(s.res.gelo * 100) + '% · raio ' + Math.round(s.res.raio * 100) + '%'], ['Mortes', P.deaths]];
    a.appendChild(el('table', 'stats', tbl.map(([k, v]) => '<tr><td>' + k + '</td><td>' + v + '</td></tr>').join('')));
    if (P.attrPts > 0) {
      const box = el('div', 'attr', '<p><b>' + P.attrPts + ' ponto(s) de atributo.</b> Cada um dá +10.</p>');
      for (const [k, n] of [['hp', 'Vida'], ['mp', 'Mana'], ['st', 'Vigor']]) { const b = el('button', 'btn', '+10 ' + n); b.onclick = () => { P.picks[k]++; P.attrPts--; Gm.refresh(); P.hp += k === 'hp' ? 10 : 0; P.mp += k === 'mp' ? 10 : 0; P.st += k === 'st' ? 10 : 0; drawChar(body); }; box.appendChild(b); }
      a.appendChild(box);
    }
    const b = el('div', 'char-right');
    b.appendChild(el('h3', '', 'Perícias e talentos' + (P.perkPts ? ' · <span class="gold">' + P.perkPts + ' ponto(s) de talento</span>' : '')));
    for (const k of D.SKILL_ORDER) {
      const sk = P.skills[k], need = 6 + sk.lv * 1.15;
      const row = el('div', 'skill');
      row.innerHTML = '<div class="sk-head"><b>' + D.SKILLS[k].name + '</b><span>' + sk.lv + (s.aff['sk_' + k] ? ' <em>+' + s.aff['sk_' + k] + '</em>' : '') + '</span></div><div class="sk-bar"><i style="width:' + (100 * sk.xp / need) + '%"></i></div><div class="sk-desc">' + esc(D.SKILLS[k].desc) + '</div>';
      const perks = el('div', 'perks');
      for (const pk in D.PERKS) {
        const pd = D.PERKS[pk]; if (pd.skill !== k) continue;
        const has = P.perks[pk], can = !has && P.perkPts > 0 && sk.lv >= pd.req;
        const pb = el('button', 'perk' + (has ? ' has' : can ? ' can' : ''), '<b>' + esc(pd.name) + '</b><small>' + pd.req + '</small>');
        pb.title = pd.desc + (has ? ' (aprendido)' : ' Precisa de ' + D.SKILLS[k].name + ' ' + pd.req + '.');
        pb.onclick = () => { if (can) { P.perks[pk] = 1; P.perkPts--; Gm.refresh(); G.Audio.sfx('nivel'); drawChar(body); } else UI.toast(pb.title); };
        perks.appendChild(pb);
      }
      row.appendChild(perks);
      b.appendChild(row);
    }
    body.appendChild(a); body.appendChild(b);
  }
  // ---------- magias ----------
  UI.openMagic = function () {
    const body = el('div', 'magic');
    open('magic', 'Magias', body);
    const draw = () => {
      const P = S.P; body.innerHTML = '';
      body.appendChild(el('p', 'muted', 'Clique numa magia e depois num atalho (1 a 4) para trocar. Tomos se compram com magos e aparecem em baús.'));
      const slots = el('div', 'mslots');
      P.slots.forEach((s, i) => { const b = el('button', 'mslot', '<kbd>' + (i + 1) + '</kbd> ' + (s ? esc(D.SPELLS[s].name) : '<span class="muted">vazio</span>')); b.onclick = () => { if (UI._pick) { const j = P.slots.indexOf(UI._pick); if (j >= 0) P.slots[j] = P.slots[i]; P.slots[i] = UI._pick; UI._pick = null; draw(); } }; slots.appendChild(b); });
      body.appendChild(slots);
      const list = el('div', 'mlist');
      if (!P.spells.length) list.appendChild(el('p', 'muted', 'Você ainda não sabe nenhum feitiço.'));
      for (const sp of P.spells) { const d = D.SPELLS[sp]; const b = el('button', 'mspell' + (UI._pick === sp ? ' sel' : ''), '<b style="color:' + d.color + '">' + esc(d.name) + '</b> <small>' + D.SKILLS[d.school].name + ' · mana ' + d.mana + '</small><br><span>' + esc(d.desc) + '</span>'); b.onclick = () => { UI._pick = sp; draw(); }; list.appendChild(b); }
      body.appendChild(list);
    };
    draw();
  };

  // ---------- diário ----------
  UI.openJournal = function () {
    const P = S.P, body = el('div', 'journal');
    const act = [], done = [];
    for (const id in P.q) { const q = D.QUESTS[id]; if (!q) continue; (P.q[id].s === 'done' ? done : act).push(id); }
    act.sort((a) => (a === 'main' ? -1 : 1));
    let h = '<h3>Em andamento</h3>';
    for (const id of act) { const q = D.QUESTS[id], st = q.stages[P.q[id].s]; h += '<div class="jq' + (q.main ? ' main' : '') + '"><b>' + esc(q.name) + '</b><p>' + esc(st.txt) + '</p></div>'; }
    if (P.minis.length) { h += '<h3>Avisos aceitos</h3>'; for (const m of P.minis) h += '<div class="jq"><b>' + esc(m.title) + '</b><p>' + esc(G.Minis.progress(m)) + ' · ' + m.gold + ' de ouro</p></div>'; }
    if (done.length) { h += '<h3>Concluídas</h3>'; for (const id of done) h += '<div class="jq done"><b>' + esc(D.QUESTS[id].name) + '</b></div>'; }
    h += '<h3>Descobertas</h3><p class="muted">' + Object.keys(P.found.cities).length + ' de 7 cidades · ' + Object.keys(P.found.dungeons).length + ' de 12 masmorras · ' + Object.keys(P.found.altars).length + ' de 7 altares · ' + Object.values(P.dg).filter((d) => d.cleared).length + ' masmorras limpas</p>';
    body.innerHTML = h;
    open('journal', 'Diário', body);
  };

  // ---------- mapa ----------
  UI.openMap = function (travel) {
    const body = el('div', 'map');
    const c = document.createElement('canvas'), N = S.world.N; c.width = N * 2; c.height = N * 2; c.className = 'bigmap';
    body.appendChild(c);
    const info = el('p', 'muted', travel ? 'Clique numa cidade que você já visitou para viajar até o Marco da Sina dela.' : 'Clique numa cidade visitada para viajar (fora de combate). Amarelo: o objetivo da missão.');
    body.appendChild(info);
    open('map', 'Aruanã', body, true);
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    const P = S.P;
    x.drawImage(UI.mapImage(), 0, 0, N * 2, N * 2); x.drawImage(fogCanvas(), 0, 0, N * 2, N * 2);
    x.font = '22px "Pixelify Sans", monospace'; x.textAlign = 'center';
    const spots = [];
    for (const id in S.world.cities) {
      const cc = S.world.cities[id], known = P.found.cities[id], seen = S.seen[cc.cy * N + cc.cx];
      if (!known && !seen) continue;
      x.fillStyle = known ? '#f2da72' : '#938a8c'; x.fillRect(cc.cx * 2 - 7, cc.cy * 2 - 7, 14, 14); x.strokeStyle = '#1f1a24'; x.strokeRect(cc.cx * 2 - 7, cc.cy * 2 - 7, 14, 14);
      x.fillStyle = '#1f1a24'; x.fillText(D.CITIES[id].name, cc.cx * 2 + 2, cc.cy * 2 - 12); x.fillStyle = '#e2cfa4'; x.fillText(D.CITIES[id].name, cc.cx * 2, cc.cy * 2 - 14);
      if (known) spots.push([cc.cx * 2, cc.cy * 2, id]);
    }
    for (const id in S.world.dungeons) { const d = S.world.dungeons[id]; if (!P.found.dungeons[id] && !S.seen[d.y * N + d.x]) continue; x.fillStyle = P.dg[id] && P.dg[id].cleared ? '#8a858a' : '#c8423a'; x.beginPath(); x.arc(d.x * 2, d.y * 2, 4, 0, 7); x.fill(); x.font = '15px "Pixelify Sans"'; x.fillStyle = '#1f1a24'; x.fillText(D.DUNGEONS[id].name, d.x * 2 + 1, d.y * 2 + 21); x.fillStyle = '#cdc6bb'; x.fillText(D.DUNGEONS[id].name, d.x * 2, d.y * 2 + 20); }
    for (const id in S.world.altars) { if (!P.found.altars[id]) continue; const a = S.world.altars[id]; x.fillStyle = '#9be7ff'; x.fillRect(a.x * 2 - 3, a.y * 2 - 3, 6, 6); }
    const tg = UI.questTarget(); if (tg) { x.strokeStyle = '#f2da72'; x.lineWidth = 2; x.beginPath(); x.arc(tg[0] * 2, tg[1] * 2, 9, 0, 7); x.stroke(); }
    const px = S.map.kind === 'world' ? P.x : S.world.dungeons[S.map.id].x, py = S.map.kind === 'world' ? P.y : S.world.dungeons[S.map.id].y;
    x.fillStyle = '#ffffff'; x.beginPath(); x.arc(px * 2, py * 2, 4, 0, 7); x.fill(); x.strokeStyle = '#1f1a24'; x.lineWidth = 1; x.stroke();
    c.onclick = (ev) => {
      const r = c.getBoundingClientRect(), mx = (ev.clientX - r.left) / r.width * c.width, my = (ev.clientY - r.top) / r.height * c.height;
      const hit = spots.find(([sx, sy]) => Math.hypot(sx - mx, sy - my) < 14);
      if (!hit) return;
      if (S.map.kind !== 'world') return UI.toast('Saia da masmorra antes de viajar.');
      if (!travel && S.ents.some((e) => e.kind === 'mon' && e.aggro && !e.dead)) return UI.toast('Não dá para viajar com inimigos por perto.');
      const cc = S.world.cities[hit[2]];
      UI.close();
      const dist = Math.hypot(cc.cx - P.x, cc.cy - P.y);
      S.time += Math.round(dist * 2); if (S.time >= 1440) { S.day += Math.floor(S.time / 1440); S.time %= 1440; }
      Gm.enterWorld(cc.cx + 0.5, cc.cy + 1.6);
      P.lastMarco = hit[2];
      UI.banner(D.CITIES[hit[2]].name, 'Viagem rápida');
    };
  };

  // ---------- conversa ----------
  UI.dialog = function (e, tree) {
    const body = el('div', 'dlg');
    const pv = document.createElement('canvas'); pv.width = 48; pv.height = 72; pv.className = 'dlg-face';
    const sh = e.npc || e.look ? SP.personSheet(e.look) : null;
    if (sh) { const x = pv.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(sh.img, 0, 0, 12, 18, 0, 0, 48, 72); }
    open('dlg', e.name, body);
    const show = (node) => {
      body.innerHTML = '';
      const top = el('div', 'dlg-top'); top.appendChild(pv); top.appendChild(el('p', 'dlg-text', esc(node.t))); body.appendChild(top);
      const opts = el('div', 'dlg-opts');
      (node.o || [{ t: 'Até mais.' }]).forEach((o, i) => {
        if (o.if && !o.if()) return;
        const b = el('button', 'opt', '<kbd>' + (i + 1) + '</kbd> ' + esc(o.t));
        b.onclick = () => {
          G.Audio.sfx('clique');
          if (o.go) return show(tree[o.go]);
          UI.close(true);
          if (o.do) o.do();
          Gm.checkQuests();
        };
        opts.appendChild(b);
      });
      body.appendChild(opts);
    };
    show(tree.start);
  };

  // ---------- loja ----------
  const ROLE_STOCK = { ferreiro: 'equip', mercador: 'geral', alquimista: 'pocoes', mago: 'tomos', estalagem: 'comida' };
  function cityLvl() { const c = S.cityOn ? D.CITIES[S.cityOn] : null; return c ? D.REGIONS[c.region].lvl[1] + 1 : S.P.lvl; }
  function stockFor(e) {
    const key = (e.npc || e.name) + ':' + S.day;
    if (S.shops[key]) return S.shops[key];
    const role = e.role, lvl = Math.max(cityLvl(), Math.min(S.P.lvl, cityLvl() + 3)), out = { items: [], stacks: {}, tools: [] };
    const kind = ROLE_STOCK[role] || 'geral';
    if (kind === 'equip') { for (let i = 0; i < 10; i++) out.items.push(Gm.loot(lvl, 0.5)); out.stacks.lingote = 6; out.stacks.min_ferro = 4; }
    if (kind === 'geral') { for (let i = 0; i < 5; i++) out.items.push(Gm.loot(lvl, 0)); out.tools = Object.keys(D.TOOLS); Object.assign(out.stacks, { pocao_vida: 4, pao: 8, pocao_vigor: 3 }); }
    if (kind === 'pocoes') { Object.assign(out.stacks, { pocao_vida: 8, pocao_vida2: lvl > 6 ? 4 : 1, pocao_mana: 8, pocao_vigor: 5, pocao_forca: 2, pocao_pedra: 2, pocao_fogo: 2, guaco: 5, cogumelo: 4, mandacaru: 3 }); }
    if (kind === 'tomos') {
      const can = D.SPELL_ORDER.filter((s) => D.SPELLS[s].price && S.P.spells.indexOf(s) < 0 && D.SPELLS[s].price < 120 + lvl * 40);
      for (const s of can) out.items.push({ uid: Gm.uid(), id: 'tomo', spell: s, name: 'Tomo: ' + D.SPELLS[s].name, rar: 1 });
      out.items.push(Gm.makeItem('cajado', D.MAT_BY_TIER[Math.min(6, 1 + Math.floor(lvl / 4))], 1, lvl));
      Object.assign(out.stacks, { pocao_mana: 6 });
    }
    if (kind === 'comida') Object.assign(out.stacks, { pao: 10, carne_assada: 5, peixe_assado: 5 });
    return (S.shops[key] = out);
  }
  const buyMul = () => (1.45 - Math.min(0.35, S.P.skills.labia.lv * 0.003)) * (S.P.perks.pechincha ? 0.85 : 1);
  const sellMul = () => (0.28 + Math.min(0.2, S.P.skills.labia.lv * 0.002)) * (S.P.perks.mercador ? 1.25 : 1);
  UI.openShop = function (e) {
    if (!e) return;
    const body = el('div', 'shop');
    open('shop', e.name, body, true);
    const draw = () => {
      const P = S.P, st = stockFor(e); body.innerHTML = '';
      const L = el('div', 'shop-col'), Rr = el('div', 'shop-col');
      L.appendChild(el('h3', '', 'Comprar · você tem <span class="gold">' + P.gold + '</span> de ouro'));
      const bl = el('div', 'slist');
      const line = (img, name, price, cls, onclick, title) => { const b = el('button', 'sl ' + (cls || ''), '<img src="' + img + '"><span>' + esc(name) + '</span><b>' + price + '</b>'); b.onclick = onclick; if (title) b.title = title; return b; };
      for (const t of st.tools) { if (P.tools[t]) continue; const pr = Math.round(D.TOOLS[t].price * buyMul()); bl.appendChild(line(icoURL(SP.icon(t)), D.TOOLS[t].name, pr, '', () => { if (P.gold < pr) return UI.toast('Ouro insuficiente.'); P.gold -= pr; P.tools[t] = 1; G.Audio.sfx('moeda'); draw(); }, D.TOOLS[t].desc)); }
      for (const id in st.stacks) { if (!st.stacks[id]) continue; const d = D.STACK[id], pr = Math.round(d.price * buyMul()); bl.appendChild(line(ico({ id }), d.name + ' (' + st.stacks[id] + ')', pr, '', () => { if (P.gold < pr) return UI.toast('Ouro insuficiente.'); P.gold -= pr; st.stacks[id]--; Gm.give(id, 1, true); G.Audio.sfx('moeda'); draw(); }, d.desc)); }
      for (const it of st.items) { const pr = Math.round(Gm.value(it) * buyMul()); const b = line(ico(it), it.name, pr, 'r' + it.rar, () => { if (P.gold < pr) return UI.toast('Ouro insuficiente.'); if (P.inv.length >= 48) return UI.toast('Mochila cheia.'); P.gold -= pr; st.items.splice(st.items.indexOf(it), 1); P.inv.push(it); G.Audio.sfx('moeda'); draw(); }); b.onmouseenter = () => tip(it); bl.appendChild(b); }
      L.appendChild(bl);
      Rr.appendChild(el('h3', '', 'Vender'));
      const sl = el('div', 'slist');
      for (const it of P.inv) { const pr = Math.max(1, Math.round(Gm.value(it) * sellMul())); const b = line(ico(it), it.name, pr, 'r' + (it.rar || 0), () => { P.inv.splice(P.inv.indexOf(it), 1); P.gold += pr; st.items.push(it); G.Audio.sfx('moeda'); draw(); }); b.onmouseenter = () => tip(it); sl.appendChild(b); }
      for (const id of Object.keys(P.stack)) { const d = D.STACK[id]; if (!d || d.quest) continue; const pr = Math.max(1, Math.round(d.price * sellMul())); sl.appendChild(line(ico({ id }), d.name + ' (' + P.stack[id] + ')', pr, '', () => { Gm.take(id, 1); P.gold += pr; G.Audio.sfx('moeda'); draw(); })); }
      Rr.appendChild(sl);
      const tipBox = el('div', 'detail tipbox', '<span class="muted">Passe o mouse num item para ver os detalhes.</span>');
      const tip = (it) => { const slx = Gm.slotOf(it); tipBox.innerHTML = UI.itemHTML(it, slx ? P.equip[slx] : null); };
      body.appendChild(L); body.appendChild(Rr); body.appendChild(tipBox);
    };
    draw();
  };

  // ---------- forja ----------
  UI.openForge = function () {
    const body = el('div', 'forge');
    open('forge', 'Forja', body, true);
    const draw = () => {
      const P = S.P; body.innerHTML = '';
      const maxUp = P.perks.mestre_forja ? 7 : 5;
      body.appendChild(el('p', 'muted', 'Aprimore armas e armaduras com lingotes e ouro. A perícia Forja sobe a cada trabalho. Máximo +' + maxUp + '.'));
      const smelt = el('div', 'acts');
      for (const r of D.SMELT) { const [inp, n] = Object.entries(r.in)[0]; const b = el('button', 'btn', 'Fundir ' + D.STACK[inp].name.toLowerCase() + ' (' + Gm.count(inp) + ')'); b.disabled = Gm.count(inp) < n; b.onclick = () => { const k = Math.floor(Gm.count(inp) / n); Gm.take(inp, k * n); Gm.give(r.out, k); Gm.skillXp('forja', k * 2); G.Audio.sfx('forja'); draw(); }; smelt.appendChild(b); }
      if (P.perks.estelar) { const b = el('button', 'btn gold', 'Forjar arma estelar (5 cinzas, 3 lingotes de ouro)'); b.disabled = Gm.count('cinza') < 5 || Gm.count('lingote_o') < 3; b.onclick = () => { Gm.take('cinza', 5); Gm.take('lingote_o', 3); const it = Gm.makeItem(Gm.pick(Object.keys(D.WEAPONS)), 'estelar', 2, Math.max(18, P.lvl)); Gm.addItem(it); Gm.skillXp('forja', 30); G.Audio.sfx('forja'); draw(); }; smelt.appendChild(b); }
      body.appendChild(smelt);
      const list = el('div', 'slist');
      const items = D.SLOTS.map((s) => P.equip[s]).filter(Boolean).concat(P.inv.filter((it) => it.base && !D.ARMORS[it.base]?.jewel));
      for (const it of items) {
        const tier = D.MATS[it.mat].tier || 1, up = it.up || 0;
        const ing = tier <= 2 ? 'lingote' : tier <= 4 ? 'lingote_p' : 'lingote_o';
        const n = Math.max(1, Math.ceil((up + 1) * (P.perks.aco ? 0.5 : 1)));
        const gold = Math.round((20 + 15 * tier) * (up + 1) * (Gm.Q.stage('musgo') === 'done' ? 0.8 : 1));
        const can = up < maxUp && Gm.count(ing) >= n && P.gold >= gold;
        const b = el('button', 'sl r' + it.rar, '<img src="' + ico(it) + '"><span>' + esc(it.name) + (up ? ' +' + up : '') + '</span><b>' + (up >= maxUp ? 'máximo' : n + ' ' + D.STACK[ing].name.toLowerCase() + ' + ' + gold) + '</b>');
        b.disabled = !can;
        b.onclick = () => { Gm.take(ing, n); P.gold -= gold; it.up = up + 1; Gm.skillXp('forja', 6 + tier * 3); Gm.refresh(); G.Audio.sfx('forja'); UI.toast(it.name + ' agora é +' + it.up + '.'); draw(); };
        list.appendChild(b);
      }
      body.appendChild(list);
    };
    draw();
  };
  // ---------- alquimia ----------
  UI.openAlchemy = function () {
    const body = el('div', 'alch');
    open('alch', 'Bancada de alquimia', body);
    const draw = () => {
      const P = S.P; body.innerHTML = '';
      body.appendChild(el('p', 'muted', 'Junte ervas para fazer poções. Sua Alquimia (' + P.skills.alquimia.lv + ') deixa cada poção mais forte.'));
      for (const r of D.RECIPES) {
        const ok = Object.entries(r.in).every(([k, n]) => Gm.count(k) >= n) && P.skills.alquimia.lv >= r.skill;
        const need = Object.entries(r.in).map(([k, n]) => n + ' ' + D.STACK[k].name.toLowerCase() + ' (' + Gm.count(k) + ')').join(' + ');
        const b = el('button', 'sl', '<img src="' + ico({ id: r.out }) + '"><span><b>' + esc(D.STACK[r.out].name) + '</b><br><small>' + esc(need) + (r.skill ? ' · Alquimia ' + r.skill : '') + '</small></span>');
        b.disabled = !ok;
        b.onclick = () => { for (const [k, n] of Object.entries(r.in)) Gm.take(k, n); const dbl = P.perks.dose_dupla && Math.random() < 0.3; Gm.give(r.out, dbl ? 2 : 1); Gm.skillXp('alquimia', 6 + r.skill * 0.3); G.Audio.sfx('beber'); draw(); };
        body.appendChild(b);
      }
    };
    draw();
  };
  // ---------- fogueira, estalagem ----------
  UI.openCamp = function () {
    const body = el('div', 'camp');
    body.appendChild(el('p', '', 'O fogo estala. Dá para assar o que pescou ou caçou, e descansar um pouco.'));
    const acts = el('div', 'acts');
    const cook = el('button', 'btn', 'Assar tudo'); cook.onclick = () => G.Acts.cook();
    const rest = el('button', 'btn', 'Descansar 2 horas'); rest.onclick = () => { if (S.ents.some((e) => e.kind === 'mon' && e.aggro && !e.dead)) return UI.toast('Não dá para descansar com inimigos por perto.'); S.time += 120; if (S.time >= 1440) { S.time -= 1440; S.day++; } const P = S.P; P.hp = S.st.maxHp; P.mp = S.st.maxMp; P.st = S.st.maxSt; Gm.save(); UI.close(); UI.toast('Descansou.'); };
    acts.appendChild(cook); acts.appendChild(rest); body.appendChild(acts);
    open('camp', 'Fogueira', body);
  };
  UI.inn = function () {
    const P = S.P;
    if (P.gold < 10) return UI.toast('Um quarto custa 10 de ouro.');
    P.gold -= 10;
    if (S.time > 8 * 60) S.day++;
    S.time = 8 * 60;
    P.hp = S.st.maxHp; P.mp = S.st.maxMp; P.st = S.st.maxSt;
    Gm.save();
    UI.banner('Bom dia', 'Dia ' + S.day);
  };
  // ---------- quadro de avisos ----------
  UI.openBoard = function (cid) {
    const body = el('div', 'board');
    open('board', 'Quadro de avisos · ' + D.CITIES[cid].name, body);
    const draw = () => {
      const P = S.P; body.innerHTML = '';
      const claim = el('button', 'btn gold', 'Entregar avisos cumpridos'); claim.onclick = () => { if (!G.Minis.claim(cid)) UI.toast('Nenhum aviso cumprido para entregar aqui.'); draw(); };
      body.appendChild(claim);
      body.appendChild(el('h3', '', 'Avisos de hoje'));
      for (const m of G.Minis.board(cid)) {
        const taken = P.minis.some((x) => x.id === m.id);
        const b = el('button', 'sl' + (taken ? ' taken' : ''), '<span><b>' + esc(m.title) + '</b><br><small>' + m.gold + ' de ouro · ' + m.xp + ' de experiência</small></span><b>' + (taken ? 'aceito' : 'aceitar') + '</b>');
        b.disabled = taken; b.onclick = () => { G.Minis.accept(m); draw(); };
        body.appendChild(b);
      }
      if (P.minis.length) { body.appendChild(el('h3', '', 'Seus avisos (' + P.minis.length + ' de 3)')); for (const m of P.minis) body.appendChild(el('div', 'jq', '<b>' + esc(m.title) + '</b><p>' + esc(G.Minis.progress(m)) + '</p>')); }
    };
    draw();
  };

  // ---------- menu, ajuda ----------
  UI.openMenu = function () {
    const body = el('div', 'menu');
    const mk = (t, f, cls) => { const b = el('button', 'btn ' + (cls || ''), t); b.onclick = f; body.appendChild(b); };
    mk('Voltar ao jogo', () => UI.close());
    mk('Salvar', () => { Gm.save(); UI.close(); });
    mk('Mochila (I)', () => UI.openInv()); mk('Personagem (C)', () => UI.openChar()); mk('Magias (K)', () => UI.openMagic()); mk('Diário (J)', () => UI.openJournal()); mk('Mapa (M)', () => UI.openMap(false));
    mk('Controles (H)', () => UI.openHelp());
    const vol = el('div', 'vol');
    for (const [k, n] of [['music', 'Música'], ['amb', 'Ambiente'], ['sfx', 'Efeitos']]) {
      const r = el('label', '', n + ' <input type="range" min="0" max="100" value="' + Math.round(G.Audio.get(k) * 100) + '">');
      r.querySelector('input').oninput = (e) => G.Audio.set(k, e.target.value / 100);
      vol.appendChild(r);
    }
    body.appendChild(vol);
    mk('Salvar e sair para o título', () => { Gm.save(); UI.close(); G.Main.title(); }, 'ghost');
    open('menu', 'Pausa', body);
  };
  UI.openHelp = function () {
    const body = el('div', 'help', '<table class="keys">' + [
      ['W A S D ou setas', 'Andar'], ['Shift', 'Correr (gasta vigor)'], ['Botão esquerdo', 'Atacar na direção do mouse (segure para continuar)'], ['Botão direito', 'Ataque forte (gasta 20 de vigor)'],
      ['Espaço', 'Rolar e desviar'], ['1, 2, 3, 4', 'Lançar magia na direção do mouse'], ['Q', 'Poção de vida (ou comida)'], ['R', 'Poção de mana'], ['E', 'Falar, abrir, colher, entrar'],
      ['G', 'Acender fogueira (precisa de machadinha)'], ['I ou Tab', 'Mochila'], ['C', 'Personagem e talentos'], ['K', 'Magias'], ['J', 'Diário'], ['M', 'Mapa e viagem rápida'], ['Esc', 'Pausa e salvar'],
    ].map(([k, v]) => '<tr><td><kbd>' + k + '</kbd></td><td>' + v + '</td></tr>').join('') + '</table><p class="muted">No celular: o controle da esquerda anda; os botões da direita atacam, rolam, interagem e lançam magias. A mira vai sozinha no inimigo mais perto.</p>');
    open('help', 'Controles', body);
  };

  // ---------- morte e final ----------
  UI.deathScreen = function () {
    const body = el('div', 'death', '<p class="story">A luz some. Mas quem não tem Sina não tem hora marcada para morrer.</p>');
    const b = el('button', 'btn gold', 'Acordar no Marco da Sina'); b.onclick = () => { UI.close(true); G.Combat.respawn(); };
    body.appendChild(b);
    open('dead', 'Você caiu', body);
    panel.querySelector('.x').remove();
  };
  UI.finale = function () {
    if (S.P.ending) return UI.toast('A escolha já foi feita.');
    const body = el('div', 'final', '<p class="story">Cinco cacos de estrela pulsam no altar. O quinto ainda está quente do fogo do Boitatá. Aqui, no coração da Cauda, a Sina pode ser costurada de volta. Ou deixada partida para sempre.</p>');
    for (const k of ['reescrever', 'libertar']) {
      const b = el('button', 'btn ' + (k === 'reescrever' ? 'gold' : ''), k === 'reescrever' ? 'Reescrever a Sina' : 'Deixar a Sina livre');
      b.onclick = () => {
        const P = S.P; P.ending = k; Gm.Q.finish('main'); Gm.take('fragmento', 99); Gm.gainXp(2000); Gm.addGold(1000, true);
        G.Audio.sfx('nivel');
        body.innerHTML = '<h3>' + esc(D.ENDINGS[k].name) + '</h3><p class="story">' + esc(D.ENDINGS[k].txt) + '</p><p class="muted">Fim da história principal. Aruanã continua aberta: missões, masmorras e avisos esperam por você.</p>';
        const c = el('button', 'btn', 'Continuar jogando'); c.onclick = () => { UI.close(true); Gm.save(); const m = S.map.m; if (m) for (const o of m.objs) if (o.k === 'altarSina') G.Dungeon.removeObj(m, o); };
        body.appendChild(c);
        Gm.save();
      };
      body.appendChild(b);
    }
    open('final', 'O Altar da Sina', body);
    panel.querySelector('.x').remove();
  };
})(globalThis.G = globalThis.G || {});
