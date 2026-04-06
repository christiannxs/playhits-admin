import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '127.0.0.1',
        strictPort: false,
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
                return 'react-vendor';
              }
              if (id.includes('node_modules/@supabase/')) {
                return 'supabase';
              }
              if (id.includes('node_modules/recharts')) {
                return 'recharts';
              }
              if (
                id.includes('node_modules/jspdf') ||
                id.includes('node_modules/html2canvas') ||
                id.includes('node_modules/canvg')
              ) {
                return 'pdf-export';
              }
            },
          },
        },
      },
    };
});
