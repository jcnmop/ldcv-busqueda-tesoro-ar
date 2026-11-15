import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

// La cámara del celular solo funciona en HTTPS (o localhost).
// mkcert genera un certificado local para probar desde el teléfono en la misma red Wi-Fi.
export default defineConfig({
  plugins: [mkcert()],
  server: {
    https: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
});
