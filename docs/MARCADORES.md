# Marcadores (image targets)

Cada estación tiene un marcador impreso. La app reconoce la imagen con MindAR y
ancla el objeto 3D encima. Hay **un archivo `.mind` por estación**, con el nombre
del campo `marcadorId` de la estación: `public/marcadores/<marcadorId>.mind`.

## Flujo completo (automatizado)

```bash
npm run marcadores            # genera public/marcadores/<id>.svg y .png para cada estación del registro
npm run marcadores:compilar   # compila los .png a .mind con Chrome sin ventana (Playwright)
```

El segundo comando descarga una vez el paquete `mind-ar` a `tools/.mindar/` (ignorado
por git). Requiere Google Chrome instalado; si no, `npx playwright install chromium`.
Compila solo los PNG nuevos o modificados; `-- --todos` recompila todo.

Los `.mind` **sí se versionan en git**: son los que carga la app.

## Usar una imagen propia en lugar de la generada

Puede reemplazar `public/marcadores/<id>.png` por cualquier imagen (un plano, una
foto del edificio, un logo) y volver a correr `npm run marcadores:compilar`.
Para que el tracking sea bueno la imagen debe tener:

- **Muchas esquinas y detalles** distribuidos por toda la superficie (texto, formas, texturas).
- **Alto contraste** y colores que no se pierdan en blanco y negro.
- **Sin patrones repetidos** ni simetrías (confunden al rastreador).
- Proporción cercana a cuadrada o 4:3; mínimo 1000 px de lado.
- Evitar grandes zonas lisas, degradados suaves y fotos borrosas.

El compilador web oficial de MindAR (https://hiukim.github.io/mind-ar-js-doc/tools/compile)
sirve como alternativa manual y muestra en pantalla los puntos característicos detectados:
útil para juzgar si una imagen es buena antes de imprimirla.

## Impresión y colocación

- Tamaño recomendado: **A4 o carta completa** (la detección empieza a ~1 m con ese tamaño).
  A3 si el punto obliga a escanear desde lejos.
- Papel **mate**. El brillo del papel fotográfico o la laminación brillante produce
  reflejos que anulan la detección bajo sol o lámparas.
- Pegar sobre superficie **plana y rígida** (cartón pluma, acrílico). Un papel arrugado
  o doblado deja de parecerse a la imagen compilada.
- Preferir **sombra** o luz pareja. Si el punto recibe sol directo a la hora del evento,
  reubicar o montar una visera.
- Altura entre 1,0 y 1,6 m para que se pueda escanear sin agacharse.
- Imprimir **un marcador de repuesto** por estación; se dañan.

## Probar un marcador sin ir al sitio

Abra el PNG en la pantalla de una computadora y escanéelo con el celular desde la app
(`npm run dev` y la URL de red). Sirve para validar la detección; la prueba de luz y
distancia real solo se hace en el punto físico.

## La prueba automática

`npm run e2e` construye la app, abre Chrome sin ventana con una **cámara falsa** que
muestra cada marcador, y verifica que MindAR lo reconoce y que el minijuego se puede
completar. Si cambia una imagen de marcador, vuelva a correrla.
