import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
      
      // Gzip compression for production
      mode === 'production' && compression({
        algorithm: 'gzip',
        ext: '.gz',
      }),
      
      // Brotli compression for production
      mode === 'production' && compression({
        algorithm: 'brotliCompress',
        ext: '.br',
      }),
      
      // Bundle analyzer (only in production build)
      mode === 'production' && visualizer({
        open: false,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
    ].filter(Boolean),
    
    // Build optimizations
    build: {
      // Target modern browsers for smaller bundle
      target: 'esnext',
      
      // Enable minification
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production', // Remove console.logs in production
          drop_debugger: mode === 'production',
          pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : [],
        },
      },
      
      // Chunk splitting strategy
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // React core
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            
            // UI components
            'ui-vendor': ['lucide-react'],
            
            // Supabase
            'supabase-vendor': ['@supabase/supabase-js'],
            
            // Date handling
            'date-vendor': ['date-fns'],
          },
          
          // Naming strategy for better caching
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000,
      
      // Enable CSS code splitting
      cssCodeSplit: true,
      
      // Source maps for production debugging (disable for smallest bundle)
      sourcemap: mode === 'production' ? false : true,
    },
    
    // Development server configuration
    server: {
      port: 5173,
      strictPort: true,
      host: true,
      hmr: {
        overlay: true,
      },
    },
    
    // Preview server configuration
    preview: {
      port: 4173,
      strictPort: true,
      host: true,
    },
    
    // Optimize deps
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
      ],
    },
    
    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    },
  };
});