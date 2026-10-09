# Empires-War — Informe de entrega del Bloque 1

**Fecha:** 9 de octubre de 2026
**Autor:** Claude (implementador sobre el repositorio de GitHub)
**Para:** el usuario y cualquier otro asistente que colabore (por ejemplo, ChatGPT)
**Fuente de verdad:** `docs/MASTER_DESIGN.md` (documento maestro v2.0), `docs/REQUIREMENTS_MATRIX.md`, `docs/DECISIONS.md` y `docs/ROADMAP.md`
**Estado:** entregado y publicado; pendiente de la prueba y aceptación del usuario en su iPhone. El Bloque 2 no se ha empezado.

## Contexto

El Bloque 0 (infraestructura y escena de prueba) fue aceptado por el usuario: 60–62 FPS en el iPhone 15 Pro Max y controles correctos. El Bloque 1 es el primer ciclo económico jugable: aldeano, recolección, reserva común, Centro Urbano, Molino y guardado/carga. Se construyó sobre el código existente, sin rehacer la arquitectura.

- Repositorio: https://github.com/zc4m5vzgbp-netizen/Empires-War
- Juego publicado: https://zc4m5vzgbp-netizen.github.io/Empires-War/

La publicación se comprobó: el despliegue `github-pages` del commit `ace186f` (9 de octubre de 2026, 19:07 UTC) terminó correctamente y la URL responde con el título «Empires-War».

## 1. Funcionalidades implementadas

| Funcionalidad | Qué hace el jugador | Detalle técnico |
|---|---|---|
| **Escenario de prueba** | Empieza con 1 Centro Urbano, 3 aldeanos y 6 arbustos de bayas | Mapa 48 × 48 con semilla fija; los IDs de entidad son estables (1 a 10) |
| **Selección** | iPhone: tocar un aldeano. PC: clic izquierdo, o arrastrar para seleccionar con recuadro. Mayúsculas suma a la selección | Botón «Recuadro» en táctil para seleccionar varios con el dedo |
| **Movimiento** | iPhone: tocar el suelo con aldeanos seleccionados. PC: clic derecho | A* en 8 direcciones sin cortar esquinas. Los grupos reciben destinos distintos. Rodea agua, bosque, edificios, cimientos y arbustos |
| **Recolección** | Tocar (o clic derecho en) un arbusto de bayas | Recolección gradual, carga máxima de 10. Lleva la carga al depósito más cercano y vuelve. Si el arbusto se agota, pasa al siguiente cercano |
| **Reserva común** | Contadores de Comida, Madera, Oro y Piedra arriba | Solo cambia al depositar o al pagar. La interfaz no tiene reglas propias; solo consulta a la simulación |
| **Centro Urbano** | Recibe los cuatro recursos | Edificio provisional, sin producción todavía |
| **Molino** | Botón «Construir Molino · 100 madera». En iPhone: tocar el sitio y luego «Confirmar». En PC: mover el ratón y hacer clic | Vista previa verde (válido) o roja (inválido, con el motivo). Se paga de la reserva al colocarlo. Construcción progresiva con barra de avance. Al terminar recibe comida |
| **Guardado y carga** | Menú «Partida»: Pausar/Reanudar, Guardar, Cargar | IndexedDB con una ranura. El mundo solo se congela durante la escritura: si estaba en marcha, sigue; si estaba en pausa, sigue en pausa. Aviso visible sobre el borrado de datos del navegador |
| **IA** | La barra superior dice «IA no implementada» | No existe código de IA |
| **Funciones del Bloque 0 conservadas** | Mover la cámara, zoom, «Centrar», inspeccionar una casilla vacía, FPS en pantalla | En PC, el arrastre izquierdo pasa a ser recuadro; la cámara se mueve con arrastre derecho o central, teclas y rueda |

**Datos provisionales.** Ningún valor está verificado contra una versión de balance de AoE II DE. Todos están marcados `provisional` en `src/content/economy.ts`:

- reserva inicial 200/200/100/200;
- velocidad del aldeano: 0,8 casillas/s;
- carga: 10;
- recolección de bayas: 0,31/s;
- arbusto: 125 de comida;
- Molino: 100 de madera, 35 s, huella de 2 × 2;
- construcción con varios aldeanos: base × 3/(n + 2).

## 2. Pruebas realizadas y resultados

**Ejecución de referencia de GitHub Actions: 37977616238 (commit `ace186f`). Todo en verde.**

| Comprobación | Resultado |
|---|---|
| Comprobación de tipos del juego completo y de la simulación sin navegador | Sin errores |
| Pruebas automáticas (`node:test`) | **40 de 40** aprobadas, en GitHub Actions y en la sesión de Claude |
| Compilación y rutas bajo `/Empires-War/` | Correctas (3 de 3 referencias) |
| Instalación reproducible | `npm ci` con `package-lock.json` |
| Navegador Chromium móvil (perfil iPhone 15 Pro Max) | OK, sin errores |
| Navegador WebKit móvil (motor de Safari, perfil iPhone 15 Pro Max) | OK, sin errores |
| Navegador Chromium escritorio (1280 × 800, ratón) | OK, sin errores |
| Publicación en GitHub Pages | Correcta |

**Pruebas de simulación nuevas** (`tests/economy.test.ts`, `tests/picking.test.ts`):

- **Escenario:** IDs estables y reserva inicial.
- **A*:** rodea obstáculos, no corta esquinas y devuelve «sin camino» si el destino está encerrado.
- **Movimiento:** un aldeano rodea el Centro Urbano; tres aldeanos llegan a casillas distintas.
- **Recolección:**
  - la reserva no cambia hasta el depósito;
  - la carga máxima es 10 y el arbusto baja en la misma cantidad;
  - el ritmo es de 0,31/s, con tolerancia de 0,2 s;
  - un arbusto agotado desaparece y el aldeano pasa al siguiente.
- **Pagos:**
  - el Molino descuenta 100 de madera;
  - el tercer Molino se rechaza con «Faltan 100 de madera.» y no cobra nada.
- **Colocación inválida:** sobre agua, el Centro Urbano, un arbusto, una unidad o fuera del mapa.
- **Construcción:**
  - 35 s con un aldeano y 26,25 s con dos;
  - los constructores quedan libres al terminar;
  - el cimiento bloquea el paso;
  - el Molino terminado recibe la comida y el aldeano no se acerca al Centro Urbano.
- **Seguridad:** se rechazan órdenes con unidades ajenas o IDs inexistentes.
- **Guardado a mitad del ciclo:** el estado es idéntico tras cargar, y la simulación sigue igual durante 1.500 ticks más.
- **Pausa al guardar:** se congela solo durante la escritura, respeta una pausa previa y no deja el juego congelado si la escritura falla.
- **Determinismo:** las mismas órdenes producen exactamente el mismo mundo.
- **Selección:** tocar el aldeano, el Centro Urbano (base o paredes), un arbusto o el suelo vacío; el recuadro incluye solo los aldeanos propios.
- **Invariante en cada tick de cada prueba:** ningún aldeano pisa nunca una casilla bloqueada.

**Prueba en navegador del ciclo completo** (`scripts/browser-smoke.mjs`, con toques reales en móvil y ratón en escritorio). Pasos verificados en Chromium y WebKit móvil:

1. La reserva inicial se ve en pantalla (200/200/100/200).
2. El arrastre táctil mueve la cámara y el botón + acerca (función del Bloque 0).
3. Un toque selecciona al aldeano #4.
4. Tocar un arbusto le ordena recolectar.
5. La comida pasa de 200 a 210 solo al depositar; se observa la carga antes del depósito.
6. Se coloca el Molino con la vista previa y «Confirmar»; la madera baja de 200 a 100.
7. El aldeano construye el Molino.
8. Guardar funciona y el juego sigue en marcha.
9. Cargar en la misma sesión deja el estado idéntico (misma huella).
10. Tras recargar la página y pulsar Cargar, vuelven el Molino, la madera y la comida desde IndexedDB.
11. Guardar con el juego en pausa conserva la pausa.

Pasos verificados en Chromium escritorio:
- el recuadro con el ratón selecciona a los 3 aldeanos;
- el clic derecho mueve al grupo a casillas distintas;
- el arrastre derecho mueve la cámara;
- clic izquierdo selecciona y clic derecho en bayas manda recolectar;
- el Molino se coloca con el ratón;
- el clic en suelo vacío quita la selección e inspecciona la casilla.

**Revisión visual:** el workflow `screenshots.yml` publica capturas de iPhone y escritorio en la rama `capturas`. Se revisaron todas. Se corrigió un solapamiento del panel y del menú con la columna de botones en el iPhone.

## 3. FPS y límites de la medición

| Medición | Valor | Validez |
|---|---|---|
| Emulador de GitHub, al arrancar | 60–61 FPS (Chromium y WebKit móvil, Chromium escritorio) | Servidor sin tarjeta gráfica; orientativo |
| Emulador de GitHub, tras el ciclo | Muy variable: de 12 a 60 FPS según la ejecución y el navegador | No fiable (ver abajo) |
| Diagnóstico por etapa (`diagnostics.yml`, ejecución 37977108535) | WebKit, 17–21 FPS, y Chromium escritorio, 5–6 FPS, **desde el reposo inicial** e iguales en todas las etapas | Muestra que ninguna acción provoca caídas |
| Objetos dibujados | 2.603 al inicio y 2.606 al final (Molino, su cimiento y su anillo) | Sin fugas |
| Coste de la simulación (medido en la sesión de Claude) | 0,026 ms por tick con 3 aldeanos; 0,04 ms por comprobación de colocación | Despreciable |
| **iPhone 15 Pro Max real** | **Pendiente: lo mide el usuario** | Es la única medición válida |

Conclusión honesta: no hay fugas, ninguna acción concreta baja los FPS y la simulación no pesa. Los servidores de GitHub dibujan sin tarjeta gráfica y dan cifras de 6 a 61 FPS en la misma página, así que no sirven para validar la fluidez.

Si en el iPhone los FPS bajan respecto al Bloque 0, la optimización prevista es dibujar el terreno en una sola textura en lugar de unas 2.300 imágenes. No se ha aplicado todavía porque no hay evidencia de que haga falta.

## 4. Archivos principales

**Nuevos:**

| Carpeta | Archivos |
|---|---|
| `src/simulation` | `types.ts`, `grid.ts`, `pathfinding.ts`, `villager.ts`, `construction.ts`, `economy.ts`, `placement.ts`, `commands.ts` |
| `src/content` | `economy.ts` |
| `src/persistence` | `idbStore.ts`, `savePause.ts` |
| `src/render` | `GameScene.ts` (sustituye a `TestScene.ts`), `entityView.ts`, `entityTextures.ts`, `picking.ts` |
| `src/input` | `controller.ts` |
| `tests` | `economy.test.ts`, `picking.test.ts` |
| `scripts` | `screenshots.mjs`, `perf-probe.mjs` |
| `.github/workflows` | `lockfile.yml`, `screenshots.yml`, `diagnostics.yml` |
| raíz | `package-lock.json` |

**Modificados:**
- `src/simulation/world.ts`, `clock.ts`
- `src/persistence/saveFormat.ts` (formato v2)
- `src/input/pointerInput.ts`
- `src/render/cameraModel.ts`, `textures.ts`
- `src/ui/App.tsx`, `store.ts`, `styles.css`
- `src/main.ts`, `src/content/config.ts`
- `scripts/browser-smoke.mjs`, `.github/workflows/deploy.yml`
- `docs/REQUIREMENTS_MATRIX.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`

## 5. Requisitos

**Completados y probados en el Bloque 1:**

| ID | Requisito |
|---|---|
| INF-09 | `package-lock.json` y `npm ci` |
| ARQ-06 | IDs estables |
| UI-05 | Selección táctil, con ratón y con recuadro |
| UI-06 | Movimiento en grupo |
| ECO-01 | Aldeano que se mueve, recolecta, transporta y deposita |
| ECO-02 | Reserva común |
| ECO-03 | Pago desde la reserva común |
| ECO-04 | Molino completo |
| ECO-14 | Datos rotulados como provisionales |
| GUA-02 | Guardado y carga |
| GUA-03 | Pausa solo durante la escritura |
| UI-13 | Menú «Partida» |
| UI-14 | Mensajes de resultado y error |
| INF-10 | Prueba en navegador ampliada |
| INF-11 | Capturas de revisión visual |
| INF-12 | Diagnóstico de FPS |

**Implementados, verificados en captura o en el código:**
- IA-04: IA ausente y rotulada.
- GUA-06: aviso sobre el borrado de datos del navegador.

**En progreso:**
- ARQ-09: fórmulas en un solo módulo; falta consolidarlas con los datos reales.
- UI-07: interfaz adaptable.
- UNI-03: falta la colisión entre unidades, prevista para el Bloque 4.
- GUA-05: faltan varias ranuras y la copia de seguridad antes de migrar.

**Pendiente de prueba manual del usuario:** el ciclo completo en su iPhone real y los FPS reales.

**Pendientes de bloques posteriores** (sin cambios; todo se conserva en la matriz):

| Bloque | Pendiente |
|---|---|
| 2 | Economía completa con costes reales de AoE II DE verificados, cuatro recursos, granjas, población y producción |
| 3 | Edades y tecnologías |
| 4 | Combate, órdenes completas, formaciones, niebla, minimapa con «Ver por relación», vados, reacción de aldeanos y colisión entre unidades |
| 5 | IA, diplomacia, comercio y condiciones de victoria/derrota con las excepciones del §3 |
| 6 | Civilizaciones, varias ranuras, autoguardado, exportar partidas, accesibilidad y rendimiento a gran escala |

Las funciones reservadas (§12) siguen sin implementar.

## 6. Errores encontrados y corregidos

1. **Constructores un tick tarde:** los aldeanos quedaban libres un tick después de terminar el edificio. Ahora quedan libres en el mismo tick (decisión T-019, detectado por las pruebas de simulación).
2. **Aldeano bloqueado para siempre (fallo real del juego):** si recibía una orden a mitad de un paso, ya junto al destino, quedaba quieto indefinidamente. Lo detectó la prueba de WebKit (posición 26,79; 20,21; 6.800 ticks sin moverse). Corregido en T-020, con una prueba de regresión que falla sin la corrección y pasa con ella.
3. **Panel y menú bajo los botones en el iPhone:** el panel de selección y el menú «Partida» quedaban parcialmente debajo de la columna de botones. Corregido tras revisar las capturas.
4. **Fallos de la propia prueba de navegador, no del juego:**
   - leía la interfaz antes de su refresco (cada 0,1 s);
   - dejaba poco tiempo a WebKit para construir;
   - tenía un nombre de variable repetido.
   Se corrigió la prueba, no el juego.

## 7. Cómo probarlo en el iPhone

1. Abre en Safari: https://zc4m5vzgbp-netizen.github.io/Empires-War/
   - Si ves la versión anterior, recarga la página. Abajo a la izquierda debe aparecer «Versión ace186f» o posterior.
2. Toca el aldeano de la derecha (túnica azul). Abajo aparece «Aldeano #4».
3. Con el aldeano seleccionado, toca un arbusto de bayas (a la derecha del Centro Urbano). Verás «Recolectando bayas».
4. Espera unos 35 segundos. Cuando el aldeano vuelva al Centro Urbano, la Comida pasará de 200 a 210.
5. Toca de nuevo al aldeano y pulsa «Construir Molino · 100 madera».
6. Toca el suelo cerca de las bayas. Si la vista previa sale verde, pulsa «Confirmar». La Madera baja a 100.
7. El aldeano construye el Molino en unos 35 segundos (hay una barra de avance).
8. Toca «Partida» y luego «Guardar». Debe aparecer «Partida guardada».
9. Cierra Safari del todo, vuelve a abrir el enlace, toca «Partida» y luego «Cargar». Deben volver el Molino, la Madera en 100 y la Comida.
10. Prueba también:
    - mover a varios aldeanos: pulsa «Recuadro» y arrastra el dedo sobre ellos, luego toca el suelo;
    - guardar con el juego en «Pausar»: debe seguir en pausa.
11. Anota los FPS (arriba a la derecha) al empezar y después de completar el ciclo. Si aparece un error, toca «Copiar error» y pásalo.

## 8. Limitaciones y bloqueos reales

- Los FPS del emulador de GitHub no son fiables; falta la medición en el iPhone real.
- La sesión de Claude no puede abrir la URL publicada ni acceder al registro npm. Todo lo que depende de Phaser y Preact se comprueba en GitHub Actions; lo visual, con las capturas de la rama `capturas`.
- Las unidades no chocan entre sí: dos aldeanos pueden superponerse. Está previsto para el Bloque 4 (UNI-03).
- Hay una sola ranura de guardado. Varias ranuras, autoguardado y exportar partidas quedan para el Bloque 6.
- El Centro Urbano no produce aldeanos: la producción es del Bloque 2.
- Los valores económicos no están verificados contra AoE II DE.
- El lienzo se dibuja a resolución 1× (decisión T-008).
- Existe un gancho de pruebas automáticas que solo se activa con `?test=1` en la URL. No cambia las reglas del juego y no aparece en el enlace normal.

**Siguiente paso:** el usuario prueba el ciclo en su iPhone y decide si acepta el Bloque 1. El Bloque 2 no empezará sin su autorización.
