/* SINA · robô de teste: joga a Parte I do início ao fim com a colisão real. Só carrega com ?robo no endereço.
   SINA.robo({ imortal: true }) devolve o relatório: onde travou, tempo de jogo e mortes. */
(function () {
  'use strict';
  const M = window.Mapa, J = window.Jogo, C = window.Conteudo, T = M.T;

  function caminho(de, ate) {
    const r = 10, id = (x, y) => y * M.W + x;
    const ini = [Math.floor(de.x / T), Math.floor(de.y / T)], fim = [Math.floor(ate.x / T), Math.floor(ate.y / T)];
    const veio = new Map([[id(ini[0], ini[1]), -1]]), fila = [ini];
    for (let i = 0; i < fila.length; i++) {
      const [x, y] = fila[i];
      if (Math.abs(x - fim[0]) + Math.abs(y - fim[1]) <= 1) {
        const rota = []; let k = id(x, y);
        while (k !== -1) { rota.push([(k % M.W) * T + 16, Math.floor(k / M.W) * T + 16]); k = veio.get(k); }
        return rota.reverse();
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = x + dx, b = y + dy;
        if (a < 0 || b < 0 || a >= M.W || b >= M.H || veio.has(id(a, b))) continue;
        if (!J.livre(a * T + 16, b * T + 16, r)) continue;
        veio.set(id(a, b), id(x, y)); fila.push([a, b]);
      }
    }
    return null;
  }

  window.SINA.robo = function (o) {
    o = o || {};
    window.SINA.auto = true;
    const en = J.entrada, S = window.SINA, dt = 1 / 30, log = [];
    const alvoEm = (x, y) => ({ x: x * T + 16, y: y * T + 16 });
    // [nome, x, y, o que fazer ao chegar]
    const ETAPAS = [
      ['Benta', 40, 134, 'benta'], ['fogueira vila', 50, 146, 'usa'], ['fogueira mata', 92, 38, 'usa'], ['Zé', 202, 26, 'chefe:ze'],
      ['junção', 150, 116], ['portão atalho', 133, 118, 'portao'], ['portão cemitério', 157, 120, 'portao'],
      ['fogueira cemitério', 172, 124, 'usa'], ['tesouro lateral', 218, 94, 'usa'], ['entrada cripta', 226, 152, 'usa'],
      ['fogueira cripta', 116, 236, 'usa'], ['Guardião', 160, 233, 'chefe:corpo'], ['volta', 116, 236, 'viaja:vila'], ['Benta fim', 40, 134, 'benta'],
    ];
    let etapa = 0, rota = null, ri = 0, passos = 0, parado = 0, ux = 0, uy = 0, mortes = 0, fim = false;
    const limite = (o.minutos || 60) * 60 * 30;
    const chegou = (x, y, d) => Math.hypot(J.P.x - x, J.P.y - y) < (d || 26);
    while (passos++ < limite && !fim) {
      const modal = S.modal;
      if (modal === 'descanso') { document.getElementById('d-sair').click(); }
      if (modal === 'conversa') { document.getElementById('conversa').click(); S.passoMundo(dt); continue; }
      if (modal === 'fim') { log.push('tela de fim'); fim = true; break; }
      if (modal === 'morte') { mortes++; S.passoMundo(dt); J.P.estado === 'morto' && (J.nascer(), S.fecharMorte && S.fecharMorte()); rota = null; continue; }
      const P = J.P;
      if (o.imortal) { P.inv = 1; P.vigor = J.vigorMax(); }
      // luta com quem está no caminho
      let perto = null, pd = 1e9;
      for (const e of J.inimigos) { if (e.estado === 'morto') continue; const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < pd) { pd = d; perto = e; } }
      const et0 = ETAPAS[etapa], c0 = et0 && M.p(et0[1], et0[2]), et = et0 && [et0[0], c0[0], c0[1], et0[3]];
      en.mx = en.my = 0;
      const lutar = perto && pd < (perto.d.chefe ? 70 : 44);
      if (lutar) { en.mira = Math.atan2(perto.y - P.y, perto.x - P.x); if (P.estado === 'livre') en.golpe = true; if (pd > 30) { en.mx = Math.cos(en.mira); en.my = Math.sin(en.mira); } }
      else if (et) {
        const dx = et[1] * T + 16, dy = et[2] * T + 16;
        // para interagir, basta o jogo oferecer a ação certa; para o resto, chegar perto do ponto
        const TIPOS = { usa: ['fogueira', 'tesouro', 'portal'], benta: ['benta'], portao: ['portao'] };
        const oferta = J.pertoDe();
        const naMao = TIPOS[et[3]] ? chegou(dx, dy, 90) && oferta && TIPOS[et[3]].includes(oferta.tipo) : chegou(dx, dy, 46);
        if (!naMao) {
          if (!rota) {
            rota = caminho(P, alvoEm(et[1], et[2])); ri = 0;
            if (!rota) { log.push('SEM CAMINHO até ' + et[0] + ' a partir de ' + Math.round(P.x / T) + ',' + Math.round(P.y / T)); break; }
          }
          while (ri < rota.length - 1 && chegou(rota[ri][0], rota[ri][1], 14)) ri++;
          const q = chegou(rota[ri][0], rota[ri][1], 14) ? [dx, dy] : rota[ri], a = Math.atan2(q[1] - P.y, q[0] - P.x);
          en.mx = Math.cos(a); en.my = Math.sin(a);
        } else {
          const acao = et[3];
          if (acao === 'usa' || acao === 'benta' || acao === 'portao') en.usa = true;
          if (acao && acao.startsWith('chefe:')) {
            const tipo = acao.slice(6);
            if (J.S.chefesMortos.includes(tipo)) { log.push(et[0] + ' caiu aos ' + Math.round(J.tempo / 60) + ' min'); etapa++; rota = null; }
          } else if (acao && acao.startsWith('viaja:')) {
            J.viajar(acao.slice(6)); document.getElementById('d-sair').click(); etapa++; rota = null;
          } else { log.push(et[0] + ' ok aos ' + Math.round(J.tempo / 60) + ' min'); etapa++; rota = null; }
        }
      } else { log.push('etapas concluídas'); fim = true; }
      S.passoMundo(dt);
      // detector de travamento
      if (Math.hypot(P.x - ux, P.y - uy) > 6) { ux = P.x; uy = P.y; parado = 0; } else if (++parado > 300 && !lutar) {
        log.push('TRAVOU em ' + Math.round(P.x / T) + ',' + Math.round(P.y / T) + ' indo para ' + (et ? et[0] : '?'));
        rota = null; parado = 0;
        if (log.filter((l) => l.startsWith('TRAVOU')).length > 6) break;
      }
    }
    return { log, min: Math.round(J.tempo / 60), mortes: J.S.mortes, brasas: J.S.brasas, fim: J.S.fim, x: Math.round(J.P.x / T), y: Math.round(J.P.y / T), etapa, passos };
  };
})();
