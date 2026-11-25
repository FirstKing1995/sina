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
6. **Próximas fases:** a vila e a cidade.

## Regras

- **Morreu, começou do zero.** Com um filho crescido (cinco dias), o jogador continua nele com 65% das perícias; com baú, herda a mochila inteira.
- **Perícias crescem com o uso:** armas, magia, corpo, fôlego, pernas, coleta, ofício. Ofício libera receitas melhores.
- **Títulos por espécie:** 25, 100 e 250 mortes. Em 100 vem uma habilidade (Caçador de Lobos corre mais e esquiva barato, e assim por diante).
- **Fome** cai com o tempo; em zero, tira vida. Comer com Q. Cobras envenenam; erva e curativo limpam.
- **Bando (`js/bando.js`):** reagem ao golpe (saltam para trás, pulam por cima, aparam), fintam, revidam no meio da sequência, vão às suas costas e castigam quem come, carrega ou fica sem fôlego. A esperteza e a força crescem com o caminho e com as mortes da espécie. `node tools/lateral-luta.js` mede a dificuldade.
- **Donos (`js/donos.js`):** três fases cada, com golpes próprios. Atrasam o golpe de quem esquiva cedo, devolvem quem só bate, castigam quem come ou carrega. Golpes fortes quebram a postura e abrem brecha. `node tools/lateral-donos.js` simula os duelos.
- **Variedades:** lobos cinzento, negro e vermelho; cobras comum, cuspideira, coral e de prata; mortos, a que grita, do machado, caçadora e inchado; goblins da faca, da funda, arqueiro, xamã, guerreiro e bruto.
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
