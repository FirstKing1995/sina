/* SINA 2D: som. Efeitos gravados e ambiente em laço; música só nos chefes, para o silêncio pesar. (Igual ao da versão de cima.) */
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
  S.musica = function (nome) {
    alvoMus = nome; if (!ligado) return;
    for (const n of ['batalha', 'november-snow']) laco('som/musica/' + n + '.mp3', n === nome ? 0.5 : 0);
  };
})(window);
