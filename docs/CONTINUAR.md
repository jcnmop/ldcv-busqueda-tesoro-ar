# Estado del trabajo y siguiente paso

> Actualizar este archivo al final de cada sesión. Es el punto de entrada del relevo
> entre sesiones y entre modelos (Fable → Opus → asistentes del LDCV).

## Última actualización
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

## Pendiente (en orden sugerido)
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
npm test                      # debe dar 27/27
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
