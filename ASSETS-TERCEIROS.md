# SINA Parte I: peças de fora (MVP para amigos)

Lista para saber o que trocar caso o jogo vá à venda. Nesta fase, é só registro.

## Referências enviadas pelo autor (origem: Pinterest, autores não identificados)
- `assets/telas/fogueira.webp`, `titulo.webp`, `ruina.webp`, `cripta.webp`, `morte.webp`, `casa.webp`

## Bichos e ícones
- `assets/spr/cobra`, `aranha`, `escorpiao`, `morcego`, `assombracao`, `alma`, `afogado`, `brutamontes`, `cabra`, `curupira`, `boiuna`, `mapinguari`, `boitata`, `gigante`: Dungeon Crawl Stone Soup 32x32 Tiles, CC0, https://opengameart.org/content/dungeon-crawl-32x32-tiles (recoloridos e ampliados).
- `assets/ic/`: 496 pixel art icons, 7Soul1, CC0.

## Som
- `som/`: pacotes CC0 já listados em `site/CREDITOS.md`.

## Geradas por IA
- Personagens, cenário e ilustrações: PixelLab (uso comercial permitido pelos termos dele). Ver `arte-pixel/`.

## Versões do herói
- `assets/herois/`: geradas pelo Google Gemini a partir da folha de poses do herói (PixelLab), recortadas por `tools/folha-poses.py`.

## Árvores e plantas
- `assets/spr/cp*`, `cpo*`, `mtp*`, `mg*`, `srv*`, `srd*`, `st*`, `cz*`, `moita_*` (exceto `moita_mata`): recortes de "[LPC] Trees Mega-Pack", bluecarrot16 e outros (lista em `baixados/lpc-trees/lpc-trees/CREDITS-trees.txt`), CC-BY-SA 3.0. https://opengameart.org/content/lpc-trees
- `assets/spr/mt*`, `mgc*`, `sr*`, `pc*`, `pm*`, `pg*`, `ps*`, `pt*`, `pz*`, `moita_mata`: "Lots of trees and plants from OGA (DB32) tilesets pack 1", Jetrel, Zabin, Hyptosis, Surt, CC0. https://opengameart.org/content/lots-of-trees-and-plants-from-oga-db32-tilesets-pack-1

## Acervo Dungeon Crawl Stone Soup (CC0)
- Inimigos novos (`queixada`, `marimbondo`, `onca`, `jacare`, `cururu`, `jagunco`, `benzedor`, `tatu`, `cangaceiro`, `cao`, `esqueleto`, `mumia`, `espectro`), bichinhos `fau_*`, estátuas, altares, fontes, moitas, sangue `sg_*` e água.

## Efeitos de impacto (assets/vfx)
- `hit-spark.png` e `crit-hit.png`: exportados do **pixelfx** (https://github.com/patch-gg/pixelfx), MIT, Copyright (c) 2026 Patch e Hugo Duprez. Os demais efeitos em pixel (corte, cura, alma, rachadura) foram escritos para o SINA a partir das ideias do mesmo pacote.

## Círculos dos poderes (js/fxforge)
- Motor do **Pixel Ability FX Forge** (https://github.com/GameDev-Toolkit/pixel-ability-fx-generator), Apache License 2.0 (texto em `js/fxforge/LICENCA-Apache-2.0.txt`). Copiados sem alteração `AbilityEffect.js` e `engine/LoopArt.js`; os efeitos são gerados no navegador na carga do jogo.

## Ambientes das Cinzas e da cripta (som/amb)
- `cinzas.mp3` ("From The Ashes") e `cripta.mp3` ("Those Who Wait"), do pacote **Dark Ambient Soundscape** de Nihilex (https://nihil-existentia.itch.io/free-audio-asset-collection), CC0 1.0. Convertidos para MP3 com entrada e saída suaves.

## Filho da Cauda (assets/spr/cauda_*)
- Gerado no **SpriteCook** (https://www.spritecook.ai) na conta do autor, plano gratuito; os termos dizem que o que se gera pode ser usado em jogos comerciais. Original em `arte-pixel/cauda-spritecook`. O golpe é feito por código a partir do primeiro quadro.

## Animações dos monstros comuns (assets/spr/*_e e *_ge)
- Caminhada de bandido, apagado, aranha, cobra, escorpião, onça, jagunço, cangaceiro, esqueleto, cururu, queixada, benzedor, cão, múmia, jacaré, tatu, brutamontes, afogado, cavaleiro, assombração, morcego, alma, marimbondo, espectro e cabra, e ataque de bandido, apagado, jagunço, cangaceiro, esqueleto, benzedor, múmia, cavaleiro, assombração e cabra: geradas no **PixelLab** (animate_image) a partir dos próprios sprites do jogo, na conta do autor. Originais em `arte-pixel/anim-pl`.

## SINA · O Primeiro (24/11/2026)

| O quê | Origem |
|---|---|
| `assets/barro/barro.png` (herói de barro, 14 movimentos) | PixelLab, personagem próprio |
| `assets/barro/pele.png`, `osso.png`, `prata.png`, `assets/floresta/marcos.webp` | Gemini, pedidos próprios (`tools/sono-armaduras.py`, `tools/lateral-arsenal.py`) |
| `assets/barro/folhas.png`, `couro.png` | Gemini, a partir da folha de poses do herói |
| `assets/floresta/f_*.webp`, `nasce.webp`, `p_*.webp`, `m_*.webp` | Gemini, pedidos próprios |
| `som/sfx/` gob*, mor*, ogro*, gig*, lobisomem, corte*, lamina*, madeira*, pedra*, passop*, metal*, corrente*, lama*, bolha*, saca1, pano1, malha1, tranca1, urro*, morreu1, fere* | "80 CC0 RPG SFX" e "RPG Sound Pack" (OpenGameArt, CC0), por `tools/lateral-sons.sh` |
| `som/musica/sina-*.mp3` | Suno, criadas pelo usuário (Loop da Floresta, Floresta Calma, Loop de Batalha, Loop do Chefão); laço e volume por `tools/musica-laco.py` |
| `assets/barro/mulher.png`, `filho.png` | Gemini, a partir da folha de poses do herói (`tools/folha-familia.py`) |
| `assets/floresta/casa.webp`, `f_vale.webp`, `p_vale.webp`, `m_zumbi_*`, `m_lobo_*`, `m_cobra_*` | Gemini, pedidos próprios (`tools/lateral-variantes.py`) |
| `assets/floresta/m_goblin_*.webp` | ChatGPT, pedido próprio |
| `assets/floresta/itens.webp`, `armas.webp` | ChatGPT, pedido próprio |
| `som/` | os mesmos do jogo anterior, listados acima |
