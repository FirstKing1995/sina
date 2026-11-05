/* SINA · dados do jogo: povos, origens, perícias, talentos, magias, itens, monstros, regiões, cidades, masmorras.
   Tudo aqui é tabela; a lógica fica nos outros arquivos. Os povos vêm do Gods (humanos, elfos, anões, povo-fera). */
(function (G) {
  'use strict';
  const D = G.D = {};
  D.VERSION = '0.3.3';
  D.MAP = 320;

  // ---------- povos (herdados do Gods, agora jogáveis) ----------
  D.RACES = {
    humano: { name: 'Humano', desc: 'O povo mais espalhado de Aruanã. Faz de tudo e aprende mais depressa que qualquer outro.',
      dom: 'Versátil: +10% de experiência em tudo.', skills: { labia: 10, lamina: 5, defesa: 5 }, hp: 0, mp: 0, st: 0, speed: 1, xp: 1.1 },
    elfo: { name: 'Elfo', desc: 'Esguios, de orelha pontuda, filhos da Mata Funda. Atiram de longe e a magia corre no sangue.',
      dom: 'Vista longa: enxerga mais longe no escuro e a mana volta mais rápido.', skills: { arco: 15, destruicao: 5, alquimia: 5 }, hp: -10, mp: 25, st: 0, speed: 1.03, light: 1.45, mpRegen: 1.3 },
    anao: { name: 'Anão', desc: 'Baixos, largos e barbudos, da Serra do Ferro. Aguentam pancada, fogo e forjam como ninguém.',
      dom: 'Mão de pedra: o dobro de minério, 25% de resistência ao fogo.', skills: { forja: 15, defesa: 10, lamina: 5 }, hp: 25, mp: -10, st: 10, speed: 0.93, resist: { fogo: 0.25 }, mine: 2 },
    fera: { name: 'Povo-fera', desc: 'Gente de pelo, orelha de bicho e rabo, dos campos do Sertão. Rápidos, ferozes e de faro fino.',
      dom: 'Olhos da noite: enxerga no escuro e a vida volta sozinha.', skills: { lamina: 10, arco: 5, conjuracao: 5 }, hp: 10, mp: -5, st: 25, speed: 1.09, night: true, hpRegen: 1.0 },
  };
  D.RACE_ORDER = ['humano', 'elfo', 'anao', 'fera'];

  // ---------- origens (o kit inicial) ----------
  D.ORIGINS = {
    soldado: { name: 'Soldado', desc: 'Espada na mão e couro no peito. Aguenta a linha de frente.', kit: [['espada', 'ferro'], ['corpo_pesada', 'ferro'], ['pes_leve', 'couro']], skills: { lamina: 10, defesa: 10 }, gold: 40 },
    cacador: { name: 'Caçador', desc: 'Arco curto e passo leve. Mata antes de ser visto.', kit: [['arco', 'ferro'], ['adaga', 'ferro'], ['corpo_leve', 'couro']], skills: { arco: 15, alquimia: 5 }, gold: 40 },
    aprendiz: { name: 'Aprendiz de feitiço', desc: 'Um cajado, dois feitiços e muita curiosidade.', kit: [['cajado', 'ferro'], ['corpo_leve', 'pano']], spells: ['chama', 'cura'], skills: { destruicao: 10, restauracao: 10 }, gold: 30 },
    andarilho: { name: 'Andarilho', desc: 'Já viu de tudo um pouco. Adaga, gazuas e conversa boa.', kit: [['adaga', 'ferro'], ['cabeca_leve', 'pano'], ['corpo_leve', 'pano']], tools: ['gazua'], skills: { labia: 10, alquimia: 10 }, gold: 150 },
  };

  // ---------- perícias (sobem com o uso, de 1 a 100) ----------
  D.SKILLS = {
    lamina: { name: 'Lâmina', desc: 'Armas de corpo a corpo. Mais dano a cada nível.', grp: 'Combate' },
    arco: { name: 'Arco', desc: 'Arcos. Mais dano e flechas mais rápidas.', grp: 'Combate' },
    defesa: { name: 'Defesa', desc: 'Sobe quando você apanha de armadura. Mais armadura.', grp: 'Combate' },
    destruicao: { name: 'Destruição', desc: 'Fogo, gelo e raio. Mais dano mágico.', grp: 'Magia' },
    restauracao: { name: 'Restauração', desc: 'Cura e proteção. Cura mais forte.', grp: 'Magia' },
    conjuracao: { name: 'Conjuração', desc: 'Invocar aliados. Invocações mais fortes.', grp: 'Magia' },
    alquimia: { name: 'Alquimia', desc: 'Poções mais potentes a cada nível.', grp: 'Ofício' },
    forja: { name: 'Forja', desc: 'Aprimorar armas e armaduras com mais força.', grp: 'Ofício' },
    labia: { name: 'Lábia', desc: 'Preços melhores e conversas que abrem portas.', grp: 'Ofício' },
  };
  D.SKILL_ORDER = ['lamina', 'arco', 'defesa', 'destruicao', 'restauracao', 'conjuracao', 'alquimia', 'forja', 'labia'];

  // ---------- talentos (um ponto por nível de personagem) ----------
  D.PERKS = {
    golpe_firme: { skill: 'lamina', req: 20, name: 'Golpe firme', desc: '+20% de dano corpo a corpo.' },
    sangrar: { skill: 'lamina', req: 40, name: 'Sangrar', desc: 'Golpes corpo a corpo fazem o alvo sangrar (dano por 3 s).' },
    redemoinho: { skill: 'lamina', req: 70, name: 'Redemoinho', desc: 'O golpe forte gira em volta de você.' },
    mira: { skill: 'arco', req: 20, name: 'Mira', desc: '+20% de dano com arco.' },
    flecha_dupla: { skill: 'arco', req: 40, name: 'Flecha dupla', desc: '25% de chance de atirar duas flechas.' },
    leque: { skill: 'arco', req: 70, name: 'Leque', desc: 'O tiro forte solta três flechas em leque.' },
    couro_grosso: { skill: 'defesa', req: 20, name: 'Couro grosso', desc: '+15% de armadura.' },
    firmeza: { skill: 'defesa', req: 40, name: 'Firmeza', desc: 'Você não é mais empurrado, e leva 8% menos dano.' },
    segundo_folego: { skill: 'defesa', req: 70, name: 'Segundo fôlego', desc: 'Abaixo de 20% de vida, recupera 35% (uma vez a cada 2 minutos).' },
    chama_viva: { skill: 'destruicao', req: 20, name: 'Chama viva', desc: '+25% de dano mágico.' },
    economia: { skill: 'destruicao', req: 40, name: 'Economia', desc: 'Feitiços de destruição custam 25% menos.' },
    ruina: { skill: 'destruicao', req: 70, name: 'Ruína', desc: 'Inimigo morto por magia explode e fere os vizinhos.' },
    mao_leve: { skill: 'restauracao', req: 20, name: 'Mão leve', desc: 'Curas 30% mais fortes.' },
    fonte: { skill: 'restauracao', req: 40, name: 'Fonte', desc: 'A mana volta 50% mais depressa.' },
    vigilia: { skill: 'restauracao', req: 70, name: 'Vigília', desc: 'A vida volta sozinha, 1,5 por segundo.' },
    laco: { skill: 'conjuracao', req: 20, name: 'Laço', desc: 'Invocações duram o dobro.' },
    matilha: { skill: 'conjuracao', req: 40, name: 'Matilha', desc: 'Invoca dois aliados em vez de um.' },
    senhor: { skill: 'conjuracao', req: 70, name: 'Senhor das sombras', desc: 'Invocações com 50% mais vida e dano.' },
    boticario: { skill: 'alquimia', req: 20, name: 'Boticário', desc: 'Poções 25% mais fortes.' },
    coletor: { skill: 'alquimia', req: 40, name: 'Coletor', desc: 'Colhe duas ervas de cada planta.' },
    dose_dupla: { skill: 'alquimia', req: 70, name: 'Dose dupla', desc: '30% de chance de fazer duas poções.' },
    aco: { skill: 'forja', req: 20, name: 'Ferreiro', desc: 'Aprimorar custa metade do minério.' },
    mestre_forja: { skill: 'forja', req: 40, name: 'Mestre da forja', desc: 'Pode aprimorar até +7 (em vez de +5).' },
    estelar: { skill: 'forja', req: 70, name: 'Forja estelar', desc: 'Pode forjar armas de ferro-estelar com cinza da Cauda.' },
    pechincha: { skill: 'labia', req: 20, name: 'Pechincha', desc: 'Compra 15% mais barato.' },
    convencer: { skill: 'labia', req: 40, name: 'Convencer', desc: 'Abre opções de persuasão nas conversas.' },
    mercador: { skill: 'labia', req: 70, name: 'Mercador', desc: 'Vende 25% mais caro e acha 20% mais ouro.' },
  };

  // ---------- magias ----------
  // kind: bolt (projétil), chain (raio que salta), nova (anel em volta), heal, ward, light, summon, meteor
  D.SPELLS = {
    chama: { name: 'Chama', school: 'destruicao', kind: 'bolt', mana: 9, cd: 0.4, dmg: [9, 13], elem: 'fogo', speed: 10, color: '#f77622', price: 60, desc: 'Um dardo de fogo que queima o alvo.' },
    centelha: { name: 'Centelha', school: 'destruicao', kind: 'chain', mana: 16, cd: 0.7, dmg: [11, 16], elem: 'raio', jumps: 3, color: '#9be7ff', price: 180, desc: 'Um raio que salta entre até quatro inimigos.' },
    geada: { name: 'Geada', school: 'destruicao', kind: 'nova', mana: 22, cd: 2.5, dmg: [12, 18], elem: 'gelo', radius: 3.2, slow: 0.5, color: '#7cc8d0', price: 220, desc: 'Um anel de gelo em volta de você. Fere e deixa lento.' },
    bola_fogo: { name: 'Bola de fogo', school: 'destruicao', kind: 'bolt', mana: 30, cd: 1.2, dmg: [24, 34], elem: 'fogo', speed: 8, explode: 2.3, color: '#ff9b3d', price: 420, desc: 'Explode no impacto, ferindo tudo em volta.' },
    chuva_estrelas: { name: 'Chuva de estrelas', school: 'destruicao', kind: 'meteor', mana: 55, cd: 6, dmg: [40, 60], elem: 'raio', radius: 3, color: '#fee761', price: 0, desc: 'Pedaços da Cauda caem onde você mira. Só se aprende com o tomo da cratera.' },
    cura: { name: 'Cura', school: 'restauracao', kind: 'heal', mana: 14, cd: 1.0, amount: 30, color: '#9cf28a', price: 50, desc: 'Fecha as feridas.' },
    egide: { name: 'Égide', school: 'restauracao', kind: 'ward', mana: 25, cd: 12, amount: 45, dur: 12, color: '#f2da72', price: 200, desc: 'Um escudo de luz que absorve dano.' },
    luz: { name: 'Luz', school: 'restauracao', kind: 'light', mana: 8, cd: 2, dur: 90, color: '#fff3c4', price: 30, desc: 'Uma bola de luz que segue você no escuro.' },
    lobo: { name: 'Lobo espiritual', school: 'conjuracao', kind: 'summon', mana: 35, cd: 4, unit: 'lobo_espiritual', dur: 45, color: '#9fb6ff', price: 150, desc: 'Um lobo de névoa luta ao seu lado.' },
    erguer: { name: 'Erguer morto', school: 'conjuracao', kind: 'summon', mana: 45, cd: 6, unit: 'servo_osso', dur: 60, color: '#d8d0c8', price: 350, desc: 'Um esqueleto levanta para servir você.' },
  };
  D.SPELL_ORDER = ['chama', 'centelha', 'geada', 'bola_fogo', 'chuva_estrelas', 'cura', 'egide', 'luz', 'lobo', 'erguer'];

  // ---------- itens ----------
  // armas: dmg [min,max] no material ferro; spd ataques por segundo; reach em tiles
  D.WEAPONS = {
    adaga: { name: 'Adaga', dmg: [4, 7], spd: 2.4, reach: 1.15, arc: 80, two: false, price: 18 },
    espada: { name: 'Espada', dmg: [6, 10], spd: 1.7, reach: 1.4, arc: 100, two: false, price: 30 },
    machado: { name: 'Machado', dmg: [7, 12], spd: 1.45, reach: 1.35, arc: 95, two: false, price: 32 },
    maca: { name: 'Maça', dmg: [8, 12], spd: 1.35, reach: 1.3, arc: 90, two: false, price: 32, armorPen: 0.25 },
    montante: { name: 'Montante', dmg: [12, 19], spd: 1.05, reach: 1.75, arc: 130, two: true, price: 55 },
    martelo: { name: 'Martelo de guerra', dmg: [14, 22], spd: 0.9, reach: 1.6, arc: 120, two: true, price: 58, armorPen: 0.35 },
    arco: { name: 'Arco', dmg: [6, 10], spd: 1.5, reach: 12, ranged: true, two: true, price: 35 },
    arco_longo: { name: 'Arco longo', dmg: [9, 15], spd: 1.05, reach: 15, ranged: true, two: true, price: 60 },
    cajado: { name: 'Cajado', dmg: [4, 7], spd: 1.6, reach: 9, ranged: true, magic: true, two: true, price: 45, spell: 0.15 },
  };
  // armaduras: arm por peça no material base; leve x pesada
  D.ARMORS = {
    cabeca_leve: { name: 'Capuz', slot: 'cabeca', arm: 3, heavy: false, price: 14 },
    corpo_leve: { name: 'Gibão', slot: 'corpo', arm: 8, heavy: false, price: 30 },
    maos_leve: { name: 'Luvas', slot: 'maos', arm: 2, heavy: false, price: 12 },
    pes_leve: { name: 'Botas', slot: 'pes', arm: 2, heavy: false, price: 12 },
    cabeca_pesada: { name: 'Elmo', slot: 'cabeca', arm: 5, heavy: true, price: 22 },
    corpo_pesada: { name: 'Peitoral', slot: 'corpo', arm: 13, heavy: true, price: 48 },
    maos_pesada: { name: 'Manoplas', slot: 'maos', arm: 4, heavy: true, price: 18 },
    pes_pesada: { name: 'Grevas', slot: 'pes', arm: 4, heavy: true, price: 18 },
    anel: { name: 'Anel', slot: 'anel', arm: 0, jewel: true, price: 60 },
    amuleto: { name: 'Amuleto', slot: 'amuleto', arm: 0, jewel: true, price: 80 },
  };
  D.SLOTS = ['arma', 'cabeca', 'corpo', 'maos', 'pes', 'anel', 'amuleto'];
  D.SLOT_NAME = { arma: 'Arma', cabeca: 'Cabeça', corpo: 'Corpo', maos: 'Mãos', pes: 'Pés', anel: 'Anel', amuleto: 'Amuleto' };
  // materiais: tier, multiplicador, cor da lâmina/armadura; light: só armadura leve; heavy: só pesada
  D.MATS = {
    pano: { name: 'de pano', tier: 0, mult: 0.7, col: '#8a7a64', col2: '#5e5044', light: true },
    couro: { name: 'de couro', tier: 1, mult: 1, col: '#93683f', col2: '#6e4a35', light: true },
    ferro: { name: 'de ferro', tier: 1, mult: 1, col: '#9aa4b4', col2: '#5a6274' },
    aco: { name: 'de aço', tier: 2, mult: 1.5, col: '#c4ccd8', col2: '#7a8496' },
    elfico: { name: 'élfico', tier: 3, mult: 2.1, col: '#d8c06a', col2: '#7c8a3a' },
    anao: { name: 'anão', tier: 4, mult: 2.8, col: '#d08a4a', col2: '#7a4a2a' },
    vidro: { name: 'de vidro-da-cauda', tier: 5, mult: 3.6, col: '#7ce0c0', col2: '#2a7a6a' },
    estelar: { name: 'estelar', tier: 6, mult: 4.7, col: '#e8e4ff', col2: '#7a6ad0' },
  };
  D.MAT_BY_TIER = ['pano', 'ferro', 'aco', 'elfico', 'anao', 'vidro', 'estelar'];
  D.LIGHT_BY_TIER = ['pano', 'couro', 'couro', 'elfico', 'elfico', 'vidro', 'estelar'];
  D.RARITY = [
    { name: 'Comum', col: '#d8d0c8', aff: [0, 0], mult: 1 },
    { name: 'Mágico', col: '#6fa8ff', aff: [1, 2], mult: 1.1 },
    { name: 'Raro', col: '#f2da72', aff: [3, 4], mult: 1.2 },
    { name: 'Lendário', col: '#ff9b3d', aff: [4, 5], mult: 1.35 },
  ];
  // afixos: w = onde pode cair (a arma, a armadura, a joia); v = valor por nível do item
  D.AFFIX = {
    dano: { name: '+{v} de dano', w: 'a', base: 1, per: 0.45 },
    fogo: { name: '+{v} de dano de fogo', w: 'a', base: 2, per: 0.5 },
    gelo: { name: '+{v} de dano de gelo', w: 'a', base: 2, per: 0.45 },
    raio: { name: '+{v} de dano de raio', w: 'a', base: 1, per: 0.6 },
    veloc: { name: '+{v}% de velocidade de ataque', w: 'aj', base: 4, per: 0.4, cap: 25 },
    roubo: { name: '{v}% de roubo de vida', w: 'aj', base: 2, per: 0.15, cap: 8 },
    critico: { name: '+{v}% de chance de crítico', w: 'aj', base: 3, per: 0.25, cap: 18 },
    vida: { name: '+{v} de vida', w: 'rj', base: 8, per: 2.2 },
    mana: { name: '+{v} de mana', w: 'rj', base: 8, per: 2 },
    vigor: { name: '+{v} de vigor', w: 'rj', base: 8, per: 1.8 },
    armad: { name: '+{v} de armadura', w: 'r', base: 3, per: 1.2 },
    res_fogo: { name: '+{v}% de resistência ao fogo', w: 'rj', base: 6, per: 0.5, cap: 40 },
    res_gelo: { name: '+{v}% de resistência ao gelo', w: 'rj', base: 6, per: 0.5, cap: 40 },
    res_raio: { name: '+{v}% de resistência ao raio', w: 'rj', base: 6, per: 0.5, cap: 40 },
    regen: { name: '+{v} de vida por segundo', w: 'rj', base: 0.3, per: 0.08, dec: 1 },
    mregen: { name: '+{v} de mana por segundo', w: 'rj', base: 0.3, per: 0.08, dec: 1 },
    passo: { name: '+{v}% de velocidade de movimento', w: 'rj', base: 3, per: 0.15, cap: 15 },
    ouro: { name: '+{v}% de ouro achado', w: 'j', base: 8, per: 1, cap: 60 },
    magia: { name: '+{v}% de dano mágico', w: 'aj', base: 5, per: 0.5, cap: 40 },
    sk_lamina: { name: '+{v} em Lâmina', w: 'rj', base: 3, per: 0.2, cap: 15 },
    sk_arco: { name: '+{v} em Arco', w: 'rj', base: 3, per: 0.2, cap: 15 },
    sk_destruicao: { name: '+{v} em Destruição', w: 'rj', base: 3, per: 0.2, cap: 15 },
  };
  D.PREFIX = ['Ardente', 'Gélida', 'Trovejante', 'Sedenta', 'Veloz', 'Antiga', 'Sombria', 'Sagrada', 'Bruta', 'Fiel', 'Selvagem', 'Errante'];
  D.SUFFIX = ['da Aurora', 'do Sertão', 'da Mata', 'da Serra', 'do Lamento', 'da Maré', 'da Cauda', 'dos Antigos', 'do Lobo', 'da Onça', 'do Corvo', 'da Sina'];
  // lendários com nome: base, material, afixos fixos
  D.UNIQUES = {
    arco_taliel: { name: 'Arco de Taliel', base: 'arco_longo', mat: 'elfico', aff: { dano: 6, critico: 12, sk_arco: 10, passo: 8 }, lore: 'O arco de um caçador élfico. Ainda cheira a seiva.' },
    gorro_saci: { name: 'Gorro do Saci', base: 'cabeca_leve', mat: 'pano', aff: { passo: 15, ouro: 40, vigor: 30 }, lore: 'Vermelho como brasa. Dá vontade de pular numa perna só.' },
    martelo_durgo: { name: 'Martelo de Durgo', base: 'martelo', mat: 'anao', aff: { fogo: 18, dano: 10, armad: 0, veloc: 10 }, lore: 'Forjado no coração da Serra.' },
    garra_lobisomem: { name: 'Garra do Lobisomem', base: 'adaga', mat: 'aco', aff: { roubo: 8, veloc: 25, critico: 15 }, lore: 'Ainda pulsa nas noites de lua cheia.' },
    cajado_morvan: { name: 'Cajado de Morvan', base: 'cajado', mat: 'vidro', aff: { magia: 40, mana: 60, mregen: 3 }, lore: 'O Chanceler queria apagar as estrelas com isto.' },
    manto_cuca: { name: 'Manto da Cuca', base: 'corpo_leve', mat: 'elfico', aff: { mana: 80, res_fogo: 30, res_gelo: 30, mregen: 2 }, lore: 'Costurado com escamas e rezas ao contrário.' },
    escama_boitata: { name: 'Escama do Boitatá', base: 'corpo_pesada', mat: 'estelar', aff: { res_fogo: 40, vida: 120, armad: 40, regen: 3 }, lore: 'Ainda brilha como fogo-fátuo.' },
    espada_tição: { name: 'Facão do Capitão Tição', base: 'espada', mat: 'aco', aff: { fogo: 12, roubo: 5, dano: 8 }, lore: 'O capitão nunca soltou dele, nem depois de morto.' },
  };

  // ---------- coisas que empilham (consumíveis, ingredientes, minério, chaves) ----------
  // ic: ícone desenhado em sprites.js
  D.STACK = {
    pocao_vida: { name: 'Poção de vida', ic: 'pocao_v', price: 25, use: 'heal', v: 45, desc: 'Recupera 45 de vida.' },
    pocao_vida2: { name: 'Poção de vida forte', ic: 'pocao_v2', price: 70, use: 'heal', v: 110, desc: 'Recupera 110 de vida.' },
    pocao_mana: { name: 'Poção de mana', ic: 'pocao_m', price: 25, use: 'mana', v: 45, desc: 'Recupera 45 de mana.' },
    pocao_vigor: { name: 'Poção de vigor', ic: 'pocao_s', price: 20, use: 'stam', v: 60, desc: 'Recupera 60 de vigor.' },
    pocao_forca: { name: 'Tônico de força', ic: 'pocao_f', price: 60, use: 'buff', buff: 'forca', dur: 60, desc: '+25% de dano por 60 s.' },
    pocao_pedra: { name: 'Tônico de pedra', ic: 'pocao_p', price: 60, use: 'buff', buff: 'pedra', dur: 60, desc: '+40% de armadura por 60 s.' },
    pocao_fogo: { name: 'Antídoto de brasa', ic: 'pocao_r', price: 50, use: 'buff', buff: 'antifogo', dur: 90, desc: '+50% de resistência ao fogo por 90 s.' },
    peixe_assado: { name: 'Peixe assado', ic: 'peixe_a', price: 8, use: 'food', v: 25, desc: 'Recupera 25 de vida aos poucos.' },
    carne_assada: { name: 'Carne assada', ic: 'carne_a', price: 10, use: 'food', v: 35, desc: 'Recupera 35 de vida aos poucos.' },
    pao: { name: 'Pão de milho', ic: 'pao', price: 5, use: 'food', v: 18, desc: 'Recupera 18 de vida aos poucos.' },
    peixe: { name: 'Peixe cru', ic: 'peixe', price: 3, desc: 'Asse numa fogueira.' },
    carne: { name: 'Carne crua', ic: 'carne', price: 4, desc: 'Asse numa fogueira.' },
    // ervas (alquimia)
    guaco: { name: 'Folha de guaco', ic: 'erva_g', price: 4, herb: true, desc: 'Erva de cura. Campo e mata.' },
    mandacaru: { name: 'Flor de mandacaru', ic: 'erva_c', price: 6, herb: true, desc: 'Dá fôlego. Sertão.' },
    cogumelo: { name: 'Cogumelo fosco', ic: 'erva_m', price: 6, herb: true, desc: 'Clareia a mente. Pântano e cavernas.' },
    musgo: { name: 'Musgo de pedra', ic: 'erva_p', price: 6, herb: true, desc: 'Endurece a pele. Serra.' },
    raiz_mangue: { name: 'Raiz de mangue', ic: 'erva_r', price: 7, herb: true, desc: 'Esfria o sangue. Mangue e litoral.' },
    ipe: { name: 'Pétala de ipê', ic: 'erva_i', price: 8, herb: true, desc: 'Força. Campos floridos.' },
    cinza: { name: 'Cinza da Cauda', ic: 'cinza', price: 30, desc: 'Pó brilhante da cratera. Forja e alquimia rara.' },
    // minério e lingotes
    min_ferro: { name: 'Minério de ferro', ic: 'min_f', price: 6, desc: 'Funda na forja.' },
    min_prata: { name: 'Minério de prata', ic: 'min_p', price: 14, desc: 'Funda na forja.' },
    min_ouro: { name: 'Minério de ouro', ic: 'min_o', price: 24, desc: 'Funda na forja.' },
    lingote: { name: 'Lingote de ferro', ic: 'ling_f', price: 15, desc: 'Aprimora armas e armaduras.' },
    lingote_p: { name: 'Lingote de prata', ic: 'ling_p', price: 35, desc: 'Aprimora e faz joias.' },
    lingote_o: { name: 'Lingote de ouro', ic: 'ling_o', price: 60, desc: 'Aprimora e faz joias.' },
    gema: { name: 'Gema bruta', ic: 'gema', price: 50, desc: 'Encanta joias na forja.' },
    cristal_gelo: { name: 'Cristal de gelo eterno', ic: 'cristal', price: 40, quest: true, desc: 'Nunca derrete.' },
    // tomos
    tomo: { name: 'Tomo', ic: 'tomo', price: 0, desc: 'Leia para aprender um feitiço.' },
    // missão
    fragmento: { name: 'Fragmento da Sina', ic: 'fragmento', price: 0, quest: true, desc: 'Um caco de estrela. Morno ao toque, sussurra nomes.' },
    chave_selo: { name: 'Chave do Selo', ic: 'chave', price: 0, quest: true, desc: 'Forjada com quatro fragmentos. Abre o Véu da cratera.' },
    carta_coroa: { name: 'Carta lacrada', ic: 'carta', price: 0, quest: true, desc: 'Para o barqueiro Joca, na Vila do Lamento.' },
    diario_morvan: { name: 'Diário de Morvan', ic: 'tomo_n', price: 0, quest: true, desc: 'Letra miúda, tinta preta. Fala de um quinto fragmento.' },
    arco_perdido: { name: 'Arco de Taliel', ic: 'arco_q', price: 0, quest: true, desc: 'Um arco élfico achado no ninho. Taliel vai querer de volta.' },
    trofeu: { name: 'Troféu de caça', ic: 'trofeu', price: 30, desc: 'Prova de uma caçada grande.' },
    joia_velha: { name: 'Joia antiga', ic: 'joia', price: 45, desc: 'Vale um bom dinheiro.' },
  };

  // ferramentas (ficam no cinto; não ocupam espaço)
  D.TOOLS = {
    picareta: { name: 'Picareta', price: 40, desc: 'Quebra veios de minério.' },
    gazua: { name: 'Gazuas', price: 30, desc: 'Abre baús trancados.' },
    vara: { name: 'Vara de pesca', price: 25, desc: 'Pesque na beira da água (fique de frente para ela e use E).' },
    tocha: { name: 'Tocha', price: 15, desc: 'Ilumina mais longe nas masmorras. Fica acesa no cinto.' },
    machadinha: { name: 'Machadinha', price: 20, desc: 'Corta lenha para acender fogueira em qualquer lugar (tecla G).' },
  };

  // alquimia: duas ervas -> poção
  D.RECIPES = [
    { in: { guaco: 2 }, out: 'pocao_vida', skill: 0 },
    { in: { guaco: 2, ipe: 1 }, out: 'pocao_vida2', skill: 25 },
    { in: { cogumelo: 2 }, out: 'pocao_mana', skill: 0 },
    { in: { mandacaru: 2 }, out: 'pocao_vigor', skill: 0 },
    { in: { ipe: 2, mandacaru: 1 }, out: 'pocao_forca', skill: 15 },
    { in: { musgo: 2, guaco: 1 }, out: 'pocao_pedra', skill: 15 },
    { in: { raiz_mangue: 2, cogumelo: 1 }, out: 'pocao_fogo', skill: 20 },
  ];
  // forja: fundir minério
  D.SMELT = [{ in: { min_ferro: 2 }, out: 'lingote' }, { in: { min_prata: 2 }, out: 'lingote_p' }, { in: { min_ouro: 2 }, out: 'lingote_o' }];

  // ---------- monstros ----------
  // plan: como é desenhado. ai: melee, ranged, caster, charger, swarm, boss. lvl: nível base. elem: o tipo do ataque
  D.MON = {
    lobo: { name: 'Lobo', plan: 'wolf', fur: 0, hp: 26, dmg: 6, spd: 3.3, arm: 2, xp: 10, ai: 'melee', reach: 1.0, cd: 1.1, drops: { carne: 0.5 }, r: 0.38 },
    queixada: { name: 'Queixada', plan: 'beast', sp: 'porco', hp: 34, dmg: 7, spd: 2.6, arm: 4, xp: 11, ai: 'charger', reach: 0.9, cd: 1.6, drops: { carne: 0.7 }, r: 0.4 },
    bandido: { name: 'Bandido', plan: 'man', look: { skin: '#c28569', hair: '#3a2428', cloth: '#7a4a2a', cloth2: '#4a2a1a', wpn: 'espada' }, hp: 40, dmg: 8, spd: 2.6, arm: 6, xp: 16, ai: 'melee', reach: 1.3, cd: 1.3, drops: { gold: [3, 12], pocao_vida: 0.12, item: 0.12 }, r: 0.35 },
    bandido_arq: { name: 'Bandido arqueiro', plan: 'man', look: { skin: '#e8b796', hair: '#6e4a35', cloth: '#5a6a3a', cloth2: '#3a4a2a', wpn: 'arco' }, hp: 30, dmg: 7, spd: 2.5, arm: 3, xp: 16, ai: 'ranged', reach: 8, cd: 1.8, proj: 'flecha', drops: { gold: [3, 10], item: 0.1 }, r: 0.35 },
    saci: { name: 'Saci das Encruzilhadas', plan: 'saci', hp: 160, dmg: 10, spd: 4.4, arm: 6, xp: 120, ai: 'boss', boss: 'saci', reach: 1.1, cd: 0.9, drops: { gold: [60, 90], unique: 'gorro_saci' }, r: 0.33, unique: true },
    // mata
    armadeira: { name: 'Aranha-armadeira', plan: 'spider', col: '#5e4a3a', col2: '#c47a3e', hp: 30, dmg: 7, spd: 3.4, arm: 3, xp: 14, ai: 'melee', reach: 0.95, cd: 1.0, poison: 3, drops: {}, r: 0.4 },
    onca: { name: 'Onça-pintada', plan: 'beast', sp: 'onca', hp: 50, dmg: 11, spd: 3.6, arm: 4, xp: 22, ai: 'charger', reach: 1.0, cd: 1.3, drops: { carne: 0.8, trofeu: 0.25 }, r: 0.42 },
    fogo_fatuo: { name: 'Fogo-fátuo', plan: 'wisp', col: '#9fe0a0', hp: 22, dmg: 8, spd: 2.4, arm: 0, xp: 15, ai: 'caster', reach: 7, cd: 2.2, proj: 'orbe_verde', elem: 'raio', fly: true, drops: { pocao_mana: 0.15 }, r: 0.3 },
    curupira: { name: 'Curupira Corrompido', plan: 'curupira', hp: 520, dmg: 16, spd: 3.6, arm: 8, xp: 450, ai: 'boss', boss: 'curupira', reach: 1.3, cd: 1.1, drops: { gold: [120, 180], item: 1, item2: 1, fragmento: 1 }, r: 0.42 },
    // serra
    lobo_neve: { name: 'Lobo-das-neves', plan: 'wolf', fur: 3, hp: 48, dmg: 11, spd: 3.5, arm: 5, xp: 22, ai: 'melee', reach: 1.0, cd: 1.0, resist: { gelo: 0.5 }, drops: { carne: 0.6 }, r: 0.4 },
    mao_pedra: { name: 'Mão-de-pedra', plan: 'golem', col: '#6e6a74', col2: '#4b4553', hp: 95, dmg: 17, spd: 1.8, arm: 18, xp: 34, ai: 'melee', reach: 1.4, cd: 2.0, drops: { min_ferro: 0.7, gema: 0.06 }, r: 0.5 },
    morcego: { name: 'Morcego-vampiro', plan: 'bat', hp: 16, dmg: 5, spd: 4.4, arm: 0, xp: 8, ai: 'swarm', reach: 0.8, cd: 0.9, fly: true, drain: 0.5, drops: {}, r: 0.28 },
    rei_pedra: { name: 'Rei de Pedra', plan: 'golem', col: '#8a858a', col2: '#3a2c48', glow: '#e47c2c', big: 1.6, hp: 1300, dmg: 28, spd: 1.8, arm: 30, xp: 900, ai: 'boss', boss: 'rei_pedra', reach: 1.9, cd: 1.8, drops: { gold: [200, 300], item: 1, item2: 1, fragmento: 1, gema: 1 }, r: 0.75 },
    yeti: { name: 'Pé-de-gelo', plan: 'golem', col: '#d8dce8', col2: '#8c98ae', big: 1.3, hp: 520, dmg: 24, spd: 2.4, arm: 14, xp: 360, ai: 'boss', boss: 'brute', reach: 1.6, cd: 1.5, resist: { gelo: 0.8, fogo: -0.3 }, drops: { gold: [100, 150], item: 1, cristal_gelo: 3 }, r: 0.6 },
    // sertão
    escorpiao: { name: 'Escorpião gigante', plan: 'scorpion', col: '#8a5a2a', col2: '#c8a66c', hp: 60, dmg: 13, spd: 2.8, arm: 12, xp: 30, ai: 'melee', reach: 1.1, cd: 1.3, poison: 5, drops: {}, r: 0.45 },
    urubu: { name: 'Urubu-rei', plan: 'bird', hp: 38, dmg: 10, spd: 4.0, arm: 2, xp: 22, ai: 'swarm', reach: 0.9, cd: 1.2, fly: true, drops: {}, r: 0.32 },
    cangaceiro: { name: 'Cangaceiro-maldito', plan: 'man', look: { skin: '#9a8a7a', hair: '#2a2420', cloth: '#9a7a46', cloth2: '#6e5030', hat: 'canga', wpn: 'espada', undead: true }, hp: 75, dmg: 15, spd: 2.7, arm: 10, xp: 36, ai: 'melee', reach: 1.3, cd: 1.2, drops: { gold: [10, 25], item: 0.18 }, r: 0.35 },
    cangaceiro_arq: { name: 'Atirador-maldito', plan: 'man', look: { skin: '#9a8a7a', hair: '#2a2420', cloth: '#7a6a46', cloth2: '#5e4830', hat: 'canga', wpn: 'arco', undead: true }, hp: 55, dmg: 13, spd: 2.5, arm: 6, xp: 36, ai: 'ranged', reach: 9, cd: 1.6, proj: 'bala', drops: { gold: [10, 25], item: 0.15 }, r: 0.35 },
    escorpiao_rei: { name: 'Escorpião-rei', plan: 'scorpion', col: '#5a2a1a', col2: '#e4a672', big: 1.6, hp: 700, dmg: 24, spd: 3.0, arm: 22, xp: 500, ai: 'boss', boss: 'brute', reach: 1.6, cd: 1.3, poison: 8, drops: { gold: [150, 220], item: 1, trofeu: 1 }, r: 0.7, unique: true },
    lobisomem: { name: 'Lobisomem', plan: 'werewolf', hp: 1500, dmg: 30, spd: 4.2, arm: 16, xp: 1300, ai: 'boss', boss: 'lobisomem', reach: 1.5, cd: 0.9, drops: { gold: [250, 350], unique: 'garra_lobisomem', fragmento: 1, item: 1 }, r: 0.55 },
    capitao_ticao: { name: 'Capitão Tição', plan: 'man', look: { skin: '#7a6a5a', hair: '#1a1410', cloth: '#7a2a2a', cloth2: '#4a1a1a', hat: 'canga', wpn: 'espada', undead: true, glow: '#f77622' }, big: 1.35, hp: 900, dmg: 26, spd: 3.0, arm: 16, xp: 700, ai: 'boss', boss: 'brute', reach: 1.6, cd: 1.0, drops: { gold: [200, 300], unique: 'espada_tição', item: 1 }, r: 0.5 },
    // litoral e mangue
    caranguejo: { name: 'Guaiamum gigante', plan: 'beast', sp: 'caranguejo', big: 1.7, hp: 45, dmg: 10, spd: 2.2, arm: 14, xp: 20, ai: 'melee', reach: 1.0, cd: 1.4, drops: { peixe: 0.4 }, r: 0.42 },
    pirata: { name: 'Pirata afogado', plan: 'man', look: { skin: '#7a9a8a', hair: '#2a3a3a', cloth: '#2a4a6e', cloth2: '#1a2a44', hat: 'pirata', wpn: 'espada', undead: true }, hp: 62, dmg: 12, spd: 2.6, arm: 7, xp: 28, ai: 'melee', reach: 1.3, cd: 1.2, drops: { gold: [8, 30], joia_velha: 0.08, item: 0.16 }, r: 0.35 },
    jacare: { name: 'Jacaré-açu', plan: 'beast', sp: 'jacare', big: 1.4, hp: 90, dmg: 16, spd: 2.4, arm: 12, xp: 34, ai: 'charger', reach: 1.2, cd: 1.6, drops: { carne: 0.8, trofeu: 0.2 }, r: 0.5 },
    almirante: { name: 'Almirante Afogado', plan: 'man', look: { skin: '#5a7a6a', hair: '#ccd8d8', cloth: '#1a2a54', cloth2: '#0e1a34', hat: 'pirata', wpn: 'espada', undead: true, glow: '#7cc8d0' }, big: 1.35, hp: 1000, dmg: 24, spd: 2.9, arm: 14, xp: 750, ai: 'boss', boss: 'caster_boss', reach: 1.6, cd: 1.1, proj: 'orbe_azul', elem: 'gelo', drops: { gold: [250, 400], item: 1, item2: 1, joia_velha: 2 }, r: 0.5 },
    // pântano
    sapo: { name: 'Sapo-boi gigante', plan: 'frog', hp: 55, dmg: 12, spd: 2.0, arm: 4, xp: 26, ai: 'ranged', reach: 6, cd: 2.2, proj: 'cuspe', poison: 4, drops: { cogumelo: 0.3 }, r: 0.45 },
    afogado: { name: 'Afogado', plan: 'man', look: { skin: '#6a8a6a', hair: '#2a3a2a', cloth: '#4a5a4a', cloth2: '#2a3a2a', wpn: 'nada', undead: true }, hp: 80, dmg: 15, spd: 1.9, arm: 5, xp: 30, ai: 'melee', reach: 1.1, cd: 1.5, drops: { gold: [5, 20], item: 0.12 }, r: 0.36 },
    mapinguari: { name: 'Mapinguari', plan: 'mapinguari', big: 1.0, hp: 1800, dmg: 34, spd: 2.6, arm: 22, xp: 1400, ai: 'boss', boss: 'brute', reach: 1.8, cd: 1.4, drops: { gold: [300, 450], item: 1, item2: 1, trofeu: 2 }, r: 0.7, unique: true },
    cuca: { name: 'A Cuca', plan: 'cuca', hp: 1500, dmg: 26, spd: 2.8, arm: 12, xp: 1200, ai: 'boss', boss: 'cuca', reach: 8, cd: 1.6, proj: 'orbe_roxo', elem: 'gelo', drops: { gold: [250, 400], unique: 'manto_cuca', item: 1 }, r: 0.45 },
    // masmorras
    esqueleto: { name: 'Esqueleto', plan: 'skel', wpn: 'espada', hp: 34, dmg: 8, spd: 2.4, arm: 5, xp: 14, ai: 'melee', reach: 1.25, cd: 1.3, resist: { gelo: 0.3 }, drops: { gold: [2, 10], item: 0.1 }, r: 0.34 },
    esqueleto_arq: { name: 'Esqueleto arqueiro', plan: 'skel', wpn: 'arco', hp: 26, dmg: 7, spd: 2.3, arm: 3, xp: 14, ai: 'ranged', reach: 8, cd: 1.9, proj: 'flecha', drops: { gold: [2, 10], item: 0.08 }, r: 0.34 },
    corpo_seco: { name: 'Corpo-seco', plan: 'man', look: { skin: '#8a7a5a', hair: '#3a3020', cloth: '#5a4a3a', cloth2: '#3a2a20', wpn: 'nada', undead: true, glow: '#c8423a' }, hp: 90, dmg: 14, spd: 2.2, arm: 10, xp: 36, ai: 'melee', reach: 1.2, cd: 1.3, drain: 0.4, drops: { gold: [8, 20], item: 0.2 }, r: 0.36 },
    guardiao_cripta: { name: 'Corpo-seco Guardião', plan: 'man', look: { skin: '#8a7a5a', hair: '#3a3020', cloth: '#4a3a5a', cloth2: '#2a2040', wpn: 'montante', undead: true, glow: '#c8423a' }, big: 1.35, hp: 260, dmg: 12, spd: 2.4, arm: 6, xp: 180, ai: 'boss', boss: 'brute', reach: 1.6, cd: 1.4, drops: { gold: [50, 80], item: 1, fragmento: 1 }, r: 0.48 },
    chefe_bandido: { name: 'Zé Facão, chefe dos bandidos', plan: 'man', look: { skin: '#c28569', hair: '#1a1410', cloth: '#8a2a2c', cloth2: '#4a1a1a', wpn: 'machado' }, big: 1.3, hp: 320, dmg: 14, spd: 2.8, arm: 8, xp: 220, ai: 'boss', boss: 'brute', reach: 1.5, cd: 1.1, drops: { gold: [80, 120], item: 1 }, r: 0.46 },
    rainha_armadeira: { name: 'Rainha-armadeira', plan: 'spider', col: '#3a2a2a', col2: '#e43b44', big: 1.9, hp: 480, dmg: 15, spd: 3.0, arm: 8, xp: 340, ai: 'boss', boss: 'brood', reach: 1.4, cd: 1.2, poison: 5, drops: { gold: [80, 140], item: 1, arco_perdido: 1 }, r: 0.75 },
    cultista: { name: 'Apagado', plan: 'man', look: { skin: '#b89a8a', hair: '#1a1410', cloth: '#2a2430', cloth2: '#16121c', hood: true, wpn: 'cajado' }, hp: 60, dmg: 13, spd: 2.5, arm: 5, xp: 32, ai: 'caster', reach: 7, cd: 2.0, proj: 'orbe_roxo', elem: 'fogo', drops: { gold: [10, 30], pocao_mana: 0.2, item: 0.15 }, r: 0.35 },
    cultista_lam: { name: 'Lâmina Apagada', plan: 'man', look: { skin: '#b89a8a', hair: '#1a1410', cloth: '#3a2430', cloth2: '#1c121c', hood: true, wpn: 'espada' }, hp: 80, dmg: 16, spd: 3.0, arm: 10, xp: 34, ai: 'melee', reach: 1.3, cd: 1.0, drops: { gold: [10, 30], item: 0.15 }, r: 0.35 },
    morvan: { name: 'Chanceler Morvan', plan: 'man', look: { skin: '#d8c0b0', hair: '#c0cbdc', cloth: '#16121c', cloth2: '#3a2448', hood: true, wpn: 'cajado', glow: '#b55088' }, big: 1.25, hp: 1700, dmg: 28, spd: 2.8, arm: 14, xp: 1500, ai: 'boss', boss: 'morvan', reach: 8, cd: 1.3, proj: 'orbe_roxo', elem: 'fogo', drops: { gold: [300, 500], unique: 'cajado_morvan', diario_morvan: 1 }, r: 0.45 },
    mula: { name: 'Mula-sem-cabeça', plan: 'mula', hp: 140, dmg: 22, spd: 4.6, arm: 10, xp: 60, ai: 'charger', reach: 1.1, cd: 1.4, elem: 'fogo', trail: true, resist: { fogo: 0.9 }, drops: { cinza: 0.5, item: 0.2 }, r: 0.5 },
    brasa_viva: { name: 'Brasa-viva', plan: 'wisp', col: '#f77622', hp: 70, dmg: 18, spd: 2.8, arm: 4, xp: 45, ai: 'caster', reach: 7, cd: 1.8, proj: 'chama_m', elem: 'fogo', fly: true, resist: { fogo: 0.9, gelo: -0.5 }, drops: { cinza: 0.4 }, r: 0.3 },
    boitata: { name: 'Boitatá', plan: 'serpent', hp: 5200, dmg: 42, spd: 3.4, arm: 20, xp: 5000, ai: 'boss', boss: 'boitata', reach: 2, cd: 1.0, elem: 'fogo', resist: { fogo: 0.7, gelo: -0.25 }, drops: { gold: [800, 1200], unique: 'escama_boitata', fragmento: 1, item: 1, item2: 1 }, r: 0.9 },
    // aliados invocados
    lobo_espiritual: { name: 'Lobo espiritual', plan: 'wolf', fur: 9, hp: 60, dmg: 9, spd: 4, arm: 6, xp: 0, ai: 'melee', reach: 1.0, cd: 0.9, ally: true, r: 0.38 },
    servo_osso: { name: 'Servo de osso', plan: 'skel', wpn: 'espada', hp: 90, dmg: 12, spd: 2.8, arm: 10, xp: 0, ai: 'melee', reach: 1.25, cd: 1.1, ally: true, r: 0.34 },
    filhote: { name: 'Filhote de armadeira', plan: 'spider', col: '#4a3a3a', col2: '#e43b44', big: 0.7, hp: 14, dmg: 4, spd: 3.8, arm: 0, xp: 3, ai: 'swarm', reach: 0.8, cd: 0.9, drops: {}, r: 0.28 },
  };

  // ---------- regiões ----------
  // lvl: [mín, máx] dos monstros; mons: quem vive ali (peso); herb: a erva dali
  D.REGIONS = {
    campo: { name: 'Campos da Aurora', lvl: [1, 4], c: [165, 230], mons: { lobo: 4, queixada: 3, bandido: 3, bandido_arq: 2 }, herb: ['guaco', 'ipe'], music: 'campo' },
    mata: { name: 'Mata Funda', lvl: [3, 7], c: [68, 170], mons: { armadeira: 4, onca: 2, fogo_fatuo: 3, lobo: 1 }, herb: ['guaco', 'cogumelo'], music: 'mata' },
    litoral: { name: 'Costa do Sal', lvl: [4, 8], c: [95, 278], mons: { caranguejo: 3, pirata: 3, bandido: 2, bandido_arq: 1 }, herb: ['raiz_mangue', 'guaco'], music: 'campo' },
    serra: { name: 'Serra do Ferro', lvl: [6, 11], c: [168, 52], mons: { lobo_neve: 4, mao_pedra: 2, morcego: 2 }, herb: ['musgo'], music: 'serra' },
    mangue: { name: 'Mangue Sombrio', lvl: [7, 11], c: [268, 268], mons: { caranguejo: 3, jacare: 2, pirata: 3, sapo: 1 }, herb: ['raiz_mangue', 'cogumelo'], music: 'mata' },
    sertao: { name: 'Sertão das Cinzas', lvl: [9, 14], c: [268, 142], mons: { escorpiao: 3, urubu: 2, cangaceiro: 3, cangaceiro_arq: 2 }, herb: ['mandacaru'], music: 'sertao' },
    pantano: { name: 'Pântano do Lamento', lvl: [12, 17], c: [64, 64], mons: { sapo: 3, afogado: 4, fogo_fatuo: 2, jacare: 1 }, herb: ['cogumelo', 'raiz_mangue'], music: 'pantano' },
    cratera: { name: 'Cratera da Cauda', lvl: [16, 22], c: [165, 142], mons: { mula: 2, brasa_viva: 3, cultista: 2, cultista_lam: 2 }, herb: [], music: 'cratera' },
  };
  D.REGION_ORDER = ['campo', 'mata', 'litoral', 'serra', 'mangue', 'sertao', 'pantano', 'cratera'];

  // ---------- cidades ----------
  // style: madeira, mata, pedra, barro, capital, palafita. w/h em tiles
  D.CITIES = {
    alvorada: { name: 'Vila Alvorada', region: 'campo', at: [165, 232], w: 34, h: 26, style: 'madeira', race: 'humano', walls: true,
      desc: 'Vila de lavradores no coração dos Campos da Aurora. É aqui que tudo começa.' },
    ybira: { name: 'Ybirá', region: 'mata', at: [62, 170], w: 32, h: 26, style: 'mata', race: 'elfo', walls: false,
      desc: 'A cidade dos elfos, entre jequitibás de mil anos.' },
    forjafunda: { name: 'Forjafunda', region: 'serra', at: [168, 50], w: 38, h: 26, style: 'pedra', race: 'anao', walls: true,
      desc: 'Fortaleza anã cavada na Serra do Ferro. As forjas nunca apagam.' },
    jaguarete: { name: 'Jaguaretê', region: 'sertao', at: [270, 146], w: 32, h: 26, style: 'barro', race: 'fera', walls: true,
      desc: 'Aldeia-fortaleza do povo-fera, no meio do Sertão das Cinzas.' },
    coroa: { name: 'Coroa de Sal', region: 'litoral', at: [104, 278], w: 42, h: 30, style: 'capital', race: 'humano', walls: true,
      desc: 'A capital de Aruanã, de frente para o mar. Sede da Rainha Iolanda.' },
    lamento: { name: 'Vila do Lamento', region: 'pantano', at: [70, 72], w: 28, h: 22, style: 'palafita', race: 'mix', walls: false,
      desc: 'Casas sobre estacas, névoa o dia inteiro, e gente que não faz perguntas.' },
    portomangue: { name: 'Porto do Mangue', region: 'mangue', at: [262, 258], w: 32, h: 24, style: 'palafita', race: 'mix', walls: false,
      desc: 'Porto de contrabandistas e pescadores na beira do mangue.' },
  };
  D.CITY_ORDER = ['alvorada', 'ybira', 'forjafunda', 'jaguarete', 'coroa', 'lamento', 'portomangue'];
  D.ROADS = [['alvorada', 'coroa'], ['alvorada', 'ybira'], ['alvorada', 'jaguarete'], ['alvorada', 'forjafunda'], ['ybira', 'lamento'], ['forjafunda', 'lamento'], ['jaguarete', 'portomangue'], ['coroa', 'portomangue'], ['forjafunda', 'jaguarete'], ['ybira', 'coroa']];

  // ---------- masmorras ----------
  // theme: cripta, caverna, mina, raiz, gelo, ruina, navio, fogo, catacumba, covil. at: posição da entrada no mundo
  D.DUNGEONS = {
    cripta_alvorada: { name: 'Cripta da Alvorada', theme: 'cripta', at: [182, 214], floors: 1, lvl: 1, mons: { esqueleto: 4, esqueleto_arq: 2, morcego: 1 }, boss: 'guardiao_cripta', story: true, size: 44 },
    toca_bandidos: { name: 'Toca dos Bandidos', theme: 'caverna', at: [135, 246], floors: 1, lvl: 3, mons: { bandido: 4, bandido_arq: 3 }, boss: 'chefe_bandido', size: 46 },
    raiz_antiga: { name: 'Raiz Antiga', theme: 'raiz', at: [48, 150], floors: 2, lvl: 5, mons: { armadeira: 3, fogo_fatuo: 3, onca: 1 }, boss: 'curupira', story: true, size: 50 },
    ninho_armadeira: { name: 'Ninho da Armadeira', theme: 'caverna', at: [88, 196], floors: 1, lvl: 5, mons: { armadeira: 5, filhote: 3 }, boss: 'rainha_armadeira', size: 46 },
    mina_profunda: { name: 'Mina Profunda', theme: 'mina', at: [186, 40], floors: 3, lvl: 9, mons: { mao_pedra: 3, morcego: 3, esqueleto: 2 }, boss: 'rei_pedra', story: true, size: 52, ore: true },
    gruta_gelo: { name: 'Gruta do Gelo Eterno', theme: 'gelo', at: [138, 30], floors: 2, lvl: 9, mons: { lobo_neve: 3, morcego: 2, mao_pedra: 1 }, boss: 'yeti', size: 48 },
    covil_lobisomem: { name: 'Covil do Lobisomem', theme: 'covil', at: [292, 118], floors: 2, lvl: 13, mons: { lobo: 3, cangaceiro: 2, urubu: 1 }, boss: 'lobisomem', story: true, size: 50 },
    tumba_cangaceiro: { name: 'Tumba do Capitão Tição', theme: 'ruina', at: [250, 172], floors: 2, lvl: 12, mons: { cangaceiro: 3, cangaceiro_arq: 2, escorpiao: 1 }, boss: 'capitao_ticao', size: 50 },
    catacumbas_coroa: { name: 'Catacumbas da Coroa', theme: 'catacumba', at: [124, 270], floors: 3, lvl: 15, mons: { cultista: 3, cultista_lam: 3, esqueleto: 2, corpo_seco: 1 }, boss: 'morvan', story: true, size: 54 },
    naufragio: { name: 'Naufrágio do Vento Negro', theme: 'navio', at: [288, 286], floors: 2, lvl: 10, mons: { pirata: 4, caranguejo: 2 }, boss: 'almirante', size: 46 },
    casa_cuca: { name: 'Casa da Cuca', theme: 'raiz', at: [42, 46], floors: 2, lvl: 15, mons: { sapo: 2, afogado: 3, fogo_fatuo: 2 }, boss: 'cuca', size: 48 },
    coracao_cauda: { name: 'Coração da Cauda', theme: 'fogo', at: [165, 142], floors: 3, lvl: 19, mons: { brasa_viva: 3, cultista: 2, cultista_lam: 2, mula: 1 }, boss: 'boitata', story: true, size: 56, sealed: true },
  };

  // ---------- altares da Sina (como as pedras de Skyrim: um ativo por vez) ----------
  D.ALTARS = {
    guerreiro: { name: 'Altar do Guerreiro', at: [196, 238], desc: '+15% de dano corpo a corpo e com arco.' },
    mago: { name: 'Altar do Mago', at: [80, 148], desc: '+25% de mana máxima e mana volta mais depressa.' },
    andarilho: { name: 'Altar do Andarilho', at: [124, 208], desc: '+10% de velocidade e +25% de ouro achado.' },
    montanha: { name: 'Altar da Montanha', at: [196, 70], desc: '+25% de armadura.' },
    sol: { name: 'Altar do Sol', at: [236, 120], desc: '+25% de dano de fogo e resistência ao fogo.' },
    lua: { name: 'Altar da Lua', at: [100, 92], desc: 'Enxerga no escuro e regenera vida de noite.' },
    mar: { name: 'Altar do Mar', at: [228, 278], desc: '+40 de vida e resistência ao gelo.' },
  };

  // nomes para gente das cidades (dos povos do Gods)
  D.NAMES = {
    humano: { F: ['Rosa', 'Zefa', 'Benta', 'Aurora', 'Lia', 'Cida', 'Nina', 'Marta', 'Tereza', 'Dora', 'Luzia', 'Iolanda'], M: ['Tonho', 'Joca', 'Bento', 'Chico', 'Davi', 'Raul', 'Zé', 'Tião', 'Mané', 'Lauro', 'Otávio', 'Caio'] },
    elfo: { F: ['Ilanê', 'Sairê', 'Elunaí', 'Narilã', 'Tielê', 'Aluí', 'Milenã', 'Evaí', 'Luriê', 'Sanilê'], M: ['Taliel', 'Ereví', 'Luanir', 'Ilmar', 'Enoã', 'Valiê', 'Arelin', 'Silvã', 'Niaron', 'Calinê'] },
    anao: { F: ['Brunda', 'Dorga', 'Kelma', 'Gurdis', 'Tolga', 'Marda', 'Ruvka', 'Hodra', 'Berga', 'Druma'], M: ['Durgo', 'Krag', 'Tormo', 'Grumek', 'Dolvar', 'Bruk', 'Hargo', 'Urdek', 'Molgar', 'Rundo'] },
    fera: { F: ['Raxa', 'Nhara', 'Jurê', 'Xaia', 'Miara', 'Tixa', 'Suçá', 'Graúna', 'Aruxa', 'Nhaí'], M: ['Rauã', 'Jagu', 'Guará', 'Turuna', 'Karu', 'Naguá', 'Tarrã', 'Jurupi', 'Xoró', 'Açuã'] },
  };
})(globalThis.G = globalThis.G || {});
