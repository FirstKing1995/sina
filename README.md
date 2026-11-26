# SINA · O Primeiro

Jogo de sobrevivência e ação em pixel art dark fantasy, visto de lado. Roda no navegador, sem instalar nada.
Publicado em https://firstking1995.github.io/sina/.

- **Versão principal:** raiz (`index.html`, `js/`, `css/`, `assets/barro`, `assets/floresta`).
- **2D anterior (Ermo das Covas, Lobisomem):** `2d-v2/` e, antes dela, `2d-v1/`.
- **Versão vista de cima:** `cima/`. **v0.3.4 antiga:** `antigo/`. Cada uma tem o próprio save.

## A história até aqui

Um deus molda o primeiro homem do barro e vai embora. O jogador dá o nome. Ele nasce nu, sem arma e sem poder, numa floresta antiga.

1. **Floresta Antiga** (fase longa): colher galho, pedra, folha, fibra e fruta; fazer a primeira arma e a roupa de folhas; sete fogueiras, cinco emboscadas e variedades de cada espécie pelo caminho; o círculo das ruínas ensina a Brasa do Barro.
2. **Clareira:** quatro caminhos. Serra dos Uivos (lobos), Alagado das Presas (cobras), Chão dos Enterrados (zumbis) e Barrancos do Fortim (goblins). Dá para voltar a qualquer área.
3. **Cada caminho** tem duas saídas além do covil: uma trilha no meio e uma passagem no fim, que ligam um caminho ao outro. No covil está o dono do caminho e um círculo com outra magia.
4. **Vale do Rio Manso** (abre com dois donos derrotados): a humana perdida está cercada; é preciso protegê-la por três ondas.
5. **Clareira do Rio:** o lar. Barraca de folhas, de couro, cabana trançada, de toras e casa de pedra; cercas, estacas, varal, horta, baú e berço. Às 21 h a casa é atacada.
6. **Vila (`js/vila.js` e `js/cidade.js`):** quatro pessoas presas nos acampamentos do fundo dos caminhos. Soltas, vão morar na clareira: ferreiro (afia até +9), curandeira, caçador e vigia. Cada uma faz pedidos e, atendida, dá um bônus permanente (confiança até 5).
   Obras da vila: poço, celeiro, casas de família, torres, arsenal e praça. Famílias chegam de manhã se houver água, casa e comida; com fome três dias, vão embora. Estágios: acampamento, aldeia, vila (mercador a cada três dias) e cidade (bônus, e um cerco a cada sete dias).
7. **Próximas fases:** a definir com quem joga.

## Regras

- **Morreu, começou do zero (sem rever a abertura).** Acender ou dormir na fogueira guarda o jogo. Com um filho crescido (cinco dias), o jogador continua nele com 65% das perícias; com baú, herda a mochila inteira.
- **Perícias crescem com o uso:** armas, magia, corpo, fôlego, pernas, coleta, ofício. Ofício libera receitas melhores.
- **Títulos por espécie:** 25, 100 e 250 mortes. Em 100 vem uma habilidade (Caçador de Lobos corre mais e esquiva barato, e assim por diante).
- **Fome** cai com o tempo; em zero, tira vida. Comer com Q. Cobras envenenam; erva e curativo limpam.
- **Bando (`js/bando.js`):** reagem ao golpe (saltam para trás, pulam por cima, aparam), fintam, revidam no meio da sequência, vão às suas costas e castigam quem come, carrega ou fica sem fôlego. A esperteza e a força crescem com o caminho e com as mortes da espécie. `node tools/lateral-luta.js` mede a dificuldade.
- **Donos (`js/donos.js`):** três fases cada, com golpes próprios. Atrasam o golpe de quem esquiva cedo, devolvem quem só bate, castigam quem come ou carrega. Golpes fortes quebram a postura e abrem brecha. `node tools/lateral-donos.js` simula os duelos.
- **Variedades:** lobos cinzento, negro e vermelho; cobras comum, cuspideira, coral e de prata; mortos, a que grita, do machado, caçadora e inchado; goblins da faca, da funda, arqueiro, xamã, guerreiro e bruto.
- **Espólio:** roupas de pele de cobra, osso e prata, adaga de presa, lança de prata e oito amuletos (dois por vez; quatro só se acham em baús).
- **Lugares:** zonas com luz própria, grutas escuras, ruínas com baú no alto, acampamentos, chão rachado que esconde câmara (quebre com golpe para baixo ou forte) e lugares com história. Aba **Mapa** (M) desenha o que você já andou.
- **Armas (`C.ESTILOS`):** cada uma tem combo e golpe carregado próprios (gancho, atravessar, giro que apara, onda, salto, carga, leque de flechas). `node tools/lateral-armas.js` mede.
- **Clima (`js/clima.js`):** chuva, tempestade com raio, neblina, neve, ventania e cinza, cada um com efeito na luta.
- **Caderno:** anota cada bicho; com 10 mortes revela a fraqueza e dá 8% de dano.
- **Lar:** pesca no remanso, curtume para reforçar a roupa, a humana trabalha quando fica e os filhos têm falas e tarefas.
- **Sons:** passos por terreno, voz por espécie e impacto por arma (CC0, `tools/lateral-sons.sh`).
- **Tocha (V):** cinco minutos de luz; lobos e cobras hesitam, mortos e goblins veem de longe.
- **Formação:** quem persegue faz fila dos dois lados e não sobe em cima do outro.
- **Dia e noite:** um dia dura 12 minutos; de noite eles enxergam mais e batem mais forte. Deitar no fogo mostra o herói dormindo e passa as horas.
- **Humana (`js/lar.js`):** segue, atira pedra, usa lança, cura, colhe, tem fome e laço. Caída por 25 s, é levada para um dos caminhos e precisa ser resgatada. Com laço 60, cabana e berço, vêm os filhos.
- Golpe em quem não viu você causa 60% a mais; esquivar no último instante desacelera o tempo.

## Controles

| Ação | Teclado e mouse | Toque | Controle |
|---|---|---|---|
| Andar, mirar | A/D, W/S ou setas | lado esquerdo da tela | analógico |
| Pular | Espaço ou Z | Pular | A |
| Golpe (combo de 3; W para cima, S no ar para baixo) | J, X ou clique | Golpe | X |
| Golpe forte (segure) | K ou botão direito | Forte | RT |
| Esquiva, avanço no ar | Shift, L ou C | Esquiva | B |
| Magias | R e F | Brasa e a segunda | RB e LB |
| Comer | Q | Comer | LT |
| Usar, colher, entrar | E | Usar | Y |
| Trocar arma | T ou 1 a 9 | Arma | Select |
| Mochila e opções | I ou Esc | Mochila | Start |

## Código

`js/dados.js` conteúdo (espécies, armas, receitas, títulos, textos) · `js/fase.js` áreas montadas com semente fixa · `js/motor.js` regras · `js/bando.js` inimigos · `js/lar.js` dia, sono, emboscadas, humana, casa e filhos · `js/desenho.js` pintura em camadas num quadro de 320 px de altura · `js/main.js` telas e controles · `js/som.js`.
Arte: herói do PixelLab, roupas, monstros, fundos e enfeites pintados no Gemini e no ChatGPT (ver `ASSETS-TERCEIROS.md`).

## Interface e cenário vivo (25/11/2026)

- `js/menu.js`: o menu (trilho de abas, lista e detalhe), ícones do kit (`UI.ico`) e as preferências do jogador (`UI.pref`, guardadas em `sina_pref`).
- `js/toque.js`: controles de toque (manche solto, leque em volta do golpe, mira arrastando o golpe, editor de posição guardado em `sina_toque`), cartões de arma, trilho do caminho e o próximo passo.
- `js/vivo.js`: vento, capim que abre e é cortado, cipós e raízes, coisas enterradas, bichinhos, bandos ao longe, olhos na mata e os sons da natureza (`Som.bicho`).
- `css/jogo.css`: refeito; molduras em `assets/ui` (geradas por `tools/lateral-ui.py`).
- Para ver os controles de toque no computador: abrir com `?toque=1`.

## Dificuldade e câmera (26/11/2026)

- Três níveis escolhidos ao nascer (`C.NIVEIS` em `js/bando.js`, guardado em `save.nivel`): Barro mole, Barro duro e Pesadelo (sem mira assistida).
- Câmera em subpixel: o mundo anda em pixels inteiros e o quadro pronto desliza pela sobra (buffer com uma coluna e uma linha a mais).
- IA por distância: bicho parado longe pensa a cada três quadros. A arte das outras áreas carrega depois da primeira tela (`D.resto`).

## Mundo, sons, músicas e cenas (26/11/2026)

- `js/mundo.js`: árvores altas para escalar (manche para cima ou Usar), com ninho e itens lá em cima; terra fofa para a pá; veios de ferro e prata nos barrancos para a picareta; tocha fincada no chão (tecla B ou mochila).
- Coleta ao passar agora agacha rápido e pega (animação curta, sem parar o herói).
- Sons reais CC0 em `som/natureza` (créditos em `../referencias/sons/CREDITOS.md`); músicas novas do Suno por caminho, vila de dia, cerco e abertura.
- Cenas em vídeo (Gemini) em `assets/cenas`, listadas em `cenas.js`: abertura (atrás do texto do nascimento), floresta (fundo da tela inicial) e serra (primeira chegada).
