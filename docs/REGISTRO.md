# Registro privado de partidas en Google Sheets

Cada partida (equipo y estaciones jugadas) se envía a una hoja de cálculo que solo ve el
organizador. Los estudiantes no ven ninguna tabla. Si un celular no tiene señal, la app
guarda todo y lo envía cuando vuelva la conexión.

## Instalación (una sola vez, ~5 minutos)

1. En Google Drive: **Nuevo → Hojas de cálculo de Google**. Nombre sugerido:
   `Registro Búsqueda del Tesoro AR – LDCV`.
2. En la hoja: **Extensiones → Apps Script**.
3. Borrar el contenido de `Código.gs` y pegar todo `docs/registro-google-sheets.gs`. Guardar (💾).
4. **Implementar → Nueva implementación**:
   - Tipo (⚙️): **Aplicación web**.
   - Ejecutar como: **Yo**.
   - Quién tiene acceso: **Cualquier usuario** (necesario para que los celulares envíen datos;
     nadie puede LEER la hoja con esa URL, solo enviar filas).
   - **Implementar** → **Autorizar acceso** → elegir la cuenta → *Configuración avanzada* →
     *Ir a (proyecto)* → **Permitir**. (Google avisa porque el script es propio, no verificado.)
5. Copiar la **URL de la aplicación web** (termina en `/exec`).
6. Pegarla en `src/config.js` → `REGISTRO_SHEETS_URL`, y publicar (commit + push).

Comprobación: abrir la URL `/exec` en el navegador debe mostrar
"Receptor de la Búsqueda del Tesoro AR (LDCV) activo."

## Qué queda registrado
- Pestaña **Equipos**: una fila por equipo (puntos, estaciones completadas, inicio, fin,
  duración). Se actualiza a medida que avanza.
- Pestaña **Estaciones**: una fila por estación jugada (completado, puntos, tiempo en segundos
  y el detalle de respuestas en JSON).

Para descargar: **Archivo → Descargar → Microsoft Excel**.

## Notas
- Si se cambia el código del script, hay que hacer **Implementar → Gestionar implementaciones →
  Editar → Nueva versión** para que la URL use la versión nueva.
- Las partidas jugadas antes de configurar la URL no se envían (ya estaban sincronizadas en local).
