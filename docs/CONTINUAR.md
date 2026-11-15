# Estado del trabajo y siguiente paso

> Actualizar este archivo al final de cada sesión. Es el punto de entrada del relevo
> entre sesiones y entre modelos (Fable → Opus → asistentes del LDCV).

## Última actualización
2026-11-15 · **Prueba real en celular superada**: con la versión publicada en GitHub Pages,
Juan Carlos recorrió las 4 estaciones escaneando los marcadores en pantalla; la RA se
ve bien y el flujo completo funciona. Prototipo validado.

2026-11-14 · Sesión inicial con Claude Fable 5.1. Bloques 1–3 completos; la app es
jugable de punta a punta con CUATRO estaciones reales: viga-equilibrio,
secuencia-constructiva, clash-bim y ojo-ingeniero.

## Verificación hecha en esta sesión
- `npm test`: 27 pruebas unitarias pasan.
- `npm run e2e`: Chrome sin ventana con cámara falsa reconoce ambos marcadores `.mind`
  reales en ~2,5 s, resuelve los cuatro minijuegos, llega a la pantalla final y el tablero
  muestra al equipo. Capturas en `tools/.e2e/*.png` (ignoradas por git).
- `npm run build` y build con `--base=/<repo>/` para GitHub Pages: correctos.
- QR de inicio verificado por decodificación con OpenCV.

## Hecho
- [x] **Bloque 1 — Estructura y arquitectura base** (contrato, plantilla, rutas, puntaje, docs)
- [x] **Bloque 2 — Núcleo del juego**: estado con persistencia, backend local/Supabase,
  sincronizador con reintentos, router, pantallas completas, tablero en vivo.
- [x] **Bloque 3 — Estaciones reales y RA**: `ar/escena.js`, `ar/modelos.js`,
  estaciones `viga-equilibrio`, `secuencia-constructiva`, `clash-bim` y `ojo-ingeniero`
  (las tres primeras con lógica pura probada),
  generación e impresión de marcadores, compilación automática de `.mind`, prueba e2e.
- [x] Herramientas: `npm run rutas`, `npm run qr`, flujo de GitHub Pages.
- [x] Docs: MARCADORES, MODELOS, SUPABASE, PUBLICAR.

## Bloque visual 1 (2026-11-15) — hecho
- [x] `cargarGLB` con animaciones (`animacion` en bucle, `entrada` al detectar, `reproducir()`),
      normalización por `altura`. Robot CC0 en `public/modelos/robot.glb` usado en ojo-ingeniero.
- [x] Tocar el objeto 3D abre el reto (raycast + toque tolerante). `alTocar` opcional en el contrato.
- [x] Orientación 'pared' por defecto (objetos de pie frente al póster).
- [x] Puente coleccionable: `src/core/puente.js` (lógica probada) + `src/ui/puente3d.js` (visor);
      pieza en la pantalla de resultado y puente completo en la final.
- [x] Nombre de la estación en la pista; ancho máximo 520 px en computadora.
- [x] 31 pruebas unitarias; e2e toca el objeto 3D en las 4 estaciones.

## Bloque visual 2 (2026-11-15) — hecho
- [x] Gestos en RA: arrastrar = girar, pellizcar = escalar (`manipulador` en escena.js).
- [x] Pieza dorada del puente orbitando: atraparla abre el reto; tocar el objeto solo reacciona
      (robot: cambia de animación en cada toque).
- [x] Póster META (`public/marcadores/meta.*`): el equipo ve SU puente en RA, piezas cayendo,
      confeti si está completo, tocar una pieza muestra su función. `src/ui/puente-ra.js`.
- [x] Respuestas correctas: `explicarSolucion(detalle)` en cada estación; botón al final.
      Configurable en `src/config.js`.
- [x] 33 pruebas unitarias; e2e cubre tocar, girar, atrapar, respuestas y puente en RA.

## Bloque visual 3 (2026-11-15) — hecho
- [x] Detective de clashes rediseñado como corte transversal con eje de cotas.
- [x] Gestos: 1 dedo mueve, 2 dedos giran y escalan, doble toque centra.
- [x] Puente en RA sin póster (`src/ui/puente-libre.js`, model-viewer).
- [x] Bienvenida con avatar 3D animado, globo de diálogo y "Creado por Juan Carlos Navarrete".
- [x] e2e cubre bienvenida, mover/centrar, corte del clash y puente sin póster.

## Bloque 4 (2026-11-15) — hecho
- [x] Estación `presa-hidrostatica` (lógica probada, 3D animado, marcador compilado). Ahora son 5 estaciones.
- [x] Botones Girar / Mover / Centrar en todas las pantallas de RA; Girar también inclina.
- [x] Estabilizador de pose (suavizado + zona muerta + gracia); perfil 'alta' para el puente en META.
- [x] 38 pruebas unitarias; e2e recorre las 5 estaciones con todos los gestos.

## Pendiente (en orden sugerido)
- [ ] Ajustar la `pista` de la presa al punto real (Laboratorio de Hidráulica) e imprimir su póster.
- [ ] Avatar propio de Juan Carlos: .glb con animaciones → `public/modelos/`, actualizar `AVATAR` en config.
- [ ] Probar "Ver en mi espacio" en iPhone (Quick Look) y Android (WebXR) reales.
- [ ] Probar en celular real los gestos nuevos y la pieza dorada.
- [ ] Marcadores con QR pequeño en una esquina (abrir la app desde el póster).
- [ ] **Rediseñar las preguntas/retos** para que no se puedan resolver con IA
  (decisión de Juan Carlos: depurarlas después; ligarlas a observación física del sitio).
- [ ] **Figuras y personajes propios** (fase siguiente): marcadores diseñados por el LDCV y
  modelos 3D/mascota desde Blender (.glb). Agregar soporte de animaciones glTF (AnimationMixer).
- [ ] Repetir la prueba en al menos un iPhone (Safari) y un Android de gama media.
- [x] **Repositorio en GitHub**: https://github.com/jcnmop/ldcv-busqueda-tesoro-ar
- [x] **Publicado en GitHub Pages**: https://jcnmop.github.io/ldcv-busqueda-tesoro-ar/
  (se republica solo en cada push a main). QR en `public/qr-inicio.png`.
- [ ] **Primera prueba en celular real** (`npm run dev`, URL de red, marcador en pantalla o
  impreso). Lo que NO se pudo validar aquí y hay que mirar en el teléfono:
  - escala y posición de los objetos 3D sobre el marcador (ajustar tamaños en `crearObjeto`);
  - estabilidad del anclaje con la mano temblando (`filterMinCF`/`filterBeta` en escena.js);
  - rendimiento en gama media y consumo de batería;
  - que el overlay (botón Jugar) quede sobre el video en iOS Safari.
- [ ] **Configurar `ojo-ingeniero`**: reemplazar `MAGNITUDES` por valores medidos por el LDCV
  en los puntos reales (P40/BLK360).
- [ ] **Más estaciones** si se quieren 5–6 (copiar `_plantilla/`). Ideas: identificar el
  instrumento topográfico, lectura de plano, nube de puntos vs. modelo (usar un `.glb` real
  del lab con `cargarGLB`).
- [ ] Reemplazar los marcadores generados por diseños propios del LDCV si se desea
  (ver docs/MARCADORES.md); recompilar con `npm run marcadores:compilar`.
- [ ] Decidir y configurar **Supabase** (docs/SUPABASE.md) o quedarse en local.
- [ ] Ajustar textos de `pista` de cada estación a los puntos reales del campus.
- [ ] Pulido opcional: sonido al detectar marcador, vibración, pantalla de "cómo jugar",
  modo organizador para reiniciar un equipo con código.

## Decisiones abiertas (requieren a Juan Carlos)
- Cantidad final de estaciones y ubicaciones.
- Nombre y URL del repositorio (afecta el QR y `--base`).
- Supabase sí/no.
- Si los asistentes desarrollan estaciones: asignar una carpeta por persona bajo `src/stations/`.

## Cómo retomar en 5 minutos
```bash
git clone <repo> && cd ldcv-busqueda-tesoro-ar
npm install
npm test                      # debe dar 38/38
npm run dev                   # abrir la URL de red en el celular (https)
# opcional, para la prueba automática de RA (requiere Chrome y ffmpeg):
npm run marcadores:compilar && npm run e2e
```

## Notas para el siguiente modelo
- Leer `CLAUDE.md` y `src/stations/contrato.js` antes de tocar estaciones.
- La lógica de cada minijuego va en `logica.js` (pura, probada en `tests/estaciones.test.js`);
  `index.js` solo hace DOM y Three.js. Mantener esa separación.
- No instalar `three` ni `mind-ar` por npm (ver DECISIONES.md).
- Si se cambia la firma del contrato, actualizar `validarEstacion`, `_plantilla`, ambas
  estaciones y este documento.
