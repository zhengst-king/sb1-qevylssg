// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { visualizer } from "file:///home/project/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import compression from "file:///home/project/node_modules/vite-plugin-compression/dist/index.mjs";
var vite_config_default = defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
      // Gzip compression for production
      mode === "production" && compression({
        algorithm: "gzip",
        ext: ".gz"
      }),
      // Brotli compression for production
      mode === "production" && compression({
        algorithm: "brotliCompress",
        ext: ".br"
      }),
      // Bundle analyzer (only in production build)
      mode === "production" && visualizer({
        open: false,
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true
      })
    ].filter(Boolean),
    // Build optimizations
    build: {
      // Target modern browsers for smaller bundle
      target: "esnext",
      // Enable minification
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: mode === "production",
          // Remove console.logs in production
          drop_debugger: mode === "production",
          pure_funcs: mode === "production" ? ["console.log", "console.info"] : []
        }
      },
      // Chunk splitting strategy
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // React core
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            // UI components
            "ui-vendor": ["lucide-react"],
            // Supabase
            "supabase-vendor": ["@supabase/supabase-js"],
            // Date handling
            "date-vendor": ["date-fns"]
          },
          // Naming strategy for better caching
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]"
        }
      },
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1e3,
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Source maps for production debugging (disable for smallest bundle)
      sourcemap: mode === "production" ? false : true
    },
    // Development server configuration
    server: {
      port: 5173,
      strictPort: true,
      host: true,
      hmr: {
        overlay: true
      }
    },
    // Preview server configuration
    preview: {
      port: 4173,
      strictPort: true,
      host: true
    },
    // Optimize deps
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@supabase/supabase-js"
      ]
    },
    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyB2aXN1YWxpemVyIH0gZnJvbSAncm9sbHVwLXBsdWdpbi12aXN1YWxpemVyJztcbmltcG9ydCBjb21wcmVzc2lvbiBmcm9tICd2aXRlLXBsdWdpbi1jb21wcmVzc2lvbic7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIHJldHVybiB7XG4gICAgcGx1Z2luczogW1xuICAgICAgcmVhY3QoKSxcbiAgICAgIFxuICAgICAgLy8gR3ppcCBjb21wcmVzc2lvbiBmb3IgcHJvZHVjdGlvblxuICAgICAgbW9kZSA9PT0gJ3Byb2R1Y3Rpb24nICYmIGNvbXByZXNzaW9uKHtcbiAgICAgICAgYWxnb3JpdGhtOiAnZ3ppcCcsXG4gICAgICAgIGV4dDogJy5neicsXG4gICAgICB9KSxcbiAgICAgIFxuICAgICAgLy8gQnJvdGxpIGNvbXByZXNzaW9uIGZvciBwcm9kdWN0aW9uXG4gICAgICBtb2RlID09PSAncHJvZHVjdGlvbicgJiYgY29tcHJlc3Npb24oe1xuICAgICAgICBhbGdvcml0aG06ICdicm90bGlDb21wcmVzcycsXG4gICAgICAgIGV4dDogJy5icicsXG4gICAgICB9KSxcbiAgICAgIFxuICAgICAgLy8gQnVuZGxlIGFuYWx5emVyIChvbmx5IGluIHByb2R1Y3Rpb24gYnVpbGQpXG4gICAgICBtb2RlID09PSAncHJvZHVjdGlvbicgJiYgdmlzdWFsaXplcih7XG4gICAgICAgIG9wZW46IGZhbHNlLFxuICAgICAgICBmaWxlbmFtZTogJ2Rpc3Qvc3RhdHMuaHRtbCcsXG4gICAgICAgIGd6aXBTaXplOiB0cnVlLFxuICAgICAgICBicm90bGlTaXplOiB0cnVlLFxuICAgICAgfSksXG4gICAgXS5maWx0ZXIoQm9vbGVhbiksXG4gICAgXG4gICAgLy8gQnVpbGQgb3B0aW1pemF0aW9uc1xuICAgIGJ1aWxkOiB7XG4gICAgICAvLyBUYXJnZXQgbW9kZXJuIGJyb3dzZXJzIGZvciBzbWFsbGVyIGJ1bmRsZVxuICAgICAgdGFyZ2V0OiAnZXNuZXh0JyxcbiAgICAgIFxuICAgICAgLy8gRW5hYmxlIG1pbmlmaWNhdGlvblxuICAgICAgbWluaWZ5OiAndGVyc2VyJyxcbiAgICAgIHRlcnNlck9wdGlvbnM6IHtcbiAgICAgICAgY29tcHJlc3M6IHtcbiAgICAgICAgICBkcm9wX2NvbnNvbGU6IG1vZGUgPT09ICdwcm9kdWN0aW9uJywgLy8gUmVtb3ZlIGNvbnNvbGUubG9ncyBpbiBwcm9kdWN0aW9uXG4gICAgICAgICAgZHJvcF9kZWJ1Z2dlcjogbW9kZSA9PT0gJ3Byb2R1Y3Rpb24nLFxuICAgICAgICAgIHB1cmVfZnVuY3M6IG1vZGUgPT09ICdwcm9kdWN0aW9uJyA/IFsnY29uc29sZS5sb2cnLCAnY29uc29sZS5pbmZvJ10gOiBbXSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBcbiAgICAgIC8vIENodW5rIHNwbGl0dGluZyBzdHJhdGVneVxuICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICAvLyBNYW51YWwgY2h1bmsgc3BsaXR0aW5nIGZvciBiZXR0ZXIgY2FjaGluZ1xuICAgICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgICAgLy8gUmVhY3QgY29yZVxuICAgICAgICAgICAgJ3JlYWN0LXZlbmRvcic6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nXSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVUkgY29tcG9uZW50c1xuICAgICAgICAgICAgJ3VpLXZlbmRvcic6IFsnbHVjaWRlLXJlYWN0J10sXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN1cGFiYXNlXG4gICAgICAgICAgICAnc3VwYWJhc2UtdmVuZG9yJzogWydAc3VwYWJhc2Uvc3VwYWJhc2UtanMnXSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRGF0ZSBoYW5kbGluZ1xuICAgICAgICAgICAgJ2RhdGUtdmVuZG9yJzogWydkYXRlLWZucyddLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgXG4gICAgICAgICAgLy8gTmFtaW5nIHN0cmF0ZWd5IGZvciBiZXR0ZXIgY2FjaGluZ1xuICAgICAgICAgIGNodW5rRmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uanMnLFxuICAgICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uanMnLFxuICAgICAgICAgIGFzc2V0RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uW2V4dF0nLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIFxuICAgICAgLy8gSW5jcmVhc2UgY2h1bmsgc2l6ZSB3YXJuaW5nIGxpbWl0XG4gICAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDAsXG4gICAgICBcbiAgICAgIC8vIEVuYWJsZSBDU1MgY29kZSBzcGxpdHRpbmdcbiAgICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSxcbiAgICAgIFxuICAgICAgLy8gU291cmNlIG1hcHMgZm9yIHByb2R1Y3Rpb24gZGVidWdnaW5nIChkaXNhYmxlIGZvciBzbWFsbGVzdCBidW5kbGUpXG4gICAgICBzb3VyY2VtYXA6IG1vZGUgPT09ICdwcm9kdWN0aW9uJyA/IGZhbHNlIDogdHJ1ZSxcbiAgICB9LFxuICAgIFxuICAgIC8vIERldmVsb3BtZW50IHNlcnZlciBjb25maWd1cmF0aW9uXG4gICAgc2VydmVyOiB7XG4gICAgICBwb3J0OiA1MTczLFxuICAgICAgc3RyaWN0UG9ydDogdHJ1ZSxcbiAgICAgIGhvc3Q6IHRydWUsXG4gICAgICBobXI6IHtcbiAgICAgICAgb3ZlcmxheTogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBcbiAgICAvLyBQcmV2aWV3IHNlcnZlciBjb25maWd1cmF0aW9uXG4gICAgcHJldmlldzoge1xuICAgICAgcG9ydDogNDE3MyxcbiAgICAgIHN0cmljdFBvcnQ6IHRydWUsXG4gICAgICBob3N0OiB0cnVlLFxuICAgIH0sXG4gICAgXG4gICAgLy8gT3B0aW1pemUgZGVwc1xuICAgIG9wdGltaXplRGVwczoge1xuICAgICAgaW5jbHVkZTogW1xuICAgICAgICAncmVhY3QnLFxuICAgICAgICAncmVhY3QtZG9tJyxcbiAgICAgICAgJ3JlYWN0LXJvdXRlci1kb20nLFxuICAgICAgICAnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJyxcbiAgICAgIF0sXG4gICAgfSxcbiAgICBcbiAgICAvLyBEZWZpbmUgZ2xvYmFsIGNvbnN0YW50c1xuICAgIGRlZmluZToge1xuICAgICAgX19BUFBfVkVSU0lPTl9fOiBKU09OLnN0cmluZ2lmeShwcm9jZXNzLmVudi5ucG1fcGFja2FnZV92ZXJzaW9uKSxcbiAgICB9LFxuICB9O1xufSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUF5TixTQUFTLG9CQUFvQjtBQUN0UCxPQUFPLFdBQVc7QUFDbEIsU0FBUyxrQkFBa0I7QUFDM0IsT0FBTyxpQkFBaUI7QUFHeEIsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDeEMsU0FBTztBQUFBLElBQ0wsU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBO0FBQUEsTUFHTixTQUFTLGdCQUFnQixZQUFZO0FBQUEsUUFDbkMsV0FBVztBQUFBLFFBQ1gsS0FBSztBQUFBLE1BQ1AsQ0FBQztBQUFBO0FBQUEsTUFHRCxTQUFTLGdCQUFnQixZQUFZO0FBQUEsUUFDbkMsV0FBVztBQUFBLFFBQ1gsS0FBSztBQUFBLE1BQ1AsQ0FBQztBQUFBO0FBQUEsTUFHRCxTQUFTLGdCQUFnQixXQUFXO0FBQUEsUUFDbEMsTUFBTTtBQUFBLFFBQ04sVUFBVTtBQUFBLFFBQ1YsVUFBVTtBQUFBLFFBQ1YsWUFBWTtBQUFBLE1BQ2QsQ0FBQztBQUFBLElBQ0gsRUFBRSxPQUFPLE9BQU87QUFBQTtBQUFBLElBR2hCLE9BQU87QUFBQTtBQUFBLE1BRUwsUUFBUTtBQUFBO0FBQUEsTUFHUixRQUFRO0FBQUEsTUFDUixlQUFlO0FBQUEsUUFDYixVQUFVO0FBQUEsVUFDUixjQUFjLFNBQVM7QUFBQTtBQUFBLFVBQ3ZCLGVBQWUsU0FBUztBQUFBLFVBQ3hCLFlBQVksU0FBUyxlQUFlLENBQUMsZUFBZSxjQUFjLElBQUksQ0FBQztBQUFBLFFBQ3pFO0FBQUEsTUFDRjtBQUFBO0FBQUEsTUFHQSxlQUFlO0FBQUEsUUFDYixRQUFRO0FBQUE7QUFBQSxVQUVOLGNBQWM7QUFBQTtBQUFBLFlBRVosZ0JBQWdCLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBO0FBQUEsWUFHekQsYUFBYSxDQUFDLGNBQWM7QUFBQTtBQUFBLFlBRzVCLG1CQUFtQixDQUFDLHVCQUF1QjtBQUFBO0FBQUEsWUFHM0MsZUFBZSxDQUFDLFVBQVU7QUFBQSxVQUM1QjtBQUFBO0FBQUEsVUFHQSxnQkFBZ0I7QUFBQSxVQUNoQixnQkFBZ0I7QUFBQSxVQUNoQixnQkFBZ0I7QUFBQSxRQUNsQjtBQUFBLE1BQ0Y7QUFBQTtBQUFBLE1BR0EsdUJBQXVCO0FBQUE7QUFBQSxNQUd2QixjQUFjO0FBQUE7QUFBQSxNQUdkLFdBQVcsU0FBUyxlQUFlLFFBQVE7QUFBQSxJQUM3QztBQUFBO0FBQUEsSUFHQSxRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixZQUFZO0FBQUEsTUFDWixNQUFNO0FBQUEsTUFDTixLQUFLO0FBQUEsUUFDSCxTQUFTO0FBQUEsTUFDWDtBQUFBLElBQ0Y7QUFBQTtBQUFBLElBR0EsU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sWUFBWTtBQUFBLE1BQ1osTUFBTTtBQUFBLElBQ1I7QUFBQTtBQUFBLElBR0EsY0FBYztBQUFBLE1BQ1osU0FBUztBQUFBLFFBQ1A7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBO0FBQUEsSUFHQSxRQUFRO0FBQUEsTUFDTixpQkFBaUIsS0FBSyxVQUFVLFFBQVEsSUFBSSxtQkFBbUI7QUFBQSxJQUNqRTtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
