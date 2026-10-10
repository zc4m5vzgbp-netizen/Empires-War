---
name: savegame-integrity-determinism
description: Guardado seguro y simulación reproducible en Empires-War; se activa según el alcance y exige evidencia reproducible.
---
# Guardado seguro y simulación reproducible

## Cuándo activar
Cambios de IndexedDB, esquema de partida, semilla, ticks o serialización. No activar para tareas ajenas. Leer `AGENTS.md`, `.agents/skills/empires-war-development/SKILL.md` y `docs/REQUIREMENTS_MATRIX.md` antes de cambiar código.

## Procedimiento
Preparar partidas de prueba versionadas; probar ida/vuelta JSON, determinismo con semilla fija, pausas durante escritura, interrupción/corrupción, migraciones de esquema y múltiples partidas; nunca probar con datos reales sin copia; no habilitar nube.

## Ejercicio de aceptación
Mismo estado tras guardar/cargar y misma evolución desde mismo estado+órdenes; errores recuperables sin sobrescribir partida sana.

## Evidencia obligatoria
Hashes/estados comparados, versiones de esquema, casos fallidos, pruebas automatizadas y plan de reversión.

## Límites
- No afirmar pruebas no ejecutadas ni convertir un checklist en una prueba pasada.
- No modificar `main`, desplegar, fusionar PR ni cambiar ramas de Claude sin autorización.
- Registrar regresiones y resultados en la matriz de requisitos; si no hay acceso al entorno de pruebas, dejar estado **sin verificar**.
- Evitar dependencias, scripts o descargas de terceros sin revisión explícita.
