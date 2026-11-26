/* SINA · os fornos das Ruínas do Oleiro: cada um respira num ciclo de 3,6 s. Brasa quieta, depois a boca
   acende (aviso) e por fim solta uma labareda para cima: quem estiver em cima queima (uma vez por labareda). */
(function () {
  const J = window.Jogo, F = window.Fase, T = 16, CICLO = 3.6, AVISO = 2.2, FOGO = 2.8;
  J.fornosDe = function (A) {
    if (A.fornos) return A.fornos; const l = (A.fornos = []); if (A.regiao !== 'ruinas' || A.id.startsWith('covil')) return l;
    const perto = (x, lista, d) => lista.some((o) => Math.abs(o.x - x) < d);
    for (let tx = 70; tx < A.W - 70; tx += 70 + ((tx * 37) % 40)) {
      let ok = -1; for (let k = 0; k < 30 && ok < 0; k++) { const c = tx + k; let p = true; for (let d = -2; d <= 2; d++) if (A.topo[c + d] !== A.topo[c]) p = false; const x = c * T + 8; if (p && !perto(x, A.portas, 160) && !perto(x, A.fogos, 160) && !A.emboscadas.some((e) => x > e.x0 - 40 && x < e.x1 + 40)) ok = c; }
      if (ok >= 0) l.push({ x: ok * T + 8, y: A.topo[ok] * T, off: (ok * 0.37) % CICLO, queimou: -1 });
    }
    return l;
  };
  J.fornoFase = (v) => { const c = ((J.relogio || 0) + v.off) % CICLO; return { c, aviso: c > AVISO && c < FOGO, fogo: c >= FOGO, k: c >= FOGO ? (c - FOGO) / (CICLO - FOGO) : 0, rodada: Math.floor(((J.relogio || 0) + v.off) / CICLO) }; };
  const vida0 = J.passoVida;
  J.passoVida = function (dt) {
    vida0(dt);
    const A = F.atual, h = J.heroi; if (!A || A.regiao !== 'ruinas' || !h || h.estado === 'morto') return;
    for (const v of J.fornosDe(A)) {
      if (Math.abs(v.x - h.x) > 400) continue; const f = J.fornoFase(v);
      if (f.fogo && v.queimou !== f.rodada && Math.abs(h.x - v.x) < 18 && h.y > v.y - 80 && h.y <= v.y + 4) { v.queimou = f.rodada; J.feriHeroi(14, v.x, 'fogo', { fogo: true }); }
      if (f.fogo && Math.random() < 0.5 && J.poe) J.poe({ tipo: 'brasa', x: v.x + J.k.rnd(-6, 6), y: v.y - 20 - Math.random() * 40, vx: J.k.rnd(-20, 20), vy: J.k.rnd(-120, -60), grav: -20, vida: 0.6, max: 0.6, cor: '#ffb050', tam: 1.6 });
      if (f.aviso && Math.random() < 0.05) J.k.som('fogo', 0.25, 1.3);
    }
  };
})();
