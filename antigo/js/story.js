/* SINA · história: gente das cidades, conversas, a missão principal, as secundárias e o quadro de avisos.
   As conversas são nós { t: texto, o: [opções] }. Cada opção tem t (o que você diz), e pode ter
   if (mostra só se), go (o próximo nó), do (o que acontece). Q é a ponte com o jogo (ver game.js). */
(function (G) {
  'use strict';
  const D = G.D;

  // ---------- a gente ----------
  // role: o que faz (mercador, ferreiro, alquimista, mago, estalagem, guarda, quadro, povo); spot: onde fica
  D.NPCS = {
    // Vila Alvorada
    benta: { name: 'Vidente Benta', city: 'alvorada', race: 'humano', sex: 'F', role: 'povo', spot: 'templo', look: { cloth: '#5e3a5c', hair: '#cdc6bb', old: true } },
    tonho: { name: 'Pastor Tonho', city: 'alvorada', race: 'humano', sex: 'M', role: 'povo', spot: 'praca', look: { cloth: '#6e8a3a', hair: '#6e4a35', hat: 'palha' } },
    rosa: { name: 'Capitã Rosa', city: 'alvorada', race: 'humano', sex: 'F', role: 'guarda', spot: 'portao', look: { cloth: '#8a2a2c', hair: '#3a2428', armor: true } },
    zefa: { name: 'Curandeira Zefa', city: 'alvorada', race: 'humano', sex: 'F', role: 'alquimista', spot: 'alquimista', look: { cloth: '#3a6a4a', hair: '#1f1a24' } },
    cida: { name: 'Dona Cida', city: 'alvorada', race: 'humano', sex: 'F', role: 'povo', spot: 'casa', look: { cloth: '#a8587a', hair: '#cdc6bb', old: true } },
    lauro: { name: 'Lauro, o mercador', city: 'alvorada', race: 'humano', sex: 'M', role: 'mercador', spot: 'mercado', look: { cloth: '#c47a3e', hair: '#3a2428' } },
    bento: { name: 'Bento, o ferreiro', city: 'alvorada', race: 'humano', sex: 'M', role: 'ferreiro', spot: 'ferreiro', look: { cloth: '#4b4553', hair: '#1f1a24', beard: true } },
    dora: { name: 'Dora da estalagem', city: 'alvorada', race: 'humano', sex: 'F', role: 'estalagem', spot: 'estalagem', look: { cloth: '#93683f', hair: '#c47a3e' } },
    // Ybirá
    ilane: { name: 'Anciã Ilanê', city: 'ybira', race: 'elfo', sex: 'F', role: 'povo', spot: 'templo', look: { cloth: '#e2cfa4', hair: '#f2f5fa', old: true } },
    taliel: { name: 'Taliel, o caçador', city: 'ybira', race: 'elfo', sex: 'M', role: 'povo', spot: 'praca', look: { cloth: '#40723e', hair: '#d0a46a' } },
    saire: { name: 'Sairê', city: 'ybira', race: 'elfo', sex: 'F', role: 'mago', spot: 'mago', look: { cloth: '#2a4a6e', hair: '#e2cfa4' } },
    luanir: { name: 'Luanir', city: 'ybira', race: 'elfo', sex: 'M', role: 'mercador', spot: 'mercado', look: { cloth: '#64923f', hair: '#2b2733' } },
    milena: { name: 'Milenã', city: 'ybira', race: 'elfo', sex: 'F', role: 'alquimista', spot: 'alquimista', look: { cloth: '#8fb35a', hair: '#6e4a35' } },
    arelin: { name: 'Arelin', city: 'ybira', race: 'elfo', sex: 'M', role: 'ferreiro', spot: 'ferreiro', look: { cloth: '#5e3a5c', hair: '#f2da72' } },
    evai: { name: 'Evaí', city: 'ybira', race: 'elfo', sex: 'F', role: 'estalagem', spot: 'estalagem', look: { cloth: '#a8587a', hair: '#e2cfa4' } },
    // Forjafunda
    durgo: { name: 'Mestre Durgo', city: 'forjafunda', race: 'anao', sex: 'M', role: 'ferreiro', spot: 'ferreiro', look: { cloth: '#6e4a35', hair: '#a8482c', beard: true } },
    brunda: { name: 'Brunda', city: 'forjafunda', race: 'anao', sex: 'F', role: 'povo', spot: 'praca', look: { cloth: '#2a4a6e', hair: '#c47a3e' } },
    krag: { name: 'Krag da caneca', city: 'forjafunda', race: 'anao', sex: 'M', role: 'estalagem', spot: 'estalagem', look: { cloth: '#93683f', hair: '#1f1a24', beard: true } },
    dolvar: { name: 'Dolvar', city: 'forjafunda', race: 'anao', sex: 'M', role: 'mercador', spot: 'mercado', look: { cloth: '#8a2a2c', hair: '#cdc6bb', beard: true } },
    kelma: { name: 'Kelma', city: 'forjafunda', race: 'anao', sex: 'F', role: 'alquimista', spot: 'alquimista', look: { cloth: '#40723e', hair: '#6e4a35' } },
    // Jaguaretê
    raua: { name: 'Rauã, chefe do clã', city: 'jaguarete', race: 'fera', sex: 'M', role: 'povo', spot: 'templo', look: { cloth: '#a8482c', hair: '#c47a3e' } },
    guara: { name: 'Guará', city: 'jaguarete', race: 'fera', sex: 'M', role: 'guarda', spot: 'portao', look: { cloth: '#6e4a35', hair: '#93683f', armor: true } },
    nhara: { name: 'Nhara, a rastreadora', city: 'jaguarete', race: 'fera', sex: 'F', role: 'povo', spot: 'praca', look: { cloth: '#9a7a46', hair: '#3a2428' } },
    karu: { name: 'Karu', city: 'jaguarete', race: 'fera', sex: 'M', role: 'mercador', spot: 'mercado', look: { cloth: '#c47a3e', hair: '#6e4a35' } },
    jure: { name: 'Jurê', city: 'jaguarete', race: 'fera', sex: 'F', role: 'alquimista', spot: 'alquimista', look: { cloth: '#5e3a5c', hair: '#1f1a24' } },
    tarra: { name: 'Tarrã', city: 'jaguarete', race: 'fera', sex: 'M', role: 'ferreiro', spot: 'ferreiro', look: { cloth: '#4b4553', hair: '#2b2733' } },
    miara: { name: 'Miara', city: 'jaguarete', race: 'fera', sex: 'F', role: 'estalagem', spot: 'estalagem', look: { cloth: '#a8587a', hair: '#93683f' } },
    // Coroa de Sal
    iolanda: { name: 'Rainha Iolanda', city: 'coroa', race: 'humano', sex: 'F', role: 'povo', spot: 'templo', look: { cloth: '#2a4a6e', hair: '#d0a46a', crown: true } },
    otavio: { name: 'Mestre Otávio', city: 'coroa', race: 'humano', sex: 'M', role: 'mago', spot: 'mago', look: { cloth: '#5e3a5c', hair: '#cdc6bb', beard: true, old: true } },
    davi: { name: 'Capitão Davi', city: 'coroa', race: 'humano', sex: 'M', role: 'povo', spot: 'praca', look: { cloth: '#1a2a54', hair: '#3a2428', hat: 'pirata' } },
    marta: { name: 'Marta', city: 'coroa', race: 'humano', sex: 'F', role: 'mercador', spot: 'mercado', look: { cloth: '#c8423a', hair: '#1f1a24' } },
    raul: { name: 'Raul', city: 'coroa', race: 'humano', sex: 'M', role: 'ferreiro', spot: 'ferreiro', look: { cloth: '#4b4553', hair: '#6e4a35', beard: true } },
    nina: { name: 'Nina', city: 'coroa', race: 'humano', sex: 'F', role: 'alquimista', spot: 'alquimista', look: { cloth: '#3a86a8', hair: '#c47a3e' } },
    luzia_c: { name: 'Luzia da Maré', city: 'coroa', race: 'humano', sex: 'F', role: 'estalagem', spot: 'estalagem', look: { cloth: '#93683f', hair: '#3a2428' } },
    // Vila do Lamento
    joca: { name: 'Joca, o barqueiro', city: 'lamento', race: 'humano', sex: 'M', role: 'povo', spot: 'praca', look: { cloth: '#4a5a4a', hair: '#2b2733', hat: 'palha' } },
    luzia: { name: 'Dona Luzia', city: 'lamento', race: 'humano', sex: 'F', role: 'alquimista', spot: 'alquimista', look: { cloth: '#2a3a2a', hair: '#cdc6bb', old: true } },
    tiao: { name: 'Tião, o caçador', city: 'lamento', race: 'fera', sex: 'M', role: 'povo', spot: 'casa', look: { cloth: '#6e5030', hair: '#3a2428' } },
    hodra: { name: 'Hodra', city: 'lamento', race: 'anao', sex: 'F', role: 'mercador', spot: 'mercado', look: { cloth: '#5e3a5c', hair: '#a8482c' } },
    enoa: { name: 'Enoã', city: 'lamento', race: 'elfo', sex: 'M', role: 'estalagem', spot: 'estalagem', look: { cloth: '#40723e', hair: '#2b2733' } },
    // Porto do Mangue
    xoro: { name: 'Xoró', city: 'portomangue', race: 'fera', sex: 'M', role: 'povo', spot: 'praca', look: { cloth: '#1a2a54', hair: '#1f1a24', hat: 'pirata' } },
    tolga: { name: 'Tolga', city: 'portomangue', race: 'anao', sex: 'F', role: 'mercador', spot: 'mercado', look: { cloth: '#c47a3e', hair: '#cdc6bb' } },
    caio: { name: 'Caio', city: 'portomangue', race: 'humano', sex: 'M', role: 'estalagem', spot: 'estalagem', look: { cloth: '#93683f', hair: '#6e4a35' } },
    rundo: { name: 'Rundo', city: 'portomangue', race: 'anao', sex: 'M', role: 'ferreiro', spot: 'ferreiro', look: { cloth: '#4b4553', hair: '#a8482c', beard: true } },
  };

  // ---------- missões ----------
  // goal: talk (fala com npc), dungeon (mata o chefe da masmorra), kill (mon, n), item (item, n), altars (n)
  D.QUESTS = {
    main: { name: 'A Sina Partida', main: true, stages: {
      1: { txt: 'Fale com a vidente Benta, no templo de Vila Alvorada.', goal: { type: 'talk', npc: 'benta' } },
      2: { txt: 'Desça à Cripta da Alvorada, a leste da vila, e traga o primeiro Fragmento da Sina.', goal: { type: 'dungeon', id: 'cripta_alvorada' }, next: 3 },
      3: { txt: 'Leve o fragmento à vidente Benta.', goal: { type: 'talk', npc: 'benta' } },
      4: { txt: 'Vá a Ybirá, na Mata Funda (oeste), e procure a anciã Ilanê.', goal: { type: 'talk', npc: 'ilane' } },
      5: { txt: 'Entre na Raiz Antiga e enfrente o Curupira Corrompido.', goal: { type: 'dungeon', id: 'raiz_antiga' }, next: 6 },
      6: { txt: 'Volte até a anciã Ilanê, em Ybirá.', goal: { type: 'talk', npc: 'ilane' } },
      7: { txt: 'Suba a Serra do Ferro (norte) até Forjafunda e fale com o Mestre Durgo.', goal: { type: 'talk', npc: 'durgo' } },
      8: { txt: 'Limpe a Mina Profunda e derrote o Rei de Pedra.', goal: { type: 'dungeon', id: 'mina_profunda' }, next: 9 },
      9: { txt: 'Volte ao Mestre Durgo, em Forjafunda.', goal: { type: 'talk', npc: 'durgo' } },
      10: { txt: 'Atravesse o Sertão das Cinzas (leste) até Jaguaretê e fale com Rauã, chefe do clã.', goal: { type: 'talk', npc: 'raua' } },
      11: { txt: 'A Prova do Campeão: mate o Lobisomem no covil a nordeste de Jaguaretê.', goal: { type: 'dungeon', id: 'covil_lobisomem' }, next: 12 },
      12: { txt: 'Volte a Rauã, em Jaguaretê.', goal: { type: 'talk', npc: 'raua' } },
      13: { txt: 'Vá à Coroa de Sal, a capital no litoral sul, e fale com a Rainha Iolanda.', goal: { type: 'talk', npc: 'iolanda' } },
      14: { txt: 'Desça às Catacumbas da Coroa e encontre o Chanceler Morvan.', goal: { type: 'dungeon', id: 'catacumbas_coroa' }, next: 15 },
      15: { txt: 'Conte à Rainha Iolanda o que havia nas catacumbas.', goal: { type: 'talk', npc: 'iolanda' } },
      16: { txt: 'Leve os quatro fragmentos ao Mestre Durgo, para forjar a Chave do Selo.', goal: { type: 'talk', npc: 'durgo' } },
      17: { txt: 'Abra o Véu da Cratera da Cauda, no centro de Aruanã, e desça ao Coração da Cauda.', goal: { type: 'dungeon', id: 'coracao_cauda' }, next: 18 },
      18: { txt: 'Toque o Altar da Sina, no fundo do Coração da Cauda, e decida.', goal: { type: 'altar' } },
    } },
    lobos: { name: 'Ovelhas e lobos', giver: 'tonho', stages: { 1: { txt: 'Mate 6 lobos nos Campos da Aurora.', goal: { type: 'kill', mon: 'lobo', n: 6 }, next: 2 }, 2: { txt: 'Volte ao Pastor Tonho.', goal: { type: 'talk', npc: 'tonho' } } } },
    bandidos: { name: 'A Toca dos Bandidos', giver: 'rosa', stages: { 1: { txt: 'Derrote Zé Facão na Toca dos Bandidos, a oeste de Alvorada.', goal: { type: 'dungeon', id: 'toca_bandidos' }, next: 2 }, 2: { txt: 'Volte à Capitã Rosa.', goal: { type: 'talk', npc: 'rosa' } } } },
    febre: { name: 'Erva para a febre', giver: 'zefa', stages: { 1: { txt: 'Colha 5 folhas de guaco e leve à Curandeira Zefa.', goal: { type: 'item', item: 'guaco', n: 5 }, next: 2 }, 2: { txt: 'Leve as folhas de guaco à Curandeira Zefa.', goal: { type: 'talk', npc: 'zefa' } } } },
    saci: { name: 'O cachimbo de Dona Cida', giver: 'cida', stages: { 1: { txt: 'Ache o Saci das Encruzilhadas, nos campos a sudeste de Alvorada, e tome de volta o cachimbo.', goal: { type: 'kill', mon: 'saci', n: 1 }, next: 2 }, 2: { txt: 'Volte a Dona Cida.', goal: { type: 'talk', npc: 'cida' } } } },
    arco: { name: 'O arco de Taliel', giver: 'taliel', stages: { 1: { txt: 'Ache o arco de Taliel no Ninho da Armadeira, a sudeste de Ybirá.', goal: { type: 'item', item: 'arco_perdido', n: 1 }, next: 2 }, 2: { txt: 'Decida o que fazer com o arco de Taliel.', goal: { type: 'talk', npc: 'taliel' } } } },
    espiritos: { name: 'Espíritos inquietos', giver: 'saire', stages: { 1: { txt: 'Apague 8 fogos-fátuos na Mata Funda.', goal: { type: 'kill', mon: 'fogo_fatuo', n: 8 }, next: 2 }, 2: { txt: 'Volte a Sairê.', goal: { type: 'talk', npc: 'saire' } } } },
    gelo: { name: 'Gelo eterno', giver: 'brunda', stages: { 1: { txt: 'Traga 3 cristais de gelo eterno da Gruta do Gelo, a oeste de Forjafunda.', goal: { type: 'item', item: 'cristal_gelo', n: 3 }, next: 2 }, 2: { txt: 'Leve os cristais a Brunda.', goal: { type: 'talk', npc: 'brunda' } } } },
    musgo: { name: 'Cerveja de musgo', giver: 'krag', stages: { 1: { txt: 'Colha 5 musgos de pedra na Serra do Ferro.', goal: { type: 'item', item: 'musgo', n: 5 }, next: 2 }, 2: { txt: 'Leve o musgo a Krag.', goal: { type: 'talk', npc: 'krag' } } } },
    tumba: { name: 'O capitão que não morre', giver: 'guara', stages: { 1: { txt: 'Derrote o Capitão Tição na tumba a sudoeste de Jaguaretê.', goal: { type: 'dungeon', id: 'tumba_cangaceiro' }, next: 2 }, 2: { txt: 'Volte a Guará.', goal: { type: 'talk', npc: 'guara' } } } },
    escorpiao: { name: 'O Escorpião-rei', giver: 'nhara', stages: { 1: { txt: 'Cace o Escorpião-rei nas dunas ao sul de Jaguaretê.', goal: { type: 'kill', mon: 'escorpiao_rei', n: 1 }, next: 2 }, 2: { txt: 'Volte a Nhara.', goal: { type: 'talk', npc: 'nhara' } } } },
    naufragio: { name: 'O Vento Negro', giver: 'davi', stages: { 1: { txt: 'Entre no Naufrágio do Vento Negro, no extremo sudeste, e afunde de vez o Almirante.', goal: { type: 'dungeon', id: 'naufragio' }, next: 2 }, 2: { txt: 'Volte ao Capitão Davi.', goal: { type: 'talk', npc: 'davi' } } } },
    carta: { name: 'Carta lacrada', giver: 'otavio', stages: { 1: { txt: 'Entregue a carta do Mestre Otávio a Joca, o barqueiro da Vila do Lamento (noroeste).', goal: { type: 'talk', npc: 'joca' } } } },
    altares: { name: 'Os sete altares', giver: 'otavio', stages: { 1: { txt: 'Encontre os 7 Altares da Sina espalhados por Aruanã.', goal: { type: 'altars', n: 7 }, next: 2 }, 2: { txt: 'Volte ao Mestre Otávio, na Coroa de Sal.', goal: { type: 'talk', npc: 'otavio' } } } },
    cuca: { name: 'A casa no fim do pântano', giver: 'luzia', stages: { 1: { txt: 'Entre na Casa da Cuca, a noroeste do Lamento, e acabe com ela.', goal: { type: 'dungeon', id: 'casa_cuca' }, next: 2 }, 2: { txt: 'Volte a Dona Luzia.', goal: { type: 'talk', npc: 'luzia' } } } },
    mapinguari: { name: 'O bicho de um olho só', giver: 'tiao', stages: { 1: { txt: 'Cace o Mapinguari no fundo do Pântano do Lamento.', goal: { type: 'kill', mon: 'mapinguari', n: 1 }, next: 2 }, 2: { txt: 'Volte a Tião.', goal: { type: 'talk', npc: 'tiao' } } } },
    contrabando: { name: 'Mar de ninguém', giver: 'xoro', stages: { 1: { txt: 'Afunde 6 piratas afogados no Mangue Sombrio.', goal: { type: 'kill', mon: 'pirata', n: 6 }, next: 2 }, 2: { txt: 'Volte a Xoró.', goal: { type: 'talk', npc: 'xoro' } } } },
  };

  // ---------- as conversas ----------
  // helpers curtos
  const st = (Q, q) => Q.stage(q);
  const fin = (Q, q) => Q.stage(q) === 'done';

  D.DLG = {
    benta: (Q) => ({
      start: st(Q, 'main') === 1 ? { t: 'Chegou, enfim. Eu vi você nas brasas antes de você abrir os olhos. Sabe o que você é, criança? Você nasceu na noite em que a Cauda caiu. A estrela que rachou o céu.', o: [
        { t: 'Do que a senhora está falando?', go: 'sina' },
        { t: 'Não tenho tempo para histórias.', go: 'pressa' }] }
        : st(Q, 'main') === 2 ? { t: 'A cripta fica a leste, depois do riacho. Desça, encontre o fragmento. E leve tochas, se tiver.', o: [{ t: 'Estou indo.' }] }
        : st(Q, 'main') === 3 ? { t: 'Você voltou, e com ele na mão. Sente como pulsa? É um pedaço da Sina, a teia de estrelas que escreve o destino de cada vivente.', o: [{ t: 'E agora?', go: 'depois' }] }
        : fin(Q, 'main') ? { t: 'O céu está diferente desde que você voltou da cratera. Eu ainda olho para ele toda noite.', o: [{ t: 'Até mais, Benta.' }] }
        : { t: 'Os fragmentos chamam uns pelos outros. Siga o chamado. ' + Q.mainHint(), o: [{ t: 'Até mais.' }] },
      sina: { t: 'Toda criatura nasce com a sua linha escrita nas estrelas. Menos você. A Cauda partiu a Sina em cinco cacos, e os mortos acordaram, e os bichos do mato enlouqueceram. Você é Sem-Sina: o único que pode mudar o que está escrito.', o: [{ t: 'E o que eu faço com isso?', go: 'cripta' }] },
      pressa: { t: 'Tempo é justamente o que vai faltar. Os mortos já andam na cripta aqui do lado.', o: [{ t: 'Está bem. Conte.', go: 'sina' }] },
      cripta: { t: 'Um caco caiu na Cripta da Alvorada, a leste da vila. Os mortos de lá se levantaram por causa dele. Desça, traga o fragmento, e então eu digo o resto.', o: [{ t: 'Eu vou.', do: () => { Q.setStage('main', 2); Q.give('pocao_vida', 3); Q.note('Benta deu 3 poções de vida.'); } }] },
      depois: { t: 'Quatro cacos ainda andam por aí. Um deles caiu na Mata Funda, no oeste, onde vivem os elfos. A anciã Ilanê sabe onde. Vá a Ybirá. E fique com isto: o Marco da Sina de cada cidade guarda o seu caminho. Você pode viajar entre os marcos que já viu.', o: [{ t: 'Vou para Ybirá.', do: () => { Q.setStage('main', 4); Q.gold(80); Q.xp(80); } }] },
    }),
    ilane: (Q) => ({
      start: st(Q, 'main') === 4 ? { t: 'Uma Sem-Sina na minha mata. Os galhos me avisaram. O caco que você procura caiu na Raiz Antiga, e o guardião da mata, o Curupira, bebeu da luz dele. Agora ele não protege mais nada: só mata.', o: [
        { t: 'Eu enfrento o Curupira.', do: () => { Q.setStage('main', 5); Q.xp(60); } },
        { t: 'Não há outro jeito?', go: 'jeito' }] }
        : st(Q, 'main') === 5 ? { t: 'A Raiz Antiga fica ao noroeste, entre as árvores mais velhas. Cuidado com os pés virados: ele confunde quem o segue.', o: [{ t: 'Certo.' }] }
        : st(Q, 'main') === 6 ? { t: 'O Curupira descansa, e a mata respira de novo. Obrigada. Os anões de Forjafunda guardam o segredo de fundir estrela. Procure o Mestre Durgo, na Serra do Ferro, ao norte.', o: [{ t: 'Vou para a serra.', do: () => { Q.setStage('main', 7); Q.gold(150); Q.xp(150); Q.give('pocao_mana', 3); } }] }
        : { t: 'A mata lembra de quem a ajudou.', o: [{ t: 'Até mais, anciã.' }] },
      jeito: { t: 'Talvez exista, numa Sina inteira. Mas a Sina está partida, e você é o único que não depende dela.', o: [{ t: 'Então eu vou.', do: () => { Q.setStage('main', 5); Q.xp(60); } }] },
    }),
    durgo: (Q) => {
      const s = st(Q, 'main');
      const shop = [{ t: 'Quero ver suas armas.', do: () => Q.shop() }, { t: 'Quero usar a forja.', do: () => Q.forge() }];
      return {
        start: s === 7 ? { t: 'Hm. Elfa mandou, foi? Pois a minha mina é que precisa de ajuda. Um caco caiu lá no fundo e as pedras criaram mãos. Mãos-de-pedra, e um rei delas. Ninguém desce desde o inverno.', o: [{ t: 'Eu limpo a mina.', do: () => { Q.setStage('main', 8); Q.give('picareta', 1, true); Q.note('Durgo deu uma picareta.'); } }, ...shop] }
          : s === 9 ? { t: 'Você desceu e voltou inteiro. Pouca gente faz isso. Com três cacos ainda não se forja nada. São necessários quatro para a Chave do Selo. O quarto está com o povo-fera, em Jaguaretê, no Sertão, a leste. Eles só entregam a um campeão.', o: [{ t: 'Então eu viro campeão.', do: () => { Q.setStage('main', 10); Q.gold(220); Q.xp(250); } }, ...shop] }
          : s === 16 ? (Q.count('fragmento') >= 4 ? { t: 'Quatro cacos de estrela na minha bigorna. Meu avô contava que isso ia acontecer. Segure firme.', o: [{ t: 'Forje a chave.', do: () => { Q.take('fragmento', 4); Q.give('chave_selo', 1); Q.setStage('main', 17); Q.xp(400); Q.note('A Chave do Selo está pronta.'); } }] }
            : { t: 'Faltam fragmentos. Preciso de quatro na bigorna.', o: [{ t: 'Já volto.' }, ...shop] })
          : { t: 'Fala, Sem-Sina. O ferro está quente.', o: shop.concat([{ t: 'Até mais.' }]) },
      };
    },
    raua: (Q) => {
      const s = st(Q, 'main');
      return {
        start: s === 10 ? { t: 'Um forasteiro pedindo o nosso caco. O caco que a gente guarda desde que caiu queimando o capim. Por que o clã daria a você?', o: [
          { t: 'Porque eu sou Sem-Sina.', go: 'prova' },
          { t: '[Lábia] Porque o seu clã não vai sobreviver ao Boitatá sozinho.', if: () => Q.perk('convencer') || Q.skill('labia') >= 40, go: 'lab' }] }
          : s === 11 ? { t: 'O covil fica a nordeste, nas pedras altas. Volte com a cabeça dele ou não volte.', o: [{ t: 'Volto.' }] }
          : s === 12 ? { t: 'O Lobisomem caiu! Que o Sertão escute: temos um campeão. O caco é seu. E escute: um mensageiro da Coroa passou aqui procurando você. A Rainha quer você na capital.', o: [{ t: 'Vou à Coroa de Sal.', do: () => { Q.setStage('main', 13); Q.gold(300); Q.xp(350); } }] }
          : { t: 'Campeão! Senta, come, conta das suas caçadas.', o: [{ t: 'Outro dia, Rauã.' }] },
        prova: { t: 'Palavra bonita. O clã respeita sangue, não palavra. Faça a Prova do Campeão: mate o Lobisomem que caça o nosso povo nas noites de lua. O covil fica a nordeste daqui.', o: [{ t: 'Aceito a prova.', do: () => Q.setStage('main', 11) }] },
        lab: { t: 'Hm. Você fala como quem já viu o fogo. Mesmo assim, a lei é a lei: o caco só sai com o campeão. Mas leve isto, para a prova.', o: [{ t: 'Aceito a prova.', do: () => { Q.setStage('main', 11); Q.give('pocao_vida2', 2); } }] },
      };
    },
    iolanda: (Q) => {
      const s = st(Q, 'main');
      return {
        start: s === 13 ? { t: 'Então você é a Sem-Sina de que falam nas estradas. Preciso de alguém que não tenha destino escrito, porque o meu próprio conselho está escrito contra mim. Gente encapuzada nas catacumbas, rezas ao contrário, e o Chanceler Morvan sumido há semanas.', o: [{ t: 'Quem são eles?', go: 'apagados' }] }
          : s === 14 ? { t: 'A entrada das catacumbas fica a leste da cidade, fora dos muros.', o: [{ t: 'Estou indo.' }] }
          : s === 15 ? { t: 'Morvan... meu próprio chanceler. E o que diz esse diário?', o: [{ t: 'Que o quinto caco está dentro do Boitatá, na Cratera.', go: 'cratera' }] }
          : fin(Q, 'main') ? { t: 'Aruanã deve a você o que nenhuma coroa paga.', o: [{ t: 'Majestade.' }] }
          : { t: 'A Coroa está ao seu lado, Sem-Sina.', o: [{ t: 'Majestade.' }] },
        apagados: { t: 'Chamam a si mesmos de Apagados. Querem apagar as estrelas, para que ninguém mais tenha destino, e eles possam escrever o de todos. Desça às Catacumbas da Coroa, a leste da muralha. Descubra o que Morvan tem com isso.', o: [{ t: 'Eu desço.', do: () => { Q.setStage('main', 14); Q.gold(200); } }] },
        cratera: { t: 'Então é isso. O Véu de fogo em volta da cratera só abre com a Chave do Selo, e só os anões sabem forjá-la. Leve os quatro fragmentos ao Mestre Durgo. E aceite isto da Coroa.', o: [{ t: 'Obrigado, Majestade.', do: () => { Q.setStage('main', 16); Q.gold(500); Q.xp(500); Q.giveItem(3, 15); } }] },
      };
    },
    tonho: (Q) => ({
      start: !st(Q, 'lobos') ? { t: 'Os lobos estão comendo as minhas ovelhas, uma por noite. Se eu tivesse um braço a mais, uma espada... Você ajuda?', o: [{ t: 'Eu caço os lobos.', do: () => Q.start('lobos') }, { t: 'Agora não.' }] }
        : st(Q, 'lobos') === 2 ? { t: 'Seis lobos! Agora as ovelhas dormem. Pega isso, é pouco, mas é de coração.', o: [{ t: 'Obrigado, Tonho.', do: () => { Q.finish('lobos'); Q.gold(60); Q.give('pocao_vida', 2); Q.xp(60); } }] }
        : fin(Q, 'lobos') ? { t: 'As ovelhas mandam lembranças.', o: [{ t: 'Até mais.' }] }
        : { t: 'Os lobos andam pelo campo, perto das matas. Seis, que já basta para eles aprenderem.', o: [{ t: 'Certo.' }] },
    }),
    rosa: (Q) => ({
      start: !st(Q, 'bandidos') ? { t: 'Alto aí. Você tem cara de quem sabe segurar uma espada. Zé Facão e o bando dele estão saqueando as carroças na estrada do oeste. Escondem-se numa toca nas pedras. Topa?', o: [{ t: 'Topo.', do: () => Q.start('bandidos') }, { t: 'Talvez depois.' }] }
        : st(Q, 'bandidos') === 2 ? { t: 'Zé Facão caiu? A estrada vai respirar. A guarda de Alvorada paga o que deve.', o: [{ t: 'Obrigado, capitã.', do: () => { Q.finish('bandidos'); Q.gold(120); Q.giveItem(2, 4); Q.xp(120); } }] }
        : { t: 'De olho na estrada, Sem-Sina.', o: [{ t: 'Sempre.' }] },
    }),
    zefa: (Q) => ({
      start: !st(Q, 'febre') ? { t: 'Metade da vila está com febre da Cauda. Eu preciso de guaco, uma folha larga, verde-escura, que cresce no campo e na beira da mata. Cinco folhas me salvam a semana.', o: [{ t: 'Eu colho.', do: () => Q.start('febre') }, { t: 'Quero ver suas poções.', do: () => Q.shop() }, { t: 'Quero usar a bancada.', do: () => Q.alchemy() }] }
        : st(Q, 'febre') === 2 && Q.count('guaco') >= 5 ? { t: 'Cinco folhas boas! Aprenda comigo: duas folhas de guaco fazem uma poção de vida. Fica com estas, e com o meu obrigado.', o: [{ t: 'Obrigado, Zefa.', do: () => { Q.take('guaco', 5); Q.finish('febre'); Q.give('pocao_vida', 3); Q.gold(50); Q.skillUp('alquimia', 5); Q.xp(60); } }] }
        : { t: 'Ervas, poções, um chá para o coração. O que vai ser?', o: [{ t: 'Quero ver suas poções.', do: () => Q.shop() }, { t: 'Quero usar a bancada.', do: () => Q.alchemy() }, { t: 'Nada, obrigado.' }] },
    }),
    cida: (Q) => ({
      start: !st(Q, 'saci') ? { t: 'Ai, meu filho! Um moleque de uma perna só, de gorro vermelho, levou o meu cachimbo num redemoinho! Ele vive nas encruzilhadas a sudeste daqui.', o: [{ t: 'Eu pego o cachimbo de volta.', do: () => Q.start('saci') }, { t: 'Que história é essa?' }] }
        : st(Q, 'saci') === 2 ? { t: 'Meu cachimbo! E com cheiro de fumo bom ainda! Deus lhe pague, e pague bem.', o: [{ t: 'Às ordens.', do: () => { Q.finish('saci'); Q.gold(80); Q.xp(100); } }] }
        : { t: 'Esse moleque ainda vai me matar do coração.', o: [{ t: 'Calma, Dona Cida.' }] },
    }),
    taliel: (Q) => ({
      start: !st(Q, 'arco') ? { t: 'A rainha-armadeira me pegou desprevenido no ninho, a sudeste daqui. Escapei, mas o arco do meu pai ficou lá. Não tenho coragem de voltar.', o: [{ t: 'Eu busco o arco.', do: () => Q.start('arco') }, { t: 'Boa sorte com isso.' }] }
        : st(Q, 'arco') === 2 ? { t: 'Você achou! Esse é o arco do meu pai... Posso tê-lo de volta?', o: [
          { t: 'É seu. Tome.', do: () => { Q.take('arco_perdido', 1); Q.finish('arco'); Q.gold(200); Q.giveItem(2, 6, 'anel'); Q.xp(150); Q.note('Taliel ficou com o arco do pai.'); } },
          { t: 'Fico com ele. Eu arrisquei a vida.', do: () => { Q.take('arco_perdido', 1); Q.finish('arco'); Q.giveUnique('arco_taliel'); Q.xp(80); Q.note('Você ficou com o Arco de Taliel. Ele não vai esquecer.'); } }] }
        : { t: 'A mata está cheia de olhos hoje.', o: [{ t: 'Até mais, Taliel.' }] },
    }),
    saire: (Q) => ({
      start: !st(Q, 'espiritos') ? { t: 'Os fogos-fátuos eram almas tranquilas. A luz da Cauda os deixou furiosos. Apague oito deles, por favor, e eu ensino a você um feitiço que eu guardo.', o: [{ t: 'Eu apago.', do: () => Q.start('espiritos') }, { t: 'Quero ver seus tomos.', do: () => Q.shop() }] }
        : st(Q, 'espiritos') === 2 ? { t: 'A mata ficou mais quieta. Aqui está: Centelha, o raio que pula.', o: [{ t: 'Obrigado, Sairê.', do: () => { Q.finish('espiritos'); Q.learn('centelha'); Q.xp(120); } }] }
        : { t: 'Magia é como água: toma a forma de quem a usa.', o: [{ t: 'Quero ver seus tomos.', do: () => Q.shop() }, { t: 'Até mais.' }] },
    }),
    brunda: (Q) => ({
      start: !st(Q, 'gelo') ? { t: 'Os meus barris de cerveja estão esquentando. Na Gruta do Gelo, a oeste daqui, existe um cristal que nunca derrete. Me traga três e eu pago bem.', o: [{ t: 'Trago os cristais.', do: () => Q.start('gelo') }, { t: 'Cerveja quente? Que tragédia.' }] }
        : st(Q, 'gelo') === 2 && Q.count('cristal_gelo') >= 3 ? { t: 'Frios como o coração do meu ex-marido! Toma, mereceu.', o: [{ t: 'Saúde, Brunda.', do: () => { Q.take('cristal_gelo', 3); Q.finish('gelo'); Q.gold(250); Q.giveItem(2, 10, 'amuleto'); Q.xp(200); } }] }
        : { t: 'Volte quando quiser uma caneca.', o: [{ t: 'Até mais.' }] },
    }),
    krag: (Q) => ({
      start: !st(Q, 'musgo') ? { t: 'Cerveja de musgo de pedra! Ninguém faz como eu. Só falta o musgo. Cinco punhados, da serra. E eu pago em lingote.', o: [{ t: 'Trago o musgo.', do: () => Q.start('musgo') }, { t: 'Quero um quarto.', do: () => Q.inn() }] }
        : st(Q, 'musgo') === 2 && Q.count('musgo') >= 5 ? { t: 'Musgo bom! Toma os lingotes, e daqui em diante a caneca é por conta da casa.', o: [{ t: 'Fechado.', do: () => { Q.take('musgo', 5); Q.finish('musgo'); Q.give('lingote', 6); Q.xp(120); } }] }
        : { t: 'Cama quente e cerveja forte. O que vai ser?', o: [{ t: 'Quero um quarto.', do: () => Q.inn() }, { t: 'Rumores?', do: () => Q.rumor() }, { t: 'Nada.' }] },
    }),
    guara: (Q) => ({
      start: !st(Q, 'tumba') ? { t: 'Os cangaceiros mortos andam de novo, e o Capitão Tição na frente deles. A tumba dele fica a sudoeste. Ninguém do clã aceita descer lá.', o: [{ t: 'Eu desço.', do: () => Q.start('tumba') }, { t: 'Nem eu.' }] }
        : st(Q, 'tumba') === 2 ? { t: 'O capitão está quieto de novo? Os mais velhos vão cantar o seu nome.', o: [{ t: 'Que cantem baixo.', do: () => { Q.finish('tumba'); Q.gold(300); Q.xp(250); } }] }
        : { t: 'Jaguaretê está de olho no horizonte.', o: [{ t: 'Até mais.' }] },
    }),
    nhara: (Q) => ({
      start: !st(Q, 'escorpiao') ? { t: 'Achei rastro de escorpião grande, maior que uma carroça, nas dunas ao sul. O Escorpião-rei. Se você for rápido, eu dou o melhor que tenho.', o: [{ t: 'Eu caço.', do: () => Q.start('escorpiao') }, { t: 'Grande demais para mim.' }] }
        : st(Q, 'escorpiao') === 2 ? { t: 'Você matou o rei das dunas! Toma, é seu.', o: [{ t: 'Obrigado, Nhara.', do: () => { Q.finish('escorpiao'); Q.gold(250); Q.giveItem(2, 12); Q.xp(250); } }] }
        : { t: 'O vento do sertão traz cheiro de chuva.', o: [{ t: 'Até mais.' }] },
    }),
    davi: (Q) => ({
      start: !st(Q, 'naufragio') ? { t: 'O Vento Negro afundou com o meu irmão a bordo, lá no extremo sudeste, onde o mangue encontra o mar. Agora dizem que o Almirante dele navega de novo, morto, e afunda os nossos barcos.', o: [{ t: 'Eu afundo o Almirante de vez.', do: () => Q.start('naufragio') }, { t: 'Sinto muito.' }] }
        : st(Q, 'naufragio') === 2 ? { t: 'Então ele descansa. E meu irmão também, espero. Tome, e que o mar seja leve para você.', o: [{ t: 'Obrigado, capitão.', do: () => { Q.finish('naufragio'); Q.gold(350); Q.giveItem(2, 12); Q.xp(300); } }] }
        : { t: 'O mar está calmo hoje.', o: [{ t: 'Até mais.' }] },
    }),
    otavio: (Q) => {
      const o = [{ t: 'Quero ver seus tomos.', do: () => Q.shop() }];
      if (!st(Q, 'carta')) o.push({ t: 'Precisa de alguma coisa?', go: 'carta' });
      if (!st(Q, 'altares')) o.push({ t: 'O que são os Altares da Sina?', go: 'altares' });
      if (st(Q, 'altares') === 2) o.push({ t: 'Encontrei os sete altares.', do: () => { Q.finish('altares'); Q.learn('bola_fogo'); Q.gold(500); Q.xp(500); } });
      o.push({ t: 'Até mais.' });
      return {
        start: { t: 'Livros, tomos, e uma vida inteira de perguntas. Em que posso servir?', o },
        carta: { t: 'Preciso que esta carta chegue a Joca, o barqueiro da Vila do Lamento, lá no noroeste. Não pergunte o que tem dentro.', o: [{ t: 'Eu levo.', do: () => { Q.start('carta'); Q.give('carta_coroa', 1); } }, { t: 'Agora não.' }] },
        altares: { t: 'Sete pedras antigas, uma para cada estrela-mãe. Quem toca uma recebe a sua bênção, mas só uma por vez. Encontre as sete e eu ensino a você o fogo grande.', o: [{ t: 'Vou procurar.', do: () => Q.start('altares') }, { t: 'Interessante.' }] },
      };
    },
    joca: (Q) => ({
      start: st(Q, 'carta') === 1 && Q.count('carta_coroa') ? { t: 'Carta do Otávio? Hm. Ele ainda lembra de mim. Obrigado. Tome, pelo caminho. E leve isso também: aprendi com uma bruxa, antes dela virar o que virou.', o: [{ t: 'Obrigado, Joca.', do: () => { Q.take('carta_coroa', 1); Q.finish('carta'); Q.gold(100); Q.learn('erguer'); Q.xp(150); } }] }
        : { t: 'O pântano engole quem anda sem olhar onde pisa.', o: [{ t: 'Vou olhar.' }] },
    }),
    luzia: (Q) => ({
      start: !st(Q, 'cuca') ? { t: 'Criança some no Lamento desde que a Cuca acordou. A casa dela fica a noroeste, depois das águas mortas. Eu sou velha demais. Você não é.', o: [{ t: 'Eu vou até a casa dela.', do: () => Q.start('cuca') }, { t: 'Quero ver suas poções.', do: () => Q.shop() }, { t: 'Quero usar a bancada.', do: () => Q.alchemy() }] }
        : st(Q, 'cuca') === 2 ? { t: 'A Cuca morreu? Ai, que as crianças vão dormir em paz. Deus lhe pague.', o: [{ t: 'Que durmam bem.', do: () => { Q.finish('cuca'); Q.gold(400); Q.giveItem(3, 16); Q.xp(400); } }] }
        : { t: 'Poções do pântano: fortes e amargas.', o: [{ t: 'Quero ver suas poções.', do: () => Q.shop() }, { t: 'Quero usar a bancada.', do: () => Q.alchemy() }, { t: 'Até mais.' }] },
    }),
    tiao: (Q) => ({
      start: !st(Q, 'mapinguari') ? { t: 'Tem um bicho no fundo do pântano, peludo, de um olho só e uma boca na barriga. O Mapinguari. Eu vi de longe e saí correndo. Mata ele e eu dou tudo o que juntei.', o: [{ t: 'Eu caço o Mapinguari.', do: () => Q.start('mapinguari') }, { t: 'Boca na barriga? Não, obrigado.' }] }
        : st(Q, 'mapinguari') === 2 ? { t: 'Você matou o bicho! Toma, toma tudo!', o: [{ t: 'Obrigado, Tião.', do: () => { Q.finish('mapinguari'); Q.gold(500); Q.giveItem(3, 17); Q.xp(500); } }] }
        : { t: 'Cuidado com o fundo do pântano.', o: [{ t: 'Até mais.' }] },
    }),
    xoro: (Q) => ({
      start: !st(Q, 'contrabando') ? { t: 'Os piratas afogados atacam qualquer barco no mangue. Isso é ruim para os negócios. Os meus negócios. Afunda seis deles e a gente conversa sobre dinheiro.', o: [{ t: 'Fechado.', do: () => Q.start('contrabando') }, { t: 'Não trabalho para contrabandista.' }] }
        : st(Q, 'contrabando') === 2 ? { t: 'Seis a menos! Eis a sua parte, sem nota.', o: [{ t: 'Sem nota.', do: () => { Q.finish('contrabando'); Q.gold(200); Q.xp(200); } }] }
        : { t: 'Psiu. Precisa de alguma coisa que não tem na loja?', o: [{ t: 'Não.' }] },
    }),
  };

  // falas de quem só passa
  D.IDLE = {
    humano: ['Dizem que os mortos andam de novo.', 'A colheita está fraca desde que a Cauda caiu.', 'Cuidado na estrada à noite.', 'Já viu o céu rachado? Dá arrepio.', 'Bom dia.'],
    elfo: ['A mata está doente.', 'Você anda alto demais. Os galhos ouvem.', 'Que as raízes guiem você.', 'Os fogos-fátuos já não cantam.'],
    anao: ['Hmpf.', 'Ferro bom não enferruja.', 'A mina chama. Ninguém responde.', 'Cerveja? Na estalagem do Krag.'],
    fera: ['Cheiro de forasteiro.', 'A lua cheia vem aí. Feche a porta.', 'O sertão não perdoa quem anda sem água.', 'Campeão? Ainda não.'],
    mix: ['Não pergunte.', 'O pântano dá e o pântano toma.', 'Névoa de novo.', 'Barco sai amanhã, se a maré deixar.'],
  };
  D.RUMORS = [
    'Um moleque de gorro vermelho anda roubando nas encruzilhadas perto de Alvorada.',
    'Os sete Altares da Sina dão bênçãos. O Mestre Otávio, da capital, sabe mais.',
    'A forja de Forjafunda faz aço que corta pedra.',
    'Há um escorpião do tamanho de uma carroça nas dunas do Sertão.',
    'No fundo do pântano vive um bicho de um olho só.',
    'Picareta na mão e um veio de minério: é dinheiro no bolso.',
    'Quem dorme na estalagem acorda curado e com o diário em dia.',
    'O Véu de fogo da cratera não deixa ninguém passar.',
    'Com vara de pesca e fogueira ninguém passa fome.',
  ];

  // ---------- final ----------
  D.ENDINGS = {
    reescrever: { name: 'A Sina reescrita', txt: 'Você encaixa os cinco cacos no altar, e o céu se costura. Os mortos deitam. O Curupira volta a cuidar da mata, os lobos voltam a ter medo de gente. Cada vivente de Aruanã acorda com a sua linha escrita de novo nas estrelas. Menos você. Você continua Sem-Sina, para sempre: a única pessoa livre num mundo que voltou a ter destino.' },
    libertar: { name: 'A Sina livre', txt: 'Você pisa nos cacos e eles viram poeira de luz. A Sina não volta. Ninguém mais tem destino escrito em Aruanã: cada um vai ter de escrever o seu, como você sempre fez. Os monstros não somem, mas a gente também não precisa mais deles para ter medo. Pela primeira vez, o amanhã está em branco.' },
  };
})(globalThis.G = globalThis.G || {});
