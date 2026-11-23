/* SINA 2D · quem é o herói: povo, especialidade, armas e magias. As imagens vêm das mesmas folhas de perfil da versão de cima. */
(function () {
  'use strict';
  const H = window.Heroi = {};

  H.RACAS = {
    humano: { nome: 'Humano', desc: 'Sem ponto fraco. Ganha 15% a mais de brasas.', brasas: 0.15 },
    elfo: { nome: 'Elfo', desc: 'Esguio. Pula mais alto e esquiva barato, menos vida.', vida: -10, vigor: 14, rola: -6, pulo: 0.08 },
    anao: { nome: 'Anão', desc: 'Baixo e largo. Mais vida e defesa, mais lento.', vida: 24, def: 0.06, vel: -0.08, rola: 4 },
    fera: { nome: 'Povo-fera', desc: 'Gente de pelo. Mais dano e velocidade, menos defesa.', dano: 0.12, vel: 0.08, def: -0.05 },
  };

  // cada especialidade tem duas magias: R e F. Magia gasta Sina, que enche quando você acerta golpes.
  H.ESPECIALIDADES = {
    soldado: { nome: 'Soldado', desc: 'Mais vida e armadura de couro. Espada.', vida: 15, def: 0.1, arma: 'espada', cor: '#d8483a', magias: ['guarda', 'tremor'] },
    cacador: { nome: 'Caçador', desc: 'Lança de alcance longo e mais vigor.', vigor: 14, arma: 'lanca', cor: '#7cc46a', magias: ['passo', 'lancas'] },
    aprendiz: { nome: 'Aprendiz de feitiço', desc: 'Pouca vida, magia forte. Faca rápida.', vida: -12, sina: 40, arma: 'adaga', cor: '#b07cff', magias: ['seta', 'coluna'] },
    andarilho: { nome: 'Andarilho', desc: 'Já viu de tudo. Mais um gole na cabaça e mais brasas.', brasas: 0.1, cabaca: 1, arma: 'cajado', cor: '#e9c47a', magias: ['folego', 'lampejo'] },
  };

  // arma: dano, vigor por golpe, tempo do golpe (s), alcance (px à frente)
  H.ARMAS = {
    espada: { nome: 'Espada gasta', ic: 'W_Sword001', dano: 17, custo: 14, tempo: 0.34, alcance: 34, altura: 26, preco: 500, desc: 'Equilibrada. Bom alcance e golpe firme.' },
    lanca: { nome: 'Lança de caça', ic: 'W_Spear001', dano: 16, custo: 15, tempo: 0.38, alcance: 46, altura: 16, estoca: true, preco: 650, desc: 'Estocada longa e estreita. Fere de longe.' },
    adaga: { nome: 'Faca de osso', ic: 'W_Dagger004', dano: 11, custo: 9, tempo: 0.24, alcance: 26, altura: 22, preco: 300, desc: 'Curta e muito rápida. Gasta pouco vigor.' },
    cajado: { nome: 'Cajado de andarilho', ic: 'I_Book', dano: 14, custo: 12, tempo: 0.32, alcance: 36, altura: 28, preco: 0, desc: 'Madeira velha com alma de ferro.' },
    machado: { nome: 'Machado de lenhador', ic: 'W_Axe003', dano: 29, custo: 24, tempo: 0.5, alcance: 38, altura: 30, req: 3, preco: 1400, desc: 'Lento e pesado. Quebra a guarda de quem apanha. Pede Força 3.' },
    facao: { nome: 'Facão de Zé', ic: 'W_Dagger018', dano: 23, custo: 13, tempo: 0.3, alcance: 34, altura: 24, desc: 'Arrancado do chefe dos bandidos. Rápido e cruel.' },
  };

  H.MAGIAS = {
    seta: { ic: 'S_Fire01', nome: 'Seta de Brasa', desc: 'Uma bola de fogo que corre reta e estoura no que tocar.', custo: 22, espera: 0.45, cor: '#ff9a40' },
    coluna: { ic: 'S_Fire05', nome: 'Coluna de Fogo', desc: 'O chão à sua frente explode numa coluna de chamas.', custo: 40, espera: 1.2, cor: '#ff6a2a' },
    guarda: { ic: 'A_Armour01', nome: 'Guarda de Ferro', desc: 'Por 5 segundos, recebe 60% menos dano e não é derrubado.', custo: 33, espera: 6, cor: '#9fc4e0' },
    tremor: { ic: 'I_Rock02', nome: 'Golpe Sísmico', desc: 'Bate a arma no chão: duas ondas de pedra correm pelos lados.', custo: 40, espera: 1.4, cor: '#d8b070' },
    passo: { ic: 'I_Leaf', nome: 'Passo de Caça', desc: 'Por 6 segundos, corre mais e esquiva sem gastar vigor.', custo: 30, espera: 7, cor: '#9cff8a' },
    lancas: { ic: 'W_Spear001', nome: 'Lanças Fantasmas', desc: 'Atira três lanças de luz em leque.', custo: 33, espera: 0.9, cor: '#b8ffb0' },
    folego: { ic: 'P_Green01', nome: 'Segundo Fôlego', desc: 'Recupera todo o vigor e um terço da vida.', custo: 45, espera: 3, cor: '#ffe39a' },
    lampejo: { ic: 'I_Crystal01', nome: 'Lampejo da Sina', desc: 'Uma explosão de luz ao redor: fere e atordoa quem estiver perto.', custo: 38, espera: 1.5, cor: '#fff2c0' },
  };

  H.armaInicial = (h) => (H.ESPECIALIDADES[h.esp] || {}).arma || 'espada';
  H.padrao = () => ({ nome: 'Sem-Sina', sexo: 'm', raca: 'humano', esp: 'andarilho' });
  H.chave = (h) => h.sexo + '_' + h.raca + '_' + h.esp;
  const ORIGINAL = 'm_humano_andarilho';
  H.existe = (h) => H.chave(h) === ORIGINAL || (window.ARTE.herois || []).includes(H.chave(h));
  H.melhor = function (h) {
    const tem = window.ARTE.herois || [];
    const op = [H.chave(h)];
    for (const e of ['andarilho', 'soldado', 'cacador', 'aprendiz']) op.push(h.sexo + '_' + h.raca + '_' + e);
    for (const s of ['m', 'f']) for (const e of [h.esp, 'andarilho', 'soldado', 'cacador', 'aprendiz']) op.push(s + '_' + h.raca + '_' + e);
    return op.find((o) => o === ORIGINAL || tem.includes(o)) || ORIGINAL;
  };
  // as duas tiras de perfil do herói: andar (6 quadros) e golpe
  H.caminhos = function (h) {
    const k = H.melhor(h);
    if (k === ORIGINAL) return { anda: 'assets/spr/heroi_e.png', golpe: 'assets/spr/golpe_e.png', golpeW: 88 };
    return { anda: 'assets/herois/' + k + '/heroi_e.png', golpe: 'assets/herois/' + k + '/golpe_e.png', golpeW: 64 };
  };

  // números do herói a partir da ficha e dos níveis gastos nas fogueiras
  H.ficha = function (h, niv, extra) {
    const r = H.RACAS[h.raca] || {}, e = H.ESPECIALIDADES[h.esp] || {}, n = niv || { vida: 0, vigor: 0, forca: 0, sina: 0 };
    extra = extra || {};
    const idArma = extra.arma || e.arma, arma = Object.assign({ id: idArma }, H.ARMAS[idArma] || H.ARMAS.espada);
    const forja = (extra.forja && extra.forja[idArma]) || 0;
    arma.forja = forja;
    if (arma.req && n.forca < arma.req) { arma.fraca = true; }
    return {
      vida: 100 + (r.vida || 0) + (e.vida || 0) + n.vida * 14,
      vigor: 100 + (r.vigor || 0) + (e.vigor || 0) + n.vigor * 9,
      sina: 100 + (e.sina || 0) + n.sina * 12,
      dano: arma.dano * (1 + (r.dano || 0)) * (1 + n.forca * 0.09) * (1 + forja * 0.15) * (arma.fraca ? 0.6 : 1),
      magia: 1 + n.sina * 0.08 + n.forca * 0.03,
      def: Math.max(0, (r.def || 0) + (e.def || 0)),
      vel: 1 + (r.vel || 0),
      pulo: 1 + (r.pulo || 0),
      rola: 20 + (r.rola || 0),
      brasas: 1 + (r.brasas || 0) + (e.brasas || 0),
      cabaca: 3 + (e.cabaca || 0),
      arma, cor: e.cor || '#e9c47a', magias: e.magias || ['seta', 'folego'],
    };
  };
})();
