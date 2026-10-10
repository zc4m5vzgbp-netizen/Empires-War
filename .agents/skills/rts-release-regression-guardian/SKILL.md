---
name: rts-release-regression-guardian
description: Puerta de publicación y regresión de juego completo; activar solo para cambios relevantes en Empires-War.
---
# Puerta de publicación y regresión de juego completo

## Activación
Antes de promover candidata, desplegar Pages, fusionar a main o etiquetar release. Consultar `AGENTS.md`, `docs/REQUIREMENTS_MATRIX.md` y `docs/DELIVERY_LEDGER.md`. Coordinar entregas de varios sistemas mediante `rts-delivery-orchestrator`.

## Procedimiento específico
Congelar SHA y dependencias; verificar matriz y ledger sin requisitos desaparecidos; ejecutar typecheck, test, build, verify:dist y smoke WebKit/Chromium según cambios; comprobar carga de assets, licencias, controles, economía y rollback; solicitar aprobación explícita para main; verificar Pages solo tras publicar.

## Ejercicio de aceptación
Una candidata se rechaza si falla selección táctil de piedra, descarga militar innecesaria o pérdida de datos; nunca confundir CI verde con prueba en iPhone físico.

## Evidencia exigida
SHA, resultados por comando, enlaces CI, checklist de riesgos, aprobación y plan de reversión.

## Límites
- No marcar implementado, equilibrado ni probado sin ejecutar pruebas relevantes y conservar resultados.
- Los valores AoE II DE sin fuente y versión son provisionales, nunca afirmaciones de balance oficial.
- No tocar `main`, publicar, fusionar ni modificar ramas de Claude sin aprobación expresa.
- No duplicar las reglas generales de `empires-war-development`; esta Skill contiene solo especialización del subsistema.
