import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  // Относительные пути в сборке: dist можно открыть/задеплоить из любой подпапки.
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    // Ассеты игры (спрайты, атласы) не инлайним в JS — так их проще кешировать и отлаживать.
    assetsInlineLimit: 0,
    // Phaser — один большой вендорный бандл (~1.3 МБ), это ожидаемо для движка.
    chunkSizeWarningLimit: 1600,
  },
});
