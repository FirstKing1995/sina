/* SINA · a vila. Quatro pessoas presas nos caminhos: quem você solta vai morar na Clareira do Rio e trabalha por lá. */
(function () {
  'use strict';
  const J = window.Jogo, F = window.Fase, C = window.Dados, K = J.k, T = F.T;
  const { som, rnd, texto, avisa, poeira, mover } = K;
  const um = (l) => l[Math.floor(Math.random() * l.length)];

  C.VILA = {
    ferreiro: { area: 'goblins', fila: 0, nomes: ['Breno', 'Tarcan', 'Oduvo'], oficio: 'Ferreiro', preso: 'Bate na jaula com a testa, devagar.', chega: 'Ferro bom, o seu. Vou precisar de mais.', falas: ['O fogo daqui é fraco. Serve.', 'Goblin não sabe segurar martelo. Me obrigaram a ensinar.', 'Traz ferro que eu tiro o medo dele.'] },
    curandeira: { area: 'cobras', fila: 1, nomes: ['Anhira', 'Velha Tuma', 'Sabina'], oficio: 'Curandeira', preso: 'Canta baixo, para as cobras dormirem.', chega: 'Veneno e remédio são a mesma planta. Muda a mão.', falas: ['Mostra a língua. Hum. Come mais verde.', 'A moça já me contou do seu ronco.', 'Quem nasce do barro não devia pegar resfriado. Mas pega.'] },
    cacador: { area: 'lobos', fila: 2, nomes: ['Ruan', 'Caibar', 'Nuno'], oficio: 'Caçador', preso: 'Conta os lobos em voz alta, para não dormir.', chega: 'Você anda fazendo barulho demais. Eu ensino.', falas: ['Vi rastro de vermelho perto da encosta.', 'Lobo não é mau. É fome com dente.', 'Deixei a caça no varal. Os miúdos são meus.'] },
    vigia: { area: 'zumbis', fila: 3, nomes: ['Lena', 'Mirta', 'Yasmim'], oficio: 'Vigia', preso: 'Não tira os olhos da porta de ferro.', chega: 'Eu fico com a noite. Vocês dormem.', falas: ['Ontem contei sete. Hoje, nove.', 'Se eu assobiar duas vezes, acorda as crianças.', 'Daqui dá para ver a fumaça da clareira. Bonita.'] },
  };
  const VAGAS = [110, 118, 126, 134]; // onde cada um arma a tenda, em blocos do terreno
  const naVila = (id) => J.save.vila && J.save.vila[id];
  J.moradores = () => Object.keys(C.VILA).filter((k) => naVila(k));

  // quem está preso nesta área (fica no acampamento do fundo)
  J.poePresos = function () {
    const s = J.save; s.vila = s.vila || {}; J.preso = null; J.povo = [];
    for (const id in C.VILA) if (C.VILA[id].area === s.area && !naVila(id)) { const m = F.atual.marcos.filter((q) => q.acampa); const q = m[m.length - 1]; if (q) J.preso = { id, x: q.x + 84, y: F.chao(q.x + 84) }; }
    if (F.atual.lugar) for (const id of J.moradores()) { const x = vaga(id) + rnd(-20, 20); J.povo.push({ id, x, y: F.chao(x), vx: 0, vy: 0, w: 14, h: 52, dir: 1, noChao: true, t: rnd(0, 3), andou: 0, vai: null, cd: 1 }); }
  };
  const vaga = (id) => F.atual.terreno.x0 + VAGAS[C.VILA[id].fila] * T;
  J.vagaDe = vaga;
  J.soltaPreso = function () {
    const s = J.save, p = J.preso; if (!p) return; const V = C.VILA[p.id]; s.vila[p.id] = { nome: um(V.nomes), dia: s.dia, deu: 0 }; J.preso = null; som('tranca', 0.8, 0.8); som('raro', 0.7); J.faiscas(p.x, p.y - 30, 20, '#ffe2a0', 1.2); J.treina('coleta', 10); J.salvar(); avisa('morador', p.id);
  };
  J.pertoVila = function (h) {
    if (J.preso && Math.abs(J.preso.x - h.x) < 34 && Math.abs(J.preso.y - h.y) < 50 && !J.inimigos.some((e) => e.vivo && e.estado !== 'vaga' && Math.abs(e.x - h.x) < 240)) return { tipo: 'preso', o: J.preso };
    if (!J.raid) for (const q of J.povo || []) if (Math.abs(q.x - h.x) < 22 && Math.abs(h.vx) < 20 && Math.abs(q.y - h.y) < 40) return { tipo: 'morador', o: q };
    return null;
  };
  // o que cada um faz por você (uma vez por dia)
  J.servico = function (id, qual) {
    const s = J.save, h = J.heroi, v = naVila(id); if (!v) return false;
    if (id === 'ferreiro' && qual === 'afiar') { const n = s.afiado[s.arma] || 0; if (s.arma === 'punho' || n >= 9 || (s.inv.ferro || 0) < 2) return false; s.inv.ferro -= 2; s.afiado[s.arma] = n + 1; J.recalcular(); som('metal', 0.7, 0.9); J.salvar(); return true; }
    if (id === 'ferreiro' && qual === 'pontas') { if ((s.inv.ferro || 0) < 1 || (s.inv.galho || 0) < 2) return false; s.inv.ferro--; s.inv.galho -= 2; s.inv.flecha = (s.inv.flecha || 0) + 12; som('metal', 0.5, 1.3); J.salvar(); return true; }
    if (id === 'curandeira' && qual === 'cura') { h.hp = h.ficha.vida; h.veneno = 0; som('beber', 0.7); J.anel(h.x, h.y - 28, 34, '#9cff8a', 0.6, 2); return true; }
    if (id === 'curandeira' && qual === 'cha') { if (v.deu === s.dia || (s.inv.erva || 0) < 2) return false; s.inv.erva -= 2; v.deu = s.dia; s.cha = s.dia; J.recalcular(); h.hp = h.ficha.vida; som('beber', 0.7, 0.9); J.salvar(); return true; }
    if (id === 'cacador' && qual === 'ensina') { if (v.deu === s.dia) return false; v.deu = s.dia; J.treina(h.ficha.arma.per, 26); J.treina('pernas', 10); J.salvar(); return true; }
    if (id === 'vigia' && qual === 'remenda') { const L = s.lar; let fez = false; for (const k of ['cercaE', 'cercaD']) if (L[k] && L[k].n && L[k].hp < J.cheioObra(k) && (s.inv.galho || 0) >= 1) { s.inv.galho--; L[k].hp = Math.min(J.cheioObra(k), L[k].hp + 70); fez = true; } if (fez) { som('minerar', 0.6); J.montaBarreiras(); J.salvar(); } return fez; }
    return false;
  };
  // amanhecer na vila
  J.vilaAmanhece = function (traz) {
    if (naVila('cacador')) { traz('carne', 2); if (Math.random() < 0.6) traz('couro', 1); }
    if (naVila('curandeira')) traz('curativo', 1);
    if (naVila('ferreiro') && Math.random() < 0.5) traz('ferro', 1);
    const L = J.save.lar; if (naVila('vigia') && L) for (const k of ['cercaE', 'cercaD']) if (L[k] && L[k].n) L[k].hp = Math.min(J.cheioObra(k), L[k].hp + 40);
  };
  J.passoVila = function (dt) {
    for (const q of J.povo || []) {
      q.t += dt; q.cd -= dt; q.tGolpe = Math.max(0, (q.tGolpe || 0) - dt); const casa = vaga(q.id);
      // na noite de ataque, vigia e caçador lutam; os outros se escondem
      const luta = J.raid && (q.id === 'vigia' || q.id === 'cacador'); q.dentro = !!J.raid && !luta;
      if (luta) {
        const alvo = J.inimigos.filter((e) => e.vivo && e.raid && Math.abs(e.x - q.x) < 380).sort((a, b) => Math.abs(a.x - q.x) - Math.abs(b.x - q.x))[0];
        q.vai = null; if (alvo) { q.dir = Math.sign(alvo.x - q.x) || 1; if (Math.abs(alvo.x - q.x) < 70) q.vx = -q.dir * 90; else q.vx = 0; if (q.cd <= 0) { q.cd = q.id === 'vigia' ? 1.7 : 2.2; q.tGolpe = 0.4; const v = 380, t = Math.max(0.15, Math.abs(alvo.x - q.x) / v); J.balas.push({ dono: 'h', tipo: q.id === 'cacador' ? 'flecha' : 'pedra', flecha: q.id === 'cacador', x: q.x + q.dir * 12, y: q.y - 40, vx: q.dir * v, vy: (alvo.y - alvo.h / 2 - (q.y - 40)) / t - 120 * t, grav: 240, r: 4, dano: q.id === 'cacador' ? 22 : 13, vida: 1.6, cor: '#b0aaa0', deHum: true }); som('corte', 0.2, 1.5); } } else { const lug = F.atual.lugar; q.vai = lug.fogo + (q.id === 'vigia' ? 60 : -40); const d = q.vai - q.x; q.vx = Math.abs(d) > 10 ? Math.sign(d) * 120 : 0; if (q.vx) q.dir = Math.sign(q.vx); }
      } else {
        if (q.t > 4 + (q.x % 4)) { q.t = 0; q.vai = casa + rnd(-46, 46); if (Math.random() < 0.3) q.tTrab = 2.4; }
        q.tTrab = Math.max(0, (q.tTrab || 0) - dt); const d = q.vai == null ? 0 : q.vai - q.x; q.vx = Math.abs(d) > 8 && q.tTrab <= 0 ? Math.sign(d) * 46 : 0; if (q.vx) q.dir = Math.sign(q.vx);
      }
      q.vy = Math.min(K.QUEDA, q.vy + K.G * dt); const x0 = q.x; mover(q, dt); q.andou += Math.abs(q.x - x0);
    }
  };
})();
