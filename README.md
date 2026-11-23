# SINA · As Terras de Aruanã

RPG soulslike em pixel art dark fantasy, agora **em 2D visto de lado** (plataforma e ação). Roda no navegador, sem instalar nada.
Publicado em https://firstking1995.github.io/sina/.

- **Versão principal (2D, de lado):** raiz do projeto (`index.html`, `js/`, `css/`).
- **Versão vista de cima:** guardada inteira em `cima/` (abre em `/sina/cima/`). O save dela não se mistura com o da 2D.
- **v0.3.4 antiga:** `antigo/`.

## SINA 2D: o teste inicial

Uma fase contínua: **Ermo das Covas → Campos da Aurora → Mata Funda → Clareira do Uivo**, com o **Lobisomem** como chefe. São 3 fogueiras, 4 baús e cerca de 35 criaturas.

### Controles

| Ação | Teclado e mouse | Toque |
|---|---|---|
| Andar | A/D ou setas | Manche à esquerda |
| Pular (segure para ir mais alto) | Espaço (ou Z) | Pular |
| Golpe, combo de 3 | J, X ou clique | Golpe |
| Golpe para cima / para baixo no ar (quica) | W/S + golpe | manche para cima/baixo + Golpe |
| Golpe forte carregado | segure K ou botão direito | segure Forte |
| Esquiva (rolamento no chão, avanço no ar) | Shift, L ou C | Esquiva |
| Magias | R e F | Magia e Magia 2 |
| Beber da cabaça | Q | Beber |
| Usar, falar, descansar | E | Usar |
| Descer de um galho | S + Espaço | manche para baixo + Pular |
| Pausa e ficha | Esc ou I | Menu |

### Regras

- Golpes e esquivas gastam vigor. Acertar quem acabou de atacar causa 60% a mais.
- Cada golpe que acerta enche a **Sina** (orbe ao lado do retrato), que é gasta em magias.
- Inimigos ficam vermelhos antes de atacar. Balas inimigas podem ser rebatidas com um golpe.
- Fogueiras curam, enchem a cabaça e a Sina, mas levantam os mortos. Brasas sobem Vida, Vigor, Força e Sina.
- Ao morrer, as brasas ficam onde você caiu. Espinhos ferem e te devolvem ao último chão firme.

### Especialidades e magias

| Especialidade | Arma | R | F |
|---|---|---|---|
| Soldado | Espada | Guarda de Ferro | Golpe Sísmico (ondas pelo chão) |
| Caçador | Lança (estocada longa) | Passo de Caça | Lanças Fantasmas |
| Aprendiz de feitiço | Faca rápida | Seta de Brasa | Coluna de Fogo |
| Andarilho | Cajado | Segundo Fôlego | Lampejo da Sina (atordoa) |

### Acabamento dos personagens

Os personagens usam as mesmas folhas de perfil da versão de cima (`assets/herois/*/heroi_e.png`, `golpe_e.png`, `assets/spr/*_e.png` e `*_ge.png`), com acabamento feito por código em `js/sprites.js`: contorno escuro, luz de aro vinda da lua, clarão ao ser atingido, aviso vermelho antes do golpe, sombra, estica e amassa no pulo e no pouso, rastro na esquiva e arco de luz no golpe.

### Código (2D)

- `js/fase.js`: a fase (grade de blocos de 16 px montada por código), regiões, inimigos, fogueiras, baús, placas e enfeites.
- `js/conteudo.js`: criaturas vistas de lado. `js/heroi.js`: povos, especialidades, armas e magias.
- `js/motor.js`: física, combate, magias, IA e chefe. `js/desenho.js`: cenário em camadas, terreno, luz e efeitos.
- `js/sprites.js`: carga e acabamento das imagens. `js/main.js`: telas, controles e HUD. `js/som.js`: som.
- Pelo console: `SINA.J` (jogo), `SINA.F` (fase), `SINA.D` (desenho).

Peças de fora: `ASSETS-TERCEIROS.md`.

---

# Versão vista de cima (em `cima/`)

## Rodar

Pelo preview `sina-parte1` (porta 8792) ou com qualquer servidor estático nesta pasta.

## Controles

| Ação | Teclado e mouse | Toque |
|---|---|---|
| Andar | WASD ou setas | Manche à esquerda |
| Esquiva (invulnerável por cerca de 0,3 s) | Espaço | Esquiva |
| Golpe / golpe forte | Clique / botão direito (ou J / K) | Golpe / Forte |
| Beber da cabaça | Q | Beber |
| Usar, falar, abrir | E | Usar |
| Mirar no inimigo | Tab | Mirar |
| Equipamento e missões / mapa | I / M | Menu |

## Regras

- Golpes e rolamentos gastam vigor. Inimigos só são interrompidos depois de aguentar alguns golpes.
- Acertar quem acabou de atacar causa 60% a mais de dano.
- Descansar na fogueira cura e enche a cabaça, mas levanta os inimigos de novo.
- Ao morrer, as brasas ficam onde você caiu. Morra de novo antes de buscá-las e elas se perdem.
- Brasas fortalecem Vida, Vigor e Força nas fogueiras, compram itens e pagam a forja.
- Armaduras protegem, mas deixam o herói mais lento e o rolamento mais caro. Armas pesadas exigem Força.

## Personagem

Nome, sexo, povo (Humano, Elfo, Anão, Povo-fera) e especialidade (Soldado, Caçador, Aprendiz de feitiço, Andarilho), com efeito nas regras. Cada especialidade tem um poder na tecla R. A aparência é refeita por código em `js/aparencia.js`.

## Mundo

Seis regiões, da mais segura à mais perigosa: Campos da Aurora, Mata Funda, Mangue Sombrio, Serra do Ferro, Sertão das Cinzas e Cratera da Cauda.
Doze fogueiras, 67 baús, cerca de 610 criaturas, 3 masmorras e 6 lendas (Cabra-Cabriola, Curupira, Boiúna, Mapinguari, Boitatá e Gigante de Cinza), além dos 5 chefes. Não há ordem obrigatória.

**História:** Benta, em Alvorada, pede os três Cacos da Sina: Lobisomem (norte), Capitão Tição (leste) e Corpo-seco (cripta a sudeste, cuja chave está com Zé Facão, a noroeste). Com os três, a Cratera se abre para o Filho da Cauda.

**Gente:** em Alvorada, Lauro vende, Bento afia a arma e dá missão, e Rosa, Tonho, Zefa e Dona Cida dão missões. Taliel fica em Ybirá; Pagu, a andarilha, vende na Torre Caída.

**Chefes:** Zé chama o bando, o Lobisomem uiva a matilha, o Corpo-seco levanta mortos, Tição deixa rastro de fogo e atira em leque, e o Filho da Cauda faz cair meteoros.

**Celular:** manche, botões e mira automática, em pé ou deitado. O desenho fica mais leve sozinho se o aparelho não der conta.

**Nuvem:** conta do servidor Apps Script do SINA. O save ocupa um espaço vazio da conta (nunca sobrescreve jogos antigos). Testar com o simulador: `node tools/serve.js` e abrir `/parte1/?api=http://localhost:8790/exec`.

## Código

- (os caminhos abaixo ficam dentro de `cima/`) `js/mapa.js`: o mundo. `js/conteudo.js`: criaturas, itens, missões e falas.
- `js/jogo.js`: regras. `js/tela.js`: desenho e luz. `js/main.js`: controles e menus. `js/som.js`: som.
- `js/robo.js`: testes. Abra com `?robo`: `SINA.robo({ imortal: true })` joga tudo e `SINA.duelo(['bandido'], { bom: true })` mede a dificuldade.
- Sprites: `python tools/parte1-montar.py`, a partir de `apps meus/sina`. Teste do mundo: `node test/parte1-mapa-test.js`.
- Peças de fora: `ASSETS-TERCEIROS.md`.

Dificuldade: `C.TIPOS` em `js/conteudo.js` (vida, dano, tempo de preparo e brecha de cada criatura).
