# Instrucciones para Claude (cualquier modelo) en este repositorio

Proyecto del Laboratorio de Diseño y Construcción Virtual (LDCV), Escuela de
Ingeniería Civil, Universidad de Costa Rica. Responsable: Juan Carlos Navarrete Molina.
Idioma del código, comentarios, commits y documentación: **español**.

## Antes de tocar nada
1. Leer `docs/ARQUITECTURA.md` (qué es y cómo está organizado).
2. Leer `docs/CONTINUAR.md` (en qué quedó el trabajo y cuál es el siguiente paso).
3. Si vas a crear una estación, leer `src/stations/contrato.js` completo.

## Reglas
- El núcleo (`src/core`) nunca importa estaciones concretas; solo `src/stations/registro.js`.
- Una estación nueva = copiar `src/stations/_plantilla/`, no inventar otra forma.
- Todo debe funcionar sin conexión. Ningún `fetch` fuera de `src/core/backend/`.
- No agregar frameworks ni dependencias sin anotarlo en `docs/DECISIONES.md`.
- Correr `npm test` antes de cada commit. Si agregas lógica al núcleo, agrega su prueba.
- Al terminar una sesión de trabajo, actualizar `docs/CONTINUAR.md`.
- Avanzar un bloque a la vez y confirmar con el usuario antes del siguiente.

## Comandos
```
npm install        # primera vez
npm run dev        # servidor HTTPS local; abrir la URL de red desde el celular
npm test           # pruebas del núcleo y del contrato
npm run build      # genera dist/ para publicar (GitHub Pages / Netlify / Vercel)
```
