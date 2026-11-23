/* SINA 2D · criaturas vistas de lado. Valores vêm da versão de cima, ajustados para plataforma.
   vel: px/s andando. alcance: distância do golpe. prep: tempo de aviso antes do golpe (o corpo pisca). firme: golpes aguentados antes de cambalear. */
(function () {
  'use strict';
  const C = window.Conteudo = {};
  // corpo: largura e altura da caixa de colisão; spr: tira de andar; ge: tira de ataque (se existir)
  C.TIPOS = {
    morto: { nome: 'Morto-errante', spr: 'morto_e', ge: 'morto_ge', hp: 44, dano: 22, vel: 34, visao: 170, alcance: 30, prep: 0.55, golpe: 0.22, recua: 0.7, brasas: 22, firme: 1, w: 14, h: 32 },
    morto_forte: { nome: 'Morto de armadura', spr: 'morto_forte_e', ge: 'morto_forte_ge', hp: 170, dano: 34, vel: 30, visao: 180, alcance: 34, prep: 0.7, golpe: 0.24, recua: 0.6, brasas: 75, firme: 5, w: 16, h: 34, seguidos: 2 },
    bandido: { nome: 'Bandido', spr: 'bandido_e', ge: 'bandido_ge', hp: 70, dano: 24, vel: 62, visao: 210, alcance: 30, prep: 0.36, golpe: 0.18, recua: 0.45, brasas: 46, firme: 1, w: 14, h: 32, seguidos: 3 },
    lobo: { nome: 'Bicho enlouquecido', spr: 'lobo_e', hp: 34, dano: 18, vel: 92, visao: 230, alcance: 70, prep: 0.42, golpe: 0.3, recua: 0.75, brasas: 30, firme: 1, w: 26, h: 18, salta: true },
    cobra: { nome: 'Cobra-do-mato', spr: 'cobra_e', hp: 28, dano: 18, vel: 52, visao: 150, alcance: 44, prep: 0.36, golpe: 0.24, recua: 0.8, brasas: 24, firme: 1, w: 24, h: 12, salta: true },
    aranha: { nome: 'Armadeira', spr: 'aranha_e', hp: 60, dano: 22, vel: 80, visao: 190, alcance: 74, prep: 0.4, golpe: 0.3, recua: 0.7, brasas: 40, firme: 1, w: 26, h: 16, salta: true },
    onca: { nome: 'Onça-pintada', spr: 'onca_e', hp: 120, dano: 30, vel: 110, visao: 240, alcance: 90, prep: 0.38, golpe: 0.32, recua: 0.62, brasas: 70, firme: 3, w: 30, h: 20, salta: true },
    queixada: { nome: 'Queixada', spr: 'queixada_e', hp: 44, dano: 20, vel: 100, visao: 200, alcance: 80, prep: 0.44, golpe: 0.34, recua: 0.8, brasas: 36, firme: 1, w: 26, h: 18, salta: true },
    marimbondo: { voa: true, nome: 'Marimbondo-do-mato', spr: 'marimbondo_e', hp: 16, dano: 14, vel: 90, visao: 200, alcance: 70, prep: 0.32, golpe: 0.26, recua: 0.85, brasas: 22, firme: 0, w: 14, h: 12, salta: true },
    morcego: { voa: true, nome: 'Morcego-vampiro', spr: 'morcego_e', hp: 30, dano: 14, vel: 100, visao: 220, alcance: 80, prep: 0.3, golpe: 0.28, recua: 1, brasas: 22, firme: 1, w: 16, h: 12, salta: true },
    apagado: { nome: 'Apagado', spr: 'apagado_e', ge: 'apagado_ge', hp: 64, dano: 22, vel: 40, visao: 260, alcance: 220, prep: 0.8, golpe: 0.12, recua: 0.8, brasas: 58, firme: 1, w: 14, h: 32, atira: true, distancia: 130 },
    alma: { voa: true, nome: 'Alma penada', spr: 'alma_e', hp: 54, dano: 20, vel: 46, visao: 240, alcance: 200, prep: 0.75, golpe: 0.12, recua: 0.9, brasas: 52, firme: 1, w: 16, h: 24, atira: true, distancia: 120 },
    brutamontes: { nome: 'Brutamontes', spr: 'brutamontes_e', hp: 300, dano: 42, vel: 36, visao: 180, alcance: 40, prep: 0.85, golpe: 0.26, recua: 1.05, brasas: 190, firme: 8, w: 22, h: 40, pesado: true },
    esqueleto: { nome: 'Soldado sem carne', spr: 'esqueleto_e', ge: 'esqueleto_ge', hp: 140, dano: 34, vel: 56, visao: 200, alcance: 34, prep: 0.42, golpe: 0.2, recua: 0.5, brasas: 92, firme: 4, w: 14, h: 32, seguidos: 3 },
    jagunco: { nome: 'Jagunço', spr: 'jagunco_e', ge: 'jagunco_ge', hp: 140, dano: 30, vel: 56, visao: 200, alcance: 32, prep: 0.44, golpe: 0.2, recua: 0.5, brasas: 70, firme: 4, w: 14, h: 32, seguidos: 2 },
    // chefe da primeira parte
    lobisomem: { nome: 'O Lobisomem', spr: 'lobisomem_e', ge: 'lobisomem_ge', hp: 1100, dano: 30, vel: 96, visao: 600, alcance: 46, prep: 0.5, golpe: 0.26, recua: 0.8, brasas: 1800, firme: 18, w: 30, h: 50, chefe: true, seguidos: 3, salta: true, poder: 'uivo', escala: 1.25 },
  };

  C.CONVERSAS = {
    benta: ['Você também acordou na cova, Sem-Sina. Ouvi sua terra se abrir.',
      'Vinte anos atrás a Cauda rachou o céu de Aruanã. Três cacos dela caíram, e cada um enlouqueceu o que estava perto.',
      'Um está com o Lobisomem, depois da Mata Funda, a leste. O uivo dele chega até aqui.',
      'Acerte golpes e a Sina enche dentro de você. Gaste em magia. Descanse nas fogueiras. E não esqueça: morrer aqui não é o fim, é só o começo de novo.'],
    bentaDepois: ['O Lobisomem caiu? Então o primeiro caco é seu. Os outros dois ainda chamam, mas isso fica para outra vez.'],
  };
})();
