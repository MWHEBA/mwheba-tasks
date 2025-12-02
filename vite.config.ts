import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    // Base path - change this if deploying to a subdirectory
    // Example: base: '/tasks/' if your app is at yourdomain.com/tasks/
    base: '/',
    
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    
    plugins: [react()],
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    
    build: {
      // Output directory - Requirements 7.5
      outDir: 'dist',
      assetsDir: 'assets',
      
      // Source maps only in development - Requirements 7.3
      sourcemap: !isProduction,
      
      // Minification enabled for production - Requirements 7.1
      minify: isProduction ? 'esbuild' : false,
      
      // Chunk size warning limit
      chunkSizeWarningLimit: 600,
      
      // Rollup options for code splitting - Requirements 7.4
      rollupOptions: {
        output: {
          // Manual chunks for vendor code splitting - Requirements 7.4
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'router': ['react-router-dom'],
            'framer-motion': ['framer-motion'],
          },
          
          // Asset file naming for better caching
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.');
            const ext = info?.[info.length - 1];
            
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
              return `assets/images/[name]-[hash][extname]`;
            } else if (/woff2?|ttf|otf|eot/i.test(ext || '')) {
              return `assets/fonts/[name]-[hash][extname]`;
            }
            
            return `assets/[name]-[hash][extname]`;
          },
          
          // Chunk file naming
          chunkFileNames: 'assets/js/[name]-[hash].js',
          
          // Entry file naming
          entryFileNames: 'assets/js/[name]-[hash].js',
        }
      },
      
      // Target modern browsers for better optimization
      target: 'es2015',
      
      // CSS code splitting
      cssCodeSplit: true,
      
      // Report compressed size
      reportCompressedSize: isProduction,
      
      // Optimize dependencies
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
      },
    },
    
    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
    },
  };
});
