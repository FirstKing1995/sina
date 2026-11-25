#!/bin/bash
# Sons novos do SINA de lado, tirados de "80 CC0 RPG SFX" e "RPG Sound Pack" (CC0), em mp3 mono curto.
B="$(dirname "$0")/../../baixados"; R="$B/rpg_sound_pack/RPG Sound Pack"; C="$B/80-CC0-RPG-SFX_0"; O="$(dirname "$0")/../som/sfx"
f() { ffmpeg -v error -y -i "$1" -ac 1 -ar 32000 -af "silenceremove=start_periods=1:start_threshold=-45dB,loudnorm=I=${3:--18}:TP=-2:LRA=7${4:+,$4}" -b:a 56k -t 2.4 "$O/$2.mp3"; }
i=0; for n in 1 4 6 9 12; do i=$((i+1)); f "$R/NPC/gutteral beast/mnstr$n.wav" gob$i; done
i=0; for n in 2 5 8 11 14; do i=$((i+1)); f "$R/NPC/shade/shade$n.wav" mor$i; done
for n in 1 2 3 4; do f "$R/NPC/ogre/ogre$n.wav" ogro$n; done
for n in 1 3 5; do f "$R/NPC/giant/giant$n.wav" gig$n; done
f "$R/NPC/misc/wolfman.wav" lobisomem
for n in 1 2 3; do f "$R/battle/swing$([ $n = 1 ] || echo $n).wav" corte$n; f "$C/blade_0$n.ogg" lamina$n; f "$C/wood_0$n.ogg" madeira$n; f "$C/item_stone_0$n.ogg" pedra$n -22; f "$C/stones_0$n.ogg" passop$n -26; f "$C/metal_0$n.ogg" metal$n; f "$C/chain_0$n.ogg" corrente$n; done
f "$R/battle/sword-unsheathe2.wav" saca1; f "$R/inventory/cloth-heavy.wav" pano1; f "$R/inventory/chainmail1.wav" malha1; f "$C/lock_02.ogg" tranca1
for n in 1 2 3; do f "$C/creature_slime_0$n.ogg" lama$n -26; done
for n in 1 2 3; do f "$R/inventory/bubble$([ $n = 1 ] || echo $n).wav" bolha$n; done
f "$C/creature_roar_01.ogg" urro1; f "$C/creature_roar_02.ogg" urro2; f "$C/creature_die_01.ogg" morreu1; f "$C/creature_hurt_01.ogg" fere1; f "$C/creature_hurt_02.ogg" fere2
