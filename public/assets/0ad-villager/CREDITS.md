# Créditos del aldeano por tareas (atlas `eco`)

Modelos, texturas y animaciones de **0 A.D.**, © Wildfire Games (https://www.wildfiregames.com/).
Licencia: **Creative Commons Attribution-ShareAlike 3.0 (CC-BY-SA 3.0)**, https://creativecommons.org/licenses/by-sa/3.0/
(texto original en `LICENSE-0AD.txt`, copiado de `binaries/data/mods/public/art/LICENSE.txt` del repositorio de 0 A.D.).
Origen: https://github.com/0ad/0ad (commit exacto en `atlas.json`, campo `meta.source`).

Cambios: actor ensamblado y renderizado a imágenes 2D (Blender, ortográfica 2:1, 8 direcciones), reducido y empaquetado; la sombra se desvanece donde la corta el encuadre
(`scripts/art/zeroad.py`, `scripts/art/build-0ad-atlas.py`, configuración `scripts/art/zeroad-villager.json`).
El color de jugador va incluido en azul. Las imágenes derivadas se distribuyen bajo CC-BY-SA 3.0.

Actor: `units/celts/female_citizen.xml` (ciudadana celta). Animaciones y herramientas de 0 A.D. por tarea:

| Animación de Empires-War | Animación de 0 A.D. | Herramienta / carga |
|---|---|---|
| idle | `biped/citizen/idle_relax_f_long.dae` | — |
| walk | `biped/citizen/walk_relax_f.dae` | — |
| chop | `biped/gatherer/gather_wood.dae` | hacha (`tools/axe`) |
| mine | `biped/gatherer/gather_mine.dae` | pico (`tools/pick`) |
| forage | `biped/gatherer/gather_fruit_f.dae` | cesta (`shuttle_basket_back`) |
| farm | `biped/gatherer/farming.dae` | azada (`tools/hoe`) |
| build | `biped/citizen/build.dae` | mazo (`tools/mallet`) |
| carry/wood (+ -idle) | `biped/gatherer/carry_wood_f.dae` / `idle_carry_wood_f.dae` | troncos (`shuttle_wood`) |
| carry/stone (+ -idle) | `biped/gatherer/carry_ore_f.dae` / `idle_carry_ore_f.dae` | piedra (`shuttle_stone`) |
| carry/gold (+ -idle) | `biped/gatherer/carry_ore_f.dae` / `idle_carry_ore_f.dae` | mineral metálico (`shuttle_metal`; 0 A.D. no tiene «oro» propio) |
| carry/food (+ -idle) | `biped/gatherer/carry_grain_f.dae` / `idle_carry_grain_f.dae` | cesta a la espalda (`shuttle_basket_back`) |
