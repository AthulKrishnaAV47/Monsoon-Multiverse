import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts')) {
            return 'vendor-charts';
          }
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
            return 'vendor-leaflet';
          }
          if (id.includes('node_modules/lucide-react') || id.includes('node_modules/axios')) {
            return 'vendor-icons';
          }
        }
      }
    },
    chunkSizeWarningLimit: 600
  },
  server: {
    port: 3000,
    open: false
  }
})
