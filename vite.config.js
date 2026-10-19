import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// En desarrollo /api se redirige al backend local (backend/, puerto 3000).
// En producción el frontend usa VITE_API_URL (ver .env.example).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
