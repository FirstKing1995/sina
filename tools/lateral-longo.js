// Teste longo: entradas aleatórias em todas as áreas, com bichos, clima, noite, armas e roupas sorteadas. node tools/lateral-longo.js [segundos por área]
global.window = global; global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const L = __dirname + (require('fs').existsSync(__dirname + '/../js/motor.js') ? '/../js/' : '/../lateral/js/');
for (const f of ['dados', 'fase', 'motor', 'bando', 'clima', 'donos', 'lar', 'vila']) require(L + f + '.js');
const J = window.Jogo, F = window.Fase, C = window.Dados; J.semSalvar = true;
const seg = +process.argv[2] || 60, R = (l) => l[Math.floor(Math.random() * l.length)]; let mortos = 0, abates = 0, emb = 0, raids = 0, baus = 0;
J.aviso = (t) => { if (t === 'emboscadaFim') emb++; if (t === 'raidFim') raids++; };
for (const id of F.IDS) for (let v = 0; v < 2; v++) {
  J.save = J.novoSave('longo'); const s = J.save; s.armas = C.ORDEM_ARMAS.slice(); s.arma = R(s.armas); s.roupas = Object.keys(C.ROUPAS); s.roupa = R(s.roupas); s.magias = Object.keys(C.MAGIAS); s.magia2 = R(s.magias.slice(1)); s.amuletos = Object.keys(C.AMULETOS); s.amu = [R(s.amuletos)]; s.inv = { flecha: 99, erva: 30, carne: 20, tocha: 5, vara: 1 }; s.hora = R([9, 20.8, 23]); s.dia = 12; s.chefes = {};
  s.lar = { casa: { n: 3, hp: 200 }, lenha: 5, ultimo: 0, cercaE: { n: 1, hp: 200 }, cercaD: { n: 1, hp: 200 }, estacasE: { n: 1, hp: 14 }, horta: { n: 1, hp: 1 } }; s.vila = Math.random() < 0.6 ? { ferreiro: { nome: 'F', dia: 1 }, vigia: { nome: 'V', dia: 9 }, cacador: { nome: 'C', dia: 11 } } : {}; s.prole = [{ nome: 'A', dia: 2, tarefa: 'vigiar' }]; s.hum = Math.random() < 0.6 ? { nome: 'H', hp: 70, hpMax: 70, fome: 60, laco: 60, onde: id === 'lar' ? 'lar' : 'segue', lanca: true, gravida: 0 } : null;
  J.heroi = null; J.entrarArea(id); J.mudaClima(R(['chuva', 'tempestade', 'neve', 'neblina', 'vento', 'cinza']), 60); J.clima.forca = 1; J.clima.area = id;
  const h = J.heroi; let dir = 1, vmax = 0;
  for (let i = 0; i < seg * 60; i++) {
    if (i % 600 === 0) { const x = 60 + Math.random() * (F.W * 16 - 200); h.x = h.ultimoSeguro.x = x; h.y = h.ultimoSeguro.y = F.chao(x); h.vy = 0; if (F.atual.arena && Math.random() < 0.8) { h.x = F.atual.arena.x0 + 200; h.y = F.chao(h.x); } }
    if (i % 40 === 0) dir = Math.random() < 0.2 ? -dir : dir; for (const k in J.ent) J.ent[k] = 0; J.ent[dir > 0 ? 'dir' : 'esq'] = Math.random() < 0.85 ? 1 : 0; if (Math.random() < 0.2) J.ent.baixo = 1; if (Math.random() < 0.15) J.ent.cima = 1; J.ent.pula = Math.random() < 0.7 ? 1 : 0; if ((i / 70 | 0) % 4 === 1) J.ent.forte = 1; if ((i / 50 | 0) % 3 === 0) J.ent.golpe = 1;
    if (Math.random() < 0.05) J.aperta(R(['pula', 'golpe', 'golpe', 'golpe', 'rola', 'magia1', 'magia2', 'come']));
    if (Math.random() < 0.004) J.proximaArma(); if (Math.random() < 0.002) J.tocha(); if (Math.random() < 0.01) { const p = J.perto(); if (p) { if (p.tipo === 'coleta') J.colher(p.o); else if (p.tipo === 'bau') { J.abreBau(p.o); baus++; } else if (['levanta', 'solta', 'varal', 'horta'].includes(p.tipo)) J.usaLar(p); else if (p.tipo === 'preso') J.soltaPreso(); else if (p.tipo === 'morador') for (const q of ['afiar', 'pontas', 'cura', 'cha', 'ensina', 'remenda']) J.servico(p.o.id, q); } }
    if (Math.random() < 0.0015) for (const fr of F.atual.fracas) if (Math.abs(fr.c0 * 16 - h.x) < 300) J.bateFraca(fr, 2);
    h.hp = Math.max(h.hp, h.ficha.vida * 0.5); h.vigor = Math.max(20, h.vigor); h.sina = 100; s.fome = 90;
    const n0 = J.inimigos.filter((e) => e.vivo).length; J.passo(1 / 60); abates += Math.max(0, n0 - J.inimigos.filter((e) => e.vivo).length);
    if (h.estado === 'morto') { mortos++; h.estado = 'livre'; h.hp = h.ficha.vida; J.emb = null; if (!J.save.hora) J.save = s; }
    for (const e of J.inimigos) if (![e.x, e.y, e.vx, e.vy, e.hp].every(Number.isFinite)) throw new Error('inimigo inválido ' + e.tipo + ' ' + e.estado);
    if (![h.x, h.y, h.vx, h.vy, h.hp, h.vigor].every(Number.isFinite)) throw new Error('herói inválido ' + h.estado); vmax = Math.max(vmax, J.inimigos.length + J.fx.length + J.balas.length + J.magias.length);
  }
  console.log(id.padEnd(15), v, s.arma.padEnd(13), s.roupa.padEnd(7), 'objetos no pico', vmax);
}
console.log({ mortos, abates, emb, raids, baus });
