import { defineConfig } from 'vite'

export default defineConfig(({ command, mode }) => {
  // GitHub Pages uses /<repository-name>/ as base URL
  // Set this to your repository name, or leave as './' for relative paths
  const base = mode === 'production' ? '/proc-grapher/' : '/'
  
  return {
    base,
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        }
      }
    },
    build: {
      outDir: 'dist',
      // Generate relative paths for assets
      assetsDir: 'assets',
      // Optimize for production
      minify: 'esbuild',
      // Generate source maps for debugging
      sourcemap: true,
      rollupOptions: {
        output: {
          // Optimize chunk splitting
          manualChunks: {
            vendor: ['chart.js', 'chartjs-adapter-date-fns']
          }
        }
      }
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ['chart.js', 'chartjs-adapter-date-fns', 'date-fns']
    }
  }
}) 