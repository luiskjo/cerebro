import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proyecto independiente. No comparte codigo ni configuracion con el resto del repositorio.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5180 },
})
