# Publicar la app (GitHub Pages)

La cámara solo funciona en **HTTPS**. GitHub Pages lo da gratis y con el repositorio
ya en GitHub, publicar es un flujo automático.

## Configuración única

1. En el repositorio: **Settings → Pages → Source: GitHub Actions**.
2. El flujo `.github/workflows/publicar.yml` (ya incluido) construye y publica en cada
   push a `main`.
3. La URL queda como `https://<usuario>.github.io/<repo>/`. Como no es la raíz del
   dominio, el flujo pasa `--base=/<repo>/` a Vite automáticamente.

## Secretos (solo si se usa Supabase)

Settings → Secrets and variables → Actions → New repository secret:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_CLAVE_EVENTO`, y la variable
`VITE_BACKEND=supabase`. El flujo las inyecta en el build.

## Generar el QR de inicio

```bash
npm run qr -- https://<usuario>.github.io/<repo>/
```
Imprimir `public/qr-inicio.png` para el cartel de la mesa.

## Probar en celular antes de publicar

```bash
npm run dev
```
Vite imprime una URL de red (`https://192.168.x.x:5173`). Abrirla en el celular en la
misma Wi-Fi y aceptar el certificado local. En iPhone, Safari pedirá confirmar el
certificado la primera vez.

## Alternativas

Netlify o Vercel también sirven (arrastrar la carpeta `dist/`). Cualquier hosting
estático con HTTPS funciona: la app no tiene servidor propio.
