/* SINA · Aruanã: a nuvem. Conta, save em um espaço só desta versão e ranking, no servidor que já existe (Apps Script).
   Sem conexão ou sem conta, o jogo segue normal, salvando no aparelho. */
(function () {
  'use strict';
  const J = window.Jogo, N = window.Nuvem = {};
  // ?api=URL troca o servidor: serve para testar com o simulador local (tools/serve.js)
  const URL_API = new URLSearchParams(location.search).get('api') || (window.G && G.CFG && G.CFG.API_URL);
  const CHAVE_SESSAO = 'sina.sessao'; // a mesma sessão do jogo antigo: quem já tem conta continua
  // O servidor tem 3 espaços por conta, que o jogo antigo também usa. Este jogo ocupa um espaço VAZIO e nunca sobrescreve o de outro.
  let ESPACO = null;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  N.esc = esc;
  N.ligada = () => !!URL_API;
  N.sessao = () => { try { const s = JSON.parse(localStorage.getItem(CHAVE_SESSAO) || 'null'); return s && s.token ? s : null; } catch (e) { return null; } };
  function guardar(s) { try { if (s) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(s)); else localStorage.removeItem(CHAVE_SESSAO); } catch (e) { /* sem acesso */ } }

  // o Apps Script parado acorda devagar: tempo limite folgado
  async function chamar(action, dados, ms) {
    if (!URL_API) return { ok: false, erro: 'Servidor não configurado.' };
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms || 45000);
    try {
      const r = await fetch(URL_API, { method: 'POST', body: JSON.stringify(Object.assign({ action }, dados || {})), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow', signal: ctl.signal });
      const js = JSON.parse(await r.text());
      if (js && js.ok === false && js.sessao === false) guardar(null);
      return js;
    } catch (e) {
      return { ok: false, offline: true, erro: 'Sem conexão com o servidor. O jogo segue salvando neste aparelho.' };
    } finally { clearTimeout(t); }
  }
  N.chamar = chamar;
  N.acordar = () => { if (URL_API) chamar('hora', {}, 45000); };

  N.entrar = async function (tipo, campos) {
    const r = await chamar(tipo, campos);
    if (r.ok) { guardar({ token: r.token, usuario: r.usuario }); await N.baixar(); }
    return r;
  };
  N.sair = async function () { const u = N.sessao(); if (u) chamar('sair', { token: u.token }); guardar(null); ESPACO = null; procurou = false; N.estado = 'parada'; };

  function resumo(S, u) {
    const feitas = Object.values(S.missoes).filter((m) => m.feita).length;
    return { heroi: (u.usuario && u.usuario.nome) || 'Sem-Sina', povo: 'humano', nivel: 1 + S.nivel.vida + S.nivel.vigor + S.nivel.forca, missoes: feitas, masmorras: S.chefesMortos.length, etapa: S.cacos, horas: Math.floor((S.tempo || 0) / 3600), final: S.fim ? 'libertar' : '' };
  }
  // sobe o save: no máximo a cada 40 s, a não ser que seja importante
  let ultima = 0, ocupado = false, deNovo = false;
  N.estado = 'parada';
  let procurou = false;
  N.enviar = async function (agora) {
    const u = N.sessao(); if (!u || !URL_API) return;
    if (!ESPACO) { if (!procurou) { procurou = true; await N.baixar(); } if (!ESPACO) return; }
    if (ocupado) { if (agora) deNovo = true; return; }
    if (!agora && Date.now() - ultima < 40000) return;
    let bruto; try { bruto = localStorage.getItem(J.CHAVE_SAVE); } catch (e) { return; }
    if (!bruto) return;
    ocupado = true; ultima = Date.now();
    const r = await chamar('salvar', { token: u.token, espaco: ESPACO, dados: bruto, resumo: resumo(JSON.parse(bruto), u) });
    ocupado = false;
    N.estado = r.ok ? 'salva' : r.sessao === false ? 'sessao' : r.offline ? 'offline' : 'erro';
    N.ultimoErro = r.ok ? '' : r.erro;
    if (deNovo) { deNovo = false; N.enviar(true); }
  };
  J.aoSalvar = () => N.enviar(false);
  addEventListener('pagehide', () => {
    const u = N.sessao(); if (!u || !URL_API || !ESPACO || !navigator.sendBeacon) return;
    try { const bruto = localStorage.getItem(J.CHAVE_SAVE); if (bruto) navigator.sendBeacon(URL_API, new Blob([JSON.stringify({ action: 'salvar', token: u.token, espaco: ESPACO, dados: bruto, resumo: resumo(JSON.parse(bruto), u) })], { type: 'text/plain;charset=utf-8' })); } catch (e) { /* nada */ }
  });
  // desce o save se o da nuvem for mais novo. Devolve true se trocou.
  N.baixar = async function () {
    const u = N.sessao(); if (!u) return false;
    const r = await chamar('carregar', { token: u.token });
    if (!r.ok) return false;
    const espacos = r.espacos || {};
    let remoto = null; ESPACO = null;
    for (const k in espacos) { let d = null; try { d = JSON.parse(espacos[k].dados); } catch (e) { /* de outro jogo */ } if (d && d.jogo === 'aruana') { ESPACO = k; remoto = espacos[k]; break; } }
    if (!ESPACO) ESPACO = ['3', '2', '1'].find((k) => !espacos[k]) || null;
    if (!ESPACO) { N.estado = 'cheia'; return false; } // os 3 espaços têm jogos antigos: não apaga nenhum
    if (!remoto) { N.enviar(true); return false; } // nada na conta ainda: o que está aqui sobe
    let local = null; try { local = JSON.parse(localStorage.getItem(J.CHAVE_SAVE) || 'null'); } catch (e) { local = null; }
    const nuvem = JSON.parse(remoto.dados);
    if (!local || (nuvem.at || 0) > (local.at || 0)) { localStorage.setItem(J.CHAVE_SAVE, remoto.dados); return true; }
    if ((local.at || 0) > (nuvem.at || 0)) N.enviar(true);
    return false;
  };
  N.ranking = () => chamar('ranking', {});
})();
