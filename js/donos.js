/* SINA · os donos dos quatro caminhos. Cada um tem o seu jeito de lutar, três fases e memória do que você faz:
   se você esquiva cedo, ele atrasa o golpe; se bate sem parar, ele devolve; se come ou carrega, ele castiga; se fica atrás, ele vira golpeando.
   Um golpe é uma função que roda quadro a quadro e devolve true quando termina. e.qf escolhe o desenho; e.aviso acende o aviso vermelho. */
(function () {
  'use strict';
  const J = window.Jogo, F = window.Fase, C = window.Dados, T = F.T, K = J.k;
  const { mover, caixa, cruza, fx, poeira, treme, som, voz, rnd, clamp, nasce, texto } = K;
  const arena = () => F.atual.arena || { x0: 60, x1: F.W * T - 60 };
  const piso = (x) => F.chao(x);
  const noArena = (x, m) => { const A = arena(); return clamp(x, A.x0 + (m || 50), A.x1 - (m || 50)); };

  // ---------- ferramentas dos golpes ----------
  function fere(e, box, mult, o) {
    let ok = false;
    for (const q of J.alvos()) if (!e.acertou.has(q) && cruza(box, caixa(q))) { e.acertou.add(q); if (J.fereAlvo(q, e.T.dano * mult * (e.fase === 3 ? 1.12 : 1), e, Object.assign({ veneno: e.T.veneno, forte: true }, o))) ok = true; }
    return ok;
  }
  const frente = (e, alc, alto, atras) => (e.dir > 0 ? { x0: e.x - (atras || 6), x1: e.x + alc, y0: e.y - alto, y1: e.y } : { x0: e.x - alc, x1: e.x + (atras || 6), y0: e.y - alto, y1: e.y });
  const passou = (e, dt, t) => e.t >= t && e.t - dt < t;
  const lado = (e) => Math.sign(J.heroi.x - e.x) || 1;
  function mola(e, v, dt) { e.vx += (v - e.vx) * Math.min(1, dt * 9); }
  // golpe corpo a corpo: arma, bate, descansa
  function bate(e, dt, g) {
    const p = g.prep * (e.atraso || 1) * (e.fase === 3 ? 0.88 : 1);
    if (e.t < p) {
      e.qf = g.qa == null ? 4 : g.qa; e.aviso = e.t / p; if (e.t < p * 0.8) e.dir = lado(e);
      mola(e, Math.abs(J.heroi.x - e.x) > g.alc * 0.75 ? e.dir * (g.chega || 40) : 0, dt); return false;
    }
    if (e.t - dt < p) { e.acertou = new Set(); e.vx = e.dir * (g.avanco || 0); if (g.sobe) e.vy = -g.sobe; som(g.som || 'golpe', 0.6, g.tom || 0.8); e.bateu = false; }
    const k = e.t - p; e.aviso = 0;
    if (k < g.dur) {
      e.qf = g.qb == null ? 5 : g.qb; fere(e, frente(e, g.alc, g.alto || e.h, g.atras), g.mult || 1, g.o);
      if (g.rastro && Math.random() < 0.7) fx({ tipo: 'poeira', x: e.x - e.dir * e.w * 0.4, y: e.y - 3, vx: -e.dir * 40, vy: -14, vida: 0.4, max: 0.4, tam: 4 });
      if (!g.desliza) mola(e, 0, dt * 0.35);
      if (g.bate && !e.bateu && k > g.dur * 0.45) { e.bateu = true; g.bate(e); }
      return false;
    }
    e.qf = g.fim || 0; mola(e, 0, dt); return e.t > p + g.dur + (g.rec || 0.3) && e.noChao;
  }
  function batida(e, alc) { treme(7); som('quebra', 0.8, 0.6); const x = e.x + e.dir * (alc || 40); J.faiscas(x, e.y - 2, 18, '#8a7c66', 1.2, 'pedra'); poeira(x, e.y, 10, e.dir); return x; }
  function onda(e, x, d, alc, mult, cor, dur) { J.magias.push({ tipo: 'onda', inimiga: true, x, y: piso(x), d, t: 0, dur: dur || 0.55, alc: alc || 200, dano: e.T.dano * mult, ja: new Set(), cor: cor || '#c08050', quem: e.tipo }); }
  function bala(e, tipo, ang, v, o) { J.balas.push(Object.assign({ dono: 'i', tipo, quem: e.tipo, x: e.x + e.dir * e.w * 0.4, y: e.y - e.h * 0.85, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, grav: 60, r: 5, dano: e.T.dano * 0.75, vida: 2.6, cor: '#b8e060', veneno: e.T.veneno, inimiga: true }, o || {})); }
  // cai no alvo: tempo fixo de voo
  function arco(e, tipo, alvoX, tempo, o) { const ox = e.x + e.dir * 14, oy = e.y - e.h, g = 520; J.balas.push(Object.assign({ dono: 'i', tipo, quem: e.tipo, x: ox, y: oy, vx: (alvoX - ox) / tempo, vy: (piso(alvoX) - 20 - oy) / tempo - g * tempo * 0.5, grav: g, r: 6, dano: e.T.dano * 0.8, vida: tempo + 0.6, cor: '#b8e060', inimiga: true }, o || {})); }
  function chama(e, l) { l.forEach((t, i) => { const x = noArena(e.x + (i % 2 ? 1 : -1) * (150 + i * 26), 60); const o = nasce(t, x, piso(x) - (e.T.esp === 'zumbi' ? 0 : 60), { estado: 'persegue', chamado: true, pisca: 0.6, t: -0.6, manha: 0.6 }); o.hp = o.hpMax = Math.round(o.hpMax * 0.55); J.inimigos.push(o); J.faiscas(x, piso(x) - 6, 14, '#8a7458', 1, 'pedra'); }); }
  const capangas = () => J.inimigos.filter((o) => o.vivo && !o.T.chefe).length;
  // salto em arco até um x, com queda de t segundos
  function pulaPara(e, x, t) { x = noArena(x); e.vx = (x - e.x) / t; e.vy = -K.G * t * 0.5; e.noChao = false; }

  // ---------- O Alfa Cravado: some, volta de outro lado, morde em sequência ----------
  const ALFA = {
    ritmo: [0.55, 0.4, 0.26], longe: 105, ronda: 130,
    golpes: {
      // um bote que mira onde você vai estar
      bote: { peso: (c) => (c.dist > 70 && c.dist < 280 ? 3 : 0.6), cd: 0.6, f(e, dt) {
        const p = 0.42 * (e.atraso || 1) * (e.fase === 3 ? 0.85 : 1);
        if (e.t < p) { e.qf = 4; e.aviso = e.t / p; e.dir = lado(e); mola(e, -e.dir * 30, dt); return false; }
        if (e.t - dt < p) { e.acertou = new Set(); const a = J.heroi, alvo = a.x + clamp(a.vx, -170, 170) * 0.28; e.vx = clamp((alvo - e.x) / 0.36, -470, 470); e.dir = Math.sign(e.vx) || e.dir; e.vy = -250; som('mordida', 0.7); }
        e.aviso = 0; e.qf = e.noChao ? 5 : 'p7'; if (e.t < p + 0.42) fere(e, frente(e, 48, 46, 30), 1);
        if (e.t > p + 0.36 && e.noChao) { e.vx *= Math.pow(0.001, dt); e.qf = 0; }
        return e.t > p + 0.62 && e.noChao;
      } },
      // três botes seguidos, passando por você e voltando
      tesoura: { peso: (c) => (c.fase >= 2 && c.dist < 260 ? 2.2 : 0), cd: 6, f(e, dt) {
        const n = e.fase === 3 ? 4 : 3; if (e.p == null) e.p = 0;
        const p = e.p ? 0.2 : 0.46;
        if (e.t < p) { e.qf = 4; e.aviso = e.t / p; e.dir = lado(e); mola(e, 0, dt); return false; }
        if (e.t - dt < p) { e.acertou = new Set(); e.vx = clamp((J.heroi.x + e.dir * 90 - e.x) / 0.34, -520, 520); e.vy = -150; som('mordida', 0.6, 1.1); }
        e.qf = e.noChao ? 'p5' : 'p7'; e.aviso = 0; fere(e, frente(e, 44, 44, 26), 0.8);
        if (e.t > p + 0.34 && e.noChao) { e.vx *= 0.2; if (++e.p < n) { e.t = 0; return false; } e.qf = 0; if (e.t > p + 0.8) return true; }
        return false;
      } },
      // mordidas coladas: a terceira atrasa de propósito
      mordidas: { peso: (c) => (c.dist < 78 ? 3 : 0), cd: 1.2, f(e, dt) {
        const g = [{ prep: 0.26, dur: 0.16, alc: 62, alto: 40, avanco: 190, rec: 0.02, mult: 0.75, som: 'mordida', qb: 'p5' }, { prep: 0.16, dur: 0.16, alc: 62, alto: 40, avanco: 190, rec: 0.02, mult: 0.75, som: 'mordida', qb: 'p5' }, { prep: 0.52, dur: 0.22, alc: 74, alto: 50, avanco: 280, rec: 0.5, mult: 1.2, som: 'mordida', tom: 0.6, qa: 'p6', qb: 'p5', o: { prende: 1 } }];
        if (e.p == null) e.p = 0; if (bate(e, dt, g[e.p])) { if (++e.p >= (e.fase === 1 ? 2 : 3)) return true; e.t = 0; } return false;
      } },
      // foge da vista e atravessa a arena correndo
      sombra: { peso: (c) => (c.fase >= 2 ? 1.6 : 0), cd: 9, f(e, dt) {
        const A = arena(), n = e.fase === 3 ? 3 : 2;
        if (e.p == null) { e.p = 0; e.sai = e.x < (A.x0 + A.x1) / 2 ? -1 : 1; }
        if (e.t < 0.6 && e.p === 0) { e.qf = 'p' + (Math.floor(e.andou / 22) % 4); e.dir = e.sai; e.vx = e.sai * 420; e.some = 1 - e.t / 0.6; if (Math.random() < 0.8) poeira(e.x, e.y, 2, -e.sai); return false; }
        e.some = 0; e.sob = true;
        if (e.p % 2 === 0) { // escolhe o lado e avisa com os olhos
          e.vx = 0; if (e.t < 1.15) { if (e.corre == null) e.corre = Math.random() < 0.5 ? 1 : -1; e.x = e.corre > 0 ? A.x0 + 48 : A.x1 - 48; e.y = piso(e.x); e.dir = e.corre; e.olhos = Math.min(1, e.t - 0.5 > 0 ? (e.t - 0.5) * 3 : 0); if (passou(e, dt, 0.75)) som('rugido', 0.5, 1.4); return false; }
          e.acertou = new Set(); e.p++; e.t = 2; som('mordida', 0.8, 0.7);
        }
        e.sob = false; e.olhos = 0; e.some = 1; e.qf = 'p' + (Math.floor(e.andou / 22) % 4); e.vx = e.corre * 520; e.dir = e.corre; fere(e, frente(e, 46, 46, 30), 1.15);
        if (Math.random() < 0.6) poeira(e.x - e.dir * 30, e.y, 2, -e.dir);
        if (e.corre > 0 ? e.x > A.x1 - 54 : e.x < A.x0 + 54) { e.p++; e.corre = null; e.vx = 0; if (e.p >= n * 2) { e.some = null; return true; } e.t = 0.35; e.sob = true; }
        return false;
      }, fim(e) { e.sob = false; e.some = null; e.olhos = 0; e.corre = null; } },
      // salta por cima e morde as costas
      costas: { peso: (c) => (c.dist < 110 && c.aberto ? 2.5 : c.dist < 110 ? 1 : 0), cd: 3, f(e, dt) {
        if (e.t - dt <= 0) { e.dir = lado(e); pulaPara(e, J.heroi.x + e.dir * 74, 0.5); som('golpe', 0.4, 1.5); }
        e.qf = 'p7'; if (e.t > 0.34 && e.noChao) return encadeia(e, 'mordidas'); return e.t > 1.4;
      } },
      uivo: { peso: (c) => (c.fase >= 2 && capangas() < 1 && c.dist > 130 ? 1.4 : 0), cd: 20, f(e, dt) { e.vx = 0; e.qf = 'p4'; if (passou(e, dt, 0.5)) { som('uivo', 1); J.anel(e.x, e.y - 50, 120, '#c8d4ff', 0.7, 3); chama(e, e.fase === 3 ? ['lobo_negro', 'lobo_negro'] : ['lobo', 'lobo']); } return e.t > 1.1; } },
    },
    contra: ['costas', 'recuo'], castigo: 'bote', virada: ['lobo', 'lobo_negro'], cor: '#c8d4ff',
  };

  // ---------- A Rainha Pálida: cospe, mergulha na terra, envenena o chão ----------
  const RAINHA = {
    ritmo: [0.7, 0.5, 0.34], longe: 120, ronda: 120,
    golpes: {
      bote: { peso: (c) => (c.dist < 150 ? 3 : 0), cd: 0.8, f(e, dt) { return bate(e, dt, { prep: 0.5, dur: 0.26, alc: 92, alto: 52, avanco: 300, rec: 0.42, som: 'mordida', tom: 0.7, desliza: true, qb: 'p0' }); } },
      // dois botes: um alto e rápido, um baixo e tardio
      engana: { peso: (c) => (c.dist < 150 && c.fase >= 2 ? 2.4 : 0), cd: 3, f(e, dt) {
        const g = [{ prep: 0.34, dur: 0.18, alc: 80, alto: 52, avanco: 160, rec: 0.02, mult: 0.7, som: 'mordida' }, { qa: 'p7', qb: 'p0', prep: 0.62, dur: 0.28, alc: 104, alto: 50, avanco: 360, rec: 0.5, mult: 1.2, som: 'mordida', tom: 0.6, desliza: true }];
        if (e.p == null) e.p = 0; if (bate(e, dt, g[e.p])) { if (++e.p > 1) return true; e.t = 0; } return false;
      } },
      // varre o chão com a cauda dos dois lados: pule
      cauda: { peso: (c) => (c.dist < 110 ? (c.atras || c.dist < 50 ? 3 : 1.2) : 0), cd: 3, f(e, dt) {
        const p = 0.46 * (e.atraso || 1); if (e.t < p) { e.qf = 'p7'; e.aviso = e.t / p; mola(e, 0, dt); return false; }
        if (e.t - dt < p) { e.acertou = new Set(); som('golpe', 0.8, 0.5); treme(4); for (const d of [-1, 1]) onda(e, e.x + d * 20, d, e.fase === 3 ? 260 : 170, 0.7, '#d8d0b0', 0.5); }
        e.aviso = 0; e.qf = 'p4'; if (e.t < p + 0.24) fere(e, { x0: e.x - 96, x1: e.x + 96, y0: e.y - 24, y1: e.y }, 0.9); if (e.t < p + 0.3 && Math.random() < 0.9) fx({ tipo: 'poeira', x: e.x + rnd(-90, 90), y: e.y - 3, vx: rnd(-60, 60), vy: -20, vida: 0.4, max: 0.4, tam: 4 });
        return e.t > p + 0.62;
      } },
      leque: { peso: (c) => (c.dist > 110 ? 2.4 : 0.3), cd: 2.2, f(e, dt) {
        e.dir = lado(e); mola(e, 0, dt); e.qf = e.t < 0.45 ? 'p2' : 'p3'; e.aviso = e.t < 0.45 ? e.t / 0.45 : 0;
        const salva = e.fase === 1 ? 1 : 2; for (let k = 0; k < salva; k++) if (passou(e, dt, 0.46 + k * 0.4)) { const a = Math.atan2(J.heroi.y - 34 - (e.y - e.h * 0.85), J.heroi.x - e.x), m = e.fase === 3 ? [-0.36, -0.12, 0.12, 0.36] : [-0.26, 0, 0.26]; for (const q of m) bala(e, 'veneno', a + q + (k ? 0.1 : 0), 250 + k * 30); som('mordida', 0.7, 0.8); }
        return e.t > 0.46 + salva * 0.4;
      } },
      // chuva de veneno: marca o chão e deixa poças
      chuva: { peso: (c) => (c.fase >= 2 && c.dist > 90 ? 1.6 : 0), cd: 8, f(e, dt) {
        e.vx = 0; e.qf = e.t < 0.5 ? 'p2' : 'p3'; e.aviso = e.t < 0.5 ? e.t * 2 : 0;
        if (passou(e, dt, 0.55)) { som('mordida', 0.9, 0.6); const n = e.fase === 3 ? 7 : 5; for (let i = 0; i < n; i++) { const x = noArena(J.heroi.x + (i - (n - 1) / 2) * 74 + rnd(-12, 12)); arco(e, 'veneno', x, 0.95 + Math.abs(i - n / 2) * 0.08, { poca: true, r: 7 }); } }
        return e.t > 1.05;
      } },
      // some na terra e sai debaixo de você
      mergulho: { peso: (c) => (c.fase >= 2 ? 1.7 : c.dist > 220 ? 1 : 0), cd: 7, f(e, dt) {
        const n = e.fase === 3 ? 3 : e.fase === 2 ? 2 : 1; if (e.p == null) e.p = 0;
        if (e.p === 0 && e.t < 0.6) { e.vx = 0; e.qf = 3; e.some = 1 - e.t / 0.6; e.afunda = e.t / 0.6 * 60; if (Math.random() < 0.8) J.faiscas(e.x + rnd(-24, 24), e.y, 2, '#6a5a3a', 0.8, 'pedra'); return false; }
        if (e.p === 0) { e.p = 1; e.t = 0; e.some = 0; }
        e.sob = true; e.some = 0; e.afunda = 60;
        if (e.p % 2 === 1) { // persegue por baixo
          const d = J.heroi.x - e.x; e.vx = Math.sign(d) * Math.min(330, Math.abs(d) * 6); e.montinho = e.x; if (Math.random() < 0.8) { poeira(e.x, e.y, 1, 0); J.faiscas(e.x + rnd(-10, 10), e.y, 1, '#6a5a3a', 0.6, 'pedra'); }
          if (e.t > (e.p === 1 ? 1.0 : 0.7)) { e.p++; e.t = 0; e.vx = 0; som('quebra', 0.5, 0.8); }
          return false;
        }
        if (e.t < 0.42) { e.vx = 0; treme(2); e.montinho = e.x; J.faiscas(e.x + rnd(-20, 20), e.y, 2, '#8a7448', 1, 'pedra'); return false; }
        e.montinho = null; if (e.t - dt < 0.42) { e.acertou = new Set(); e.vy = -330; som('mordida', 1, 0.7); treme(7); J.faiscas(e.x, e.y, 24, '#8a7448', 1.4, 'pedra'); }
        e.sob = false; e.some = null; e.afunda = 0; e.qf = e.noChao ? 'p6' : 'p5'; e.dir = lado(e); if (e.t < 0.75) fere(e, { x0: e.x - 34, x1: e.x + 34, y0: e.y - 80, y1: e.y }, 1.15);
        if (e.t > 0.85 && e.noChao) { if (e.p >= n * 2) { e.qf = 0; return e.t > 1.35; } e.p++; e.t = 0; }
        return false;
      }, fim(e) { e.sob = false; e.some = null; e.afunda = 0; e.montinho = null; } },
      ninhada: { peso: (c) => (c.fase === 3 && capangas() < 1 ? 1.2 : 0), cd: 22, f(e, dt) { e.vx = 0; e.qf = 'p2'; if (passou(e, dt, 0.5)) { som('rugido', 0.8, 1.3); chama(e, ['cobra_coral', 'cobra_coral', 'cobra']); } return e.t > 1; } },
    },
    contra: ['cauda', 'mergulho'], castigo: 'leque', virada: ['cobra', 'cobra_coral'], cor: '#d8f0a0',
  };

  // ---------- O Carcereiro: ritmo quebrado, corrente, mãos e névoa ----------
  const CARC = {
    ritmo: [0.6, 0.45, 0.3], longe: 62, ronda: 90,
    golpes: {
      // a sequência muda: nunca se sabe se vem a última
      sequencia: { peso: (c) => (c.dist < 96 ? 3.4 : 0.4), cd: 0.5, f(e, dt) {
        if (e.p == null) { e.p = 0; e.total = 2 + Math.floor(Math.random() * (e.fase + 1)); }
        const ult = e.p === e.total - 1, g = ult ? { prep: 0.6, dur: 0.24, alc: 82, alto: 66, avanco: 240, rec: 0.6, mult: 1.2, tom: 0.5, qa: 'p5', qb: 'p6', fim: 'p6', bate: (q) => { const x = batida(q, 46); if (q.fase >= 2) onda(q, x, q.dir, 170, 0.6, '#b8a0c8'); } } : { prep: e.p ? [0.22, 0.4, 0.28][(e.p + e.sorte) % 3] : 0.48, dur: 0.18, alc: 70, alto: 62, avanco: 200, rec: 0.04, mult: 0.8, chega: 90 };
        if (bate(e, dt, g)) { if (++e.p >= e.total) return true; e.t = 0; } return false;
      } },
      estocada: { peso: (c) => (c.dist > 80 && c.dist < 240 ? 2.6 : 0.2), cd: 1.8, f(e, dt) { return bate(e, dt, { prep: 0.56, dur: 0.3, alc: 84, alto: 48, avanco: 560, rec: 0.5, mult: 1.1, desliza: true, rastro: true, tom: 1.2, qb: 'p4' }); } },
      // joga a corrente e puxa
      corrente: { peso: (c) => (c.dist > 150 ? 2.6 : 0), cd: 5, f(e, dt) {
        const p = 0.5; e.dir = e.t < p ? lado(e) : e.dir; mola(e, 0, dt);
        if (e.t < p) { e.qf = 4; e.aviso = e.t / p; return false; }
        e.aviso = 0; e.qf = 'p7'; if (e.t - dt < p) som('corrente', 0.7, 0.9); const k = e.t - p; e.cx = Math.min(330, k * 900); e.cy = e.y - 38;
        if (!e.pegou && k < 0.42) { const px = e.x + e.dir * e.cx, h = J.heroi; if (cruza({ x0: Math.min(e.x, px), x1: Math.max(e.x, px), y0: e.cy - 8, y1: e.cy + 8 }, caixa(h)) && Math.abs(px - h.x) < 40 && J.feriHeroi(e.T.dano * 0.35, e.x, e.tipo, {})) { e.pegou = 1; som('quebra', 0.6, 1.5); } }
        if (e.pegou && k < 0.9) { const h = J.heroi, d = e.x + e.dir * 46 - h.x; h.vx = clamp(d * 7, -560, 560); h.estado = 'dor'; h.t = 0; e.cx = Math.abs(h.x - e.x); if (Math.abs(d) < 20) { e.cx = null; e.pegou = 0; return encadeia(e, 'sequencia'); } }
        if (k > (e.pegou ? 0.9 : 0.55)) { e.cx = null; e.pegou = 0; return true; } return false;
      }, fim(e) { e.cx = null; e.pegou = 0; } },
      // mãos brotam: numa fila que anda até você, ou em volta
      maos: { peso: (c) => (c.dist > 110 ? 1.8 : 0.5), cd: 4, f(e, dt) {
        e.vx = 0; e.qf = e.t < 0.5 ? 'p5' : 'p6'; e.aviso = e.t < 0.5 ? e.t * 2 : 0;
        if (passou(e, dt, 0.5)) { batida(e, 30); const h = J.heroi, poe = (x, at) => { x = noArena(x, 24); J.magias.push({ tipo: 'maos', x, y: piso(x), t: -at, dur: 0.6, dano: e.T.dano * 0.75, ja: new Set(), cor: '#b8a0c8' }); }; if (e.fase === 1 || Math.random() < 0.5) for (let i = 1; i <= 6; i++) poe(e.x + lado(e) * i * 54, 0.12 + i * 0.13); else { for (const d of [-1, 1]) for (let i = 1; i <= 3; i++) poe(h.x + d * i * 40, 0.5); poe(h.x, 1.15); } }
        return e.t > 1;
      } },
      // dissolve na névoa e reaparece atrás
      nevoa: { peso: (c) => (c.fase >= 2 ? (c.aberto ? 2.6 : 1.5) : 0), cd: 6, f(e, dt) {
        if (e.t < 0.35) { e.vx = 0; e.some = 1 - e.t / 0.35; if (Math.random() < 0.9) fx({ tipo: 'nuvem', x: e.x + rnd(-18, 18), y: e.y - rnd(0, 60), vy: -14, vida: 0.8, max: 0.8, cor: '150,130,170', tam: rnd(10, 18) }); return false; }
        if (e.t < 0.95) { e.sob = true; e.some = 0; e.vx = 0; return false; }
        if (e.t - dt < 0.95) { const h = J.heroi; e.x = noArena(h.x - h.dir * 58); e.y = piso(e.x); e.dir = lado(e); som('golpe', 0.5, 0.6); for (let i = 0; i < 12; i++) fx({ tipo: 'nuvem', x: e.x + rnd(-20, 20), y: e.y - rnd(0, 60), vy: -10, vida: 0.7, max: 0.7, cor: '150,130,170', tam: rnd(10, 18) }); }
        e.sob = false; e.some = null; return encadeia(e, e.fase === 3 ? 'sequencia' : 'giro');
      }, fim(e) { e.sob = false; e.some = null; } },
      giro: { peso: (c) => (c.dist < 80 && c.atras ? 3 : c.dist < 60 ? 0.8 : 0), cd: 2, f(e, dt) { return bate(e, dt, { prep: 0.34, dur: 0.24, alc: 72, atras: 72, alto: 60, avanco: 0, rec: 0.45, mult: 0.95, tom: 0.6 }); } },
      enterrados: { peso: (c) => (c.fase === 3 && capangas() < 1 ? 1.2 : 0), cd: 24, f(e, dt) { e.vx = 0; e.qf = 'p5'; if (passou(e, dt, 0.6)) { som('rugido', 0.9, 0.7); treme(6); chama(e, ['zumbi_mulher', 'zumbi_lanca']); } return e.t > 1.1; } },
    },
    contra: ['giro', 'nevoa'], castigo: 'estocada', virada: ['zumbi', 'zumbi_mulher'], cor: '#c8b0e0',
  };

  // ---------- Gurgo: pesado, joga coisas, corre de ombro e derruba o teto ----------
  const GURGO = {
    ritmo: [0.65, 0.5, 0.32], longe: 70, ronda: 100,
    golpes: {
      machado: { peso: (c) => (c.dist < 96 ? 3 : 0), cd: 0.6, f(e, dt) {
        const n = e.fase === 1 ? 1 : e.fase === 2 ? 2 : 3; if (e.p == null) e.p = 0; const ult = e.p === n - 1;
        const g = { prep: e.p ? 0.3 : 0.56, dur: 0.24, alc: 84, alto: 66, avanco: 150, rec: ult ? 0.6 : 0.05, mult: ult ? 1.15 : 0.85, tom: 0.5, qb: 'p4', fim: 'p4', chega: 70, bate: (q) => { const x = batida(q, 48); onda(q, x, q.dir, 200, 0.6); if (q.fase === 3 && ult) onda(q, x, -q.dir, 200, 0.6); } };
        if (bate(e, dt, g)) { if (++e.p >= n) return true; e.t = 0; } return false;
      } },
      salto: { peso: (c) => (c.dist > 130 ? 2.6 : c.ar ? 1.5 : 0.4), cd: 3, f(e, dt) {
        const n = e.fase === 3 ? 2 : 1; if (e.p == null) e.p = 0; const p = e.p ? 0.2 : 0.5;
        if (e.t < p) { e.qf = 4; e.aviso = e.t / p; e.vx = 0; e.dir = lado(e); return false; }
        if (e.t - dt < p) { e.acertou = new Set(); const h = J.heroi; pulaPara(e, h.x + clamp(h.vx, -160, 160) * 0.35, 0.72); som('rugido', 0.6); }
        e.aviso = 0; e.qf = e.noChao ? 'p4' : 'p6'; if (e.t > p + 0.5) fere(e, { x0: e.x - 34, x1: e.x + 34, y0: e.y - 60, y1: e.y }, 1.1);
        if (e.t > p + 0.4 && e.noChao) { batida(e, 0); for (const d of [-1, 1]) onda(e, e.x, d, 230, 0.75); if (++e.p < n) { e.t = 0; return false; } e.vx = 0; e.descansa = 0.55; return true; }
        return false;
      } },
      // corrida de ombro: se acertar a parede, fica tonto
      ombro: { peso: (c) => (c.dist > 110 ? 2.2 : 0.5), cd: 6, f(e, dt) {
        const A = arena(); if (e.t < 0.62) { e.qf = 4; e.aviso = e.t / 0.62; e.vx = -lado(e) * 40; e.dir = lado(e); if (passou(e, dt, 0.3)) som('rugido', 0.6, 0.8); return false; }
        if (e.t - dt < 0.62) { e.acertou = new Set(); e.corre = e.dir; e.volta = 0; }
        e.aviso = 0; e.qf = 'p' + (Math.floor(e.andou / 16) % 4); e.vx = e.corre * (e.fase === 3 ? 470 : 400); e.dir = e.corre; if (Math.random() < 0.8) poeira(e.x - e.dir * 20, e.y, 2, -e.dir); if (fere(e, frente(e, 40, 60, 10), 1.1)) { J.heroi.vx = e.corre * 420; J.heroi.vy = -260; }
        const fim = e.corre > 0 ? e.x > A.x1 - 62 : e.x < A.x0 + 62;
        if (fim) { batida(e, 20); treme(12); e.corre = null; e.vx = 0; pedras(e, e.fase); e.estado = 'cambaleia'; e.t = 0; e.dur = 1.5; texto(e.x, e.y - e.h - 12, 'tonto', '#ffd27a', true); return false; }
        return e.t > 3;
      }, fim(e) { e.corre = null; } },
      barril: { peso: (c) => (c.dist > 130 ? 2.2 : 0.3), cd: 3, f(e, dt) {
        e.dir = lado(e); mola(e, 0, dt); e.qf = e.t < 0.3 ? 4 : 'p5'; e.aviso = e.t < 0.45 ? e.t / 0.45 : 0; const n = e.fase; for (let k = 0; k < n; k++) if (passou(e, dt, 0.46 + k * 0.26)) { const h = J.heroi; arco(e, 'barril', noArena(h.x + h.vx * 0.5 * (k ? 0.3 : 1) + (k ? rnd(-50, 50) : 0)), 0.8, { estoura: 46, cor: '#ff9a40', r: 8, veneno: 0 }); som('golpe', 0.5, 0.7); }
        return e.t > 0.7 + n * 0.26;
      } },
      // bate o pé e o teto cai
      teto: { peso: (c) => (c.fase >= 2 ? 1.5 : 0), cd: 9, f(e, dt) { e.vx = 0; e.qf = e.t < 0.55 ? 'p6' : 'p4'; e.aviso = e.t < 0.55 ? e.t / 0.55 : 0; if (passou(e, dt, 0.56)) { batida(e, 10); treme(12); pedras(e, e.fase + 3); } return e.t > 1; } },
      chute: { peso: (c) => (c.dist < 64 ? (c.atras ? 3 : 1.2) : 0), cd: 2, f(e, dt) { return bate(e, dt, { prep: 0.26, dur: 0.16, alc: 58, atras: e.atrasou ? 58 : 6, alto: 50, avanco: 90, rec: 0.35, mult: 0.6, tom: 1.1, o: {}, bate: () => { const h = J.heroi; if (e.acertou.has(h) && h.estado === 'dor') { h.vx = e.dir * 440; h.vy = -230; } } }); } },
      bando: { peso: (c) => (c.fase >= 2 && capangas() < 1 && c.dist > 120 ? 1.1 : 0), cd: 24, f(e, dt) { e.vx = 0; e.qf = 'p7'; if (passou(e, dt, 0.5)) { som('rugido', 1, 1.2); chama(e, e.fase === 3 ? ['goblin_arco', 'goblin_guerreiro'] : ['goblin', 'goblin_arco']); } return e.t > 1; } },
    },
    contra: ['chute', 'salto'], castigo: 'barril', virada: ['goblin', 'goblin'], cor: '#ffb070',
  };
  function pedras(e, n) { const h = J.heroi; for (let i = 0; i < n + 1; i++) { const x = noArena(i === 0 ? h.x : h.x + rnd(-190, 190), 30); J.magias.push({ tipo: 'queda', x, y: piso(x), t: -0.15 * i, dur: 1.15, dano: e.T.dano * 0.7, ja: new Set(), quem: e.tipo }); } }

  const CAPATAZ = Object.assign({}, GURGO, { ritmo: [0.6, 0.46, 0.3], cor: '#e0a060', virada: ['rastejante', 'rastejante'], golpes: Object.assign({}, GURGO.golpes, {
    bando: { peso: (c) => (c.fase >= 2 && capangas() < 1 && c.dist > 120 ? 1.2 : 0), cd: 20, f(e, dt) { e.vx = 0; e.qf = 6; if (passou(e, dt, 0.5)) { som('quebra', 1, 0.6); treme(8); chama(e, e.fase === 3 ? ['rastejante', 'minerador', 'rastejante'] : ['rastejante', 'rastejante']); } return e.t > 1.1; } },
  }) });
  // o Caboclo d'Água: luta como o Gurgo, chama a gente da maré e, ferido, puxa a maré alta
  const CABOCLO = Object.assign({}, GURGO, { ritmo: [0.62, 0.48, 0.32], cor: '#7fd0c0', virada: ['caranguejo', 'caranguejo'], golpes: Object.assign({}, GURGO.golpes, {
    bando: { peso: (c) => (c.fase >= 2 && capangas() < 1 && c.dist > 120 ? 1.2 : 0), cd: 18, f(e, dt) { e.vx = 0; e.qf = 4; if (passou(e, dt, 0.5)) { som('bolha', 1, 0.5); treme(6); J.mareAlta = 9; chama(e, e.fase === 3 ? ['caranguejo', 'afogado', 'caranguejo'] : ['caranguejo', 'caranguejo']); } return e.t > 1.1; } },
  }) });
  // o Primeiro Molde: luta como o Gurgo, chama os rejeitados e solta um sopro de fogo do peito
  const MOLDE = Object.assign({}, GURGO, { ritmo: [0.6, 0.46, 0.3], cor: '#e09060', virada: ['pote', 'pote'], golpes: Object.assign({}, GURGO.golpes, {
    bando: { peso: (c) => (c.fase >= 2 && capangas() < 1 && c.dist > 120 ? 1.2 : 0), cd: 18, f(e, dt) { e.vx = 0; e.qf = 4; if (passou(e, dt, 0.5)) { som('fogo', 1, 0.6); treme(6); chama(e, e.fase === 3 ? ['boneco', 'pote', 'boneco'] : ['pote', 'boneco']); } return e.t > 1.1; } },
  }) });
  // o Coração Mutado: luta como o Gurgo, chama os fundidos e o chão treme de energia
  const MUTACAO = Object.assign({}, GURGO, { ritmo: [0.58, 0.44, 0.28], cor: '#70e0d0', virada: ['fundido', 'fundido'], golpes: Object.assign({}, GURGO.golpes, {
    bando: { peso: (c) => (c.fase >= 2 && capangas() < 1 && c.dist > 120 ? 1.2 : 0), cd: 17, f(e, dt) { e.vx = 0; e.qf = 4; if (passou(e, dt, 0.5)) { som('magia', 1, 0.5); treme(8); chama(e, e.fase === 3 ? ['fundido', 'queimado', 'fundido'] : ['fundido', 'queimado']); } return e.t > 1.1; } },
  }) });
  const DONOS = { alfa: ALFA, rainha: RAINHA, carcereiro: CARC, chefe: GURGO, capataz: CAPATAZ, caboclo: CABOCLO, molde: MOLDE, mutacao: MUTACAO };
  J.DONOS = DONOS;

  // ---------- escolher e encadear ----------
  function comeca(e, id) { const D = DONOS[e.tipo]; e.golpe = id; e.estado = 'acao'; e.t = 0; e.p = null; e.acertou = new Set(); e.sorte = Math.floor(Math.random() * 3); e.bateu = false; e.levou = 0; if (Math.random() < 0.5) voz(e, 'ataque'); e.cds = e.cds || {}; e.cds[id] = J.relogio + D.golpes[id].cd; e.ultimo = id;
    // você esquiva cedo demais? ele segura o golpe
    e.atraso = e.cedo > 1 && Math.random() < 0.3 + e.cedo * 0.12 ? rnd(1.35, 1.65) : Math.random() < 0.12 * e.fase ? rnd(0.8, 0.9) : 1; }
  function encadeia(e, id) { limpa(e); comeca(e, id); e.t = 0.12; return false; }
  function limpa(e) { const g = DONOS[e.tipo].golpes[e.golpe]; if (g && g.fim) g.fim(e); e.golpe = null; e.aviso = 0; e.qf = null; e.atraso = 1; }
  function acaba(e) { limpa(e); e.estado = 'persegue'; e.t = 0; e.espera = (DONOS[e.tipo].ritmo[e.fase - 1] + (e.descansa || 0)) * rnd(0.7, 1.25); e.descansa = 0; }
  function aberto() { const h = J.heroi; return ['come', 'colhe', 'magia', 'mira', 'carga'].includes(h.estado) || h.vigor < 8 || (h.estado === 'golpe' && h.final && h.t > h.dur * 0.55) || (h.estado === 'forte' && h.t > h.dur * 0.6); }
  function escolhe(e) {
    const D = DONOS[e.tipo], h = J.heroi, dx = h.x - e.x;
    const c = { dist: Math.abs(dx), fase: e.fase, ar: h.y < e.y - 46, atras: Math.sign(dx) !== e.dir, aberto: aberto() };
    let tot = 0; const l = [];
    for (const id in D.golpes) { const g = D.golpes[id]; if ((e.cds && e.cds[id] > J.relogio)) continue; let p = g.peso(c); if (id === e.ultimo) p *= 0.3; if (c.aberto && id === D.castigo) p += 3; if (p > 0) { l.push([id, p]); tot += p; } }
    if (!l.length) return null; let r = Math.random() * tot; for (const [id, p] of l) { r -= p; if (r <= 0) return id; } return l[0][0];
  }
  // apanhou na hora parada: devolve
  J.apanhouDono = function (e) {
    e.levou = (e.tLevou > 0 ? e.levou || 0 : 0) + 1; e.tLevou = 1.6;
    if (e.estado !== 'persegue' || e.levou < 2 || Math.random() > 0.3 + e.levou * 0.15) return;
    const D = DONOS[e.tipo]; let id = D.contra[Math.random() < 0.6 ? 0 : 1];
    e.levou = 0;
    if (id === 'recuo' || !D.golpes[id] || (e.cds && e.cds[id] > J.relogio) || D.golpes[id].peso({ dist: 50, fase: e.fase, atras: true, aberto: true }) <= 0) { e.estado = 'recuo'; e.t = 0; e.vx = -lado(e) * 320; e.vy = -170; e.esq = 0.25; return; }
    comeca(e, id); e.t = 0.1; e.atrasou = Math.sign(J.heroi.x - e.x) !== e.dir; e.dir = lado(e);
  };

  // ---------- um quadro do dono ----------
  J.passoDono = function (e, dt) {
    const tp = e.T, h = J.heroi, D = DONOS[e.tipo], A = arena();
    e.t += dt; e.flash = Math.max(0, e.flash - dt); e.pisca = Math.max(0, e.pisca - dt); e.ferido = Math.max(0, (e.ferido || 0) - dt); e.semCamb = Math.max(0, (e.semCamb || 0) - dt); e.esq = Math.max(0, (e.esq || 0) - dt); e.tLevou = Math.max(0, (e.tLevou || 0) - dt);
    if (e.fase == null) { e.fase = 1; e.cedo = 0; e.espera = 0.5; }
    if (e.estado === 'morto') { e.some = null; e.sob = false; e.qf = null; e.vy = Math.min(K.QUEDA, e.vy + K.G * dt); e.vx *= Math.pow(0.05, dt); mover(e, dt); return; }
    if (e.veneno > 0) { e.veneno -= dt; e.venT = (e.venT || 0) + dt; if (e.venT > 0.6) { e.venT = 0; const d = K.tem('cobra', 3) ? 6 : 3; e.hp -= d; texto(e.x, e.y - e.h - 6, d, '#b8e060'); if (e.hp <= 0) { limpa(e); K.morreInimigo(e, e.dir, true); return; } } }
    // firmeza volta se ninguém bate
    if (e.tLevou <= 0) e.firmeza = Math.min(tp.firme, e.firmeza + dt * tp.firme * 0.025);
    // repara em quem esquiva antes da hora
    if (h.estado === 'rola' && h.t < 0.03 + dt && e.estado === 'acao') { if (e.aviso > 0 && e.aviso < 0.62) e.cedo = Math.min(4, e.cedo + 1); else e.cedo = Math.max(0, e.cedo - 0.25); }
    // virada de fase
    const querFase = e.hp < e.hpMax * 0.34 ? 3 : e.hp < e.hpMax * 0.68 ? 2 : 1;
    if (querFase > e.fase && e.estado !== 'vaga' && e.estado !== 'virada') { if (e.golpe) limpa(e); e.fase = querFase; e.estado = 'virada'; e.t = 0; e.firmeza = tp.firme; e.sob = false; e.some = null; if (Math.abs(e.vy) > 10) e.vy = 0; }
    const dx = h.x - e.x, dist = Math.abs(dx), l = Math.sign(dx) || 1;
    switch (e.estado) {
      case 'vaga': { e.vx = 0; if (h.estado !== 'morto' && dist < tp.visao && h.x > A.x0 + 60 && h.x < A.x1) { e.estado = 'virada'; e.t = 0.2; e.abre = true; J.acordaChefe(e); } break; }
      case 'virada': {
        e.vx = 0; e.dir = l; e.esq = 0.1; e.qf = e.t < 0.35 ? 4 : { alfa: 'p4', rainha: 'p2', carcereiro: 'p5', chefe: 'p7' }[e.tipo];
        if (passou(e, dt, 0.5)) { voz(e, 'alerta'); if (tp.esp === 'lobo') som('uivo', 0.8, 0.8); treme(9); for (const r of [70, 130, 190]) J.anel(e.x, e.y - e.h * 0.6, r, D.cor, 0.5 + r / 400, 3); J.faiscas(e.x, e.y - e.h * 0.5, 30, D.cor, 1.5, 'brasa'); if (dist < 120 && !e.abre) { h.vx = l * 330; h.vy = -150; } if (!e.abre && capangas() < 2) chama(e, e.fase === 3 ? D.virada.slice(0, 1) : D.virada); }
        if (e.t > 1.15) { e.abre = false; e.qf = null; acaba(e); e.espera = 0.3; }
        break;
      }
      case 'persegue': {
        e.qf = null; if (dist > 10) e.dir = l;
        const fica = D.longe, v = tp.vel * (1 + (e.fase - 1) * 0.14);
        // ronda: chega, para na distância dele, entra e sai
        let m = 0; if (dist > D.ronda) m = l; else if (dist < fica * 0.6 && e.t < e.espera * 0.7) m = -l; else m = Math.sin(J.relogio * 2.1 + e.ox) > 0.3 ? l : Math.sin(J.relogio * 2.1 + e.ox) < -0.6 ? -l : 0;
        if ((m > 0 && e.x > A.x1 - 56) || (m < 0 && e.x < A.x0 + 56)) m = 0;
        mola(e, m * v * (dist > D.ronda ? 1 : 0.5), dt);
        const castiga = aberto() && dist < 300;
        if ((e.t > (e.espera || 0.4) || (castiga && e.t > 0.08)) && e.noChao && h.estado !== 'morto') { const id = escolhe(e); if (id) { e.atrasou = Math.sign(dx) !== e.dir; comeca(e, id); } }
        break;
      }
      case 'acao': { const g = D.golpes[e.golpe]; if (!g) { acaba(e); break; } const id = e.golpe; if (g.f(e, dt) && e.golpe === id && e.estado === 'acao') acaba(e); else if (e.estado !== 'acao') limpa(e); if (e.t > 9) acaba(e); break; }
      case 'recuo': { e.qf = e.tipo === 'alfa' ? 'p6' : e.tipo === 'rainha' ? 'p7' : 3; if (e.t > 0.2) e.vx *= Math.pow(0.02, dt); if (e.t > 0.4 && e.noChao) { e.estado = 'persegue'; e.t = 1; e.espera = 0; } break; }
      case 'cambaleia': { if (e.golpe) limpa(e); e.sob = false; e.some = null; e.qf = 6; e.vx *= Math.pow(0.02, dt); if (e.t > (e.dur || 1.5)) { acaba(e); e.espera = 0.12; e.cedo = 0; } break; }
      default: acaba(e);
    }
    if (e.sob && e.golpe !== 'nevoa') { /* debaixo da terra ou fora de vista */ }
    e.vy = Math.min(K.QUEDA, e.vy + K.G * dt);
    const antes = e.x; mover(e, dt); e.andou += Math.abs(e.x - antes);
    e.x = clamp(e.x, A.x0 + 46, A.x1 - 46);
  };

  // ---------- pedras do teto e poças ----------
  J.passoMagiaDono = function (m) {
    const h = J.heroi;
    if (m.tipo !== 'queda' || m.t < 0) return;
    const q = 0.75;
    if (m.t < q) return;
    const k = (m.t - q) / 0.2; m.alt = Math.max(0, 300 * (1 - k));
    if (k > 0.7 && !m.ja.has('h') && cruza({ x0: m.x - 15, x1: m.x + 15, y0: m.y - m.alt - 34, y1: m.y - m.alt }, caixa(h))) { m.ja.add('h'); J.feriHeroi(m.dano, m.x, m.quem); }
    if (k >= 1 && !m.caiu) { m.caiu = true; treme(5); som('quebra', 0.5, 0.8); J.faiscas(m.x, m.y - 4, 16, '#8a7c66', 1.2, 'pedra'); poeira(m.x, m.y, 8, 0); m.t = m.dur; }
  };
  // bala que cai: barril estoura, veneno vira poça
  J.caiuBala = function (b) {
    if (b.estoura) { J.anel(b.x, b.y, b.estoura, '#ff9a40', 0.35, 3); fx({ tipo: 'bola', x: b.x, y: b.y, vida: 0.3, max: 0.3, tam: b.estoura, cor: '#ff9a40' }); J.faiscas(b.x, b.y, 22, '#ff9a40', 1.4, 'brasa'); treme(5); som('fogo', 0.7); const h = J.heroi; if (Math.hypot(h.x - b.x, h.y - 26 - b.y) < b.estoura + 8) J.feriHeroi(b.dano, b.x, b.quem, {}); }
    if (b.poca) J.magias.push({ tipo: 'gas', x: b.x, y: piso(b.x), t: 0, dur: 3.6, raio: 26, dano: 4, quem: 'cobra' });
  };
})();
