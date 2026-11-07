/* SINA · som. Efeitos sintetizados na hora (Web Audio), o ambiente gravado e as músicas CC0 que vieram do Gods
   (Freesound e cynicmusic, ver CREDITOS.md), e um zumbido grave nas masmorras e nos chefes. */
(function (G) {
  'use strict';
  const Au = G.Audio = {};
  let ctx = null, master, busM, busA, busS;
  const KEY = 'sina.audio';
  let pref = { music: 0.55, amb: 0.6, sfx: 0.8 };
  try { Object.assign(pref, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* sem acesso */ }
  Au.get = (k) => pref[k];
  Au.set = function (k, v) { pref[k] = v; try { localStorage.setItem(KEY, JSON.stringify(pref)); } catch (e) { /* nada */ } apply(); };
  function apply() { if (!ctx) return; busM.gain.value = pref.music * 0.5; busA.gain.value = pref.amb * 0.55; busS.gain.value = pref.sfx * 0.6; }
  Au.unlock = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain(); master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.connect(master);
    busM = ctx.createGain(); busA = ctx.createGain(); busS = ctx.createGain();
    busM.connect(comp); busA.connect(comp); busS.connect(comp);
    apply();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    want(cur.music, cur.amb);
    loadBank();
  };
  let noiseBuf = null;
  // 0.3: sons gravados (CC0: "RPG Sound Pack" de artisticdude e "80 CC0 RPG SFX" de rubberduck, ver CREDITOS.md).
  // Cada som tem variações e sai com o tom levemente diferente a cada vez; o sintetizado fica de reserva
  const BANK = { golpe: ['golpe1', 'golpe2', 'golpe3'], golpe_forte: ['forte1', 'golpe3'], acerto: ['acerto1', 'acerto2', 'acerto3'], dor: ['dor1', 'dor2'], moeda: ['moeda1', 'moeda2'], pegar: ['pegar1'], raro: ['raro1'],
    equipar: ['equipar1', 'equipar2'], beber: ['beber1', 'beber2'], bau: ['bau1'], abrir: ['abrir1'], fechar: ['fechar1'], livro: ['livro1'], magia: ['magia1', 'magia2'], magia_m: ['magia1', 'magia2'], fogo: ['fogo1', 'fogo2'],
    morte: ['morte1', 'morte2', 'morte3'], chefe_morre: ['rugido2'], rugido: ['rugido1', 'rugido2'], uivo: ['uivo1'], mordida: ['mordida1', 'mordida2'], minerar: ['minerar1', 'minerar2'], quebra: ['quebra1'], porta: ['porta1'], heroi_dor: ['heroi_dor1'] };
  const bufs = {};
  function loadBank() {
    const names = new Set(); for (const k in BANK) BANK[k].forEach((v) => names.add(v));
    for (const nm of names) fetch('som/sfx/' + nm + '.mp3').then((r) => r.arrayBuffer()).then((a) => ctx.decodeAudioData(a)).then((b) => { bufs[nm] = b; }).catch(() => {});
  }
  function sample(name, vol, x) {
    const list = BANK[name]; if (!list) return false;
    const nm = list[Math.floor(Math.random() * list.length)], b = bufs[nm]; if (!b) return false;
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = b; src.playbackRate.value = 0.9 + Math.random() * 0.2;
    g.gain.value = vol * (name === 'moeda' || name === 'pegar' ? 0.6 : 0.9);
    let out = g;
    if (x != null && ctx.createStereoPanner && G.Game.S.P) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, (x - G.Game.S.P.x) / 8)); g.connect(p); out = p; }
    out.connect(busS); src.connect(g); src.start();
    return true;
  }
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function tone(type, f, f2, a, d, peak, dest) {
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    env(g, t, a, peak, d); o.connect(g); g.connect(dest || busS); o.start(t); o.stop(t + a + d + 0.05);
  }
  function noise(fType, f, f2, q, a, d, peak, dest, delay) {
    const t = ctx.currentTime + (delay || 0), s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; fl.type = fType; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + a + d); fl.Q.value = q || 1;
    env(g, t, a, peak, d); s.connect(fl); fl.connect(g); g.connect(dest || busS); s.start(t, Math.random() * 0.5); s.stop(t + a + d + 0.05);
  }
  const last = {};
  Au.sfx = function (name, x, y) {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (last[name] && now - last[name] < 0.04) return;
    last[name] = now;
    let vol = 1;
    if (x != null && G.Game.S.P) { const d = Math.hypot(x - G.Game.S.P.x, y - G.Game.S.P.y); vol = Math.max(0, 1 - d / 16); if (vol <= 0) return; }
    const v = (n) => n * vol;
    if (sample(name, vol, x)) { if (name === 'explosao' || name === 'golpe_forte') noise('lowpass', 500, 80, 0.7, 0.005, 0.3, v(0.5)); return; }
    switch (name) {
      case 'golpe': noise('bandpass', 1800, 600, 1.2, 0.005, 0.12, v(0.5)); break;
      case 'golpe_forte': noise('bandpass', 1200, 300, 1, 0.01, 0.22, v(0.7)); tone('sawtooth', 110, 60, 0.01, 0.18, v(0.15)); break;
      case 'acerto': noise('lowpass', 900, 200, 1, 0.002, 0.08, v(0.7)); tone('square', 140, 70, 0.002, 0.07, v(0.12)); break;
      case 'arco': noise('highpass', 3000, 1200, 1, 0.003, 0.1, v(0.35)); tone('triangle', 520, 200, 0.002, 0.08, v(0.12)); break;
      case 'magia': case 'magia_m': tone('sine', 900, 300, 0.01, 0.18, v(0.18)); noise('bandpass', 2200, 800, 3, 0.01, 0.15, v(0.15)); break;
      case 'fogo': noise('lowpass', 1400, 300, 0.8, 0.02, 0.35, v(0.45)); tone('sawtooth', 160, 90, 0.01, 0.25, v(0.08)); break;
      case 'gelo': tone('sine', 1800, 900, 0.005, 0.25, v(0.15)); noise('highpass', 5000, 3000, 2, 0.01, 0.3, v(0.2)); break;
      case 'raio': noise('highpass', 2500, 900, 1, 0.002, 0.18, v(0.5)); tone('square', 80, 40, 0.002, 0.2, v(0.12)); break;
      case 'cura': [523, 659, 784].forEach((f, i) => setTimeout(() => ctx && tone('sine', f, 0, 0.01, 0.35, v(0.12)), i * 70)); break;
      case 'explosao': noise('lowpass', 900, 80, 0.7, 0.005, 0.6, v(0.9)); tone('sine', 90, 35, 0.005, 0.5, v(0.4)); break;
      case 'impacto': noise('lowpass', 500, 80, 0.7, 0.005, 0.35, v(0.7)); tone('sine', 70, 40, 0.005, 0.3, v(0.4)); break;
      case 'dor': tone('square', 220, 110, 0.003, 0.12, 0.12); noise('lowpass', 1200, 300, 1, 0.003, 0.08, 0.4); break;
      case 'morte': noise('lowpass', 700, 120, 1, 0.01, 0.3, v(0.4)); tone('triangle', 200, 60, 0.01, 0.3, v(0.12)); break;
      case 'chefe_morre': noise('lowpass', 600, 50, 0.7, 0.02, 1.4, 0.8); tone('sawtooth', 120, 30, 0.02, 1.3, 0.25); break;
      case 'morte_heroi': tone('triangle', 330, 110, 0.02, 1.2, 0.25); tone('triangle', 247, 82, 0.02, 1.4, 0.2); break;
      case 'mordida': noise('bandpass', 700, 300, 2, 0.003, 0.09, v(0.45)); break;
      case 'investida': noise('lowpass', 600, 1400, 1, 0.05, 0.3, v(0.4)); break;
      case 'rugido': case 'uivo': tone('sawtooth', name === 'uivo' ? 300 : 120, name === 'uivo' ? 520 : 70, 0.15, 0.9, v(0.22)); noise('bandpass', 400, 200, 2, 0.1, 0.8, v(0.3)); break;
      case 'teleporte': tone('sine', 300, 1600, 0.01, 0.25, v(0.15)); break;
      case 'rolar': noise('lowpass', 500, 200, 1, 0.02, 0.18, 0.3); break;
      case 'quebra': noise('bandpass', 2500, 800, 2, 0.002, 0.2, v(0.5)); tone('triangle', 900, 400, 0.002, 0.1, v(0.1)); break;
      case 'espinho': noise('highpass', 3000, 1500, 1, 0.002, 0.12, 0.5); break;
      case 'nivel': [392, 523, 659, 784, 1047].forEach((f, i) => setTimeout(() => ctx && tone('triangle', f, 0, 0.01, 0.45, 0.13), i * 90)); break;
      case 'missao': [440, 554, 659].forEach((f, i) => setTimeout(() => ctx && tone('sine', f, 0, 0.01, 0.5, 0.12), i * 110)); break;
      case 'moeda': tone('square', 1320, 0, 0.002, 0.06, 0.06); setTimeout(() => ctx && tone('square', 1760, 0, 0.002, 0.1, 0.06), 50); break;
      case 'pegar': tone('triangle', 660, 990, 0.005, 0.1, 0.12); break;
      case 'colher': noise('highpass', 2500, 1500, 1, 0.01, 0.15, 0.3); tone('sine', 700, 900, 0.01, 0.1, 0.06); break;
      case 'minerar': tone('square', 1500, 700, 0.002, 0.08, 0.1); noise('bandpass', 3000, 1500, 3, 0.002, 0.1, 0.35); break;
      case 'bau': tone('triangle', 200, 120, 0.01, 0.25, 0.15); noise('lowpass', 800, 300, 1, 0.01, 0.2, 0.25); break;
      case 'agua': noise('bandpass', 900, 400, 2, 0.02, 0.35, 0.35); break;
      case 'beber': [0, 1, 2].forEach((i) => setTimeout(() => ctx && tone('sine', 300 + i * 80, 200, 0.01, 0.08, 0.12), i * 90)); break;
      case 'comer': noise('bandpass', 1200, 600, 2, 0.01, 0.08, 0.3); break;
      case 'equipar': noise('bandpass', 1600, 900, 3, 0.005, 0.12, 0.35); tone('triangle', 400, 300, 0.005, 0.08, 0.06); break;
      case 'forja': tone('square', 1100, 900, 0.002, 0.3, 0.12); tone('square', 1660, 1500, 0.002, 0.25, 0.06); break;
      case 'abrir': tone('triangle', 500, 650, 0.005, 0.08, 0.06); break;
      case 'fechar': tone('triangle', 600, 450, 0.005, 0.07, 0.05); break;
      case 'clique': tone('triangle', 700, 0, 0.002, 0.04, 0.05); break;
      case 'erro': tone('square', 160, 120, 0.005, 0.12, 0.06); break;
    }
  };

  // ---------- música e ambiente ----------
  const MUS = { batalha: 'som/musica/batalha.mp3', cidade: 'som/musica/town-theme.mp3', campo: 'som/musica/another-august.mp3', frio: 'som/musica/november-snow.mp3', titulo: 'som/musica/happy-lullaby.mp3' };
  const REG_MUS = { campo: 'campo', litoral: 'campo', mata: 'campo', serra: 'frio', mangue: 'frio', sertao: 'campo', pantano: 'frio', cratera: null };
  const AMB = { masmorra: 'som/amb/masmorra.mp3', dia: 'som/amb/dia.mp3', noite: 'som/amb/noite.mp3', brisa: 'som/amb/brisa.mp3', rio: 'som/amb/rio.mp3', chuva: 'som/amb/chuva.mp3', fogo: 'som/amb/fogo.mp3' };
  const cur = { music: 'titulo', amb: null };
  const tracks = {};
  function track(url, bus, loop) {
    if (tracks[url]) return tracks[url];
    const a = new Audio(url); a.loop = loop !== false; a.preload = 'none'; a.crossOrigin = 'anonymous';
    const src = ctx.createMediaElementSource(a), g = ctx.createGain(); g.gain.value = 0; src.connect(g); g.connect(bus);
    return (tracks[url] = { a, g, on: false });
  }
  function fade(t, to, sec) { const now = ctx.currentTime; t.g.gain.cancelScheduledValues(now); t.g.gain.setValueAtTime(t.g.gain.value, now); t.g.gain.linearRampToValueAtTime(to, now + sec); }
  function want(music, amb) {
    cur.music = music; cur.amb = amb;
    if (!ctx) return;
    for (const k in MUS) {
      const t = track(MUS[k], busM);
      if (k === music) { if (!t.on) { t.on = true; t.a.play().catch(() => {}); } fade(t, 1, 2.5); }
      else if (t.on) { fade(t, 0, 2.5); const tt = t; setTimeout(() => { if (cur.music !== k) { tt.a.pause(); tt.on = false; } }, 2700); }
    }
    for (const k in AMB) {
      const t = track(AMB[k], busA), on = amb && amb.indexOf(k) >= 0;
      if (on) { if (!t.on) { t.on = true; t.a.play().catch(() => {}); } fade(t, k === 'rio' ? 0.5 : 0.8, 2); }
      else if (t.on) { fade(t, 0, 2); const tt = t; setTimeout(() => { if (!(cur.amb && cur.amb.indexOf(k) >= 0)) { tt.a.pause(); tt.on = false; } }, 2200); }
    }
  }
  let place = 'world', region = 'campo', bossOn = false, dTheme = null;
  Au.title = function () { place = 'title'; want('titulo', null); drone(false); };
  Au.setPlace = function (p, theme) { place = p; dTheme = theme; Au.refresh(); };
  Au.setRegion = function (r) { region = r; Au.refresh(); };
  Au.boss = function (on) { bossOn = on; Au.refresh(); };
  let refT = 0;
  Au.tick = function (dt) { refT -= dt; if (refT <= 0) { refT = 3; Au.refresh(); } };
  Au.refresh = function () {
    if (place === 'title') return;
    const S = G.Game.S, night = G.Game.isNight();
    if (place === 'dg') { want(bossOn ? 'batalha' : null, ['masmorra'].concat(dTheme === 'fogo' ? ['fogo'] : dTheme === 'navio' || dTheme === 'raiz' ? ['rio'] : [])); drone(!bossOn, false); return; }
    drone(false, false);
    const inCity = S.cityOn && S.world && G.World.cityAt(S.world, S.P.x, S.P.y);
    const mus = bossOn ? 'batalha' : inCity ? 'cidade' : REG_MUS[region];
    const amb = [night ? 'noite' : 'dia'];
    if (S.weather === 'chuva') amb.push('chuva');
    if (region === 'serra' || region === 'sertao' || region === 'cratera') amb.push('brisa');
    if (region === 'cratera') amb.splice(0, 1, 'fogo');
    want(mus, amb);
  };
  // o zumbido das masmorras
  let dr = null;
  function drone(on, hard) {
    if (!ctx) return;
    if (on && !dr) {
      const g = ctx.createGain(); g.gain.value = 0; g.connect(busM);
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter();
      o1.type = 'sawtooth'; o2.type = 'sawtooth'; o1.frequency.value = 55; o2.frequency.value = 55.6;
      f.type = 'lowpass'; f.frequency.value = 220; f.Q.value = 4;
      o1.connect(f); o2.connect(f); f.connect(g); o1.start(); o2.start();
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 120; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
      dr = { g, o1, o2, f, lfo };
    }
    if (dr) {
      const now = ctx.currentTime; dr.g.gain.cancelScheduledValues(now); dr.g.gain.setValueAtTime(dr.g.gain.value, now);
      dr.g.gain.linearRampToValueAtTime(on ? (hard ? 0.5 : 0.28) : 0, now + 2);
      dr.o1.frequency.linearRampToValueAtTime(hard ? 49 : 55, now + 2); dr.o2.frequency.linearRampToValueAtTime(hard ? 49.8 : 55.6, now + 2);
    }
    if (on && hard) heartbeat();
  }
  let hbT = null;
  function heartbeat() {
    if (hbT) return;
    hbT = setInterval(() => { if (!bossOn) { clearInterval(hbT); hbT = null; return; } tone('sine', 60, 40, 0.005, 0.18, 0.25, busM); setTimeout(() => ctx && tone('sine', 55, 38, 0.005, 0.15, 0.18, busM), 180); }, 900);
  }
})(globalThis.G = globalThis.G || {});
