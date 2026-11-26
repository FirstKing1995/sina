// Compara os três níveis (Barro, Pedra, Ferro) com o robô que joga direito. node tools/lateral-niveis.js
global.window = global; global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const L = __dirname + (require('fs').existsSync(__dirname + '/../js/motor.js') ? '/../js/' : '/../lateral/js/');
for (const f of ['dados', 'fase', 'motor', 'bando', 'clima', 'donos', 'lar', 'vila', 'cidade', 'mundo']) require(L + f + '.js');
const J = window.Jogo, F = window.Fase, C = window.Dados; J.semSalvar = true;
function luta(tipos, manha, o, nivel) {
  J.save = J.novoSave('bot'); Object.assign(J.save, o, { nivel }); J.heroi = null; J.entrarArea('lar'); J.inimigos = []; J.save.emb = {}; J.save.lar.ultimo = 1; J.hum = null;
  const h = J.heroi; h.x = 1300; h.y = F.chao(1300); h.hp = h.ficha.vida; let t = 0, reac = 0; const m = Math.min(1, manha + C.NIVEIS[nivel].manha);
  tipos.forEach((tp, i) => J.inimigos.push(J.nasce(tp, 1300 + (i % 2 ? -1 : 1) * (160 + i * 20), F.chao(1300), { estado: 'persegue', manha: m, chamado: true })));
  while (t < 90 && h.estado !== 'morto' && J.inimigos.some((e) => e.vivo)) {
    t += 1 / 60; J.save.fome = 100; J.save.hora = 12; for (const k in J.ent) J.ent[k] = 0;
    const vivos = J.inimigos.filter((e) => e.vivo && e.estado !== 'caido').sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x)), e = vivos[0];
    if (e) {
      const dx = e.x - h.x, d = Math.abs(dx), lado = Math.sign(dx) || 1; let perigo = false;
      for (const q of vivos) if (Math.abs(q.x - h.x) < q.T.alcance * 1.1 + 20 && ((q.estado === 'prep' && q.t > (q.prepDur || q.T.prep) - 0.08) || (q.estado === 'golpe' && q.t < 0.1))) perigo = q;
      for (const b of J.balas) if (b.dono === 'i' && Math.abs(b.x - h.x) < 46) perigo = perigo || { x: b.x };
      if (perigo && reac <= 0 && Math.random() < 0.6) { J.ent[Math.sign(perigo.x - h.x) > 0 ? 'dir' : 'esq'] = 1; J.aperta('rola'); reac = 0.35; } else if (perigo && reac <= 0) reac = 0.2;
      reac -= 1 / 60; const alc = h.ficha.arma.alcance + e.w / 2; J.ent[lado > 0 ? 'dir' : 'esq'] = 1; if (d <= alc && h.vigor > 24 && !perigo) J.aperta('golpe');
    }
    J.passo(1 / 60);
  }
  return { ok: h.estado !== 'morto' && !J.inimigos.some((e) => e.vivo), t, vida: h.hp / h.ficha.vida };
}
const ini = { armas: ['porrete'], arma: 'porrete' }, meio = { armas: ['machado'], arma: 'machado', roupas: ['couro'], roupa: 'couro', per: { machado: { n: 5, x: 0 }, corpo: { n: 4, x: 0 }, folego: { n: 4, x: 0 } } }, fim = { armas: ['espada'], arma: 'espada', roupas: ['osso'], roupa: 'osso', per: { espada: { n: 9, x: 0 }, corpo: { n: 8, x: 0 }, folego: { n: 8, x: 0 } } };
const CASOS = [['1 lobo, porrete', ['lobo'], 0.25, ini], ['2 lobos', ['lobo', 'lobo'], 0.35, ini], ['goblin', ['goblin'], 0.3, ini], ['3 lobos (meio)', ['lobo', 'lobo', 'lobo_negro'], 0.6, meio], ['2 goblins + arco (meio)', ['goblin', 'goblin', 'goblin_arco'], 0.6, meio], ['vermelho + 2 (fim)', ['lobo_rubro', 'lobo', 'lobo_negro'], 0.9, fim], ['inchado + lança (fim)', ['zumbi_inchado', 'zumbi_lanca'], 0.9, fim]];
console.log('caso'.padEnd(26), ...['normal', 'duro', 'pesadelo'].map((n) => C.NIVEIS[n].nome.padEnd(22)));
for (const [nome, tipos, manha, o] of CASOS) { const l = [nome.padEnd(26)]; for (const n of ['normal', 'duro', 'pesadelo']) { let v = 0, hp = 0; const N = 30; for (let i = 0; i < N; i++) { const r = luta(tipos, manha, JSON.parse(JSON.stringify(o)), n); if (r.ok) { v++; hp += r.vida; } } l.push((Math.round((v / N) * 100) + '% vence, ' + (v ? Math.round((hp / v) * 100) : 0) + '% vida').padEnd(22)); } console.log(l.join(' ')); }
