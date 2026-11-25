// Dano por segundo e golpe carregado de cada arma num boneco parado. node tools/lateral-armas.js
global.window = global; global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const L = __dirname + (require('fs').existsSync(__dirname + '/../js/motor.js') ? '/../js/' : '/../lateral/js/');
for (const f of ['dados', 'fase', 'motor', 'bando', 'clima', 'donos', 'lar']) require(L + f + '.js');
const J = window.Jogo, F = window.Fase, C = window.Dados; J.semSalvar = true;
for (const a of C.ORDEM_ARMAS) {
  J.save = J.novoSave('b'); J.save.armas = [a]; J.save.arma = a; J.save.inv.flecha = 99; J.save.hora = 12; J.heroi = null; J.entrarArea('lar'); J.passoClima = null; J.recalcular();
  const h = J.heroi; const prep = () => { h.x = 1300; h.y = F.chao(1300); h.dir = 1; h.estado = 'livre'; h.vx = 0; h.vy = 0; h.combo = 0; h.vigor = h.ficha.vigor; const e = J.nasce('goblin_porrete', 1336, h.y, { hp: 1e5, hpMax: 1e5, manha: 0 }); e.T = Object.assign({}, e.T, { visao: 0, dano: 0 }); J.inimigos = [e]; J.balas = []; J.magias = []; return e; };
  let e = prep(), seq = 0; const p0 = J.passoInimigo; J.passoInimigo = () => {};
  for (let i = 0; i < 300; i++) { h.vigor = 60; h.hp = 90; if (Math.abs(e.x - h.x) > 40 || e.x < h.x) { e.x = h.x + 36; } h.dir = 1; if (C.ARMAS[a].tiro) { J.ent.golpe = h.estado === 'mira' && h.t < 0.85 ? 1 : 0; if (h.estado === 'livre') { J.aperta('golpe'); J.ent.golpe = 1; } } else if (i % 5 === 0) J.aperta('golpe'); e.vivo = true; e.estado = 'persegue'; J.passo(1 / 60); seq = Math.max(seq, h.combo < 50 ? h.combo : 0); }
  const dps = (1e5 - e.hp) / 5;
  e = prep(); J.ent.forte = 1; for (let i = 0; i < 62; i++) { h.vigor = 80; e.estado = 'persegue'; J.passo(1 / 60); } J.ent.forte = 0; const hp = e.hp; for (let i = 0; i < 70; i++) { h.vigor = 80; e.estado = 'persegue'; J.passo(1 / 60); }
  J.passoInimigo = p0; console.log(a.padEnd(15), 'combo', seq, 'dano/s', dps.toFixed(0).padStart(4), ' carregado', hp - e.hp, C.ESTILOS[C.ARMAS[a].per].pesado, h.estado);
}
