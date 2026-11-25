/* SINA · a vida fora da luta: dia e noite, o sono junto do fogo, emboscadas, a humana perdida, a casa, os filhos e as noites de ataque. */
(function () {
  'use strict';
  const J = window.Jogo, F = window.Fase, C = window.Dados, T = F.T, K = J.k;
  const { mover, solido, caixa, cruza, fx, sangue, poeira, treme, som, rnd, clamp, nasce, texto, avisa } = K;
  const um = (l) => l[Math.floor(Math.random() * l.length)];

  // ---------- conteúdo ----------
  C.CASAS = [
    null,
    { nome: 'Barraca de folhas', hp: 70, custo: { galho: 8, folha: 10, fibra: 6 }, desc: 'Quatro galhos e um teto que pinga. Já é um lugar.' },
    { nome: 'Barraca de couro', hp: 130, custo: { galho: 12, couro: 8, osso: 6, fibra: 8 }, desc: 'O vento bate e não entra.' },
    { nome: 'Cabana trançada', hp: 220, custo: { galho: 26, fibra: 20, madeira: 8, pedra: 8 }, desc: 'Paredes. Dentro e fora agora são coisas diferentes.' },
    { nome: 'Cabana de toras', hp: 340, custo: { madeira: 24, fibra: 16, couro: 6, ferro: 4 }, desc: 'Bicho nenhum derruba de uma vez.' },
    { nome: 'Casa de pedra', hp: 520, custo: { pedra: 36, madeira: 26, ferro: 10, couro: 8 }, desc: 'Vai continuar aqui depois de você.' },
  ];
  C.OBRAS = {
    cercaE: { nome: 'Cerca do lado esquerdo', niveis: [{ hp: 200, custo: { madeira: 5, galho: 8 } }, { hp: 360, custo: { madeira: 8, pedra: 10, fibra: 6 } }, { hp: 600, custo: { madeira: 12, ferro: 5, pedra: 14 } }], desc: 'Segura quem vem pela trilha.' },
    cercaD: { nome: 'Cerca do lado direito', niveis: [{ hp: 200, custo: { madeira: 5, galho: 8 } }, { hp: 360, custo: { madeira: 8, pedra: 10, fibra: 6 } }, { hp: 600, custo: { madeira: 12, ferro: 5, pedra: 14 } }], desc: 'Segura quem vem pela mata.' },
    estacasE: { nome: 'Estacas à esquerda', niveis: [{ hp: 14, custo: { galho: 10, pedra: 4 } }], desc: 'Espeta quem passa. Gasta com o uso.' },
    estacasD: { nome: 'Estacas à direita', niveis: [{ hp: 14, custo: { galho: 10, pedra: 4 } }], desc: 'Espeta quem passa. Gasta com o uso.' },
    varal: { nome: 'Varal de carne', niveis: [{ hp: 1, custo: { galho: 8, fibra: 6 } }], desc: 'Seca até 4 carnes: uma a cada 5 horas. Carne seca sustenta mais.', casa: 1 },
    horta: { nome: 'Horta', niveis: [{ hp: 1, custo: { madeira: 4, folha: 8, fruta: 4 } }], desc: 'Dá frutas e erva a cada manhã.', casa: 2 },
    bau: { nome: 'Baú da família', niveis: [{ hp: 1, custo: { madeira: 8, ferro: 2 } }], desc: 'Se você cair, quem herdar fica com tudo o que estava na mochila.', casa: 2 },
    curtume: { nome: 'Curtume', niveis: [{ hp: 1, custo: { madeira: 6, galho: 8, pedra: 6 } }], desc: 'Permite reforçar a roupa que você veste (até três vezes).', casa: 2 },
    berco: { nome: 'Berço', niveis: [{ hp: 1, custo: { galho: 10, couro: 4, fibra: 8 } }], desc: 'Para quem ainda vai chegar.', casa: 3 },
  };
  C.SONHOS = [
    'O fogo estala. Por um instante, nada quer matar você.', 'Você sonha com mãos grandes, molhadas de barro.', 'No sonho, alguém chama um nome. Não é o seu.',
    'A chuva cai longe. Aqui só o calor.', 'Você sonha com um teto.', 'As brasas respiram no mesmo ritmo que você.', 'No sonho você tem pegadas ao lado das suas.',
    'Um vaga-lume pousa na sua mão e fica.', 'Você sonha com o som de um rio e acorda com sede de voltar.', 'O mundo inteiro cabe na luz desta fogueira.',
  ];
  C.SONHOS2 = ['A respiração dela acha a sua, e o medo fica do lado de fora.', 'Ela fala dormindo, numa língua que a floresta entende.', 'Você acorda no meio da noite. Ela põe mais um galho no fogo e sorri.'];
  C.FALAS = {
    medo: ['Não encoste em mim. Só... fique por perto.', 'Você não é bicho. Mas também não é gente. O que você é?', 'Eu corri três dias. Não sobrou ninguém.'],
    confia: ['Eu sei achar erva boa. Deixe isso comigo.', 'Aprendi a jogar pedra fugindo. Serve.', 'Se a gente tivesse um teto, eu dormia.'],
    junto: ['Seu peito brilha quando você dorme. Eu fico olhando.', 'Eu conto as noites agora. Antes, não contava.', 'Esta casa está torta. Eu gosto dela torta.'],
    amor: ['Se vier alguém depois de nós, vai precisar de um nome.', 'Quem moldou você não sabia que ia sobrar amor.', 'Volta vivo. É só isso que eu peço.'],
  };
  C.FALAS_F = [
    ['O fogo faz barulho de bicho.', 'Pai, o rio dorme?', 'Eu vi um vaga-lume do tamanho da minha mão.'],
    ['Eu já sei contar até os lobos.', 'Deixa eu segurar a lança? Só segurar.', 'Mãe disse que você nasceu do chão. Dói?'],
    ['Quando você sai, eu fico na porta até escurecer.', 'Se um dia você não voltar, eu sei o caminho.', 'Afiei uma pedra. Corta mesmo.'],
  ];
  C.TAREFAS = { juntar: ['Juntar lenha e mato', 'Traz duas coisas por dia.'], vigiar: ['Vigiar a trilha', 'Na noite de ataque, vem um inimigo a menos por onda e a cerca aguenta mais.'], treinar: ['Treinar com você', 'Cada dia de treino guarda mais do que você sabe, se ele herdar.'] };
  C.NOMES_F = ['Iara', 'Aira', 'Moema', 'Naiá', 'Jaci', 'Inaê', 'Potira', 'Ceci'];
  C.DICAS.grito = ['Um grito. Alguém está cercado logo à frente.', 'Um grito. Alguém está cercado logo à frente.'];
  C.DICAS.lar = ['Aqui dá para levantar uma casa. Abra a mochila (I) e veja a aba Lar.', 'Aqui dá para levantar uma casa. Abra a Mochila e veja a aba Lar.'];
  C.DICAS.noite = ['De noite eles enxergam mais longe e batem mais forte. Procure um fogo, ou faça uma tocha e acenda com V.', 'De noite eles enxergam mais longe e batem mais forte. Procure um fogo, ou faça uma tocha.'];
  C.MORTES.noite = 'A noite veio até a porta, e a porta não segurou.';

  // ---------- dia e noite ----------
  const HORA = 1 / 30; // horas por segundo: um dia inteiro em 12 minutos
  J.ehNoite = () => { const s = J.save; return !!s && (s.hora >= 20 || s.hora < 5.5); };
  // 1 = dia claro, 0 = noite fechada
  J.claridade = function () { const h = J.save ? J.save.hora : 12; if (h >= 7 && h < 17.5) return 1; if (h >= 17.5 && h < 20.5) return 1 - (h - 17.5) / 3; if (h >= 5 && h < 7) return (h - 5) / 2; return 0; };
  J.nomeHora = function () { const h = J.save.hora; return h < 5.5 ? 'madrugada' : h < 8 ? 'amanhecer' : h < 12 ? 'manhã' : h < 17.5 ? 'tarde' : h < 20 ? 'entardecer' : 'noite'; };
  J.passaHoras = function (n) { const passo = 0.25; for (let k = 0; k < n; k += passo) avanca(Math.min(passo, n - k)); };
  function avanca(dh) {
    const s = J.save, antes = s.hora; s.hora += dh;
    if (antes < 21 && s.hora >= 21) anoitece();
    if (s.hora >= 24) { s.hora -= 24; s.dia++; }
    if (antes < 6 && s.hora >= 6) amanhece();
    const L = s.lar;
    if (L) {
      if (L.lenha > 0) L.lenha = Math.max(0, L.lenha - dh);
      if (L.varal && L.varal.carnes > 0) { L.varal.t = (L.varal.t || 0) + dh; while (L.varal.t >= 5 && L.varal.carnes > 0) { L.varal.t -= 5; L.varal.carnes--; L.varal.secas = (L.varal.secas || 0) + 1; } }
    }
    const H = s.hum;
    if (H && H.onde !== 'levada') H.fome = Math.max(0, H.fome - dh * 1.7);
  }
  function amanhece() {
    const s = J.save, L = s.lar;
    if (L && L.horta) { L.horta.fruta = Math.min(8, (L.horta.fruta || 0) + 2); L.horta.erva = Math.min(4, (L.horta.erva || 0) + 1); }
    const traz = (m, n) => { L.trouxe = L.trouxe || {}; L.trouxe[m] = (L.trouxe[m] || 0) + n; };
    for (const p of s.prole || []) { const id = s.dia - p.dia; if (id >= 3 && L) { if ((p.tarefa || 'juntar') === 'juntar') for (let i = 0; i < 2; i++) traz(um(['galho', 'fruta', 'fibra', 'pedra', 'folha']), 1); if (p.tarefa === 'treinar') p.treino = (p.treino || 0) + 1; } if (id === 5) avisa('cresceu', p); }
    const H = s.hum;
    // ela também trabalha quando fica
    if (L && H && H.onde === 'lar' && H.laco >= 25 && H.fome > 15) { traz(um(['erva', 'fibra', 'fruta']), 2); if (H.laco >= 55) traz(Math.random() < 0.5 ? 'flecha' : 'curativo', Math.random() < 0.5 ? 2 : 1); }
    if (H && H.gravida && s.dia >= H.gravida && H.onde !== 'levada') { H.gravida = 0; avisa('nasceu'); }
  }
  // chegou a noite: se você está em casa, é ataque; se não está, a casa se defende sozinha
  function anoitece() {
    const s = J.save, L = s.lar;
    if (!L || !L.casa || L.casa.n < 1 || L.ultimo === s.dia) return;
    L.ultimo = s.dia;
    if (s.area === 'lar' && J.heroi && J.heroi.estado !== 'morto') { J.raidEm = 3; return; }
    const H = s.hum, emCasa = (H && H.onde === 'lar') || (s.prole && s.prole.length) || s.mae;
    if (!emCasa && Math.random() < 0.5) return;
    const def = L.casa.n * 22 + ['cercaE', 'cercaD'].reduce((t, k) => t + (L[k] && L[k].hp > 0 ? L[k].n * 16 : 0), 0) + ['estacasE', 'estacasD'].reduce((t, k) => t + (L[k] && L[k].hp > 0 ? 8 : 0), 0) + (H && H.onde === 'lar' ? 10 + (H.lanca ? 12 : 0) : 0) + (L.lenha > 0 ? 14 : 0);
    const atq = (34 + Math.min(90, s.dia * 4)) * rnd(0.65, 1.25);
    const falta = atq - def;
    for (const k of ['cercaE', 'cercaD']) if (L[k] && L[k].hp > 0) L[k].hp = Math.max(0, L[k].hp - atq * 0.35);
    for (const k of ['estacasE', 'estacasD']) if (L[k]) L[k].hp = Math.max(0, L[k].hp - 5);
    if (falta > 0) { L.casa.hp -= falta * 2.2; if (L.casa.hp <= 0) caiCasa(); }
    if (H && H.onde === 'lar' && falta > 38 && Math.random() < 0.6) leva('O lar foi atacado na sua ausência.');
    else avisa('longe', falta > 0 ? 'O lar foi atacado na sua ausência. A casa sofreu.' : 'O lar foi atacado na sua ausência. Aguentou.');
  }
  function caiCasa() { const L = J.save.lar; L.casa.n = Math.max(0, L.casa.n - 1); L.casa.hp = L.casa.n ? C.CASAS[L.casa.n].hp : 0; treme(10); som('quebra', 1, 0.5); avisa('casaCaiu', L.casa.n); }
  function leva(motivo) {
    const s = J.save, H = s.hum; if (!H || H.onde === 'levada') return;
    H.onde = 'levada'; H.cativeiro = um(['lobos', 'cobras', 'zumbis', 'goblins'].filter((a) => a !== s.area)); H.laco = Math.max(0, H.laco - 8); H.hp = Math.round(H.hpMax * 0.5); J.hum = null;
    avisa('levada', motivo || ''); J.salvar();
  }

  // ---------- dormir junto do fogo ----------
  J.comecaSono = function (f) {
    const h = J.heroi, lado = f.x >= h.x ? -1 : 1;
    h.estado = 'dorme'; h.t = 0; h.fogo = f; h.dir = -lado; h.alvoX = f.x + lado * 46; h.andaAte = true; h.vx = 0; h.acordando = false; h.fimSono = false;
    // não deita dentro da parede
    if (solido(h.alvoX, h.y - 20) || Math.abs(F.chao(h.alvoX) - h.y) > 20) h.alvoX = h.x;
    if (J.hum && J.hum.viva && !J.hum.caida) J.hum.dorme = f.x - lado * 46;
  };
  // anda, deita (1,7 s), dorme (5 s) e levanta (1,2 s)
  J.passoSono = function (dt, pula) {
    const h = J.heroi;
    if (h.andaAte) {
      const d = h.alvoX - h.x; h.t = 0;
      if (Math.abs(d) < 3) { h.andaAte = false; h.x = h.alvoX; h.dir = Math.sign(h.fogo.x - h.x) || h.dir; h.vx = 0; }
      else { const passo = Math.min(Math.abs(d), 62 * dt); h.dir = Math.sign(d); h.x += h.dir * passo; h.andou += passo; h.y = F.chao(h.x); }
      return false;
    }
    h.t += dt;
    if (pula && h.t > 1.7 && !h.acordando) { h.acordando = true; h.t = 0; }
    if (!h.acordando && h.t > 7) { h.acordando = true; h.t = 0; }
    if (h.acordando && h.t > 1.25) { h.estado = 'livre'; h.t = 0; h.acordando = false; if (J.hum) J.hum.dorme = null; return true; }
    return false;
  };
  J.quadroSono = function (h) { if (h.andaAte) return ['correr', Math.floor(h.andou / 13.5) % 8]; const k = h.acordando ? 1.25 - h.t : Math.min(1.7, h.t) * 0.735; return ['dormir', clamp(Math.floor(k / 1.25 * 5.99), 0, 5)]; };
  // o que o descanso faz com o mundo
  J.dormiu = function (f) {
    const s = J.save, n = J.ehNoite() ? (s.hora >= 20 ? 24 - s.hora + 6.5 : 6.5 - s.hora) : 2.5;
    const casa = s.area === 'lar' && s.lar && s.lar.casa && s.lar.casa.n;
    J.passaHoras(n); s.fome = Math.max(4, s.fome - n * (casa ? 1 : 1.6));
    J.descansar(f);
    const H = s.hum;
    if (H && (H.onde === 'segue' || (H.onde === 'lar' && casa))) {
      H.hp = H.hpMax; H.laco = Math.min(100, H.laco + (casa ? 5 : 3));
      if (casa >= 3 && s.lar.berco && H.laco >= 60 && !H.gravida && n > 5 && (s.prole || []).length < 3 && Math.random() < 0.55) { H.gravida = s.dia + 3; avisa('gravida'); }
    }
  };

  // ---------- emboscadas ----------
  J.emb = null;
  function passoEmboscada(dt) {
    const h = J.heroi, s = J.save, A = F.atual;
    if (!J.emb) {
      for (const e of A.emboscadas || []) {
        if (s.emb[e.id] || h.estado === 'morto') continue;
        if (e.resgate && (s.hum || s.fugiu === s.dia)) continue;
        if (h.x > e.x0 + 130 && h.x < e.x1 - 110 && Math.abs(h.y - e.piso) < 90) {
          J.emb = { e, n: -1, t: 0.8, total: 0 }; F.fechar(true, e.x0, e.x1); treme(6); som('quebra', 0.8, 0.6); som('rugido', 0.6, 0.8);
          for (const o of J.inimigos) if (o.vivo && o.x > e.x0 && o.x < e.x1 && !o.T.chefe) { o.estado = 'persegue'; o.chamado = true; }
          avisa('emboscada', e);
          if (e.resgate) poePerdida(e);
          break;
        }
      }
      return;
    }
    const b = J.emb, e = b.e;
    const vivos = J.inimigos.filter((o) => o.vivo && (o.daEmb || (o.x > e.x0 && o.x < e.x1 && o.estado !== 'vaga'))).length;
    if (vivos) { b.t = 0.9; return; }
    b.t -= dt; if (b.t > 0) return;
    b.n++;
    if (b.n >= e.ondas.length) {
      F.fechar(false); J.emb = null; s.emb[e.id] = 1; som('raro', 0.6); J.treina('folego', 14); J.treina('corpo', 8); avisa('emboscadaFim', e);
      for (const m of ['couro', 'ferro', 'erva']) if (Math.random() < 0.6) J.restos.push({ m, x: h.x + rnd(-20, 20), y: h.y - 30, vx: rnd(-60, 60), vy: -200, w: 6, h: 8, t: 0 });
      if (e.resgate) salvaPerdida(e);
      J.salvar(); return;
    }
    avisa('onda', [b.n + 1, e.ondas.length]);
    e.ondas[b.n].forEach((t, i) => {
      const dir = i % 2 ? 1 : -1; let x = clamp(h.x + dir * (150 + i * 26), e.x0 + 46, e.x1 - 46); if (Math.abs(x - h.x) < 70) x = clamp(h.x - dir * 170, e.x0 + 46, e.x1 - 46);
      const y = F.chao(x), morto = C.TIPOS[t].esp === 'zumbi';
      const o = nasce(t, x, y - (morto ? 0 : 90), { estado: 'persegue', chamado: true, daEmb: true, pisca: 0.7, t: -0.5, manha: Math.max(0.35, J.manhaDe(t, x)), dir: -dir });
      J.inimigos.push(o); J.faiscas(x, y - 8, 14, '#8a7458', 1, morto ? 'pedra' : 'folha'); poeira(x, y, 8, 0);
    });
    b.t = 0.9;
  }

  // ---------- a humana ----------
  J.hum = null;
  const faixa = (l) => (l < 25 ? 'medo' : l < 55 ? 'confia' : l < 80 ? 'junto' : 'amor');
  J.lacoNome = (l) => ({ medo: 'Medo', confia: 'Confiança', junto: 'Companhia', amor: 'Amor' }[faixa(l)]);
  function cria(x, y, d) { return Object.assign({ eHum: true, x, y, vx: 0, vy: 0, w: 14, h: 52, dir: 1, noChao: true, viva: true, caida: false, estado: 'parada', t: 0, inv: 1, cdPedra: 1, cdCura: 8, cdColhe: 4, andou: 0, hp: 60 }, d || {}); }
  function poePerdida(e) { J.hum = cria(e.resgate, F.chao(e.resgate), { perdida: true, hp: 70, hpMax: 70 }); avisa('grito'); }
  function salvaPerdida() {
    const s = J.save, H = J.hum;
    if (!H || H.caida) { if (H) { H.caida = false; H.hp = 30; } }
    s.hum = { nome: um(C.NOMES_F.filter((n) => !(s.mae && s.mae.nome === n))), hp: Math.max(20, J.hum ? J.hum.hp : 40), hpMax: 70, fome: 60, laco: 10, onde: 'segue', cativeiro: null, lanca: false, gravida: 0 };
    if (J.hum) { J.hum.perdida = false; J.hum.estado = 'segue'; J.hum.hp = s.hum.hp; J.hum.hpMax = s.hum.hpMax; }
    avisa('encontrou', s.hum);
  }
  // quem está com você ao entrar numa área
  J.trazGente = function () {
    const s = J.save, h = J.heroi, H = s.hum; J.hum = null; J.gente = []; J.barreiras = null; J.casaAlvo = null; J.raid = null;
    if (H && (H.onde === 'segue' || (H.onde === 'lar' && s.area === 'lar'))) { const x = H.onde === 'lar' ? F.atual.lugar.casa + 20 : h.x - h.dir * 26; J.hum = cria(x, F.chao(x), { hp: H.hp, hpMax: H.hpMax, estado: H.onde === 'segue' ? 'segue' : 'lar' }); }
    if (H && H.onde === 'levada' && H.cativeiro === s.area) J.cativeiro = { x: cativeiroX(), y: 0 }; else J.cativeiro = null;
    if (J.cativeiro) { J.cativeiro.y = F.chao(J.cativeiro.x); J.poeGuardas(); }
    if (s.area === 'lar') {
      if (!s.lar) s.lar = { casa: { n: 0, hp: 0 }, lenha: 0, ultimo: 0 };
      if (s.mae) J.gente.push(cria(F.atual.lugar.casa + 60, 0, { tipo: 'mulher', mae: true }));
      for (const p of s.prole || []) J.gente.push(cria(F.atual.lugar.berco + rnd(-30, 60), 0, { tipo: 'filho', p }));
      for (const g of J.gente) g.y = F.chao(g.x);
      montaBarreiras(); dicaLar();
    }
  };
  J.poeGuardas = function () { const s = J.save, c = J.cativeiro; if (!c) return; const esp = { lobos: 'lobo', cobras: 'cobra', zumbis: 'zumbi', goblins: 'goblin' }[s.area]; for (let i = 0; i < 4; i++) { const x = c.x + (i % 2 ? 1 : -1) * (40 + i * 16); J.inimigos.push(nasce(F.varia(esp, 0.9, Math.random), x, F.chao(x), { guarda: true, chamado: true })); } };
  const cativeiroX = () => { const A = F.atual, p = A.portas.find((q) => q.id === 'covil'); return (p ? p.x : F.W * T * 0.9) - 150; };
  function dicaLar() { avisa('noLar'); }
  function montaBarreiras() {
    const L = J.save.lar, lug = F.atual.lugar; if (!L || !lug) return;
    J.barreiras = []; for (const k of ['cercaE', 'cercaD']) if (L[k] && L[k].n) J.barreiras.push({ k, x: lug[k], y: F.chao(lug[k]), vx: 0, w: 14, h: 70, o: L[k], obra: true });
    J.casaAlvo = J.raid && L.casa.n ? () => ({ x0: lug.casa - 40, x1: lug.casa + 40, y0: F.chao(lug.casa) - 70, y1: F.chao(lug.casa) }) : null;
  }
  J.montaBarreiras = montaBarreiras;
  J.feriHum = function (dano, e) {
    const H = J.hum; if (!H || !H.viva || H.caida || H.inv > 0) return false;
    const d = Math.max(1, Math.round(dano * 0.7)); H.hp -= d; H.inv = 0.9; H.estado2 = 'dor'; H.tDor = 0.3; texto(H.x, H.y - 60, d, '#ff9a8a', true); som('dor', 0.5, 1.5);
    sangue(H.x, H.y - 30, Math.sign(H.x - (e ? e.x : H.x)) || 1, 8); H.vx = Math.sign(H.x - (e ? e.x : H.x)) * 150; H.vy = -120;
    if (H.hp <= 0) { H.hp = 0; H.caida = true; H.tCaida = 25; avisa('humCaiu'); if (J.save.hum) J.save.hum.laco = Math.max(0, J.save.hum.laco - 6); }
    if (J.save.hum) J.save.hum.hp = H.hp;
    return true;
  };
  J.feriObra = function (o, dano) {
    if (!o || o.hp <= 0) return false;
    o.hp -= Math.max(1, dano * ((J.save.prole || []).some((p) => p.tarefa === 'vigiar' && J.save.dia - p.dia >= 3) ? 0.6 : 0.8)); som('minerar', 0.4, 0.7);
    if (o.hp <= 0) { o.hp = 0; som('quebra', 0.9, 0.7); treme(5); if (o === J.save.lar.casa) { caiCasa(); if (J.save.lar.casa.n === 0) { J.casaAlvo = null; if (J.hum && J.hum.dentro) J.hum.dentro = false; } } else avisa('cercaCaiu'); }
    return true;
  };
  function passoHum(dt) {
    const H = J.hum, h = J.heroi, s = J.save, D = s.hum; if (!H) return;
    H.t += dt; H.inv = Math.max(0, H.inv - dt); H.tDor = Math.max(0, (H.tDor || 0) - dt); H.cdPedra -= dt; H.cdCura -= dt; H.cdColhe -= dt; H.cdFala = (H.cdFala || 0) - dt; H.tGolpe = Math.max(0, (H.tGolpe || 0) - dt);
    const perigos = J.inimigos.filter((e) => e.vivo && e.estado !== 'caido' && e.estado !== 'vaga' && Math.abs(e.x - H.x) < 230 && Math.abs(e.y - H.y) < 120).sort((a, b) => Math.abs(a.x - H.x) - Math.abs(b.x - H.x));
    if (H.caida) {
      H.vx *= Math.pow(0.01, dt); H.tCaida -= dt * (J.emb && J.emb.e.resgate ? 0.5 : 1);
      if (H.tCaida <= 0) { if (D) leva('Ninguém a levantou a tempo.'); else { J.hum = null; F.fechar(false); J.emb = null; s.fugiu = s.dia; avisa('fugiu'); } return; }
    } else if (H.dorme != null) {
      const d = H.dorme - H.x; H.vx = Math.abs(d) > 4 ? Math.sign(d) * 70 : 0; H.dir = Math.abs(d) > 4 ? Math.sign(d) : Math.sign(h.x - H.x) || 1;
    } else {
      const l = D ? D.laco : 0, fraca = D && D.fome < 12;
      // mantém perto; no perigo, com pouco laço, se esconde atrás de você
      let alvo = null, corre = 1;
      if (H.perdida) alvo = perigos.length && Math.abs(perigos[0].x - H.x) < 90 ? H.x + Math.sign(H.x - perigos[0].x) * 60 : null;
      else if (H.estado === 'lar' && !J.raid) { if (H.t > 4) { H.t = 0; H.vai = F.atual.lugar ? F.atual.lugar.casa + rnd(-70, 110) : h.x; } if (H.vai != null && Math.abs(H.vai - H.x) > 8) alvo = H.vai; corre = 0.4; }
      else if (H.estado === 'lar') { const lug = F.atual.lugar; if (s.lar.casa.n && !(l >= 40)) { alvo = lug.casa; H.dentro = Math.abs(lug.casa - H.x) < 14 && s.lar.casa.hp > 0; } else if (Math.abs(lug.fogo - H.x) > 90) alvo = lug.fogo; }
      else {
        const p = perigos[0];
        if (p && Math.abs(p.x - H.x) < 110 && (l < 40 || H.hp < H.hpMax * 0.35)) alvo = h.x - Math.sign(p.x - h.x || 1) * 34;
        else if (p && Math.abs(p.x - H.x) < 54) alvo = H.x - Math.sign(p.x - H.x) * 80;
        else if (Math.abs(h.x - H.x) > 62) alvo = h.x - Math.sign(h.x - H.x) * 40;
      }
      if (!J.raid && H.dentro) H.dentro = false;
      const dx = alvo == null ? 0 : alvo - H.x, vel = K.CORRE * (fraca ? 0.75 : 1.08) * corre;
      if (Math.abs(dx) > 8 && H.tGolpe <= 0 && H.tDor <= 0) { H.dir = Math.sign(dx); H.vx = H.dir * Math.min(vel, Math.abs(dx) * 4 + 40); }
      else if (H.tDor <= 0) H.vx *= Math.pow(0.0005, dt);
      // pula o que o caminho pedir
      if (H.noChao && Math.abs(H.vx) > 30) {
        const px = H.x + H.dir * 16, muro = solido(px, H.y - 20); let buraco = true;
        for (let k = 0; k < 60; k += 10) { const tp = F.tile(Math.floor(px / T), Math.floor((H.y + k) / T)); if (tp === 1 || tp === 2) { buraco = false; break; } if (tp === 3) break; }
        if (muro || buraco) { H.vy = -570; H.vx = H.dir * K.CORRE * 1.1; H.noChao = false; }
      }
      if (!H.noChao && Math.abs(dx) > 8) H.vx = H.dir * K.CORRE * 1.1;
      if (!H.perdida && H.estado === 'segue' && (Math.abs(h.x - H.x) > 460 || Math.abs(h.y - H.y) > 260 || H.y > F.H * T) && h.noChao && !J.emb) { H.x = h.ultimoSeguro.x - h.dir * 20; H.y = h.ultimoSeguro.y; H.vx = H.vy = 0; poeira(H.x, H.y, 6, 0); }
      // ajuda: pedra, lança, erva e coleta
      const p = perigos[0];
      if (p && !fraca && !H.dentro && l >= 12 && H.tGolpe <= 0) {
        const d = Math.abs(p.x - H.x);
        if (D && D.lanca && d < 64 && H.cdPedra <= 0) { H.cdPedra = 1.5; H.dir = Math.sign(p.x - H.x); H.tGolpe = 0.4; H.vx = H.dir * 60; K.feriInimigo(p, 14 + l * 0.14, H.dir, { magia: true, deHum: true, quebra: 1, y: H.y - 34 }); som('golpe', 0.4, 1.3); }
        else if (d > 40 && d < 220 && H.cdPedra <= 0) { H.cdPedra = 2.6 - l * 0.011; H.dir = Math.sign(p.x - H.x); H.tGolpe = 0.4; const v = 330, t = d / v; J.balas.push({ dono: 'h', tipo: 'pedra', x: H.x + H.dir * 12, y: H.y - 40, vx: H.dir * v, vy: (p.y - p.h / 2 - (H.y - 40)) / t - 120 * t, grav: 240, r: 4, dano: 8 + l * 0.12, vida: 1.4, cor: '#b0aaa0', deHum: true }); som('golpe', 0.3, 1.7); }
      }
      if (D && !p) {
        if (D.fome < 35 && H.cdFala <= 0) { H.cdFala = 12; const m = ['fruta', 'peixe', 'seca', 'carne'].find((k) => s.inv[k] > 0); if (m) { s.inv[m]--; D.fome = Math.min(100, D.fome + C.COMER[m].fome * 1.3); D.laco = Math.min(100, D.laco + 0.6); texto(H.x, H.y - 60, 'comeu ' + C.MAT[m].toLowerCase(), '#d8e0b0'); } else texto(H.x, H.y - 60, 'com fome', '#e0b070'); }
        if (H.cdColhe <= 0 && H.estado === 'segue' && l >= 20) { H.cdColhe = 9 - l * 0.05; const c = F.atual.coleta.find((q) => !(J.colhidos[q.id] > 0) && q.m !== 'madeira' && Math.abs(q.x - H.x) < 110 && Math.abs(q.y - H.y) < 50); if (c) { J.colhidos[c.id] = 150; H.tColhe = 0.6; H.dir = Math.sign(c.x - H.x) || H.dir; J.ganha(c.m, 1, H.x, H.y - 46); } }
        if (D.fome > 30 && H.hp < H.hpMax) H.hp = Math.min(H.hpMax, H.hp + dt * 0.9);
      }
      if (D && D.fome <= 0) { H.hp = Math.max(1, H.hp - dt * 0.5); D.laco = Math.max(0, D.laco - dt * 0.02); }
      if (D && l >= 30 && h.hp < h.ficha.vida * 0.4 && h.estado !== 'morto' && H.cdCura <= 0 && Math.abs(h.x - H.x) < 130 && (s.inv.erva > 0 || s.inv.curativo > 0)) { H.cdCura = 26; const m = s.inv.erva > 0 ? 'erva' : 'curativo'; s.inv[m]--; const c = Math.round(22 + l * 0.2); h.hp = Math.min(h.ficha.vida, h.hp + c); h.veneno = 0; texto(h.x, h.y - 74, '+' + c, '#9cff8a', true); J.anel(h.x, h.y - 30, 26, '#9cff8a', 0.5, 2); som('beber', 0.5, 1.4); }
      if (D && !H.perdida && H.estado === 'segue') { H.tLaco = (H.tLaco || 0) + dt; if (H.tLaco > 24) { H.tLaco = 0; D.laco = Math.min(100, D.laco + 1); } }
    }
    H.tColhe = Math.max(0, (H.tColhe || 0) - dt);
    H.vy = Math.min(K.QUEDA, H.vy + K.G * dt); const x0 = H.x; mover(H, dt); H.andou += Math.abs(H.x - x0);
    if (J.emb) H.x = clamp(H.x, J.emb.e.x0 + 40, J.emb.e.x1 - 40);
    if (F.tile(Math.floor(H.x / T), Math.floor((H.y - 2) / T)) === 3) { H.x = h.ultimoSeguro.x; H.y = h.ultimoSeguro.y; H.vy = 0; }
    if (D) D.hp = H.hp;
  }
  function passoGente(dt) {
    const lug = F.atual.lugar; if (!lug) return;
    for (const g of J.gente || []) {
      g.t += dt; const id = g.p ? J.save.dia - g.p.dia : 99; g.dentro = !!J.raid && !g.mae; g.bebe = g.p && id < 2;
      if (g.bebe) { g.x = lug.berco; g.y = F.chao(g.x); continue; }
      if (g.t > 3 + (g.x % 3)) { g.t = 0; g.vai = lug.casa + rnd(-120, 170); }
      const dx = g.vai == null ? 0 : g.vai - g.x, v = J.raid ? 0 : 60;
      g.vx = Math.abs(dx) > 8 ? Math.sign(dx) * v : 0; if (g.vx) g.dir = Math.sign(g.vx);
      g.vy = Math.min(K.QUEDA, g.vy + K.G * dt); const x0 = g.x; mover(g, dt); g.andou += Math.abs(g.x - x0);
    }
  }

  // ---------- a noite de ataque ----------
  J.raid = null; J.raidEm = 0;
  function comecaRaid() {
    const s = J.save, L = s.lar, n = clamp(2 + Math.floor(s.dia / 5), 2, 5) + (L.lenha > 0 ? 0 : 1);
    J.raid = { n: -1, total: n, t: 3, dia: s.dia }; montaBarreiras(); avisa('raid', n); som('uivo', 0.9);
  }
  function ondaRaid() {
    const s = J.save, r = J.raid, k = clamp(0.2 + s.dia * 0.04 + Object.keys(s.chefes).length * 0.1, 0.2, 1);
    const esp = um(['lobo', 'lobo', 'goblin', 'goblin', 'zumbi', 'cobra']), q = 3 + Math.floor(r.n * 0.8) + Math.floor(s.dia / 8);
    const vigia = (s.prole || []).some((p) => p.tarefa === 'vigiar' && s.dia - p.dia >= 3) ? 1 : 0;
    for (let i = 0; i < Math.max(2, Math.min(8, q) - vigia); i++) { const lado = i % 2 ? 1 : -1, x = lado > 0 ? (F.W - 7) * T - i * 10 : 8 * T + i * 10; J.inimigos.push(nasce(F.varia(esp, k, Math.random), x, F.chao(x), { estado: 'persegue', raid: true, chamado: true, t: -i * 0.25, dir: -lado })); }
    avisa('ondaRaid', [r.n + 1, r.total, esp]);
  }
  function passoRaid(dt) {
    const s = J.save, L = s.lar;
    if (J.raidEm > 0 && !J.raid) { J.raidEm -= dt; if (J.raidEm <= 0 && s.area === 'lar') comecaRaid(); }
    if (!J.raid) return;
    const r = J.raid, lug = F.atual.lugar;
    // estacas
    for (const k of ['estacasE', 'estacasD']) if (L[k] && L[k].hp > 0) for (const e of J.inimigos) if (e.vivo && e.raid && Math.abs(e.x - lug[k]) < 26 && e.noChao && (e.espeta || 0) < J.relogio) { e.espeta = J.relogio + 1.2; L[k].hp--; K.feriInimigo(e, 14, e.vx > 0 ? -1 : 1, { magia: true, quebra: 2 }); e.vx = 0; }
    const vivos = J.inimigos.filter((e) => e.vivo && e.raid).length;
    if (vivos > (r.n < 0 ? 0 : 1)) { r.t = 2.4; return; }
    r.t -= dt; if (r.t > 0) return;
    if (r.n + 1 >= r.total) {
      if (vivos) return;
      J.raid = null; montaBarreiras();
      if (s.hum && s.hum.onde !== 'levada') s.hum.laco = Math.min(100, s.hum.laco + 4);
      avisa('raidFim'); for (const m of ['couro', 'ferro', 'carne', 'osso']) J.ganha(m, 1 + Math.floor(s.dia / 6)); J.salvar(); return;
    }
    r.n++; r.t = 2.4; ondaRaid();
  }

  // ---------- construir ----------
  J.custoObra = function (id) {
    const L = J.save.lar; if (!L) return null;
    if (id === 'casa') { const n = L.casa.n + 1; return C.CASAS[n] ? { nome: C.CASAS[n].nome, custo: C.CASAS[n].custo, desc: C.CASAS[n].desc, hp: C.CASAS[n].hp, n } : null; }
    const O = C.OBRAS[id], n = L[id] && L[id].n ? L[id].n : 0, v = O.niveis[n]; return v ? { nome: O.nome, custo: v.custo, desc: O.desc, hp: v.hp, n: n + 1, trava: O.casa && L.casa.n < O.casa ? C.CASAS[O.casa].nome : null } : null;
  };
  const tem = (c) => { for (const m in c) if ((J.save.inv[m] || 0) < c[m]) return false; return true; };
  J.podeObra = (id) => { const c = J.custoObra(id); return !!c && !c.trava && tem(c.custo) && J.save.area === 'lar' && !J.raid; };
  J.constroi = function (id) {
    if (!J.podeObra(id)) return false;
    const s = J.save, L = s.lar, c = J.custoObra(id); let peso = 0; for (const m in c.custo) { s.inv[m] -= c.custo[m]; peso += c.custo[m]; }
    if (id === 'casa') L.casa = { n: c.n, hp: c.hp }; else L[id] = Object.assign(L[id] || {}, { n: c.n, hp: c.hp });
    J.treina('oficio', 6 + peso); montaBarreiras(); som('minerar', 0.9); som('quebra', 0.4, 1.3); const x = F.atual.lugar[id]; J.faiscas(x, F.chao(x) - 20, 26, '#c8a878', 1.2, 'pedra'); poeira(x, F.chao(x), 16, 0); treme(3);
    if (s.hum && s.hum.onde !== 'levada') s.hum.laco = Math.min(100, s.hum.laco + (id === 'casa' ? 8 : 2));
    J.salvar(); avisa('construiu', c); return true;
  };
  // remendo: 1 galho e 1 pedra (ou tora) por 25 de vida
  J.conserta = function (id) { const s = J.save, L = s.lar, o = L[id], cheio = id === 'casa' ? C.CASAS[L.casa.n].hp : C.OBRAS[id].niveis[o.n - 1].hp; if (o.hp >= cheio || (s.inv.galho || 0) < 2) return false; s.inv.galho -= 2; o.hp = Math.min(cheio, o.hp + (id.startsWith('estacas') ? 5 : 30)); som('minerar', 0.6); J.treina('oficio', 2); montaBarreiras(); J.salvar(); return true; };
  J.cheioObra = (id) => { const L = J.save.lar; return id === 'casa' ? (L.casa.n ? C.CASAS[L.casa.n].hp : 0) : L[id] && L[id].n ? C.OBRAS[id].niveis[L[id].n - 1].hp : 0; };
  J.botaLenha = function () { const s = J.save; if ((s.inv.madeira || 0) > 0) { s.inv.madeira--; s.lar.lenha = Math.min(48, s.lar.lenha + 6); } else if ((s.inv.galho || 0) > 1) { s.inv.galho -= 2; s.lar.lenha = Math.min(48, s.lar.lenha + 2); } else return false; som('fogo', 0.6); J.salvar(); return true; };

  // ---------- o que dá para usar por perto ----------
  J.pertoLar = function (h) {
    const H = J.hum, s = J.save, A = F.atual;
    if (H && H.caida && Math.abs(H.x - h.x) < 34 && Math.abs(H.y - h.y) < 50) return { tipo: 'levanta', o: H };
    if (J.cativeiro && Math.abs(J.cativeiro.x - h.x) < 34 && !J.inimigos.some((e) => e.vivo && e.guarda && e.estado !== 'vaga' && Math.abs(e.x - h.x) < 260)) return { tipo: 'solta', o: J.cativeiro };
    if (s.area === 'lar' && s.lar && !J.raid) {
      const L = s.lar, lug = A.lugar, p = (k, d) => Math.abs(lug[k] - h.x) < (d || 26);
      if (L.varal && L.varal.n && p('varal') && ((L.varal.secas || 0) > 0 || ((s.inv.carne || 0) > 0 && (L.varal.carnes || 0) < 4))) return { tipo: 'varal' };
      if (L.horta && L.horta.n && p('horta') && ((L.horta.fruta || 0) > 0 || (L.horta.erva || 0) > 0)) return { tipo: 'horta' };
      if (p('casa', 34)) return { tipo: 'casa' };
      if (Math.abs(lug.lago - h.x) < 70) return { tipo: 'pesca' };
      const c = (J.gente || []).find((g) => g.p && !g.bebe && !g.dentro && Math.abs(g.x - h.x) < 22 && Math.abs(h.vx) < 20); if (c) return { tipo: 'crianca', o: c };
    }
    if (H && s.hum && !H.caida && !H.perdida && !J.emb && !J.raid && Math.abs(H.x - h.x) < 24 && Math.abs(H.y - h.y) < 40 && Math.abs(h.vx) < 20 && !J.inimigos.some((e) => e.vivo && e.estado !== 'vaga' && Math.abs(e.x - h.x) < 220)) return { tipo: 'fala', o: H };
    return null;
  };
  J.usaLar = function (p) {
    const s = J.save, L = s.lar, H = J.hum;
    if (p.tipo === 'levanta') { H.caida = false; H.hp = Math.round((H.hpMax || 70) * 0.4); H.inv = 2; if (s.hum) { s.hum.hp = H.hp; s.hum.laco = Math.min(100, s.hum.laco + 3); } som('beber', 0.5, 1.3); J.anel(H.x, H.y - 26, 30, '#9cff8a', 0.5, 2); }
    else if (p.tipo === 'solta') { s.hum.onde = 'segue'; s.hum.laco = Math.min(100, s.hum.laco + 6); J.cativeiro = null; J.hum = cria(p.o.x, F.chao(p.o.x), { hp: s.hum.hp, hpMax: s.hum.hpMax, estado: 'segue' }); som('raro', 0.7); avisa('soltou', s.hum); J.salvar(); }
    else if (p.tipo === 'varal') { const v = L.varal; if ((v.secas || 0) > 0) { J.ganha('seca', v.secas); v.secas = 0; } const q = Math.min(s.inv.carne || 0, 4 - (v.carnes || 0)); if (q > 0) { s.inv.carne -= q; v.carnes = (v.carnes || 0) + q; som('pegar', 0.5); } J.salvar(); }
    else if (p.tipo === 'horta') { for (const m of ['fruta', 'erva']) if (L.horta[m] > 0) { J.ganha(m, L.horta[m]); L.horta[m] = 0; } J.salvar(); }
  };
  // ---------- pescar: lance, espere afundar, puxe ----------
  J.pesca = function () { const h = J.heroi; if (!(J.save.inv.vara > 0)) { texto(h.x, h.y - 66, 'precisa de uma vara', '#e0b070'); return; } h.estado = 'pesca'; h.t = 0; h.vx = 0; h.dir = Math.sign(F.atual.lugar.lago - h.x) || h.dir; h.morde = rnd(1.6, 4.6); h.fisgou = false; som('golpe', 0.3, 1.5); setTimeout(() => som('bolha', 0.5, 1), 350); };
  J.puxa = function () {
    const h = J.heroi, s = J.save; if (h.t < 0.4) return;
    if (h.t > h.morde && h.t < h.morde + 0.75) { J.ganha('peixe', Math.random() < 0.2 ? 2 : 1, h.x, h.y - 50); som('bolha', 0.8, 0.8); J.faiscas(F.atual.lugar.lago, h.y - 2, 14, '#bfe4ee', 0.9); J.treina('coleta', 6); if (Math.random() < 0.06) { s.inv.vara--; texto(h.x, h.y - 80, 'a vara quebrou', '#e0b070'); } }
    else { texto(h.x, h.y - 66, h.t < h.morde ? 'cedo demais' : 'escapou', '#c9bfa2'); som('bolha', 0.4, 1.4); }
    h.estado = 'livre'; h.t = 0;
  };
  J.passoPesca = function () { const h = J.heroi; if (h.estado !== 'pesca') return; if (h.t > h.morde && !h.fisgou) { h.fisgou = true; som('bolha', 0.9, 0.7); J.anel(F.atual.lugar.lago, h.y, 18, '#bfe4ee', 0.5, 2); } if (h.t > h.morde + 1.3) { texto(h.x, h.y - 66, 'escapou', '#c9bfa2'); h.estado = 'livre'; h.t = 0; } };
  J.reforca = function () { const s = J.save, r = s.roupa; if (r === 'barro' || (s.reforco[r] || 0) >= 3 || (s.inv.couro || 0) < 4 || (s.inv.fibra || 0) < 4 || !(s.lar && s.lar.curtume && s.lar.curtume.n)) return false; s.inv.couro -= 4; s.inv.fibra -= 4; s.reforco[r] = (s.reforco[r] || 0) + 1; J.recalcular(); som('pano', 0.6); J.treina('oficio', 8); J.salvar(); return true; };
  J.falaFilho = (p) => { const id = J.save.dia - p.dia; return um(C.FALAS_F[id < 3 ? 0 : id < 5 ? 1 : 2]); };

  J.fala = function () { const H = J.save.hum; return um(C.FALAS[faixa(H.laco)]); };
  J.ordem = function (o) { const s = J.save; s.hum.onde = o; if (J.hum) { J.hum.estado = o === 'segue' ? 'segue' : 'lar'; J.hum.dentro = false; } J.salvar(); };

  // ---------- filhos ----------
  J.nasceFilho = function (nome) { const s = J.save; s.prole.push({ nome, dia: s.dia }); if (s.area === 'lar') J.gente.push(cria(F.atual.lugar.berco, F.chao(F.atual.lugar.berco), { tipo: 'filho', p: s.prole[s.prole.length - 1] })); if (s.hum) s.hum.laco = Math.min(100, s.hum.laco + 10); J.salvar(); };
  J.herdeiro = () => (J.save.prole || []).find((p) => J.save.dia - p.dia >= 5) || null;
  J.herda = function (p) {
    const s = J.save; s.prole = s.prole.filter((q) => q !== p); s.vida++; s.antes = (s.antes || []).concat(s.nome); s.nome = p.nome; s.hp = null; s.fome = 80; s.veneno = 0;
    if (!(s.lar && s.lar.bau && s.lar.bau.n)) for (const m in s.inv) s.inv[m] = Math.floor(s.inv[m] / 4);
    for (const k in s.per) s.per[k] = { n: Math.floor(s.per[k].n * Math.min(0.92, 0.65 + (p.treino || 0) * 0.03)), x: 0 };
    // a mãe fica no lar; o filho ainda vai encontrar a humana dele
    if (s.hum && s.hum.onde !== 'levada') s.mae = { nome: s.hum.nome }; s.hum = null; J.hum = null; delete s.emb.vale_e0;
    s.area = s.lar ? 'lar' : 'floresta'; s.x = null; s.hora = 7;
  };

  // ---------- um quadro de vida ----------
  J.passoVida = function (dt) {
    const s = J.save, h = J.heroi; if (h.estado === 'morto' || h.estado === 'nasce') return;
    if (h.estado !== 'dorme') avanca(dt * HORA);
    if (J.ehNoite() && s.hora > 20) avisa('noite');
    passoEmboscada(dt); passoHum(dt); J.passoPesca();
    if (s.area === 'lar') { passoGente(dt); passoRaid(dt); }
  };
})();
