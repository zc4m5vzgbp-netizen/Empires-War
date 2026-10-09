# Matriz de requisitos — Empires-War

Fuente: `docs/MASTER_DESIGN.md` (documento maestro v2.0). Cada requisito tiene un ID estable, su sección de origen, el bloque en que se entrega, su estado y la prueba que lo demuestra.

**Estados:** `pendiente` · `en progreso` · `implementado` (código existe, sin prueba ejecutada) · `probado` (prueba ejecutada y aprobada; se indica dónde).
Regla: nada se marca `probado` si la prueba no se ejecutó de verdad.

Última actualización: Bloque 0.

## Infraestructura y arquitectura (INF, ARQ)

| ID | Requisito | § | Bloque | Estado | Prueba / evidencia |
|---|---|---|---|---|---|
| INF-01 | Repositorio GitHub `Empires-War` | 11, 13 | 0 | probado | Creado por el usuario; acceso de escritura de Claude comprobado al subir el primer commit |
| INF-02 | Vite + TypeScript | 9 | 0 | implementado | `npm run build` en GitHub Actions |
| INF-03 | Phaser 4 para render | 9 | 0 | implementado | `npm run typecheck` + build en Actions |
| INF-04 | Preact para la interfaz | 9 | 0 | implementado | `npm run typecheck` + build en Actions |
| INF-05 | Publicación en GitHub Pages bajo `/Empires-War/` | 11 | 0 | implementado | `tests/architecture.test.ts` (configuración, probado local) + `scripts/verify-dist.mjs` en Actions + URL publicada |
| INF-06 | GitHub Actions: typecheck, pruebas, build y despliegue | 11 | 0 | implementado | Ejecución del workflow `Comprobar y publicar` |
| INF-07 | El usuario no necesita Node ni terminal | 13 | 0 | implementado | Todo corre en GitHub Actions |
| INF-08 | Versiones exactas registradas | 9 | 0 | en progreso | Paso `npm ls --depth=0` del workflow → `docs/DECISIONS.md` |
| INF-09 | Archivo de bloqueo de dependencias (`package-lock.json`) en el repositorio | 9 | 1 | pendiente | El registro npm no es accesible desde la sesión de Claude; se añadirá desde CI |
| ARQ-01 | Módulos separados: simulation, content, render, ui, input, persistence, tests | 9 | 0 | probado | `tests/architecture.test.ts` (local) |
| ARQ-02 | Simulación independiente de Phaser, Preact y del navegador | 9 | 0 | probado | `tests/architecture.test.ts` + `tsconfig.sim.json` sin DOM (local) |
| ARQ-03 | Estado serializable | 9 | 0 | probado | `tests/simulation.test.ts` (JSON ida y vuelta, local) |
| ARQ-04 | Tick fijo (20/s) separado del render | 9, 10 | 0 | probado | `tests/simulation.test.ts` (reloj, local); medición en el HUD |
| ARQ-05 | Semilla reproducible, sin aleatorio del navegador en la simulación | 9 | 0 | probado | `tests/simulation.test.ts` + `tests/architecture.test.ts` (local) |
| ARQ-06 | IDs estables de entidades | 9 | 1 | en progreso | `nextEntityId` existe en el estado; las entidades llegan en el Bloque 1 |
| ARQ-07 | Sin física de Phaser como fuente de verdad | 9 | 0 | implementado | Phaser no tiene física activada; la simulación es propia |
| ARQ-08 | Preparado para Web Worker | 9 | 6 | pendiente | Simulación pura ya aislada; migración solo si las pruebas lo justifican |
| ARQ-09 | Fórmulas y redondeos en un solo módulo de simulación | 4 | 2 | pendiente | — |
| ARQ-10 | Catálogo tipado con `sourceVersion`, `sourceNote` y `verified/provisional` | 4 | 0 | probado | `src/content/types.ts`; `tests/architecture.test.ts` (local) |

## Escena, cámara y controles (UI, INP)

| ID | Requisito | § | Bloque | Estado | Prueba / evidencia |
|---|---|---|---|---|---|
| UI-01 | Escena isométrica visible de prueba, rotulada como «no es gameplay» | 2, 11 | 0 | implementado | Prueba manual en iPhone y PC |
| UI-02 | Terreno provisional original | 1, 7 | 0 | implementado | `src/render/textures.ts` (generado por código, sin archivos de terceros) |
| INP-01 | Desplazar cámara: arrastre táctil, ratón, teclado (WASD/flechas) | 7 | 0 | implementado | Lógica: `tests/render-math.test.ts` (local); manual en iPhone/PC |
| INP-02 | Zoom: pellizco, rueda, botones +/− | 7 | 0 | implementado | Lógica: `tests/render-math.test.ts` (local); manual |
| INP-03 | Sin teclado obligatorio en iPhone; botones táctiles ≥ 48 px | 7 | 0 | implementado | Prueba manual en iPhone |
| INP-04 | Inspeccionar casilla con un toque | — | 0 | implementado | Prueba manual |
| UI-03 | Medición en pantalla: FPS, ticks/s, tiempo de tick, zoom | 10 | 0 | implementado | Prueba manual |
| UI-04 | Pantalla de error con «Copiar error» | 13 | 0 | implementado | Prueba manual (solo aparece si hay error) |
| UI-05 | Selección de unidades (toque y arrastre de caja) | 2, 11 | 1 | pendiente | — |
| UI-06 | Órdenes de movimiento | 2, 11 | 1 | pendiente | — |
| UI-07 | Interfaz adaptable y legible en pantallas pequeñas; botones contextuales | 7 | 1–6 | en progreso | — |
| UI-08 | Controles PC completos (atajos, clic derecho) | 7 | 2–4 | pendiente | — |
| UI-09 | Minimapa con modo normal | 7 | 4 | pendiente | — |
| UI-10 | Botón «Ver por relación» solo en el minimapa (EXC-04) | 3.4 | 4 | pendiente | — |
| UI-11 | Opciones de partida (mapa, jugadores, civilizaciones, dificultad, recursos, edad inicial, condiciones) | 7 | 5 | pendiente | — |
| UI-12 | Accesibilidad | 11 | 6 | pendiente | — |

## Economía (ECO)

| ID | Requisito | § | Bloque | Estado | Prueba / evidencia |
|---|---|---|---|---|---|
| ECO-01 | Aldeano que se desplaza, recolecta y deposita | 2, 11 | 1 | pendiente | — |
| ECO-02 | Reserva común del imperio; depositar suma al contador global | 3, 4 | 1 | pendiente | — |
| ECO-03 | Pagar costes desde la reserva común, sin almacén pagador | 3, 4 | 1 | pendiente | — |
| ECO-04 | Construcción básica de prueba | 2, 11 | 1 | pendiente | — |
| ECO-05 | Cuatro recursos: comida, madera, oro, piedra | 4 | 2 | pendiente | — |
| ECO-06 | Tareas clásicas de aldeanos y edificios de depósito compatibles | 4 | 2 | pendiente | — |
| ECO-07 | Granjas y resembrado con costes de AoE II DE | 3, 4 | 2 | pendiente | — |
| ECO-08 | Costes, tiempos, tasas y bonificaciones de una versión documentada de AoE II DE | 4 | 2 | pendiente | — |
| ECO-09 | Población y casas según AoE II DE (no «+10 por casa») | 6, 14 | 2 | pendiente | — |
| ECO-10 | Colas de producción | 6 | 2 | pendiente | — |
| ECO-11 | Mercado con precios variables | 4 | 5 | pendiente | — |
| ECO-12 | Comerciantes terrestres entre mercados | 4, 8 | 5 | pendiente | — |
| ECO-13 | Sin automatizaciones de aldeanos no clásicas (incendios, reparación autónoma, redistribución) | 3 | todos | implementado | Ausencia verificada en revisión de cada bloque |

## Civilizaciones, edades y tecnologías (CIV)

| ID | Requisito | § | Bloque | Estado | Prueba / evidencia |
|---|---|---|---|---|---|
| CIV-01 | Cuatro edades: Oscura, Feudal, Castillos, Imperial | 5 | 3 | pendiente | — |
| CIV-02 | Requisitos y costes de transición de AoE II DE | 5 | 3 | pendiente | — |
| CIV-03 | Primera civilización de prueba, nunca presentada como final | 5 | 3 | pendiente | — |
| CIV-04 | Tecnologías en sus edificios, efectos sobre unidades/actividades | 5 | 3 | pendiente | — |
| CIV-05 | Cancelación y reembolso según AoE II DE documentado; distinguir cancelación manual, destrucción del edificio, investigación y producción | 3, 5 | 3 | pendiente | — |
| CIV-06 | Múltiples civilizaciones con roster, bonificaciones, restricciones y árbol propios | 5 | 6 | pendiente | — |

## Unidades y combate (UNI)

| ID | Requisito | § | Bloque | Estado | Prueba / evidencia |
|---|---|---|---|---|---|
| UNI-01 | Estadísticas parametrizadas: vida, ataque, defensa, bonificaciones, alcance, visión, velocidad, costes | 6 | 4 | pendiente | — |
| UNI-02 | Órdenes: mover, atacar, atacar-mover, patrullar, defender, mantener posición, formaciones, puntos de reunión | 6 | 4 | pendiente | — |
| UNI-03 | Colisiones, rutas y obstáculos sin atravesar edificios ni bloqueos permanentes | 6 | 1–4 | pendiente | — |
| UNI-04 | Daño a edificios, estados visuales, derrumbe y reparación según AoE II DE | 6 | 4 | pendiente | — |
| UNI-05 | Sin fuego propagable ni ruinas persistentes especiales | 6 | todos | implementado | Ausencia verificada en revisión |
| UNI-06 | Límites de población clásicos configurables | 6 | 2 | pendiente | — |
| UNI-07 | Reacción de aldeanos: daño recibido o enemigo a ≤ 6 casillas atacando a un aliado (EXC-03) | 3.3 | 4 | pendiente | — |

## Mapa y niebla (MAP, NIE)

| ID | Requisito | § | Bloque | Estado | Prueba / evidencia |
|---|---|---|---|---|---|
| MAP-01 | Perspectiva isométrica | 7 | 0 | implementado | `src/render/iso.ts`; `tests/render-math.test.ts` (local) |
| MAP-02 | Mapa determinista por semilla | 7 | 0 | probado | `tests/simulation.test.ts` (local) |
| MAP-03 | Mapa procedural cerrado de juego real | 7 | 2 | pendiente | El Bloque 0 usa un terreno de prueba de 48 × 48 |
| MAP-04 | Tamaños 160, 224, 320; 480 × 480 solo si pasa pruebas | 7 | 2–6 | pendiente | — |
| MAP-05 | Biomas, elevaciones, obstáculos y recursos según AoE II DE | 7 | 2–6 | pendiente | — |
| MAP-06 | Ríos: solo exploradores y caballería ligera vadean; resto necesita puente (EXC-06) | 3.6 | 4+ | pendiente | No necesario en el Bloque 1 |
| NIE-01 | Niebla normal para jugador e IA; explorado ≠ visible | 7 | 4 | pendiente | — |
| NIE-02 | La IA no conoce posiciones ocultas | 7, 8 | 4–5 | pendiente | — |
| NIE-03 | Trampa «quitar niebla» solo del jugador, sin visión para la IA, registrada (EXC-05) | 3.5 | 4–6 | pendiente | — |

## IA, diplomacia y victoria (IA, DIP, VIC)

| ID | Requisito | § | Bloque | Estado | Prueba / evidencia |
|---|---|---|---|---|---|
| IA-01 | IA clásica: recolecta, construye, avanza edades, entrena, defiende, ataca | 8 | 5 | pendiente | — |
| IA-02 | Dificultad seleccionable | 8 | 5 | pendiente | — |
| IA-03 | Sin recursos gratis, omnisciencia ni bonificaciones ocultas | 8 | 5 | pendiente | — |
| IA-04 | En el Bloque 1 la IA es ausente o dummy rotulada | 11 | 1 | pendiente | — |
| DIP-01 | Diplomacia clásica aliado/neutral/enemigo, sin tratados avanzados | 8 | 5 | pendiente | — |
| VIC-01 | Capital = primer Centro Urbano, transferible formalmente; destruirla no causa derrota (EXC-01) | 3.1 | 5 | pendiente | — |
| VIC-02 | Derrota del jugador al perder todos sus Centros Urbanos (EXC-01) | 3.1, 8 | 5 | pendiente | — |
| VIC-03 | Maravillas construibles sin victoria automática ni temporizador (EXC-02) | 3.2 | 5 | pendiente | — |
| VIC-04 | Sin modo persistente tras la victoria | 8 | todos | implementado | Ausencia verificada en revisión |
| VIC-05 | Superficie construida: métrica descriptiva sin fronteras ni bonificaciones (EXC-07) | 3.7 | 5 | pendiente | — |

## Guardado (GUA)

| ID | Requisito | § | Bloque | Estado | Prueba / evidencia |
|---|---|---|---|---|---|
| GUA-01 | Formato de guardado versionado con validación | 9 | 0 | probado | `tests/persistence.test.ts` (local) |
| GUA-02 | Guardado y carga inicial en el juego (IndexedDB) | 2, 11 | 1 | pendiente | — |
| GUA-03 | Pausar solo durante la escritura; reanudar si estaba en marcha, conservar pausa si estaba pausado (EXC-08) | 3.8, 9 | 1 | pendiente | El reloj ya tiene estado de pausa |
| GUA-04 | Varias ranuras, guardado manual y automático | 9 | 6 | pendiente | — |
| GUA-05 | Carga verificada, manejo de errores, escritura atómica cuando sea posible | 9 | 1–6 | en progreso | Validación y huella ya probadas (local) |
| GUA-06 | Explicar al usuario que borrar datos del navegador puede eliminar partidas | 9 | 1 | pendiente | — |
| GUA-07 | Exportar/importar guardados | 9 | 6 (antes si es sencillo) | pendiente | — |

## Rendimiento (REN)

| ID | Requisito | § | Bloque | Estado | Prueba / evidencia |
|---|---|---|---|---|---|
| REN-01 | Instrumentar FPS y tiempo de tick | 10 | 0 | implementado | HUD; prueba manual |
| REN-02 | Instrumentar memoria, unidades activas y tiempo de pathfinding | 10 | 2–4 | pendiente | — |
| REN-03 | Escenarios exploratorios con 600, 1.200, 2.400, 3.600 y 4.800 unidades, con registro de condiciones | 10 | 4–6 | pendiente | — |
| REN-04 | La fluidez en iPhone 15 Pro Max prevalece sobre tamaño de mapa, unidades o detalle (EXC-09) | 3.9 | todos | en progreso | Escena de prueba medida en el dispositivo por el usuario |
| REN-05 | Trampas: objetivos de 600 militares del jugador y 300 por IA, solo tras benchmark (EXC-05) | 3.5, 6 | 6 | pendiente | — |
| REN-06 | Calidad gráfica escalable | 7 | 6 | pendiente | — |

## Propiedad intelectual y proceso (PI, PRO)

| ID | Requisito | § | Bloque | Estado | Prueba / evidencia |
|---|---|---|---|---|---|
| PI-01 | Sin activos, código, voces ni marcas de AoE II DE | 1, 13 | todos | implementado | Todo el arte del Bloque 0 se genera por código |
| PI-02 | Datos numéricos con procedencia y versión; nunca presentados como verificados sin verificar | 1, 4 | 2+ | en progreso | Tipo `Sourced` en `src/content/types.ts` |
| PRO-01 | Esta matriz, decisiones y hoja de ruta mantenidas en cada bloque | 10 | todos | en progreso | `docs/` |
| PRO-02 | Cada bloque entrega: lista de archivos, pruebas, resultados, pendientes y URL verificada | 10, 13 | todos | en progreso | Informe de entrega de cada bloque |

## Funciones reservadas para el futuro (NO implementar ahora, §12)

| ID | Función | Estado |
|---|---|---|
| FUT-01 | Ciclo día/noche | reservado |
| FUT-02 | Comandantes históricos | reservado |
| FUT-03 | Conquista territorial y fronteras | reservado |
| FUT-04 | Naval: batallas, pesca, comercio y transporte | reservado |
| FUT-05 | Destrucción avanzada y fuego propagable | reservado |
| FUT-06 | IA diplomática avanzada y tratados | reservado |
| FUT-07 | Cámara lenta en batallas | reservado |
| FUT-08 | Economía civil, población urbana, ciudades vivas, automatizaciones de aldeanos no clásicas (incluye la prioridad incendios → reparación → economía → reunión como especificación) | reservado |
| FUT-09 | Expansión persistente tras victoria | reservado |
| FUT-10 | Multijugador, cuentas y nube | reservado |
