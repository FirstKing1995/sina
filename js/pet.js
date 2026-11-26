/* SINA · o companheiro: o filhote do Alfa. Depois que o Alfa cai, o filhote fica na toca, magro.
   Quem der carne a ele ganha um lobo-guará que segue, morde quem já está brigando com você, late para
   o que está escondido e traz o que acha pelo chão. Cresce com as mordidas (três tamanhos). Não morre:
   quando apanha, recua e volta. Guardado em save.pet = { nome, xp, dia }. */
(function () {
  const J = window.Jogo, F = window.Fase, C = window.C, T = 16;
  const NOMES = ['Brasa', 'Tição', 'Faísca', 'Ventania', 'Ruivo', 'Caipora'];
  const K = () => J.k;
  J.pet = null;

  const nivelPet = () => { const p = J.save.pet; return p ? Math.min(3, 1 + Math.floor((p.xp || 0) / 60)) : 1; };
  J.nivelPet = nivelPet;
  J.escPet = () => [0, 0.58, 0.72, 0.86][nivelPet()];

  // o filhote espera na Toca do Alfa
  J.filhote = function () {
    const s = J.save, A = F.atual; if (!s || s.pet || !s.chefes || !s.chefes.alfa || !A || A.id !== 'covil_lobos') return null;
    const x = A.arena ? Math.round((A.arena.x0 + A.arena.x1) / 2 + 70) : A.inicio.x + 220; return { x, y: F.chao(x) };
  };

  function cria() {
    const h = J.heroi, s = J.save; if (!h || !s.pet) { J.pet = null; return; }
    J.pet = { x: h.x - h.dir * 30, y: h.y, vx: 0, vy: 0, w: 16, h: 18, dir: h.dir, noChao: true, andou: 0, cd: 0, tMorde: 0, tDor: 0, cdColhe: 4, latiu: 0, vai: null, estado: 'segue' };
  }
  const entrar0 = J.entrarArea; J.entrarArea = function (id, porta) { entrar0(id, porta); cria(); };

  function adota() {
    const s = J.save, h = J.heroi, f = J.filhote(); if (!f) return;
    if (!((s.inv.carne || 0) > 0 || (s.inv.seca || 0) > 0)) { K().texto(h.x, h.y - 66, 'ele quer carne', '#e0b070'); return; }
    if (s.inv.carne > 0) s.inv.carne--; else s.inv.seca--;
    s.pet = { nome: NOMES[Math.floor(Math.random() * NOMES.length)], xp: 0, dia: s.dia };
    K().som('raro', 0.8); J.faiscas(f.x, f.y - 14, 18, '#ffcf8a', 1.1);
    K().texto(f.x, f.y - 40, s.pet.nome + ' vem com você', '#ffd8a0', true);
    cria(); if (J.pet) { J.pet.x = f.x; J.pet.y = f.y; } J.salvar();
  }

  // perto / rótulo / usar
  const perto0 = J.pertoMundo; J.pertoMundo = function (h) { const f = J.filhote(); if (f && Math.abs(f.x - h.x) < 30 && Math.abs(f.y - h.y) < 40) return { tipo: 'filhote', o: f }; return perto0 ? perto0(h) : null; };
  const rot0 = J.rotuloMundo; J.rotuloMundo = (p) => (p.tipo === 'filhote' ? ((J.save.inv.carne || 0) + (J.save.inv.seca || 0) > 0 ? 'Dar carne ao filhote' : 'Filhote do Alfa: está com fome') : rot0(p));
  const usa0 = J.usaMundo; J.usaMundo = function (p) { if (p.tipo === 'filhote') return adota(); return usa0(p); };

  // ---------- um quadro ----------
  function passo(dt) {
    const P = J.pet, h = J.heroi, s = J.save; if (!P || !s.pet || !h) return;
    const k = K(), nv = nivelPet();
    P.cd -= dt; P.tMorde = Math.max(0, P.tMorde - dt); P.tDor = Math.max(0, P.tDor - dt); P.cdColhe -= dt; P.latiu -= dt;
    if (h.estado === 'dorme') { P.estado = 'dorme'; P.vx = 0; }
    else if (P.estado === 'dorme') P.estado = 'segue';
    let alvo = null;
    if (P.estado !== 'dorme') {
      // quem já está brigando com você
      let p = null, dm = 1e9;
      for (const e of J.inimigos) { if (!e.vivo || e.estado === 'vaga' || e.estado === 'caido' || e.T.escondida) continue; const d = Math.abs(e.x - P.x); if (d < 260 && Math.abs(e.y - P.y) < 80 && d < dm) { dm = d; p = e; } }
      if (p && P.tDor <= 0) {
        alvo = p.x - Math.sign(p.x - P.x || 1) * (p.w / 2 + 8);
        if (dm < p.w / 2 + 22 && P.cd <= 0) {
          P.cd = 1.5 - nv * 0.17; P.tMorde = 0.32; P.dir = Math.sign(p.x - P.x) || P.dir; P.vx = P.dir * 90;
          k.feriInimigo(p, (p.T.chefe ? 3 : 5) + nv * 3, P.dir, { magia: true, deHum: true, y: p.y - p.h * 0.35 });
          s.pet.xp = (s.pet.xp || 0) + 1; if (nivelPet() > nv) { k.texto(P.x, P.y - 36, s.pet.nome + ' cresceu', '#ffd8a0', true); k.som('raro', 0.5); }
          k.som('golpe', 0.3, 1.6);
        }
        // apanhou de quem mordeu: recua um pouco
        if ((p.estado === 'golpe' && p.t < 0.1 && Math.abs(p.x - P.x) < p.T.alcance) && P.tDor <= 0) { P.tDor = 1.2; P.vx = -Math.sign(p.x - P.x) * 160; P.vy = -220; P.noChao = false; }
      } else if (P.tDor > 0) alvo = h.x - Math.sign(h.x - P.x || 1) * 50;
      // late para o que está escondido ou vem vindo
      if (P.latiu <= 0) for (const e of J.inimigos) if (e.vivo && e.estado === 'vaga' && Math.abs(e.x - h.x) < 230 && Math.abs(e.x - h.x) > 60 && Math.sign(e.x - h.x) === h.dir) { P.latiu = 14; P.dir = Math.sign(e.x - P.x) || P.dir; k.texto(P.x + P.dir * 8, P.y - 30, '!', '#ffcf6a', true); k.som('golpe', 0.15, 2.2); break; }
      // traz o que achar no chão
      if (!p && P.vai == null && P.cdColhe <= 0) { P.cdColhe = 8 - nv; const c = F.atual.coleta.find((q) => !(J.colhidos[q.id] > 0) && q.m !== 'madeira' && !q.alto && Math.abs(q.x - P.x) < 150 && Math.abs(q.y - P.y) < 40); if (c) P.vai = c; }
      if (P.vai) { const c = P.vai; if (J.colhidos[c.id] > 0 || p) P.vai = null; else { alvo = c.x; if (Math.abs(c.x - P.x) < 10) { J.colhidos[c.id] = 150; J.ganha(c.m, 1, P.x, P.y - 20); P.vai = null; } } }
      if (alvo == null && Math.abs(h.x - P.x) > 48) alvo = h.x - h.dir * 32;
    }
    const dx = alvo == null ? 0 : alvo - P.x, vel = k.CORRE * 1.18;
    if (P.tDor > 0.9) { /* voando para trás */ } else if (Math.abs(dx) > 6) { P.dir = Math.sign(dx); P.vx = P.dir * Math.min(vel, Math.abs(dx) * 5 + 30); } else P.vx *= Math.pow(0.001, dt);
    if (P.noChao && Math.abs(P.vx) > 30) {
      const px = P.x + P.dir * 12, muro = k.solido(px, P.y - 14); let buraco = true;
      for (let q = 0; q < 60; q += 10) { const tp = F.tile(Math.floor(px / T), Math.floor((P.y + q) / T)); if (tp === 1 || tp === 2) { buraco = false; break; } if (tp === 3) break; }
      if (muro || buraco) { P.vy = -560; P.vx = P.dir * vel; P.noChao = false; }
    }
    if ((Math.abs(h.x - P.x) > 420 || Math.abs(h.y - P.y) > 240 || P.y > F.H * T) && h.noChao && !J.emb) { P.x = h.ultimoSeguro.x - h.dir * 20; P.y = h.ultimoSeguro.y; P.vx = P.vy = 0; }
    P.vy = Math.min(k.QUEDA, P.vy + k.G * dt); const x0 = P.x; k.mover(P, dt); P.andou += Math.abs(P.x - x0);
    if (J.emb) P.x = k.clamp(P.x, J.emb.e.x0 + 30, J.emb.e.x1 - 30);
    if (F.tile(Math.floor(P.x / T), Math.floor((P.y - 2) / T)) === 3) { P.x = h.ultimoSeguro.x; P.y = h.ultimoSeguro.y; P.vy = 0; }
  }
  const vida0 = J.passoVida; J.passoVida = function (dt) { vida0(dt); const h = J.heroi; if (h && h.estado !== 'morto' && h.estado !== 'nasce') passo(dt); };
})();
