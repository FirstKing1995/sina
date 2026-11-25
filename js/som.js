/* SINA 2D: som. Efeitos gravados e ambiente em laço; quatro músicas em laço: floresta, calma, batalha e chefão. */
(function (raiz) {
  'use strict';
  const S = raiz.Som = {};
  S.vol = { efeitos: 1, ambiente: 1, musica: 1 };
  try { Object.assign(S.vol, JSON.parse(localStorage.getItem('sina2d_vol')) || {}); } catch (e) { /* sem preferência guardada */ }
  S.mudaVolume = function (qual, v) {
    S.vol[qual] = v; try { localStorage.setItem('sina2d_vol', JSON.stringify(S.vol)); } catch (e) { /* nada */ }
    if (saida) saida.gain.value = 0.75 * S.vol.efeitos;
    S.ambiente(alvoAmb); S.musica(alvoMus);
  };
  const BANCO = {
    golpe: ['golpe1', 'golpe2', 'golpe3'], forte: ['forte1'], acerto: ['acerto1', 'acerto2', 'acerto3'], dor: ['heroi_dor1'],
    inimigoDor: ['dor1', 'dor2'], morte: ['morte1', 'morte2', 'morte3'], rugido: ['rugido1', 'rugido2'], uivo: ['uivo1'], mordida: ['mordida1', 'mordida2'],
    moeda: ['moeda1', 'moeda2'], beber: ['beber1', 'beber2'], fogo: ['fogo1', 'fogo2'], abrir: ['abrir1'], porta: ['porta1'], raro: ['raro1'], magia: ['magia1', 'magia2'], quebra: ['quebra1'], livro: ['livro1'], pegar: ['pegar1'], minerar: ['minerar1', 'minerar2'],
  };
  let ctx = null, saida, ligado = false;
  const bufs = {};
  S.ligar = function () {
    if (ligado) { if (ctx && ctx.state === 'suspended') ctx.resume(); return; }
    ligado = true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      saida = ctx.createGain(); saida.gain.value = 0.75 * S.vol.efeitos; saida.connect(ctx.destination);
      const nomes = new Set(); for (const k in BANCO) BANCO[k].forEach((n) => nomes.add(n));
      for (const n of nomes) fetch('som/sfx/' + n + '.mp3').then((r) => r.arrayBuffer()).then((a) => ctx.decodeAudioData(a)).then((b) => { bufs[n] = b; }).catch(() => {});
    } catch (e) { ctx = null; }
    S.ambiente(alvoAmb); S.musica(alvoMus);
  };
  S.tocar = function (nome, vol, tom) {
    if (!ctx) return;
    const l = BANCO[nome]; if (!l) return;
    const b = bufs[l[Math.floor(Math.random() * l.length)]]; if (!b) return;
    const f = ctx.createBufferSource(), g = ctx.createGain();
    f.buffer = b; f.playbackRate.value = (tom || 1) * (0.92 + Math.random() * 0.16); g.gain.value = vol == null ? 0.8 : vol;
    f.connect(g); g.connect(saida); f.start();
  };
  // sons curtos feitos na hora, para o que não tem gravação: pulo, pouso, esquiva, carga
  S.sopro = function (tipo) {
    if (!ctx) return;
    const t = ctx.currentTime, P = { pulo: [0.09, 900, 2400, 0.16], pouso: [0.08, 500, 180, 0.22], esquiva: [0.18, 1400, 500, 0.2], carga: [0.35, 300, 1300, 0.12], sina: [0.4, 600, 1800, 0.12] }[tipo];
    if (!P) return;
    const n = Math.floor(ctx.sampleRate * P[0]), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const f = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    f.buffer = b; fl.type = 'bandpass'; fl.Q.value = 1.4; fl.frequency.setValueAtTime(P[1], t); fl.frequency.exponentialRampToValueAtTime(P[2], t + P[0]);
    g.gain.value = P[3]; f.connect(fl); fl.connect(g); g.connect(saida); f.start();
  };
  // laços em elementos de áudio, com troca suave
  const lacos = {};
  function fade(el, alvo) {
    clearInterval(el._t);
    el._t = setInterval(() => {
      const d = alvo - el.volume;
      if (Math.abs(d) < 0.02) { el.volume = alvo; clearInterval(el._t); if (!alvo) el.pause(); return; }
      el.volume = Math.max(0, Math.min(1, el.volume + Math.sign(d) * 0.02));
    }, 50);
  }
  function laco(caminho, vol) {
    vol *= /musica/.test(caminho) ? S.vol.musica : S.vol.ambiente;
    let el = lacos[caminho];
    if (!el) { el = lacos[caminho] = new Audio(caminho); el.loop = true; el.volume = 0; }
    if (vol > 0 && el.paused) el.play().catch(() => {});
    fade(el, vol);
  }
  let alvoAmb = null, alvoMus = null;
  S.ambiente = function (nome) {
    alvoAmb = nome; if (!ligado) return;
    for (const n of ['noite', 'masmorra', 'brisa', 'chuva', 'rio', 'cinzas', 'cripta']) laco('som/amb/' + n + '.mp3', n === nome ? (n === 'masmorra' ? 0.6 : n === 'cinzas' || n === 'cripta' ? 0.5 : 0.38) : 0);
  };
  S.fogueira = function (k) { if (ligado) { const el = lacos['som/amb/fogo.mp3']; if (!el) laco('som/amb/fogo.mp3', k); else { if (k > 0 && el.paused) el.play().catch(() => {}); el.volume = Math.min(1, k * S.vol.ambiente); if (!k) el.pause(); } } };
  // ---------- músicas ----------
  // cada uma toca em dois aparelhos: perto do fim do laço o segundo entra no ponto certo e cruza com o primeiro, sem buraco
  const MUS = {
    floresta: { vol: 0.34, laco: [9.262, 164.718], entra: 3, sai: 2 }, calma: { vol: 0.4, laco: [6.117, 77.137], entra: 2.2, sai: 2 },
    batalha: { vol: 0.42, laco: [4.209, 136.746], entra: 0.6, sai: 2.4, recomeca: 12 }, chefao: { vol: 0.5, laco: [3.868, 162.189], entra: 0.4, sai: 2.5, recomeca: 0 },
  };
  const CRUZA = 1.1;
  // o arquivo fica na memória (uns 2 MB): os dois aparelhos usam o mesmo, e pular de ponto não depende da rede
  function baixa(m, n) { const u = 'som/musica/sina-' + n + '.mp3?v=1'; m.baixando = fetch(u).then((r) => { if (!r.ok) throw 0; return r.blob(); }).then((b) => { m.url = URL.createObjectURL(b); }).catch(() => { m.url = u; }).then(() => { m.A = aparelho(m); m.g = 0; if (m.quer && !document.hidden) toca(m, m.A); }); }
  function aparelho(m) { const el = new Audio(m.url); el.preload = 'auto'; el.volume = 0; return el; }
  function toca(m, el) { const p = el.play(); if (p && p.catch) p.catch(() => { m.falhou = performance.now(); }); }
  S.musica = function (nome) {
    if (nome === alvoMus && (!ligado || !nome || MUS[nome].baixando)) return;
    alvoMus = nome; if (!ligado) return;
    for (const n in MUS) {
      const m = MUS[n]; m.quer = n === nome ? 1 : 0;
      if (!m.quer) continue;
      if (!m.baixando) baixa(m, n);
      if (!m.A) continue;
      // a batalha recomeça do zero; a floresta continua de onde parou
      if (m.A.paused && m.recomeca != null && performance.now() - (m.parou || 0) > m.recomeca * 1000) { m.A.currentTime = 0; if (m.B) m.B.pause(); m.k = 0; m.trocando = false; }
      if (m.A.paused) toca(m, m.A);
    }
  };
  S.prepara = (n) => { if (ligado && MUS[n] && !MUS[n].baixando) baixa(MUS[n], n); };
  S.musicaAtual = () => alvoMus;
  let antes = performance.now();
  setInterval(() => {
    const agora = performance.now(), dt = Math.min(1.2, (agora - antes) / 1000); antes = agora;
    for (const n in MUS) {
      const m = MUS[n]; if (!m.A) continue;
      m.g = m.quer ? Math.min(1, m.g + dt / m.entra) : Math.max(0, m.g - dt / m.sai);
      if (m.g <= 0 && !m.quer) { if (!m.A.paused) { m.A.pause(); if (m.B) m.B.pause(); m.parou = agora; } continue; }
      if (m.quer && m.A.paused && !document.hidden && agora - (m.falhou || 0) > 800) { if (m.A.ended) m.A.currentTime = m.laco[0]; toca(m, m.A); }
      const [li, lf] = m.laco, t = m.A.currentTime;
      if (lf && t > lf - 9 && !m.trocando) { if (!m.B) m.B = aparelho(m); if (m.B.paused && Math.abs(m.B.currentTime - li) > 0.02 && m.B.readyState > 0) m.B.currentTime = li; }
      if (lf && m.B && t >= lf - 0.05 && !m.trocando) { m.trocando = true; m.k = 0; m.B.volume = 0; m.B.currentTime = Math.max(0, li + (t - lf)); toca(m, m.B); }
      const v = Math.max(0, Math.min(1, m.g * m.vol * S.vol.musica));
      if (m.trocando) {
        m.k = Math.min(1, m.k + dt / CRUZA);
        m.A.volume = v * Math.cos(m.k * Math.PI / 2); m.B.volume = v * Math.sin(m.k * Math.PI / 2);
        if (m.k >= 1) { m.A.pause(); const x = m.A; m.A = m.B; m.B = x; m.trocando = false; }
      } else m.A.volume = v;
    }
  }, 60);
  document.addEventListener('visibilitychange', () => { for (const n in MUS) { const m = MUS[n]; if (!m.A) continue; if (document.hidden) { m.A.pause(); if (m.B) m.B.pause(); } else if (m.quer) toca(m, m.A); } });
  S.MUS = MUS;
})(window);
