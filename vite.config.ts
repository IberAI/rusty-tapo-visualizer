
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasmPack from 'vite-plugin-wasm-pack';
import { fileURLToPath } from 'url';
import path from 'path';

// Convert import.meta.url to __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    wasmPack('./src/wasm')
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
  publicDir: 'public',
  base: '/rusty-tapo-visualizer/', 
});

