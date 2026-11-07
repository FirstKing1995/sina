/* SINA · Aruanã: quem é o herói. Sexo, povo e especialidade mudam as regras; a aparência vem de folhas prontas em assets/herois/. */
(function () {
  'use strict';
  const AP = window.Aparencia = {};

  AP.RACAS = {
    humano: { nome: 'Humano', desc: 'Sem ponto fraco. Ganha 15% a mais de brasas.', brasas: 0.15, pele: { h: null, s: 1, v: 1 } },
    elfo: { nome: 'Elfo', desc: 'Esguio. Mais vigor e rolamento barato, menos vida.', vida: -10, vigor: 14, rola: -6, pele: { h: 30, s: 0.55, v: 1.12 }, largura: 0.92, altura: 1.02 },
    anao: { nome: 'Anão', desc: 'Baixo e largo. Mais vida e defesa, mais lento.', vida: 24, def: 0.06, vel: -0.08, rola: 4, pele: { h: 16, s: 1.25, v: 0.95 }, largura: 1.1, altura: 0.82 },
    fera: { nome: 'Povo-fera', desc: 'Gente de pelo. Mais dano e velocidade, menos defesa.', dano: 0.12, vel: 0.08, def: -0.05, pele: { h: 28, s: 0.9, v: 0.6 } },
  };
  AP.ESPECIALIDADES = {
    soldado: { nome: 'Soldado', desc: 'Mais vida e armadura de couro.', vida: 15, itens: ['espada', 'couro'], veste: 'couro', arma: 'espada', manto: 355,
      poder: { id: 'guarda', nome: 'Guarda de Ferro', desc: 'Por 4 segundos, recebe 60% menos dano.', espera: 14, vigor: 30 } },
    cacador: { nome: 'Caçador', desc: 'Lança de caça e mais vigor.', vigor: 14, itens: ['lanca'], arma: 'lanca', manto: 112,
      poder: { id: 'passo', nome: 'Passo de Caça', desc: 'Por 5 segundos, corre mais e rola sem gastar vigor.', espera: 16, vigor: 15 } },
    aprendiz: { nome: 'Aprendiz de feitiço', desc: 'Pouca vida, mas ataca de longe. Começa com uma faca.', vida: -12, itens: ['adaga'], arma: 'adaga', manto: 268,
      poder: { id: 'seta', nome: 'Seta de Brasa', desc: 'Dispara fogo de longe. Gasta vigor, e a Força aumenta o dano.', espera: 1.1, vigor: 22 } },
    andarilho: { nome: 'Andarilho', desc: 'Já viu de tudo. Mais um gole na cabaça e mais brasas.', brasas: 0.1, cabaca: 1, itens: [], manto: null,
      poder: { id: 'folego', nome: 'Segundo Fôlego', desc: 'Recupera vigor e um pouco de vida, na hora.', espera: 22, vigor: 0 } },
  };
  AP.padrao = () => ({ nome: 'Sem-Sina', sexo: 'm', raca: 'humano', esp: 'andarilho' });
  
  // ---------- imagens: cada combinação de sexo, povo e especialidade é uma folha pronta em assets/herois/ ----------
  AP.chave = (H) => H.sexo + '_' + H.raca + '_' + H.esp;
  const ORIGINAL = 'm_humano_andarilho';
  // a mais parecida que já existe: mesma pessoa em outra roupa, senão mesmo povo, senão mesmo sexo
  AP.melhor = function (H) {
    const tem = window.ARTE.herois || [];
    const opcoes = [AP.chave(H)];
    for (const e of ['andarilho', 'soldado', 'cacador', 'aprendiz']) opcoes.push(H.sexo + '_' + H.raca + '_' + e);
    for (const s of ['m', 'f']) for (const e of [H.esp, 'andarilho', 'soldado', 'cacador', 'aprendiz']) opcoes.push(s + '_' + H.raca + '_' + e);
    for (const r of ['humano', 'elfo', 'anao', 'fera']) opcoes.push(H.sexo + '_' + r + '_' + H.esp);
    return opcoes.find((o) => o === ORIGINAL || tem.includes(o)) || ORIGINAL;
  };
  AP.existe = (H) => { const k = AP.chave(H); return k === ORIGINAL || (window.ARTE.herois || []).includes(k); };
  const TIRAS = ['heroi_e', 'heroi_s', 'heroi_n', 'golpe_e', 'golpe_s', 'golpe_n'];
  const cache = {};
  const carregaImg = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
  AP.carrega = async function (chave) {
    if (cache[chave]) return cache[chave];
    const o = {};
    await Promise.all(TIRAS.map(async (n) => { o[n] = await carregaImg('assets/herois/' + chave + '/' + n + '.png'); }));
    cache[chave] = o;
    return o;
  };
  // o rolamento nasce do primeiro quadro: encolhido, girando de 90 em 90 graus
  function fazRola(leste) {
    const c = document.createElement('canvas'); c.width = 64 * 4; c.height = 64;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    [0, 270, 180, 90].forEach((ang, i) => {
      g.save(); g.translate(i * 64 + 32, 40); g.rotate((ang * Math.PI) / 180);
      g.drawImage(leste, 0, 0, 64, 64, -23, -23, 46, 46);
      g.restore();
    });
    return c;
  }
  function primeiro(im) { const c = document.createElement('canvas'); c.width = 64; c.height = 64; c.getContext('2d').drawImage(im, 0, 0, 64, 64, 0, 0, 64, 64); return c; }
  function fundoDe(im, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, w, h, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    for (let y = h - 1; y >= 0; y--) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) return h - 1 - y;
    return 2;
  }
  AP.vestir = async function (H) { // troca as imagens do herói na tela
    const T = window.Tela, A = window.ARTE, chave = AP.melhor(H);
    if (chave === ORIGINAL) { for (const n of [...TIRAS, 'heroi_e0', 'heroi_s0', 'heroi_n0', 'rola']) T.restaurar(n); return; }
    const o = await AP.carrega(chave);
    for (const n of TIRAS) {
      if (!o[n]) continue;
      T.trocar(n, o[n]);
      A.spr[n] = { w: 64, h: 64, n: 6, fundo: fundoDe(o[n], 64, 64) };
    }
    for (const d of ['e', 's', 'n']) if (o['heroi_' + d]) { T.trocar('heroi_' + d + '0', primeiro(o['heroi_' + d])); A.spr['heroi_' + d + '0'] = { w: 64, h: 64, n: 1, fundo: A.spr['heroi_' + d].fundo }; }
    if (o.heroi_e) { T.trocar('rola', fazRola(o.heroi_e)); }
  };
})();
