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
    const F = C.FOGUEIRAS, L = M.LUGARES, ben = C.NPCS[0];
    const ETAPAS = [
      ['Benta', ben.x, ben.y, 'benta'], ['fogueira Alvorada', F.alvorada.x, F.alvorada.y, 'usa'], ['fogueira Ybirá', F.ybira.x, F.ybira.y, 'usa'], ['fogueira Serra', F.toca.x, F.toca.y, 'usa'], ['Mapinguari', L.mapinguari[0], L.mapinguari[1], 'chefe:mapinguari'], ['entrada Mina', L.mina[0], L.mina[1] - 3, 'usa'], ['fogueira Mina', F.mina.x, F.mina.y, 'usa'], ['saída Mina', M.cr(203, 202)[0], M.cr(203, 202)[1], 'usa'],
      ['Zé', L.ze[0], L.ze[1], 'chefe:ze'], ['fogueira Mangue', F.mangue.x, F.mangue.y, 'usa'], ['entrada Gruta', L.gruta[0], L.gruta[1] - 3, 'usa'], ['fogueira Gruta', F.gruta.x, F.gruta.y, 'usa'], ['saída Gruta', M.cr(403, 207)[0], M.cr(403, 207)[1], 'usa'], ['Boiúna', L.boiuna[0], L.boiuna[1], 'chefe:boiuna'], ['fogueira Vale', F.vale.x, F.vale.y, 'usa'], ['Lobisomem', L.lobisomem[0], L.lobisomem[1], 'chefe:lobisomem'],
      ['fogueira Torre', F.torre.x, F.torre.y, 'usa'], ['fogueira Sertão', F.sertao.x, F.sertao.y, 'usa'], ['Tição', L.ticao[0], L.ticao[1], 'chefe:ticao'],
      ['fogueira Cemitério', F.cemiterio.x, F.cemiterio.y, 'usa'], ['entrada cripta', L.cripta[0], L.cripta[1] + 2, 'usa'], ['fogueira Cripta', F.cripta.x, F.cripta.y, 'usa'],
      ['Guardião', M.cr(160, 233)[0], M.cr(160, 233)[1], 'chefe:corpo'], ['volta', F.cripta.x, F.cripta.y, 'viaja:alvorada'], ['Benta 3 cacos', ben.x, ben.y, 'benta'],
      ['fogueira Cratera', F.cinzas.x, F.cinzas.y, 'usa'], ['Filho da Cauda', L.cauda[0], L.cauda[1], 'chefe:cauda'],
    ];
    let etapa = 0, rota = null, ri = 0, passos = 0, parado = 0, ux = 0, uy = 0, mortes = 0, fim = false;
    const limite = (o.minutos || 60) * 60 * 30;
    const chegou = (x, y, d) => Math.hypot(J.P.x - x, J.P.y - y) < (d || 26);
    while (passos++ < limite && !fim) {
      const modal = S.modal;
      if (modal === 'descanso') { document.getElementById('d-sair').click(); }
      if (modal === 'conversa') { document.getElementById('conversa').click(); S.passoMundo(dt); continue; }
      if (modal === 'fim') { log.push('tela de fim'); fim = true; break; }
      if (J.S.fim) { log.push('Filho da Cauda caiu aos ' + Math.round(J.tempo / 60) + ' min'); fim = true; break; }
      if (modal === 'morte') { mortes++; S.passoMundo(dt); J.P.estado === 'morto' && (J.nascer(), S.fecharMorte && S.fecharMorte()); rota = null; continue; }
      const P = J.P;
      if (o.imortal) { P.inv = 1; P.vigor = J.vigorMax(); }
      // luta com quem está no caminho
      let perto = null, pd = 1e9;
      for (const e of J.inimigos) { if (e.estado === 'morto') continue; const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < pd) { pd = d; perto = e; } }
      const et = ETAPAS[etapa];
      en.mx = en.my = 0;
      const lutar = perto && pd < (perto.d.chefe ? 70 : 44);
      if (lutar) { en.mira = Math.atan2(perto.y - P.y, perto.x - P.x); if (P.estado === 'livre') en.golpe = true; if (pd > 30) { en.mx = Math.cos(en.mira); en.my = Math.sin(en.mira); } }
      else if (et) {
        const dx = et[1] * T + 16, dy = et[2] * T + 16;
        // para interagir, basta o jogo oferecer a ação certa; para o resto, chegar perto do ponto
        const TIPOS = { usa: ['fogueira', 'tesouro', 'portal'], benta: ['npc'] };
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
          if (parado > 45 && parado % 90 < 45) { const lado = a + (Math.floor(parado / 90) % 2 ? 1.57 : -1.57); en.mx = Math.cos(lado); en.my = Math.sin(lado); } // empacou numa quina: dá a volta
        } else {
          const acao = et[3];
          if (acao === 'usa' || acao === 'benta') en.usa = true;
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

  // duelo: quem só aperta o botão, sem rolar nem recuar, contra um bando. Serve para medir a dificuldade.
  window.SINA.duelo = function (tipos, o) {
    o = o || {};
    window.SINA.auto = true;
    const en = J.entrada, dt = 1 / 30, c = M.LUGARES.encruz;
    J.nascer();
    J.eventos.length = 0;
    if (o.nivel) { J.S.nivel.forca = o.nivel; J.S.nivel.vida = o.nivel; J.S.nivel.vigor = o.nivel; }
    const guardado = JSON.stringify([J.S.equip, J.S.forja, J.S.cabacaMax]);
    if (o.equipado) { J.S.equip.armadura = 'cota'; J.S.forja.espada = 2; J.S.cabacaMax = 4; J.P.cabaca = 4; }
    J.P.vida = J.vidaMax(); J.P.vigor = J.vigorMax();
    J.P.x = c[0] * T; J.P.y = c[1] * T;
    J.inimigos = tipos.map((tipo, i) => {
      const d = C.TIPOS[tipo], hp = d.hp * (o.kHp || 1);
      return { id: 9000 + i, tipo, d, x: J.P.x + 70 + i * 22, y: J.P.y + (i % 2 ? 24 : -24), cx: J.P.x, cy: J.P.y, hp, hpMax: hp, dano: d.dano * (o.kDano || 1), brasas: d.brasas, estado: 'caca', t: 0, ang: 0, passo: 0, flash: 0, atord: 0, resta: 0, batida: false, firme: d.firme, fase: 1, vagar: 0, arenaX: J.P.x, arenaY: J.P.y, arenaR: 9999 };
    });
    let t = 0;
    while (t < 180 && J.P.estado !== 'morto' && J.inimigos.some((e) => e.estado !== 'morto')) {
      let perto = null, pd = 1e9;
      for (const e of J.inimigos) { if (e.estado === 'morto') continue; const d = Math.hypot(e.x - J.P.x, e.y - J.P.y); if (d < pd) { pd = d; perto = e; } }
      en.mira = Math.atan2(perto.y - J.P.y, perto.x - J.P.x);
      if (o.bom) {
        // joga direito: rola quando o golpe está para sair, bate só na brecha, cura de longe e guarda vigor
        let perigo = null, anel = J.fx.find((f) => f.tipo === 'anel' && Math.abs(Math.hypot(J.P.x - f.x, J.P.y - f.y) - f.r) < 34);
        for (const e of J.inimigos) { if (e.estado === 'morto') continue; const d = Math.hypot(e.x - J.P.x, e.y - J.P.y); if (e.estado === 'prepara' && e.t / e.resta > 0.72 && d < (e.d.salta ? 110 : e.d.alcance + 28) && !e.d.atira) perigo = e; }
        const tiro = J.tiros.find((q) => Math.hypot(q.x - J.P.x, q.y - J.P.y) < 36);
        const brecha = perto.estado === 'recua' || perto.estado === 'atordoado';
        en.mx = 0; en.my = 0;
        if ((perigo || anel || tiro) && J.P.vigor > 14) {
          const ref = perigo || perto, ang = Math.atan2(J.P.y - ref.y, J.P.x - ref.x) + (Math.random() < 0.5 ? 1.2 : -1.2);
          en.mx = Math.cos(ang); en.my = Math.sin(ang); en.rola = true;
        } else if ((brecha || (perto.estado === 'caca' && J.P.vigor > 45)) && pd < 58 + perto.d.r && J.P.vigor > 10 && J.P.estado === 'livre') {
          en.golpe = true;
        } else if (J.P.vida < 45 && J.P.cabaca > 0 && pd > 90 && J.P.estado === 'livre') {
          en.bebe = true;
        } else if (J.P.vigor < 30 || J.P.vida < 45 && J.P.cabaca > 0) {
          en.mx = -Math.cos(en.mira); en.my = -Math.sin(en.mira);
        } else if (pd > 44 + perto.d.r) {
          en.mx = Math.cos(en.mira); en.my = Math.sin(en.mira);
        }
      } else {
        en.mx = pd > 28 ? Math.cos(en.mira) : 0; en.my = pd > 28 ? Math.sin(en.mira) : 0;
        if (J.P.estado === 'livre') { if (J.P.vida < 40 && J.P.cabaca > 0) en.bebe = true; else if (pd < 44) en.golpe = true; }
      }
      J.passo(dt); J.eventos.length = 0; t += dt;
    }
    const venceu = J.P.estado !== 'morto', vida = Math.round(J.P.vida), tempo = Math.round(t), goles = J.S.cabacaMax - J.P.cabaca;
    J.P.estado = 'livre'; J.P.vida = J.vidaMax(); J.levantarMortos();
    if (o.nivel) { J.S.nivel.forca = 0; J.S.nivel.vida = 0; J.S.nivel.vigor = 0; }
    J.S.mortes = 0; J.S.resto = null;
    { const g = JSON.parse(guardado); J.S.equip = g[0]; J.S.forja = g[1]; J.S.cabacaMax = g[2]; }
    return { venceu, vida, tempo, goles };
  };
})();
