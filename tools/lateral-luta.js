// Lutas simuladas para medir a dificuldade. node tools/lateral-luta.js
// "bate" só ataca; "joga" rola quando vê o golpe vindo e bate quando há brecha.
global.window = global; global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const L = __dirname + (require('fs').existsSync(__dirname + '/../js/motor.js') ? '/../js/' : '/../lateral/js/');
for (const f of ['dados', 'fase', 'motor', 'bando', 'clima', 'donos', 'lar', 'vila']) require(L + f + '.js');
const J = window.Jogo, F = window.Fase; J.semSalvar = true;
function luta(tipos, modo, manha, o) {
  J.save = J.novoSave('bot'); Object.assign(J.save, o || {}); J.heroi = null; J.entrarArea('lar'); J.inimigos = []; J.save.emb = {}; J.save.lar.ultimo = 1; J.hum = null;
  const h = J.heroi; h.x = 1300; h.y = F.chao(1300); h.hp = h.ficha.vida; let t = 0;
  tipos.forEach((tp, i) => J.inimigos.push(J.nasce(tp, 1300 + (i % 2 ? -1 : 1) * (160 + i * 20), F.chao(1300), { estado: 'persegue', manha, chamado: true })));
  let reac = 0, acertos = 0;
  while (t < 90 && h.estado !== 'morto' && J.inimigos.some((e) => e.vivo)) {
    t += 1 / 60; J.save.fome = 100; J.save.hora = 12; for (const k in J.ent) J.ent[k] = 0;
    const vivos = J.inimigos.filter((e) => e.vivo && e.estado !== 'caido').sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x)), e = vivos[0];
    if (e) {
      const dx = e.x - h.x, d = Math.abs(dx), lado = Math.sign(dx) || 1;
      let perigo = false; if (modo === 'joga') for (const q of vivos) if (Math.abs(q.x - h.x) < q.T.alcance * 1.1 + 20 && ((q.estado === 'prep' && q.t > (q.prepDur || q.T.prep) - 0.08) || (q.estado === 'golpe' && q.t < 0.06))) perigo = q;
      if (modo === 'joga') for (const b of J.balas) if (b.dono === 'i' && Math.abs(b.x - h.x) < 46) perigo = perigo || { x: b.x };
      // reação humana: às vezes não vê
      if (perigo && reac <= 0 && Math.random() < 0.6) { J.ent[Math.sign(perigo.x - h.x) > 0 ? 'dir' : 'esq'] = 1; J.aperta('rola'); reac = 0.35; } else if (perigo && reac <= 0) reac = 0.2;
      reac -= 1 / 60;
      const alc = h.ficha.arma.alcance + e.w / 2;
      if (d > alc) J.ent[lado > 0 ? 'dir' : 'esq'] = 1;
      else { J.ent[lado > 0 ? 'dir' : 'esq'] = 1; if (modo === 'bate' || (h.vigor > 24 && !perigo)) J.aperta('golpe'); }
    }
    const antes = h.hp; J.passo(1 / 60); if (h.hp < antes - 1) acertos++;
  }
  return { ok: h.estado !== 'morto' && !J.inimigos.some((e) => e.vivo), t, vida: h.hp / h.ficha.vida };
}
function mede(nome, tipos, manha, o) { let l = nome.padEnd(34); for (const m of ['bate', 'joga']) { let v = 0, t = 0, hp = 0; const N = 60; for (let i = 0; i < N; i++) { const r = luta(tipos, m, manha, o); if (r.ok) { v++; hp += r.vida; } t += r.t; } l += (m + ' ' + Math.round(v / N * 100) + '% vence, vida ' + Math.round(hp / Math.max(1, v) * 100) + '%, ' + Math.round(t / N) + 's').padEnd(42); } console.log(l); }
const ini = { armas: ['porrete'], arma: 'porrete' }, meio = { armas: ['machado'], arma: 'machado', roupas: ['couro'], roupa: 'couro', per: { machado: { n: 5, x: 0 }, corpo: { n: 4, x: 0 }, folego: { n: 4, x: 0 } } }, fim = { armas: ['espada'], arma: 'espada', roupas: ['couro'], roupa: 'couro', per: { espada: { n: 9, x: 0 }, corpo: { n: 8, x: 0 }, folego: { n: 8, x: 0 } } };
mede('1 lobo, começo', ['lobo'], 0.2, { armas: ['punho'], arma: 'punho' }); mede('1 lobo, porrete', ['lobo'], 0.25, ini); mede('2 lobos', ['lobo', 'lobo'], 0.35, ini); mede('cobra', ['cobra'], 0.3, ini); mede('goblin', ['goblin'], 0.35, ini); mede('zumbi', ['zumbi'], 0.35, ini);
mede('3 lobos (meio)', ['lobo', 'lobo', 'lobo_negro'], 0.6, meio); mede('2 goblins + arco (meio)', ['goblin', 'goblin', 'goblin_arco'], 0.6, meio); mede('guerreiro (meio)', ['goblin_guerreiro'], 0.6, meio); mede('zumbi + mulher + machado (meio)', ['zumbi', 'zumbi_mulher', 'zumbi_machado'], 0.6, meio); mede('cobras (meio)', ['cobra', 'cobra_coral', 'cobra_cuspe'], 0.6, meio);
mede('vermelho + 2 (fim)', ['lobo_rubro', 'lobo', 'lobo_negro'], 0.9, fim); mede('bruto + guerreiro + xamã (fim)', ['goblin_porrete', 'goblin_guerreiro', 'goblin_xama'], 0.9, fim); mede('inchado + lança (fim)', ['zumbi_inchado', 'zumbi_lanca'], 0.9, fim); mede('2 pratas (fim)', ['cobra_prata', 'cobra_prata'], 0.9, fim); mede('1 vermelho (fim)', ['lobo_rubro'], 0.9, fim);
