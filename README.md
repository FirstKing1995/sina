# SINA · As Terras de Aruanã

RPG soulslike de mundo aberto, em pixel art dark fantasy. Roda no navegador, sem instalar nada.
Publicado em https://firstking1995.github.io/sina/ (a v0.3.4 antiga fica em /sina/antigo/). Para publicar: `node tools/publicar.js`, depois commit e push em site/.

## Rodar

Pelo preview `sina-parte1` (porta 8792) ou com qualquer servidor estático nesta pasta.

## Controles

| Ação | Teclado e mouse | Toque |
|---|---|---|
| Andar | WASD ou setas | Manche à esquerda |
| Rolar (invulnerável por cerca de 0,3 s) | Espaço | Rolar |
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

- `js/mapa.js`: o mundo. `js/conteudo.js`: criaturas, itens, missões e falas.
- `js/jogo.js`: regras. `js/tela.js`: desenho e luz. `js/main.js`: controles e menus. `js/som.js`: som.
- `js/robo.js`: testes. Abra com `?robo`: `SINA.robo({ imortal: true })` joga tudo e `SINA.duelo(['bandido'], { bom: true })` mede a dificuldade.
- Sprites: `python tools/parte1-montar.py`, a partir de `apps meus/sina`. Teste do mundo: `node test/parte1-mapa-test.js`.
- Peças de fora: `ASSETS-TERCEIROS.md`.

Dificuldade: `C.TIPOS` em `js/conteudo.js` (vida, dano, tempo de preparo e brecha de cada criatura).
