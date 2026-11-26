/* SINA · o tempo que faz. Chuva come a tocha e a lenha, neblina esconde os dois lados, neve cansa quem está mal vestido,
   vento empurra flecha, cinza enche a Sina e a tempestade derruba raio onde avisa. */
(function () {
  'use strict';
  const J = window.Jogo, F = window.Fase, K = J.k;
  const { rnd, treme, poeira, fx, cruza, caixa } = K;
  const PESO = {
    floresta: { limpo: 5, chuva: 2, neblina: 2, tempestade: 1 }, vale: { limpo: 5, chuva: 2, neblina: 2 }, lobos: { limpo: 3, neve: 4, vento: 2 },
    cobras: { neblina: 4, chuva: 3, limpo: 2 }, zumbis: { neblina: 3, limpo: 3, chuva: 1, cinza: 2 }, goblins: { cinza: 4, limpo: 3, tempestade: 1 }, minas: { limpo: 1 }, mangue: { neblina: 3, chuva: 2, limpo: 3 },
  };
  J.NOMECLIMA = { chuva: 'chuva', tempestade: 'tempestade', neblina: 'neblina', neve: 'neve', vento: 'ventania', cinza: 'cinza' };
  const C0 = (J.clima = { tipo: 'limpo', forca: 0, resta: 60, area: null, lado: 1, raio: 9 });
  J.cl = (...t) => (t.includes(C0.tipo) ? C0.forca : 0);
  function sorteia() {
    const A = F.atual, p = A.id.startsWith('covil') ? { limpo: 1 } : PESO[A.regiao] || { limpo: 1 };
    let t = 0; for (const k in p) t += p[k]; let r = Math.random() * t; for (const k in p) { r -= p[k]; if (r <= 0) return k; } return 'limpo';
  }
  J.mudaClima = function (tipo, dur) { C0.tipo = tipo; C0.forca = 0; C0.resta = dur || rnd(80, 200); C0.lado = Math.random() < 0.5 ? -1 : 1; C0.raio = rnd(5, 9); };
  const dentro = (x, y) => F.atual.escuros.some((e) => x > e.x0 && x < e.x1 && y > e.y0 && y <= e.y1 + 4);
  J.abrigado = () => { const h = J.heroi; return dentro(h.x, h.y); };
  J.passoClima = function (dt) {
    const A = F.atual, h = J.heroi, s = J.save;
    if (C0.area !== A.id) { C0.area = A.id; J.mudaClima(Math.random() < 0.5 ? 'limpo' : sorteia()); C0.forca = 0.6; }
    C0.resta -= dt;
    const acaba = C0.resta < 8; C0.forca = Math.max(0, Math.min(1, C0.forca + (acaba ? -dt / 8 : dt / 7)));
    if (C0.resta <= 0) J.mudaClima(C0.tipo === 'limpo' ? sorteia() : 'limpo');
    const ab = J.abrigado();
    // a chuva come a tocha três vezes mais rápido
    if (s.tochaAcesa && !ab) s.tocha -= dt * 2 * J.cl('chuva', 'tempestade');
    if (s.lar && s.lar.lenha > 0 && s.area === 'lar') s.lar.lenha = Math.max(0, s.lar.lenha - (dt / 30) * J.cl('chuva', 'tempestade'));
    const vento = J.cl('vento'); if (vento) for (const b of J.balas) b.vx += C0.lado * 150 * vento * dt;
    if (C0.tipo === 'tempestade' && C0.forca > 0.7) {
      C0.raio -= dt;
      if (C0.raio <= 0) {
        C0.raio = rnd(6, 12); J.clarao = 0.5; if (window.Som) Som.trovao(0.5);
        if (!ab && Math.random() < 0.6) { const x = h.x + rnd(-110, 110); J.magias.push({ tipo: 'raio', x, y: F.chao(x), t: -1.1, dur: 0.35, dano: 26, ja: new Set() }); }
      }
    }
  };
  J.passoRaio = function (m) {
    if (m.t < 0) { if (Math.random() < 0.5) fx({ tipo: 'faisca', x: m.x + rnd(-14, 14), y: m.y - rnd(0, 20), vy: -40, vida: 0.3, max: 0.3, cor: '#bfe0ff', tam: 1.6 }); return; }
    if (!m.caiu) {
      m.caiu = true; treme(9); J.clarao = 0.9; if (window.Som) Som.trovao(1); J.faiscas(m.x, m.y - 4, 26, '#dff0ff', 1.6); poeira(m.x, m.y, 10, 0);
      const box = { x0: m.x - 20, x1: m.x + 20, y0: m.y - 200, y1: m.y + 4 };
      if (cruza(box, caixa(J.heroi))) J.feriHeroi(m.dano, m.x, 'raio', { forte: true });
      for (const e of J.inimigos) if (e.vivo && cruza(box, caixa(e))) K.feriInimigo(e, 40, Math.sign(e.x - m.x) || 1, { magia: true, deHum: true, forte: true, quebra: 4 });
    }
  };
})();
