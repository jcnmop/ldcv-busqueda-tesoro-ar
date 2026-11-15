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
