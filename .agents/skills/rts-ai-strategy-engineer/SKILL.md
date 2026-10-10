---
name: rts-ai-strategy-engineer
description: IA estratégica sin ventajas ilegítimas; activar solo para cambios relevantes en Empires-War.
---
# IA estratégica sin ventajas ilegítimas

## Activación
Cambios en comportamiento de imperios enemigos, dificultad, exploración, economía automática o estrategia. Consultar `AGENTS.md`, `docs/REQUIREMENTS_MATRIX.md` y `docs/DELIVERY_LEDGER.md`. Coordinar entregas de varios sistemas mediante `rts-delivery-orchestrator`.

## Procedimiento específico
Definir percepción limitada por niebla, memoria propia y presupuesto de decisiones; separar planificación económica, defensa y ataques; usar misma API de órdenes y costes que jugador; pruebas con semillas y mapas fijos; dificultades modifican decisiones, nunca recursos ocultos.

## Ejercicio de aceptación
Dos IAs con misma información visible toman decisiones reproducibles; quitar niebla del jugador no revela enemigos a la IA.

## Evidencia exigida
Semilla, estados percibidos, decisiones, recursos gastados, métricas de estrategia y pruebas de ausencia de trampas.

## Límites
- No marcar implementado, equilibrado ni probado sin ejecutar pruebas relevantes y conservar resultados.
- Los valores AoE II DE sin fuente y versión son provisionales, nunca afirmaciones de balance oficial.
- No tocar `main`, publicar, fusionar ni modificar ramas de Claude sin aprobación expresa.
- No duplicar las reglas generales de `empires-war-development`; esta Skill contiene solo especialización del subsistema.
