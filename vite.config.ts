import { defineConfig } from 'vite';

export default defineConfig({
  // względne ścieżki: build działa z dowolnego podkatalogu (np. /graj/)
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
});
