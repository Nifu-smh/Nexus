import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@/components/ui': path.resolve(import.meta.dirname, './src/components/ui'),
        '@/lib': path.resolve(import.meta.dirname, './src/lib'),
        '@/utils': path.resolve(import.meta.dirname, './src/utils'),
        '@/components': path.resolve(import.meta.dirname, './src/components'),
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      port: 4444,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
