// Noite de ataque na vila e na cidade, sem o herói lutar: quanto a defesa aguenta. node tools/lateral-cerco.js
global.window = global; global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const L = __dirname + (require('fs').existsSync(__dirname + '/../js/motor.js') ? '/../js/' : '/../lateral/js/');
for (const f of ['dados', 'fase', 'motor', 'bando', 'clima', 'donos', 'lar', 'vila', 'cidade', 'mundo']) require(L + f + '.js');
const J = window.Jogo, F = window.Fase; J.semSalvar = true; let av = [];
J.aviso = (t, x) => av.push(t);
function noite(nome, o, dia) {
  J.save = J.novoSave('x'); const s = J.save; s.dia = dia; s.hora = 20.9; s.chefes = { alfa: 1, rainha: 1 }; av = [];
  s.lar = Object.assign({ casa: { n: 4, hp: 340 }, lenha: 20, ultimo: 0, cercaE: { n: 2, hp: 360 }, cercaD: { n: 2, hp: 360 }, estacasE: { n: 1, hp: 14 }, estacasD: { n: 1, hp: 14 } }, o.lar);
  s.vila = {}; for (const k of o.vila) s.vila[k] = { nome: k, dia: 1 }; s.familias = []; for (let i = 0; i < (o.fam || 0); i++) s.familias.push({ nome: 'f' + i, dia: 1, fome: 0, lote: i });
  J.heroi = null; J.entrarArea('lar'); const h = J.heroi; h.x = F.atual.lugar.casa; h.y = F.chao(h.x); let t = 0, max = 0;
  s.hora = 20.99; for (; t < 60 * 420; t++) { h.hp = h.ficha.vida; h.inv = 1; s.fome = 90; J.passo(1 / 60); max = Math.max(max, J.inimigos.filter((e) => e.vivo && e.raid).length); if (av.includes('raidFim')) break; }
  console.log(nome.padEnd(26), 'estágio', J.estagio(), '| fim', av.includes('raidFim'), (t / 60).toFixed(0) + 's | pico', max, '| casa', Math.round(s.lar.casa.hp), 'cercas', Math.round(s.lar.cercaE.hp), Math.round(s.lar.cercaD.hp), '|', [...new Set(av)].join(' '));
  if (!av.includes('raidFim')) console.log('   sobraram', J.inimigos.filter((e) => e.vivo && e.raid).map((e) => e.tipo + ' ' + e.estado + ' x' + Math.round(e.x / 16) + ' hp' + Math.round(e.hp)).join(', '));
}
const P = { poco: { n: 1, hp: 1 }, celeiro: { n: 1, hp: 1, comida: 20 }, casario: { n: 5, hp: 1 } }, T4 = ['ferreiro', 'curandeira', 'cacador', 'vigia'];
for (let i = 0; i < 2; i++) {
  noite('só a casa, dia 10', { vila: [] }, 10);
  noite('aldeia, dia 12', { vila: ['cacador', 'vigia'] }, 12);
  noite('vila, 2 famílias, dia 16', { vila: T4, fam: 2, lar: { ...P, torre: { n: 1, hp: 1 }, arsenal: { n: 1, hp: 1 } } }, 16);
  noite('cidade, dia 20', { vila: T4, fam: 5, lar: { ...P, torre: { n: 2, hp: 1 }, arsenal: { n: 1, hp: 1 }, praca: { n: 1, hp: 1 } } }, 20);
  noite('cidade, cerco, dia 21', { vila: T4, fam: 5, lar: { ...P, torre: { n: 2, hp: 1 }, arsenal: { n: 1, hp: 1 }, praca: { n: 1, hp: 1 } } }, 21);
}
// chegada das famílias
J.save = J.novoSave('y'); const s = J.save; s.dia = 5; s.lar = { casa: { n: 3, hp: 220 }, lenha: 0, ultimo: 0, ...JSON.parse(JSON.stringify(P)) }; s.vila = { ferreiro: { nome: 'a', dia: 1 }, vigia: { nome: 'b', dia: 1 }, cacador: { nome: 'c', dia: 1 } }; J.heroi = null; J.entrarArea('lar');
for (let d = 0; d < 14; d++) { s.hora = 5.9; J.passaHoras(0.5); s.dia++; console.log('dia', s.dia, 'famílias', J.familias().length, 'comida', J.comidaPovo(), 'estágio', J.estagio(), JSON.stringify(s.lar.trouxe)); s.lar.trouxe = null; if (d < 8) s.lar.celeiro.comida += 3; }
