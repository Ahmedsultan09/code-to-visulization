import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // php-parser lexer/numbers.js uses process.arch (Node-only) to pick 32- vs 64-bit long limits.
  define: {
    'process.arch': JSON.stringify('x64'),
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        'process.arch': JSON.stringify('x64'),
      },
    },
  },
  resolve: {
    alias: {
      // package.json "browser" points at dist/php-parser.js, which uses process.arch (Node-only).
      // Bundle from src so the app runs in the browser without a process polyfill.
      'php-parser': path.resolve(__dirname, 'node_modules/php-parser/src/index.js'),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
