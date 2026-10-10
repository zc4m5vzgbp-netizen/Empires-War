---
name: empires-war-development
description: Implementar, depurar y revisar funciones de Empires-War con pruebas de simulación y controles táctiles.
---

# Skill: desarrollo verificable de Empires-War

**Actívala** al modificar simulación, economía, render, entrada, UI, guardado, pruebas o CI.

## 1. Contexto y alcance
Leer `AGENTS.md`, `docs/REQUIREMENTS_MATRIX.md` y archivos afectados. Consultar `docs/QUALITY_MATRIX.md` solo como auditoría auxiliar, si existe. Distinguir entre comportamiento confirmado, provisional y pendiente. No duplicar lógica entre simulación y Phaser. No alterar PR ajenos sin coordinar.

## 2. Depuración sistemática
- Reproducir el fallo y registrar entrada, estado inicial y resultado esperado/observado.
- Seguir la cadena: toque/puntero → picking → controlador → comando → validación → pathfinding/ticks → estado → render/HUD.
- Aislar la primera transición que falla; no cambiar varias capas a ciegas.
- Crear prueba de regresión que reproduzca el defecto. Comprobar que falla antes del arreglo, si es viable.
- Corregir causa raíz y comprobar escenarios relacionados (oro/piedra, recurso agotado, camino bloqueado).

## 3. Desarrollo guiado por pruebas
- Definir criterios verificables antes de programar: ejemplo «aldeano seleccionado toca mina de piedra, camina, recoge 10, deposita piedra y aumenta reserva exactamente 10».
- Pruebas puras para economía, comandos, mapa, determinismo, serialización y rutas.
- Pruebas de navegador para selección táctil, animación, zoom, cámara, UI y WebKit.
- No usar esperas fijas si existe condición observable; evitar tests frágiles.
- Registrar todo bug confirmado como prueba permanente.

## 4. Verificación antes de terminar
Comandos existentes (desde raíz del repositorio, con dependencias instaladas):
```sh
npm run typecheck
npm test
npm run build
npm run verify:dist
```
Para cambios visuales o táctiles, iniciar servidor de vista previa con la ruta correcta y ejecutar `npm run smoke:browser`; requiere navegadores Playwright instalados. No asumir que estos comandos pasaron: ejecutar y registrar resultados.

## 5. Revisión de PR
Comprobar: base correcta, cambios fuera de alcance, determinismo, seguridad de guardado, licencias/créditos, accesibilidad táctil, rendimiento móvil, pruebas y compatibilidad de ramas. Si una prueba falla, no declarar «listo». Nunca fusionar automáticamente.

## 6. Entrega compacta
Responder: **hecho**, **pruebas ejecutadas y resultados**, **pendiente/riesgos**, **PR**. Si una prueba no pudo ejecutarse, decirlo explícitamente. Actualizar `docs/REQUIREMENTS_MATRIX.md` solo con evidencia real.

## Fuentes de prácticas (referencias, no dependencias)
- https://github.com/obra/superpowers — depuración sistemática, TDD, verificación.
- https://github.com/addyosmani/agent-skills — planificación y calidad.
- https://github.com/anthropics/skills — diseño de Skills y pruebas web.
No instalar ni ejecutar contenido de estas fuentes sin auditoría previa.
