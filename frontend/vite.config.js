import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const targetUrl = process.env.APP_URL || 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: targetUrl,
        changeOrigin: true,
      },
      '/static': {
        target: targetUrl,
        changeOrigin: true,
      }
    }
  }
})
