---
name: mobile-rts-testing
description: Pruebas táctiles y regresiones móviles en Empires-War; se activa según el alcance y exige evidencia reproducible.
---
# Pruebas táctiles y regresiones móviles

## Cuándo activar
Cambios de entrada táctil, HUD, cámara, selección, construcción o WebKit. No activar para tareas ajenas. Leer `AGENTS.md`, `.agents/skills/empires-war-development/SKILL.md` y `docs/REQUIREMENTS_MATRIX.md` antes de cambiar código.

## Procedimiento
Reproducir en perfil iPhone y comprobar canvas versus overlays con elementFromPoint; ejecutar toque real con Playwright; verificar selección, orden, movimiento y resultado observable; repetir con zoom/cámara y UI abierta; cubrir Chromium móvil y WebKit.

## Ejercicio de aceptación
VIS-07: panel plegado deja seleccionar mina de piedra, el aldeano recoge y deposita piedra; panel desplegado no intercepta controles legítimos.

## Evidencia obligatoria
Captura/trace, pasos reproducibles, resultado del smoke, errores de consola y prueba en Safari físico pendiente si no se hizo.

## Límites
- No afirmar pruebas no ejecutadas ni convertir un checklist en una prueba pasada.
- No modificar `main`, desplegar, fusionar PR ni cambiar ramas de Claude sin autorización.
- Registrar regresiones y resultados en la matriz de requisitos; si no hay acceso al entorno de pruebas, dejar estado **sin verificar**.
- Evitar dependencias, scripts o descargas de terceros sin revisión explícita.
