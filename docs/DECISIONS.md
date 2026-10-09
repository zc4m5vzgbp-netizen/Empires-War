# Registro de decisiones — Empires-War

Las decisiones explícitas del usuario prevalecen. Toda sustitución queda registrada aquí con su origen.

## Decisiones vigentes

| ID | Fecha | Decisión | Origen |
|---|---|---|---|
| D-001 | 2026-10-09 | Referencia funcional: Age of Empires II: Definitive Edition, salvo las excepciones del §3 del documento maestro v2 | Documento maestro v2, §1 |
| D-002 | 2026-10-09 | Pila: Phaser 4 + TypeScript + Vite, Preact, IndexedDB, GitHub Actions y GitHub Pages | Documento maestro v2, §9 |
| D-003 | 2026-10-09 | Repositorio público `Empires-War` en la cuenta del usuario; publicado en `https://zc4m5vzgbp-netizen.github.io/Empires-War/` | Usuario; público porque Pages gratuito lo requiere |
| D-004 | 2026-10-09 | Reserva común del imperio al estilo AoE II DE; sin almacenes con capacidad ni pago por almacén | Documento maestro v2, §3 y §4 (sustituye v1.1 §13) |
| D-005 | 2026-10-09 | Dispositivo de referencia: iPhone 15 Pro Max; la fluidez prevalece | Documento maestro v2, §3.9 |

## Decisiones técnicas del Bloque 0 (tomadas por Claude, sin cambiar la arquitectura aprobada)

| ID | Decisión | Motivo |
|---|---|---|
| T-001 | La entrada táctil, de ratón y de teclado la gestiona `src/input` con eventos Pointer del navegador; la entrada propia de Phaser está desactivada | Control preciso de gestos en iPhone y una sola vía para convertir entrada en órdenes de simulación (Bloque 1) |
| T-002 | Modelo de cámara puro (`src/render/cameraModel.ts`) que Phaser copia cada frame | Permite probar zoom y desplazamiento sin navegador |
| T-003 | Pruebas con el ejecutor nativo de Node (`node:test`) vía `tsx`, en lugar de Vitest | Menos dependencias; las mismas pruebas corren en la sesión de Claude y en Actions |
| T-004 | Segunda comprobación de tipos (`tsconfig.sim.json`) sin DOM ni Phaser para simulación, contenido y formato de guardado | Garantiza por compilación que la simulación no depende del navegador |
| T-005 | Vite en la línea 7.x | La compatibilidad con Vite 8 no pudo verificarse desde la sesión (sin acceso al registro npm); la versión exacta instalada se registra desde Actions |
| T-006 | Phaser en un archivo aparte al compilar | Caché del navegador entre publicaciones |
| T-007 | Arte provisional generado por código (rombos de terreno, árbol) | Sin archivos de terceros; reemplazable sin tocar la simulación |
| T-009 | Phaser 4 tipa `fillPoints` con su propio `Vector2`; los polígonos se trazan con `beginPath/moveTo/lineTo` | Primer error real de compatibilidad Phaser 3 → 4 detectado en CI y corregido |
| T-010 | GitHub Pages lo activa el usuario una vez (Settings → Pages → Source: GitHub Actions) | El token del workflow no tiene permiso para crear el sitio de Pages |
| T-008 | Lienzo a resolución 1× (sin ajuste para pantallas retina) | Rendimiento; los textos de interfaz son HTML y se ven nítidos. Se revisará con arte definitivo |

## Versiones de dependencias

`package.json` fija estas versiones exactas (sin `^`), verificadas en CI:
Versiones exactas instaladas en GitHub Actions (ejecución 37968570376, 2026-10-09): `phaser 4.2.1`, `preact 10.29.8`, `vite 7.3.7`, `typescript 6.0.3`, `tsx 4.23.15`, `@types/node 22.20.5`.
Combinación verificada: typecheck, pruebas y compilación pasan con estas versiones.

## Reglas sustituidas (historial)

| Antes | Ahora | Origen |
|---|---|---|
| AoE clásico genérico | AoE II DE | v2 §14 |
| Almacenes físicos con capacidad y pago por ubicación | Reserva común | v2 §3, §14 |
| Granjas con renovación de madera inventada | Costes de resembrado de AoE II DE | v2 §3, §14 |
| Reembolso fijo del 75 % al cancelar | Mecánica de AoE II DE documentada | v2 §3, §14 |
| Casa +10 de población | Valor de AoE II DE | v2 §6, §14 |
| Victoria por maravilla | Maravillas sin victoria automática | v2 §3.2 |
| Continuación persistente tras la victoria | Descartada | v2 §8 |
| Diplomacia avanzada | Clásica | v2 §8 |
| Comandantes, día/noche, territorios, naval | Versiones futuras | v2 §12 |
| «Ver por relación» en minimapa y anillos | Solo minimapa | v2 §3.4 |
| 4.800 unidades obligatorias | Benchmark exploratorio; fluidez primero | v2 §10 |
| Límite de 600 para todas las unidades | Población normal separada de los objetivos 600/300 militares en trampas | v2 §3.5 |
| Prioridades automáticas de aldeanos (incendios, reparación, economía, reunión) | No en la primera versión; especificación para una expansión futura | v2 §3 |
| Reacción ante amenaza por línea de visión (propuesta v1.1) | Daño recibido o enemigo a ≤ 6 casillas atacando a un aliado | v2 §3.3 |
| Vados para casi todas las unidades (v1.1) | Solo exploradores y caballería ligera | v2 §3.6 |
| Sin capital (v1.1) | Capital transferible; su destrucción no causa derrota | v2 §3.1 |
