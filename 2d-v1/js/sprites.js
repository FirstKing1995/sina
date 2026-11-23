/* SINA 2D · imagens. Carrega as tiras de assets/spr e dá um acabamento por código aos personagens:
   contorno escuro (para destacar do cenário), luz de aro vinda da lua, versão virada e silhueta branca para o clarão do golpe. */
(function () {
  'use strict';
  const S = window.Spr = {};
  const banco = {}; // nome -> { img, w, h, n, fundo, vira, branco }
  S.banco = banco;
  const carregaImg = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
  const tela = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // contorno de 1 px + aro de luz no alto e à esquerda + sombra embaixo, quadro a quadro
  function acabamento(img, w, h, n, opc) {
    const W = w * n, c = tela(W, h), g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const im = g.getImageData(0, 0, W, h), d = im.data, src = new Uint8ClampedArray(d);
    const A = (x, y) => (x < 0 || y < 0 || y >= h ? 0 : src[(y * W + x) * 4 + 3]);
    for (let q = 0; q < n; q++) {
      const x0 = q * w, x1 = x0 + w - 1;
      for (let y = 0; y < h; y++) for (let x = x0; x <= x1; x++) {
        const i = (y * W + x) * 4, a = src[i + 3];
        const viz = (dx, dy) => { const xx = x + dx; return xx < x0 || xx > x1 ? 0 : A(xx, y + dy); };
        if (a < 60) {
          if (opc.contorno && (viz(1, 0) > 120 || viz(-1, 0) > 120 || viz(0, 1) > 120 || viz(0, -1) > 120)) { d[i] = 8; d[i + 1] = 6; d[i + 2] = 10; d[i + 3] = 235; }
          continue;
        }
        if (opc.aro) {
          const borda = viz(0, -1) < 60 || viz(-1, 0) < 60 || viz(-1, -1) < 60;
          const baixo = viz(0, 2) < 60 || viz(1, 1) < 60;
          if (borda) { d[i] = Math.min(255, src[i] * 1.32 + 26); d[i + 1] = Math.min(255, src[i + 1] * 1.3 + 24); d[i + 2] = Math.min(255, src[i + 2] * 1.25 + 34); }
          else if (baixo) { d[i] = src[i] * 0.72; d[i + 1] = src[i + 1] * 0.72; d[i + 2] = src[i + 2] * 0.8; }
        }
      }
    }
    g.putImageData(im, 0, 0);
    return c;
  }
  function virada(c) { const v = tela(c.width, c.height), g = v.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return v; }
  function silhueta(c, cor) { const v = tela(c.width, c.height), g = v.getContext('2d'); g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = cor; g.fillRect(0, 0, c.width, c.height); return v; }
  function fundoDe(img, w, h) {
    const c = tela(w, h), g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    for (let y = h - 1; y >= 0; y--) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) return h - 1 - y;
    return 2;
  }

  // onde fica o alto da cabeça em cada quadro (para prender a faixa no pescoço)
  function cabecas(img, w, h, n) {
    const c = tela(w * n, h), g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, w * n, h).data, r = [];
    for (let q = 0; q < n; q++) {
      let topo = -1, sx = 0, k = 0;
      for (let y = 0; y < h && topo < 0; y++) for (let x = 0; x < w; x++) if (d[(y * w * n + q * w + x) * 4 + 3] > 100) { topo = y; break; }
      for (let y = topo; y < topo + 8 && y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w * n + q * w + x) * 4 + 3] > 100) { sx += x; k++; }
      r.push({ y: topo, x: k ? sx / k : w / 2 });
    }
    return r;
  }
  // repinturas: a onça do acervo veio cinza; aqui ela ganha pelo dourado e rosetas
  const PINTA = {
    onca_e: (img) => {
      const c = tela(img.width, img.height), g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
      const im = g.getImageData(0, 0, c.width, c.height), d = im.data;
      const h = (x, y) => { let k = (x * 374761393 + y * 668265263) | 0; k = (k ^ (k >>> 13)) * 1274126177; return ((k ^ (k >>> 16)) >>> 0) / 4294967296; };
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4; if (d[i + 3] < 60) continue;
        const r = d[i], gg = d[i + 1], b = d[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
        if (mx - mn > 40) continue; // olhos e boca ficam
        const l = (r + gg + b) / 3;
        if (l > 200) { d[i] = 236; d[i + 1] = 222; d[i + 2] = 190; continue; } // barriga clara
        const xx = x % 64;
        const roseta = h(xx >> 1, y >> 1) < 0.13 && l > 70 && l < 190;
        if (roseta) { d[i] = 40; d[i + 1] = 26; d[i + 2] = 14; }
        else { d[i] = Math.min(255, l * 1.35 + 30); d[i + 1] = Math.min(255, l * 0.98 + 6); d[i + 2] = l * 0.42; }
      }
      g.putImageData(im, 0, 0); return c;
    },
  };
  S.registra = function (nome, img, meta, opc) {
    if (!img) return null;
    const m = meta || { w: img.width, h: img.height, n: 1, fundo: 0 };
    const n = Math.max(1, Math.min(m.n || 1, Math.floor(img.width / m.w)));
    const fundo = m.fundo == null ? fundoDe(img, m.w, m.h) : m.fundo;
    if (PINTA[nome]) img = PINTA[nome](img);
    const base = opc && (opc.contorno || opc.aro) ? acabamento(img, m.w, m.h, n, opc) : img;
    const e = { img: base, w: m.w, h: m.h, n, fundo, vira: null, branco: null, personagem: !!(opc && opc.contorno) };
    if (opc && opc.cabeca) e.cabeca = cabecas(img, m.w, m.h, n);
    banco[nome] = e;
    return e;
  };
  S.carregar = async function (nomes, opc, aviso) {
    let feitos = 0;
    await Promise.all(nomes.map(async (n) => {
      const img = await carregaImg('assets/spr/' + n + '.png');
      S.registra(n, img, window.ARTE.spr[n], opc);
      feitos++; if (aviso) aviso(feitos / nomes.length);
    }));
  };
  S.carregarUm = async (nome, src, meta, opc) => S.registra(nome, await carregaImg(src), meta, opc);
  S.tem = (n) => !!banco[n];

  // desenha com os pés em (x, y). q: quadro. virado: olhando para a esquerda.
  S.desenha = function (g, nome, q, x, y, virado, o) {
    const e = banco[nome]; if (!e) return;
    o = o || {};
    const esc = o.esc || 1, sx = (o.sx || 1) * esc, sy = (o.sy || 1) * esc;
    let fonte = e.img, qq = ((q | 0) % e.n + e.n) % e.n;
    if (virado) { if (!e.vira) e.vira = virada(e.img); fonte = e.vira; qq = e.n - 1 - qq; }
    const dw = e.w * sx, dh = e.h * sy;
    const dx = Math.round(x - dw / 2), dy = Math.round(y - dh + e.fundo * sy);
    if (o.alpha != null) g.globalAlpha = o.alpha;
    if (o.rot) {
      g.save(); g.translate(x, y - (e.h - e.fundo) * sy / 2); g.rotate(o.rot);
      g.drawImage(fonte, qq * e.w, 0, e.w, e.h, -dw / 2, -dh / 2, dw, dh); g.restore();
    } else g.drawImage(fonte, qq * e.w, 0, e.w, e.h, dx, dy, dw, dh);
    if (o.branco) { // clarão de golpe
      const k = virado ? 'brancoV' : 'brancoN';
      if (!e[k]) e[k] = silhueta(virado ? (e.vira || (e.vira = virada(e.img))) : e.img, '#fff');
      g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * o.branco;
      g.drawImage(e[k], qq * e.w, 0, e.w, e.h, dx, dy, dw, dh);
    }
    if (o.tinta) {
      const k = 't' + o.tinta + (virado ? 'V' : 'N');
      if (!e[k]) e[k] = silhueta(virado ? (e.vira || (e.vira = virada(e.img))) : e.img, o.tinta);
      g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * (o.tintaA || 0.5);
      g.drawImage(e[k], qq * e.w, 0, e.w, e.h, dx, dy, dw, dh);
    }
    g.globalAlpha = 1;
  };
  S.info = (n) => banco[n];
})();
