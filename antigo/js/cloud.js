/* SINA · a nuvem: conta (entrar, criar, sair), os 3 espaços salvos na planilha do Apps Script e o ranking.
   Sem servidor configurado, nada disso aparece e o jogo segue só no navegador. */
(function (G) {
  'use strict';
  const D = G.D, Gm = G.Game, S = Gm.S, Net = G.Net;
  const Cl = G.Cloud = {};
  const KEY = 'sina.save.';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  Cl.on = () => Net.enabled();
  Cl.user = () => { const s = Net.session(); return s && s.token ? s : null; };

  // o resumo que vai para o ranking
  function resumo(P) {
    const done = Object.keys(P.q).filter((k) => k !== 'main' && P.q[k].s === 'done').length;
    const st = P.q.main ? P.q.main.s : 1;
    return { heroi: P.name, povo: P.race, nivel: P.lvl, missoes: done, masmorras: Object.values(P.dg).filter((d) => d.cleared).length, etapa: st === 'done' ? 19 : st, horas: Math.floor((P.played || 0) / 3600), final: P.ending || '' };
  }
  // envia o espaço atual (no máximo a cada 45 s, menos quando é pedido na mão)
  let lastUp = 0, busy = false, again = false;
  Cl.push = async function (force) {
    const u = Cl.user(); if (!u || !Cl.on()) return;
    if (busy) { if (force) again = true; return; }
    if (!force && Date.now() - lastUp < 45000) return;
    let raw; try { raw = localStorage.getItem(KEY + Gm.slot); } catch (e) { return; }
    if (!raw) return;
    busy = true; lastUp = Date.now();
    const r = await Net.call('salvar', { token: u.token, espaco: Gm.slot, dados: raw, resumo: resumo(JSON.parse(raw).P) });
    busy = false;
    if (again) { again = false; return Cl.push(true); }
    if (!r.ok && r.sessao === false) G.UI.toast('A sessão da nuvem expirou. Entre de novo na tela de título.');
    else if (!r.ok && force) G.UI.toast('Nuvem: ' + r.erro);
    else if (r.ok && force) G.UI.toast('Salvo também na nuvem.');
  };
  // depois de salvar no navegador, manda para a nuvem
  const save0 = Gm.save;
  Gm.save = function (silent) { save0(silent); if (S.P && !S.dead) Cl.push(!silent); };
  addEventListener('pagehide', () => {
    const u = Cl.user(); if (!u || S.mode !== 'play') return;
    try { const raw = localStorage.getItem(KEY + Gm.slot); if (raw) Net.beacon('salvar', { token: u.token, espaco: Gm.slot, dados: raw, resumo: resumo(JSON.parse(raw).P) }); } catch (e) { /* nada */ }
  });
  // baixa os espaços da nuvem que forem mais novos que os do navegador
  Cl.pull = async function () {
    const u = Cl.user(); if (!u) return 0;
    const r = await Net.call('carregar', { token: u.token }, 45000);
    if (!r.ok) { if (r.sessao === false) Cl.refreshTitle(); return -1; }
    let n = 0;
    for (const k in r.espacos) {
      let local = null; try { local = JSON.parse(localStorage.getItem(KEY + k) || 'null'); } catch (e) { local = null; }
      const remote = JSON.parse(r.espacos[k].dados);
      if (remote.jogo === 'aruana') continue; // é do novo SINA, em /parte1/
      if (!local || (remote.at || 0) > (local.at || 0)) { try { localStorage.setItem(KEY + k, r.espacos[k].dados); n++; } catch (e) { /* cheio */ } }
    }
    return n;
  };
  Cl.wipe = function (slot) { const u = Cl.user(); if (u) Net.call('apagar', { token: u.token, espaco: slot }); };

  // ---------- na tela de título ----------
  Cl.refreshTitle = function () {
    const box = document.getElementById('acct'); if (!box) return;
    box.innerHTML = '';
    if (!Cl.on()) return;
    const u = Cl.user();
    const btn = (t, f, cls) => { const b = el('button', 'btn small ' + (cls || ''), t); b.onclick = f; box.appendChild(b); };
    if (u) {
      box.appendChild(el('span', 'acct-line', 'Nuvem: <b>' + esc(u.usuario.nome) + '</b>'));
      btn('Sincronizar', sync); btn('Ranking', Cl.openRanking); btn('Sair da conta', async () => { await Net.call('sair', { token: u.token }); Net.setSession(null); Cl.refreshTitle(); }, 'ghost');
    } else {
      btn('Entrar', () => form('entrar')); btn('Criar conta', () => form('cadastrar')); btn('Ranking', Cl.openRanking, 'ghost');
      box.appendChild(el('span', 'acct-line muted', 'Com conta, o jogo vai junto para qualquer aparelho.'));
    }
    Net.warm();
  };
  async function sync() {
    G.UI.toast('Buscando na nuvem...');
    const n = await Cl.pull();
    if (n < 0) return G.UI.toast('Não deu para falar com a nuvem agora.');
    G.UI.toast(n ? n + ' jogo(s) atualizado(s) da nuvem.' : 'Tudo em dia com a nuvem.');
    G.Main.title();
  }
  Cl.sync = sync;
  function form(kind) {
    const body = el('form', 'acct-form');
    body.innerHTML = (kind === 'cadastrar' ? '<label class="field">Nome no ranking<input name="nome" maxlength="24" required autocomplete="nickname"></label>' : '') +
      '<label class="field">E-mail<input name="email" type="email" required autocomplete="email"></label>' +
      '<label class="field">Senha<input name="senha" type="password" minlength="6" required autocomplete="' + (kind === 'cadastrar' ? 'new-password' : 'current-password') + '"></label>' +
      '<p class="msg muted">' + (kind === 'cadastrar' ? 'Senha com 6 ou mais caracteres. Ela é guardada embaralhada, nunca em texto.' : 'O servidor pode demorar uns segundos para acordar.') + '</p>' +
      '<div class="acts"><button class="btn gold" type="submit">' + (kind === 'cadastrar' ? 'Criar conta' : 'Entrar') + '</button></div>';
    G.UI.panel('acct', kind === 'cadastrar' ? 'Criar conta' : 'Entrar', body);
    body.onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(body), msg = body.querySelector('.msg'), b = body.querySelector('button');
      b.disabled = true; msg.textContent = 'Falando com o servidor...';
      const r = await Net.call(kind, { nome: f.get('nome'), email: f.get('email'), senha: f.get('senha') }, 45000);
      b.disabled = false;
      if (!r.ok) { msg.textContent = r.erro; return; }
      Net.setSession({ token: r.token, usuario: r.usuario });
      G.UI.close(true);
      await sync();
      // o que já existe neste aparelho sobe para a conta
      for (let s = 1; s <= 3; s++) { const was = Gm.slot; Gm.slot = s; await Cl.push(true); Gm.slot = was; }
    };
  }
  const POVO = { humano: 'Humano', elfo: 'Elfo', anao: 'Anão', fera: 'Povo-fera' };
  Cl.openRanking = async function () {
    const body = el('div', 'rank', '<p class="muted">Buscando os heróis de Aruanã...</p>');
    G.UI.panel('rank', 'Heróis de Aruanã', body);
    const r = await Net.call('ranking', {}, 45000);
    if (!r.ok) { body.innerHTML = '<p>' + esc(r.erro) + '</p>'; return; }
    if (!r.lista.length) { body.innerHTML = '<p class="muted">Ninguém ainda. O primeiro nome pode ser o seu.</p>'; return; }
    body.innerHTML = '<table class="stats rank-t"><tr><th>#</th><th>Herói</th><th>Nível</th><th>Missões</th><th>Masmorras</th><th>A Sina</th></tr>' + r.lista.map((h, i) =>
      '<tr><td>' + (i + 1) + '</td><td><b>' + esc(h.heroi) + '</b><br><small class="muted">' + POVO[h.povo] + ' · ' + esc(h.conta) + '</small></td><td>' + h.nivel + '</td><td>' + h.missoes + '</td><td>' + h.masmorras + '</td><td>' +
      (h.final ? (h.final === 'reescrever' ? 'Reescrita' : 'Livre') : 'etapa ' + h.etapa + ' de 18') + '</td></tr>').join('') + '</table>';
  };
  void D;
})(globalThis.G = globalThis.G || {});
