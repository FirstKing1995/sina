/* SINA · Parte I: som. Efeitos gravados e ambiente em laço; música só nos chefes, para o silêncio pesar. */
(function (raiz) {
  'use strict';
  const S = raiz.Som = {};
  const BANCO = {
    golpe: ['golpe1', 'golpe2', 'golpe3'], forte: ['forte1'], acerto: ['acerto1', 'acerto2', 'acerto3'], dor: ['heroi_dor1'],
    inimigoDor: ['dor1', 'dor2'], morte: ['morte1', 'morte2', 'morte3'], rugido: ['rugido1', 'rugido2'], uivo: ['uivo1'], mordida: ['mordida1', 'mordida2'],
    moeda: ['moeda1', 'moeda2'], beber: ['beber1', 'beber2'], fogo: ['fogo1', 'fogo2'], abrir: ['abrir1'], porta: ['porta1'], raro: ['raro1'], magia: ['magia1', 'magia2'], quebra: ['quebra1'], livro: ['livro1'], pegar: ['pegar1'],
  };
  let ctx = null, saida, ligado = false;
  const bufs = {};
  S.ligar = function () {
    if (ligado) { if (ctx && ctx.state === 'suspended') ctx.resume(); return; }
    ligado = true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      saida = ctx.createGain(); saida.gain.value = 0.75; saida.connect(ctx.destination);
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
  S.fogueira = function (k) { if (ligado) { const el = lacos['som/amb/fogo.mp3']; if (!el) laco('som/amb/fogo.mp3', k); else { if (k > 0 && el.paused) el.play().catch(() => {}); el.volume = Math.min(1, k); if (!k) el.pause(); } } };
  S.musica = function (nome) {
    alvoMus = nome; if (!ligado) return;
    for (const n of ['batalha', 'november-snow']) laco('som/musica/' + n + '.mp3', n === nome ? 0.5 : 0);
  };
})(window);
