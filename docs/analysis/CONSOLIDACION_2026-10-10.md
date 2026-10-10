# Evaluación técnica de consolidación — Empires-War (Claude, 10 de octubre de 2026)

**Estado:** análisis para revisión conjunta. No ejecuta ninguna migración, no cambia el comportamiento del juego y no toca `main` ni las ramas de ChatGPT. Rama: `analysis/consolidacion-2026-10-10`, construida sobre `audit/claude-integration-recipe`, que a su vez es #19 (efe8e51) + PR #20 + la receta visual.

**Etiquetas de evidencia**
- **[CÓDIGO]**: lectura del código, con archivo y línea.
- **[PROBADO]**: prueba ejecutada en esta sesión o en CI.
- **[MEDIDO]**: medición en la CPU de la sesión (Xeon a 2,1 GHz, Node 22). **No es un iPhone.**
- **[CÁLCULO]**: cifra derivada del código con un script reproducible.
- **[DOC]**: documento del proyecto.

Las categorías que pide el usuario se marcan así:
- **(1) Observado:** funcionalidad observada o documentada.
- **(2) Técnica:** solución técnica encontrada.
- **(3) Propuesta:** adaptación propuesta para Empires-War.
- **(4) Original:** decisión original del proyecto, que hay que respetar.

---

## A. Diagnóstico: no hay dos motores, hay uno con dos líneas de ramas

**Hallazgo principal [PROBADO, `git blame`].** Mi «proyecto visual» no es un juego aparte. Es una capa de render y de arte construida **sobre el mismo motor** del Bloque 0/1. Así se reparten las 5.826 líneas de `src/`, `tests/` y las pruebas de navegador en la rama de receta:

| Origen | Líneas | % | Qué es |
|---|---|---|---|
| Bloque 0/1 en `main` (sesión anterior de Claude, siguiendo el documento maestro v2 acordado con ChatGPT) | 4.514 | 77 % | Simulación, contenido, entrada, cámara, persistencia, interfaz y render base |
| Capa visual (ramas `feat/visual-upgrade` → #8 → #11 → #13 → #18 → #20) | 981 | 17 % | `art.ts`, `terrainArt.ts`, atlas de UH y 0 A.D., galería, partes de `GameScene` y `entityView`, pruebas de arte |
| ChatGPT (commits con la cuenta del usuario) | 331 | 6 % | Cuatro recursos, campamentos funcionales, contrato de estados visuales de la aldeana, botones de construir, pruebas de economía |

En `villagerArt.ts` y `campArt.ts`, `git blame` atribuye a ChatGPT 80 líneas que en realidad son copias idénticas de las mías (#16 y #19 las importaron como texto).

Por tanto, **la consolidación no es una migración de motor**. Hay que juntar ramas que divergieron y endurecer los contratos entre capas.

**Las dos líneas [PROBADO, `git merge-base`]**

```
main ─ visual-upgrade ─ #7 visual-gameplay-integration ─ #8 map-resources-art ─┬─ #11 militar ─ #13 aldeana ─ #18 campamentos ─ #20 sombras   (línea visual, Claude)
                                                                                └─ #10 candidata ─ #16 aldeana funcional ─ #19 campamentos funcionales (línea de integración, ChatGPT)
                                                                                         └─ #12 → #14 → #15 Skills (solo documentos)
Huérfanas sobre main: #2 docs nube · #3 nube (en pausa) · #4 edades (ages.ts) · #5 app instalable (manifest) · #6 cuatro recursos · research/age-of-ai
```

- Hay **20 PR abiertos y ninguno fusionado**.
- Desde su base común (2a0d6a7), la línea visual añade unas 1.350 líneas: sobre todo el proceso de arte y las pruebas.
- La de integración añade unas 520, con sus Skills.
- Al combinarlas no hay conflictos (comprobado con CI en la receta: 38076689613).

### Comparación por componente

| Componente | Implementación actual (archivos) | Evidencia de calidad | Diagnóstico |
|---|---|---|---|
| Simulación | `src/simulation/*` (world, villager, commands, pathfinding, grid, economy, construction, placement, clock, rng) | Determinista: aritmética entera (T-015) y semilla. `tests/architecture.test.ts` impide importar Phaser o el DOM. Ida y vuelta JSON. Más de 70 pruebas en verde | **Bien estructurada.** No escala a 600 unidades sin cambios (§D, R-2) |
| Contenido | `src/content/*` (tipo `Sourced`, `provisional` y `sin verificar`) | `tests/architecture.test.ts` | Bien. Los campamentos usan `AOE2_UNVERIFIED` (correcto) |
| Entrada | `src/input/*`: Pointer Events propios; la entrada de Phaser está desactivada (T-001) | Smoke táctil real en WebKit y Chromium | Bien |
| Cámara | `src/render/cameraModel.ts`: modelo puro que Phaser copia cada frame (T-002) | `tests/render-math.test.ts` | Bien |
| Persistencia | `src/persistence/*`: formato versionado, IndexedDB, pausa durante la escritura | `tests/persistence.test.ts`; smoke de guardar y cargar; pruebas de ChatGPT con campamentos (03085cc) | Bien, pero con **una sola ranura** (T-022) y sin autoguardado ni exportación |
| Render de suelo | `GameScene.drawArtTerrain()`: hornea **todo** el mapa en RenderTextures de 16×16 casillas | Fluido en el 48×48 actual (iPhone, VIS-02) | **No escala**: crítico, R-1 |
| Render de árboles | Una imagen por árbol, 1 o 2 por casilla de bosque (`GameScene.ts:147-160`) | — | No escala: ~10.000 imágenes en 224×224 [CÁLCULO] |
| Render de entidades | `entityView.ts` recorre todas las entidades cada frame, sin descartar las que no están en pantalla | Smoke 4c (receta) | Adaptar: falta un manifiesto de arte único y descartar lo que no se ve |
| Toques y selección | `picking.ts`: recorre todas las entidades | `tests/picking.test.ts`; smoke | Elige mal entre edificios solapados (R-11). Bien para cientos de entidades; más adelante, índice espacial |
| Arte | UH (CC-BY-SA 3.0): suelo, árboles, recursos, Centro urbano, molino y aldeano de reserva. 0 A.D. (CC-BY-SA 3.0): aldeana, campamentos y militares | Pruebas de contrato y de licencia; `tests/characterization-art-contract.test.ts` (nueva) | Bien. **El color de jugador va fijo en azul** (R-4) |
| Interfaz | Preact (`App.tsx`, `store.ts`, `styles.css`) | Smoke; capturas 15–17 | Adaptar: el panel ocupa ~47 % en iPhone (I-5) y el menú de construir no escala a 20 edificios |
| Proceso | `REQUIREMENTS_MATRIX.md` (estados antiguos), `DELIVERY_LEDGER.md` (en otra rama), `QUALITY_AND_CONSOLIDATION_PROTOCOL.md` (#19), informes por PR | — | **Fragmentado:** tres registros en tres ramas (R-6) |

## B. Qué conservar, adaptar, sustituir o eliminar

| Componente | Decisión | Por qué |
|---|---|---|
| Simulación pura, determinista y serializable | **Conservar** | Cumple el §9 del documento maestro v2 y las pruebas la protegen. Rehacerla no aporta nada. |
| Órdenes como única vía de cambio del mundo (T-012) | **Conservar** | Es la base para la IA sin trampas y para los trucos solo del jugador (validación por `playerId`). |
| Pathfinding A* y rejilla de ocupación | **Adaptar** | Mantener A* como búsqueda local y añadir regiones conectadas, un presupuesto de búsquedas por tick y rutas compartidas por grupo (§E, etapa 5). |
| Contenido tipado con procedencia | **Conservar** | — |
| Entrada, cámara y gestos | **Conservar** | Probado en táctil. |
| Persistencia | **Conservar y ampliar** | Varias ranuras, autoguardado al ocultar la página, exportación, migración con copia (GUA-04, GUA-07). |
| Arte de UH y 0 A.D. y su proceso reproducible | **Conservar** | Licencias compatibles, pruebas de contrato y renders reproducibles en CI. |
| Suelo horneado entero | **Sustituir** (por mí) | Un 224×224 necesitaría unos 417 MB de texturas (R-1). Alternativa: hornear solo los bloques cercanos a la cámara, con un grupo de texturas reutilizables, o probar `TilemapLayer` isométrico (Phaser 4 lo admite; `TilemapGPULayer` no). Hay que medir antes de elegir. |
| Árboles como imágenes sueltas | **Adaptar** (por mí) | Descartar lo que no se ve y reutilizar objetos. Conservar el orden de profundidad con las unidades. |
| `entityView` + constantes repartidas (`ART_BUILDINGS`, `VILLAGER_ECO_ORIGIN`, `VILLAGER_BODY_OFFSET`, `BUILDING_WALL`) | **Adaptar** | Un manifiesto de arte único: textura, fotograma o animación, ancla leída del atlas, tamaño dibujado, centro y forma táctil. Lo validan las pruebas de caracterización. |
| Arte provisional por código (`textures.ts`, `entityTextures.ts`) | **Conservar como reserva** | Permite jugar si un atlas no carga. Es barato y está probado. |
| Aldeano UH (`vil/*`) | **Eliminar más adelante** | Duplica a la aldeana 0 A.D. Solo cuando ella esté **aprobada**; antes no. |
| Galería (`?galeria=1`) | **Conservar** | Solo para desarrollo; no se descarga en la partida normal (lo comprueba el smoke). |
| Interfaz Preact | **Conservar y adaptar** | Panel compacto y menú de construir con iconos en rejilla. «Aldeanos libres» y población visibles (v1.1 §38; confirmar). |
| Registros de requisitos | **Unificar** | Una matriz con los 6 estados del protocolo de ChatGPT y un registro de defectos (§E, etapa 2). |
| Age of AI (MIT, `research/age-of-ai-portability`) | **No adoptar en bloque** | Se puede estudiar `path.ts` como referencia. Su `Game` de ~86 KB depende de un servidor (evaluación de ChatGPT, sin ejecutar). |

## C. Arquitectura unificada recomendada

Se mantiene la separación actual, que ya coincide con el §9 del documento maestro y la impone `tests/architecture.test.ts`. Se añaden contratos explícitos donde hoy hay acoplamiento implícito:

```
content/      catálogo tipado (Sourced): unidades, edificios, recursos, edades, civilizaciones, trucos
simulation/   estado + reglas + tick fijo (sin Phaser ni DOM; preparada para Web Worker)
  ├ world, commands (única vía de cambio; valida playerId y permisos de truco)
  ├ spatial/   índice espacial y ocupación incremental (nuevo)
  ├ path/      A* local + regiones conectadas + presupuesto por tick + rutas de grupo (adaptar)
  ├ players/   imperios, colores fijos, diplomacia, niebla y memoria por jugador (nuevo)
  └ systems/   villager, construcción, producción, combate… (uno por archivo)
render/       solo lee instantáneas
  ├ art/manifest.ts   ÚNICO registro: entidad → textura, fotograma/animación, ancla (del atlas), tamaño, toque (nuevo)
  ├ world/            suelo por bloques visibles con grupo de texturas, árboles con descarte (sustituir)
  ├ entities/         vistas con descarte por cámara, reutilización y color de jugador (adaptar)
  └ fx/, gallery/
ui/           Preact: HUD, paneles y menús; solo emite órdenes y lee el store
input/        Pointer Events → órdenes
persistence/  ranuras, autoguardado, migraciones con copia, exportar/importar
tests/        unidad · caracterización · contrato de arte · bancos de escala · smoke de navegador
```

El contrato entre capas se reduce a tres reglas:
1. La simulación expone el estado y `issueCommand`.
2. El render consume el estado y el manifiesto de arte.
3. La interfaz consume el store y emite órdenes.

Los atlas solo entran por el manifiesto. Así una migración de arte, un nuevo color de jugador o una nueva civilización cambian datos, no código repartido.

## D. Riesgos, dependencias y conflictos

| ID | Riesgo | Evidencia | Gravedad | Mitigación |
|---|---|---|---|---|
| **R-1** | La memoria del suelo crece con el área del mapa. Bloquea mapas reales. | [CÁLCULO] `scripts/bench/render-scale.ts`, que reproduce `GameScene.ts:108-145`: **48×48 → 19 MB · 160 → 213 MB · 224 (predeterminado del maestro) → 417 MB · 320 → 850 MB · 480 → 1.913 MB** de RenderTextures. Árboles: 9.925 imágenes en 224 y 45.084 en 480. | **Crítico** para MAP-03/04. Hoy no afecta: el mapa es 48×48. | Etapa 4: bloques visibles con grupo de texturas. Medir en iPhone físico. Es responsabilidad mía: lo diseñé yo (VIS-02). |
| **R-2** | Picos de tick con muchas unidades: órdenes masivas y búsquedas que fallan recorren todo el mapa. | [MEDIDO] `scripts/bench/sim-scale.ts`, 3 ejecuciones × 300 ticks. Mediana de tick < 2 ms en todos los casos, pero **tick máximo con 600 aldeanos: 230 ms (224×224) y 433 ms (480×480) con recursos dispersos; 0,37–5,3 s con recursos densos que se encierran entre sí**, y hasta un 55 % de aldeanos parados (271/600). El presupuesto a 20 ticks/s es de 50 ms. | **Alto** para el objetivo de 600 unidades y para formaciones | Etapa 5: regiones conectadas (descartar destinos inalcanzables al instante), presupuesto de búsquedas por tick, ruta compartida por grupo o flow field. |
| R-3 | La ocupación se recalcula a partir del estado (T-013): 1 ms por tick en 480×480. | [MEDIDO] columna «Ocupación» | Medio | Ocupación incremental al crear o quitar edificios o recursos. Mantener una prueba de equivalencia con el cálculo completo. |
| **R-4** | El color de jugador va fijo en azul. Bloquea los «colores permanentes por imperio» y el minimapa. | [DOC] CREDITS de 0 A.D. | **Alto** antes de la IA (Bloque 5) | Etapa 6: renderizar una máscara del color de jugador (0 A.D. marca esas zonas en sus materiales) y teñirla en Phaser. Fotograma y ancla no cambian. Por verificar en el render. |
| R-5 | Las pruebas de rendimiento en CI son ruidosas: el mismo código dio 14 y 34 FPS. | [PROBADO] informe de auditoría, I-8 | Medio | Medianas de 3 ejecuciones (`perf-audit.mjs`); el iPhone físico es la única validación. |
| **R-6** | 20 PR abiertos en cadenas apiladas y tres registros de requisitos en ramas distintas: riesgo de perder trabajo o requisitos. | [PROBADO] lista de PR y relaciones de ancestros. `DELIVERY_LEDGER.md` solo existe en `chore/rts-specialist-skills-v2`. La matriz de #19 marca ECO-05 «pendiente» aunque los cuatro recursos funcionan, y su encabezado dice «Última actualización: Bloque 1». | **Alto** (es lo que el usuario quiere evitar) | Etapas 1 y 2 |
| R-7 | Hay copias de archivos entre ramas (`villagerArt.ts`, `campArt.ts`). | [PROBADO] `diff` | Bajo | Fusionar en lugar de copiar. Editar cada archivo en un solo lado. |
| R-8 | Ramas huérfanas con trabajo útil: #4 edades (`src/content/ages.ts`), #5 manifest para instalar en iPhone (el v1.1 §35 lo recomienda por el borrado de datos de Safari a los 7 días). | [PROBADO] `git diff --stat` | Medio | Inventario en la etapa 1: integrar, sustituir o archivar, con motivo. |
| R-9 | Licencias: todo el arte es CC-BY-SA 3.0, que obliga a atribución y a compartir igual **los derivados del arte** (los atlas). No obliga al código. | [DOC] CREDITS y LICENSE-0AD | Bajo | Mantener los créditos visibles (el panel los tapa: M-7) y los atlas bajo CC-BY-SA. No mezclar arte con licencia desconocida (`game-art-pipeline-license-audit`). |
| **R-11** | Selección por toque entre edificios solapados: `picking.ts` recorre los edificios por ID y «baja» el toque hasta la altura de pared, sin mirar cuál está dibujado delante. | [PROBADO] `tests/characterization-picking.test.ts`: con un campamento delante del Centro Urbano, tocar su tejado (40 px sobre el centro) **selecciona el Centro Urbano**. Marcado como `todo` (DEF-PICK-01): no rompe el CI. | Medio. Empeora con ciudades densas. | Etapa 3: forma táctil por sprite en el manifiesto y elegir el edificio dibujado más delante. |
| R-12 | El paso 4c del smoke (mi receta) fue intermitente. | [PROBADO] Ejecuciones 38078152830 (WebKit) y 38078679400 (Chromium): fallos de la prueba, no del juego. Corregido y en verde en 38079686193. Detalle en `RECETA_INTEGRACION_VISUAL.md`. | Bajo (corregido) | La prueba reintenta y diagnostica. Dos ejecuciones seguidas en verde (38079686193 y 38080152037). |
| R-10 | Memoria de los atlas 0 A.D. en el iPhone: ~16 MB la aldeana, más el militar cuando entre. | [CÁLCULO] 2048²×4 | Bajo hoy | Medir en el iPhone físico. Opción futura: atlas comprimidos o en dos páginas. |

**Dependencias.**
- La etapa 4 (suelo) precede a cualquier mapa mayor de 64.
- La etapa 5 (rutas) precede a ejércitos y formaciones.
- La etapa 6 (color) precede a la IA y al minimapa.
- El manifiesto (etapa 3) facilita las etapas 4 y 6.

**Conflictos.** Los únicos previstos son los ya documentados en la receta (I-3, I-6) y las copias de R-7.

## E. Plan de migración por etapas (incremental y reversible)

Cada etapa es un PR propio, sobre la rama de integración única, revertible con un `git revert` del PR. Ninguna empieza sin la aprobación de la anterior.

| Etapa | Contenido | Responsable | Criterio de aceptación |
|---|---|---|---|
| **0. Cerrar la etapa actual** (en curso) | Receta visual en #19, panel compacto, puertas del protocolo de ChatGPT | ChatGPT (yo apoyo y reviso) | CI verde en el commit integrado. Smoke 4c. Guardar y cargar con campamentos (ya hay pruebas en 03085cc). Capturas 15–17 revisadas. **Prueba del usuario en su iPhone.** |
| **1. Rama única e inventario de PR** | `integration/next` = #19 + #20 + receta. Cada PR clasificado como integrado, sustituido, archivado (con motivo) o pendiente | Ambos | Para cada PR, un script (`git cherry` o comparación de parches) demuestra que sus cambios están en la rama o anota por qué se descartan. Ningún PR queda sin estado. |
| **2. Registro maestro de requisitos** | Una matriz con fuente, descripción, dependencias, responsable, estado (6 estados), implementación, prueba, evidencia y problemas. Absorbe el ledger y añade los requisitos que faltan (§I) | ChatGPT lidera, yo aporto las filas visuales | Prueba `requirements-registry.test.ts`: IDs únicos, estados válidos, toda fila «probado/integrado» enlaza una prueba existente o una ejecución de CI. Todos los puntos de la lista del usuario tienen ID. |
| **3. Manifiesto de arte único** | `render/art/manifest.ts`; quitar las constantes duplicadas (M-3, M-4, M-5) | Claude | Las pruebas de caracterización y de contrato de arte pasan sin cambios. Smoke 4c y capturas sin diferencias visibles. Skill `architectural-refactor` aprobada antes. |
| **4. Escala del render** | Suelo por bloques visibles con grupo de texturas, o `TilemapLayer` (se elige midiendo); árboles con descarte | Claude | `render-scale` muestra la memoria del suelo **acotada por la pantalla** y no por el mapa (objetivo: < 40 MB en 224 y en 480). Capturas 01–06 iguales a las de antes. Mapa de prueba de 224 en el smoke. Medición en iPhone físico por el usuario. |
| **5. Escala de la simulación** | Regiones conectadas, presupuesto de búsquedas por tick, rutas de grupo, ocupación incremental | ChatGPT; yo aporto los bancos de prueba | `sim-scale`: tick máximo < 50 ms con 600 aldeanos en 224 y 480 (densos y dispersos). Huellas idénticas a la versión anterior en los escenarios deterministas (ninguna regla cambia). |
| **6. Imperios y color** | Varios jugadores en la simulación; máscara de color en el arte | ChatGPT (simulación) y Claude (arte) | Dos imperios con colores distintos en unidades, edificios y minimapa. «Ver por relación» solo en el minimapa (EXC-04). Pruebas de contrato del color. |
| 7 en adelante | Bloques del maestro: casas, granjas, población y producción (Bloque 2) → edades → combate y niebla → IA… | Según el bloque | Los del `ROADMAP.md` |

## F. Reparto propuesto

**Claude**
- Etapa 3 (manifiesto de arte).
- Etapa 4 (escala del render).
- La parte de arte de la etapa 6 (color de jugador).
- Bancos de escala y pruebas de caracterización.
- Auditorías visuales y de navegador.
- Interfaz móvil: proponer y probar el panel compacto, coordinado con ChatGPT, porque `App.tsx` es de su rama.
- Los errores visuales abiertos: M-1, M-2 junto con la integración, e I-7 tras la congelación.

**ChatGPT**
- Etapa 0 (líder).
- Etapa 2 (registro).
- Etapa 5 (simulación).
- La parte de simulación de la etapa 6.
- Persistencia (ranuras, autoguardado, exportación).
- Integración funcional y pruebas de lógica y regresión.

**Ambos**
- Etapa 1 (inventario de PR).
- Revisión cruzada de cada PR del otro.

## G. Evidencias consultadas

**Documentos**
- `docs/MASTER_DESIGN.md` (v2.0, copia literal), `DECISIONS.md`, `ROADMAP.md`, `REQUIREMENTS_MATRIX.md` (#19) y `PROCESO_PRUEBAS.md`.
- `docs/QUALITY_AND_CONSOLIDATION_PROTOCOL.md` (#19, efe8e51).
- `docs/DELIVERY_LEDGER.md` (`chore/rts-specialist-skills-v2`).
- `docs/reports/CODE_HEALTH_AUDIT.md` (#17), `INTEGRATION_AUDIT_2026-10-10.md`, `VILLAGER_INTEGRATION.md`, `AUDITORIA_VISUAL_2026-10-10.md` y `RECETA_INTEGRACION_VISUAL.md`.
- `docs/research/AGE_OF_AI_PORTABILITY.md`.
- Documentos del proyecto de Claude: `RTS_Documento_Maestro_AoE_v1.1.md` y `Respuestas_actualizadas_v1.md`, ambos sustituidos por el v2 salvo lo que se indica en §I.

**Código revisado**
- `src/simulation/{world,grid,pathfinding,commands,villager,terrainGen}.ts`
- `src/render/{GameScene,entityView,art,picking,entityTextures}.ts`
- `src/content/config.ts`

**Ramas y PR**
- Los 20 PR, con las relaciones de ancestros de las 20 ramas principales.

**Pruebas ejecutadas en esta sesión**
- 78 unitarias en la rama de análisis (77 superadas y 1 `todo` documentado, DEF-PICK-01), incluidas 4 de caracterización del contrato de arte y 2 de selección por toque. Las de arte comprueban que cada fotograma que pide el código existe en su atlas, incluido todo fotograma de suelo que puede generar el terreno de 48 y 160.
- Bancos: `scripts/bench/sim-scale.ts` (datos en `docs/analysis/data/sim-scale-recursos-{densos,dispersos}.md`) y `scripts/bench/render-scale.ts` (`data/render-scale.md`).
- CI de la receta: 38076689613 (verde) y capturas 38076691119.

**Fuentes técnicas externas (2: técnica conocida)**
- HPA*, búsqueda jerárquica de rutas (Botea, Müller y Schaeffer, 2004).
- Flow fields para multitudes.
- Phaser 4 `TilemapLayer` isométrico; `TilemapGPULayer` solo es ortogonal.

No se ha leído ni copiado código de juegos comerciales.

## H. Preguntas que solo puede responder el usuario

Tu lista de la nueva dirección incluye puntos que el documento maestro **v2** (la regla de precedencia vigente) sustituyó o aplazó. No los decido yo:

1. **Trucos.** El v2 solo nombra «quitar niebla» y los objetivos de 600/300. El v1.1 (§36) además incluía recursos, población, edad instantánea, construcción e investigación instantáneas, terreno, superunidades y +20 % a las estadísticas. ¿Siguen vigentes los del v1.1?
2. **Comandantes y héroes.** El v2 §12 los reserva para una versión futura, con habilidades fijas y sin niveles. Tu lista los incluye en «Ejércitos». ¿Entran en la primera versión o siguen reservados?
3. **Prioridades automáticas de aldeanos y punto de reunión de aldeanos libres.** El v1.1 §12 los define; el v2 §3 los aplaza a una expansión. Los puntos de reunión de los edificios (AoE II) sí están en el v2. ¿Quieres en la primera versión las prioridades automáticas y el punto de reunión de aldeanos libres?
4. **600/300.** En el v2 son militares, solo en modo trucos y solo tras un benchmark. En el v1.1 eran el límite total de unidades. ¿Cuál vale?

La reorganización de PR (etapa 1) cierra o sustituye PR que abriste tú. La haremos solo con tu visto bueno, PR por PR.

## I. Requisitos faltantes, contradictorios o desactualizados en la matriz

| Punto | Situación | Propuesta |
|---|---|---|
| Colores permanentes por imperio | Sin ID propio: solo aparece dentro de UI-10 | Nuevo ID IMP-01 (colores fijos y no seleccionables rojo, verde ni amarillo si se confirma el v1.1 §31). Bloqueado por R-4. |
| Condiciones de victoria configurables | Solo implícita en UI-11 | Nuevo ID VIC-06 |
| Trucos: marco, registro, confirmación, nunca para la IA | Solo NIE-03 (niebla) | Nuevos ID TRA-01..05, según la respuesta a H-1 |
| Partidas largas y recuperables | Sin prueba de larga duración | Nuevo ID GUA-08: 1 h simulada → guardar, cargar y continuar con la misma huella; tamaño del guardado |
| App instalable en iPhone (#5) | Sin ID; PR huérfano | Nuevo ID INF-13 |
| Edades (#4) | CIV-01 «pendiente», pero existe un `ages.ts` en un PR huérfano | Anotarlo en CIV-01 |
| ECO-05 (cuatro recursos), ECO-06 (depósitos), VIS-07 (panel) | Marcados «pendiente» aunque están implementados o probados | Actualizar con evidencia (ChatGPT) |
| Estados | La matriz usa 4 estados; el protocolo de ChatGPT, 6 | Adoptar los 6 en la matriz (etapa 2) |
| Rendimiento de rutas con grupos grandes | UNI-03 no cubre la escala | Nuevo ID REN-07: tick máximo < 50 ms con 600 unidades (etapa 5) |
| Memoria del render por tamaño de mapa | No existe | Nuevo ID REN-08 (etapa 4) |
| Atacar-mover | El v1.1 lo prohibía; el v2 lo incluye en UNI-02 (AoE II DE) | Resuelto por precedencia: vale el v2. Solo se anota. |

---

**Lo que este análisis no hace:** no cambia el juego, no migra nada y no mide en un iPhone. Las cifras [MEDIDO] son de la CPU de la sesión; las [CÁLCULO] salen del código y se pueden reproducir con los scripts de `scripts/bench/`.
