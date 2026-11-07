/* SINA · Aruanã: quem mora no mundo. Fogueiras, inimigos, itens, missões e conversas. Coordenadas em blocos. */
(function (raiz) {
  'use strict';
  const M = raiz.Mapa, C = {};
  const L = M.LUGARES, em = (k, dx, dy) => [L[k][0] + (dx || 0), L[k][1] + (dy || 0)];

  const fg = (nome, p) => ({ nome, x: p[0], y: p[1] });
  C.FOGUEIRAS = {
    alvorada: fg('Fogueira de Alvorada', em('alvorada', 2, 5)),
    ybira: fg('Fogueira de Ybirá', em('ybira', 0, 2)),
    vale: fg('Fogueira do Vale', em('vale', -4, 2)),
    toca: fg('Fogueira da Serra', em('toca', 8, 6)),
    mangue: fg('Fogueira do Mangue', em('manguefogo', 0, 2)),
    torre: fg('Fogueira da Torre', em('torre', 0, 2)),
    cemiterio: fg('Fogueira dos Sem-Nome', em('cemiterio', -14, -8)),
    sertao: fg('Fogueira do Sertão', em('sertao', 0, 2)),
    cinzas: fg('Fogueira da Cratera', em('cinzas', 0, 2)),
    cripta: fg('Fogueira da Cripta', M.cr(116, 236)),
  };

  C.LUGARES_NOME = [ // o nome aparece ao entrar
    ['Ermo das Covas', 'ermo'], ['Ruínas de Alvorada', 'alvorada'], ['Ruínas de Ybirá', 'ybira'], ['Vale dos Bichos', 'vale'], ['Toca dos Bandidos', 'toca'],
    ['Cemitério dos Sem-Nome', 'cemiterio'], ['Torre Caída', 'torre'], ['Forte de Tição', 'ticao'], ['Altar da Cauda', 'cauda'],
  ];

  // firme: quantos golpes aguenta antes de ser interrompido. Quem não é interrompido continua atacando.
  C.TIPOS = {
    morto: { nome: 'Morto-errante', spr: 'morto', hp: 70, dano: 30, vel: 38, visao: 150, alcance: 38, prep: 0.5, golpe: 0.2, recua: 0.6, brasas: 22, firme: 2, r: 11 },
    morto_forte: { nome: 'Morto de armadura', spr: 'morto_forte', hp: 190, dano: 46, vel: 34, visao: 170, alcance: 42, prep: 0.64, golpe: 0.22, recua: 0.55, brasas: 75, firme: 5, r: 12, seguidos: 2 },
    bandido: { nome: 'Bandido', spr: 'bandido', hp: 100, dano: 32, vel: 66, visao: 200, alcance: 38, prep: 0.32, golpe: 0.16, recua: 0.42, brasas: 46, firme: 2, r: 11, seguidos: 3 },
    apagado: { nome: 'Apagado', spr: 'apagado', hp: 66, dano: 28, vel: 46, visao: 250, alcance: 190, prep: 0.78, golpe: 0.1, recua: 0.7, brasas: 58, firme: 1, r: 11, atira: true, distancia: 130 },
    lobo: { nome: 'Bicho enlouquecido', spr: 'lobo', hp: 46, dano: 20, vel: 94, visao: 220, alcance: 68, prep: 0.4, golpe: 0.24, recua: 0.72, brasas: 30, firme: 1, r: 10, salta: true },
    cobra: { nome: 'Cobra-do-mato', spr: 'cobra', hp: 38, dano: 22, vel: 72, visao: 150, alcance: 62, prep: 0.34, golpe: 0.22, recua: 0.75, brasas: 24, firme: 1, r: 9, salta: true },
    aranha: { nome: 'Armadeira', spr: 'aranha', hp: 62, dano: 27, vel: 86, visao: 190, alcance: 70, prep: 0.38, golpe: 0.24, recua: 0.68, brasas: 40, firme: 1, r: 11, salta: true },
    escorpiao: { nome: 'Escorpião-do-sertão', spr: 'escorpiao', hp: 135, dano: 38, vel: 48, visao: 170, alcance: 42, prep: 0.5, golpe: 0.2, recua: 0.6, brasas: 68, firme: 3, r: 13, seguidos: 2 },
    morcego: { nome: 'Morcego-vampiro', spr: 'morcego', hp: 32, dano: 16, vel: 124, visao: 230, alcance: 72, prep: 0.26, golpe: 0.24, recua: 1.05, brasas: 22, firme: 1, r: 9, salta: true },
    assombracao: { nome: 'Assombração', spr: 'assombracao', hp: 112, dano: 34, vel: 60, visao: 190, alcance: 40, prep: 0.42, golpe: 0.18, recua: 0.55, brasas: 58, firme: 3, r: 11, seguidos: 2 },
    alma: { nome: 'Alma penada', spr: 'alma', hp: 54, dano: 26, vel: 56, visao: 240, alcance: 170, prep: 0.72, golpe: 0.1, recua: 0.8, brasas: 52, firme: 1, r: 11, atira: true, distancia: 105 },
    afogado: { nome: 'Afogado do mangue', spr: 'afogado', hp: 175, dano: 42, vel: 32, visao: 140, alcance: 42, prep: 0.68, golpe: 0.22, recua: 0.75, brasas: 82, firme: 5, r: 12 },
    brutamontes: { nome: 'Brutamontes', spr: 'brutamontes', hp: 340, dano: 52, vel: 40, visao: 170, alcance: 46, prep: 0.82, golpe: 0.24, recua: 1.05, brasas: 190, firme: 8, r: 14 },
    ze: { nome: 'Zé Facão, chefe dos bandidos', spr: 'ze', hp: 760, dano: 34, vel: 66, visao: 240, alcance: 50, prep: 0.48, golpe: 0.2, recua: 0.72, brasas: 1100, firme: 16, r: 15, chefe: 1.3, seguidos: 2, deixa: ['chave_ferro', 'facao'] },
    lobisomem: { nome: 'O Lobisomem', spr: 'lobisomem', hp: 1050, dano: 32, vel: 100, visao: 300, alcance: 84, prep: 0.5, golpe: 0.26, recua: 0.85, brasas: 1800, firme: 18, r: 18, chefe: 2, seguidos: 2, salta: true, deixa: ['caco', 'am_vigor'] },
    corpo: { nome: 'Corpo-seco Guardião', spr: 'corpo', hp: 1400, dano: 42, vel: 54, visao: 320, alcance: 60, prep: 0.6, golpe: 0.22, recua: 0.8, brasas: 2400, firme: 20, r: 16, chefe: 1.5, seguidos: 2, deixa: ['caco', 'placas'], tremor: true },
    ticao: { nome: 'Capitão Tição', spr: 'ticao', hp: 1700, dano: 46, vel: 60, visao: 320, alcance: 60, prep: 0.54, golpe: 0.2, recua: 0.7, brasas: 3200, firme: 22, r: 16, chefe: 1.6, seguidos: 3, deixa: ['caco', 'montante'], tremor: true, atiraFase2: true },
    cauda: { nome: 'O Filho da Cauda', spr: 'cauda', hp: 2600, dano: 54, vel: 68, visao: 400, alcance: 66, prep: 0.5, golpe: 0.2, recua: 0.6, brasas: 8000, firme: 26, r: 18, chefe: 1.9, seguidos: 3, tremor: true, atiraFase2: true, final: true },
  };
  // [tipo, x, y]; os chefes ficam num ponto fixo e os outros são espalhados abaixo
  C.INIMIGOS = [['ze', ...em('ze')], ['lobisomem', ...em('lobisomem')], ['ticao', ...em('ticao')], ['cauda', ...em('cauda')], ['corpo', ...M.cr(160, 230)]];
  for (const [t, x, y] of [
    ['morto_forte', 20, 206], ['morto', 38, 206], ['morto', 54, 200], ['morto', 54, 212], ['morto_forte', 62, 206], ['apagado', 68, 200], ['apagado', 68, 212],
    ['assombracao', 61, 222], ['alma', 62, 225], ['morcego', 40, 206], ['morcego', 42, 207], ['morto_forte', 50, 234], ['assombracao', 62, 238], ['morto_forte', 74, 234], ['morto', 56, 240], ['morto', 68, 240], ['apagado', 62, 232], ['morto_forte', 48, 242], ['morto', 76, 242],
    ['morto', 92, 236], ['morto_forte', 100, 236], ['morto_forte', 98, 205], ['apagado', 100, 201],
  ]) C.INIMIGOS.push([t, ...M.cr(x, y)]);

  // bandos por região
  const BANDOS = {
    campos: [['morto'], ['morto', 'morto'], ['lobo', 'lobo'], ['bandido'], ['morto', 'morto', 'morto'], ['cobra', 'cobra'], ['cobra', 'morto']],
    mata: [['lobo', 'lobo', 'lobo'], ['morto', 'apagado'], ['bandido', 'bandido'], ['aranha', 'aranha'], ['aranha', 'aranha', 'aranha'], ['cobra', 'cobra', 'lobo'], ['brutamontes']],
    mangue: [['afogado', 'afogado'], ['afogado', 'morto', 'morto'], ['cobra', 'cobra', 'cobra'], ['alma', 'alma'], ['morto_forte', 'morto'], ['morcego', 'morcego', 'afogado']],
    serra: [['bandido', 'bandido', 'bandido'], ['bandido', 'apagado'], ['brutamontes'], ['bandido', 'bandido', 'lobo'], ['brutamontes', 'bandido'], ['morcego', 'morcego', 'morcego']],
    sertao: [['escorpiao', 'escorpiao'], ['escorpiao', 'escorpiao', 'escorpiao'], ['apagado', 'apagado', 'apagado'], ['bandido', 'bandido', 'apagado'], ['morto_forte', 'morto_forte'], ['brutamontes', 'escorpiao']],
    cinzas: [['morto_forte', 'morto_forte', 'apagado'], ['alma', 'alma', 'alma'], ['assombracao', 'assombracao', 'apagado'], ['brutamontes', 'brutamontes'], ['morcego', 'morcego', 'morcego', 'morcego'], ['assombracao', 'morto_forte']],
  };
  const zonasSeguras = Object.values(C.FOGUEIRAS).map((f) => [f.x, f.y, 13]).concat([[L.alvorada[0], L.alvorada[1], 28], [L.ermo[0], L.ermo[1], 12]]);
  for (const k of ['ze', 'lobisomem', 'ticao', 'cauda']) zonasSeguras.push([L[k][0], L[k][1], 18]);
  for (let y = 12; y < M.CRIPTA_Y - 12; y += 22) for (let x = 12; x < M.W - 12; x += 22) {
    const px = x + Math.floor(M.hash(x, y) * 14), py = y + Math.floor(M.hash(y, x) * 14);
    if (!M.anda(px, py) || M.hash(px, py + 3) > 0.7 || zonasSeguras.some((z) => Math.hypot(z[0] - px, z[1] - py) < z[2])) continue;
    const lista = BANDOS[M.regiao(px, py).id], bando = lista[Math.floor(M.hash(px + 5, py) * lista.length)];
    bando.forEach((t, i) => { const a = px + (i % 2) * 2, b = py + (i >> 1) * 2; if (M.anda(a, b)) C.INIMIGOS.push([t, a, b]); });
  }

  // ---------- itens ----------
  // arma: dano, custo de vigor, lentidão (1 = normal), alcance (1 = normal); req: força exigida
  C.ITENS = {
    espada: { nome: 'Espada gasta', tipo: 'arma', ic: 'W_Sword001', dano: 17, custo: 22, lento: 1, alcance: 1, preco: 0 },
    adaga: { nome: 'Faca de osso', tipo: 'arma', ic: 'W_Dagger004', dano: 11, custo: 13, lento: 0.66, alcance: 0.82, preco: 300 },
    lanca: { nome: 'Lança de caça', tipo: 'arma', ic: 'W_Spear001', dano: 18, custo: 25, lento: 1.08, alcance: 1.45, preco: 650 },
    facao: { nome: 'Facão de Zé', tipo: 'arma', ic: 'W_Dagger018', dano: 25, custo: 30, lento: 1.16, alcance: 1.08 },
    machado: { nome: 'Machado de lenhador', tipo: 'arma', ic: 'W_Axe003', dano: 31, custo: 38, lento: 1.34, alcance: 1.05, req: 4, preco: 1400 },
    maca: { nome: 'Maça de ferro', tipo: 'arma', ic: 'W_Mace004', dano: 28, custo: 34, lento: 1.26, alcance: 0.95, req: 3 },
    montante: { nome: 'Montante de Tição', tipo: 'arma', ic: 'W_Sword008', dano: 44, custo: 50, lento: 1.62, alcance: 1.32, req: 8 },
    trapos: { nome: 'Trapos de cova', tipo: 'armadura', ic: 'A_Clothing01', def: 0, peso: 0, preco: 0 },
    couro: { nome: 'Gibão de couro', tipo: 'armadura', ic: 'A_Clothing02', def: 0.12, peso: 1, preco: 500 },
    cota: { nome: 'Cota enferrujada', tipo: 'armadura', ic: 'A_Armour01', def: 0.22, peso: 2, preco: 1500 },
    placas: { nome: 'Placas da cripta', tipo: 'armadura', ic: 'A_Armor04', def: 0.34, peso: 3 },
    am_vigor: { nome: 'Dente do Lobisomem', tipo: 'amuleto', ic: 'I_Fang', desc: 'Mais vigor máximo.', vigor: 24 },
    am_cura: { nome: 'Rosário de Zefa', tipo: 'amuleto', ic: 'Ac_Necklace02', desc: 'A cabaça cura mais.', cura: 22 },
    am_brasas: { nome: 'Moeda de defunto', tipo: 'amuleto', ic: 'I_GoldCoin', desc: 'Inimigos deixam mais brasas.', brasas: 0.25, preco: 900 },
    am_pele: { nome: 'Couro de boitatá', tipo: 'amuleto', ic: 'Ac_Necklace05', desc: 'Recebe menos dano.', def: 0.08 },
    caco_cabaca: { nome: 'Caco de cabaça', tipo: 'usa', ic: 'P_Green01', desc: 'A cabaça passa a guardar mais um gole.', preco: 1200 },
    pedra_vida: { nome: 'Pedra da carne', tipo: 'usa', ic: 'I_Ruby', desc: 'Sua vida máxima sobe um pouco, para sempre.' },
    pedra_forja: { nome: 'Pedra de forja', tipo: 'material', ic: 'I_Rock02', desc: 'Bento usa para afiar sua arma.', preco: 350 },
    erva: { nome: 'Erva-do-cemitério', tipo: 'material', ic: 'I_Leaf', desc: 'Zefa quer três.' },
    chave_ferro: { nome: 'Chave de ferro', tipo: 'chave', ic: 'I_Key01', desc: 'Abre a porta da cripta, no cemitério a sudeste de Alvorada.' },
    caco: { nome: 'Caco da Sina', tipo: 'chave', ic: 'I_Crystal01', desc: 'Um pedaço de estrela, ainda quente. Benta espera por eles.' },
    brasas: { nome: 'Punhado de brasas', tipo: 'brasas', ic: 'S_Fire01' },
  };
  C.BAU_TABELA = { // o que pode sair de um baú, por perigo da região
    1: ['brasas', 'brasas', 'adaga', 'couro', 'pedra_forja'],
    2: ['brasas', 'pedra_forja', 'lanca', 'couro', 'caco_cabaca', 'am_brasas'],
    3: ['brasas', 'pedra_forja', 'maca', 'cota', 'pedra_vida', 'am_cura'],
    4: ['brasas', 'pedra_forja', 'machado', 'pedra_vida', 'caco_cabaca', 'am_pele'],
    5: ['brasas', 'pedra_forja', 'pedra_vida', 'caco_cabaca'],
  };

  // baús: longe da estrada, em canto que só quem explora encontra
  C.TESOUROS = [{ id: 'cr1', x: M.cr(100, 204)[0], y: M.cr(100, 204)[1], perigo: 3 }, { id: 'cr2', x: M.cr(74, 243)[0], y: M.cr(74, 243)[1], perigo: 3 }];
  for (let y = 16; y < M.CRIPTA_Y - 16; y += 48) for (let x = 16; x < M.W - 16; x += 48) {
    const px = x + Math.floor(M.hash(x + 1, y) * 36), py = y + Math.floor(M.hash(y + 1, x) * 36);
    if (M.anda(px, py) && M.anda(px + 1, py) && M.CHAO[py * M.W + px] !== M.TERRA) C.TESOUROS.push({ id: 'b' + px + '_' + py, x: px, y: py, perigo: M.regiao(px, py).perigo });
  }
  C.ERVAS = [em('cemiterio', 12, 6), em('manguefim', 2, 0), em('pedreira', -2, 2), em('oasis', 2, 2), em('torre', 5, -5)].map((p, i) => ({ id: 'e' + i, x: p[0], y: p[1] }));

  // ---------- gente de Alvorada ----------
  const npc = (id, nome, spr, dx, dy, papel) => ({ id, nome, spr, x: L.alvorada[0] + dx, y: L.alvorada[1] + dy, papel });
  C.NPCS = [
    npc('benta', 'Vidente Benta', 'benta_s0', -8, -8, 'historia'),
    npc('lauro', 'Lauro, o mercador', 'lauro_s0', 8, -4, 'loja'),
    npc('bento', 'Bento, o ferreiro', 'bento_s0', 12, 4, 'forja'),
    npc('zefa', 'Curandeira Zefa', 'zefa_s0', -6, 3, 'missao'),
    npc('rosa', 'Capitã Rosa', 'rosa_s0', 0, -12, 'missao'),
    npc('tonho', 'Pastor Tonho', 'tonho_s0', -14, 2, 'missao'),
  ];
  C.LOJA = ['adaga', 'lanca', 'machado', 'couro', 'cota', 'am_brasas', 'caco_cabaca', 'pedra_forja'];
  C.CUSTO_FORJA = [400, 1100, 2600]; // +1, +2, +3; cada nível usa uma pedra de forja

  C.MISSOES = {
    rosa: { nome: 'Bandos na estrada', de: 'rosa', quer: { mata: 'bandido', n: 12 }, pede: 'Mate doze bandidos. Eles assaltam quem tenta chegar aqui. Sua cabeça vale menos que a deles, então cuidado.', premio: { item: 'cota', brasas: 600 }, obrigado: 'Doze. Pegue esta cota, foi do meu sargento. Ele não vai reclamar.' },
    tonho: { nome: 'Os bichos do Tonho', de: 'tonho', quer: { mata: 'lobo', n: 15 }, pede: 'Meu rebanho virou osso. Os bichos enlouquecidos vêm de todo lado. Mate quinze, por favor. E se achar o grande, no norte, corra.', premio: { item: 'am_cura', brasas: 400 }, obrigado: 'Minha mulher fez isto antes de morrer. Protege. Ou é o que ela dizia.' },
    zefa: { nome: 'Erva de defunto', de: 'zefa', quer: { item: 'erva', n: 3 }, pede: 'Três ervas-do-cemitério. Crescem longe, em canto ruim: mangue, pedreira, deserto. Com elas eu reforço sua cabaça.', premio: { item: 'caco_cabaca' }, obrigado: 'Boa. Agora sua cabaça guarda mais um gole. Não me agradeça, morra menos.' },
  };

  C.PLACAS = [
    { x: L.ermo[0] + 2, y: L.ermo[1] - 4, t: 'WASD para andar. Espaço para rolar: rolar na hora certa evita o golpe. Rolar antes da hora, não.' },
    { x: L.ermo[0] + 6, y: L.ermo[1] - 12, t: 'Clique para golpear; botão direito para o golpe forte. Golpear sem parar deixa você sem vigor na hora errada.' },
    { x: L.alvorada[0] - 10, y: L.alvorada[1] + 14, t: 'I abre seus equipamentos e missões. M abre o mapa. O mundo está aberto, e quase tudo nele pode matar você.' },
    { x: L.alvorada[0], y: L.alvorada[1] - 17, t: 'Quanto mais longe de Alvorada, piores as criaturas. Vá para onde quiser, mas volte quando precisar.' },
  ];

  C.CONVERSAS = {
    benta1: ['Você também acordou na cova, Sem-Sina. Ouvi sua terra se abrir.',
      'Vinte anos atrás a Cauda rachou o céu de Aruanã. Três cacos dela caíram por aí, e cada um enlouqueceu o que estava perto.',
      'Um está com o Lobisomem, ao norte, depois da Mata Funda. Outro com o Capitão Tição, no forte do sertão, a leste. O terceiro no peito do Corpo-seco, na cripta do cemitério, a sudeste.',
      'A cripta tem porta trancada, e a chave está com Zé Facão, na Serra do Ferro, a noroeste.',
      'Vá na ordem que quiser. Nenhuma delas é boa. Morra quantas vezes precisar, só não esqueça de voltar.'],
    bentaFalta: (n) => ['Você tem ' + n + ' de 3 cacos. Os outros continuam chamando.'],
    bentaTres: ['Três. Ponha na minha mão. Sente? A Cratera, ao nordeste, acabou de se abrir.',
      'Lá dorme o que a Cauda deixou. Se ele acordar sozinho, Aruanã acaba.',
      'Você ainda não entendeu, não é? Não é o destino que te trouxe de volta. É que você é o único sem nenhum.'],
    bentaCratera: ['O Altar da Cauda, no fundo da Cratera, ao nordeste. Prepare-se antes da névoa.'],
    bentaFim: ['Acabou? Não. Mas respire. O céu, hoje, está um pouco menos rachado.'],
  };

  raiz.Conteudo = C;
  if (typeof module !== 'undefined') module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
