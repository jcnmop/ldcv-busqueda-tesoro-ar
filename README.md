# Búsqueda del Tesoro AR · LDCV-UCR

Aplicación web de realidad aumentada para la competencia del Laboratorio de Diseño y
Construcción Virtual (Escuela de Ingeniería Civil, Universidad de Costa Rica).

Los equipos recorren el campus con su celular: en cada estación un marcador impreso
hace aparecer un objeto 3D y un minijuego de ingeniería civil. Resolverlo da puntos
y la pista de la siguiente estación.

- Arquitectura: [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md)
- Estado y siguiente paso: [`docs/CONTINUAR.md`](docs/CONTINUAR.md)
- Decisiones técnicas: [`docs/DECISIONES.md`](docs/DECISIONES.md)
- Crear una estación: [`src/stations/contrato.js`](src/stations/contrato.js) y copiar `src/stations/_plantilla/`

```
npm install
npm run dev     # abrir la URL de red desde el celular (HTTPS)
npm test
```

Más comandos: `npm run marcadores` (imágenes de marcador), `npm run marcadores:compilar`
(.mind), `npm run e2e` (prueba completa con cámara falsa), `npm run qr -- <url>`, `npm run rutas`.
Publicación: [`docs/PUBLICAR.md`](docs/PUBLICAR.md).
