---
name: rts-performance-benchmarking
description: Medición de rendimiento de simulación RTS en Empires-War; se activa según el alcance y exige evidencia reproducible.
---
# Medición de rendimiento de simulación RTS

## Cuándo activar
Cambios de pathfinding, tick, render, atlas o población máxima. No activar para tareas ajenas. Leer `AGENTS.md`, `.agents/skills/empires-war-development/SKILL.md` y `docs/REQUIREMENTS_MATRIX.md` antes de cambiar código.

## Procedimiento
Separar tiempos de simulación, pathfinding, render y HUD; fijar mapa, semilla, duración, velocidad y población; medir 100/300/600 unidades en al menos 3 ejecuciones; reportar mediana y peor percentil; no equiparar CI con iPhone real.

## Ejercicio de aceptación
Escenarios reproducibles y mediciones antes/después; detectar regresión y señalar cuello de botella sin prometer 600 unidades.

## Evidencia obligatoria
Tabla por escenario con hardware, versión, FPS, p95 tick, memoria si está disponible, errores y limitaciones.

## Límites
- No afirmar pruebas no ejecutadas ni convertir un checklist en una prueba pasada.
- No modificar `main`, desplegar, fusionar PR ni cambiar ramas de Claude sin autorización.
- Registrar regresiones y resultados en la matriz de requisitos; si no hay acceso al entorno de pruebas, dejar estado **sin verificar**.
- Evitar dependencias, scripts o descargas de terceros sin revisión explícita.
