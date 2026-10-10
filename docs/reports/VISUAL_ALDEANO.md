# Aldeano por tareas (rama `feat/villager-task-art`, PR #13)

Solo es arte. La traducción de estados de la simulación a animaciones (gather + árbol → chop, etc.) la hace la integración (ChatGPT). No se ha tocado la simulación ni el render principal de la rama candidata.

## Comprobación previa de fuentes (antes del atlas)

- **Unknown Horizons:** no sirve. El leñador tiene 1 fotograma de «trabajar» por dirección, y no hay picar, recolectar, cultivar ni construir.
- **0 A.D.** (`units/celts/female_citizen.xml`): tiene todas las animaciones del contrato. Ninguna es inventada ni repetida.
  - Excepción: `carry/gold` usa la animación y la carga de «metal» de 0 A.D., que no tiene oro propio.
  - `carry/stone` comparte animación con `carry/gold`; solo cambia lo que lleva.

La tabla completa (animación → fichero de 0 A.D. → herramienta) está en `public/assets/0ad-villager/CREDITS.md`.

## Contrato gráfico entregado

- Fotogramas: `eco/villager/<anim>/<dir>/<i>`. Animaciones de Phaser: `eco/villager/<anim>/<dir>`.
- Direcciones: 0, 45, …, 315 (0 = derecha, 90 = arriba, 270 = de frente).
- Ancla: los pies (incluida en `atlas.json`).

| Animación | Fotogramas | Repetición |
|---|---|---|
| idle | 1 | — |
| walk, chop, mine, forage, farm, build | 8 | bucle |
| carry/wood, carry/stone, carry/gold, carry/food | 8 | bucle (caminando con carga) |
| carry/wood-idle, carry/stone-idle, carry/gold-idle, carry/food-idle | 1 | — (parada con carga; extra, por si hace falta) |

Lista en código: `VILLAGER_ANIMS` en `src/render/villagerArt.ts`. Funciones: `preloadVillagerArt`, `createVillagerAnimations`, `villagerAnimKey(anim, dir)`, `villagerFrame(anim, dir, i)`.

## Pruebas ejecutadas

- `npm test` en local: **55/55**, de las cuales 6 son de este PR (`tests/villager-art.test.ts`):
  - el contrato coincide exactamente;
  - 8 direcciones y fotogramas completos;
  - anclas y escala;
  - sin cortes;
  - quieto y andar del mismo tamaño;
  - andar animado;
  - ninguna animación repite el primer fotograma de otra;
  - licencia.
- Prueba de navegador (CI, WebKit con perfil de iPhone):
  - la galería carga el atlas y crea las 120 animaciones;
  - la partida normal no descarga ningún arte de 0 A.D.
- Compatibilidad: `git merge-tree` con `release/claude-visual-main-candidate` (03d1b14) sin conflictos; en la fusión local, 55/55 pruebas.

## Pendiente o a decidir

- **Aspecto:** el aldeano pasa a ser una aldeana de 0 A.D., del mismo estilo que los soldados. Si se quiere también un aldeano hombre, basta con otro actor en la configuración.
- **Colores de jugador:** el vestido entero es la zona de color de jugador de 0 A.D. y va «horneado» en azul. Habrá que resolverlo con los colores de jugador (prioridad 5).
- **Oro:** la carga de oro es mineral oscuro, no dorado. Se puede teñir en el render si se quiere distinguir.
- **Tamaño:** el atlas ocupa 2,1 MB (680 fotogramas) y se carga solo en la galería. Al integrarlo en la partida conviene medir la carga en iPhone y, si hace falta, bajar a 6 fotogramas o pasar a WebP.
- **Dependencia:** este PR parte de `feat/military-art` (PR #11) porque reutiliza su proceso de render.
