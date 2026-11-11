import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // The source images in src/assets are imported by editor.js and bundled by Vite.
  // Disable Vite's public copy because output already lives inside public/assets.
  publicDir: false,
  build: {
    outDir: 'public/assets',
    emptyOutDir: true,
    rollupOptions: {
      input: { editor: 'src/editor.js', simulator: 'src/simulator.js', recorrer: 'src/recorrer.js' },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => assetInfo.name?.endsWith('.css')
          ? 'editor.css'
          : 'library/[name]-[hash][extname]'
      }
    }
  }
});
