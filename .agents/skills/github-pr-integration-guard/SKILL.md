---
name: github-pr-integration-guard
description: Protección de integración de PR dependientes en Empires-War; se activa según el alcance y exige evidencia reproducible.
---
# Protección de integración de PR dependientes

## Cuándo activar
Antes de integrar ramas, rebasar, abrir PR de release o fusionar. No activar para tareas ajenas. Leer `AGENTS.md`, `.agents/skills/empires-war-development/SKILL.md` y `docs/REQUIREMENTS_MATRIX.md` antes de cambiar código.

## Procedimiento
Inspeccionar base/head/SHAs y cambios por archivo; revisar solapamientos y diferencias con ramas de Claude; integrar solo en rama propia; revisar licencias y binarios; ejecutar typecheck, test, build, verify:dist y smoke de navegador; no fusionar ni desplegar sin aprobación.

## Ejercicio de aceptación
PR #10 + PR #11: compatibilidad comprobada, conservar panel VIS-07 y galería militar; detectar cambios perdidos en App.tsx.

## Evidencia obligatoria
SHAs exactos, archivos en conflicto o solapados, comandos y resultados reales, PR resultante y riesgos.

## Límites
- No afirmar pruebas no ejecutadas ni convertir un checklist en una prueba pasada.
- No modificar `main`, desplegar, fusionar PR ni cambiar ramas de Claude sin autorización.
- Registrar regresiones y resultados en la matriz de requisitos; si no hay acceso al entorno de pruebas, dejar estado **sin verificar**.
- Evitar dependencias, scripts o descargas de terceros sin revisión explícita.
