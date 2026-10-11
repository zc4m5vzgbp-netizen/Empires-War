# Benchmark de navegación — protocolo y límites

Ejecutar desde la raíz del repositorio:

```bash
npx tsx scripts/benchmark-navigation.ts
```

GitHub Actions ejecuta el mismo script en el paso **Benchmark navegación (CPU GitHub, no iPhone)**. La salida es una línea JSON por escenario con `totalMs`, `meanMs`, `p95Ms`, `maxMs`, número de solicitudes y rutas encontradas. Estos valores son **tiempos de CPU por búsqueda** medidos en Node y dependen de la máquina, el calentamiento del proceso y la carga del runner.

## Qué comprueba

- 224×224 y 480×480: 600 solicitudes a un destino inaccesible, alternando `pathToTile` y `pathToAdjacent`.
- 224×224 y 480×480: algunas rutas alcanzables a través de una puerta.
- 48×48: referencia A* directo sin rechazo por conectividad frente a la ruta optimizada. La referencia pequeña permite comparar el comportamiento sin bloquear CI con búsquedas inalcanzables gigantes.

## Qué NO demuestra

- No simula 600 aldeanos moviéndose simultáneamente: mide llamadas a funciones de rutas, no `stepWorld` completo.
- No mide FPS, latencia táctil, consumo de memoria del render ni un iPhone físico.
- No prueba que el tick completo de 600 unidades dure menos de 50 ms, ni la estabilidad de rutas alcanzables en grupos.
- No justifica activar mapas de 480×480 en producción sin mediciones integrales.

## Próxima prueba de aceptación

Añadir un escenario de simulación real con 600 entidades, perfiles de ticks p50/p95/máximo, y verificación de hashes después de guardar/cargar. Evaluar presupuesto de planificación de rutas por tick sin romper orden de comandos, consistencia del mundo ni determinismo. Validar en iPhone 15 Pro Max físico cuando esté disponible.
