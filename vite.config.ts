import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  // 'base: ./' permite que funcione tanto en Firebase como en subcarpetas de GitHub Pages
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true,
  },
});