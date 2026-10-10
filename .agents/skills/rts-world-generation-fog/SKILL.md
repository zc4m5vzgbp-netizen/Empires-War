---
name: rts-world-generation-fog
description: Mapas, terreno y niebla de guerra correctos; activar solo para cambios relevantes en Empires-War.
---
# Mapas, terreno y niebla de guerra correctos

## Activación
Generación de mapas, tamaños, distribución de recursos, vados, visibilidad, exploración o trucos de terreno. Consultar `AGENTS.md`, `docs/REQUIREMENTS_MATRIX.md` y `docs/DELIVERY_LEDGER.md`. Coordinar entregas de varios sistemas mediante `rts-delivery-orchestrator`.

## Procedimiento específico
Usar semillas y parámetros versionados; probar conectividad, acceso a recursos, límites del mapa, tamaño hasta 480×480, costes de memoria y reproducibilidad; separar conocimiento real, explorado y visible para cada imperio; truco de niebla solo cambia vista del jugador.

## Ejercicio de aceptación
Mismo seed produce mapa idéntico; IA no ve unidades ocultas tras activar truco del jugador; no se crean recursos inaccesibles en escenarios válidos.

## Evidencia exigida
Semilla, métricas de accesibilidad, matrices de visibilidad, snapshots y pruebas negativas.

## Límites
- No marcar implementado, equilibrado ni probado sin ejecutar pruebas relevantes y conservar resultados.
- Los valores AoE II DE sin fuente y versión son provisionales, nunca afirmaciones de balance oficial.
- No tocar `main`, publicar, fusionar ni modificar ramas de Claude sin aprobación expresa.
- No duplicar las reglas generales de `empires-war-development`; esta Skill contiene solo especialización del subsistema.
