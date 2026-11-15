import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';

/**
 * Three.js y MindAR se cargan desde CDN mediante el <script type="importmap"> de
 * index.html (ver docs/DECISIONES.md). Vite debe dejar esos imports tal cual:
 * no intentar resolverlos ni empaquetarlos.
 */
const EXTERNOS = ['three', 'mindar-image-three'];
const esExterno = (id) => EXTERNOS.includes(id) || id.startsWith('three/');

function externosPorImportmap() {
  return {
    name: 'externos-por-importmap',
    enforce: 'pre',
    resolveId(id) {
      if (esExterno(id)) return { id, external: true };
      return null;
    },
  };
}

export default defineConfig({
  plugins: [externosPorImportmap(), mkcert()],
  server: {
    https: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    rollupOptions: {
      external: esExterno,
      input: {
        main: 'index.html',
        tablero: 'tablero.html',
      },
    },
  },
});
