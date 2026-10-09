import { defineConfig } from 'vite';

// El juego se publica en https://<usuario>.github.io/Empires-War/ (no en la raíz del dominio).
export const BASE_PATH = '/Empires-War/';

export default defineConfig({
  base: BASE_PATH,
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
  define: {
    __BUILD_ID__: JSON.stringify((process.env.GITHUB_SHA ?? 'local').slice(0, 7)),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    target: 'es2022',
    // Phaser ocupa ~1 MB; se separa en su propio archivo para que el navegador lo guarde en caché.
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
});
