import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'Carnet du Marin Stoïcien',
        short_name: 'Marin Stoïcien',
        description: 'Journal de bord stoïcien pour marins',
        theme_color: '#0B1A2E',
        background_color: '#0B1A2E',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/vite.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,svg}']
      },
      devOptions: {
        enabled: true,  // Active la PWA en développement
        type: 'module'
      }
    })
  ]
})