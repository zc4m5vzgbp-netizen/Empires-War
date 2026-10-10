# Auditoría express de integración visual y técnica — 10 de octubre de 2026 (Claude)

**Alcance.** PR #16 (`feat/villager-gameplay-integration`, 08697e1), PR #18 (`feat/economy-camps-art`, b189e7e) y PR #19 (`feat/economy-camps-functional`, e4d17aa). No se han modificado `main`, la rama candidata ni las ramas de ChatGPT. No se ha empezado la casa ni la granja.

**Cómo leer las etiquetas de evidencia.**
- **[PROBADO]**: una prueba se ejecutó, con el resultado indicado.
- **[INSPECCIÓN]**: lectura del código o de las imágenes, sin ejecutar nada.
- **[MEDIDO-CI]**: navegador headless en GitHub Actions. **No es un iPhone.**

## Veredicto

| Elemento | Veredicto | Razón |
|---|---|---|
| Arte de #18, con la corrección de esta auditoría (PR #20, `fix/visual-audit-2026-10-10`) | **APTO para integración** | Los atlas están completos y tienen licencia. La aldeana y los campamentos se integraron de verdad en la partida normal, en una rama de auditoría, con el smoke verde en WebKit y Chromium (perfil iPhone 15 Pro Max). |
| Estado actual de #19 como integración final | **NO APTO todavía** | Los atlas no se cargan en la partida. Los campamentos no pueden usar su atlas: `ART_BUILDINGS` solo admite la textura `uh`. Además hay dos problemas de interfaz en iPhone: I-4 e I-5. CI verde ≠ integración completa. |

## Errores críticos

Ninguno. No se ha encontrado ningún fallo que rompa el juego, corrompa partidas o viole licencias.

## Errores importantes

| ID | Hallazgo | Evidencia | Responsable | Estado |
|---|---|---|---|---|
| I-1 | La sombra de la aldeana termina en un corte recto en 209 de 680 fotogramas (alfa de hasta 134 en el borde del encuadre). | [PROBADO] Medición sobre los renders de `renders-0ad-feat-villager-task-art`. Captura antes y después. | Claude | **Corregido** en `fix/visual-audit-2026-10-10` |
| I-2 | #19 no carga los atlas de la aldeana ni de los campamentos: `preload()` solo llama a `preloadArt`. | [INSPECCIÓN] #19 `src/render/GameScene.ts:56-57`. #19 no contiene ningún archivo de `public/assets/0ad*`. | ChatGPT (integración) | Pendiente |
| I-3 | `ART_BUILDINGS` solo admite fotogramas de la textura `uh`. Los campamentos viven en la textura `camp`, así que no se pueden dibujar ni previsualizar con su atlas sin un cambio de contrato. | [INSPECCIÓN] #19 `src/render/art.ts:22`, `entityView.ts:118-119`, `GameScene.ts:190` | ChatGPT (integración) | Hay una propuesta probada (ver más abajo) |
| I-4 | Los botones de campamento no se desactivan sin madera; el del Molino sí. | [INSPECCIÓN] #19 `src/ui/App.tsx:124` frente a `:129`. [PROBADO] Captura 17: madera 0 y botones de campamento activos. | ChatGPT (UI) | Pendiente |
| I-5 | Con un aldeano seleccionado, el panel ocupa unos 440 de 932 px (≈47 %) en iPhone 15 Pro Max: cuatro botones apilados. | [PROBADO] Captura 15 (WebKit, perfil iPhone) | ChatGPT (UI) | Pendiente. Sugerencia: botón «Construir ▸» con submenú, o rejilla de 2 columnas con textos cortos. |
| I-6 | El paso del smoke «la partida normal no descarga el arte militar» filtra `/assets/0ad`. Esa cadena también coincide con `0ad-villager` y `0ad-camps`, así que fallará en cuanto la partida cargue la aldeana. | [PROBADO] En la rama de auditoría hubo que cambiar el filtro a `/assets/0ad/`. | Integración | Corregido solo en la rama de auditoría |
| I-7 | Las animaciones de muerte del arte militar (#11) cortan el cuerpo tumbado en 49 renders; además hay 176 sombras cortadas. | [PROBADO] Medición sobre la rama `renders-0ad` | Claude | Pendiente (fuera del alcance actual). Necesita volver a renderizar con un encuadre más ancho. |
| I-8 | El FPS del smoke en CI no sirve como compuerta de regresión: el mismo código dio un FPS final de 14 en una ejecución y de 34 en otra (Chromium). | [MEDIDO-CI] Ejecuciones 38074073893 y 38075009836 | Proceso | Usar la mediana de 3 ejecuciones (`scripts/perf-audit.mjs`) |

## Errores menores

| ID | Hallazgo | Evidencia |
|---|---|---|
| M-1 | La punta de la azada o del pico roza el encuadre en 16 de 680 fotogramas (≤ 3,5 px en pantalla). La prueba lo documenta e impide que crezca. | [PROBADO] `meta.edgeCuts.villager.opaque = 16` |
| M-2 | Mientras recolecta o construye, la aldeana mira hacia su último paso, no hacia el objetivo. | [INSPECCIÓN] #16 `entityView.ts:156`. Sugerencia: con `phase === 'gathering'` o `'building'`, `dir = dirFromTileDelta(target.x - e.x, target.y - e.y)`. |
| M-3 | El ancla de la aldeana está duplicada como constante (`VILLAGER_ECO_ORIGIN`) en lugar de leerse del atlas con `pivot(scene, frame, ECO)`. | [INSPECCIÓN] #16 `villagerVisualState.ts:10`, `entityView.ts:77` |
| M-4 | `VillagerVisualAction` repite a mano el tipo `VillagerAnim` del contrato; si el contrato cambia, pueden divergir sin aviso. | [INSPECCIÓN] #16 `villagerVisualState.ts:5` frente a `villagerArt.ts:29` |
| M-5 | `VILLAGER_BODY_OFFSET = 19` se aplica también al arte de reserva (UH o procedural), diseñado para 16. Son 3 px de desvío, dentro del radio táctil de 20. | [INSPECCIÓN] #19 `entityTextures.ts:16` |
| M-6 | El dibujo del campamento maderero (151 px) sobresale unos 11 px por lado de la huella (128 px), y esa franja no responde al toque. El tejado sí: se probó con un toque 40 px por encima del centro. | [INSPECCIÓN] y [PROBADO] smoke 4c |
| M-7 | El panel tapa en parte la línea de créditos del pie («arte: Unknown Horizons y 0 A.D. …»). Los créditos completos siguen en CREDITS.md. | [PROBADO] Capturas 15 y 16 |
| M-8 | `villagerArt.ts` y `campArt.ts` existen como copias idénticas en #16/#19 y en #13/#18. Hoy se fusionan sin conflicto, pero cualquier edición en uno de los lados provocará conflictos add/add. | [PROBADO] `diff`: idénticos. `merge-tree`: limpio. |
| M-9 | El comentario de #19 `campArt.ts:6` («solo se cargan con la galería») quedará obsoleto al integrar. | [INSPECCIÓN] |

## Correcciones realizadas

### En mi código visual: rama `fix/visual-audit-2026-10-10`, sobre #18

- **Empaquetador** (`scripts/art/build-0ad-atlas.py`): la sombra se desvanece solo en los bordes del render que la cortan, con los mismos bordes en todos los fotogramas de la unidad. La figura, el ancla y el tamaño no cambian.
- **Nueva medida en `atlas.json`:** `meta.edgeCuts`, con los fotogramas cortados por unidad (figura y sombra).
- **Atlas de la aldeana regenerado** a partir de los mismos renders.
  - Antes de aplicar el cambio se comprobó que el empaquetador reproducía el atlas anterior píxel a píxel.
  - Los fotogramas (64×78) y el ancla (0,5; 0,6905) siguen idénticos, así que no cambia el contrato acordado.
  - Tamaño: de 2.153.506 a 2.126.524 bytes.
- **Campamentos:** píxeles idénticos; solo se añade la medida al JSON.
- **Pruebas de regresión nuevas:** 3. Fallaron con el atlas anterior (2 fallos observados) y pasan con el nuevo.

### Prueba de integración: rama `audit/claude-visual-integration` (#19 + #18 + corrección)

Es una rama de evidencia, no para fusionar tal cual. Cambios propuestos:
- `ART_BUILDINGS` admite un campo `texture`, y `buildingArt(scene, type)` solo devuelve arte si ese atlas y ese fotograma están cargados (si no, se usa el arte de reserva de #19).
- `EntityView` y la vista previa de construcción usan la textura propia de cada edificio.
- La aldeana y los campamentos se precargan en la partida normal; el arte militar sigue cargándose solo en la galería.
- Ganchos de prueba nuevos: `viewInfo`, `ghostInfo`, `findPlacementFor` y `orderAllGather`.
- Paso 4c del smoke:
  - la aldeana usa el atlas `eco` y anima;
  - la vista previa del campamento usa `camp/lumberCamp`;
  - el cimiento se convierte en campamento terminado con su atlas;
  - un toque sobre el tejado lo selecciona.
- Diagnóstico de FPS A/B con y sin cada atlas: `scripts/perf-audit.mjs`.

## Pruebas ejecutadas realmente

| Prueba | Resultado |
|---|---|
| Unitarias en local, #18 + corrección | 63/63 |
| Unitarias en local, fusión #19 + #18 | 66/66 |
| Unitarias en local, rama de auditoría | 69/69 |
| CI de la fusión pura #19 + #18 (66b2ad0) | Verde: typecheck, 66 pruebas, compilación y smoke en WebKit móvil, Chromium móvil, escritorio y galería |
| CI de la rama de auditoría (f4566f4 y ejecución 38075009836) | Verde: typecheck, 69 pruebas, compilación y smoke con el paso 4c en WebKit y Chromium (perfil iPhone) |
| Validación de los atlas | 680 + 2 + 401 fotogramas: todos dentro del PNG, todos con ancla, ninguno vacío. Todas las combinaciones animación × dirección existen. Licencia CC-BY-SA 3.0 y commit de 0 A.D. presentes. |
| A/B de FPS, 3 ejecuciones por configuración, 5 aldeanos animados a ×10 [MEDIDO-CI] | Sin diferencia medible. WebKit: 26 FPS con atlas y 26 sin ellos; ticks/s 127 frente a 127. Chromium: 23 y 23 FPS; ticks/s 112 frente a 115. Arranque: +50–90 ms de mediana. |
| Capturas iPhone (WebKit): 15 panel, 16 vista previa, 17 campamento | Revisadas: el ancla está sobre la huella, la profundidad frente al Centro urbano es correcta y la escala es coherente. |

**No probado:**
- iPhone físico: ni FPS, ni memoria, ni Safari real.
- Memoria GPU: los ~16 MB adicionales son una **estimación**, no una medición.
- El depósito real de madera, oro y piedra en los campamentos: es lógica de ChatGPT.
- Guardar y cargar con un campamento construido.
- El campamento minero dentro de la partida; solo se probó el maderero.

## Conflictos previstos

- **#19 + #18:** sin conflictos (`merge-tree` limpio, verificado con CI).
- **Al activar los atlas en la partida:**
  - el filtro del smoke (I-6) fallará;
  - hay que añadir `texture` a `ART_BUILDINGS` (I-3).
- **Copias duplicadas** de `villagerArt.ts` y `campArt.ts` (M-8): conviene editarlas en un solo lado o fusionar #18 en vez de copiar archivos.
- **Skills v2** (`game-art-pipeline-license-audit`, `mobile-rts-testing`, `rts-performance-benchmarking`): no existen en las ramas #16, #18 ni #19, solo en `chore/rts-specialist-skills-v2`. Esta auditoría siguió sus procedimientos:
  - pruebas que fallan antes del arreglo;
  - WebKit y Chromium;
  - `elementFromPoint`;
  - 3 ejecuciones y la mediana;
  - iPhone físico marcado como pendiente.

  Que las Skills estén cargadas en la rama no se puede afirmar.
