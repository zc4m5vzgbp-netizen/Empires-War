---
name: rts-combat-balance-engineer
description: Combate reproducible y balance verificable; activar solo para cambios relevantes en Empires-War.
---
# Combate reproducible y balance verificable

## Activación
Cambios en unidades militares, ataque, armaduras, alcance, daño, objetivos, tecnologías, comandantes o reglas de victoria. Consultar `AGENTS.md`, `docs/REQUIREMENTS_MATRIX.md` y `docs/DELIVERY_LEDGER.md`. Coordinar entregas de varios sistemas mediante `rts-delivery-orchestrator`.

## Procedimiento específico
Definir tablas versionadas de reglas y valores provisionales; probar daño por tick, rango, enfriamiento, muertes, selección de objetivos, aliados, edificios y cancelaciones; separar mecánica del render; ejecutar escenarios con semillas y registrar resultados de balance.

## Ejercicio de aceptación
Dos unidades autorizadas resuelven un duelo determinista, sin daño a aliados y sin duplicar ataques por animación; tests de coste/producción pasan.

## Evidencia exigida
Log de combate, estados antes/después, tests, fuente de balance, desviaciones y decisiones pendientes.

## Límites
- No marcar implementado, equilibrado ni probado sin ejecutar pruebas relevantes y conservar resultados.
- Los valores AoE II DE sin fuente y versión son provisionales, nunca afirmaciones de balance oficial.
- No tocar `main`, publicar, fusionar ni modificar ramas de Claude sin aprobación expresa.
- No duplicar las reglas generales de `empires-war-development`; esta Skill contiene solo especialización del subsistema.
