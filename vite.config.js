import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { copyFileSync, cpSync } from 'node:fs';

function copyRuntimeFiles() {
  return {
    name: 'copy-runtime-files',
    closeBundle() {
      const output = resolve(import.meta.dirname, 'dist');
      cpSync(resolve(import.meta.dirname, 'static'), resolve(output, 'static'), { recursive: true });
      copyFileSync(resolve(import.meta.dirname, 'robots.txt'), resolve(output, 'robots.txt'));
      copyFileSync(resolve(import.meta.dirname, 'sitemap.xml'), resolve(output, 'sitemap.xml'));
    }
  };
}

// Set VITE_BASE_PATH=/cryptoTracker/ for a GitHub Pages project deployment.
// Vercel uses the default root path.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [copyRuntimeFiles()],
  define: {
    'process.env.SUPERUSER_WALLET': JSON.stringify(process.env.SUPERUSER_WALLET || ''),
    'process.env.LITELLM_API_KEY': JSON.stringify(process.env.LITELLM_API_KEY || '')
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        dashboard: resolve(import.meta.dirname, 'dashboard.html')
      }
    }
  }
});
