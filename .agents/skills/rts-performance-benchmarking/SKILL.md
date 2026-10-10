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

## Rendimiento web y Preact (consolidado)
Fuente de prácticas: https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md (MIT, Vercel); aplicar solo principios compatibles, no importar React/Next.js.
Activar este apartado cuando se modifique UI Preact, HUD, carga JS, DOM o listeners.
1. Medir tamaño del bundle, carga inicial y descargas innecesarias; lazy-load de atlas militar únicamente en galería si esa sigue siendo la regla.
2. Evitar renderizados completos del HUD en cada tick; medir latencia de interacción y frecuencia de actualizaciones.
3. Evitar listeners globales duplicados; limpiar suscripciones pointer/touch/resize al desmontar.
4. Minimizar asignaciones en bucles calientes **solo tras medir**; evitar lecturas/escrituras DOM alternadas.
5. No introducir `next/*`, SSR, React Server Components, hooks exclusivos de React ni dependencias nuevas sin justificar.
6. Verificar WebKit y Chromium móvil con smoke y reportar tamaño/latencia antes y después; Safari físico queda pendiente salvo prueba real.
Distinguir estrictamente métricas de Preact, simulación, pathfinding y render Phaser.
