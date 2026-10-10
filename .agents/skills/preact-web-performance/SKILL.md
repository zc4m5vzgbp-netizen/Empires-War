---
name: preact-web-performance
description: Revisar rendimiento de interfaz Preact, carga de JS y acceso al DOM en Empires-War sin confundirlo con optimización del motor Phaser.
---
# Rendimiento web y Preact — adaptación para Empires-War

Referencia: https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md (MIT, Vercel). Selección original de principios compatibles; no instalar React/Next.js ni copiar reglas sin validación.

## Alcance
Aplicar cuando se edita UI Preact, HUD, carga inicial, listeners de DOM o JavaScript de interfaz. No asumir que una regla de React o Next.js es válida para Preact; verificar APIs y medir.

## Lista de revisión priorizada
1. **Carga:** medir tamaño del bundle, módulos innecesarios y descargas en cascada. Evitar importar sistemas grandes si la pantalla no los necesita.
2. **Estado de UI:** limitar actualizaciones del HUD a cambios observables; evitar recomputaciones y renders completos por cada tick de simulación.
3. **Eventos:** evitar duplicar listeners globales, especialmente pointer/touch/resize; limpiar suscripciones al desmontar.
4. **Datos:** usar búsquedas eficientes para accesos frecuentes; evitar asignaciones innecesarias en bucles calientes, solo después de medir.
5. **DOM:** agrupar cambios visuales cuando sea posible y evitar lecturas/escrituras alternadas que provoquen recálculos de layout.
6. **Compatibilidad:** no introducir `next/*`, React Server Components, SSR, hooks exclusivos de React o bibliotecas adicionales en nuestro stack Preact.

## Medición y aceptación
- Registrar antes/después: tamaño de build, latencia de interacción y coste de actualización de UI, con método reproducible.
- Probar Chromium y WebKit móvil mediante el smoke existente; reservar Safari real para validación de versiones importantes.
- Para 600+ unidades, medir por separado **simulación, pathfinding y render Phaser**; esta Skill NO garantiza rendimiento de esos sistemas.
- Si no se pueden ejecutar benchmarks, indicar «sin verificar» y no prometer mejoras.

## Entrega
Cambios mínimos, números medidos (si existen), regresiones y PR independiente. No tocar el trabajo visual de Claude sin coordinar.
