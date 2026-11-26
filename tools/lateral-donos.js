// Duelos simulados com os quatro donos. node tools/lateral-donos.js
global.window = global; global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const L = __dirname + (require('fs').existsSync(__dirname + '/../js/motor.js') ? '/../js/' : '/../lateral/js/');
for (const f of ['dados', 'fase', 'motor', 'bando', 'clima', 'donos', 'lar', 'vila', 'cidade', 'mundo']) require(L + f + '.js');
const J = window.Jogo, F = window.Fase; J.semSalvar = true;
const fichas = { fraco: { armas: ['lanca'], arma: 'lanca', roupas: ['folhas'], roupa: 'folhas', per: { lanca: { n: 4, x: 0 }, corpo: { n: 4, x: 0 }, folego: { n: 4, x: 0 } } },
  bom: { armas: ['espada'], arma: 'espada', roupas: ['couro'], roupa: 'couro', per: { espada: { n: 8, x: 0 }, corpo: { n: 10, x: 0 }, folego: { n: 9, x: 0 } }, inv: { curativo: 4, erva: 4 } } };
const DONO = { covil_lobos: 'alfa', covil_cobras: 'rainha', covil_zumbis: 'carcereiro', covil_goblins: 'chefe' };
const usos = {};
function duelo(area, modo, ficha) {
  J.save = J.novoSave('bot'); Object.assign(J.save, JSON.parse(JSON.stringify(fichas[ficha]))); J.heroi = null; J.entrarArea(area); J.save.hora = 12;
  const h = J.heroi, A = F.atual.arena, e = J.inimigos.find((x) => x.T.chefe); J.inimigos = [e]; h.x = A.x0 + 110; h.y = F.chao(h.x); h.hp = h.ficha.vida; let t = 0, reac = 0, camb = 0, golpes = 0, ult = null;
  while (t < 240 && h.estado !== 'morto' && e.vivo) {
    t += 1 / 60; J.save.fome = 100; J.save.hora = 12; for (const k in J.ent) J.ent[k] = 0;
    const cap = J.inimigos.filter((x) => x.vivo && !x.T.chefe).sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x))[0];
    const al = cap && Math.abs(cap.x - h.x) < 90 ? cap : e, dx = al.x - h.x, d = Math.abs(dx), lado = Math.sign(dx) || 1;
    if (e.golpe !== ult) { ult = e.golpe; if (ult) { usos[e.tipo] = usos[e.tipo] || {}; usos[e.tipo][ult] = (usos[e.tipo][ult] || 0) + 1; golpes++; } }
    if (e.estado === 'cambaleia' && e.t < 1 / 50) camb++;
    let per = null;
    if (modo === 'joga') {
      if (Math.abs(e.x - h.x) < 170 && e.estado === 'acao' && (e.aviso > 0.88 || (e.qf === 5 && e.aviso === 0 && e.t < 1))) per = e;
      for (const m of J.magias) if ((m.inimiga && m.px != null && Math.abs(m.px - h.x) < 44) || ((m.tipo === 'maos' || m.tipo === 'queda') && m.t > -0.2 && Math.abs(m.x - h.x) < 24)) per = per || { x: m.px || m.x };
      for (const b of J.balas) if (b.dono === 'i' && Math.abs(b.x - h.x) < 46) per = per || { x: b.x };
      for (const q of J.inimigos) if (q.vivo && !q.T.chefe && Math.abs(q.x - h.x) < q.T.alcance + 20 && q.estado === 'prep' && q.t > (q.prepDur || 0.3) - 0.08) per = per || q;
      if (per && reac <= 0) { if (Math.random() < 0.72) { J.ent[per.x > h.x ? 'dir' : 'esq'] = 1; J.aperta('rola'); reac = 0.34; } else reac = 0.22; }
      if (h.hp < h.ficha.vida * 0.45 && d > 130 && h.estado === 'livre') J.aperta('come');
    }
    reac -= 1 / 60;
    if (!e.sob || al !== e) { if (d > h.ficha.arma.alcance + al.w / 2 - 4) J.ent[lado > 0 ? 'dir' : 'esq'] = 1; else { J.ent[lado > 0 ? 'dir' : 'esq'] = 1; if (modo === 'bate' || (!per && h.vigor > 26 && (e.estado !== 'acao' || e.aviso < 0.4))) J.aperta('golpe'); } }
    J.passo(1 / 60);
    if (![e.x, e.y, h.x, h.y].every(Number.isFinite)) throw new Error('posição inválida ' + e.tipo + ' ' + e.golpe);
  }
  return { ok: !e.vivo, t, resta: Math.max(0, e.hp) / e.hpMax, camb, golpes, fase: e.fase };
}
for (const a in DONO) for (const f of ['fraco', 'bom']) { let l = (DONO[a] + ' ' + f).padEnd(18); for (const m of ['bate', 'joga']) { let v = 0, t = 0, r = 0, c = 0; const N = 40; for (let i = 0; i < N; i++) { const q = duelo(a, m, f); v += q.ok; t += q.t; r += q.resta; c += q.camb; } l += (m + ' ' + Math.round(v / N * 100) + '% vence, sobra ' + Math.round(r / N * 100) + '% do dono, ' + Math.round(t / N) + 's, quebra ' + (c / N).toFixed(1)).padEnd(60); } console.log(l); }
console.log(JSON.stringify(usos));
