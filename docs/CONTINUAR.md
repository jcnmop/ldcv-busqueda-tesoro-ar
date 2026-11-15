# Estado del trabajo y siguiente paso

> Actualizar este archivo al final de cada sesión. Es el punto de entrada del relevo
> entre sesiones y entre modelos (Fable → Opus → asistentes del LDCV).

## Última actualización
2026-11-14 · Sesión inicial con Claude Fable 5.1. Bloques 1–3 completos; la app es
jugable de punta a punta con dos estaciones reales.

## Verificación hecha en esta sesión
- `npm test`: 23 pruebas unitarias pasan.
- `npm run e2e`: Chrome sin ventana con cámara falsa reconoce ambos marcadores `.mind`
  reales en ~2,5 s, resuelve los dos minijuegos, llega a la pantalla final y el tablero
  muestra al equipo. Capturas en `tools/.e2e/*.png` (ignoradas por git).
- `npm run build` y build con `--base=/<repo>/` para GitHub Pages: correctos.
- QR de inicio verificado por decodificación con OpenCV.

## Hecho
- [x] **Bloque 1 — Estructura y arquitectura base** (contrato, plantilla, rutas, puntaje, docs)
- [x] **Bloque 2 — Núcleo del juego**: estado con persistencia, backend local/Supabase,
  sincronizador con reintentos, router, pantallas completas, tablero en vivo.
- [x] **Bloque 3 — Estaciones reales y RA**: `ar/escena.js`, `ar/modelos.js`,
  estaciones `viga-equilibrio` y `secuencia-constructiva` con lógica pura probada,
  generación e impresión de marcadores, compilación automática de `.mind`, prueba e2e.
- [x] Herramientas: `npm run rutas`, `npm run qr`, flujo de GitHub Pages.
- [x] Docs: MARCADORES, MODELOS, SUPABASE, PUBLICAR.

## Pendiente (en orden sugerido)
- [ ] **Push a GitHub** (requiere que Juan Carlos cree el repo y vincule GitHub en claude.ai).
  Luego Settings → Pages → Source: GitHub Actions. Ver docs/PUBLICAR.md.
- [ ] **Primera prueba en celular real** (`npm run dev`, URL de red, marcador en pantalla o
  impreso). Lo que NO se pudo validar aquí y hay que mirar en el teléfono:
  - escala y posición de los objetos 3D sobre el marcador (ajustar tamaños en `crearObjeto`);
  - estabilidad del anclaje con la mano temblando (`filterMinCF`/`filterBeta` en escena.js);
  - rendimiento en gama media y consumo de batería;
  - que el overlay (botón Jugar) quede sobre el video en iOS Safari.
- [ ] **Más estaciones** (copiar `_plantilla/`). Ideas ya conversadas: clash en modelo BIM
  (cargar un `.glb` del lab con `cargarGLB`), estimar altura de un edificio real del campus
  ("Ojo de Ingeniero"), identificar el instrumento topográfico, lectura de plano.
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
npm test                      # debe dar 23/23
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
