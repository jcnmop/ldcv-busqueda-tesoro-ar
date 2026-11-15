# Arquitectura · Búsqueda del Tesoro AR (LDCV-UCR)

## Qué es

Una aplicación web (no se instala) para la competencia del LDCV. Los equipos
escanean un QR inicial, se registran y reciben una ruta de estaciones. En cada
punto físico del campus apuntan la cámara a un marcador impreso; aparece un
objeto 3D anclado al marcador y se abre un minijuego de 1–3 minutos. Al resolverlo
reciben puntos y la pista de la siguiente estación. Una tabla de posiciones en vivo
se proyecta en el evento.

## Stack y por qué

| Pieza | Elección | Motivo |
|---|---|---|
| Plataforma | **WebAR** (navegador del celular) | Sin tiendas, sin Apple Developer, funciona en Android e iPhone, se corrige en vivo el día del evento |
| Empaquetado | **Vite** + JavaScript sin framework | Simple de leer para estudiantes asistentes; arranque rápido |
| Tracking | **MindAR** (image tracking) | Open source, corre en el navegador, el marcador es a la vez disparador y ancla |
| 3D | **Three.js** | Estándar; MindAR lo integra nativamente; carga `.glb` exportados desde Blender |
| Datos | Adaptador `local` (localStorage) hoy → **Supabase** cuando exista cuenta | El juego funciona sin conexión; el backend solo sincroniza y alimenta la tabla |
| Pruebas | `node --test` | Sin dependencias; valida el núcleo y el contrato de estación |

## Estructura

```
index.html                 Única página. #app (pantallas) + #ar-container (cámara)
src/
  main.js                  Arranque: lee estado, decide pantalla inicial
  core/                    Lógica del juego. NO conoce los minijuegos.
    estado.js              Estado del equipo (id, ruta, completadas, puntos) + persistencia
    rutas.js               Permutación determinista por equipo + validación de secuencia
    puntaje.js             Fórmulas de puntaje compartidas
    backend/               Adaptador de datos
      index.js             Elige local|supabase según VITE_BACKEND
      local.js             localStorage (desarrollo y respaldo sin conexión)
      supabase.js          Sincronización con Supabase (pendiente de credenciales)
    router.js              Cambia de pantalla dentro de #app
  ar/
    escena.js              Inicializa MindAR + Three.js, expone onMarcadorDetectado()
  stations/
    contrato.js            EL CONTRATO. Leer antes de crear una estación.
    registro.js            Lista de estaciones activas (único lugar)
    _plantilla/            Copiar para crear una estación nueva
    <id-estacion>/index.js Una carpeta por estación
  ui/                      Pantallas: registro, pista, escaneo, resultado, final
  styles/base.css
public/
  marcadores/<id>.mind     Marcadores compilados por MindAR
  modelos/<id>.glb         Modelos optimizados (Blender → glTF)
tools/                     Scripts del organizador (imprimir rutas, generar QR)
tests/                     Pruebas del núcleo y del contrato
docs/                      Este documento, DECISIONES.md, CONTINUAR.md, MARCADORES.md
```

## Flujo de una partida

```
QR inicial → /  → Pantalla registro (nombre de equipo)
                 → estado.crearEquipo() → rutas.rutaDeEquipo()
                 → Pantalla pista (estación[0])
                 → "Escanear" → ar/escena.js enciende cámara
                 → marcador detectado → registro.porMarcador[id]
                      ├─ no es la siguiente → aviso, seguir escaneando
                      └─ es la siguiente   → estacion.crearObjeto() anclado
                                           → botón "Jugar"
                                           → estacion.montarMinijuego(contenedor, ctx)
                                           → ctx.terminar(resultado)
                                           → estacion.calcularPuntaje()
                                           → estado.completar() + backend.sincronizar()
                                           → Pantalla resultado → siguiente pista
                 → última estación → Pantalla final + posición en la tabla
```

## Antitrampa (deliberadamente simple)

1. **Ruta distinta por equipo**, determinista (`rutas.js`). Una foto del marcador
   compartida no sirve: la app de otro equipo la rechaza si no es su siguiente.
2. **Clave del evento** (`VITE_CLAVE_EVENTO`): cambiarla el día del evento invalida
   cualquier ruta calculada de antemano.
3. **Marca de tiempo** por estación: el organizador detecta tiempos imposibles
   entre puntos lejanos del campus.
4. No se intenta más que esto. Es una competencia universitaria, no un banco.

## Restricciones de rendimiento (celulares de gama media)

- Modelos `.glb` ≤ 50 000 triángulos, texturas ≤ 1024 px, un solo material si es posible.
- Un marcador por estación; imagen mate, alto contraste, sin repetición de patrones.
- Minijuegos en DOM/Canvas 2D; Three.js solo para el objeto anclado.
- Todo debe funcionar sin conexión; el backend solo sincroniza cuando hay señal.

## Lo que NO está en el alcance

- App nativa, tiendas, notificaciones push.
- Geolocalización como disparador (GPS no da la precisión).
- Multijugador en tiempo real dentro de un minijuego.
