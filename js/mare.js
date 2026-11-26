/* SINA · a maré do Mangue: a água sobe e desce num ciclo de 80 segundos. Na maré alta o chão baixo
   fica alagado e quem anda dentro da água vai devagar (menos quem já é Pescador, título da gente da maré).
   O Caboclo d'Água, quando chama os caranguejos, puxa a maré alta por alguns segundos (J.mareAlta). */
(function () {
  const J = window.Jogo, F = window.Fase, T = 16, CICLO = 80, SOBE = 2.6;
  J.mareT = 20; J.mareAlta = 0;
  const naMare = (A) => A && A.regiao === 'mangue';
  function base(A) { if (A._agua != null) return A._agua; const l = [...A.topo].filter((v) => v < F.H).sort((a, b) => a - b); return (A._agua = l[Math.floor(l.length * 0.72)] + 1); }
  J.mareK = () => (J.mareAlta > 0 ? 1 : 0.5 - 0.5 * Math.cos((J.mareT * 2 * Math.PI) / CICLO));
  J.aguaY = () => { const A = F.atual; return naMare(A) ? (base(A) - J.mareK() * SOBE) * T : null; };
  let subindo = false;
  const vida0 = J.passoVida;
  J.passoVida = function (dt) {
    vida0(dt);
    const A = F.atual, h = J.heroi; if (!naMare(A) || !h || h.estado === 'morto') { if (h) h.xAnt = null; return; }
    J.mareT += dt; J.mareAlta = Math.max(0, J.mareAlta - dt);
    const y = J.aguaY(), dentro = h.y > y + 6, k = J.k;
    if (dentro && h.noChao && h.xAnt != null && J.titulo('mare') < 2) h.x -= (h.x - h.xAnt) * 0.38;
    if (dentro && h.xAnt != null && Math.abs(h.x - h.xAnt) > 0.6 && Math.random() < 0.14) J.fx.push({ tipo: 'gota', x: h.x + k.rnd(-6, 6), y: y, vx: k.rnd(-50, 50), vy: k.rnd(-140, -60), grav: 500, vida: 0.5, max: 0.5, cor: '#a8d8cc', tam: 1.6 });
    h.xAnt = h.x;
    // aviso quando a maré vira para cima
    const s = Math.sin((J.mareT * 2 * Math.PI) / CICLO) > 0;
    if (s && !subindo && J.mareK() < 0.3) k.texto(h.x, h.y - 80, 'a maré está subindo', '#9fd8d0', true);
    subindo = s;
  };
})();
