import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Proyecto independiente. No comparte codigo ni configuracion con el resto del
// repositorio.
//
// El service worker no es un adorno: los voluntarios trabajan en veredas sin
// senal. Sin precache, abrir la app estando sin datos no carga nada. Con el,
// basta con haberla abierto una vez conectado.
export default defineConfig({
  base: './',
  server: { port: 5180 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Casa Firme — Evaluación post-sismo',
        short_name: 'Casa Firme',
        description: 'Evaluación post-sismo de viviendas y plan guiado de reparación',
        lang: 'es-CO',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f6f5f1',
        theme_color: '#0f766e',
        icons: [
          { src: './favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: './icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: './icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: './icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
