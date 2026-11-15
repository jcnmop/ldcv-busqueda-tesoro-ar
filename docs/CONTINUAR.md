# Estado del trabajo y siguiente paso

> Actualizar este archivo al final de cada sesión. Es el punto de entrada del relevo
> entre sesiones y entre modelos (Fable → Opus → asistentes del LDCV).

## Última actualización
2026-11-14 · Sesión inicial con Claude Fable 5.1.

## Hecho
- [x] **Bloque 1 — Estructura y arquitectura base**
  - Proyecto Vite + JS, carpetas, `index.html`, estilos base.
  - `src/stations/contrato.js`: contrato de estación con validador.
  - `src/stations/_plantilla/`: estación de ejemplo mínima que cumple el contrato.
  - `src/stations/registro.js`: registro único de estaciones con validación al cargar.
  - `src/core/rutas.js`: rutas deterministas por equipo + validación de secuencia.
  - `src/core/puntaje.js`: fórmulas de puntaje compartidas.
  - `tests/core.test.js`: 10 pruebas, todas pasan.
  - Docs: ARQUITECTURA.md, DECISIONES.md, CLAUDE.md.

## Pendiente (en orden)
- [ ] **Bloque 2 — Núcleo del juego**
  - `src/core/estado.js`: equipo, ruta, completadas, puntos, marcas de tiempo; persistencia en localStorage.
  - `src/core/backend/{index,local,supabase}.js`: adaptador; `local` completo, `supabase` con la interfaz lista y TODO en las credenciales.
  - `src/core/router.js` + `src/ui/*`: pantallas registro → pista → escaneo → resultado → final.
  - `src/main.js`: arranque.
  - Pruebas de `estado.js`.
- [ ] **Bloque 3 — Estación de referencia completa**
  - `src/ar/escena.js`: MindAR + Three.js, callback al detectar marcador, anclar `crearObjeto()`.
  - Primera estación real (sugerida: `viga-equilibrio` o `clash-bim`) con minijuego jugable.
  - `docs/MARCADORES.md`: cómo diseñar la imagen y compilarla a `.mind`.
  - Marcador de prueba en `public/marcadores/`.
- [ ] **Bloque 4 — Relevo y publicación**
  - Verificar `npm run build`.
  - Commit inicial y push a GitHub.
  - Decidir hosting (GitHub Pages es suficiente; necesita HTTPS, que Pages da por defecto).
- [ ] Después (con Opus u otro): estaciones restantes, tabla de posiciones en vivo (`/tablero`),
  `tools/rutas.js` para imprimir rutas por equipo, `tools/qr.js`, pruebas en sitio con celulares.

## Decisiones abiertas (requieren a Juan Carlos)
- Cantidad de estaciones y ubicaciones en el campus.
- Lista definitiva de minijuegos (ver ideas en ARQUITECTURA.md y en el chat de origen:
  viga en equilibrio, clash en modelo BIM, estimar altura de edificio real, secuencia constructiva).
- Crear cuenta de Supabase y pasar URL + anon key (o decidir quedarse solo en local + exportar CSV).
- Nombre y URL del repositorio en GitHub.

## Cómo probar en un celular
1. `npm install && npm run dev`
2. Anotar la URL de red que imprime Vite (https://192.168.x.x:5173).
3. Abrirla en el celular en la misma Wi-Fi; aceptar el certificado local.
4. Permitir la cámara.
