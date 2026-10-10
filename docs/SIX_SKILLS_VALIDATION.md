# Plan de validación — Skills especializadas (plan original de seis; dos consolidadas)

Fecha: 2026-10-10. Estado: **instrucciones creadas, beneficios todavía no demostrados**.

| Skill | Primera tarea real | Métrica de utilidad | Estado |
| --- | --- | --- | --- |
| mobile-rts-testing | VIS-07, panel sobre piedra | toque → orden → +10 piedra en WebKit | Pendiente |
| rts-performance-benchmarking | población 100/300/600 | mediana FPS y p95 tick por escenario | Pendiente |
| rts-delivery-orchestrator (absorbe PR guard) | PR #10 + #11 | conflictos, solapamientos, regresiones detectadas | Pendiente |
| savegame-integrity-determinism | partida guardada/reanudada | igualdad de estado y ticks, recuperación | Pendiente |
| empires-war-development (absorbe combate) | primera unidad militar funcional | pruebas deterministas de orden/daño/producción | Pendiente |
| game-art-pipeline-license-audit | sprites del PR #11 | frames, anclas, licencias y carga diferida | Pendiente |

## Método
1. Antes de la tarea: registrar problema y estado de referencia, comandos y pruebas existentes.
2. Aplicar solo la Skill correspondiente; conservar resultados y errores.
3. Después: comparar pruebas nuevas, defectos reales detectados, tiempo si puede medirse y coste de mantenimiento.
4. Si no hay ejecución real, marcar **sin verificar**. No atribuir a la Skill un beneficio que ya existía.
5. No copiar automáticamente herramientas externas ni ejecutar scripts no auditados.
6. El PR de Skills no cambia simulación, render, UI ni CI; el beneficio funcional solo se verificará al usarlo en trabajo posterior.

## Dependencias
Las seis Skills se añaden sobre la rama candidata del PR #10, sin tocar PR #11 de Claude ni `main`. Las pruebas automáticas de código deben ejecutarse al integrar cambios funcionales; este PR solo documenta procedimientos.

## Consolidación aprobada
Se retiraron las Skills independientes `github-pr-integration-guard` y `rts-gameplay-combat-verification`, después de trasladar sus procedimientos a `rts-delivery-orchestrator` y `empires-war-development`, respectivamente. `architectural-refactor` permanece en el repositorio, archivada/inactiva por defecto. Inventario objetivo: siete activas, una archivada. Los criterios siguen pendientes de pruebas reales.
