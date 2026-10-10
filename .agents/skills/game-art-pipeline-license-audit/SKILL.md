---
name: game-art-pipeline-license-audit
description: Calidad y procedencia del arte en Empires-War; se activa según el alcance y exige evidencia reproducible.
---
# Calidad y procedencia del arte

## Cuándo activar
Nuevos sprites, atlas, animaciones, renders 3D o recursos externos. No activar para tareas ajenas. Leer `AGENTS.md`, `.agents/skills/empires-war-development/SKILL.md` y `docs/REQUIREMENTS_MATRIX.md` antes de cambiar código.

## Procedimiento
Verificar fuente, licencia exacta, atribución y compatibilidad; validar atlas, frames por animación/dirección, anclas, recorte, escala, color de jugador y transparencia; comprobar descarga diferida; usar render reproducible; prohibido asumir licencia por nombre del proyecto.

## Ejercicio de aceptación
2 unidades × 4 animaciones × 8 direcciones completas; cuartel a escala 3×3; licencia y créditos presentes; no descarga militar en partida normal.

## Evidencia obligatoria
Fuente/versiones, pruebas que fallaron antes si corresponde, bytes descargados, capturas, resultados WebKit/Chromium y pendientes de iPhone.

## Límites
- No afirmar pruebas no ejecutadas ni convertir un checklist en una prueba pasada.
- No modificar `main`, desplegar, fusionar PR ni cambiar ramas de Claude sin autorización.
- Registrar regresiones y resultados en la matriz de requisitos; si no hay acceso al entorno de pruebas, dejar estado **sin verificar**.
- Evitar dependencias, scripts o descargas de terceros sin revisión explícita.
