<!-- Copia literal del documento maestro v2.0 entregado por el usuario el 9 de octubre de 2026. No editar aquí sin una decisión registrada en docs/DECISIONS.md. -->

EMPIRES-WAR

Documento maestro consolidado de diseño e implementación — v2.0

Fecha: 9 de octubre de 2026
Estado: aprobado como dirección de trabajo por las decisiones finales del usuario.
Destino: Claude, implementador a través de GitHub.
Repositorio a crear: Empires-War.

> **Regla de precedencia:** las decisiones más recientes y explícitas del usuario prevalecen sobre el documento maestro AoE v1.0, las auditorías v1.0/v1.1 y propuestas anteriores. Todo lo no definido expresamente toma como referencia **Age of Empires II: Definitive Edition (AoE II DE)**. No mezclar arbitrariamente versiones ni inventar mecánicas. Este documento consolida decisiones de producto, no certifica una reproducción técnica exacta ni proporciona una base de datos verificada de todos los valores de AoE II DE.

1. Objetivo y principio rector

Crear un RTS histórico isométrico para navegador, single-player contra IA, que se sienta y juegue como AoE II DE. El usuario quiere empezar a construir y jugar cuanto antes. La entrega se divide en bloques verificables y jugables; el alcance final de la primera versión completa no se reduce por comenzar con un vertical slice pequeño. El juego deberá funcionar en iPhone, tablets y computadoras.

Referencia funcional: AoE II DE, con economía, población, edificios, unidades, tecnologías, edades, exploración, diplomacia, comercio, combate, formación, controles y condiciones clásicas, excepto las excepciones enumeradas en §3. La fidelidad incluye requisitos y restricciones por civilización y versión de balance de referencia, no solo apariencia.

Propiedad intelectual: crear nombre, código, ilustraciones, sprites, música y demás activos originales o con licencia compatible. No extraer ni redistribuir activos propietarios, voces, marcas, archivos ni código de AoE II DE. Los datos numéricos de referencia deben documentar su procedencia y versión; evitar presentarlos como comprobados sin verificación.

2. Alcance: primera versión completa vs primer bloque jugable

Primera versión completa (objetivo): varias civilizaciones con identidad y árbol tecnológico diferenciado; cuatro edades; economía y mercado clásicos; aldeanos, construcciones, entrenamiento y mejoras; ejército terrestre, formaciones y órdenes; IA de dificultad configurable; niebla de guerra; mapa y minimapa; configuración de partidas; condiciones clásicas; partidas guardadas; interfaz móvil/PC. La fidelidad se valida por sistema, con matriz de cobertura; no se promete paridad instantánea con todo el contenido de AoE II DE.

Primer bloque jugable (Bloque 0/1): crear repositorio y proyecto desplegable; escena isométrica de prueba, cámara y controles táctiles/PC; mapa pequeño determinista; selección de unidades; un aldeano de prueba que se desplaza, recoge un recurso y lo deposita en un edificio; reserva común actualizada; construcción básica de prueba; guardado/carga inicial. Datos y gráficos provisionales identificados. No simular civilizaciones completas ni IA avanzada en este bloque. Debe poder abrirse desde un enlace GitHub Pages en iPhone y PC.

No declarar una etapa ‘terminada’ si solo existe un mockup o una pantalla estática. El usuario debe poder realizar las acciones y ver el resultado en la simulación.

3. Excepciones explícitas a AoE II DE que siguen vigentes

1. Capital: el primer Centro Urbano propio es la capital; puede transferirse formalmente a otro Centro Urbano activo propio. Destruir la capital por sí solo no provoca derrota. La derrota del jugador se produce al perder todos sus Centros Urbanos; no reemplazar silenciosamente esta regla por la condición genérica de eliminación de AoE II.
2. Maravillas: se pueden construir, pero no producen victoria automática ni temporizador de victoria.
3. Reacción de aldeanos: reaccionan al recibir daño o cuando un enemigo a seis casillas o menos ataca a un aliado; respetan órdenes y prioridades acordadas. El umbral es configurable para pruebas, pero no modificar sin justificación y aprobación.
4. Minimapa: cada imperio conserva color fijo. Vista normal = colores de imperios. Botón «Ver por relación» = aliados verdes, neutrales amarillos, enemigos rojos, propio distinguible. Esta transformación afecta solo al minimapa: no recolorea unidades, edificios ni anillos de selección del mapa principal.
5. Trampas exclusivas del jugador: quitar niebla de guerra para el jugador sin dar visión a la IA; registrar uso. Modo de trampas con objetivo de hasta 600 unidades militares del jugador y 300 militares por cada IA, condicionado a pruebas reales de rendimiento. No confundir estos números con el límite de población total normal ni prometerlos como capacidad demostrada.
6. Ríos: solo exploradores y caballería ligera pueden vadear tramos poco profundos, si se implementan vados; otras unidades requieren puentes o cruces válidos. Ríos profundos, lagos y océanos son intransitables a pie. Para el primer bloque, no es necesario incluir ríos complejos.
7. Superficie construida: métrica descriptiva de espacio ocupado por construcciones, sin fronteras, propiedad territorial ni bonificaciones.
8. Guardado: congelar simulación solo durante escritura; reanudar si estaba en marcha y conservar pausa si ya estaba pausada.
9. Rendimiento: la fluidez en iPhone 15 Pro Max prevalece sobre objetivos de tamaño de mapa, número de unidades o detalle gráfico.

Reglas anteriores sustituidas: no existe pago desde almacenes individuales; los recursos son una reserva común del imperio al estilo AoE II DE. Quedan anuladas las reglas de almacenamiento con capacidad por edificio, pérdida de recursos almacenados por destrucción del almacén, deducción desde almacén más cercano o con mayor saldo, y el modelo de granjas que exige una renovación inventada de 10/40 de madera. Los costes, incluido el de resembrar granjas, se toman del AoE II DE de referencia. El coste de cancelar investigaciones sigue la mecánica real de la versión de referencia y no un porcentaje inventado del 75 %. No introducir automatizaciones especiales de aldeanos (incendios automáticos, reparación autónoma o redistribución económica) en la primera versión salvo que formen parte de AoE II DE; la prioridad histórica de esas funciones se conserva únicamente como especificación de una posible expansión futura.

4. Economía y balance

Recursos clásicos: comida, madera, oro y piedra. Aldeanos recolectan y depositan en edificios compatibles; al depositar aumentan el contador global. Construcción, entrenamiento, investigaciones y transacciones consumen la reserva global sin elegir almacén pagador. La reserva no se convierte en inventario físico de almacenes. Aplicar costes, tiempos, rendimientos, requisitos, tasas de recolección, granjas y bonificaciones conforme a una versión de balance documentada de AoE II DE. No inventar valores definitivos.

Mantener un catálogo de datos tipado por civilización, edad, unidad, edificio y tecnología. Cada dato de balance tendrá sourceVersion, sourceNote y estado verified/provisional; las pruebas tempranas pueden usar valores provisionales rotulados, nunca venderlos como fieles al original. Definir fórmulas y redondeos en un solo módulo de simulación. Mercado: compraventa de recursos y precios variables; comerciantes terrestres entre mercados para generar oro; sin unidades navales por ahora.

5. Civilizaciones, edades y tecnologías

Cuatro edades exactas: Oscura, Feudal, Castillos e Imperial. Las transiciones dependen de requisitos y costes de AoE II DE. Múltiples civilizaciones en la primera versión completa, con diferencias de roster, bonificaciones, restricciones y árbol tecnológico. Implementarlas incrementalmente con una primera civilización de prueba; nunca presentar esa primera civilización como la lista final. Las tecnologías se investigan en edificios correspondientes, modifican unidades/actividades pertinentes y respetan restricciones de civilización. Cancelaciones y reembolsos conforme a mecánica de AoE II DE documentada; distinguir cancelación manual de pérdida por destrucción de edificio y distinguir investigación de producción de unidades.

6. Unidades, población y combate terrestre

Aldeanos clásicos, economía y órdenes clásicas. Casas, centros urbanos, edificios militares, colas de producción y límite de población conforme a AoE II DE y ajustes de partida. No aplicar el antiguo ‘+10 población por casa’ si contradice la referencia escogida. Unidades con vida, ataque, defensa, bonificaciones, alcance, línea de visión, velocidad y costes parametrizados. Órdenes: mover, atacar, atacar-mover, patrullar, defender/proteger, mantener posición, formaciones y puntos de reunión según referencia. Movimiento con colisiones, rutas y obstáculos; evitar unidades atravesando construcciones o bloqueándose de forma permanente. Daño a edificios, estados visuales, derrumbe y reparación siguiendo AoE II DE; no implementar incendios propagables o ruinas persistentes especiales en la primera versión.

Modo normal: límites de población clásicos configurables según opciones de partida, con medidas técnicas que protejan la fluidez. Trampas: objetivos separados de 600 militares del jugador y 300 militares por IA; comprobar impacto total con aldeanos, pathfinding, visión y combate. No afirmar que la máquina soporta estos objetivos sin benchmark.

7. Mapa, gráficos, niebla e interfaz

Mapa procedural cerrado y reproducible por semilla; tamaños de referencia 160, 224, 320 y objetivo opcional 480 × 480 casillas. 480 × 480 solo si pasa pruebas en el dispositivo de referencia. Biomas, elevaciones, obstáculos y recursos según etapas y fidelidad AoE II DE. La cámara puede recorrer el mapa, pero lo visible está limitado por la niebla normal. Explorado ≠ actualmente visible. Jugador e IA deben usar sus propias reglas de visión y memoria; la IA no conoce posiciones ocultas. Trampa de visión solo del jugador.

Perspectiva isométrica; estética medieval más realista si es viable, pero sprites/efectos/sombras/animaciones y calidad escalables para rendimiento. Minimap con modo normal y modo de relación descrito. UI adaptable y legible en pantalla táctil pequeña; controles PC con mouse/teclado y móviles con gestos y botones contextuales, sin requerir teclado en iPhone. Opciones de partida comparables a AoE II DE: mapa, jugadores, civilizaciones, dificultad IA, recursos, edad inicial y condiciones relevantes.

8. IA, diplomacia, comercio y victoria

IA de estilo clásico: recolectar, construir, avanzar edades, entrenar, defender y atacar, con niveles de dificultad seleccionables. No otorgar recursos gratuitos, omnisciencia ni bonificaciones ocultas solo para compensar falta de lógica; si la referencia de dificultad elegida usa reglas especiales, documentarlas y requerir consistencia con la decisión de no dar ventajas injustas. Diplomacia clásica aliado/neutral/enemigo, sin tratados avanzados por ahora. Comercio clásico terrestre y mercado.

Condiciones clásicas de victoria disponibles en cuanto sean compatibles con las excepciones expresas: Maravillas no activan victoria automática; derrota del jugador al perder todos sus Centros Urbanos. No crear un modo persistente de continuación tras victoria: el usuario lo descartó expresamente. Si una modalidad clásica de AoE II DE entra en conflicto con estas excepciones, prevalece la excepción y se documenta el ajuste.

9. Guardado, integridad y arquitectura

Tecnología de dirección inicial: Phaser 4 + TypeScript + Vite, Preact para UI, GitHub Actions y GitHub Pages, IndexedDB para partidas. Claude debe verificar compatibilidad y versiones antes de fijarlas, sin cambiar pila silenciosamente. Separar simulation (estado/reglas/ticks), content (catálogo balance), render (Phaser), ui (Preact), input, persistence y tests. No usar física de Phaser como fuente de verdad de miles de entidades. IDs estables, semilla reproducible, tick fijo, estado serializable y posibilidad futura de Web Worker.

Guardado manual y automático con varias ranuras; esquema versionado, carga verificada, manejo de errores y escritura atómica cuando sea posible. Persistencia local: explicar que borrar datos del navegador puede eliminar partidas; exportar/importar guardados se recomienda para una etapa posterior o temprana si es sencillo. Pausar simulación durante escritura, no necesariamente mientras está abierto el menú.

10. Rendimiento y criterios de aceptación

Referencia: iPhone 15 Pro Max y PC. Instrumentar FPS, tiempos de tick, memoria aproximada cuando sea accesible, cantidad de unidades activas y tiempos de pathfinding. Ensayar escenarios con 600, 1200, 2400, 3600 y 4800 unidades como pruebas exploratorias, no requisitos contractuales. Registrar condiciones, dispositivo, versión y resultados. Habilitar mapas gigantes y límites de trampas solo tras pruebas; si no pasan, documentar límite viable y alternativas. No reducir reglas de gameplay sin aprobación.

Para cada bloque: checklist de requisitos, código entregado, URL de despliegue, prueba manual iPhone/PC, tests automatizados pertinentes, evidencia de resultado, errores conocidos, cambios en datos y riesgos. Cero tareas olvidadas: mantener docs/REQUIREMENTS_MATRIX.md con IDs, estado (pendiente/en progreso/implementado/probado), prueba asociada y bloque de entrega. No marcar como probado lo que no se ejecutó.

11. Plan de bloques

Bloque 0 — Infraestructura y publicación: crear repo, configurar Vite/TS/Phaser/Preact, build GitHub Pages bajo /Empires-War/, Actions, módulos separados, pruebas de humo y página inicial accesible en móvil. Resultado visible publicado.

Bloque 1 — Primer vertical slice jugable: mapa isométrico pequeño, cámara, selección, órdenes de movimiento, aldeano, recurso recolectable, entrega, contador global, construcción de prueba, guardado/carga; móvil y PC. La IA puede ser ausente o dummy etiquetada, no fingir que está implementada.

Bloque 2 — Economía clásica completa: cuatro recursos, tareas aldeanos, granjas, depósitos, construcciones, población, producción, costes reales validados y rutas.

Bloque 3 — Edades y tecnologías: cuatro edades, edificios/requisitos, árbol de primera civilización y pruebas de balance.

Bloque 4 — Combate terrestre y niebla: unidades, órdenes, formaciones, combate, visión propia y de IA, minimapa, daños y reparación.

Bloque 5 — IA y partida completa: economía IA, defensa/ataque, dificultad, configuración, condiciones de victoria/derrota, diplomacia y comercio.

Bloque 6 — Contenido y acabado: más civilizaciones, datos completos verificables, gráficos originales optimizados, accesibilidad, rendimiento, guardados robustos, QA de dispositivos y matriz de fidelidad. Se podrán subdividir los bloques si el trabajo lo requiere, conservando requisitos y dependencias.

12. Funciones reservadas para versiones futuras (NO implementar ahora)

Ciclo día/noche; comandantes históricos con ejército asignado, habilidades fijas y sin niveles; conquista territorial y fronteras; batallas y unidades navales, barcos pesqueros/comerciales/de transporte; efectos avanzados de destrucción y fuego propagable; IA diplomática avanzada y tratados; cámara lenta especial para batallas; economía civil avanzada, población urbana, ciudades vivas y automatizaciones de aldeanos no clásicas; sistemas de expansión persistente después de victoria; multijugador, cuentas y sincronización en nube. No eliminar del historial del proyecto, pero tampoco infiltrarlos en el primer bloque.

13. Instrucciones operativas a Claude

• El usuario trabaja principalmente desde iPhone y no programa; dar pasos accionables dentro de GitHub/Claude sin exigir terminal local.
• Primero comprobar acceso al repositorio. Si no existe o no hay autorización para crearlo, indicar el paso mínimo concreto; no afirmar que se creó.
• No crear todo el juego en un solo commit. Trabajar por bloques y validar cada entrega.
• Antes de cada bloque: requisitos e invariantes. Después: lista de archivos, pruebas, resultados, pendientes y URL si realmente publicada.
• Nunca cambiar una decisión explícita del usuario ni sustituirla por una aproximación silenciosa. Cuando falten detalles, adoptar AoE II DE, registrar versión de referencia y nivel de verificación.
• No afirmar equivalencia perfecta con AoE II DE hasta contar con pruebas de cobertura de costes, reglas y contenido; una base funcional es una etapa, no el juego completo.
• No confundir documento maestro con instrucciones de copiar contenido protegido de terceros.

14. Registro de decisiones sustituidas de v1.0/v1.1

• Referencia general antes: AoE clásico genérico → AoE II DE.
• Economía de almacenes físicos y descuentos por ubicación → reserva común AoE II DE.
• Costes de granjas de 10/40 madera y costes arbitrarios → costes de versión de balance AoE II DE.
• Reembolso fijo de investigación 75 % → mecánica AoE II DE documentada.
• Casa +10 de población → bonificación clásica de AoE II DE, no el antiguo +10.
• Victoria por Maravilla → excepción: sin victoria automática.
• Continuación persistente tras victoria → descartada para primera versión.
• Diplomacia avanzada → clásica.
• Comandantes, ciclo día/noche, territorios, naval → posteriores.
• Modo de relación en minimapa y anillos → solo minimapa.
• Capacidad obligatoria de 4800 unidades → benchmark opcional; fluidez primero.
• Límite 600 de todas las unidades → separar población normal de objetivos de 600/300 militares en trampas.

Fin del documento maestro.