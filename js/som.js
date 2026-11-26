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
    latido: ['latido1'], rosnado: ['rosnado1'], rocha: ['rocha_urro1'], ferro: ['ferro_urro1'], impacto: ['impacto1'], rastejar: ['rastejar1'],
    golpe: ['golpe1', 'golpe2', 'golpe3'], forte: ['forte1'], acerto: ['acerto1', 'acerto2', 'acerto3'], dor: ['heroi_dor1'],
    inimigoDor: ['dor1', 'dor2'], morte: ['morte1', 'morte2', 'morte3'], rugido: ['rugido1', 'rugido2'], uivo: ['uivo1'], mordida: ['mordida1', 'mordida2'],
    moeda: ['moeda1', 'moeda2'], beber: ['beber1', 'beber2'], fogo: ['fogo1', 'fogo2'], abrir: ['abrir1'], porta: ['porta1'], raro: ['raro1'], magia: ['magia1', 'magia2'], quebra: ['quebra1'], livro: ['livro1'], pegar: ['pegar1'], minerar: ['minerar1', 'minerar2'],
    gob: ['gob1', 'gob2', 'gob3', 'gob4', 'gob5'], mor: ['mor1', 'mor2', 'mor3', 'mor4', 'mor5'], ogro: ['ogro1', 'ogro2', 'ogro3', 'ogro4'], gig: ['gig1', 'gig3', 'gig5'], lobisomem: ['lobisomem'],
    corte: ['corte1', 'corte2', 'corte3'], lamina: ['lamina1', 'lamina2', 'lamina3'], madeira: ['madeira1', 'madeira2', 'madeira3'], pedra: ['pedra1', 'pedra2', 'pedra3'], metal: ['metal1', 'metal2', 'metal3'], corrente: ['corrente1', 'corrente2', 'corrente3'],
    passop: ['passop1', 'passop2', 'passop3'], lama: ['lama1', 'lama2', 'lama3'], bolha: ['bolha1', 'bolha2', 'bolha3'], saca: ['saca1'], pano: ['pano1'], malha: ['malha1'], tranca: ['tranca1'], urro: ['urro1', 'urro2'], morreu: ['morreu1'], fere: ['fere1', 'fere2'],
  };
  // a voz de cada espécie: [som, volume, tom] para avisar, atacar, apanhar e morrer
  const VOZ = {
    pedra: { alerta: ['rocha', 0.55, 1], ataque: ['impacto', 0.55, 1.05], dor: ['pedra', 0.45, 1], morte: ['impacto', 0.8, 0.8] },
    rastejante: { alerta: ['rastejar', 0.5, 1.1], ataque: ['rastejar', 0.5, 1.3], dor: ['pedra', 0.4, 1.3], morte: ['quebra', 0.6, 0.9] },
    minerador: { alerta: ['mor', 0.45, 0.7], ataque: ['metal', 0.4, 0.9], dor: ['mor', 0.3, 1], morte: ['mor', 0.5, 0.55] },
    capataz: { alerta: ['ferro', 0.9, 1], ataque: ['impacto', 0.75, 0.9], dor: ['metal', 0.5, 0.8], morte: ['ferro', 1, 0.7] },
    lobo: { alerta: ['rugido', 0.4, 1.45], ataque: ['mordida', 0.35, 1.2], dor: ['fere', 0.4, 1.5], morte: ['morreu', 0.5, 1.5] },
    lobo_rubro: { alerta: ['urro', 0.5, 0.95], ataque: ['rugido', 0.5, 0.8], dor: ['fere', 0.5, 1], morte: ['morreu', 0.7, 0.95] },
    cobra: { alerta: ['~chiado', 0.4, 1], ataque: ['~chiado', 0.5, 1.4], dor: ['~chiado', 0.35, 1.8], morte: ['lama', 0.5, 0.9] },
    zumbi: { alerta: ['mor', 0.45, 0.8], ataque: ['mor', 0.35, 0.95], dor: ['mor', 0.3, 1.15], morte: ['mor', 0.5, 0.62] },
    zumbi_mulher: { alerta: ['mor', 0.6, 1.55], ataque: ['mor', 0.4, 1.7], dor: ['mor', 0.35, 1.9], morte: ['mor', 0.5, 1.2] },
    zumbi_inchado: { alerta: ['ogro', 0.45, 0.7], ataque: ['ogro', 0.5, 0.62], dor: ['lama', 0.5, 0.7], morte: ['lama', 0.8, 0.5] },
    goblin: { alerta: ['gob', 0.4, 1.5], ataque: ['gob', 0.3, 1.8], dor: ['gob', 0.35, 1.95], morte: ['gob', 0.5, 1.25] },
    goblin_porrete: { alerta: ['ogro', 0.5, 1], ataque: ['ogro', 0.5, 0.85], dor: ['ogro', 0.4, 1.25], morte: ['ogro', 0.6, 0.72] },
    alfa: { alerta: ['lobisomem', 0.8, 0.8], ataque: ['urro', 0.5, 0.9], dor: ['fere', 0.4, 0.85], morte: ['lobisomem', 0.9, 0.6] },
    rainha: { alerta: ['~chiado', 0.9, 0.55], ataque: ['~chiado', 0.7, 0.8], dor: ['~chiado', 0.5, 1.2], morte: ['urro', 0.8, 1.5] },
    carcereiro: { alerta: ['mor', 0.8, 0.5], ataque: ['mor', 0.5, 0.6], dor: ['metal', 0.4, 0.7], morte: ['mor', 0.9, 0.42] },
    chefe: { alerta: ['gig', 0.8, 0.95], ataque: ['gig', 0.5, 1.15], dor: ['ogro', 0.45, 0.9], morte: ['gig', 0.9, 0.7] },
  };
  S.voz = function (tipo, esp, qual, vol, pan) { const v = (VOZ[tipo] || VOZ[esp] || {})[qual]; if (!v) return; if (v[0][0] === '~') S.sopro(v[0].slice(1), v[1] * (vol == null ? 1 : vol), v[2], pan); else S.tocar(v[0], v[1] * (vol == null ? 1 : vol), v[2], pan); };
  let ctx = null, saida, ligado = false;
  const bufs = {};
  S.ligar = function () {
    if (ligado) { if (ctx && ctx.state === 'suspended') ctx.resume(); return; }
    ligado = true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      saida = ctx.createGain(); saida.gain.value = 0.75 * S.vol.efeitos; saida.connect(ctx.destination);
      const nomes = new Set(); for (const k in BANCO) BANCO[k].forEach((n) => nomes.add(n));
      // quatro de cada vez, com nova tentativa: são muitos arquivos pequenos
      const filaS = [...nomes].map((n) => [n, 0]);
      const puxa = () => { const q = filaS.shift(); if (!q) return; fetch('som/sfx/' + q[0] + '.mp3').then((r) => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then((a) => ctx.decodeAudioData(a)).then((b) => { bufs[q[0]] = b; }).catch(() => { if (q[1] < 2) filaS.push([q[0], q[1] + 1]); }).then(puxa); };
      for (let i = 0; i < 4; i++) puxa();
    } catch (e) { ctx = null; }
    S.ambiente(alvoAmb); S.musica(alvoMus);
  };
  const liga = (g, pan) => { if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-0.8, Math.min(0.8, pan)); g.connect(p); p.connect(saida); } else g.connect(saida); };
  S.tocar = function (nome, vol, tom, pan) {
    if (!ctx) return;
    const l = BANCO[nome]; if (!l) return;
    const b = bufs[l[Math.floor(Math.random() * l.length)]]; if (!b) return;
    const f = ctx.createBufferSource(), g = ctx.createGain();
    f.buffer = b; f.playbackRate.value = (tom || 1) * (0.92 + Math.random() * 0.16); g.gain.value = vol == null ? 0.8 : vol;
    f.connect(g); liga(g, pan); f.start();
  };
  // sons curtos feitos na hora, para o que não tem gravação: pulo, pouso, esquiva, carga
  S.trovao = function (k) {
    if (!ctx) return; const t = ctx.currentTime, d = 1.6 + k, n = Math.floor(ctx.sampleRate * d), b = ctx.createBuffer(1, n, ctx.sampleRate), x = b.getChannelData(0); let v = 0;
    for (let i = 0; i < n; i++) { v = v * 0.985 + (Math.random() * 2 - 1) * 0.15; x[i] = v * Math.pow(1 - i / n, 1.6) * (i < 900 ? 3 * k : 1.6); }
    const f = ctx.createBufferSource(), g = ctx.createGain(); f.buffer = b; g.gain.value = 0.5 * k; f.connect(g); g.connect(saida); f.start(t + (1 - k) * 0.7);
  };
  S.sopro = function (tipo, vol, tom, pan) {
    if (!ctx) return;
    const t = ctx.currentTime, P = { pulo: [0.09, 900, 2400, 0.16], pouso: [0.08, 500, 180, 0.22], esquiva: [0.18, 1400, 500, 0.2], carga: [0.35, 300, 1300, 0.12], sina: [0.4, 600, 1800, 0.12], chiado: [0.5, 5200, 3600, 0.16], mato: [0.07, 2600, 1500, 0.1], neve: [0.09, 1100, 700, 0.14], terra: [0.06, 420, 220, 0.18], corda: [0.12, 900, 260, 0.2] }[tipo];
    if (!P) return;
    const n = Math.floor(ctx.sampleRate * P[0]), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const f = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    f.buffer = b; fl.type = 'bandpass'; fl.Q.value = 1.4; fl.frequency.setValueAtTime(P[1] * (tom || 1), t); fl.frequency.exponentialRampToValueAtTime(P[2] * (tom || 1), t + P[0]);
    g.gain.value = P[3] * (vol == null ? 1 : vol); f.connect(fl); fl.connect(g); liga(g, pan); f.start();
  };
  // a natureza, feita na hora: passarinho, grilo, coruja, sapo, corvo, gota, sopro de vento e o coração
  const nota = (f0, f1, d, vol, ini, tipo, sai) => { const t0 = ctx.currentTime + ini, o = ctx.createOscillator(), g = ctx.createGain(); o.type = tipo || 'sine'; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + d); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + d * 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); o.connect(g); g.connect(sai); o.start(t0); o.stop(t0 + d + 0.02); };
  // gravações reais (CC0) quando já chegaram; senão, o som feito na hora
  const NAT = { pio: ['pio1', 'pio2', 'pio3', 'pio4'], pio2: ['pio1', 'pio2', 'pio3', 'pio4'], grilo: ['grilo'], coruja: ['coruja'], sapo: ['sapo1', 'sapo2'], corvo: ['corvo1', 'corvo2'], gota: ['gota1', 'gota2', 'gota3'], sopro: ['vento'], morcego: ['morcego'], uivo: ['uivo'] }, natB = {}; let natPedido = false;
  function pedeNat() { if (natPedido || !ctx) return; natPedido = true; const l = [...new Set(Object.values(NAT).flat())]; let i = 0; const vai = () => { const n = l[i++]; if (!n) return; fetch('som/natureza/' + n + '.mp3').then((r) => r.arrayBuffer()).then((a) => ctx.decodeAudioData(a)).then((b) => { natB[n] = b; }).catch(() => {}).then(vai); }; vai(); vai(); }
  S.bicho = function (tipo, vol, pan) {
    if (!ctx || ctx.state !== 'running') return; pedeNat(); const amb = tipo === 'coracao' ? 1 : S.vol.ambiente; if (amb <= 0) return; const s = ctx.createGain(); s.gain.value = vol * amb; liga(s, pan); const R = Math.random;
    const gr = NAT[tipo] && NAT[tipo].map((n) => natB[n]).filter(Boolean); if (gr && gr.length) { const f = ctx.createBufferSource(); f.buffer = gr[Math.floor(R() * gr.length)]; f.playbackRate.value = 0.9 + R() * 0.2; s.gain.value = vol * amb * (tipo === 'sopro' ? 0.5 : tipo === 'grilo' ? 0.35 : 0.6); f.connect(s); f.start(); return; }
    if (tipo === 'pio') { const b = 2200 + R() * 1400, n = 2 + Math.floor(R() * 4); for (let i = 0; i < n; i++) nota(b * (1 + R() * 0.2), b * (0.8 + R() * 0.5), 0.07 + R() * 0.05, 0.05, i * (0.11 + R() * 0.03), 'sine', s); }
    else if (tipo === 'pio2') { const b = 3000 + R() * 900; nota(b, b * 1.25, 0.12, 0.04, 0, 'sine', s); nota(b * 1.2, b * 0.8, 0.2, 0.045, 0.16, 'sine', s); if (R() < 0.5) nota(b, b * 1.2, 0.1, 0.035, 0.42, 'sine', s); }
    else if (tipo === 'grilo') { const b = 4100 + R() * 500; for (let j = 0; j < 2 + R() * 2; j++) for (let i = 0; i < 4; i++) nota(b, b * 1.01, 0.028, 0.026, j * 0.36 + i * 0.042, 'triangle', s); }
    else if (tipo === 'coruja') { nota(390, 360, 0.26, 0.07, 0, 'sine', s); nota(400, 330, 0.5, 0.08, 0.42, 'sine', s); }
    else if (tipo === 'sapo') { const b = 150 + R() * 60; for (let i = 0; i < 2 + R() * 2; i++) { nota(b, b * 1.5, 0.12, 0.06, i * 0.24, 'sawtooth', s); nota(b * 6, b * 7, 0.1, 0.012, i * 0.24, 'square', s); } }
    else if (tipo === 'corvo') { for (let i = 0; i < 1 + R() * 2; i++) { nota(620, 420, 0.24, 0.045, i * 0.36, 'sawtooth', s); nota(940, 640, 0.22, 0.022, i * 0.36, 'square', s); } }
    else if (tipo === 'gota') { nota(700, 1500, 0.06, 0.1, 0, 'sine', s); nota(700, 1400, 0.06, 0.035, 0.18, 'sine', s); nota(700, 1300, 0.06, 0.015, 0.36, 'sine', s); }
    else if (tipo === 'coracao') { nota(62, 38, 0.16, 0.5, 0, 'sine', s); nota(54, 34, 0.18, 0.4, 0.2, 'sine', s); }
    else if (tipo === 'sopro') { const d = 2.2, n = Math.floor(ctx.sampleRate * d), b = ctx.createBuffer(1, n, ctx.sampleRate), x = b.getChannelData(0); for (let i = 0; i < n; i++) x[i] = (R() * 2 - 1) * Math.sin((i / n) * Math.PI); const f = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); f.buffer = b; fl.type = 'bandpass'; fl.Q.value = 2.4; fl.frequency.setValueAtTime(260, ctx.currentTime); fl.frequency.linearRampToValueAtTime(520 + R() * 260, ctx.currentTime + d * 0.5); fl.frequency.linearRampToValueAtTime(240, ctx.currentTime + d); g.gain.value = 0.11; f.connect(fl); fl.connect(g); g.connect(s); f.start(); }
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
    for (const n of ['noite', 'masmorra', 'brisa', 'chuva', 'rio', 'cinzas', 'cripta', 'mina']) if (n === nome || lacos['som/amb/' + n + '.mp3']) laco('som/amb/' + n + '.mp3', n === nome ? (n === 'masmorra' || n === 'mina' ? 0.6 : n === 'cinzas' || n === 'cripta' ? 0.5 : 0.38) : 0);
  };
  // chuva por cima do ambiente da área
  S.chuva = function (k) { if (!ligado || (!k && !lacos['som/amb/chuva.mp3'])) return; if (alvoAmb === 'chuva') return; laco('som/amb/chuva.mp3', k); };
  S.fogueira = function (k) { if (ligado) { const el = lacos['som/amb/fogo.mp3']; if (!el) laco('som/amb/fogo.mp3', k); else { if (k > 0 && el.paused) el.play().catch(() => {}); el.volume = Math.min(1, k * S.vol.ambiente); if (!k) el.pause(); } } };
  // ---------- músicas ----------
  // cada uma toca em dois aparelhos: perto do fim do laço o segundo entra no ponto certo e cruza com o primeiro, sem buraco
  const MUS = {
    floresta: { vol: 0.34, laco: [9.262, 164.718], entra: 3, sai: 2 }, calma: { vol: 0.4, laco: [6.117, 77.137], entra: 2.2, sai: 2 },
    batalha: { vol: 0.42, laco: [4.209, 136.746], entra: 0.6, sai: 2.4, recomeca: 12 },
    // as novas: uma por caminho, a vila de dia e o cerco à noite (laço no arquivo inteiro, cruzando no fim)
    serra: { vol: 0.34, laco: [1, 190.6], entra: 3, sai: 2.5 }, alagado: { vol: 0.34, laco: [1, 181.4], entra: 3, sai: 2.5 }, enterrados: { vol: 0.36, laco: [1, 172.3], entra: 3, sai: 2.5 },
    rio: { vol: 0.36, laco: [1, 131.1], entra: 2.5, sai: 2.5 }, minas: { vol: 0.36, laco: [1, 208.3], entra: 3, sai: 2.5 }, fortim: { vol: 0.36, laco: [1, 190.5], entra: 3, sai: 2.5 }, primeiro: { vol: 0.42, laco: [0, 187.6], entra: 2, sai: 3 }, cerco: { vol: 0.42, laco: [1, 173.3], entra: 0.8, sai: 2.4, recomeca: 12 }, chefao: { vol: 0.5, laco: [3.868, 162.189], entra: 0.4, sai: 2.5, recomeca: 0 },
  };
  const CRUZA = 1.1;
  // o arquivo fica na memória (uns 2 MB): os dois aparelhos usam o mesmo, e pular de ponto não depende da rede
  function baixa(m, n) { const u = 'som/musica/sina-' + (m.arq || n) + '.mp3?v=1'; m.baixando = fetch(u).then((r) => { if (!r.ok) throw 0; return r.blob(); }).then((b) => { m.url = URL.createObjectURL(b); }).catch(() => { m.url = u; }).then(() => { m.A = aparelho(m); m.g = 0; if (m.quer && !document.hidden) toca(m, m.A); }); }
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
