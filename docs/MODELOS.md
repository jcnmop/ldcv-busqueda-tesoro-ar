# Modelos 3D para las estaciones

El objeto que aparece sobre el marcador lo devuelve `crearObjeto(THREE)` de cada
estación. Puede ser **procedural** (primitivas de Three.js, como en las dos estaciones
actuales) o un **`.glb` exportado desde Blender** (por ejemplo un fragmento de modelo
BIM del laboratorio).

## Sistema de coordenadas sobre el marcador

- El marcador mide **1 unidad de ancho**; el origen está en su centro.
- **X** a la derecha, **Y** hacia arriba *del papel*, **Z** sale del papel hacia la cámara.
- Un objeto "de pie" sobre el marcador se eleva en **+Z**. Blender exporta con +Y arriba,
  por eso `cargarGLB` rota el modelo −90° en X por defecto (`acostar: true`).
- Tamaño cómodo: entre 0,3 y 1,0 unidades de alto. Más grande se sale del encuadre.

## Preparar un modelo desde Revit/Blender (flujo LDCV)

1. **Revit → Blender**: exportar FBX/IFC o usar el flujo habitual del lab. Traer solo
   el fragmento que interesa (una conexión, una losa, un nudo), no el edificio.
2. **Reducir**: `Decimate` hasta quedar por debajo de **50 000 triángulos** en total.
   Un celular de gama media rinde bien hasta ahí; más allá empieza a calentarse.
3. **Unificar**: unir mallas (`Ctrl+J`) y, si hay muchos materiales, hornear a **una sola
   textura de 1024 px** (o 2048 px máximo). Cada material extra es un draw call.
4. **Aplicar**: escala y rotación (`Ctrl+A`), modificadores aplicados, origen en la base
   del objeto para que "se pare" sobre el marcador.
5. **Exportar**: `File > Export > glTF 2.0`, formato **.glb**, incluir solo lo seleccionado,
   `+Y Up` activado, compresión Draco **desactivada** (el cargador base no la trae).
6. Guardar en `public/modelos/<id>.glb`. Objetivo: **< 3 MB** por modelo.

## Usar el modelo en una estación

```js
import { cargarGLB } from '../../ar/modelos.js';

crearObjeto(THREE) {
  return cargarGLB(THREE, `${import.meta.env.BASE_URL}modelos/nudo-acero.glb`, { escala: 0.5 });
},
```

`cargarGLB` devuelve de inmediato un grupo con un anillo giratorio y lo reemplaza por
el modelo cuando termina de cargar. `desmontar()` no necesita hacer nada especial: la
escena libera geometrías y materiales al detenerse.

## Etiquetas y animación

- `etiqueta(THREE, 'texto')` crea un sprite con texto para rotular partes del modelo.
- Si el objeto tiene `userData.girar = <rad/s>`, la pantalla de escaneo lo hace rotar
  sobre Z. Para otras animaciones use `escena.enCadaCuadro(fn)` (ver `src/ar/escena.js`).

## Qué NO hacer

- No cargar el modelo federado completo ni nubes de puntos: no es el lugar.
- No usar texturas de 4K ni materiales con transparencia compleja.
- No depender de luces de la escena para que el modelo se vea: si el color importa,
  hornearlo en la textura o usar `MeshBasicMaterial`.
