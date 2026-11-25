/* SINA · o Primeiro. Tudo o que é conteúdo: espécies, armas, roupas, receitas, perícias, títulos, magias e textos. */
(function () {
  'use strict';
  const C = window.Dados = {};

  // ---------- materiais ----------
  C.MAT = {
    galho: 'Galho', pedra: 'Pedra lascada', fibra: 'Fibra', folha: 'Folha grande', fruta: 'Fruta do mato', erva: 'Erva de cura', carne: 'Carne', osso: 'Osso',
    couro: 'Couro de lobo', pele: 'Pele de cobra', presa: 'Presa', trapo: 'Trapo', ferro: 'Ferro velho', orelha: 'Orelha de goblin', flecha: 'Flecha', madeira: 'Tora', seca: 'Carne seca', prata: 'Escama de prata',
  };
  C.COMER = { fruta: { fome: 14, vida: 4 }, erva: { fome: 2, vida: 26, cura: true }, carne: { fome: 30, vida: 8 }, seca: { fome: 42, vida: 14 } };

  // ---------- armas ----------
  // alcance e altura: área do golpe. tempo: duração. custo: vigor. quebra: quanto abala a firmeza do inimigo
  C.ARMAS = {
    punho: { nome: 'Punhos', dano: 8, alcance: 30, altura: 34, tempo: 0.27, custo: 7, quebra: 0.7, per: 'punho', desc: 'Barro duro. É o que você tem.' },
    porrete: { nome: 'Porrete de galho', dano: 13, alcance: 42, altura: 48, tempo: 0.36, custo: 10, quebra: 1.5, per: 'porrete', desc: 'Pesado e torto. Abala quem leva.' },
    faca: { nome: 'Faca de pedra', dano: 11, alcance: 32, altura: 34, tempo: 0.22, custo: 6, quebra: 0.6, per: 'lamina', critico: 0.18, desc: 'Rápida. Às vezes acha a carne certa.' },
    machado: { nome: 'Machado de pedra', dano: 20, alcance: 44, altura: 52, tempo: 0.46, custo: 15, quebra: 2, per: 'machado', desc: 'Lento, mas parte osso.' },
    lanca: { nome: 'Lança de pedra', dano: 15, alcance: 66, altura: 22, tempo: 0.36, custo: 11, quebra: 1, per: 'lanca', estoca: true, desc: 'Mantém a fome dos outros longe.' },
    arco: { nome: 'Arco de galho', dano: 17, alcance: 30, altura: 30, tempo: 0.5, custo: 10, quebra: 0.8, per: 'arco', tiro: true, desc: 'Gasta flechas. Segure para mirar mais forte.' },
    osso_clava: { nome: 'Clava de osso', dano: 22, alcance: 46, altura: 50, tempo: 0.4, custo: 13, quebra: 2, per: 'porrete', desc: 'O osso de um bate no outro.' },
    adaga: { nome: 'Adaga de ferro', dano: 18, alcance: 34, altura: 34, tempo: 0.2, custo: 6, quebra: 0.7, per: 'lamina', critico: 0.28, desc: 'Ferro achado, fio novo.' },
    espada: { nome: 'Espada rude', dano: 26, alcance: 50, altura: 52, tempo: 0.34, custo: 11, quebra: 1.4, per: 'espada', critico: 0.1, desc: 'A primeira espada do mundo.' },
    machado_ferro: { nome: 'Machado de ferro', dano: 36, alcance: 48, altura: 54, tempo: 0.46, custo: 16, quebra: 3, per: 'machado', desc: 'Derruba árvore e chefe.' },
  };
  C.ORDEM_ARMAS = Object.keys(C.ARMAS);
  C.ROUPAS = {
    barro: { nome: 'Nu, de barro', def: 0, desc: 'Nada entre você e o mundo.' },
    folhas: { nome: 'Roupa de folhas', def: 0.12, vigor: 10, desc: 'Esconde o cheiro: os bichos demoram mais a ver você.' },
    couro: { nome: 'Roupa de couro de lobo', def: 0.26, vigor: 20, vida: 20, desc: 'Costurada com fibra. Segura mordida.' },
  };

  // ---------- receitas ----------
  C.RECEITAS = [
    { id: 'porrete', tipo: 'arma', custo: { galho: 3 } },
    { id: 'faca', tipo: 'arma', custo: { pedra: 2, fibra: 1 } },
    { id: 'lanca', tipo: 'arma', custo: { galho: 3, pedra: 1, fibra: 2 } },
    { id: 'machado', tipo: 'arma', custo: { galho: 2, pedra: 3, fibra: 2 } },
    { id: 'arco', tipo: 'arma', custo: { galho: 4, fibra: 5 }, oficio: 2 },
    { id: 'flecha', tipo: 'item', nome: '4 flechas', qtd: 4, custo: { galho: 1, pedra: 1 } },
    { id: 'osso_clava', tipo: 'arma', custo: { osso: 6, couro: 1, fibra: 3 }, oficio: 2 },
    { id: 'adaga', tipo: 'arma', custo: { ferro: 2, presa: 1, couro: 1 }, oficio: 3 },
    { id: 'espada', tipo: 'arma', custo: { ferro: 5, couro: 2, galho: 1 }, oficio: 4 },
    { id: 'machado_ferro', tipo: 'arma', custo: { ferro: 6, galho: 3, couro: 2 }, oficio: 5 },
    { id: 'folhas', tipo: 'roupa', custo: { folha: 8, fibra: 4 } },
    { id: 'couro', tipo: 'roupa', custo: { couro: 6, fibra: 5, presa: 1 }, oficio: 2 },
    { id: 'curativo', tipo: 'item', nome: 'Curativo', qtd: 1, custo: { erva: 2, trapo: 1 }, vai: 'curativo', desc: 'Cura mais e tira veneno.' },
    { id: 'isca', tipo: 'item', nome: 'Fio mais afiado', vai: 'afiar', custo: { pedra: 3, osso: 2 }, desc: 'A arma na mão ganha +4% de dano (até 5 vezes).' },
  ];
  C.MAT.curativo = 'Curativo';
  C.COMER.curativo = { vida: 55, fome: 0, cura: true };

  // ---------- perícias: crescem com o uso ----------
  C.PERICIAS = {
    punho: ['Punhos', 'dano com as mãos'], porrete: ['Porretes e clavas', 'dano com porrete e clava'], lamina: ['Lâminas curtas', 'dano com faca e adaga'], espada: ['Espadas', 'dano com espada'],
    machado: ['Machados', 'dano com machado'], lanca: ['Lanças', 'dano com lança'], arco: ['Arcos', 'dano com arco'], magia: ['Sina', 'força das magias'],
    corpo: ['Corpo', 'vida máxima, cresce ao apanhar'], folego: ['Fôlego', 'vigor máximo, cresce ao esquivar'], pernas: ['Pernas', 'velocidade e pulo'], coleta: ['Coleta', 'chance de achar em dobro'], oficio: ['Ofício', 'libera receitas melhores'],
  };
  C.xpNivel = (n) => Math.round(10 + n * n * 9); // experiência para sair do nível n
  C.BONUS = 0.055;

  // ---------- espécies e títulos ----------
  C.ESPECIES = {
    lobo: { nome: 'Lobos', um: 'lobo', cor: '#9fb4d0' }, cobra: { nome: 'Cobras', um: 'cobra', cor: '#b8c060' }, zumbi: { nome: 'Zumbis', um: 'zumbi', cor: '#b8a0c8' }, goblin: { nome: 'Goblins', um: 'goblin', cor: '#d8a060' },
  };
  C.TITULOS = {
    lobo: [[25, 'Perseguidor de Lobos', '+12% de dano em lobos'], [100, 'Caçador de Lobos', 'Faro do Lobo: você corre 12% mais, e a esquiva gasta metade do vigor'], [250, 'Flagelo da Matilha', 'lobos fogem feridos e o bote deles não derruba você']],
    cobra: [[25, 'Pisador de Cobras', '+12% de dano em cobras'], [100, 'Caçador de Cobras', 'Sangue Frio: veneno não pega em você, e seus golpes envenenam'], [250, 'Língua de Serpente', 'seu veneno vale o dobro']],
    zumbi: [[25, 'Coveiro', '+12% de dano em zumbis'], [100, 'Caçador de Mortos', 'Barro Vivo: cada morte devolve 6 de vida'], [250, 'Fim do Descanso', 'mortos explodem em brasa quando caem']],
    goblin: [[25, 'Cortador de Orelhas', '+12% de dano em goblins'], [100, 'Caçador de Goblins', 'Olho Esperto: materiais em dobro dos inimigos e +15% de chance de golpe crítico'], [250, 'Terror dos Goblins', 'goblins recuam quando você chega perto']],
  };

  // ---------- magias ----------
  C.MAGIAS = {
    brasa: { nome: 'Brasa do Barro', custo: 24, espera: 0.5, cor: '#ff9a40', desc: 'Um pedaço do fogo que assou você. Explode no que tocar.' },
    vento: { nome: 'Passo do Vento', custo: 30, espera: 8, cor: '#9fd8ff', desc: 'Por 6 segundos, corra e esquive sem gastar vigor.' },
    espinhos: { nome: 'Espinhos da Mata', custo: 34, espera: 2, cor: '#a8d060', desc: 'Três espinhos que atravessam a fila toda.' },
    folego: { nome: 'Fôlego da Terra', custo: 48, espera: 16, cor: '#ffe39a', desc: 'A terra devolve um terço da sua vida.' },
    tremor: { nome: 'Tremor', custo: 38, espera: 4, cor: '#d8b070', desc: 'Soca o chão: duas ondas de pedra.' },
  };

  // ---------- inimigos ----------
  // vel px/s, alcance do golpe, prep: aviso, golpe: duração, recua: descanso, firme: golpes até cambalear
  // reflexo: chance de reagir ao seu golpe; flanco: vontade de ir às suas costas; finta: golpe falso; bruto: não recua
  C.TIPOS = {
    // lobos
    lobo: { nome: 'Lobo', esp: 'lobo', spr: 'lobo', hp: 40, dano: 14, vel: 126, visao: 280, alcance: 88, prep: 0.34, golpe: 0.34, recua: 0.5, firme: 2.4, reflexo: 0.55, flanco: 0.6, finta: 0.22, uiva: true, w: 40, h: 30, salta: 270, cai: { couro: 0.45, carne: 0.5, osso: 0.3, presa: 0.12 }, passo: 9 },
    lobo_negro: { nome: 'Lobo negro', esp: 'lobo', spr: 'lobo_negro', hp: 30, dano: 12, vel: 172, visao: 320, alcance: 96, prep: 0.26, golpe: 0.32, recua: 0.55, firme: 1.8, reflexo: 0.8, flanco: 1, finta: 0.35, sorrateiro: true, batecorre: true, w: 38, h: 30, salta: 310, cai: { couro: 0.4, carne: 0.3, presa: 0.35 }, passo: 8 },
    lobo_rubro: { nome: 'Lobo vermelho', esp: 'lobo', spr: 'lobo_rubro', hp: 160, dano: 25, vel: 132, visao: 320, alcance: 104, prep: 0.42, golpe: 0.36, recua: 0.5, firme: 6, reflexo: 0.3, flanco: 0.2, seguidos: 2, uiva: true, bruto: true, w: 58, h: 48, salta: 300, cai: { couro: 2, carne: 2, presa: 1, osso: 0.6 }, passo: 11 },
    // cobras
    cobra: { nome: 'Cobra', esp: 'cobra', spr: 'cobra', hp: 36, dano: 9, vel: 54, visao: 180, alcance: 66, prep: 0.36, golpe: 0.26, recua: 0.6, firme: 1.6, reflexo: 0.5, escondida: 0.4, w: 30, h: 26, salta: 200, veneno: 4, cai: { pele: 0.5, presa: 0.4, carne: 0.3 }, passo: 8 },
    cobra_cuspe: { nome: 'Cobra cuspideira', esp: 'cobra', spr: 'cobra', hp: 36, dano: 10, vel: 46, visao: 280, alcance: 200, prep: 0.5, golpe: 0.2, recua: 0.9, firme: 1.4, reflexo: 0.3, rajada: true, atira: 'veneno', distancia: 130, veneno: 5, w: 30, h: 26, cai: { pele: 0.4, presa: 0.6 }, passo: 8, tinta: 'rgba(160,220,60,0.2)' },
    cobra_coral: { nome: 'Cobra coral', esp: 'cobra', spr: 'cobra_coral', hp: 20, dano: 6, vel: 96, visao: 150, alcance: 70, prep: 0.22, golpe: 0.22, recua: 0.5, firme: 1, reflexo: 0.6, escondida: 0.12, w: 24, h: 20, salta: 230, veneno: 9, cai: { pele: 0.3, presa: 0.8 }, passo: 6 },
    cobra_prata: { nome: 'Cobra de prata', esp: 'cobra', spr: 'cobra_prata', hp: 92, dano: 19, vel: 48, visao: 240, alcance: 84, prep: 0.46, golpe: 0.3, recua: 0.6, firme: 6, reflexo: 0.2, casca: true, seguidos: 2, bruto: true, w: 42, h: 44, salta: 220, veneno: 3, cai: { prata: 1, pele: 1, presa: 0.5 }, passo: 9 },
    // zumbis
    zumbi: { nome: 'Morto', esp: 'zumbi', spr: 'zumbi', hp: 66, dano: 17, vel: 42, visao: 240, alcance: 38, prep: 0.42, golpe: 0.24, recua: 0.45, firme: 5, agarra: true, levanta: 0.35, seguidos: 2, w: 20, h: 58, cai: { trapo: 0.6, osso: 0.5, ferro: 0.18 }, passo: 8 },
    zumbi_mulher: { nome: 'A que grita', esp: 'zumbi', spr: 'zumbi_mulher', hp: 48, dano: 13, vel: 112, visao: 280, alcance: 46, prep: 0.28, golpe: 0.22, recua: 0.35, firme: 2.6, reflexo: 0.25, flanco: 0.3, seguidos: 3, grito: true, levanta: 0.2, salta2: true, avanco: 170, w: 20, h: 54, cai: { trapo: 0.8, osso: 0.4 }, passo: 9 },
    zumbi_machado: { nome: 'Morto do machado', esp: 'zumbi', spr: 'zumbi_machado', hp: 92, dano: 27, vel: 48, visao: 260, alcance: 50, prep: 0.52, golpe: 0.26, recua: 0.5, firme: 7, bruto: true, levanta: 0.25, avanco: 150, w: 24, h: 62, cai: { pedra: 1, osso: 0.6, ferro: 0.35, trapo: 0.4 }, passo: 9 },
    zumbi_lanca: { nome: 'Caçadora morta', esp: 'zumbi', spr: 'zumbi_lanca', hp: 62, dano: 20, vel: 70, visao: 290, alcance: 82, prep: 0.4, golpe: 0.24, recua: 0.45, firme: 4, reflexo: 0.35, finta: 0.3, levanta: 0.2, avanco: 120, w: 20, h: 58, cai: { galho: 0.8, pedra: 0.6, trapo: 0.5, ferro: 0.2 }, passo: 9 },
    zumbi_inchado: { nome: 'Inchado', esp: 'zumbi', spr: 'zumbi_inchado', hp: 130, dano: 30, vel: 30, visao: 220, alcance: 44, prep: 0.6, golpe: 0.28, recua: 0.6, firme: 9, bruto: true, gas: true, onda: true, w: 34, h: 66, cai: { pedra: 1, trapo: 1, osso: 1, ferro: 0.4 }, passo: 9 },
    // goblins
    goblin: { nome: 'Goblin da faca', esp: 'goblin', spr: 'goblin', hp: 42, dano: 12, vel: 96, visao: 270, alcance: 36, prep: 0.24, golpe: 0.18, recua: 0.35, firme: 2, reflexo: 0.6, flanco: 0.5, finta: 0.35, seguidos: 2, foge: 0.25, rouba: true, w: 20, h: 42, cai: { orelha: 0.7, ferro: 0.35, trapo: 0.3 }, passo: 7 },
    goblin_pedra: { nome: 'Goblin da funda', esp: 'goblin', spr: 'goblin', hp: 32, dano: 11, vel: 78, visao: 320, alcance: 240, prep: 0.5, golpe: 0.16, recua: 0.7, firme: 1.4, reflexo: 0.4, atira: 'pedra', distancia: 160, w: 20, h: 42, cai: { orelha: 0.6, pedra: 0.8, ferro: 0.25 }, passo: 7, tinta: 'rgba(120,60,30,0.25)' },
    goblin_arco: { nome: 'Goblin arqueiro', esp: 'goblin', spr: 'goblin_arco', hp: 38, dano: 14, vel: 88, visao: 380, alcance: 300, prep: 0.55, golpe: 0.2, recua: 0.6, firme: 1.6, reflexo: 0.5, rajada: true, atira: 'flechaI', distancia: 200, w: 20, h: 46, cai: { flecha: 2, orelha: 0.6, fibra: 0.6 }, passo: 7 },
    goblin_xama: { nome: 'Xamã goblin', esp: 'goblin', spr: 'goblin_xama', hp: 46, dano: 16, vel: 62, visao: 340, alcance: 250, prep: 0.6, golpe: 0.24, recua: 0.8, firme: 2, reflexo: 0.3, cura: true, atira: 'feitico', distancia: 180, w: 22, h: 48, cai: { orelha: 1, erva: 1, osso: 0.6, presa: 0.4 }, passo: 7 },
    goblin_porrete: { nome: 'Bruto do porrete', esp: 'goblin', spr: 'goblin_porrete', hp: 150, dano: 30, vel: 58, visao: 260, alcance: 52, prep: 0.56, golpe: 0.28, recua: 0.55, firme: 9, bruto: true, onda: true, avanco: 60, w: 38, h: 66, cai: { orelha: 1, galho: 2, couro: 1, ferro: 0.5 }, passo: 10 },
    goblin_guerreiro: { nome: 'Goblin guerreiro', esp: 'goblin', spr: 'goblin_guerreiro', hp: 72, dano: 18, vel: 78, visao: 280, alcance: 44, prep: 0.32, golpe: 0.2, recua: 0.35, firme: 4, reflexo: 0.75, escudo: true, seguidos: 2, avanco: 160, w: 24, h: 48, cai: { ferro: 1, orelha: 0.8, couro: 0.3 }, passo: 8 },
    // os líderes de cada caminho
    alfa: { nome: 'O Alfa Cravado', esp: 'lobo', spr: 'alfa', hp: 760, dano: 24, vel: 150, visao: 520, alcance: 110, prep: 0.42, golpe: 0.4, recua: 0.6, firme: 10, w: 62, h: 50, salta: 340, chefe: true, seguidos: 3, poder: 'uivo', chama: 'lobo', chamaL: ['lobo', 'lobo_negro', 'lobo'], cai: { couro: 4, presa: 3, carne: 3 }, passo: 11, magia: 'vento' },
    rainha: { nome: 'A Rainha Pálida', esp: 'cobra', spr: 'rainha', hp: 700, dano: 18, vel: 60, visao: 520, alcance: 92, prep: 0.5, golpe: 0.3, recua: 0.7, firme: 11, w: 50, h: 66, salta: 250, chefe: true, seguidos: 2, veneno: 8, poder: 'cuspe', chama: 'cobra', chamaL: ['cobra', 'cobra_coral', 'cobra'], cai: { pele: 4, presa: 5, ferro: 2 }, passo: 10, magia: 'espinhos' },
    carcereiro: { nome: 'O Carcereiro', esp: 'zumbi', spr: 'carcereiro', hp: 940, dano: 32, vel: 46, visao: 520, alcance: 52, prep: 0.62, golpe: 0.26, recua: 0.7, firme: 16, w: 26, h: 70, chefe: true, seguidos: 3, poder: 'cova', chama: 'zumbi', chamaL: ['zumbi', 'zumbi_mulher', 'zumbi_lanca'], cai: { ferro: 6, osso: 4, trapo: 3 }, passo: 9, magia: 'folego' },
    chefe: { nome: 'Gurgo, dono do Fortim', esp: 'goblin', spr: 'chefe', hp: 840, dano: 30, vel: 72, visao: 520, alcance: 58, prep: 0.56, golpe: 0.28, recua: 0.6, firme: 13, w: 34, h: 70, chefe: true, seguidos: 2, poder: 'salto', chama: 'goblin', chamaL: ['goblin', 'goblin_guerreiro', 'goblin_arco'], cai: { ferro: 7, orelha: 3, couro: 2 }, passo: 9, magia: 'tremor' },
  };

  // ---------- regiões ----------
  C.REGIOES = {
    floresta: { nome: 'Floresta Antiga', fundo: 'f_floresta', p: 'floresta', nevoa: '96,168,156', luz: [150, 172, 166], amb: 'brisa', ar: ['vagalume', 'vagalume', 'folha', 'esporo'], terra: [30, 22, 16] },
    lobos: { nome: 'Serra dos Uivos', fundo: 'f_lobos', p: 'lobos', nevoa: '120,146,184', luz: [112, 124, 152], amb: 'noite', ar: ['neve', 'neve', 'nevoa'], terra: [22, 24, 30] },
    cobras: { nome: 'Alagado das Presas', fundo: 'f_cobras', p: 'cobras', nevoa: '150,166,86', luz: [146, 146, 104], amb: 'rio', ar: ['esporo', 'vagalume', 'nevoa'], terra: [30, 27, 14] },
    zumbis: { nome: 'Chão dos Enterrados', fundo: 'f_zumbis', p: 'zumbis', nevoa: '160,146,176', luz: [136, 124, 144], amb: 'cripta', ar: ['cinza', 'nevoa', 'cinza'], terra: [28, 23, 28] },
    goblins: { nome: 'Barrancos do Fortim', fundo: 'f_goblins', p: 'goblins', nevoa: '190,128,84', luz: [158, 130, 104], amb: 'cinzas', ar: ['brasinha', 'cinza', 'brasinha'], terra: [36, 22, 14] },
    vale: { nome: 'Vale do Rio Manso', fundo: 'f_vale', p: 'vale', nevoa: '150,166,140', luz: [160, 160, 138], amb: 'rio', ar: ['vagalume', 'folha', 'esporo', 'vagalume'], terra: [32, 25, 17] },
  };

  // ---------- história ----------
  C.NASCE = [
    'Antes de haver nome para as coisas, havia a floresta.',
    'E alguém, que não quis ficar sozinho com ela, desceu as mãos até o barro.',
    'Moldou um peito. Dois olhos. Um medo.',
    'Soprou. E foi embora sem dizer por quê.',
  ];
  C.ACORDA = ['Frio. É a primeira coisa que você sabe.', 'A segunda: precisa continuar vivo.'];
  C.MORTES = {
    lobo: 'Os lobos não deixaram nem o barro.', cobra: 'O veneno endureceu o barro por dentro.', zumbi: 'Agora você também está embaixo da terra.', goblin: 'Alguém usa sua orelha num colar.',
    fome: 'O corpo de barro secou de fome.', espinhos: 'A floresta cravou você nela.', queda: 'O barro quebrou na queda.',
  };
  C.DICAS = {
    andar: ['A e D andam. Espaço pula: segure para ir mais alto.', 'Arraste o lado esquerdo da tela para andar. Pular fica à direita.'],
    colher: ['E colhe o que brilha: galhos, pedras, folhas, fibras.', 'Toque em Usar para colher o que brilha.'],
    criar: ['Já dá para fazer um porrete: abra a mochila com I.', 'Já dá para fazer um porrete: toque em Mochila.'],
    golpe: ['J ou clique golpeia. Três seguidos fazem o combo. Shift esquiva.', 'Golpe repete o combo. Esquiva rola por dentro do ataque.'],
    baixo: ['No ar, S com golpe acerta para baixo e quica.', 'No ar, manche para baixo com Golpe quica no alvo.'],
    forte: ['Segure K para um golpe carregado: abala quem é firme.', 'Segure Forte para um golpe carregado.'],
    comer: ['Q come a melhor coisa da mochila. A fome não espera.', 'Comer usa a melhor coisa da mochila. A fome não espera.'],
    magia: ['R solta a Brasa do Barro. Acertar golpes enche a Sina.', 'Magia solta a Brasa. Acertar golpes enche a Sina.'],
    fogo: ['Descansar no fogo cura e guarda o caminho. Mas os bichos voltam.', 'Descansar no fogo cura. Mas os bichos voltam.'],
    caminhos: ['Quatro caminhos. Cada um tem seu dono, e você pode voltar.', 'Quatro caminhos. Cada um tem seu dono, e você pode voltar.'],
  };
})();
