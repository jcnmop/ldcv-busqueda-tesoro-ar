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

## 2026-11-14 · Contrato de estación como módulo con interfaz fija
**Motivo:** permite que cualquier persona (o modelo de IA) agregue minijuegos copiando
`_plantilla/` sin tocar el núcleo. Validado por `validarEstacion()` en tests y al cargar.
