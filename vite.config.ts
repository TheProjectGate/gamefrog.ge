import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // Vite is now integrated into Express server, so no separate server needed
    // This config is used when Vite middleware is initialized in Express
    return {
      // No server config needed - Express handles the server
      // Middleware mode for integration with Express
      plugins: [tailwindcss(), react()],
      base: './', // Required for Capacitor to work correctly
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
        outDir: 'dist',
        assetsDir: 'assets',
        // Ensure proper paths for Capacitor
        rollupOptions: {
          output: {
            assetFileNames: 'assets/[name].[ext]',
            chunkFileNames: 'assets/[name]-[hash].js',
            entryFileNames: 'assets/[name]-[hash].js',
            manualChunks: {
              'vendor-react': ['react', 'react-dom'],
              'vendor-icons': ['lucide-react'],
              'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
              'vendor-state': ['zustand']
            }
          }
        },
        chunkSizeWarningLimit: 1200
      }
    };
});
