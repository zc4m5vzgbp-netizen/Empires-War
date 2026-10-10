---
name: rts-pathfinding-army-movement
description: Rutas y movimiento grupal escalables; activar solo para cambios relevantes en Empires-War.
---
# Rutas y movimiento grupal escalables

## Activación
Cambios de A*, ocupación, vados, obstáculos, formaciones, selección de ejército o comandantes. Consultar `AGENTS.md`, `docs/REQUIREMENTS_MATRIX.md` y `docs/DELIVERY_LEDGER.md`. Coordinar entregas de varios sistemas mediante `rts-delivery-orchestrator`.

## Procedimiento específico
Separar pathfinding global de seguimiento local; reutilizar rutas compartidas por grupo cuando sea válido; validar esquinas, caminos bloqueados, replanteo, colisiones, pasos lentos y destino inaccesible; medir 100/300/600 entidades antes de optimizar.

## Ejercicio de aceptación
Grupo alcanza destino rodeando edificio sin atravesarlo ni atascarse indefinidamente; vado reduce velocidad conforme a regla aprobada.

## Evidencia exigida
Casos de mapa/semilla, tiempo de ruta, p95 tick, capturas y fallos reproducibles.

## Límites
- No marcar implementado, equilibrado ni probado sin ejecutar pruebas relevantes y conservar resultados.
- Los valores AoE II DE sin fuente y versión son provisionales, nunca afirmaciones de balance oficial.
- No tocar `main`, publicar, fusionar ni modificar ramas de Claude sin aprobación expresa.
- No duplicar las reglas generales de `empires-war-development`; esta Skill contiene solo especialización del subsistema.
