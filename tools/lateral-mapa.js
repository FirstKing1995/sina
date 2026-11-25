// Mostra um trecho do mapa em texto. node tools/lateral-mapa.js AREA COLUNA
global.window = global; const L = __dirname + '/../lateral/js/'; require(L + 'fase.js'); const F = window.Fase;
const [, , id, c0] = process.argv; F.entrar(id);
for (let y = 10; y < 44; y++) { let l = ''; for (let x = +c0 - 12; x < +c0 + 34; x++) l += ' #=^'[F.tile(x, y)]; if (/[=^]/.test(l) || (l.includes('#') && l.includes(' '))) console.log(String(y).padStart(2), l); }
