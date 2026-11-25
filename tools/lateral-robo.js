// Robô que atravessa cada área do SINA 2D sem inimigos e diz onde travou. node tools/lateral-robo.js
global.window = global; global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const L = __dirname + '/../lateral/js/';
require(L + 'dados.js'); require(L + 'fase.js'); require(L + 'motor.js'); require(L + 'bando.js');
const J = window.Jogo, F = window.Fase, T = 16; J.semSalvar = true;
for (const id of F.IDS) {
  J.save = J.novoSave('robo'); J.heroi = null; J.entrarArea(id); J.inimigos = [];
  const h = J.heroi; let t = 0, melhor = 0, tM = 0, espinhos = 0, voltas = 0, anda = 1, rec = 0, hpA = h.hp;
  const fim = F.W * T - 90; const log = [];
  while (h.x < fim && t < 900) {
    t += 1 / 60; J.save.fome = 100; 
    if (h.hp < h.ficha.vida - 1) espinhos++; h.hp = h.ficha.vida; h.vigor = Math.max(h.vigor, 20);
    const A = F.atual, tx = Math.floor(h.x / T), ty = Math.floor(h.y / T);
    const adiante = (d) => F.tile(tx + d, ty), vazio = (d) => { for (let k = 0; k < 4; k++) { const v = F.tile(tx + d, ty + k); if (v === 1 || v === 2) return false; if (v === 3) return true; } return true; };
    const parede = [1, 2].some((d) => adiante(d) === 1 && F.tile(tx + d, ty - 1) === 1) || F.tile(tx + 1, ty - 1) === 1;
    const galho = [[1, 6], [2, 6], [3, 6], [0, 6], [4, 6]].some(([d]) => { for (let k = 2; k <= 5; k++) if (F.tile(tx + d, ty - k) === 2) return true; return false; });
    if (rec > 0) { rec -= 1 / 60; J.ent.dir = 0; J.ent.esq = 1; } else { J.ent.esq = 0; J.ent.dir = anda; }
    const paredeAlta = (() => { for (let d = 1; d <= 12; d++) { if (A.topo[tx + d] < ty - 5) return true; } return false; })();
    if (h.noChao && rec <= 0 && (parede || vazio(1) || vazio(2) || (galho && paredeAlta))) { J.ent.pula = 1; J.aperta('pula'); }
    if (!h.noChao && h.vy > -60 && h.arDash && vazio(1)) { /* avança no ar sobre vão */ let larg = 0; for (let d = 1; d < 7; d++) if (vazio(d)) larg++; if (larg >= 2 && h.vy > 40) J.aperta('rola'); }
    if (h.vy > 0) J.ent.pula = h.noChao ? 1 : 0;
    J.passo(1 / 60); J.inimigos = [];
    if (h.x > melhor + 4) { melhor = h.x; tM = t; voltas = 0; }
    if (t - tM > 4) { rec = 0.5 + (voltas % 4) * 0.5; voltas++; tM = t - 1; if (voltas > 10) { log.push(Math.round(melhor / T)); h.x = melhor + 10 * T; h.y = F.chao(h.x); h.vy = 0; h.ultimoSeguro = { x: h.x, y: h.y }; melhor = h.x; voltas = 0; tM = t; } }
  }
  console.log(id.padEnd(15), 'tempo', Math.round(t) + 's', 'quedas em espinho', espinhos, 'travou em', JSON.stringify(log));
}
