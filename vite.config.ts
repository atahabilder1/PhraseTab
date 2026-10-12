import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// WordTab builds three HTML entry points into `dist/`, which is the directory
// loaded as an unpacked Chrome extension. `public/` (manifest + icons) is
// copied verbatim, so `dist/manifest.json` sits next to the generated pages.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Off by default: sourcemaps roughly double the packaged extension size and
    // are only useful while debugging an unpacked build. `npm run build:debug`
    // turns them back on.
    sourcemap: process.env.WORDTAB_SOURCEMAP === '1',
    rollupOptions: {
      input: {
        newtab: fileURLToPath(new URL('./newtab.html', import.meta.url)),
        settings: fileURLToPath(new URL('./settings.html', import.meta.url)),
        saved: fileURLToPath(new URL('./saved.html', import.meta.url)),
      },
      output: {
        // Stable, unhashed entry names make the manifest paths predictable.
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
