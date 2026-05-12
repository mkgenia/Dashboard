import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/ovc-api': {
        target: 'https://ovc.catastro.meh.es',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ovc-api/, ''),
      },
      '/evo-api': {
        target: 'https://test-evolution-api.pzkz6e.easypanel.host',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/evo-api/, '')
      }
    }
  }
})
