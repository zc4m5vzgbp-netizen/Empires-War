# Apartado visual — investigación y prototipo (rama `feat/visual-upgrade`)

Estado: prototipo pequeño implementado y probado en CI. **No fusionado.** Sin cambios en la simulación, la economía, la IA, el combate ni la persistencia.

## 1. Recursos investigados

| Recurso | Licencia (verificada) | Contenido útil | Estilo / resolución | Encaje con Empires-War |
|---|---|---|---|---|
| **Unknown Horizons** — [repositorio](https://github.com/unknown-horizons/unknown-horizons) | **CC-BY-SA 3.0**: «Our own audiovisual media content is published under… CC-BY-SA 3.0» (`doc/LICENSE`) | Hierba (6 variantes), arena, agua y transiciones; 10 árboles (incluida la tala); piedra y arcilla; ~70 edificios en 5 niveles (madera → entramado → piedra y ladrillo); molino animado; campesino, porteador (cargado y vacío), leñador, soldado (andar y atacar), ciervos y barcos; 8 direcciones | Prerrenderizado 3D y realista. Casilla de 64×32, como la nuestra. Unidades de 32×42 px y edificios de 128–192 px | **Elegido.** El más completo y coherente, y su perspectiva coincide exactamente con nuestra cuadrícula |
| **0 A.D.** — [CC case study](https://wiki.creativecommons.org/wiki/Case_Studies/0_A.D.) | CC-BY-SA («artistic content… CC BY-SA») | Civilizaciones completas: aldeanos, infantería, arqueros, caballería, asedio, murallas, castillos, bayas, minas | Modelos 3D (no sprites). La calidad visual más cercana a AoE II DE | Fase 2: renderizar los modelos a sprites (Blender en CI) para lo que le falta a UH. Misma familia de licencia |
| **Flare** — [repositorio](https://github.com/flareteam/flare-game) | CC-BY-SA 3.0 («All of the art and data files… CC-BY-SA 3.0», `README`) | Personajes y monstruos de fantasía en 8 direcciones, mazmorras y bosques | Prerrenderizado, oscuro, de RPG | Choca con el estilo; solo serviría para elementos sueltos |
| **Widelands** — [repositorio](https://github.com/widelands/widelands) | GPL-2.0+ (`COPYING`) | Obreros y edificios de varias tribus | Prerrenderizado | **Descartado de momento**: arte GPL dentro del juego obliga a GPL; habría que decidirlo antes |
| Kenney «Medieval RTS» — [OpenGameArt](https://opengameart.org/content/medieval-rts-120) | CC0 | 120 piezas de RTS | Plano y simple; la página no indica la perspectiva | Demasiado simple frente a AoE II |
| «Isometric 64x64 Medieval Building» (Seth Galbraith) — [OpenGameArt](https://opengameart.org/content/isometric-64x64-medieval-building-tileset) | CC-BY 3.0 | Piezas de casas | Pixel art | Estilo distinto; sin unidades |
| «Isometric medieval» (cloth62) — [OpenGameArt](https://opengameart.org/content/isometric-medieval-0) | CC-BY-SA 4.0 | Conjunto de casillas (sin detalle de contenido) | Isométrico «oldschool» | No revisado en profundidad |

No se ha usado nada de AoE II DE ni ningún recurso con licencia dudosa.

## 2. Dirección artística propuesta

El estilo es prerrenderizado, realista, con luz cálida desde arriba a la izquierda, sombras suaves y paleta terrosa, como en AoE II. Los niveles de Unknown Horizons encajan de forma natural con las cuatro edades:

| Edad | Materiales | Origen en UH |
|---|---|---|
| Oscura | Madera, paja, tiendas | `sailors/*`, `pioneers/storagetent`, torre de madera |
| Feudal | Entramado con paja | `pioneers/*` (residencias, iglesia de madera, granja) |
| Castillos | Entramado con teja, piedra | `settlers/*` (cuartel, taberna, iglesia de ladrillo, fundición) |
| Imperial | Piedra y ladrillo | `citizens/*`, `merchants/*` |

Lo que falta (castillos, murallas de piedra, arqueros, caballería y asedio) vendría de 0 A.D. renderizado con la misma cámara y la misma luz.

## 3. Implementado

- `scripts/art/build-uh-atlas.py`: genera de forma reproducible (commit de UH fijado) un atlas de 1024×1024 con 194 fotogramas y el ancla de cada fotograma (pies o centro de la huella).
- `public/assets/uh/atlas.png`, `atlas.json` y `CREDITS.md` (atribución y licencia). El crédito también se muestra en el pie de la pantalla.
- `src/render/art.ts`: carga del atlas, animaciones y elección de dirección (8). Si el atlas no carga, se usa el arte provisional.
- `src/render/GameScene.ts`: suelo pintado una sola vez en texturas por bloques de 16×16 casillas, con bosques densos y variados. Vista previa del edificio con el arte nuevo.
- `src/render/entityView.ts`: el Centro Urbano (provisional: cuartel de UH ×1,33) y el Molino con aspas animadas. Los aldeanos tienen animación de andar, de estar quietos y de llevar carga, en 8 direcciones.
- `src/render/gallery.ts`: con `?galeria=1` se ven soldados luchando y marchando, piedra, torre, iglesia, taberna y almacén. Es solo decorativo.
- `src/render/entityTextures.ts`: zona táctil de los edificios más alta, porque el arte es más alto.
- `scripts/screenshots.mjs`: capturas de la galería.

## 4. Resultados

- CI «Comprobar y publicar» (ejecución 38031091099): **todo en verde**.
  - Typecheck, 40 pruebas, compilación y verificación de rutas: correctos.
  - Navegador móvil WebKit (perfil iPhone), móvil Chromium y escritorio Chromium: correctos.
- Rendimiento en CI: 2.874 → **387 objetos en escena**; arranque en escritorio de 11,8 → 3,4 s; ticks/s a ×10 de 85 → 132. La primera versión sin bloques fallaba la prueba de escritorio por lentitud; se corrigió.
- Capturas: rama `capturas` (01–12).

## 5. Pendiente

1. **Prueba en un iPhone real.** Los FPS de CI no son fiables (gráficos por software). Hay que comprobar además la pérdida del contexto WebGL al volver de segundo plano: el suelo prerrenderizado podría quedar en negro y habría que volver a pintarlo.
2. **Bordes duros** entre hierba, arena y agua. UH tiene casillas de transición; falta usarlas.
3. **Arbustos de bayas**: siguen siendo arte propio provisional, porque UH no tiene bayas.
4. **Colores de jugador**: el arte de UH no tiene máscara de equipo. Falta una capa de color o banderas.
5. **Dirección de los sprites**: se supone que 0° = derecha y 90° = arriba. No se ha verificado visualmente con un aldeano caminando.
6. La animación de andar del aldeano tiene solo 4 fotogramas. El colono tiene 35 fotogramas, pero su ropa es del siglo XVII.
7. El Centro Urbano es provisional: un cuartel escalado, algo borroso.
8. Atlas de 700 KB en PNG; en WebP ocuparía bastante menos.
9. El lienzo se dibuja a 1× (no a la densidad de la pantalla del iPhone): se ve algo suave. Es una limitación anterior a esta rama.
10. Unidades militares, castillos y asedio: propuesta de renderizar 0 A.D. (fase 2).
