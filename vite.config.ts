import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || 'https://kkoeclshogsufckkpqjj.supabase.co';
    const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
    return {
      server: {
        port: 3000,
        host: '127.0.0.1',
        strictPort: false,
        proxy: supabaseAnonKey ? {
          '/api/sync-notion': {
            target: supabaseUrl,
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/sync-notion/, '/functions/v1/sync-notion'),
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                proxyReq.setHeader('Authorization', `Bearer ${supabaseAnonKey}`);
              });
            },
          },
        } : undefined,
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
      }
    };
});
