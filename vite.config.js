import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // En desarrollo, las llamadas a /api van al backend (npm run dev en backend/).
    // Así el frontend y la API comparten origen y la cookie de sesión funciona sin CORS.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  // Pruebas (npm test): reglas compartidas y lógica del frontend, sin navegador
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}', 'shared/**/*.test.js'],
  },
})
