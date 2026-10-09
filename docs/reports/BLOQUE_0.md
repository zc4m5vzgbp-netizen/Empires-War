# Empires-War — Informe de entrega del Bloque 0

**Fecha:** 9 de octubre de 2026
**Autor:** Claude (implementador, trabajando sobre el repositorio de GitHub)
**Para:** el usuario y cualquier otro asistente que colabore en el proyecto (por ejemplo, ChatGPT)
**Fuente de verdad del diseño:** `docs/MASTER_DESIGN.md` del repositorio (documento maestro v2.0)

## Contexto para quien lea esto por primera vez

Empires-War es un RTS histórico isométrico para navegador, single-player contra IA, que toma como referencia funcional Age of Empires II: Definitive Edition, con excepciones explícitas del usuario (§3 del documento maestro). Es un proyecto original: no usa activos, código ni marcas de AoE II DE.

El usuario no programa y trabaja desde un iPhone. Claude escribe el código, lo sube a GitHub y GitHub Actions lo comprueba y lo publica. Se trabaja por bloques verificables; este informe cierra el **Bloque 0: infraestructura y publicación**. Todavía no es un juego jugable.

## Resultado

| Elemento | Estado | Enlace |
|---|---|---|
| Repositorio | Creado y con escritura de Claude comprobada | https://github.com/zc4m5vzgbp-netizen/Empires-War |
| Juego publicado (escena de prueba) | Publicado y comprobado | https://zc4m5vzgbp-netizen.github.io/Empires-War/ |

La publicación se verificó así: el despliegue `github-pages` de GitHub terminó correctamente (commit `57e3f05`) y la URL responde con el título «Empires-War».

## Qué se hizo realmente

- **Proyecto:** Vite + TypeScript + Phaser 4 + Preact, configurado para publicarse bajo `/Empires-War/` (no en la raíz del dominio).
- **Escena de prueba isométrica:** mapa de 48 × 48 casillas generado con semilla fija, con hierba, tierra, agua y bosque. El arte está dibujado por código; no hay archivos de terceros. La pantalla indica «escena de prueba, no es gameplay».
- **Controles:**
  - iPhone: un dedo mueve el mapa, dos dedos hacen zoom, botones grandes (−, +, «Centrar») y tocar una casilla muestra su terreno.
  - PC: arrastre, rueda del ratón y teclas WASD/flechas.
- **Medición en pantalla:** FPS, ticks por segundo, tiempo de cada tick y zoom.
- **Pantalla de error:** si algo falla, aparece un recuadro con un botón «Copiar error».
- **Automatización:** GitHub Actions comprueba tipos, ejecuta las pruebas, compila, verifica las rutas, prueba el juego en dos navegadores y publica en GitHub Pages en cada cambio.
- **Documentación en el repositorio:**
  - `docs/MASTER_DESIGN.md`: copia literal del documento maestro v2.
  - `docs/REQUIREMENTS_MATRIX.md`: matriz de requisitos.
  - `docs/DECISIONS.md`: registro de decisiones y sustituciones.
  - `docs/ROADMAP.md`: bloques y criterios de aceptación.

## Qué no se pudo hacer o requirió al usuario

- **Crear el repositorio:** la sesión de Claude no puede crear repositorios nuevos, así que lo creó el usuario (público, porque GitHub Pages gratuito lo exige).
- **Subir cambios:** requirió que el usuario instalara la app de Claude en su cuenta de GitHub.
- **Activar GitHub Pages:** ni Claude ni el workflow tienen permiso. El usuario lo activó en Settings → Pages → Source: GitHub Actions.
- **Pruebas en la sesión de Claude:** la sesión no tiene acceso al registro npm. Allí solo se probó la parte que no depende de librerías externas (simulación y formato de guardado). La comprobación completa, la compilación y la prueba en navegador se ejecutan en GitHub Actions.
- **Registros de GitHub Actions:** Claude no puede leerlos directamente. El workflow escribe los resultados como anotaciones, que sí son legibles.
- **Archivo `package-lock.json`:** no existe todavía, porque no se pudo generar sin el registro npm. Las versiones están fijadas exactamente en `package.json`. Queda pendiente.

## Evidencia de pruebas (GitHub Actions)

Ejecución de referencia: **37970309448**, commit `57e3f05`, con todo en verde. La ejecución posterior **37970682449** (commit `333171b`, solo documentación) también terminó correctamente.

| Comprobación | Resultado |
|---|---|
| Comprobación de tipos del juego completo | Sin errores |
| Comprobación de tipos de la simulación sin navegador ni Phaser (`tsconfig.sim.json`) | Sin errores |
| Pruebas automáticas (`node:test` vía `tsx`) | 20 de 20 aprobadas; también aprobadas en la sesión de Claude |
| Compilación (`vite build`) | Correcta |
| Rutas de `dist/` bajo `/Empires-War/` (`scripts/verify-dist.mjs`) | 3 de 3 correctas |
| Navegador Chromium con perfil de iPhone 15 Pro Max | OK: arranque 3,1 s, 61 FPS, 20 ticks/s, sin errores |
| Navegador WebKit (motor de Safari) con perfil de iPhone 15 Pro Max | OK: arranque 3,9 s, 62 FPS, 20 ticks/s, sin errores |
| Despliegue en GitHub Pages | Correcto |

En los dos navegadores, la prueba (`scripts/browser-smoke.mjs`) comprobó que:
- el lienzo se dibuja (más de 1.300 colores distintos);
- arrastrar mueve la imagen;
- el botón + cambia el zoom de 0,70 a 0,88;
- tocar el centro muestra «Hierba · casilla 25, 28».

**Importante:** estas cifras vienen de un emulador sin tarjeta gráfica en los servidores de GitHub. No sustituyen la prueba en el iPhone real del usuario, que sigue pendiente.

### Fallos encontrados y corregidos

1. **Incompatibilidad con Phaser 4:** en Phaser 4, `Graphics.fillPoints` exige su propio tipo `Vector2`. Los polígonos se trazan ahora con `beginPath`/`moveTo`/`lineTo`. Registrado como decisión T-009.
2. **Arranque lento en el emulador:** el WebKit del servidor tardaba unos 4 s en arrancar y la prueba leía las estadísticas demasiado pronto. Ahora espera al arranque real y lo mide. El HUD muestra el zoom real desde el inicio.

### Versiones verificadas

`phaser 4.2.1`, `preact 10.29.8`, `vite 7.3.7`, `typescript 6.0.3`, `tsx 4.23.15`, `@types/node 22.20.5` y `playwright 1.56.0`. Se usa Vite 7 y no Vite 8 porque desde la sesión no se pudo verificar su compatibilidad (decisión T-005).

## Arquitectura

| Carpeta | Contenido |
|---|---|
| `src/simulation` | Estado del mundo, reloj de ticks fijos (20/s), generador aleatorio con semilla y terreno reproducible. Sin Phaser ni navegador; una comprobación de tipos aparte lo garantiza |
| `src/content` | Datos tipados; cada dato declara `sourceVersion`, `sourceNote` y estado `verified`/`provisional` |
| `src/render` | Phaser 4: escena de prueba, proyección isométrica 2:1, modelo de cámara puro y arte provisional generado por código |
| `src/ui` | Interfaz Preact: barra superior, estadísticas, botones y panel de error |
| `src/input` | Gestos táctiles, ratón y teclado con eventos Pointer del navegador (la entrada de Phaser está desactivada) |
| `src/persistence` | Formato de guardado versionado, con huella para detectar archivos dañados |
| `tests` | 20 pruebas: simulación, guardado, matemática de cámara y arquitectura |
| `scripts` | Verificación de rutas y prueba en navegador |
| `.github/workflows/deploy.yml` | Comprobar y publicar |

Principios aplicados:
- La simulación es la única dueña del estado.
- Phaser solo dibuja.
- El estado es JSON serializable.
- Hay identificadores estables previstos (`nextEntityId`).
- La simulación está preparada para moverse a un Web Worker si las pruebas lo justifican.

### Archivos del repositorio

`.github/workflows/deploy.yml`, `.gitignore`, `README.md`, `docs/DECISIONS.md`, `docs/MASTER_DESIGN.md`, `docs/REQUIREMENTS_MATRIX.md`, `docs/ROADMAP.md`, `docs/reports/BLOQUE_0.md`, `index.html`, `package.json`, `scripts/browser-smoke.mjs`, `scripts/verify-dist.mjs`, `src/content/config.ts`, `src/content/terrain.ts`, `src/content/types.ts`, `src/env.d.ts`, `src/input/gestures.ts`, `src/input/pointerInput.ts`, `src/main.ts`, `src/persistence/saveFormat.ts`, `src/render/TestScene.ts`, `src/render/cameraModel.ts`, `src/render/iso.ts`, `src/render/textures.ts`, `src/simulation/clock.ts`, `src/simulation/rng.ts`, `src/simulation/terrainGen.ts`, `src/simulation/world.ts`, `src/ui/App.tsx`, `src/ui/store.ts`, `src/ui/styles.css`, `tests/architecture.test.ts`, `tests/persistence.test.ts`, `tests/render-math.test.ts`, `tests/simulation.test.ts`, `tsconfig.json`, `tsconfig.sim.json`, `vite.config.ts`.

## Cómo probarlo desde un iPhone

1. Abrir en Safari: https://zc4m5vzgbp-netizen.github.io/Empires-War/
2. Arrastrar con un dedo para mover el mapa; pellizcar con dos dedos para el zoom.
3. Tocar una casilla: abajo aparece su tipo de terreno.
4. Probar los botones −, + y «Centrar».
5. Anotar los FPS que aparecen arriba a la derecha (primera medición real en el iPhone 15 Pro Max).
6. Si aparece un recuadro de error, tocar «Copiar error» y pasar el texto a Claude.

## Limitaciones conocidas

- El lienzo se dibuja a resolución 1×, sin ajuste para pantallas retina (decisión T-008). Puede verse algo suave; los textos son HTML y se ven nítidos.
- En PC, arrastrar con el botón izquierdo mueve la cámara. En el Bloque 1 pasará a ser la selección con recuadro.
- Phaser pesa unos 1,39 MB (372 KB comprimidos). Va en un archivo aparte para aprovechar la caché del navegador.
- Falta `package-lock.json`.

## Estado de la matriz de requisitos

La matriz completa está en `docs/REQUIREMENTS_MATRIX.md`: más de 90 requisitos con ID, sección de origen, bloque, estado y prueba asociada. No se ha eliminado nada.

**Probado en el Bloque 0:**
- repositorio, Vite + TypeScript, Phaser 4, Preact, publicación bajo `/Empires-War/`, workflow completo, versiones fijadas y prueba en navegador;
- módulos separados, simulación independiente, estado serializable, tick fijo, semilla reproducible y catálogo con procedencia;
- escena visible, desplazamiento, zoom con botón, inspección de casilla, medición en pantalla;
- formato de guardado validado.

**Pendiente de prueba manual del usuario:** la escena y los gestos táctiles reales (pellizco, arrastre) en el iPhone, y el teclado y la rueda en un PC.

**Pendiente por bloque:**

| Bloque | Requisitos pendientes |
|---|---|
| 1 | `package-lock.json`; IDs estables de entidades; selección; orden de mover; aldeano que recolecta y deposita; reserva común; pago desde la reserva común; construcción de prueba; guardado y carga en IndexedDB; pausa solo durante la escritura del guardado; aviso de que borrar datos del navegador elimina partidas; IA ausente o dummy rotulada; colisiones y rutas sin atravesar edificios |
| 2 | Fórmulas y redondeos en un solo módulo; cuatro recursos; tareas de aldeanos; granjas y resembrado con costes AoE II DE; costes reales documentados; población y casas según AoE II DE; colas de producción; mapa procedural real; tamaños 160/224/320 (480 solo si pasa pruebas); límites de población; controles PC completos; medición de memoria y pathfinding |
| 3 | Cuatro edades; requisitos de transición; primera civilización de prueba (nunca presentada como final); tecnologías; cancelación y reembolso según AoE II DE |
| 4 | Estadísticas de unidades; órdenes (incluido atacar-mover), formaciones y puntos de reunión; daño, derrumbe y reparación de edificios; reacción de aldeanos (daño o enemigo a ≤ 6 casillas atacando a un aliado); niebla para jugador e IA; IA sin conocer posiciones ocultas; truco «quitar niebla» solo del jugador; minimapa con «Ver por relación» solo en el minimapa; vados solo para exploradores y caballería ligera; pruebas exploratorias con 600 a 4.800 unidades |
| 5 | Opciones de partida; mercado con precios variables; comerciantes terrestres; IA clásica con dificultad y sin ventajas ocultas; diplomacia clásica; capital transferible cuya destrucción no causa derrota; derrota al perder todos los Centros Urbanos; maravillas sin victoria automática; superficie construida descriptiva |
| 6 | Web Worker si las pruebas lo justifican; más civilizaciones; accesibilidad; varias ranuras de guardado y autoguardado; exportar/importar partidas; objetivos de trucos (600 militares del jugador / 300 por IA) solo tras benchmark; calidad gráfica escalable |

**Ausencias que se verifican en cada bloque:** sin automatizaciones de aldeanos no clásicas, sin fuego propagable ni ruinas especiales y sin modo persistente tras la victoria.

**Reservado para versiones futuras (§12, no implementar):** ciclo día/noche; comandantes; conquista territorial y fronteras; naval; destrucción avanzada y fuego propagable; IA diplomática avanzada y tratados; cámara lenta; economía civil, ciudades vivas y automatizaciones no clásicas; expansión tras victoria; multijugador, cuentas y nube.

## Propuesta del Bloque 1: primer vertical slice jugable

Objetivo: que el usuario pueda jugar el primer ciclo económico en el enlace publicado, en iPhone y PC.

- **Mapa:** el mismo terreno de 48 × 48 con semilla fija; Centro Urbano provisional como depósito y un grupo de arbustos de bayas como recurso de comida.
- **Aldeano:**
  - tocarlo lo selecciona;
  - tocar el suelo lo mueve con búsqueda de camino (A* en cuadrícula), rodeando agua, bosque y edificios;
  - tocar un arbusto inicia el ciclo recolectar → transportar → depositar;
  - el contador común sube solo al depositar.
- **Construcción de prueba:** un Molino.
  - Se elige con un botón, se ve una vista previa de colocación y el aldeano lo construye.
  - Se paga de la reserva común, sin almacén pagador.
  - Al terminar también acepta depósitos de comida.
- **Valores:** se usarán cifras de referencia de AoE II DE que no se han verificado contra una versión de balance concreta (por ejemplo, 10 de carga por viaje, 125 de comida por arbusto y 100 de madera por el Molino). Irán marcadas `provisional` con la nota «sin verificar». No se presentarán como fieles al original.
- **Controles en PC:** clic izquierdo selecciona, clic derecho da órdenes y arrastrar selecciona con recuadro.
- **Guardado y carga:**
  - botones «Guardar» y «Cargar» con IndexedDB;
  - el mundo se congela solo mientras se escribe; si estaba en marcha, reanuda; si estaba en pausa, sigue en pausa;
  - aviso de que borrar los datos del navegador elimina las partidas.
- **IA:** ausente, y rotulada como tal en pantalla.
- **Pruebas:**
  - una prueba automática de la simulación por cada acción;
  - la prueba en navegador se amplía para que seleccione al aldeano, ordene recolectar, compruebe que el contador sube, guarde, cargue y verifique que la partida es idéntica.

**Criterios de aceptación:** los de `docs/ROADMAP.md`, Bloque 1. El usuario debe poder hacer cada acción en la URL publicada y ver el resultado. No basta una pantalla estática.

**Siguiente paso:** el usuario prueba la escena en su iPhone, informa los FPS y cualquier error, y autoriza el Bloque 1.
