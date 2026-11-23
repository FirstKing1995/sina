/* SINA 2D · a primeira parte de Aruanã, vista de lado: Ermo das Covas, Campos da Aurora, Mata Funda e a Clareira do Lobisomem.
   O mapa é uma grade de blocos de 16 px montada por código. 0 vazio, 1 chão, 2 plataforma (sobe por baixo), 3 espinho. */
(function () {
  'use strict';
  const F = window.Fase = {};
  const T = F.T = 16, W = F.W = 520, H = F.H = 44;
  const g = F.grade = new Uint8Array(W * H);
  F.tile = (x, y) => (x < 0 || x >= W ? 1 : y < 0 ? 0 : y >= H ? 1 : g[y * W + x]);
  const pos = (x, y, v) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y * W + x] = v; };
  const rect = (x0, y0, x1, y1, v) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) pos(x, y, v); };
  const hash = F.hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

  // ---------- regiões (cores do céu, da névoa e do chão) ----------
  F.REGIOES = [
    { id: 'ermo', nome: 'Ermo das Covas', x0: 0, x1: 96, ceu: ['#0d1220', '#2a2a3c', '#5a4a52'], longe: '#1a1d2a', meio: '#11141c', nevoa: '#6a6a80', chao: ['#3a3430', '#26211f', '#171414'], grama: ['#4a5a3a', '#34422c'], luz: 0.55, amb: 'noite' },
    { id: 'campos', nome: 'Campos da Aurora', x0: 96, x1: 262, ceu: ['#16203a', '#3a3c5a', '#a0706a'], longe: '#262c44', meio: '#171d2a', nevoa: '#8a8098', chao: ['#4a3a2a', '#2e2419', '#1a1510'], grama: ['#5f7a3a', '#3e5a2a'], luz: 0.75, amb: 'brisa' },
    { id: 'mata', nome: 'Mata Funda', x0: 262, x1: 440, ceu: ['#08130f', '#12261c', '#2c4430'], longe: '#0f2018', meio: '#0a1610', nevoa: '#4a6a58', chao: ['#2e2a1e', '#1e1b13', '#12100b'], grama: ['#3a6a2e', '#24481e'], luz: 0.56, amb: 'noite' },
    { id: 'clareira', nome: 'Clareira do Uivo', x0: 440, x1: W, ceu: ['#06070e', '#1a1628', '#4a2a3a'], longe: '#140f1e', meio: '#0c0a14', nevoa: '#5a4060', chao: ['#2a2426', '#1a1618', '#0f0c0e'], grama: ['#3a4a3a', '#26322a'], luz: 0.5, amb: 'noite', lua: true },
  ];
  F.regiao = (px) => { const x = px / T; return F.REGIOES.find((r) => x >= r.x0 && x < r.x1) || F.REGIOES[F.REGIOES.length - 1]; };

  // ---------- o chão: altura da superfície por coluna ----------
  const topo = new Int16Array(W).fill(32);
  const faixa = (x0, x1, y) => { for (let x = x0; x <= x1; x++) topo[x] = y; };
  const rampa = (x0, x1, y0, y1) => { for (let x = x0; x <= x1; x++) topo[x] = Math.round(y0 + ((y1 - y0) * (x - x0)) / Math.max(1, x1 - x0)); };
  // Ermo das Covas: cova, primeiros passos, um degrau, um buraco
  faixa(0, 20, 32); faixa(21, 27, 30); faixa(28, 40, 29); faixa(41, 46, 40); faixa(47, 62, 30); rampa(63, 72, 30, 28); faixa(73, 96, 28);
  // Campos da Aurora: colinas, ruínas de Alvorada, buraco com espinhos
  rampa(97, 112, 28, 31); faixa(113, 140, 31); faixa(141, 148, 41); faixa(149, 170, 30); rampa(171, 186, 30, 26); faixa(187, 205, 26); rampa(206, 214, 26, 30); faixa(215, 222, 41); faixa(223, 262, 30);
  // Mata Funda: chão baixo, troncos altos, fosso de espinhos com galhos por cima
  faixa(263, 290, 31); faixa(291, 296, 25); faixa(297, 318, 32); faixa(319, 348, 41); faixa(349, 360, 29); faixa(361, 376, 33); faixa(377, 382, 27); faixa(383, 440, 31);
  // Clareira: plana, para a luta
  faixa(441, 446, 31); faixa(447, W - 1, 30);
  for (let x = 0; x < W; x++) rect(x, topo[x], x, H - 1, 1);
  // espinhos no fundo dos buracos
  for (const [a, b] of [[41, 46], [141, 148], [215, 222], [319, 348]]) for (let x = a; x <= b; x++) pos(x, topo[x] - 1, 3);
  // paredes nas pontas
  rect(0, 0, 1, H - 1, 1); rect(W - 2, 0, W - 1, H - 1, 1);

  // plataformas de madeira e galhos
  const plat = (x, y, w) => rect(x, y, x + w - 1, y, 2);
  plat(43, 27, 2); // degrau sobre o primeiro buraco
  plat(143, 28, 3); plat(151, 27, 3); plat(156, 24, 3); plat(161, 21, 3); plat(166, 18, 5); // ruína alta com baú
  plat(217, 29, 2); plat(220, 28, 2);
  plat(286, 28, 4); plat(286, 22, 3); plat(279, 19, 4); // árvore com baú
  // fosso da Mata: galhos e um caminho alto
  plat(321, 33, 3); plat(326, 30, 3); plat(332, 33, 3); plat(337, 30, 3); plat(344, 31, 3);
  plat(314, 29, 3); plat(318, 26, 3); plat(324, 23, 4); plat(331, 20, 5); plat(339, 23, 5); // caminho de cima, com marimbondos e baú
  plat(366, 30, 4); plat(372, 27, 3);
  plat(400, 28, 5); plat(406, 25, 3); plat(410, 22, 4);
  // blocos de pedra (ruínas)
  rect(124, 28, 126, 30, 1); rect(196, 23, 199, 25, 1); rect(231, 27, 232, 29, 1);
  F.topo = topo;

  // a clareira se fecha quando o chefe acorda
  F.ARENA = { x0: 447 * T, x1: (W - 3) * T, porta: 447, pisoY: 30 };
  F.fecharArena = (fecha) => { for (let y = 18; y < 30; y++) pos(F.ARENA.porta, y, fecha ? 1 : 0); };

  // ---------- quem mora em cada canto (x em blocos, y = chão daquela coluna) ----------
  const chaoEm = (x) => topo[x] * T;
  const ini = (t, x, y) => ({ t, x: x * T + 8, y: y != null ? y * T : chaoEm(x) });
  F.INIMIGOS = [
    ini('morto', 34), ini('morto', 56), ini('morto', 66),
    ini('morto', 106), ini('lobo', 118), ini('lobo', 121), ini('cobra', 133), ini('bandido', 155), ini('morto', 164), ini('queixada', 180), ini('queixada', 183),
    ini('ze', 191), ini('bandido', 203), ini('apagado', 198, 23), ini('cobra', 228), ini('bandido', 240), ini('morto', 246),
    ini('aranha', 270), ini('aranha', 276), ini('marimbondo', 288, 20), ini('apagado', 293), ini('onca', 305), ini('morcego', 312, 24),
    ini('marimbondo', 330, 16), ini('marimbondo', 335, 17), ini('aranha', 352), ini('brutamontes', 368), ini('alma', 380, 20), ini('onca', 392), ini('jagunco', 404), ini('morcego', 414, 22), ini('esqueleto', 426),
    ini('lobisomem', 492),
  ];
  F.FOGUEIRAS = [
    { id: 'covas', nome: 'Fogueira das Covas', x: 84 * T, y: chaoEm(84) },
    { id: 'alvorada', nome: 'Fogueira de Alvorada', x: 250 * T, y: chaoEm(250) },
    { id: 'mata', nome: 'Fogueira da Mata', x: 432 * T, y: chaoEm(432) },
  ];
  F.INICIO = { x: 8 * T, y: chaoEm(8) };
  F.BAUS = [
    { id: 'b1', x: 169 * T, y: 18 * T, brasas: 300 },
    { id: 'b2', x: 280 * T + 8, y: 19 * T, brasas: 450, cabaca: true },
    { id: 'b3', x: 333 * T, y: 20 * T, brasas: 700 },
    { id: 'b4', x: 411 * T + 8, y: 22 * T, brasas: 500 },
  ];
  F.PLACAS = [
    { x: 14 * T, y: chaoEm(14), t: 'A ou D para andar, Espaço para pular. Segure o pulo para ir mais alto.', toque: 'Arraste o dedo na metade esquerda para andar. Pular fica à direita.' },
    { x: 30 * T, y: chaoEm(30), t: 'J ou clique para golpear, até três vezes seguidas. Com W o golpe vai para cima. No ar, segure S e golpeie para baixo: o golpe quica em quem você acertar.', toque: 'Golpe ataca à frente. Puxe o manche para baixo no ar para golpear para baixo.' },
    { x: 50 * T, y: chaoEm(50), t: 'Shift esquiva: por um instante, nada te acerta. Golpear no meio da esquiva faz uma investida. Segure K ou o botão direito para carregar um golpe forte.', toque: 'Esquiva te deixa intocável por um instante. Segure Forte para carregar o golpe.' },
    { x: 76 * T, y: chaoEm(76), t: 'Cada golpe que acerta enche a Sina (o orbe ao lado do retrato). R e F gastam a Sina em magia. Q bebe da cabaça.', toque: 'Golpes enchem a Sina. Os botões Magia gastam. Beber cura.' },
    { x: 100 * T, y: chaoEm(100), t: 'Campos da Aurora. Quem acabou de atacar fica aberto: acerte nesse instante e o golpe pesa mais.' },
    { x: 266 * T, y: chaoEm(266), t: 'Mata Funda. Os galhos aguentam seu peso. Para descer de um galho, segure S e aperte Espaço.', toque: 'Mata Funda. Para descer de um galho, puxe o manche para baixo e pule.' },
    { x: 438 * T, y: chaoEm(438), t: 'Rastros enormes e um uivo que não para. Descanse antes de seguir.' },
  ];
  F.NPCS = [
    { id: 'benta', nome: 'Vidente Benta', spr: 'benta_s0', x: 89 * T, y: chaoEm(89), papel: 'historia' },
    { id: 'lauro', nome: 'Lauro, o mercador', spr: 'lauro_s0', x: 243 * T, y: chaoEm(243), papel: 'loja' },
    { id: 'bento', nome: 'Bento, o ferreiro', spr: 'bento_s0', x: 257 * T, y: chaoEm(257), papel: 'forja' },
  ];

  // ---------- enfeites: atrás (fundo do chão) e na frente ----------
  const D = (F.DECOR = []);
  const poe = (spr, x, camada, esc, escuro) => D.push({ spr, x: x * T, y: chaoEm(Math.max(0, Math.min(W - 1, Math.round(x)))), camada: camada || 0, esc: esc || 1, escuro: escuro || 0 });
  const ARV = { ermo: ['st19', 'cz19', 'st22', 'cz21'], campos: ['arv_campos0', 'arv_campos1', 'cp24', 'cp6', 'cp31', 'cp11'], mata: ['arv_mata0', 'arv_mata1', 'mt1', 'mt4', 'mtp7', 'mt10'], clareira: ['arv_cinzas0', 'arv_cinzas1', 'st19', 'cz19'] };
  const MIU = { ermo: ['cem0', 'cem1', 'cem2', 'cem3', 'crp0', 'pt33'], campos: ['pc24', 'pc25', 'pc35', 'moita_v2', 'pc57', 'mata3'], mata: ['pm24', 'pm35', 'mata0', 'mata1', 'mata7', 'moita_v3', 'pm57'], clareira: ['pz33', 'pz57', 'cem4', 'cem7'] };
  for (let x = 4; x < W - 4; x += 3) {
    const r = F.regiao(x * T), h1 = hash(x, 11), h2 = hash(x, 29);
    if (topo[x] > 36) continue; // não planta dentro de buraco
    const densa = r.id === 'mata' ? 0.55 : r.id === 'campos' ? 0.28 : 0.22;
    if (h1 < densa) poe(ARV[r.id][Math.floor(h2 * ARV[r.id].length)], x + h2 * 2, 0, 0.8 + h1, 0.15 + h2 * 0.3);
    if (hash(x, 47) < 0.5) poe(MIU[r.id][Math.floor(hash(x, 53) * MIU[r.id].length)], x + hash(x, 61) * 2, 0, 1, 0);
    if (hash(x, 71) < (r.id === 'mata' ? 0.18 : 0.06)) poe(MIU[r.id][Math.floor(hash(x, 83) * MIU[r.id].length)], x + 1, 1, 1.2, 0.5);
  }
  // marcos: cova do herói, ruínas de Alvorada, estátuas
  poe('sarcofago', 6, 0); poe('cem5', 10, 0); poe('cem6', 3, 0); poe('statue_angel', 72, 0);
  poe('ruina_crumbled_column_4', 117, 0); poe('statue_ancient_hero', 128, 0); poe('ruina_crumbled_column_1', 134, 0); poe('portao', 151, 0); poe('ruina_crumbled_column', 158, 0); poe('ruina_crumbled_column_2', 190, 0); poe('dry_fountain', 236, 0); poe('ruina_crumbled_column_5', 243, 0);
  poe('statue_wraith', 445, 0); poe('altar_new', 500, 0); poe('statue_sword', 470, 0);

  F.SPRITES_DECOR = [...new Set(D.map((d) => d.spr))];
  if (typeof module !== 'undefined') module.exports = F;
})();
