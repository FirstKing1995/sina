/* SINA · Aruanã: quem é o herói. Sexo, raça e especialidade têm efeito nas regras, e a aparência é refeita aqui,
   quadro a quadro, a partir das peças do herói original. Nada de arquivo novo por combinação. */
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
  AP.padrao = () => ({ nome: 'Sem-Sina', sexo: 'm', raca: 'humano', esp: 'andarilho', cabelo: 26 });
  AP.CABELOS = [[26, 'Castanho'], [14, 'Ruivo'], [45, 'Loiro'], [220, 'Negro'], [0, 'Grisalho']];

  const rgb2hsv = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const M = Math.max(r, g, b), m = Math.min(r, g, b), d = M - m;
    let h = 0;
    if (d) h = M === r ? ((g - b) / d) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, M ? d / M : 0, M];
  };
  const hsv2rgb = (h, s, v) => {
    const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
    const [a, b, d] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [Math.round((a + m) * 255), Math.round((b + m) * 255), Math.round((d + m) * 255)];
  };

  // cores: pele, manto e, na especialidade, a cor do capuz
  function colorir(d, H) {
    const raca = AP.RACAS[H.raca], esp = AP.ESPECIALIDADES[H.esp], p = raca.pele, a = d.data;
    for (let i = 0; i < a.length; i += 4) {
      if (!a[i + 3]) continue;
      const [h, s, v] = rgb2hsv(a[i], a[i + 1], a[i + 2]);
      let nh = h, ns = s, nv = v, muda = false;
      if (s > 0.12 && h >= 140 && h <= 215 && esp.manto != null) { nh = esp.manto; ns = Math.min(1, s * 1.15); nv = v * 0.95; muda = true; }
      else if (s > 0.12 && h >= 8 && h <= 45 && v > 0.62 && s < 0.55) { if (p.h != null) nh = p.h; ns = Math.min(1, s * p.s); nv = Math.min(1, v * p.v); muda = true; }
      if (muda) { const c = hsv2rgb(nh, ns, nv); a[i] = c[0]; a[i + 1] = c[1]; a[i + 2] = c[2]; }
    }
  }
  function caixa(d, w, h) {
    let x0 = w, x1 = -1, y0 = h, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d.data[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? null : { x0, x1, y0, y1 };
  }
  function centroCabeca(d, w, b) {
    let soma = 0, n = 0;
    for (let y = b.y0; y < b.y0 + 12; y++) for (let x = 0; x < w; x++) if (d.data[(y * w + x) * 4 + 3] > 40) { soma += x; n++; }
    return n ? Math.round(soma / n) : Math.round((b.x0 + b.x1) / 2);
  }
  function cabelo(g, x, y, alt, larg, H) {
    const tom = H.cabelo === 0 ? ['#b8b4aa', '#8e8a82', '#5e5a54'] : [hsvCss(H.cabelo, 0.62, 0.62), hsvCss(H.cabelo, 0.7, 0.42), hsvCss(H.cabelo, 0.75, 0.26)];
    for (let i = 0; i < alt; i++) {
      const dx = Math.round(Math.sin(i * 0.5) * 0.6);
      g.fillStyle = tom[1]; g.fillRect(x + dx, y + i, larg, 1);
      g.fillStyle = tom[0]; g.fillRect(x + dx, y + i, 1, 1);
      g.fillStyle = tom[2]; g.fillRect(x + dx + larg - 1, y + i, 1, 1);
    }
  }
  const hsvCss = (h, s, v) => { const c = hsv2rgb(h, s, v); return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; };

  // refaz um quadro: proporção do corpo, cores, cabelo comprido, orelhas
  function quadro(ctxOrigem, fx, w, h, dir, H) {
    const raca = AP.RACAS[H.raca];
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingEnabled = false;
    const origem = ctxOrigem.getImageData(fx, 0, w, h);
    const ref = caixa(origem, w, h);
    if (!ref) return c;
    const largura = (raca.largura || 1) * (H.sexo === 'f' ? 0.94 : 1), altura = raca.altura || 1;
    const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h; tmp.getContext('2d').putImageData(origem, 0, 0);
    const cx = (ref.x0 + ref.x1 + 1) / 2, dw = Math.round(w * largura), dh = Math.round(h * altura);
    g.drawImage(tmp, Math.round(cx - cx * largura), Math.round(ref.y1 + 1 - (ref.y1 + 1) * altura), dw, dh);
    const d = g.getImageData(0, 0, w, h);
    colorir(d, H);
    g.putImageData(d, 0, 0);
    const b = caixa(d, w, h);
    if (!b) return c;
    const cc = centroCabeca(d, w, b), alto = b.y1 - b.y0;
    if (H.sexo === 'f') { // cabelo comprido saindo do capuz
      const y = b.y0 + Math.round(alto * 0.2), alt = Math.round(alto * 0.34);
      if (dir === 's') { cabelo(g, cc - 8, y, alt, 3, H); cabelo(g, cc + 5, y, alt, 3, H); }
      else if (dir === 'e') cabelo(g, cc - 7, y, alt, 4, H);
      else if (dir === 'n') cabelo(g, cc - 2, y + 2, Math.round(alt * 1.15), 5, H);
    }
    if (H.raca === 'fera') { // orelhas por cima do capuz
      g.fillStyle = '#3a2a22';
      const orelha = (x) => { g.fillRect(x, b.y0 - 3, 2, 1); g.fillRect(x - 1, b.y0 - 2, 4, 1); g.fillRect(x - 1, b.y0 - 1, 5, 2); g.fillStyle = '#7a5a44'; g.fillRect(x, b.y0 - 1, 2, 1); g.fillStyle = '#3a2a22'; };
      if (dir === 'e') orelha(cc - 1); else { orelha(cc - 8); orelha(cc + 5); }
    }
    if (H.raca === 'elfo' && dir !== 'n') { // ponta de orelha
      const y = b.y0 + Math.round(alto * 0.16);
      g.fillStyle = hsvCss(30, 0.3, 0.92);
      if (dir === 's') { g.fillRect(cc - 11, y - 1, 3, 1); g.fillRect(cc - 10, y, 3, 1); g.fillRect(cc + 8, y - 1, 3, 1); g.fillRect(cc + 7, y, 3, 1); }
      else { g.fillRect(cc + 6, y - 1, 3, 1); g.fillRect(cc + 5, y, 3, 1); }
    }
    return c;
  }
  // refaz uma tira inteira
  AP.tira = function (im, info, dir, H) {
    const c0 = document.createElement('canvas'); c0.width = im.width; c0.height = im.height;
    const g0 = c0.getContext('2d', { willReadFrequently: true }); g0.drawImage(im, 0, 0);
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    for (let i = 0; i < info.n; i++) g.drawImage(quadro(g0, i * info.w, info.w, info.h, dir, H), i * info.w, 0);
    return c;
  };
  const DIR = { heroi_e: 'e', heroi_s: 's', heroi_n: 'n', heroi_e0: 'e', heroi_s0: 's', heroi_n0: 'n', golpe_e: 'e', golpe_s: 's', golpe_n: 'n', rola: 'r' };
  AP.vestir = function (H) { // troca as imagens do herói na tela
    const T = window.Tela, A = window.ARTE;
    for (const n in DIR) { const base = T.original(n); if (base) T.trocar(n, AP.tira(base, A.spr[n], DIR[n], H)); }
  };
})();
