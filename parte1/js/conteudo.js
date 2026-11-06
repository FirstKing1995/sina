/* SINA · Parte I: quem mora no mapa. Fogueiras, inimigos, tesouros, conversas. Coordenadas em blocos. */
(function (raiz) {
  'use strict';
  const C = {};

  C.FOGUEIRAS = {
    vila: { nome: 'Fogueira de Alvorada', x: 50, y: 146 },
    mata: { nome: 'Fogueira da Mata Funda', x: 92, y: 38 },
    cemiterio: { nome: 'Fogueira dos Sem-Nome', x: 172, y: 124 },
    cripta: { nome: 'Fogueira da Cripta', x: 116, y: 236 },
  };

  C.AREAS = [ // o nome aparece ao entrar: [nome, x, y, raio]
    ['Ermo das Covas', 28, 172, 10], ['Ruínas de Alvorada', 48, 142, 15], ['Estrada dos Enforcados', 82, 128, 9],
    ['Encruzilhada', 112, 118, 9], ['Mata Funda', 96, 82, 16], ['Vale dos Bichos', 82, 74, 11], ['Toca dos Bandidos', 172, 32, 16],
    ['Trilha da Chuva', 170, 78, 10], ['Cemitério dos Sem-Nome', 190, 134, 21], ['Cripta da Alvorada', 40, 206, 28], ['Câmara do Guardião', 160, 233, 20],
  ];

  // [tipo, x, y]
  C.INIMIGOS = [
    // Ermo e vila: aprender sem muita pressa
    ['morto', 34, 158], ['morto', 40, 128], ['morto', 60, 150], ['morto', 54, 132], ['morto', 30, 118],
    // Estrada
    ['morto', 70, 134], ['morto', 76, 130], ['morto', 88, 125], ['morto', 94, 121], ['bandido', 91, 126],
    // Encruzilhada
    ['bandido', 108, 114], ['bandido', 116, 122], ['morto', 112, 110], ['morto', 106, 122],
    // Mata
    ['lobo', 106, 96], ['lobo', 110, 90], ['morto', 104, 84], ['apagado', 130, 72], ['morto', 134, 68], ['morto', 127, 75],
    // Vale dos Bichos
    ['lobo', 76, 70], ['lobo', 88, 78], ['lobo', 84, 66], ['lobo', 74, 80], ['apagado', 90, 70], ['morto', 80, 62], ['morto', 42, 68], ['morto', 37, 72], ['apagado', 40, 66],
    // Até a segunda fogueira
    ['morto', 66, 56], ['bandido', 60, 46], ['morto', 68, 44], ['apagado', 72, 40],
    // Trilha e Toca
    ['bandido', 118, 32], ['bandido', 128, 36], ['apagado', 136, 34], ['bandido', 148, 34], ['bandido', 152, 42], ['bandido', 146, 40],
    ['bandido', 165, 26], ['bandido', 170, 38], ['bandido', 178, 24], ['apagado', 180, 36], ['bandido', 164, 36], ['apagado', 176, 30],
    // Descida
    ['morto', 174, 58], ['lobo', 170, 72], ['lobo', 168, 82], ['morto', 164, 92], ['apagado', 158, 106],
    // Cemitério
    ['morto', 176, 134], ['morto', 182, 126], ['morto', 180, 144], ['apagado', 190, 122], ['morto_forte', 192, 134], ['morto', 198, 142], ['morto', 204, 128],
    ['apagado', 206, 142], ['morto_forte', 206, 134], ['morto', 186, 150], ['morto', 196, 150], ['morto_forte', 216, 98], ['apagado', 212, 94], ['morto', 220, 150],
    // Cripta
    ['morto_forte', 20, 206], ['morto', 38, 206], ['morto', 54, 200], ['morto', 54, 212], ['morto_forte', 62, 206], ['apagado', 68, 200], ['apagado', 68, 212],
    ['morto', 61, 222], ['morto_forte', 50, 234], ['morto_forte', 74, 234], ['morto', 56, 240], ['morto', 68, 240], ['apagado', 62, 232], ['morto', 48, 242], ['morto', 76, 242],
    ['morto', 92, 236], ['morto_forte', 100, 236], ['morto_forte', 98, 205], ['apagado', 100, 201],
    // Chefes
    ['ze', 204, 26], ['corpo', 160, 230],
  ];

  C.TIPOS = {
    morto: { nome: 'Morto-errante', spr: 'morto', hp: 58, dano: 24, vel: 30, visao: 120, alcance: 36, prep: 0.62, golpe: 0.2, recua: 0.85, brasas: 28, firme: 0, r: 11 },
    morto_forte: { nome: 'Morto de armadura', spr: 'morto_forte', hp: 150, dano: 36, vel: 28, visao: 130, alcance: 40, prep: 0.8, golpe: 0.22, recua: 0.8, brasas: 95, firme: 2, r: 12 },
    bandido: { nome: 'Bandido', spr: 'bandido', hp: 86, dano: 26, vel: 52, visao: 150, alcance: 36, prep: 0.42, golpe: 0.16, recua: 0.62, brasas: 60, firme: 0, r: 11, seguidos: 2 },
    apagado: { nome: 'Apagado', spr: 'apagado', hp: 62, dano: 26, vel: 34, visao: 190, alcance: 150, prep: 0.9, golpe: 0.1, recua: 1.1, brasas: 72, firme: 0, r: 11, atira: true, distancia: 110 },
    lobo: { nome: 'Bicho enlouquecido', spr: 'lobo', hp: 44, dano: 18, vel: 88, visao: 170, alcance: 60, prep: 0.45, golpe: 0.22, recua: 0.9, brasas: 38, firme: 0, r: 10, salta: true },
    ze: { nome: 'Zé Facão, chefe dos bandidos', spr: 'ze', hp: 640, dano: 34, vel: 56, visao: 200, alcance: 46, prep: 0.56, golpe: 0.2, recua: 0.72, brasas: 900, firme: 9, r: 15, chefe: true, seguidos: 3, deixa: 'chave_ferro', arena: 'ze' },
    corpo: { nome: 'Corpo-seco Guardião', spr: 'corpo', hp: 1250, dano: 44, vel: 42, visao: 300, alcance: 54, prep: 0.74, golpe: 0.22, recua: 0.85, brasas: 3200, firme: 9, r: 16, chefe: true, seguidos: 2, deixa: 'fragmento', arena: 'corpo', final: true },
  };

  // tesouros escondidos: fogem do caminho principal e recompensam quem explora
  C.TESOUROS = [
    { id: 't1', x: 28, y: 114, item: 'brasas', qtd: 180 },
    { id: 't2', x: 36, y: 66, item: 'caco_cabaca' },
    { id: 't3', x: 134, y: 70, item: 'brasas', qtd: 320 },
    { id: 't4', x: 180, y: 42, item: 'pedra_vida' },
    { id: 't5', x: 218, y: 94, item: 'caco_cabaca' },
    { id: 't6', x: 100, y: 204, item: 'pedra_vida' },
    { id: 't7', x: 74, y: 243, item: 'brasas', qtd: 700 },
  ];
  C.ITENS = {
    brasas: { nome: 'Punhado de brasas' },
    caco_cabaca: { nome: 'Caco de cabaça', desc: 'A cabaça passa a guardar mais um gole.' },
    pedra_vida: { nome: 'Pedra da carne', desc: 'Sua vida máxima sobe um pouco, para sempre.' },
    chave_ferro: { nome: 'Chave de ferro', desc: 'Abre o portão do cemitério, a leste da encruzilhada.' },
    fragmento: { nome: 'Fragmento da Sina', desc: 'Um caco de estrela, ainda quente. Benta espera por ele.' },
  };

  C.PLACAS = [ // sussurros no chão: ensinam sem interromper
    { x: 30, y: 168, t: 'WASD para andar. Espaço para rolar: quem rola não é atingido.' },
    { x: 37, y: 160, t: 'Clique para golpear; botão direito para o golpe forte. Golpes e rolamentos gastam vigor.' },
    { x: 56, y: 139, t: 'Descansar na fogueira cura e enche a cabaça, mas os mortos se levantam de novo.' },
    { x: 78, y: 131, t: 'Ao morrer, suas brasas ficam onde você caiu. Morra de novo antes de buscá-las e elas se apagam.' },
    { x: 118, y: 118, t: 'O portão a leste não abre deste lado. Alguém terá de abri-lo por dentro.' },
    { x: 150, y: 113, t: 'A chave abre o caminho do leste. O portão a oeste leva de volta à encruzilhada.' },
    { x: 136, y: 236, t: 'Atrás da névoa, o que guarda a cripta. Quem atravessa não volta sem vencer.' },
  ];

  C.CONVERSAS = {
    benta1: ['Você também acordou na cova, Sem-Sina. Ouvi sua terra se abrir.',
      'Vinte anos atrás a Cauda rachou o céu. Um caco dela caiu na Cripta da Alvorada, e desde então os mortos não ficam deitados.',
      'O Guardião da cripta carrega o caco no peito. Não vai largar enquanto tiver osso.',
      'O portão do cemitério tem chave, e a chave está com Zé Facão, na Toca, além da Mata Funda. Siga para o norte da encruzilhada.',
      'Morra quantas vezes precisar. Só não esqueça de voltar.'],
    benta2: ['A terra ainda chama por você. A chave, Sem-Sina. Com Zé Facão, depois da Mata Funda.'],
    benta3: ['Agora o cemitério. Depois a cripta. Descanse antes da névoa, porque atrás dela ninguém descansa.'],
    benta4: ['Esse calor. É o caco. Ponha na minha mão, deixe eu sentir.',
      'Ele chama outros quatro. Cada um numa terra, cada um com um guardião pior do que este.',
      'Você ainda não entendeu, não é? Não é o destino que te trouxe de volta. É que você é o único sem nenhum.',
      'Descanse. O caminho continua.'],
  };

  // ---------- coordenadas do desenho para o mapa final, e mais gente nos corredores ----------
  const M = raiz.Mapa, p = M.p;
  for (const f of Object.values(C.FOGUEIRAS)) [f.x, f.y] = p(f.x, f.y);
  // ao esticar o mapa, um ponto pode cair na mata: leva-o ao lugar aberto mais próximo
  const encaixa = (x, y) => {
    for (let r = 0; r < 20; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (M.anda(x + dx, y + dy)) return [x + dx, y + dy];
    return [x, y];
  };
  C.INIMIGOS = C.INIMIGOS.map(([t, x, y]) => [t, ...encaixa(...p(x, y))]);
  for (const t of C.TESOUROS) [t.x, t.y] = encaixa(...p(t.x, t.y));
  for (const q of C.PLACAS) [q.x, q.y] = encaixa(...p(q.x, q.y));
  C.AREAS = C.AREAS.map(([n, x, y, r]) => { const c = p(x, y); return [n, c[0], c[1], y < 190 ? r * 1.5 : r]; });

  // quem patrulha cada trecho: quanto mais longe, pior
  const TRECHOS = { ermo: ['morto'], vila: ['morto'], est1: ['morto', 'morto', 'bandido'], est2: ['morto', 'bandido'], encruz: ['bandido', 'lobo'], mata1: ['lobo', 'morto', 'apagado'],
    lobos: ['lobo', 'lobo', 'apagado'], ponte: ['morto', 'bandido', 'apagado'], matafim: ['bandido', 'apagado'], trilha: ['bandido', 'bandido', 'apagado'], tocaboca: ['bandido'], desce1: ['lobo', 'morto'], desce2: ['lobo', 'apagado'], desce3: ['morto', 'apagado'], fora: ['morto_forte', 'morto'], cemiterio: ['morto', 'morto_forte', 'apagado'] };
  for (const [a, b] of M.E) {
    const lista = TRECHOS[a]; if (!lista) continue;
    const A = M.N[a], B = M.N[b], L = Math.hypot(B[0] - A[0], B[1] - A[1]);
    for (let d = 15, i = 0; d < L - 9; d += 15, i++) {
      const x = Math.round(A[0] + ((B[0] - A[0]) * d) / L), y = Math.round(A[1] + ((B[1] - A[1]) * d) / L);
      if (!M.anda(x, y) || Object.values(C.FOGUEIRAS).some((f) => Math.hypot(f.x - x, f.y - y) < 12)) continue;
      C.INIMIGOS.push([lista[Math.floor(M.hash(x, y) * lista.length)], x, y]);
    }
  }

  raiz.Conteudo = C;
  if (typeof module !== 'undefined') module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
