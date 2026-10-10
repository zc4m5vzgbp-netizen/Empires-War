# Inventario de Skills v2 — Empires-War

## 12 activas
| Skill | Responsable técnico | Evidencia de valor a medir |
|---|---|---|
| rts-delivery-orchestrator | Seguimiento transversal y compatibilidad PR | requisitos omitidos detectados, integración sin pérdida |
| empires-war-development | Desarrollo, depuración y regresiones generales | bugs reproducidos y corregidos con pruebas |
| mobile-rts-testing | Toques, HUD, WebKit | regresiones táctiles detectadas |
| rts-performance-benchmarking | Phaser/ticks/pathfinding y Preact/DOM | FPS, p95 tick, bundle, latencia |
| savegame-integrity-determinism | IndexedDB, partidas largas | igualdad de estados, migraciones |
| game-art-pipeline-license-audit | Atlas, créditos y cargas | frames/licencias validados |
| rts-ai-strategy-engineer | IA sin trampas | decisiones reproducibles y conocimiento correcto |
| rts-pathfinding-army-movement | Rutas y grupos | atascos y costes de ruta |
| rts-economy-production-engineer | ECO-05..10 | conservación de recursos, colas y granjas |
| rts-combat-balance-engineer | UNI-01..07 | daño determinista, reglas versionadas |
| rts-world-generation-fog | Mapas/niebla | conectividad y aislamiento de visibilidad |
| rts-release-regression-guardian | Candidatas/Pages | regresiones bloqueadas antes de release |

## Archivada
`architectural-refactor`: conservar el archivo, inactiva por defecto; activar solo tras aprobar una refactorización justificada.

## Fusionadas / eliminadas como archivos independientes
- `github-pr-integration-guard` → `rts-delivery-orchestrator`.
- `rts-gameplay-combat-verification` → `empires-war-development`; las reglas y el balance especializados quedan en `rts-combat-balance-engineer`.
- `preact-web-performance` → `rts-performance-benchmarking`.

## Activación y evaluación
1. Orquestadora solo para entregas multisistema y auditorías de otra IA; Core Development para implementación y depuración.
2. Activar solo especialistas afectados por el cambio; registrar matriz de requisitos y ledger.
3. En las próximas dos entregas funcionales, comparar fallos detectados, pruebas nuevas, regresiones y tiempo de revisión con la línea base.
4. Si una Skill no produce beneficio distinguible o duplica otra, simplificarla o fusionarla.
5. **Estado actual: definición/documentación preparada; no se han ejecutado pruebas funcionales ni benchmarks como parte de este PR.**

## Prioridad de aplicación
Primero ECO-06 (aldeana, depósitos, integración), después rutas/grupos y protección de release; combate/IA/mapas cuando sus bloques entren en desarrollo. No tocar ramas de Claude ni main sin autorización.
