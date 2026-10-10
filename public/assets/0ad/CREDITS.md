# Créditos del arte militar (atlas `mil`)

Modelos, texturas y animaciones de **0 A.D.**, © Wildfire Games (https://www.wildfiregames.com/).
Licencia: **Creative Commons Attribution-ShareAlike 3.0 (CC-BY-SA 3.0)**, https://creativecommons.org/licenses/by-sa/3.0/
(texto original en `LICENSE-0AD.txt`, copiado de `binaries/data/mods/public/art/LICENSE.txt` del repositorio de 0 A.D.).

Origen: https://github.com/0ad/0ad (el commit exacto está en `atlas.json`, campo `meta.source`).

Cambios realizados: los modelos 3D se han ensamblado según sus actores, renderizado a imágenes 2D (Blender, Cycles,
proyección ortográfica 2:1, 8 direcciones), reducido de tamaño y empaquetado en un atlas
(`scripts/art/zeroad.py`, `scripts/art/build-0ad-atlas.py`). Los colores de jugador van incluidos en azul. Estas
imágenes derivadas se distribuyen bajo la misma licencia CC-BY-SA 3.0. El código de Empires-War no queda afectado.

Contenido:
- Espadachín → actor `units/britons/infantry_swordsman_c.xml` (quieto, andar, atacar y morir)
- Arquero → actor `units/athenians/infantry_archer_b.xml` (quieto, andar, disparar y morir)
- Cuartel → actor `structures/britons/barracks.xml`

Algunas texturas de 0 A.D. derivan de materiales de CGTextures distribuidos como CC-BY-SA con permiso especial
(ver `LICENSE-0AD.txt`).
