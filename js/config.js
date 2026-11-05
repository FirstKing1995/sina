/* SINA · configuração. API_URL: a URL /exec do Apps Script (ver apps-script/SETUP.md). Vazia = jogo só no navegador.
   Também dá para ligar sem mexer aqui: abra o jogo com ?api=URL uma vez, e o endereço fica guardado no navegador. */
(function (G) {
  G.CFG = { API_URL: '' };
})(globalThis.G = globalThis.G || {});
