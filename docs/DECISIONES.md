# Registro de decisiones

Formato: fecha · decisión · motivo · alternativas descartadas. Agregar al final, nunca borrar.

## 2026-11-14 · WebAR en lugar de app nativa
**Motivo:** sin tiendas ni Apple Developer; Android e iPhone con el mismo código;
corrección en vivo el día del evento. **Descartado:** Unity + AR Foundation (solo se
justificaría con físicas o gráficos pesados, que los minijuegos no necesitan).

## 2026-11-14 · Marcador de imagen como disparador, no GPS
**Motivo:** GPS tiene 5–15 m de error junto a edificios; el marcador es exacto y además
ancla el objeto 3D. **Descartado:** GPS (puede volver como pista "te estás acercando"),
QR solo (no ancla el objeto).

## 2026-11-14 · MindAR + Three.js
**Motivo:** open source, image tracking en navegador, integración directa con Three.js.
**Descartado:** 8th Wall (de pago), AR.js (tracking de imagen menos estable), model-viewer
(no permite minijuego sobre el marcador).

## 2026-11-14 · JavaScript sin framework
**Motivo:** el código lo mantendrán estudiantes asistentes con niveles distintos; menos
capas que aprender. **Descartado:** React/Vue/Svelte.

## 2026-11-14 · Rutas deterministas por equipo (hash del id + clave del evento)
**Motivo:** funciona sin backend, evita filas y neutraliza fotos compartidas de marcadores;
el organizador puede imprimir las rutas de antemano. **Descartado:** rutas asignadas por
servidor (dependen de conexión).

## 2026-11-14 · Adaptador de backend con modo `local` por defecto
**Motivo:** permite desarrollar y probar sin credenciales; Supabase se enchufa después sin
tocar el juego. **Descartado:** Firebase (Supabase tiene SQL directo y tabla de posiciones
más sencilla), backend propio (mantenimiento innecesario).

## 2026-11-14 · Three.js y MindAR por CDN con import map, no por npm
**Motivo:** el paquete `mind-ar` de npm arrastra dependencias nativas (`canvas`,
TensorFlow para Node) que fallan al instalar y no se usan en el navegador. El bundle
`mindar-image-three.prod.js` importa `three` como especificador externo, así que el
import map es el patrón oficial. Vite marca ambos como externos (`vite.config.js`).
**Regla:** no instalar `three` por npm: habría dos copias y MindAR rompería.
**Costo aceptado:** la app depende de jsDelivr en tiempo de ejecución. Si el campus
bloqueara el CDN, copiar los archivos a `public/vendor/` y apuntar el import map ahí.

## 2026-11-14 · Un archivo .mind por estación
**Motivo:** el juego ya sabe cuál estación toca; cargar solo ese marcador es más
liviano y hace que los marcadores ajenos simplemente no se reconozcan (antitrampa
gratis). **Descartado:** un solo .mind con todos los targets (más pesado, y obliga a
lógica de "no es tu estación").

## 2026-11-14 · Compilación de marcadores automatizada con Playwright
**Motivo:** el compilador de MindAR solo corre en navegador; en vez de depender de la
herramienta web manual, `tools/compilar-marcadores.mjs` lo ejecuta en Chrome sin
ventana. Mismo mecanismo para la prueba de punta a punta con cámara falsa (`npm run e2e`).

## 2026-11-14 · `[hidden] { display:none !important }` global
**Motivo:** bug encontrado por la prueba e2e: la clase `.minijuego` (display:flex)
le ganaba al atributo `hidden` y un panel invisible bloqueaba todos los toques.

## 2026-11-14 · Contrato de estación como módulo con interfaz fija
**Motivo:** permite que cualquier persona (o modelo de IA) agregue minijuegos copiando
`_plantilla/` sin tocar el núcleo. Validado por `validarEstacion()` en tests y al cargar.

## 2026-11-15 · Orientación "pared" por defecto
**Motivo:** en la prueba real los marcadores se usan verticales (paredes, columnas,
monitor). Los objetos se diseñan "Z arriba" y la escena los endereza sobre el borde
inferior del póster. Una estación puede pedir `orientacion: 'mesa'` si su marcador va acostado.

## 2026-11-15 · Toque tolerante sobre el objeto 3D
**Motivo:** objetos delgados (vigas, cables) son difíciles de acertar con el dedo. Si el
raycast no golpea, cuenta un toque dentro del rectángulo en pantalla del objeto (+10 %).
El panel inferior de la RA deja pasar los toques (pointer-events) salvo en sus botones.

## 2026-11-15 · Puente coleccionable por posición en la ruta
**Motivo:** cualquier ruta construye el puente en orden lógico (pilas → tablero → arco →
péndolas). Pieza ganada solo si el reto se completa; si no, queda un hueco visible.

## 2026-11-15 · Robot de prueba CC0 (three.js RobotExpressive)
**Motivo:** validar animaciones y toque sin esperar modelos propios. Licencia CC0 1.0.
Se reemplazará por personajes/mascota del LDCV hechos en Blender.

## 2026-11-15 · Pieza dorada para abrir el reto; tocar el objeto solo reacciona
**Motivo:** más interacción (estilo "atrapar") sin perder control: el objeto se puede girar
(1 dedo), escalar (pellizco) y tocar para reacciones; el reto empieza al atrapar la pieza
del puente que orbita por delante del póster. Prioridad de toques en `escena.js`.

## 2026-11-15 · Respuestas correctas al final del recorrido (configurable)
**Motivo:** retos de valor fijo (Ojo de Ingeniero) se filtrarían entre equipos si la respuesta
se muestra al instante. `src/config.js → MOSTRAR_RESPUESTAS` ('al-final' | 'siempre' | 'nunca').

## 2026-11-15 · Póster META para ver el puente del equipo en RA
**Motivo:** cierre visual del recorrido en la mesa del LDCV. Marcador especial `meta`
generado por `tools/marcadores.js` (lista EXTRAS), no es una estación.

## 2026-11-15 · Clash en corte transversal
**Motivo:** la planta con cotas no se entendía en la prueba real. El corte muestra la viga
y cada instalación a su altura; holguras de 2–10 cm y traslape de 4–15 cm obligan a leer cotas.

## 2026-11-15 · Gestos: 1 dedo mueve, 2 dedos giran/escalan, doble toque centra
**Motivo:** pedido de mover el objeto en el plano de la pantalla. El desplazamiento en píxeles
se convierte a unidades del póster proyectando sus ejes (sistema 2×2) en `escena.js`.

## 2026-11-15 · RA sin marcador con <model-viewer> (Google, v4.4.0, CDN)
**Motivo:** ver el puente "en mi espacio" sin póster. El puente se exporta a .glb en el
celular (GLTFExporter) y model-viewer abre WebXR (Android) o Quick Look (iPhone, USDZ
generado al vuelo). **Limitación:** Scene Viewer de Android no acepta blobs, por eso se
usa `ar-modes="webxr quick-look"`; Android sin soporte WebXR/ARCore solo ve el 3D.

## 2026-11-15 · Bienvenida con avatar configurable
**Motivo:** presentación del evento. `src/config.js → AVATAR, CREADO_POR`. Robot CC0 como
marcador de posición hasta tener el avatar propio de Juan Carlos (.glb desde Blender).

## 2026-11-15 · Modos Girar / Mover con botones + estabilizador de pose
**Motivo:** en la prueba real no se distinguía girar de mover y el puente final temblaba.
Un dedo hace lo que indica el modo activo (botones en pantalla, `controles-ra.js`); dos dedos
siempre escalan y giran. El objeto cuelga de un "seguidor" con suavizado exponencial, zona
muerta y periodo de gracia al perder el marcador (`PERFILES_ESTABILIDAD` en escena.js);
el puente usa el perfil 'alta' y va centrado en el póster (menos brazo de palanca).

## 2026-11-15 · Estación 5: Presa y empuje hidrostático
**Motivo:** pedido de un reto de hidráulica. F = γh²/2 por metro de ancho, aplicada a h/3
del fondo; distractores con errores típicos (γh², γh, γh²/3). Tocar la presa cambia el nivel.

## 2026-11-15 · Clash en dos fases: detectar (duros y blandos) y resolver
**Motivo:** la versión de "un solo culpable" era muy básica. Ahora refleja la coordinación BIM
real: 1–3 conflictos, choque blando por holgura de 5 cm, y reubicación respetando el cielo raso.
El espacio útil se genera para que el ducto quepa justo (obliga a precisión).

## 2026-11-15 · Presa con γ ≈ 10 kN/m³ y h par
**Motivo:** el cálculo con 9.81 y decimales distraía del concepto. F = área del triángulo,
siempre entera; distractores: olvidar ÷2, solo presión de fondo, olvidar γ.

## 2026-11-15 · Pieza dorada más pequeña y órbita más corta
**Motivo:** el halo ocupaba ~40 % del póster y "robaba" toques al objeto; en su extremo la
pieza salía de la pantalla. Diagnóstico en `globalThis.__ramaToque`.

## 2026-11-15 · Respuesta y referencia después de cada reto
**Decisión de Juan Carlos:** MOSTRAR_RESPUESTAS = 'siempre'. Cada estación tiene `referencia`
(curso o flujo del LDCV) además de `explicarSolucion`. Aceptado el riesgo de que los equipos
compartan respuestas: los retos son aleatorios por equipo salvo Ojo de Ingeniero.

## 2026-11-15 · Cronómetro visible
Tiempo anunciado en la pista y al encontrar el marcador; durante el reto, mm:ss grande con
barra; rojo y vibración en los últimos 20 s.

## 2026-11-15 · Detective de clashes reemplazado por "Agua para el barrio"
**Decisión de Juan Carlos:** el clash no convencía. Nueva estación ambiental/sanitaria:
contar casas (algunas ocultas detrás de una bodega → hay que girar el modelo), consumo
= casas × 4 × dotación / 1000 (m³/día), y decidir si el tanque alcanza. El reto se genera
junto con el objeto 3D (`retoActual`) para que el barrio y las preguntas coincidan.
El código del clash queda en el historial de git (commit 6c6fdc6) por si se retoma.
Nuevo campo opcional del contrato: `alturaBase` (altura del objeto sobre el póster).

## 2026-11-15 · Estación 6: Cubicación de concreto con cinta métrica en RA
Losa sobre 4 columnas a escala 0.06 u/m. Cinta: cada toque se ajusta a la esquina más cercana
de la pieza tocada (medición exacta); dos toques = una medida con rótulo. Largo, ancho y altura
se miden; espesor y sección vienen "de planos". Volumen total y viajes de mixer (6 m³, ⌈ ⌉).
Contrato ampliado: `alTocar(objeto, {THREE, golpe})` puede devolver texto para el panel;
`instruccionRA`, `inclinacionInicial`, `alTocarRapido` opcionales.

## 2026-11-15 · Tolerancia de la pieza dorada por círculo en píxeles
El rectángulo proyectado fallaba con perspectiva fuerte (pieza cerca de la cámara). Ahora:
círculo alrededor del centro visible, radio acotado (110/150 px) y sin captura si el centro
está fuera de pantalla. Las instrucciones del panel RA deben ser cortas: un texto largo
agranda el panel y sube los botones sobre el modelo.
