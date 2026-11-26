/* SINA · o comportamento dos inimigos.
   Eles leem o que você faz: saltam para fora do golpe, pulam por cima para pegar as costas, aparam com escudo,
   revidam no meio da sua sequência, castigam quem come, carrega ou fica sem fôlego, e atacam dos dois lados.
   A esperteza (manha, 0 a 1) cresce com o caminho andado e com quantos da espécie você já matou. */
(function () {
  'use strict';
  const J = window.Jogo, F = window.Fase, C = window.Dados, T = F.T, K = J.k;
  const { mover, solido, tipoEm, caixa, cruza, fx, poeira, treme, som, voz, rnd, clamp, tem, nasce, texto } = K;

  // ---------- quanto cada um sabe ----------
  J.manhaDe = function (tipo, x) {
    const s = J.save, a = F.atual, tp = C.TIPOS[tipo], k = clamp(x / (F.W * T), 0, 1);
    let m = a.id === 'floresta' ? 0.15 + k * 0.65 : a.id === 'lar' ? 0.8 : a.id === 'vale' ? 0.85 : a.id.startsWith('covil') ? 1 : 0.6 + k * 0.4;
    m += Math.min(0.25, (s.mortes[tp.esp] || 0) / 400) + J.nv().manha;
    return clamp(m, 0.1, 1);
  };
  // a floresta endurece com os dias e com os donos que caíram
  J.dureza = function () { const s = J.save; return 1 + Object.keys(s.chefes).length * 0.1 + Math.min(0.5, Math.max(0, (s.dia || 1) - 3) * 0.015); };
  const noite = () => (J.ehNoite && J.ehNoite() ? 1 : 0);
  // três jeitos de viver: o normal, o duro e o pesadelo
  C.NIVEIS = {
    normal: { nome: 'Barro mole', hp: 1, dano: 1, manha: 0, cura: 1, volta: 1, desc: 'O caminho como foi pensado. Ainda assim, morrer é morrer.' },
    duro: { nome: 'Barro duro', hp: 1.3, dano: 1.3, manha: 0.15, cura: 0.8, volta: 0.75, desc: 'Bichos mais fortes e espertos, comida cura menos, o bando volta antes.' },
    pesadelo: { nome: 'Pesadelo', hp: 1.6, dano: 1.65, manha: 0.32, cura: 0.6, volta: 0.55, desc: 'Para quem já conhece tudo. Sem mira assistida, e um erro custa caro.' },
  };
  J.nv = () => C.NIVEIS[(J.save && J.save.nivel) || 'normal'] || C.NIVEIS.normal;

  // ---------- quem ele quer pegar ----------
  function alvos() { const l = []; const h = J.heroi; if (h && h.estado !== 'morto' && h.estado !== 'nasce' && h.estado !== 'dorme') l.push(h); if (J.hum && J.hum.viva && !J.hum.caida && !J.hum.dentro) l.push(J.hum); return l; }
  J.alvos = alvos;
  function escolhe(e) {
    const l = alvos(); if (!l.length) return null;
    let m = null, md = 1e9;
    for (const a of l) { let d = Math.abs(a.x - e.x) + Math.abs(a.y - e.y) * 0.6; if (a === J.hum) d *= e.raid ? (e.ox % 2 < 1 ? 0.55 : 1.2) : 1.15; if (a === e.alvo) d *= 0.8; if (d < md) { md = d; m = a; } }
    return m;
  }
  J.fereAlvo = function (a, dano, e, o) {
    if (a === J.heroi) return J.feriHeroi(dano, e ? e.x : a.x, e ? e.tipo : 'lobo', o);
    if (a === J.hum) return J.feriHum(dano, e);
    if (a && a.obra) return J.feriObra(a, dano, e);
    return false;
  };
  function veAlvo(e, a) {
    if (!a) return false;
    const v = e.T.visao * (1 - 0.42 * J.cl('neblina') - 0.15 * J.cl('chuva', 'tempestade')) * (1 + noite() * 0.25) * (J.save.tochaAcesa && (e.T.esp === 'zumbi' || e.T.esp === 'goblin') ? 1.3 : 1) * (J.save.roupa === 'folhas' && e.estado === 'vaga' && !noite() ? 0.68 : 1) * (e.raid ? 6 : 1);
    return Math.abs(a.x - e.x) < v && Math.abs(a.y - e.y) < (e.raid ? 400 : 130);
  }
  function chaoAFrente(e, d) {
    const px = e.x + d * (e.w / 2 + 4);
    if (solido(px, e.y - 20)) return false;
    for (let k = -14; k <= 36; k += 8) { const tp = tipoEm(px, e.y + k); if (tp === 3) return false; if (tp === 1 || tp === 2) return true; }
    return false;
  }
  // só pula se houver chão firme do outro lado, na distância que o pulo alcança
  function pousoSeguro(e, m) {
    for (const d of [60, 84, 108]) { const px = e.x + m * d, ty = F.atual.topo[clamp(Math.floor(px / T), 0, F.W - 1)] * T; if (Math.abs(ty - e.y) < 76 && tipoEm(px, ty - 4) !== 3) return true; }
    return false;
  }
  function pousoEm(e, x) { const c = clamp(Math.floor(x / T), 0, F.W - 1), ty = F.atual.topo[c] * T; return Math.abs(ty - e.y) < 50 && tipoEm(x, ty - 4) !== 3 && !solido(x, e.y - 30); }
  // quem vê um do bando apanhar vem junto
  J.alerta = function (e, raio) { for (const o of J.inimigos) if (o !== e && o.vivo && o.estado === 'vaga' && !o.T.chefe && (o.T.esp === e.T.esp || raio > 300) && Math.abs(o.x - e.x) < (raio || 260)) { o.estado = 'persegue'; o.t = rnd(-0.25, 0.1); o.pisca = 0.5; } };

  // ---------- você está aberto? ----------
  function aberto(a) {
    if (a !== J.heroi) return true;
    const h = a;
    if (['come', 'colhe', 'magia', 'mira', 'soltou'].includes(h.estado)) return true;
    if (h.vigor < 6) return true;
    if (h.estado === 'golpe' && h.final && h.t > h.dur * 0.6) return true;
    if (h.estado === 'forte' && h.t > h.dur * 0.6) return true;
    return h.estado === 'rola' && h.t > 0.32;
  }
  const outros = (e, f) => J.inimigos.filter((o) => o !== e && o.vivo && f(o));

  // ---------- reação ao golpe: chamada quando o herói começa um golpe ----------
  function reage(e, a, dist, lado) {
    const tp = e.T, h = J.heroi;
    if (e.viu === J.golpeId) return false;
    e.viu = J.golpeId;
    if (tp.chefe || !tp.reflexo || (e.cdR || 0) > 0 || !e.noChao) return false;
    if (Math.sign(e.x - h.x) !== h.dir && dist > 18) return false;
    const alc = h.ficha.arma.alcance + 34;
    if (dist > alc + 20 || Math.abs(h.y - e.y) > 60) return false;
    if (Math.random() > tp.reflexo * (0.4 + e.manha * 0.9)) return false;
    e.cdR = rnd(0.8, 1.4) - e.manha * 0.5;
    const r = Math.random();
    if (tp.escudo) { e.estado = 'bloqueia'; e.t = 0; e.dir = lado; return true; }
    if (tp.esp === 'lobo' && r < 0.3 + e.manha * 0.3 && pousoEm(e, e.x + lado * (dist + 64))) { // por cima de você
      e.estado = 'porcima'; e.t = 0; e.vy = -370; e.vx = lado * clamp((dist + 60) / 0.46, 180, 330); e.dir = lado; e.esq = 0.3; som('golpe', 0.25, 1.6); return true;
    }
    if (tp.esp === 'cobra') { e.estado = 'esquiva'; e.t = 0; e.vx = -lado * 190; e.esq = 0.22; e.durE = 0.2; e.contra = 0.75; return true; }
    if (!pousoEm(e, e.x - lado * 46)) return false;
    e.estado = 'esquiva'; e.t = 0; e.vx = -lado * (tp.esp === 'lobo' ? 250 : 220); e.vy = -130; e.esq = 0.26; e.durE = 0.3; e.contra = 0.35 + e.manha * 0.4;
    poeira(e.x, e.y, 3, lado); som('golpe', 0.2, 1.8);
    return true;
  }
  // apanhou: às vezes devolve no ato, sem parar
  J.apanhou = function (e, forte, aberta) {
    const tp = e.T;
    e.levou = (e.tLevou > 0 ? e.levou || 0 : 0) + 1; e.tLevou = 1.3;
    if (tp.chefe || ['cambaleia', 'golpe', 'caido', 'bloqueia', 'porcima'].includes(e.estado)) return;
    const chance = (e.levou >= 2 ? 0.35 : 0.12) + e.manha * 0.35 + (tp.bruto ? 0.2 : 0);
    if (!tp.atira && e.estado !== 'prep' && Math.random() < chance) { e.estado = 'prep'; e.t = 0; e.prepM = 0.62; e.couraca = true; e.levou = 0; e.pisca = 0.25; }
    else if (tp.atira && e.noChao) { e.estado = 'esquiva'; e.t = 0; e.vx = -e.dir * 230; e.vy = -150; e.durE = 0.32; e.contra = 0; }
  };

  // ---------- formação: ninguém em cima de ninguém ----------
  // quem persegue forma duas filas, uma de cada lado do alvo; a fila maior manda gente para o outro lado
  const ANDA = ['persegue', 'recua', 'vaga', 'volta', 'prep', 'uiva', 'bloqueia'];
  J.formacao = function (dt) {
    const l = J.inimigos.filter((e) => e.vivo && !e.sob && Math.abs(e.x - J.heroi.x) < 640);
    for (let i = 0; i < l.length; i++) for (let k = i + 1; k < l.length; k++) {
      const a = l[i], b = l[k]; if (Math.abs(a.y - b.y) > 34) continue;
      const quer = (a.w + b.w) * (a.T.chefe || b.T.chefe ? 0.4 : 0.62) + 4, dx = b.x - a.x || (a.ox < b.ox ? 0.5 : -0.5), falta = quer - Math.abs(dx); if (falta <= 0) continue;
      const s = Math.sign(dx), f = Math.min(70, falta * 5) * dt;
      for (const [e, d] of [[a, -s], [b, s]]) if (!e.T.chefe && e.noChao && ANDA.includes(e.estado) && chaoAFrente(e, d)) e.x += d * f * (e.T.bruto ? 0.35 : 1);
    }
    for (const alvo of [J.heroi, J.hum]) {
      if (!alvo) continue;
      for (const s of [-1, 1]) l.filter((e) => e.alvo === alvo && !e.T.chefe && !e.T.atira && e.estado !== 'vaga' && e.estado !== 'volta' && Math.sign(e.x - alvo.x || 1) === s && Math.abs(e.x - alvo.x) < 300).sort((a, b) => Math.abs(a.x - alvo.x) - Math.abs(b.x - alvo.x)).forEach((e, i, f) => { e.posto = i; e.fila = f.length; });
    }
  };

  // ---------- começa um ataque ----------
  function arma(e, mult) { e.estado = 'prep'; e.t = 0; e.prepM = mult || 1; e.finta = !e.T.chefe && !e.T.atira && mult !== 0.6 && Math.random() < (e.T.finta || 0) * e.manha; }

  function passo(e, dt) {
    const tp = e.T, h = J.heroi;
    if (tp.chefe) { J.passoDono(e, dt); return; }
    e.t += dt; e.flash = Math.max(0, e.flash - dt); e.pisca = Math.max(0, e.pisca - dt); e.ferido = Math.max(0, (e.ferido || 0) - dt); e.semCamb = Math.max(0, (e.semCamb || 0) - dt);
    e.cdR = Math.max(0, (e.cdR || 0) - dt); e.esq = Math.max(0, (e.esq || 0) - dt); e.tLevou = Math.max(0, (e.tLevou || 0) - dt); e.furia = Math.max(0, (e.furia || 0) - dt);
    if (e.estado === 'morto') { e.vy = Math.min(K.QUEDA, e.vy + K.G * dt); e.vx *= Math.pow(0.05, dt); mover(e, dt); return; }
    if (e.veneno > 0) { e.veneno -= dt; e.venT = (e.venT || 0) + dt; if (e.venT > 0.6) { e.venT = 0; const d = tem('cobra', 3) ? 6 : 3; e.hp -= d; texto(e.x, e.y - e.h - 6, d, '#b8e060'); if (e.hp <= 0) { K.morreInimigo(e, e.dir, true); return; } } }
    e.tAlvo = (e.tAlvo || 0) - dt;
    if (e.tAlvo <= 0 || !e.alvo) { e.alvo = escolhe(e); e.tAlvo = 0.6; }
    let a = e.alvo || h;
    // cerca no caminho: é ela que apanha primeiro
    e.barra = null;
    if (J.barreiras && J.barreiras.length) for (const b of J.barreiras) if (b.o.hp > 0 && Math.abs(b.x - e.x) < 70 && (b.x - e.x) * (a.x - e.x) > 0 && Math.abs(a.x - e.x) > Math.abs(b.x - e.x)) { e.barra = b; a = b; }
    const dx = a.x - e.x, dist = Math.abs(dx), lado = Math.sign(dx) || 1, m01 = e.manha || 0.5;
    const fase2 = tp.chefe && e.hp < e.hpMax * 0.5;
    const vel = tp.vel * (fase2 ? 1.2 : 1) * (e.furia > 0 ? 1.35 : 1) * (tp.chefe ? 1 : 0.92 + m01 * 0.16);
    const prep = tp.prep * (fase2 ? 0.8 : 1) * (e.prepM || 1) * (tp.chefe ? 1 : 1.12 - m01 * 0.26);
    e.prepDur = prep;
    if (tp.chefe && e.estado !== 'vaga' && e.estado !== 'chama' && ((e.uivos === 0 && e.hp < e.hpMax * 0.7) || (e.uivos === 1 && e.hp < e.hpMax * 0.35))) { e.uivos++; e.estado = 'chama'; e.t = 0; e.vx = 0; som(tp.esp === 'lobo' ? 'uivo' : 'rugido', 1, tp.esp === 'goblin' ? 1.2 : 0.9); treme(8); }

    if (a === h && ['persegue', 'recua', 'ronda', 'uiva'].includes(e.estado) && (h.estado === 'golpe' || h.estado === 'forte') && h.t < 0.16) reage(e, a, dist, lado);
    // projétil vindo: pula
    if (!tp.chefe && tp.reflexo && e.noChao && e.cdR <= 0 && e.estado === 'persegue') for (const b of J.balas) if (b.dono === 'h' && Math.abs(b.x - e.x) < 80 && (e.x - b.x) * b.vx > 0 && Math.abs(b.y - (e.y - e.h / 2)) < 34) { e.cdR = 1.2; if (Math.random() < tp.reflexo * m01 * 0.8) { e.vy = -390; e.vx = lado * 70; e.estado = 'pula'; e.t = 0; e.pulaVx = 70; break; } }

    switch (e.estado) {
      case 'vaga': {
        const alvo = e.ox + Math.sin(e.t * 0.5 + e.ox) * 46, d = Math.sign(alvo - e.x);
        if (!tp.escondida && Math.abs(alvo - e.x) > 5 && chaoAFrente(e, d)) { e.vx = d * vel * 0.3; e.dir = d; } else e.vx = 0;
        const arena = F.atual.arena;
        if ((veAlvo(e, e.alvo) && !(tp.escondida && dist > 92)) && (!tp.chefe || (arena && h.x > arena.x0 + 60))) {
          e.estado = 'persegue'; e.t = tp.escondida ? 1 : 0; e.pisca = 0.5; J.alerta(e);
          if (tp.chefe) J.acordaChefe(e);
          else if (tp.grito) { e.estado = 'uiva'; e.t = 0; }
          else if (Math.random() < 0.65) voz(e, 'alerta');
        }
        break;
      }
      case 'persegue': {
        if (dist > 6) e.dir = lado;
        if (!e.raid && !veAlvo(e, a) && e.t > 4 && !tp.chefe) { e.estado = 'volta'; e.t = 0; break; }
        if (tp.esp === 'goblin' && tem('goblin', 3) && !tp.chefe && !e.raid && dist < 70 && e.hp < e.hpMax) { e.estado = 'foge'; e.t = 0.6; break; }
        if (e.barra) { e.vx = dist > tp.alcance * 0.5 ? lado * vel : 0; if (dist < tp.alcance * 0.7 + 12 && e.t > 0.3) arma(e); break; }
        if (tp.atira) { longe(e, a, dist, lado, vel, m01); break; }
        if (tp.poder === 'salto' && dist > 130 && e.t > 1.1 && e.noChao) { e.estado = 'salto'; e.t = 0; e.vx = 0; break; }
        if (tp.poder === 'cuspe' && dist > 110 && e.t > 0.9) { e.estado = 'cuspe'; e.t = 0; e.vx = 0; break; }
        if (tp.poder === 'cova' && dist > 120 && e.t > 1.6) { e.estado = 'cova'; e.t = 0; e.vx = 0; break; }
        // alguém carregando golpe forte: sai do alcance, ou corre para cortar a carga
        if (a === h && h.estado === 'carga' && dist < 110 && !tp.chefe && tp.reflexo && e.noChao) {
          if (h.carga < 0.4 && dist < tp.alcance * 1.5) { arma(e, 0.6); break; }
          if (h.carga >= 0.4 && Math.random() < m01 * dt * 9) { e.estado = 'esquiva'; e.t = 0; e.vx = -lado * 240; e.vy = -120; e.durE = 0.32; e.contra = 0.1; break; }
        }
        const atacando = outros(e, (o) => o.alvo === a && (o.estado === 'prep' || o.estado === 'golpe') && Math.abs(o.x - a.x) < 140).length;
        const limite = 2 + (m01 > 0.7 ? 1 : 0), castiga = aberto(a) && a === h && m01 > 0.3;
        const posto = e.posto || 0, ronda = !tp.chefe && !castiga && (atacando >= limite || posto >= 2);
        // ninguém nas suas costas? alguém dá a volta
        if (!tp.chefe && tp.flanco && e.noChao && a === h && dist < 120 && e.t > 0.7 && (e.cdF || 0) <= J.relogio && Math.sign(e.x - h.x) === h.dir) {
          e.cdF = J.relogio + rnd(2.2, 4);
          const temCostas = outros(e, (o) => o.estado !== 'vaga' && Math.sign(o.x - h.x) === -h.dir && Math.abs(o.x - h.x) < 150).length;
          const juntos = outros(e, (o) => o.estado !== 'vaga' && Math.abs(o.x - h.x) < 200).length;
          if ((!temCostas || (e.fila || 0) - temCostas > 1) && (juntos || tp.sorrateiro) && Math.random() < tp.flanco * (0.4 + m01 * 0.6) && pousoEm(e, e.x + lado * (dist + 70))) { e.estado = 'porcima'; e.t = 0; e.vy = -390; e.vx = lado * clamp((dist + 70) / 0.48, 180, 340); e.dir = lado; break; }
        }
        const quero = ronda ? 78 + Math.max(0, posto - 1) * 34 + (e.ox % 14) : tp.alcance * 0.72 + posto * 10;
        let m = 0; if (dist > quero + 6) m = lado; else if (ronda && dist < quero - 14) m = -lado; else if (ronda) m = Math.sin(J.relogio * 1.7 + e.ox) > 0 ? lado : -lado;
        // entra e sai do alcance, para você errar o golpe
        if (!ronda && !tp.chefe && tp.reflexo > 0.3 && dist < tp.alcance + 46 && e.t < 0.35 * (1 - m01 * 0.5)) m = Math.sin(J.relogio * 3 + e.ox) > 0.2 ? -lado : lado;
        // tem um dos seus logo à frente? espera a vez em vez de subir nele
        const trava = m && !tp.chefe && outros(e, (o) => (o.x - e.x) * m > 0 && Math.abs(o.x - e.x) < (o.w + e.w) * 0.62 + 5 && Math.abs(o.y - e.y) < 30 && o.estado !== 'caido' && Math.sign(a.x - o.x) === m).length > 0;
        const passa = m && !trava && chaoAFrente(e, m);
        e.vx = passa ? m * vel * (ronda ? 0.55 : 1) : 0;
        // fogo na mão: lobo e cobra hesitam
        const teme = J.save.tochaAcesa && (tp.esp === 'lobo' || tp.esp === 'cobra') && !tp.bruto;
        const espera = (castiga ? 0.04 : tp.chefe ? 0.2 : 0.34 - m01 * 0.24) + (teme ? 0.45 : 0);
        if (!ronda && dist < tp.alcance + 4 && Math.abs(a.y - e.y) < 62 && e.t > espera && e.noChao) { arma(e, castiga ? 0.6 : 1); break; }
        // pula degraus altos e vãos para alcançar você
        if (m && !passa && !trava && e.noChao && (tp.esp === 'lobo' || tp.esp === 'goblin' || tp.salta2) && dist > 40 && e.t > 0.4 && !tp.chefe && !tp.bruto && pousoSeguro(e, m)) { e.vy = -530; e.dir = m; e.vx = m * 178; e.pulaVx = 178; e.estado = 'pula'; e.t = 0; }
        // ferido e sozinho: chama mais
        if (tp.uiva && !e.uivou && e.hp < e.hpMax * 0.5 && dist > 60 && !e.raid && Math.random() < dt * 0.5 * m01) { e.uivou = true; e.estado = 'uiva'; e.t = 0; e.vx = 0; }
        break;
      }
      case 'porcima': { e.vy += 0; if (e.noChao && e.t > 0.2) { e.dir = Math.sign(a.x - e.x) || 1; e.estado = 'persegue'; e.t = 0.5; if (Math.random() < 0.3 + m01 * 0.6) arma(e, 0.6); } break; }
      case 'esquiva': {
        if (e.t > 0.14) e.vx *= Math.pow(0.02, dt);
        if (e.t > (e.durE || 0.3) && e.noChao) { if (Math.random() < (e.contra || 0)) arma(e, 0.65); else { e.estado = 'persegue'; e.t = 0.15; } }
        break;
      }
      case 'bloqueia': {
        e.vx *= Math.pow(0.001, dt); e.dir = lado;
        if (e.t > 0.55 + (h.estado === 'golpe' ? 0.3 : 0)) { e.estado = 'persegue'; e.t = 0.3; if (dist < tp.alcance + 14 && Math.random() < 0.4 + m01 * 0.5) arma(e, 0.6); }
        break;
      }
      case 'pula': { e.vx = e.dir * (e.pulaVx || 178); if (e.noChao && e.t > 0.2) { e.estado = 'persegue'; e.t = 0.2; } break; }
      case 'foge': {
        const m = -lado; e.dir = m; const ok = chaoAFrente(e, m); e.vx = ok ? m * vel * 1.2 : 0;
        if (e.t > 1.6 || !ok) { e.estado = 'persegue'; e.t = 0.2; }
        // quem roubou some de vez
        if (e.roubo && Math.abs(h.x - e.x) > 420) { e.vivo = false; e.estado = 'morto'; e.t = 9; }
        break;
      }
      case 'volta': {
        const d = Math.sign(e.ox - e.x); e.vx = chaoAFrente(e, d) ? d * vel * 0.6 : 0; e.dir = d || e.dir;
        if (Math.abs(e.ox - e.x) < 10 || e.t > 5) { e.estado = 'vaga'; e.t = 0; e.ox = e.x; e.hp = Math.min(e.hpMax, e.hp + e.hpMax * 0.4); }
        if (veAlvo(e, e.alvo) && e.t > 0.8) { e.estado = 'persegue'; e.t = 0; }
        break;
      }
      case 'uiva': { // uivo do lobo, grito da morta: chama quem estiver por perto
        e.vx = 0; e.dir = lado;
        if (e.t > 0.45 && e.t - dt <= 0.45) {
          if (tp.esp === 'lobo') som('uivo', 0.7, 1.1); else voz(e, 'alerta'); J.anel(e.x, e.y - e.h * 0.8, 60, '#d8c8ff', 0.5, 2); J.anel(e.x, e.y - e.h * 0.8, 110, '#a89ac8', 0.7, 1.5);
          J.alerta(e, 420);
          for (const o of J.inimigos) if (o.vivo && o.T.esp === tp.esp && !o.T.chefe && Math.abs(o.x - e.x) < 300) o.furia = 5;
          if (tp.esp === 'lobo' && !e.chamado) { const x = clamp(h.x + (Math.random() < 0.5 ? -1 : 1) * 330, 60, F.W * T - 60); if (pousoEm({ y: F.chao(x), x }, x)) J.inimigos.push(nasce('lobo', x, F.chao(x), { estado: 'persegue', chamado: true, manha: m01, pisca: 0.6 })); }
        }
        if (e.t > 0.8) { e.estado = 'persegue'; e.t = 0.1; }
        break;
      }
      case 'prep': {
        // arma o golpe andando: não fica parado esperando apanhar
        if (tp.salta || tp.atira) e.vx *= Math.pow(0.004, dt); else e.vx = e.t < prep * 0.75 && dist > tp.alcance * 0.5 && chaoAFrente(e, lado) ? lado * vel * 0.55 : e.vx * Math.pow(0.01, dt);
        if (e.t < prep * 0.78) e.dir = lado;
        if (e.finta && e.t > prep * 0.6) { e.finta = false; e.estado = 'esquiva'; e.t = 0; e.vx = -lado * 150; e.durE = 0.24; e.contra = 0.95; break; }
        if (e.t > prep) {
          e.estado = 'golpe'; e.t = 0; e.acertou = new Set(); e.prepM = 1; e.tiros = 0;
          if (Math.random() < 0.4) voz(e, 'ataque');
          if (tp.atira) atira(e, a);
          else if (tp.salta) { const av = a.vx ? clamp(a.vx, -160, 160) * 0.25 * m01 : 0, ddx = dist + av * lado; e.vx = e.dir * clamp(ddx * 2.35, 140, tp.salta * (0.9 + m01 * 0.2)); e.vy = tp.esp === 'cobra' ? -90 : -215; som('mordida', 0.5); }
          else { e.vx = e.dir * (tp.avanco || 110); som('golpe', 0.45, tp.bruto ? 0.6 : 0.8); }
        }
        break;
      }
      case 'golpe': {
        if (!tp.atira) {
          const c = caixa(e), box = tp.salta ? { x0: c.x0 - 7, x1: c.x1 + 7, y0: c.y0 - 4, y1: c.y1 } : e.dir > 0 ? { x0: e.x - 4, x1: e.x + tp.alcance + 8, y0: e.y - e.h, y1: e.y } : { x0: e.x - tp.alcance - 8, x1: e.x + 4, y0: e.y - e.h, y1: e.y };
          if (e.t > tp.golpe * 0.2 && e.t < tp.golpe + 0.12) {
            for (const q of alvos()) if (!e.acertou.has(q) && cruza(box, caixa(q))) {
              e.acertou.add(q);
              const d = tp.dano * (fase2 ? 1.15 : 1) * (tp.chefe ? 1.1 : J.dureza() * (0.9 + m01 * 0.8)) * (1 + noite() * 0.1) * J.nv().dano;
              if (J.fereAlvo(q, d, e, { veneno: tp.veneno, forte: tp.chefe || tp.bruto }) && q === h) acertouHeroi(e);
            }
            if (e.barra && !e.acertou.has(e.barra) && Math.abs(e.barra.x - e.x) < tp.alcance + 24) { e.acertou.add(e.barra); J.feriObra(e.barra.o, tp.dano * J.dureza(), e); }
            if (J.casaAlvo && !e.acertou.has('casa') && cruza(box, J.casaAlvo())) { e.acertou.add('casa'); J.feriObra(J.save.lar.casa, tp.dano, e); }
          }
          if (!tp.salta) e.vx *= Math.pow(0.01, dt);
          if (tp.onda && !e.bateu && e.t > tp.golpe * 0.5) { e.bateu = true; treme(6); som('quebra', 0.7, 0.7); J.faiscas(e.x + e.dir * 34, e.y - 2, 16, '#8a7c66', 1.1, 'pedra'); J.magias.push({ tipo: 'onda', inimiga: true, x: e.x + e.dir * 30, y: e.y, d: e.dir, t: 0, dur: 0.4, alc: 110, dano: tp.dano * 0.6, ja: new Set(), cor: '#a08a60', quem: e.tipo }); }
        } else if (tp.rajada && m01 > 0.6 && e.tiros < 1 && e.t > 0.3) { e.tiros++; atira(e, a, 0.1); }
        const dur = tp.salta ? Math.max(tp.golpe, 0.34) : tp.atira && tp.rajada && m01 > 0.6 ? 0.5 : tp.golpe;
        if (e.t > dur && e.noChao) {
          e.seguidos++; e.bateu = false; e.couraca = false;
          const seg = (tp.seguidos || 1) + (m01 > 0.75 && !tp.atira && !tp.chefe ? 1 : 0);
          if (e.seguidos < seg && dist < tp.alcance * 1.6 && !tp.atira) { e.estado = 'prep'; e.t = tp.prep * 0.4; e.dir = lado; } else { e.estado = 'recua'; e.t = 0; e.seguidos = 0; e.modo = Math.random(); }
        }
        break;
      }
      case 'recua': {
        const atual = tp.recua * (fase2 ? 0.75 : 1) * (tp.chefe ? 1 : 1.1 - m01 * 0.45);
        if (tp.chefe || tp.bruto) e.vx *= Math.pow(0.002, dt);
        else if (tp.esp === 'lobo' || tp.esp === 'goblin') {
          // some do alcance antes do seu contragolpe, ou passa para o outro lado
          const m = e.modo < 0.6 || tp.batecorre ? -lado : lado; e.vx = chaoAFrente(e, m) ? m * vel * (tp.batecorre ? 1 : 0.7) : 0; if (tp.batecorre) e.dir = Math.sign(e.vx) || e.dir;
        } else if (tp.esp === 'cobra') { const m = -lado; e.vx = chaoAFrente(e, m) ? m * vel * 0.8 : 0; } else e.vx *= Math.pow(0.02, dt);
        if (e.t > atual * (tp.batecorre ? 1.6 : 1)) { e.estado = 'persegue'; e.t = 0.15; }
        break;
      }
      case 'cambaleia': { e.vx *= Math.pow(0.02, dt); if (e.t > e.dur) { e.estado = 'persegue'; e.t = 0.2; e.couraca = false; if (!tp.chefe && m01 > 0.4 && dist < tp.alcance * 1.3 && Math.random() < m01 * 0.6) arma(e, 0.6); } break; }
      case 'caido': { e.vx *= Math.pow(0.01, dt); if (e.t > 1.3) { e.estado = 'persegue'; e.t = 0; e.furia = 4; J.faiscas(e.x, e.y - 8, 10, '#6a5a48', 0.7, 'pedra'); som('rugido', 0.3, 0.7); if (dist < 60) arma(e, 0.7); } break; }
      case 'chama': {
        e.vx = 0;
        if (e.t > 0.5 && e.t - dt <= 0.5) {
          J.anel(e.x, e.y - 40, 90, '#ffb070', 0.6, 3); J.anel(e.x, e.y - 40, 140, '#c08050', 0.8, 2);
          const A = F.atual.arena, l = tp.chamaL || [tp.chama, tp.chama];
          l.forEach((t, i) => { const x = clamp(e.x + (i % 2 ? 1 : -1) * (150 + i * 14), A.x0 + 30, A.x1 - 30); J.inimigos.push(nasce(t, x, F.chao(x) - (tp.esp === 'zumbi' ? 0 : 50), { estado: 'persegue', chamado: true, pisca: 0.6, t: -0.4, manha: 1 })); J.faiscas(x, F.chao(x) - 6, 14, '#8a7458', 1, 'pedra'); });
        }
        if (e.t > 1.3) { e.estado = 'persegue'; e.t = 0; }
        break;
      }
      case 'cuspe': { e.dir = lado; if (e.t > 0.55 && e.t - dt <= 0.55) { for (const q of [-0.28, 0, 0.28]) bala(e, a, 'veneno', q, 230); som('mordida', 0.7, 0.8); } if (e.t > 1) { e.estado = 'persegue'; e.t = 0; } break; }
      case 'cova': {
        if (e.t > 0.5 && e.t - dt <= 0.5) { treme(5); som('quebra', 0.8, 0.6); for (let i = -1; i <= 1; i++) J.magias.push({ tipo: 'maos', x: h.x + i * 46, y: F.chao(h.x + i * 46), t: -0.5 - Math.abs(i) * 0.15, dur: 0.6, dano: tp.dano * 0.8, ja: new Set(), cor: '#b8a0c8' }); }
        if (e.t > 1.2) { e.estado = 'persegue'; e.t = 0; }
        break;
      }
      case 'cura': { // o xamã reza pelo bando
        e.vx = 0; if (Math.random() < 0.5) fx({ tipo: 'alma', x: e.x + rnd(-14, 14), y: e.y - rnd(10, 60), vy: -30, vida: 0.6, max: 0.6, cor: '#7aff8a', tam: 1.8 });
        if (e.t > 0.9) { som('magia', 0.5, 1.4); J.anel(e.x, e.y - 40, 130, '#7aff8a', 0.6, 2); for (const o of J.inimigos) if (o.vivo && o !== e && Math.abs(o.x - e.x) < 240 && o.hp < o.hpMax) { const c = Math.round(o.hpMax * 0.28); o.hp = Math.min(o.hpMax, o.hp + c); texto(o.x, o.y - o.h - 8, '+' + c, '#7aff8a'); } e.cdCura = J.relogio + 7; e.estado = 'persegue'; e.t = 0; }
        break;
      }
      case 'salto': {
        if (e.t < 0.5) { e.vx = 0; e.dir = lado; e.pulou = false; }
        else if (!e.pulou) { e.pulou = true; e.vy = -600; e.vx = clamp((h.x - e.x) / 0.75, -400, 400); som('rugido', 0.7); }
        else if (e.noChao && e.t > 0.7) { e.pulou = false; treme(9); som('quebra', 0.9, 0.6); J.faiscas(e.x, e.y, 26, '#8a7c66', 1.4, 'pedra'); for (const d of [-1, 1]) J.magias.push({ tipo: 'onda', inimiga: true, x: e.x, y: e.y, d, t: 0, dur: 0.65, dano: tp.dano * 0.8, ja: new Set(), cor: '#c08050', quem: e.tipo }); e.estado = 'recua'; e.t = 0; }
        break;
      }
    }
    e.vy = Math.min(K.QUEDA, e.vy + K.G * dt);
    const antes = e.x;
    mover(e, dt);
    e.andou += Math.abs(e.x - antes);
    if (J.barreiras) for (const b of J.barreiras) if (b.o.hp > 0 && (antes - b.x) * (e.x - b.x) <= 0 && Math.abs(antes - b.x) > 0.01) { e.x = b.x + Math.sign(antes - b.x) * (e.w / 2 + 2); e.vx = 0; }
    const A = F.atual.arena; if (tp.chefe && A) e.x = clamp(e.x, A.x0 + 46, A.x1 - 46);
    if (!tp.chefe && tipoEm(e.x, e.y - 2) === 3) { e.hp = 0; e.estado = 'morto'; e.vivo = false; e.t = 0; if (!e.chamado && !e.raid) J.mortos.push({ t: e.tipo, x: e.ox, y: e.oy, espera: 60 }); }
  }
  J.passoInimigo = passo;

  function acertouHeroi(e) {
    const tp = e.T, h = J.heroi, s = J.save;
    if (tp.agarra) h.lerdo = 1.1;
    // o goblin da faca leva o que puder e corre
    if (tp.rouba && !e.roubo && !J.amu('orelhas') && Math.random() < 0.28) {
      const l = Object.keys(s.inv).filter((m) => s.inv[m] > 0 && m !== 'flecha'); if (l.length) { const m = l[Math.floor(Math.random() * l.length)], q = Math.min(s.inv[m], 2); s.inv[m] -= q; e.roubo = [m, q]; texto(h.x, h.y - 78, 'roubou ' + C.MAT[m].toLowerCase(), '#ffb070', true); e.estado = 'foge'; e.t = -2.2; }
    }
  }
  // quem ataca de longe: guarda distância, recua saltando e mira onde você vai estar
  function longe(e, a, dist, lado, vel, m01) {
    const tp = e.T, d = tp.distancia;
    if (tp.cura && (e.cdCura || 0) < J.relogio && outros(e, (o) => o.hp < o.hpMax * 0.75 && Math.abs(o.x - e.x) < 220).length) { e.estado = 'cura'; e.t = 0; return; }
    if (dist < 64 && e.noChao && e.cdR <= 0 && pousoEm(e, e.x - lado * 60)) { e.cdR = 1.6; e.estado = 'esquiva'; e.t = 0; e.vx = -lado * 250; e.vy = -190; e.durE = 0.4; e.contra = 0.6; return; }
    const quer = dist < d * 0.75 ? -lado : dist > tp.alcance * 0.85 ? lado : 0;
    e.vx = quer && chaoAFrente(e, quer) ? quer * vel : 0;
    if (dist < tp.alcance && e.t > 0.5 - m01 * 0.3) arma(e);
  }
  function bala(e, a, tipo, da, v) {
    const ox = e.x + e.dir * e.w * 0.5, oy = e.y - e.h * 0.72, pedra = tipo === 'pedra', fl = tipo === 'flechaI', feit = tipo === 'feitico';
    const tempo = Math.hypot(a.x - ox, a.y - oy) / v, m01 = e.manha || 0.5;
    const ax = a.x + (a.vx || 0) * tempo * 0.75 * m01, ay = a.y - 34;
    const ang = Math.atan2(ay - oy, ax - ox) + (da || 0), queda = pedra ? 240 : fl ? 190 : feit ? 0 : 60;
    J.balas.push({ dono: 'i', tipo, quem: e.tipo, x: ox, y: oy, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - queda * tempo * 0.5, grav: queda, r: pedra ? 4 : feit ? 6 : fl ? 3 : 5, dano: e.T.dano * J.dureza() * (0.9 + m01 * 0.8) * J.nv().dano, vida: feit ? 3 : 2.4, cor: pedra ? '#a09a90' : feit ? '#7aff8a' : fl ? '#d8c8a0' : '#b8e060', veneno: e.T.veneno, segue: feit ? 1.6 + m01 : 0, flecha: fl, inimiga: true });
  }
  function atira(e, a, da) { const t = e.T.atira; bala(e, a, t, da || 0, t === 'pedra' ? 290 : t === 'flechaI' ? 370 : t === 'feitico' ? 170 : 220); som(t === 'feitico' ? 'magia' : 'golpe', 0.4, 1.4); }
})();
