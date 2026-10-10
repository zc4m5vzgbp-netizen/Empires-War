---
name: rts-gameplay-combat-verification
description: Verificación de mecánicas militares en Empires-War; se activa según el alcance y exige evidencia reproducible.
---
# Verificación de mecánicas militares

## Cuándo activar
Cambios de producción, combate, daño, armadura, IA, movimiento de grupos o población. No activar para tareas ajenas. Leer `AGENTS.md`, `.agents/skills/empires-war-development/SKILL.md` y `docs/REQUIREMENTS_MATRIX.md` antes de cambiar código.

## Procedimiento
Definir tabla de reglas confirmadas frente a provisionales; probar costos y tiempos, órdenes de ataque, objetivos, daño, muerte, ruta bloqueada, selección múltiple y equipo aliado/enemigo; verificar ticks deterministas y ausencia de trampas para IA; separar simulación de animación.

## Ejercicio de aceptación
Espadachín y arquero producidos desde edificio aprobado, pueden recibir órdenes y resolver combate determinista; no marcar implementado antes de existir.

## Evidencia obligatoria
Casos con entradas/salidas, pruebas unitarias, smoke táctil, discrepancias de balance y requisitos pendientes.

## Límites
- No afirmar pruebas no ejecutadas ni convertir un checklist en una prueba pasada.
- No modificar `main`, desplegar, fusionar PR ni cambiar ramas de Claude sin autorización.
- Registrar regresiones y resultados en la matriz de requisitos; si no hay acceso al entorno de pruebas, dejar estado **sin verificar**.
- Evitar dependencias, scripts o descargas de terceros sin revisión explícita.
