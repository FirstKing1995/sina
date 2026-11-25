/* SINA · telas, controles e o laço do jogo. */
(function () {
  'use strict';
  const J = window.Jogo, F = window.Fase, C = window.Dados, D = window.Desenho;
  const $ = (id) => document.getElementById(id);
  const toque = matchMedia('(pointer: coarse)').matches;
  const som = (n, v, t) => window.Som && Som.tocar(n, v, t);
  let modo = 'carga'; // carga | titulo | nasce | jogo | menu | fogo | morte
  const TELAS = ['titulo', 'nasce', 'menu', 'fogo', 'morte', 'batiza'];
  function mostra(id) { for (const t of TELAS) $(t).hidden = t !== id; $('hud').hidden = !['jogo', 'menu', 'fogo', 'morte', 'batiza'].includes(modo) || modo === 'morte'; $('toque').hidden = !(toque && modo === 'jogo'); solta(); }
  function solta() { for (const k in J.ent) J.ent[k] = 0; }
  function telaCheia() { if (!toque || document.fullscreenElement) return; try { const p = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {}); } catch (e) { /* sem tela cheia */ } }
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const botao = (txt, f, cls) => { const b = el('button', cls, txt); b.onclick = () => { if (window.Som) Som.ligar(); som('abrir', 0.4, 1.3); f(); }; return b; };

  // ---------- título ----------
  function titulo() {
    modo = 'titulo'; mostra('titulo'); J.heroi = null; D.escuro = null; D.foco = null;
    if (window.Som) { Som.musica('calma'); Som.ambiente('brisa'); Som.fogueira(0); }
    const m = $('titulo-menu'); m.innerHTML = '';
    const s = J.carregar();
    if (s) {
      const min = Math.round((s.tempo || 0) / 60);
      m.append(botao('Continuar como ' + s.nome, () => continuar(s), 'ir'));
      m.append(el('p', 'nota', (s.titulo ? s.titulo + ' · ' : '') + min + ' min de vida · ' + nomeArea(s.area)));
      const novo = botao('Nascer de novo', () => { novo.hidden = true; m.append(el('p', 'nota', 'A vida de ' + s.nome + ' acaba aqui. Tem certeza?'), botao('Sim, deixar ' + s.nome + ' para trás', () => { J.apagar(); nascer(viuIntro()); })); });
      m.append(novo);
    } else if (viuIntro()) {
      const ult = J.memorias()[0];
      if (ult) m.append(botao('Acordar como ' + ult.nome, () => acordaComo(ult.nome), 'ir'));
      m.append(botao(ult ? 'Acordar com outro nome' : 'Nascer', () => nascer(true), ult ? '' : 'ir'), botao('Ver a abertura', () => nascer(false)));
    } else m.append(botao('Nascer', () => nascer(false), 'ir'));
    const mem = J.memorias(), l = $('memorias'); l.innerHTML = '';
    if (mem.length) { l.append(el('h3', '', 'Os que vieram antes')); for (const x of mem.slice(0, 4)) l.append(el('p', '', x.nome + (x.titulo ? ', ' + x.titulo : '') + ' · ' + Math.max(1, Math.round(x.tempo / 60)) + ' min · ' + x.mortes + ' mortes')); }
  }
  const nomeArea = (id) => (id === 'lar' ? (J.save && J.save.nomeVila) || 'Clareira do Rio' : F.IDS.includes(id) ? (id.startsWith('covil_') ? { covil_lobos: 'Toca do Alfa', covil_cobras: 'Ninho da Rainha', covil_zumbis: 'A Cripta Fechada', covil_goblins: 'O Fortim' }[id] : C.REGIOES[id].nome) : '');

  // ---------- nascimento ----------
  let nas = null;
  const viuIntro = () => { try { return !!localStorage.getItem('sina_intro') || J.memorias().length > 0; } catch (e) { return false; } };
  function nascer(semIntro) {
    modo = 'nasce'; mostra('nasce'); telaCheia();
    if (window.Som) { Som.ligar(); Som.ambiente('cripta'); Som.musica(null); }
    $('n-pede').hidden = true; $('n-texto').textContent = ''; $('n-img').className = ''; $('n-luz').className = '';
    nas = { t: 0, i: -1, part: [], fim: false };
    requestAnimationFrame(() => { $('n-img').className = 'vai'; $('n-luz').className = 'vai'; });
    if (semIntro === true) { nas.fim = true; pedeNome(); } else proximaLinha();
  }
  function proximaLinha() {
    if (!nas || nas.fim) return;
    nas.i++;
    const tx = $('n-texto'); tx.classList.remove('ver');
    clearTimeout(nas.tm);
    if (nas.i >= C.NASCE.length) { nas.fim = true; nas.tm = setTimeout(pedeNome, 500); return; }
    nas.tm = setTimeout(() => { tx.textContent = C.NASCE[nas.i]; tx.classList.add('ver'); if (nas.i === 2) som('quebra', 0.4, 0.5); if (nas.i === 3) som('magia', 0.7, 0.6); nas.tm = setTimeout(proximaLinha, 4200); }, 600);
  }
  function pedeNome() { $('n-texto').textContent = ''; $('n-pede').hidden = false; $('n-nome').value = ''; if (!toque) $('n-nome').focus(); }
  function daNome() {
    const n = $('n-nome').value.trim().slice(0, 16); if (!n) { $('n-nome').classList.add('falta'); $('n-nome').focus(); return; }
    try { localStorage.setItem('sina_intro', '1'); } catch (e) { /* nada */ }
    $('n-nome').blur(); acordaComo(n);
  }
  // abre os olhos na floresta, sem abertura: quem morre volta por aqui
  function acordaComo(n) {
    telaCheia(); fila.length = 0;
    J.save = J.novoSave(n); J.heroi = null; J.colhidos = {};
    J.entrarArea('floresta');
    const h = J.heroi; h.estado = 'nasce'; h.t = 0; h.nq = 0; h.x = h.ultimoSeguro.x;
    D.centrar(); D.escuro = 0.15; modo = 'jogo'; mostra(null); areaVista = null;
    acorda = { t: 0, i: 0 };
    vesteRetrato(); J.salvar();
  }
  let acorda = null;
  function passoAcorda(dt) {
    if (!acorda) return;
    const h = J.heroi, a = acorda; a.t += dt;
    D.escuro = Math.min(1, 0.12 + a.t / 6);
    h.nq = a.t < 2.2 ? 0 : a.t < 3 ? 1 : a.t < 3.8 ? 2 : a.t < 4.6 ? 3 : a.t < 5.4 ? 4 : 5;
    if (Math.random() < 0.3) J.poe({ tipo: 'alma', x: h.x + (Math.random() - 0.5) * 40, y: h.y - Math.random() * 40, vy: -18, vida: 1, max: 1, cor: '#ffb060', tam: 1.6 });
    if (a.t > 1 && a.i === 0) { a.i = 1; sussurra(C.ACORDA[0], 3.4); }
    if (a.t > 4.6 && a.i === 1) { a.i = 2; sussurra(C.ACORDA[1], 3.4); }
    const quer = a.t > 1.5 && (J.ent.esq || J.ent.dir || J.ja.pula > 0);
    if (a.t > 6.6 || quer) { acorda = null; D.escuro = null; h.estado = 'livre'; h.t = 0; J.mostraArea('Floresta Antiga', 'Eu sou ' + J.save.nome); if (window.Som) Som.ambiente('brisa'); }
  }
  function continuar(s) {
    telaCheia(); const velho = (s.v || 1) < 3; J.save = Object.assign(J.novoSave(s.nome), s); J.heroi = null; J.colhidos = {};
    // save de antes do mapa crescer: volta para a última fogueira
    if (velho) { J.save.v = 3; J.save.prole = J.save.prole || []; J.save.emb = {}; const f = s.fogo && F.area(s.fogo.area).fogos.find((o) => o.id === s.fogo.id); if (f) { J.save.area = s.fogo.area; J.save.x = f.x; J.save.y = f.y; } else { J.save.area = 'floresta'; J.save.x = null; } }
    J.entrarArea(J.save.area); D.centrar(); D.escuro = null; modo = 'jogo'; mostra(null); areaVista = null; vesteRetrato();
  }

  // ---------- avisos na tela ----------
  let sussT = 0, areaT = 0, areaVista = null;
  function sussurra(t, dur) { const e = $('sussurro'); e.textContent = t; e.classList.add('ver'); sussT = dur || 4.5; }
  J.mostraArea = function (nome, sub) { const e = $('area'); e.innerHTML = ''; e.append(el('b', '', nome)); if (sub) e.append(el('span', '', sub)); e.classList.add('ver'); areaT = 3.4; };
  const fila = [];
  function conquista(tit, txt, cor) { fila.push([tit, txt, cor]); if (fila.length === 1) mostraConquista(); }
  function mostraConquista() { if (!fila.length) return; const [a, b, c] = fila[0], e = $('conquista'); e.innerHTML = ''; e.append(el('b', '', a), el('span', '', b)); e.style.borderColor = c || '#c9a45a'; e.classList.add('ver'); setTimeout(() => { e.classList.remove('ver'); setTimeout(() => { fila.shift(); mostraConquista(); }, 500); }, 4600); }
  function dica(id, dur) { const s = J.save; if (s.dicas[id]) return; s.dicas[id] = 1; sussurra(C.DICAS[id][toque ? 1 : 0], dur || 6); }
  J.aviso = function (tipo, x) {
    const s = J.save;
    if (tipo === 'ganhou') { if (!s.dicas.criar && (s.inv.galho || 0) >= 3) dica('criar'); atualizaMochila(); }
    else if (tipo === 'criou') { const n = x.tipo === 'arma' ? C.ARMAS[x.id].nome : x.tipo === 'roupa' ? C.ROUPAS[x.id].nome : x.tipo === 'amuleto' ? C.AMULETOS[x.id].nome : x.nome; if (x.tipo) conquista(x.tipo === 'arma' ? 'Nova arma' : x.tipo === 'roupa' ? 'Nova roupa' : x.tipo === 'amuleto' ? 'Novo amuleto' : 'Feito', n); }
    else if (tipo === 'roupa') vesteRetrato();
    else if (tipo === 'titulo') conquista(x[1], x[2], '#e9c47a');
    else if (tipo === 'magia') { const m = C.MAGIAS[x]; conquista('A Sina ensinou: ' + m.nome, m.desc, m.cor); if (x === 'brasa') setTimeout(() => dica('magia'), 5200); }
    else if (tipo === 'chefe') J.mostraArea(x.T.nome, 'dono deste caminho');
    else if (tipo === 'venceu') { setTimeout(() => J.mostraArea(x.T.nome + ' caiu', 'O círculo no fundo acordou'), 900); const n = Object.keys(s.chefes).length; if (n === 2) setTimeout(() => conquista('Um quinto caminho se abriu', 'Na clareira, as raízes soltaram a passagem para o Vale do Rio Manso.', '#8fe0c8'), 6000); if (n === 4) setTimeout(() => conquista('Os quatro donos caíram', 'A floresta é sua. Ainda há uma casa para levantar no Vale do Rio Manso.', '#8fe0c8'), 6000); }
    else if (tipo === 'morte') morreu(x);
    else if (tipo === 'emboscada') { J.mostraArea('Emboscada', 'as raízes fecharam o caminho'); }
    else if (tipo === 'onda') { if (x[1] > 1) sussurra('Onda ' + x[0] + ' de ' + x[1], 2.2); }
    else if (tipo === 'emboscadaFim') J.mostraArea('O caminho abriu', 'ninguém ficou de pé');
    else if (tipo === 'grito') sussurra('Alguém grita. É gente. Não deixe que cheguem nela.', 5);
    else if (tipo === 'encontrou') { J.mostraArea(x.nome, 'ela não está mais sozinha, nem você'); setTimeout(() => sussurra('“' + C.FALAS.medo[2] + '”', 6), 3600); }
    else if (tipo === 'fugiu') J.mostraArea('Ela fugiu ferida', 'durma e volte a procurá-la aqui');
    else if (tipo === 'humCaiu') sussurra((s.hum ? s.hum.nome : 'Ela') + ' caiu! Chegue perto e levante-a antes que a levem.', 5);
    else if (tipo === 'levada') { J.mostraArea('Levaram ' + s.hum.nome, x); setTimeout(() => sussurra('As pegadas vão para ' + nomeArea(s.hum.cativeiro) + ', perto do covil.', 7), 3600); }
    else if (tipo === 'soltou') { J.mostraArea(x.nome + ' está livre', ''); setTimeout(() => sussurra('“Eu sabia que você vinha. Não sabia se dava tempo.”', 5), 2800); }
    else if (tipo === 'noLar') { dica('lar', 8); if (s.lar && s.lar.trouxe) { for (const m in s.lar.trouxe) J.ganha(m, s.lar.trouxe[m]); s.lar.trouxe = null; sussurra('Seu filho juntou coisas para você.', 4); } }
    else if (tipo === 'noite') dica('noite', 6);
    else if (tipo === 'raid') J.mostraArea('A noite veio até a porta', x + ' ondas');
    else if (tipo === 'ondaRaid') sussurra('Onda ' + x[0] + ' de ' + x[1] + ': ' + C.ESPECIES[x[2]].nome.toLowerCase(), 3);
    else if (tipo === 'raidFim') J.mostraArea('Amanhã ainda existe', 'o lar aguentou a noite');
    else if (tipo === 'cercaCaiu') sussurra('A cerca caiu!', 2.5);
    else if (tipo === 'casaCaiu') J.mostraArea(x ? 'A casa voltou a ser ' + C.CASAS[x].nome.toLowerCase() : 'A casa caiu', x ? 'o resto virou lenha' : 'dá para levantar de novo');
    else if (tipo === 'longe') conquista('Notícia do lar', x, '#d8a060');
    else if (tipo === 'construiu') conquista('Você levantou', x.nome + (x.n > 1 && !C.CASAS.some((c) => c && c.nome === x.nome) ? ' (nível ' + x.n + ')' : ''), '#c8a878');
    else if (tipo === 'gravida') conquista(s.hum.nome + ' espera um filho', 'Daqui a três noites. Até lá, ela precisa de você inteiro.', '#e8b0a0');
    else if (tipo === 'nasceu') batizar = true;
    else if (tipo === 'caderno') { const B = C.BICHOS[x[0]]; if (B) conquista(x[1] === 1 ? 'Caderno: ' + C.TIPOS[x[0]].nome : x[1] === 4 ? C.TIPOS[x[0]].nome + ': hábitos' : C.TIPOS[x[0]].nome + ': fraqueza', x[1] === 1 ? B[0] : x[1] === 4 ? B[1] : B[2] + ' (+8% de dano)', C.ESPECIES[C.TIPOS[x[0]].esp].cor); }
    else if (tipo === 'morador') { const V = C.VILA[x], v = s.vila[x]; J.mostraArea(v.nome + ' está livre', V.oficio + ' · foi para ' + nomeArea('lar')); setTimeout(() => sussurra('“' + V.chega + '”', 6), 3200); const n = J.moradores().length; if (n === 2) setTimeout(() => conquista('Já dá para chamar de vila', 'Dê um nome a ela na aba Lar.', '#8fe0c8'), 7000); if (n === 4) setTimeout(() => conquista('Fundador', 'Quatro vidas devolvidas. A clareira nunca mais ficou em silêncio.', '#e9c47a'), 7000); }
    else if (tipo === 'zona') { if (areaT <= 0) J.mostraArea(x.nome); }
    else if (tipo === 'marco') { J.mostraArea(x.nome); sussurra(x.texto, 6.5); som('livro', 0.5); }
    else if (tipo === 'oco') sussurra('O chão era oco.', 3);
    else if (tipo === 'amuleto') { const A = C.AMULETOS[x]; conquista('Achou: ' + A.nome, A.desc, '#7ff0ff'); }
    else if (tipo === 'cresceu') conquista(x.nome + ' já é crescido', 'Se você cair, é nele que você continua.', '#8fe0c8');
  };

  // ---------- morte ----------
  function morreu(x) {
    setTimeout(() => {
      modo = 'morte'; mostra('morte');
      const s = J.save, c = $('morte-corpo'); c.innerHTML = '';
      $('morte-tit').textContent = x.herda ? x.pai + ' cai. O sangue fica.' : s.nome + ' voltou ao barro';
      $('morte-sub').textContent = C.MORTES[x.quem] || 'A floresta engoliu você.';
      const tot = Object.values(s.mortes).reduce((a, b) => a + b, 0);
      if (!x.herda) {
        const g = el('div', 'ficha');
        for (const [a, b] of [['Tempo de vida', tempo(s.tempo)], ['Maior título', s.titulo || 'nenhum'], ['Inimigos mortos', tot], ['Coisas colhidas', s.colhido], ['Última arma', C.ARMAS[s.arma].nome], ['Caiu em', nomeArea(s.area)]]) g.append(el('span', '', a), el('em', '', b));
        c.append(g, el('p', 'nota', x.pequeno ? x.pequeno + ' ainda era pequeno demais para continuar. Tudo começa do zero.' : 'Você não deixou filhos. Quem não deixa ninguém começa do zero.'));
        c.append(botao('Acordar no começo', () => acordaComo(s.nome), 'ir'), botao('Acordar com outro nome', () => nascer(true)), botao('Título', titulo));
      } else {
        c.append(el('p', 'nota', s.nome + ' cresceu vendo você lutar. Carrega parte do que você sabia' + (s.lar && s.lar.bau && s.lar.bau.n ? ' e tudo o que estava na mochila.' : ' e um pouco do que estava na mochila.')));
        c.append(botao('Abrir os olhos', () => { J.heroi = null; s.x = null; J.entrarArea(s.area); D.centrar(); areaVista = null; modo = 'jogo'; mostra(null); }, 'ir'));
      }
    }, 2400);
  }
  const tempo = (t) => { t = Math.round(t); const m = Math.floor(t / 60); return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min ' + (t % 60) + ' s'; };

  // ---------- usar o que está perto ----------
  function usar() {
    if (modo === 'jogo' && J.heroi && J.heroi.estado === 'pesca') { J.puxa(); return; }
    if (modo !== 'jogo' || !J.heroi || J.heroi.estado !== 'livre') return;
    const p = J.perto(); if (!p) return;
    if (['levanta', 'solta', 'varal', 'horta'].includes(p.tipo)) { J.usaLar(p); return; }
    if (p.tipo === 'bau') { J.abreBau(p.o); return; }
    if (p.tipo === 'casa') { abreMenu('lar'); return; }
    if (p.tipo === 'fala') { abreFala(); return; }
    if (p.tipo === 'preso') { J.soltaPreso(); return; }
    if (p.tipo === 'morador') { abreMorador(p.o.id); return; }
    if (p.tipo === 'pesca') { J.pesca(); return; }
    if (p.tipo === 'crianca') { abreFilho(p.o.p); return; }
    if (p.tipo === 'coleta') J.colher(p.o);
    else if (p.tipo === 'porta') { if (p.o.precisa && Object.keys(J.save.chefes).length < p.o.precisa) { sussurra('Raízes vivas fecham a passagem. Elas só soltam para quem derrubou ' + p.o.precisa + ' donos dos caminhos.', 5); return; } if (J.hum && J.hum.caida) { sussurra('Você não vai deixá-la caída aqui.', 3); return; } viajar(p.o); }
    else if (p.tipo === 'circulo') J.aprende(p.o.magia);
    else if (p.tipo === 'fogo') {
      const s = J.save;
      if (!s.fogos[p.o.id] && (s.inv.galho || 0) < 2) { sussurra('Faltam 2 galhos para acender.', 3); return; }
      if (!s.fogos[p.o.id]) {
        // acender já guarda: se sair do jogo, a vida continua daqui
        s.inv.galho -= 2; s.fogos[p.o.id] = 1; s.fogo = { area: s.area, id: p.o.id }; som('fogo', 0.8); J.faiscas(p.o.x, p.o.y - 14, 26, '#ff9a40', 1.2, 'brasa'); J.salvar(); guardou();
      }
      if (s.area === 'lar' && s.lar && s.lar.lenha <= 0) s.lar.lenha = 4;
      if (J.inimigos.some((e) => e.vivo && !['vaga', 'volta', 'caido'].includes(e.estado) && Math.abs(e.x - J.heroi.x) < 320)) { sussurra('Não dá para deitar com eles por perto.', 3); return; }
      dormir(p.o);
    }
  }
  // ---------- dormir: um momento de calma ----------
  let sono = null, pulaSono = false;
  let guardT = 0;
  function guardou() { $('guardou').classList.add('ver'); clearTimeout(guardT); guardT = setTimeout(() => $('guardou').classList.remove('ver'), 2600); }
  function dormir(f) { sono = { f, feito: false, disse: false }; pulaSono = false; solta(); J.comecaSono(f); $('hud').classList.add('calma'); $('toque').hidden = true; }
  function passoDormir(dt) {
    const h = J.heroi; if (!sono || h.estado !== 'dorme') return;
    const t = h.acordando ? 99 : h.andaAte ? 0 : h.t;
    if (t > 1.9 && !sono.disse) { sono.disse = true; const junto = J.hum && J.hum.dorme != null && Math.random() < 0.6; const l = junto ? C.SONHOS2 : C.SONHOS; sussurra(l[Math.floor(Math.random() * l.length)], 4.6); }
    if (Math.random() < 0.14) J.poe({ tipo: 'brasa', x: sono.f.x + (Math.random() - 0.5) * 18, y: sono.f.y - 18, vx: (Math.random() - 0.5) * 10, vy: -22 - Math.random() * 22, vida: 1.8, max: 1.8, cor: '#ffb060', tam: 1.4 });
    D.escuro = h.acordando ? Math.min(1, 0.5 + h.t * 0.45) : t < 1.7 ? 1 : Math.max(0.5, 1 - (t - 1.7) * 0.35);
    if ((t > 4.2 || h.acordando) && !sono.feito) { sono.feito = true; J.dormiu(sono.f); }
    if (J.passoSono(dt, pulaSono)) { const f = sono.f; sono = null; D.escuro = null; $('hud').classList.remove('calma'); guardou(); if (modo === 'jogo') { abreFogo(f); } }
  }
  addEventListener('pointerdown', () => { if (sono && J.heroi && J.heroi.estado === 'dorme') pulaSono = true; });
  let viajando = false;
  function viajar(p) {
    if (viajando) return; viajando = true; som('porta', 0.6, 0.8);
    const v = $('veu'); v.classList.add('ver'); solta();
    setTimeout(() => { J.entrarArea(p.para[0], p.para[1]); D.centrar(); areaVista = null; D.quadro(0.016); setTimeout(() => { v.classList.remove('ver'); viajando = false; }, 220); }, 420);
  }
  const rotulo = (p) => (p.tipo === 'preso' ? 'Quebrar a jaula' : p.tipo === 'morador' ? 'Falar com ' + J.save.vila[p.o.id].nome : p.tipo === 'bau' ? 'Abrir o baú' : p.tipo === 'levanta' ? 'Levantar' : p.tipo === 'solta' ? 'Quebrar a jaula' : p.tipo === 'varal' ? 'Mexer no varal' : p.tipo === 'horta' ? 'Colher a horta' : p.tipo === 'pesca' ? 'Pescar' : p.tipo === 'crianca' ? 'Falar com ' + p.o.p.nome : p.tipo === 'casa' ? (J.save.lar.casa.n ? 'Cuidar do lar' : 'Levantar uma casa') : p.tipo === 'fala' ? 'Falar com ' + J.save.hum.nome : p.tipo === 'coleta' && p.o.m === 'madeira' ? 'Cortar a árvore' : p.tipo === 'porta' && p.o.precisa && Object.keys(J.save.chefes).length < p.o.precisa ? 'Passagem fechada por raízes' : p.tipo === 'coleta' ? 'Colher ' + C.MAT[p.o.m].toLowerCase() : p.tipo === 'porta' ? p.o.nome : p.tipo === 'circulo' ? 'Tocar o círculo' : J.save.fogos[p.o.id] ? 'Deitar e dormir' : 'Acender e dormir (2 galhos)');

  // ---------- fogueira ----------
  function abreFogo(f) {
    modo = 'fogo'; mostra('fogo'); dica('fogo');
    $('fg-nome').textContent = f.nome; $('fg-nota').textContent = 'Dia ' + J.save.dia + ', ' + J.nomeHora() + '. Vida, fôlego e caminho guardados. Os bichos também voltaram.'; $('fg-sair').textContent = 'Levantar';
    const c = $('fg-corpo'); c.innerHTML = '';
    const s = J.save;
    if ((s.inv.carne || 0) > 0) c.append(botao('Assar e comer uma carne (+45 fome, +25 vida)', () => { s.inv.carne--; s.fome = Math.min(100, s.fome + 45); J.heroi.hp = Math.min(J.heroi.ficha.vida, J.heroi.hp + 25); som('beber', 0.6); J.salvar(); abreFogo(f); }));
    if (s.area === 'lar' && s.lar) { const b = botao('Pôr lenha (arde mais ' + Math.round(s.lar.lenha) + ' h)', () => { if (J.botaLenha()) abreFogo(f); else sussurra('Falta galho ou tora.', 2); }); c.append(b); }
    c.append(botao('Criar e arrumar a mochila', () => abreMenu('criar')));
    c.append(botao('Dormir mais', () => { voltar(); dormir(f); }));
    // já conhecidas: dá para voltar a qualquer fogueira acesa
    const lista = [];
    for (const id of F.IDS) if (s.visitas[id]) for (const o of F.area(id).fogos) if (s.fogos[o.id] && o.id !== f.id) lista.push([id, o]);
    if (lista.length) { c.append(el('h3', '', 'Caminhar até outra fogueira')); for (const [id, o] of lista) c.append(botao(o.nome + ' · ' + nomeArea(id), () => { s.area = id; s.x = o.x; s.y = o.y; J.entrarArea(id); s.fogo = { area: id, id: o.id }; D.centrar(); areaVista = null; voltar(); })); }
  }
  function voltar() { modo = 'jogo'; mostra(null); }
  // ---------- falar com ela ----------
  function abreFala() {
    modo = 'fogo'; mostra('fogo'); const s = J.save, H = s.hum, c = $('fg-corpo'); c.innerHTML = '';
    $('fg-nome').textContent = H.nome; $('fg-sair').textContent = 'Ficar em silêncio';
    $('fg-nota').textContent = '“' + J.fala() + '”';
    c.append(el('p', 'nota', J.lacoNome(H.laco) + ' · vida ' + Math.ceil(H.hp) + ' de ' + H.hpMax + ' · ' + (H.fome < 15 ? 'faminta' : H.fome < 40 ? 'com fome' : 'alimentada') + (H.gravida ? ' · espera um filho' : '')));
    const m = ['seca', 'peixe', 'carne', 'fruta'].find((k) => s.inv[k] > 0);
    if (m && H.fome < 92) c.append(botao('Dar ' + C.MAT[m].toLowerCase(), () => { s.inv[m]--; H.fome = Math.min(100, H.fome + C.COMER[m].fome * 1.3); H.laco = Math.min(100, H.laco + 1.5); som('beber', 0.5); J.salvar(); abreFala(); }));
    if (s.area === 'lar') {
      if (H.onde !== 'segue' && !H.gravida) c.append(botao('Vem comigo', () => { J.ordem('segue'); voltar(); }));
      if (H.onde === 'segue') c.append(botao('Fica no lar', () => { J.ordem('lar'); voltar(); }));
      if (H.gravida) c.append(el('p', 'nota', 'Ela não vai viajar assim. Proteja o lar.'));
    }
    if (!H.lanca && s.armas.includes('lanca')) c.append(botao('Fazer uma lança para ela (3 galhos, 1 pedra, 2 fibras)', () => { if ((s.inv.galho || 0) >= 3 && (s.inv.pedra || 0) >= 1 && (s.inv.fibra || 0) >= 2) { s.inv.galho -= 3; s.inv.pedra--; s.inv.fibra -= 2; H.lanca = true; H.laco = Math.min(100, H.laco + 5); som('raro', 0.6); J.salvar(); abreFala(); } else sussurra('Faltam materiais.', 2); }));
  }
  function abreMorador(id) {
    modo = 'fogo'; mostra('fogo'); const s = J.save, V = C.VILA[id], v = s.vila[id], c = $('fg-corpo'); c.innerHTML = '';
    $('fg-nome').textContent = v.nome + ', ' + V.oficio.toLowerCase(); $('fg-sair').textContent = 'Até logo'; $('fg-nota').textContent = '“' + V.falas[Math.floor(Math.random() * V.falas.length)] + '”';
    const op = (txt, qual, ok) => { const b = botao(txt, () => { if (J.servico(id, qual)) abreMorador(id); else sussurra('Agora não dá.', 2); }); b.disabled = !ok; c.append(b); };
    if (id === 'ferreiro') { const n = s.afiado[s.arma] || 0; op(s.arma === 'punho' ? 'Afiar: empunhe uma arma' : n >= 9 ? C.ARMAS[s.arma].nome + ' já está no máximo' : 'Afiar ' + C.ARMAS[s.arma].nome + ' +' + (n + 1) + ' (2 ferros)', 'afiar', s.arma !== 'punho' && n < 9 && (s.inv.ferro || 0) >= 2); op('Doze flechas (1 ferro, 2 galhos)', 'pontas', (s.inv.ferro || 0) >= 1 && (s.inv.galho || 0) >= 2); }
    if (id === 'curandeira') { op('Cuidar das feridas', 'cura', true); op(v.deu === s.dia ? 'O chá de hoje já foi' : 'Chá forte: +20 de vida até amanhã (2 ervas)', 'cha', v.deu !== s.dia && (s.inv.erva || 0) >= 2); }
    if (id === 'cacador') op(v.deu === s.dia ? 'A lição de hoje já foi' : 'Treinar com ele: perícia da arma e das pernas', 'ensina', v.deu !== s.dia);
    if (id === 'vigia') op('Remendar as cercas (1 galho cada)', 'remenda', (s.inv.galho || 0) > 0 && ['cercaE', 'cercaD'].some((k) => s.lar[k] && s.lar[k].n && s.lar[k].hp < J.cheioObra(k)));
    c.append(el('p', 'nota', { ferreiro: 'Afia até +9 e às vezes deixa um ferro pela manhã.', curandeira: 'Deixa um curativo por manhã.', cacador: 'Traz carne e couro. Na noite de ataque, atira.', vigia: 'Conserta a cerca de madrugada e luta na noite de ataque.' }[id]));
  }
  function abreFilho(p) {
    modo = 'fogo'; mostra('fogo'); const s = J.save, id = s.dia - p.dia, c = $('fg-corpo'); c.innerHTML = '';
    $('fg-nome').textContent = p.nome; $('fg-sair').textContent = 'Passar a mão na cabeça'; $('fg-nota').textContent = '“' + J.falaFilho(p) + '”';
    c.append(el('p', 'nota', id < 3 ? 'Ainda pequeno. Com 3 dias já ajuda.' : id + ' dias' + (p.treino ? ' · ' + p.treino + ' de treino' : '') + (id >= 5 ? ' · pode continuar você' : '')));
    if (id >= 3) for (const t in C.TAREFAS) { const at = (p.tarefa || 'juntar') === t, b = botao(C.TAREFAS[t][0] + (at ? ' (agora)' : ''), () => { p.tarefa = t; J.salvar(); abreFilho(p); }, at ? 'ir' : ''); b.title = C.TAREFAS[t][1]; c.append(b, el('p', 'nota', C.TAREFAS[t][1])); }
  }
  let batizar = false;
  function abreBatiza() { batizar = false; modo = 'batiza'; mostra('batiza'); $('bt-nome').value = ''; if (!toque) $('bt-nome').focus(); som('raro', 0.8); }
  function batiza() { const n = $('bt-nome').value.trim().slice(0, 16); if (!n) { $('bt-nome').focus(); return; } $('bt-nome').blur(); J.nasceFilho(n); voltar(); conquista(n + ' nasceu', 'Em cinco dias já poderá continuar você. Até lá, proteja o lar.', '#e8b0a0'); }

  // ---------- menu: criar, mochila, perícias, títulos, opções ----------
  let aba = 'criar';
  const ABAS = [['lar', 'Lar'], ['criar', 'Criar'], ['mochila', 'Mochila'], ['mapa', 'Mapa'], ['pericias', 'Perícias'], ['titulos', 'Títulos'], ['caderno', 'Caderno'], ['opcoes', 'Opções']];
  function abreMenu(qual) { if (qual) aba = qual; modo = 'menu'; mostra('menu'); som('livro', 0.5); pintaMenu(); }
  const ic = (m, t) => { const c = D.icone(m, t || 34); c.className = 'ic'; return c; };
  function pintaMenu() {
    const ab = $('m-abas'); ab.innerHTML = '';
    for (const [id, n] of ABAS) { if (id === 'lar' && !J.save.lar) continue; const b = el('button', id === aba ? 'ativa' : '', n); b.onclick = () => { aba = id; pintaMenu(); }; ab.append(b); }
    const c = $('m-corpo'); c.innerHTML = ''; const s = J.save, h = J.heroi;
    if (aba === 'lar' && !s.lar) aba = 'criar';
    if (aba === 'mapa') { pintaMapa(c); return; }
    if (aba === 'caderno') {
      const todos = Object.keys(C.BICHOS), vis = todos.filter((t) => s.abates[t] > 0); c.append(el('p', 'nota', vis.length + ' de ' + todos.length + ' bichos anotados. Com 4 mortes você entende os hábitos; com 10, a fraqueza e 8% a mais de dano.'));
      for (const e in C.ESPECIES) {
        c.append(el('h3', '', C.ESPECIES[e].nome));
        for (const t of todos) if (C.TIPOS[t].esp === e) { const n = s.abates[t] || 0, B = C.BICHOS[t], l = el('div', 'linha' + (n >= 10 ? ' atual' : '')), d = el('div', 'l-txt'), q = el('div'); d.append(retratoBicho(t, n > 0)); if (!n) q.append(el('b', '', '???'), el('small', '', 'Ainda não caiu nenhum.')); else { q.append(el('b', '', C.TIPOS[t].nome + ' · ' + n), el('small', '', B[0])); const ch = C.TIPOS[t].chefe; if (n >= 4 || ch) q.append(el('small', '', B[1])); if (n >= 10 || ch) q.append(el('small', 'jeito', B[2])); else q.append(el('small', '', 'Faltam ' + ((n < 4 ? 4 : 10) - n) + ' para saber mais.')); } d.append(q); l.append(d); c.append(l); }
      }
      return;
    }
    if (aba === 'lar') {
      const L = s.lar, aqui = s.area === 'lar';
      c.append(el('p', 'nota', (L.casa.n ? C.CASAS[L.casa.n].nome + ', ' + Math.ceil(L.casa.hp) + ' de ' + C.CASAS[L.casa.n].hp : 'Ainda não há casa. Só chão.') + ' · fogo: ' + (L.lenha > 0 ? Math.round(L.lenha) + ' h de lenha' : 'apagado') + ' · dia ' + s.dia));
      c.append(el('p', 'nota', aqui ? 'Toda noite, às 21 h, alguém vem. Cerca segura, estaca fere, fogo aceso afasta uma onda.' : 'Para construir e consertar, volte à Clareira do Rio.'));
      if (L.curtume && L.curtume.n && s.roupa !== 'barro') { const n = s.reforco[s.roupa] || 0, b = botao(n >= 3 ? C.ROUPAS[s.roupa].nome + ': reforçada ao máximo' : 'Reforçar ' + C.ROUPAS[s.roupa].nome.toLowerCase() + ' (' + n + '/3): 4 couros e 4 fibras, +3% de defesa', () => { if (J.reforca()) pintaMenu(); }); b.disabled = !aqui || n >= 3 || (s.inv.couro || 0) < 4 || (s.inv.fibra || 0) < 4; c.append(b); }
      for (const id of ['casa', 'cercaE', 'cercaD', 'estacasE', 'estacasD', 'varal', 'horta', 'curtume', 'bau', 'berco']) {
        const o = J.custoObra(id), tenho = id === 'casa' ? L.casa.n : L[id] && L[id].n, cheio = J.cheioObra(id), hp = id === 'casa' ? L.casa.hp : L[id] ? L[id].hp : 0;
        const l = el('div', 'linha' + (J.podeObra(id) ? ' pode' : '')), t = el('div', 'l-txt'), d = el('div');
        const nome = o ? (id === 'casa' && tenho ? 'Melhorar: ' : '') + o.nome + (id !== 'casa' && tenho ? ' · nível ' + o.n : '') : (id === 'casa' ? C.CASAS[L.casa.n].nome : C.OBRAS[id].nome);
        d.append(el('b', '', nome), el('small', '', o ? (o.trava ? 'Precisa de ' + o.trava.toLowerCase() : o.desc) : 'Pronto'));
        if (o) { const cu = el('div', 'custos'); for (const m in o.custo) { const k = el('span', (s.inv[m] || 0) >= o.custo[m] ? 'tem' : 'falta', (s.inv[m] || 0) + '/' + o.custo[m]); k.prepend(ic(m, 20)); k.title = C.MAT[m]; cu.append(k); } d.append(cu); }
        t.append(d); l.append(t);
        if (tenho && cheio > 1 && hp < cheio) { const b = botao('Consertar (2 galhos)', () => { if (J.conserta(id)) pintaMenu(); }); b.disabled = !aqui || (s.inv.galho || 0) < 2 || !!J.raid; l.append(b); }
        if (o) { const b = botao('Levantar', () => { if (J.constroi(id)) pintaMenu(); }); b.disabled = !J.podeObra(id); l.append(b); }
        c.append(l);
      }
      const H = s.hum; c.append(el('h3', '', 'Família'));
      c.append(el('p', 'nota', H ? H.nome + ': ' + J.lacoNome(H.laco).toLowerCase() + (H.onde === 'levada' ? ', levada para ' + nomeArea(H.cativeiro) : H.onde === 'segue' ? ', com você' : ', no lar') + (H.gravida ? ', espera um filho' : '') : 'Ninguém ainda. No vale, alguém gritou.'));
      if (s.mae) c.append(el('p', 'nota', s.mae.nome + ', sua mãe, cuida do lar.'));
      for (const p of s.prole) { const id = s.dia - p.dia; c.append(el('p', 'nota', p.nome + ': ' + (id < 2 ? 'bebê de colo' : id < 5 ? 'criança, faltam ' + (5 - id) + ' dias para poder continuar você' : 'crescido, pode continuar você'))); }
      { const ms = J.moradores(); c.append(el('h3', '', 'Vila')); if (!ms.length) c.append(el('p', 'nota', 'Há gente presa nos quatro caminhos, nos acampamentos do fundo.')); for (const m of ms) c.append(el('p', 'nota', s.vila[m].nome + ', ' + C.VILA[m].oficio.toLowerCase() + ', desde o dia ' + s.vila[m].dia)); if (ms.length >= 2) { const i = el('input', 'nomevila'); i.maxLength = 22; i.placeholder = 'Nome da vila'; i.value = s.nomeVila || ''; i.onchange = () => { s.nomeVila = i.value.trim(); J.salvar(); }; c.append(i); } }
      c.append(el('p', 'nota', 'Filhos: laço de Companhia (60), cabana trançada, berço e uma noite dormida no lar.'));
    } else if (aba === 'criar') {
      c.append(el('p', 'nota', 'Ofício ' + J.nivel('oficio') + '. Quanto mais você faz, melhor o que consegue fazer.'));
      for (const r of C.RECEITAS) {
        const nome = r.tipo === 'arma' ? C.ARMAS[r.id].nome : r.tipo === 'roupa' ? C.ROUPAS[r.id].nome : r.tipo === 'amuleto' ? C.AMULETOS[r.id].nome : r.nome, desc = r.desc || (r.tipo === 'amuleto' ? C.AMULETOS[r.id].desc : '') || (r.tipo === 'arma' ? C.ARMAS[r.id].desc : r.tipo === 'roupa' ? C.ROUPAS[r.id].desc : '');
        const trava = J.nivel('oficio') < (r.oficio || 0);
        const l = el('div', 'linha' + (J.pode(r) && !J.jaTem(r) ? ' pode' : '')), t = el('div', 'l-txt');
        t.append(ic(r.tipo === 'amuleto' ? 'a_' + r.id : r.tipo === 'roupa' && ['pele', 'osso', 'prata'].includes(r.id) ? 'r_' + r.id : r.id === 'isca' ? 'pedra' : r.id === 'curativo' ? 'trapo' : r.id === 'folhas' ? 'folha' : r.id === 'couro' ? 'couro' : r.id));
        const d = el('div'); d.append(el('b', '', nome + (r.tipo === 'arma' ? ' · dano ' + C.ARMAS[r.id].dano : r.tipo === 'roupa' ? ' · defesa ' + Math.round(C.ROUPAS[r.id].def * 100) + '%' : '')), el('small', '', trava ? 'Precisa de Ofício ' + r.oficio : desc));
        const cu = el('div', 'custos'); for (const m in r.custo) { const k = el('span', (s.inv[m] || 0) >= r.custo[m] ? 'tem' : 'falta', (s.inv[m] || 0) + '/' + r.custo[m]); k.prepend(ic(m, 20)); k.title = C.MAT[m]; cu.append(k); }
        d.append(cu); t.append(d);
        const b = botao(J.jaTem(r) ? 'Já tem' : 'Fazer', () => { if (J.criar(r)) pintaMenu(); }); b.disabled = !J.pode(r) || J.jaTem(r);
        l.append(t, b); c.append(l);
      }
    } else if (aba === 'mochila') {
      c.append(el('h3', '', 'Armas'));
      for (const a of C.ORDEM_ARMAS) if (s.armas.includes(a)) {
        const A = C.ARMAS[a], l = el('div', 'linha' + (s.arma === a ? ' atual' : '')), t = el('div', 'l-txt');
        if (a !== 'punho') t.append(ic(a)); const d = el('div'); d.append(el('b', '', A.nome + (s.afiado[a] ? ' +' + s.afiado[a] : '')), el('small', '', 'Dano ' + Math.round(A.dano * (1 + J.nivel(A.per) * C.BONUS) * (1 + (s.afiado[a] || 0) * 0.04)) + ' · ' + A.desc), el('small', 'jeito', C.ESTILOS[A.per].nota)); t.append(d);
        l.append(t); if (s.arma !== a) l.append(botao('Empunhar', () => { J.empunhar(a); pintaMenu(); })); c.append(l);
      }
      c.append(el('h3', '', 'Roupas'));
      for (const r of s.roupas) { const R = C.ROUPAS[r], l = el('div', 'linha' + (s.roupa === r ? ' atual' : '')), d = el('div', 'l-txt'), q0 = el('div'); q0.append(el('b', '', R.nome), el('small', '', R.desc)); d.append(q0); l.append(d); if (s.roupa !== r) l.append(botao('Vestir', () => { J.vestir(r); pintaMenu(); })); c.append(l); }
      if (s.amuletos.length) { c.append(el('h3', '', 'Amuletos (' + s.amu.length + ' de 2)')); for (const a of s.amuletos) { const A = C.AMULETOS[a], usa = s.amu.includes(a), l = el('div', 'linha' + (usa ? ' atual' : '')), t = el('div', 'l-txt'), d = el('div'); t.append(ic('a_' + a)); d.append(el('b', '', A.nome), el('small', '', A.desc)); t.append(d); l.append(t, botao(usa ? 'Tirar' : 'Pendurar', () => { J.poeAmuleto(a); pintaMenu(); })); c.append(l); } }
      if (s.tocha > 0 || s.inv.tocha > 0) { c.append(el('h3', '', 'Tocha')); c.append(botao(s.tochaAcesa ? 'Apagar a tocha (restam ' + Math.ceil(s.tocha / 60) + ' min)' : s.tocha > 0 ? 'Acender a tocha (restam ' + Math.ceil(s.tocha / 60) + ' min)' : 'Acender uma tocha', () => { J.tocha(); pintaMenu(); })); }
      if (s.magias.length > 1) { c.append(el('h3', '', 'Magia do segundo botão')); for (const m of s.magias.slice(1)) { const l = el('div', 'linha' + (s.magia2 === m ? ' atual' : '')), d = el('div', 'l-txt'), q = el('div'); q.append(el('b', '', C.MAGIAS[m].nome), el('small', '', C.MAGIAS[m].desc)); d.append(q); l.append(d); if (s.magia2 !== m) l.append(botao('Usar esta', () => { s.magia2 = m; J.salvar(); pintaMenu(); montaMagias(); })); c.append(l); } }
      c.append(el('h3', '', 'Materiais'));
      const g = el('div', 'grade'); let n = 0;
      for (const m in C.MAT) if (s.inv[m] > 0) { n++; const q = el(C.COMER[m] ? 'button' : 'div', 'mat'); q.append(ic(m === 'curativo' ? 'trapo' : m), el('em', '', s.inv[m]), el('small', '', C.MAT[m])); if (C.COMER[m]) q.onclick = () => { J.comer(m); pintaMenu(); }; g.append(q); }
      c.append(n ? g : el('p', 'nota', 'Vazia. A floresta tem o que você precisa.'));
      if (n) c.append(el('p', 'nota', 'Clique em comida ou erva para usar.'));
    } else if (aba === 'pericias') {
      const f = h.ficha, q = el('div', 'ficha');
      for (const [a, b] of [['Vida', Math.ceil(h.hp) + ' / ' + f.vida], ['Fôlego', f.vigor], ['Dano', Math.round(f.dano)], ['Defesa', Math.round(f.def * 100) + '%'], ['Crítico', Math.round(f.critico * 100) + '%'], ['Velocidade', Math.round(f.vel * 100) + '%']]) q.append(el('span', '', a), el('em', '', b));
      c.append(q, el('p', 'nota', 'Tudo cresce com a repetição. Ninguém dá pontos a você.'));
      for (const k in C.PERICIAS) { const p = s.per[k] || { n: 0, x: 0 }, l = el('div', 'per'), b = el('div', 'per-b'), i = el('i'); i.style.width = Math.min(100, (p.x / C.xpNivel(p.n)) * 100) + '%'; b.append(i); const tt = el('div', 'per-t'); tt.append(el('b', '', C.PERICIAS[k][0]), el('small', '', C.PERICIAS[k][1]), el('em', '', p.n)); l.append(tt, b); c.append(l); }
    } else if (aba === 'titulos') {
      for (const e in C.ESPECIES) {
        const n = s.mortes[e] || 0; c.append(el('h3', '', C.ESPECIES[e].nome + ': ' + n));
        for (const t of C.TITULOS[e]) { const l = el('div', 'linha' + (n >= t[0] ? ' atual' : '')), d = el('div', 'l-txt'), q = el('div'); q.append(el('b', '', t[1]), el('small', '', t[2])); d.append(q); l.append(d, el('em', 'quanto', n >= t[0] ? 'seu' : n + '/' + t[0])); c.append(l); }
      }
    } else {
      for (const [k, n] of [['efeitos', 'Efeitos'], ['ambiente', 'Ambiente'], ['musica', 'Música']]) { const l = el('label', 'vol'), r = el('input'); r.type = 'range'; r.min = 0; r.max = 1; r.step = 0.05; r.value = Som.vol[k]; r.oninput = () => Som.mudaVolume(k, +r.value); l.append(el('span', '', n), r); c.append(l); }
      c.append(el('h3', '', 'Controles'));
      const t = toque ? ['Arraste o lado esquerdo: andar, mirar para cima e para baixo', 'Segure Forte: golpe carregado', 'Com o arco, segure Golpe para puxar mais'] : ['A/D andar · Espaço pular · J ou clique: golpe (W ou S muda a direção)', 'K ou botão direito: golpe forte, segure · Shift ou L: esquiva', 'R e F magias · Q comer · E usar · T trocar arma · V tocha · M mapa · I ou Esc menu', 'Com o arco, segure o golpe para puxar mais', 'Controle: A pula, X golpe, B esquiva, Y usar, RB/LB magias, RT forte, LT comer, Select arma'];
      for (const q of t) c.append(el('p', 'nota', q));
      c.append(botao('Guardar e sair para o título', () => { J.salvar(); titulo(); }));
    }
  }

  function retratoBicho(t, visto) { const c2 = document.createElement('canvas'); c2.width = 54; c2.height = 46; c2.className = 'ic bicho'; const q = c2.getContext('2d'), tp = C.TIPOS[t], im = D.img['m_' + tp.spr], mt = window.ARTE2.monstros[tp.spr]; q.imageSmoothingEnabled = false; if (im) { const e = Math.min(54 / mt.w, 46 / mt.h, 1); q.drawImage(im, 0, 0, mt.w, mt.h, (54 - mt.w * e) / 2, 46 - mt.h * e, mt.w * e, mt.h * e); if (!visto) { q.globalCompositeOperation = 'source-in'; q.fillStyle = '#1c2624'; q.fillRect(0, 0, 54, 46); } } return c2; }
  // ---------- mapa: o perfil de cada área, só do que você já andou ----------
  const CORES = { fogo: '#ffb050', apagado: '#6a6a60', porta: '#9fd8ff', bau: '#ffe2a0', marco: '#c8b890', emb: '#d0483a', circulo: '#7ff0ff', voce: '#ffffff', covil: '#d0483a' };
  function pintaMapa(c) {
    const s = J.save, atual = F.atual;
    const leg = el('div', 'legenda'); for (const [k, n] of [['voce', 'você'], ['fogo', 'fogueira'], ['porta', 'passagem'], ['marco', 'lugar'], ['bau', 'baú visto'], ['emb', 'emboscada'], ['circulo', 'círculo']]) { const i = el('span', '', n), b = el('i'); b.style.background = CORES[k]; i.prepend(b); leg.append(i); }
    c.append(leg);
    const ordem = [atual.id, ...F.IDS.filter((id) => id !== atual.id && s.visitas[id] && s.mapa[id])];
    for (const id of ordem) {
      const A = F.area(id), m = s.mapa[id] || '', bloco = el('div', 'mapa' + (id === atual.id ? ' aqui' : '')), tot = A.marcos.length, vi = A.marcos.filter((q) => s.marcos[q.id]).length, bt = A.baus.length, bv = A.baus.filter((q) => s.baus[q.id]).length;
      const pct = Math.round((m.split('1').length - 1) / Math.max(1, Math.ceil(A.W / 20)) * 100);
      bloco.append(el('b', '', nomeArea(id)), el('small', '', Math.min(100, pct) + '% andado' + (tot ? ' · lugares ' + vi + '/' + tot : '') + (bt ? ' · baús ' + bv + '/' + bt : '')));
      const cv2 = el('canvas'), W = Math.max(220, Math.min(1400, Math.round(A.W * 0.62))), H2 = 74; cv2.width = W; cv2.height = H2; const q = cv2.getContext('2d'), kx = W / A.W, ky = H2 / 40, Y = (ty) => (ty - 6) * ky, R = C.REGIOES[A.regiao];
      q.fillStyle = '#0a1011'; q.fillRect(0, 0, W, H2);
      for (let k = 0; k < m.length; k++) if (m[k] === '1') { const x0 = k * 20, x1 = Math.min(A.W, x0 + 20); const gr = q.createLinearGradient(0, 0, 0, H2); gr.addColorStop(0, 'rgba(' + R.nevoa + ',0.10)'); gr.addColorStop(1, 'rgba(' + R.nevoa + ',0.30)'); q.fillStyle = gr; q.fillRect(x0 * kx, 0, (x1 - x0) * kx + 1, H2); for (let tx = x0; tx < x1; tx++) { q.fillStyle = 'rgb(' + R.terra.map((v) => v + 16).join(',') + ')'; q.fillRect(tx * kx, Y(A.topo[tx]), kx + 1, H2); q.fillStyle = 'rgba(' + R.nevoa + ',0.9)'; q.fillRect(tx * kx, Y(A.topo[tx]), kx + 1, 1.5); } for (const e of A.escuros) if (!e.oco && e.x0 / 16 < x1 && e.x1 / 16 > x0) { q.fillStyle = 'rgb(' + R.terra.map((v) => v + 16).join(',') + ')'; const a = Math.max(x0, e.x0 / 16), b = Math.min(x1, e.x1 / 16); q.fillRect(a * kx, Y(e.y0 / 16 - 6), (b - a) * kx, 6 * ky); } }
      const visto = (x) => m[Math.floor(x / 16 / 20)] === '1';
      const ponto = (x, y, cor, r, forma) => { const px = x / 16 * kx, py = Math.max(6, Math.min(H2 - 6, Y(y / 16) - 5)); q.fillStyle = '#05080a'; q.strokeStyle = cor; q.beginPath(); if (forma === 'q') q.rect(px - r - 1, py - r - 1, r * 2 + 2, r * 2 + 2); else if (forma === 'l') { q.moveTo(px, py - r - 2); q.lineTo(px + r + 2, py); q.lineTo(px, py + r + 2); q.lineTo(px - r - 2, py); } else q.arc(px, py, r + 1.5, 0, 7); q.fill(); q.fillStyle = cor; q.beginPath(); if (forma === 'q') q.rect(px - r, py - r, r * 2, r * 2); else if (forma === 'l') { q.moveTo(px, py - r); q.lineTo(px + r, py); q.lineTo(px, py + r); q.lineTo(px - r, py); } else q.arc(px, py, r, 0, 7); q.fill(); };
      for (const e of A.emboscadas) if (s.emb[e.id]) ponto((e.x0 + e.x1) / 2, e.piso, CORES.emb, 2.5, 'l');
      for (const p of A.marcos) if (s.marcos[p.id]) ponto(p.x, p.y, CORES.marco, 3, 'l');
      for (const b of A.baus) if (!s.baus[b.id] && visto(b.x) && (s.amu.includes('olho') || !A.escuros.some((e) => e.oco && b.x > e.x0 && b.x < e.x1 && !A.fracas.some((f) => s.fracas[f.id] && f.c0 * 16 >= e.x0 && f.c1 * 16 <= e.x1)))) ponto(b.x, b.y, CORES.bau, 2.5, 'q');
      for (const p of A.circulos) if (visto(p.x)) ponto(p.x, p.y, CORES.circulo, 3);
      for (const p of A.portas) if (visto(p.x)) ponto(p.x, p.y, p.id === 'covil' ? CORES.covil : CORES.porta, 3.5, 'q');
      for (const f of A.fogos) if (visto(f.x)) ponto(f.x, f.y, s.fogos[f.id] ? CORES.fogo : CORES.apagado, 3.5);
      if (id === atual.id) { const h = J.heroi, px = h.x / 16 * kx, py = Y(h.y / 16) - 14; q.fillStyle = '#05080a'; q.beginPath(); q.moveTo(px - 6, py - 5); q.lineTo(px + 6, py - 5); q.lineTo(px, py + 6); q.fill(); q.fillStyle = CORES.voce; q.beginPath(); q.moveTo(px - 4.5, py - 4); q.lineTo(px + 4.5, py - 4); q.lineTo(px, py + 4); q.fill(); }
      const rol = el('div', 'mapa-rola'); rol.append(cv2); bloco.append(rol);
      const ls = A.marcos.filter((p) => s.marcos[p.id]); if (ls.length) bloco.append(el('small', 'lugares', ls.map((p) => p.nome).join(' · ')));
      const pt = A.portas.filter((p) => visto(p.x)); if (pt.length) bloco.append(el('small', 'lugares', 'Passagens: ' + pt.map((p) => p.nome).join(' · ')));
      c.append(bloco);
      if (id === atual.id) requestAnimationFrame(() => { rol.scrollLeft = J.heroi.x / 16 * kx - rol.clientWidth / 2; });
    }
  }

  // ---------- HUD ----------
  let hudT = 0;
  function atualizaMochila() { const s = J.save; let p = false; for (const r of C.RECEITAS) if (r.tipo && r.tipo !== 'item' && J.pode(r) && !J.jaTem(r)) p = true; $('h-mochila').classList.toggle('novo', p); const b = document.querySelector('#botoes [data-a=menu]'); if (b) b.classList.toggle('novo', p); void s; }
  function vesteRetrato() { const c = $('retrato-c'), q = c.getContext('2d'); q.imageSmoothingEnabled = false; q.clearRect(0, 0, 34, 34); const im = D.img['h_' + J.save.roupa]; if (im) q.drawImage(im, 26, 12, 44, 44, -2, 0, 44, 44); montaMagias(); atualizaMochila(); }
  function montaMagias() { const m = $('h-magias'); m.innerHTML = ''; const s = J.save; [s.magias[0], s.magia2].forEach((id, i) => { if (!id) return; const d = el('div', 'mg'); d.style.color = C.MAGIAS[id].cor; d.append(el('u', '', C.MAGIAS[id].nome[0]), el('b', '', toque ? '' : i ? 'F' : 'R'), el('s')); d.dataset.id = id; m.append(d); }); for (const [a, v] of [['magia1', s.magias[0]], ['magia2', s.magia2]]) { const b = document.querySelector('#botoes [data-a=' + a + ']'); if (b) { b.hidden = !v; if (v) b.textContent = C.MAGIAS[v].nome.split(' ')[0]; } } $('b-sina').hidden = !s.magias.length; }
  let vistas = '';
  function hud(dt) {
    hudT -= dt; if (hudT > 0) return; hudT = 0.06;
    const h = J.heroi, f = h.ficha, s = J.save, pc = (v, m) => Math.max(0, Math.min(100, (v / m) * 100)) + '%';
    const bv = $('b-vida'); bv.children[0].style.width = bv.children[1].style.width = pc(h.hp, f.vida); bv.style.width = Math.min(340, 150 + f.vida) + 'px';
    $('b-vigor').children[0].style.width = pc(h.vigor, f.vigor); $('b-fome').children[0].style.width = pc(s.fome, 100); $('b-fome').classList.toggle('pouco', s.fome < 20); $('b-sina').children[0].style.width = pc(h.sina, f.sina);
    const chave = s.arma + (s.inv.flecha || 0) + s.magias.length + s.magia2 + (s.titulo || '') + (s.inv.fruta || 0) + (s.inv.erva || 0) + (s.inv.carne || 0) + 's' + (s.inv.seca || 0) + 'p' + (s.inv.peixe || 0) + (s.inv.curativo || 0) + (s.afiado[s.arma] || 0);
    if (chave !== vistas) {
      vistas = chave;
      const a = $('h-arma'); a.innerHTML = ''; if (s.arma !== 'punho') a.append(ic(s.arma, 34)); a.append(el('span', '', C.ARMAS[s.arma].nome + (s.afiado[s.arma] ? ' +' + s.afiado[s.arma] : '') + (C.ARMAS[s.arma].tiro ? ' · ' + (s.inv.flecha || 0) : '')));
      const q = $('h-comida'); q.innerHTML = ''; for (const m of ['fruta', 'peixe', 'carne', 'seca', 'erva', 'curativo']) if (s.inv[m] > 0) { const k = el('span'); k.append(ic(m === 'curativo' ? 'trapo' : m, 22), document.createTextNode(s.inv[m])); q.append(k); }
      $('h-titulo').textContent = s.nome + (s.titulo ? ', ' + s.titulo : ''); montaMagias();
    }
    const tc = $('h-tocha'); tc.hidden = !(s.tocha > 0); if (s.tocha > 0) { tc.classList.toggle('acesa', !!s.tochaAcesa); tc.style.setProperty('--k', s.tocha / 300); } const bt = document.querySelector('#botoes [data-a=tocha]'); if (bt) { bt.hidden = !(s.tocha > 0 || s.inv.tocha > 0); bt.classList.toggle('ativa', !!s.tochaAcesa); }
    const tdia = 'Dia ' + s.dia + ' · ' + J.nomeHora() + (J.clima.tipo !== 'limpo' && J.clima.forca > 0.3 ? ' · ' + J.NOMECLIMA[J.clima.tipo] : '') + (J.raid ? ' · onda ' + Math.max(1, J.raid.n + 1) + ' de ' + J.raid.total : ''); if ($('h-dia').textContent !== tdia) { $('h-dia').textContent = tdia; $('h-dia').classList.toggle('noite', J.ehNoite()); }
    const H = s.hum, hv = H && J.hum && !J.hum.perdida; $('h-hum').hidden = !hv; if (hv) { $('h-hum').firstElementChild.textContent = H.nome + (J.hum.caida ? ' caiu!' : ''); $('b-hum').children[0].style.width = pc(J.hum.hp, J.hum.hpMax); $('b-hfome').children[0].style.width = pc(H.fome, 100); $('b-laco').children[0].style.width = pc(H.laco, 100); }
    for (const d of $('h-magias').children) { const M = C.MAGIAS[d.dataset.id]; d.classList.toggle('falta', h.sina < M.custo); d.lastChild.style.transform = 'scaleY(' + Math.min(1, (h.espera[d.dataset.id] || 0) / M.espera) + ')'; }
    const c = J.chefeAtivo; $('chefe').hidden = !c; if (c) { $('chefe-nome').textContent = c.T.nome; const b = $('b-chefe'); b.children[0].style.width = b.children[1].style.width = pc(c.hp, c.hpMax); }
    const p = modo === 'jogo' && h.estado === 'livre' ? J.perto() : null, u = $('usar');
    if (p) { u.hidden = false; const t = rotulo(p); if (u.dataset.t !== t) { u.dataset.t = t; u.innerHTML = ''; u.append(el('b', '', toque ? 'Usar' : 'E'), document.createTextNode(t)); } } else u.hidden = true;
  }

  // ---------- teclado e mouse ----------
  const TECLAS = { KeyA: 'esq', ArrowLeft: 'esq', KeyD: 'dir', ArrowRight: 'dir', KeyW: 'cima', ArrowUp: 'cima', KeyS: 'baixo', ArrowDown: 'baixo', Space: 'pula', KeyZ: 'pula', KeyK: 'forte', KeyJ: 'golpe', KeyX: 'golpe' };
  const APERTA = { Space: 'pula', KeyZ: 'pula', KeyJ: 'golpe', KeyX: 'golpe', KeyL: 'rola', KeyC: 'rola', ShiftLeft: 'rola', ShiftRight: 'rola', KeyR: 'magia1', KeyF: 'magia2', KeyQ: 'come' };
  addEventListener('keydown', (ev) => {
    if (ev.target.tagName === 'INPUT' && ev.target.type !== 'range') { if (ev.code === 'Enter') { if (modo === 'batiza') batiza(); else if (modo === 'nasce') daNome(); else ev.target.blur(); } return; }
    if (sono) { if (!ev.repeat) pulaSono = true; ev.preventDefault(); return; }
    if (window.Som) Som.ligar();
    if (modo === 'nasce') { if (!ev.repeat && ['Space', 'Enter', 'KeyE'].includes(ev.code)) { ev.preventDefault(); proximaLinha(); } return; }
    if (ev.code === 'Escape' || ev.code === 'KeyI' || ev.code === 'Tab') { ev.preventDefault(); if (modo === 'jogo') { if (!acorda && !sono) abreMenu(ev.code === 'Escape' ? 'opcoes' : null); } else if (modo === 'menu' || modo === 'fogo') voltar(); return; }
    if (modo !== 'jogo') return;
    if (TECLAS[ev.code]) J.ent[TECLAS[ev.code]] = 1;
    if (!ev.repeat) {
      if (APERTA[ev.code]) J.aperta(APERTA[ev.code]);
      if (ev.code === 'KeyE') usar();
      if (ev.code === 'KeyT') J.proximaArma();
      if (ev.code === 'KeyV') J.tocha();
      if (ev.code === 'KeyM') abreMenu('mapa');
      if (/^Digit[1-9]$/.test(ev.code)) { const l = C.ORDEM_ARMAS.filter((a) => J.save.armas.includes(a)); if (l[+ev.code[5] - 1]) J.empunhar(l[+ev.code[5] - 1]); }
    }
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(ev.code)) ev.preventDefault();
  });
  addEventListener('keyup', (ev) => { if (TECLAS[ev.code]) J.ent[TECLAS[ev.code]] = 0; });
  const cv = $('c');
  cv.addEventListener('mousedown', (ev) => { if (toque) return; if (window.Som) Som.ligar(); if (modo !== 'jogo') return; if (ev.button === 0) { J.aperta('golpe'); J.ent.golpe = 1; } if (ev.button === 2) J.ent.forte = 1; });
  addEventListener('mouseup', (ev) => { if (toque) return; if (ev.button === 0) J.ent.golpe = 0; if (ev.button === 2) J.ent.forte = 0; });
  addEventListener('contextmenu', (ev) => { if (ev.target.tagName !== 'INPUT') ev.preventDefault(); });
  addEventListener('blur', solta);
  addEventListener('visibilitychange', () => { if (document.hidden && J.save && J.heroi) J.salvar(); });
  $('n-ir').onclick = daNome; $('bt-ir').onclick = batiza;
  $('nasce').addEventListener('pointerdown', (ev) => { if (window.Som) Som.ligar(); if (!ev.target.closest('#n-pede')) proximaLinha(); });
  $('m-fechar').onclick = voltar; $('fg-sair').onclick = voltar; $('h-mochila').onclick = () => { if (modo === 'jogo') abreMenu(); };
  $('usar').addEventListener('pointerdown', usar);

  // ---------- toque ----------
  if (toque) {
    document.body.classList.add('toque');
    const zona = $('zona-manche'), man = $('manche'), bola = man.querySelector('i');
    let id = null, ox = 0, oy = 0;
    zona.addEventListener('pointerdown', (ev) => { ev.preventDefault(); if (id !== null) return; Som.ligar(); id = ev.pointerId; ox = ev.clientX; oy = ev.clientY; man.style.left = ox - 58 + 'px'; man.style.top = oy - 58 + 'px'; man.style.bottom = 'auto'; man.classList.add('vivo'); try { zona.setPointerCapture(id); } catch (e) { /* ponteiro sintético */ } });
    zona.addEventListener('pointermove', (ev) => {
      if (ev.pointerId !== id) return;
      let dx = ev.clientX - ox, dy = ev.clientY - oy; const d0 = Math.hypot(dx, dy);
      if (d0 > 56) { ox += (dx / d0) * (d0 - 56); oy += (dy / d0) * (d0 - 56); dx = ev.clientX - ox; dy = ev.clientY - oy; man.style.left = ox - 58 + 'px'; man.style.top = oy - 58 + 'px'; }
      const d = Math.min(40, Math.hypot(dx, dy)), a = Math.atan2(dy, dx);
      bola.style.transform = 'translate(' + Math.cos(a) * d + 'px,' + Math.sin(a) * d + 'px)';
      J.ent.esq = dx < -13 ? 1 : 0; J.ent.dir = dx > 13 ? 1 : 0; J.ent.cima = dy < -28 && Math.abs(dy) > Math.abs(dx) * 0.7 ? 1 : 0; J.ent.baixo = dy > 28 && Math.abs(dy) > Math.abs(dx) * 0.7 ? 1 : 0;
    });
    const fim = (ev) => { if (ev.pointerId !== id) return; id = null; J.ent.esq = J.ent.dir = J.ent.cima = J.ent.baixo = 0; bola.style.transform = ''; man.classList.remove('vivo'); man.style.top = man.style.left = man.style.bottom = ''; };
    zona.addEventListener('pointerup', fim); zona.addEventListener('pointercancel', fim); zona.addEventListener('lostpointercapture', fim);
    for (const b of document.querySelectorAll('#botoes button')) {
      const a = b.dataset.a;
      b.addEventListener('pointerdown', (ev) => {
        ev.preventDefault(); Som.ligar(); b.classList.add('ativa');
        if (a === 'menu') { if (modo === 'jogo' && !acorda) abreMenu(); return; }
        if (a === 'arma') { J.proximaArma(); return; }
        if (a === 'tocha') { J.tocha(); return; }
        if (a === 'usa') { usar(); return; }
        if (a === 'pula') J.ent.pula = 1;
        if (a === 'golpe') J.ent.golpe = 1;
        if (a === 'forte') { J.ent.forte = 1; return; }
        J.aperta(a);
      });
      const f2 = () => { b.classList.remove('ativa'); if (a === 'pula' || a === 'forte' || a === 'golpe') J.ent[a] = 0; };
      b.addEventListener('pointerup', f2); b.addEventListener('pointercancel', f2); b.addEventListener('pointerleave', f2);
    }
  }

  // ---------- controle (gamepad) ----------
  const antesPad = {}; let padUsado = false;
  function controle() {
    const pad = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find((q) => q && q.connected); if (!pad) return;
    const bt = (i) => !!(pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > 0.5)), ax = pad.axes[0] || 0, ay = pad.axes[1] || 0, novo = {};
    for (let i = 0; i < 16; i++) { const v = bt(i); novo[i] = v && !antesPad[i]; antesPad[i] = v; }
    const ativo = Math.abs(ax) > 0.35 || Math.abs(ay) > 0.5 || pad.buttons.some((q) => q.pressed);
    if (window.Som && pad.buttons.some((b) => b.pressed)) Som.ligar();
    if (modo === 'jogo') {
      if (!ativo && padUsado) { padUsado = false; solta(); }
      if (!ativo) return;
      padUsado = true;
      J.ent.esq = ax < -0.35 || bt(14) ? 1 : 0; J.ent.dir = ax > 0.35 || bt(15) ? 1 : 0; J.ent.cima = ay < -0.5 || bt(12) ? 1 : 0; J.ent.baixo = ay > 0.5 || bt(13) ? 1 : 0;
      J.ent.pula = bt(0) ? 1 : 0; J.ent.forte = bt(7) ? 1 : 0; J.ent.golpe = bt(2) ? 1 : 0;
      for (const [i, a] of [[0, 'pula'], [2, 'golpe'], [1, 'rola'], [5, 'magia1'], [4, 'magia2'], [6, 'come']]) if (novo[i]) J.aperta(a);
      if (novo[3]) usar(); if (novo[8]) J.proximaArma(); if (novo[9] && !acorda) abreMenu();
    } else if ((modo === 'menu' || modo === 'fogo') && (novo[1] || novo[9])) voltar();
    if (sono && (novo[0] || novo[1])) pulaSono = true;
    else if (modo === 'nasce' && novo[0]) proximaLinha();
    else if ((modo === 'titulo' || modo === 'morte') && novo[0]) { const b = document.querySelector('#' + modo + ' button.ir'); if (b) b.click(); }
  }

  // ---------- nascimento: partículas de barro e luz ----------
  function passoNasce(dt) {
    const c = $('n-part'), q = c.getContext('2d'); if (c.width !== innerWidth) { c.width = innerWidth; c.height = innerHeight; }
    q.clearRect(0, 0, c.width, c.height); nas.t += dt;
    const W = c.width, H = c.height, cx = W * 0.515, cy = H * 0.66;
    if (nas.part.length < 130) { const lado = Math.random(); nas.part.push(lado < 0.5 ? { b: 1, x: cx + (Math.random() - 0.5) * W * 0.35, y: H * 0.86, t: 0, d: 1.6 + Math.random() * 2 } : { b: 0, x: cx + (Math.random() - 0.5) * W * 0.5, y: -10, vy: 26 + Math.random() * 40, t: 0, d: 8 }); }
    for (const p of nas.part) { p.t += dt; if (p.b) { const k = p.t / p.d, e = k * k; const x = p.x + (cx - p.x) * e + Math.sin(k * 9) * 12 * (1 - k), y = p.y + (cy - p.y) * e; q.globalAlpha = Math.sin(Math.min(1, k) * Math.PI) * 0.9; q.fillStyle = k > 0.7 ? '#ff9a50' : '#8a4a2a'; q.fillRect(x, y, 4, 4); } else { p.y += p.vy * dt; q.globalAlpha = 0.5 * Math.sin(Math.min(1, p.t / 2) * Math.PI / 2) * Math.max(0, 1 - p.y / H); q.fillStyle = '#ffe6a0'; q.fillRect(p.x + Math.sin(p.t * 1.4) * 8, p.y, 3, 3); } }
    nas.part = nas.part.filter((p) => p.t < p.d && p.y < H); q.globalAlpha = 1;
  }

  // ---------- que música toca agora ----------
  let musT = 0, calor = 0;
  const FORA = ['vaga', 'volta', 'caido', 'morto', 'foge'];
  function musicaDaHora(dt) {
    musT -= dt; J.silencio = Math.max(0, (J.silencio || 0) - dt); if (musT > 0 || !window.Som) return; const passo = 0.25 - musT; musT = 0.25;
    const h = J.heroi, A = F.atual; let m = 'floresta';
    if (modo === 'morte' || h.estado === 'morto' || acorda) m = null;
    else if (J.chefeAtivo) m = 'chefao';
    else {
      // a batalha entra com emboscada, ataque ao lar ou bando de verdade em cima de você; sai devagar
      let perto = 0; for (const e of J.inimigos) if (e.vivo && !FORA.includes(e.estado) && Math.abs(e.x - h.x) < 330 && Math.abs(e.y - h.y) < 150) perto += e.T.bruto ? 2 : 1;
      calor = J.emb || J.raid ? 6 : perto >= 2 ? Math.min(6, calor + passo * 4) : perto ? Math.max(0, calor - passo * 0.25) : Math.max(0, calor - passo * 1.3);
      tocando = calor > (tocando ? 0.4 : 3.2);
      if (tocando) m = 'batalha';
      else if (J.silencio > 0) m = null;
      else if (h.estado === 'dorme' || modo === 'fogo') m = 'calma';
      else if (A.id === 'lar' && !J.ehNoite()) m = 'calma';
      else if (A.arena && J.inimigos.some((e) => e.T.chefe && e.vivo)) m = null; // antes do dono, só o vento
    }
    Som.musica(m);
  }
  let tocando = false;
  addEventListener('pointerdown', () => window.Som && Som.ligar());

  // ---------- laço ----------
  let antes = performance.now();
  function quadro(dt) {
    controle();
    if (modo === 'nasce') passoNasce(dt);
    if (J.heroi && ['jogo', 'menu', 'fogo', 'morte', 'batiza'].includes(modo)) {
      if (modo === 'jogo' || modo === 'morte') { if (modo === 'jogo') { passoAcorda(dt); passoDormir(dt); if (batizar && !sono && J.heroi.estado === 'livre') abreBatiza(); } if (!viajando) J.passo(dt); }
      D.quadro(dt); musicaDaHora(dt);
      if (modo !== 'morte') hud(dt);
      if (modo === 'jogo' && !acorda) {
        const h = J.heroi, A = F.atual;
        if (areaVista !== A.id) { areaVista = A.id; J.mostraArea(nomeArea(A.id)); if (window.Som) { Som.ambiente(C.REGIOES[A.regiao].amb); Som.prepara('batalha'); if (A.arena) Som.prepara('chefao'); } }
        for (const p of A.placas) if (Math.abs(p.x - h.x) < 46 && Math.abs(p.y - h.y) < 70) dica(p.dica);
        if (J.save.fome < 25) dica('comer');
        if (window.Som) { Som.chuva(J.cl('chuva', 'tempestade') * (J.abrigado() ? 0.18 : 0.55)); let k = 0; for (const f of A.fogos) if (J.save.fogos[f.id]) k = Math.max(k, 1 - Math.abs(f.x - h.x) / 240); Som.fogueira(Math.max(0, k) * 0.6); }
      }
    }
    sussT -= dt; if (sussT <= 0) $('sussurro').classList.remove('ver');
    areaT -= dt; if (areaT <= 0) $('area').classList.remove('ver');
  }
  function laco(agora) { const dt = Math.min(1 / 30, (agora - antes) / 1000); antes = agora; quadro(dt); requestAnimationFrame(laco); }

  D.iniciar(cv);
  $('carrega').textContent = 'Moldando o barro...';
  D.carregar((k) => { $('carrega').textContent = 'Moldando o barro... ' + Math.round(k * 100) + '%'; }).then(() => { try { sessionStorage.removeItem('sina_tenta'); } catch (e) { /* nada */ } titulo(); requestAnimationFrame(laco); });
  window.SINA = { acordaComo, titulo, dormir, abreFala, J, F, D, C, quadro, abreMenu, voltar, continuar, nascer, daNome, get modo() { return modo; } };
})();
