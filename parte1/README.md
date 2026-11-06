# SINA · Parte I: A Cripta da Alvorada

Primeira parte do SINA refeita como soulslike, com pixel art dark fantasy. Roda no navegador, sem instalar nada.

## Rodar

Pelo preview `sina-parte1` (porta 8792) ou com qualquer servidor estático nesta pasta.

## Controles

| Ação | Teclado e mouse | Toque |
|---|---|---|
| Andar | WASD ou setas | Manche à esquerda |
| Rolar (invulnerável no meio) | Espaço | Rolar |
| Golpe / golpe forte | Clique / botão direito (ou J / K) | Golpe / Forte |
| Beber da cabaça | Q | Beber |
| Usar | E | Usar |
| Mirar no inimigo | Tab | Mirar |

## Regras

- Golpes e rolamentos gastam vigor.
- Descansar na fogueira cura e enche a cabaça, mas levanta os inimigos de novo.
- Ao morrer, as brasas ficam onde você caiu. Morra de novo antes de buscá-las e elas se perdem.
- Brasas fortalecem Vida, Vigor e Força nas fogueiras.
- Na arena de um chefe, a névoa só se abre quando um dos dois cair.

## Caminho

Ermo das Covas → Ruínas de Alvorada (Benta) → Estrada dos Enforcados → Encruzilhada → Mata Funda → Toca dos Bandidos
(Zé Facão, chave de ferro) → descida com atalho de volta → Cemitério dos Sem-Nome → Cripta da Alvorada → Corpo-seco Guardião → de volta a Benta.

## Código

- `js/mapa.js`: o mapa (grafo de áreas e corredores). `js/conteudo.js`: inimigos, fogueiras, tesouros e falas.
- `js/jogo.js`: regras. `js/tela.js`: desenho e luz. `js/main.js`: controles e menus. `js/som.js`: som.
- `js/robo.js`: joga do início ao fim para testar. Abra com `?robo` e chame `SINA.robo({ imortal: true })`.
- Sprites: `python tools/parte1-montar.py`, a partir de `apps meus/sina`. Teste do mapa: `node test/parte1-mapa-test.js`.
- Peças de fora: `ASSETS-TERCEIROS.md`.
