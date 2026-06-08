import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'
import { normalizeEventApiBaseUrl } from './src/event-server/config'

/** CI / .env の誤設定（`https://アカウント.workers.dev` のみ）をビルド前に補正 */
function applyNormalizedEventApiUrl(): void {
  const raw = process.env.VITE_EVENT_API_URL
  if (!raw?.trim()) return
  const normalized = normalizeEventApiBaseUrl(raw)
  if (normalized && normalized !== raw.trim().replace(/^["']|["']$/g, '').replace(/\/$/, '')) {
    process.env.VITE_EVENT_API_URL = normalized
    console.log('[vite] VITE_EVENT_API_URL を Worker 名付き URL に補正しました')
  }
}

applyNormalizedEventApiUrl()

export default defineConfig({
  base: '/costume-coordinator/',
  plugins: [
    {
      name: 'inject-google-site-verification',
      transformIndexHtml(html) {
        const token = process.env.VITE_GOOGLE_SITE_VERIFICATION?.trim()
        if (!token) return html
        return html.replace(
          '</head>',
          `    <meta name="google-site-verification" content="${token}" />\n  </head>`,
        )
      },
    },
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      scope: '/costume-coordinator/',
      filename: 'sw.js',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Costume Coordinator',
        short_name: 'Costume Coord',
        description: 'Smart costume selection for group events',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/costume-coordinator/',
        start_url: '/costume-coordinator/',
        icons: [
          {
            src: '/costume-coordinator/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/costume-coordinator/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/costume-coordinator/icon-192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/costume-coordinator/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: '/costume-coordinator/screenshot-1.png',
            sizes: '540x720',
            type: 'image/png',
            form_factor: 'narrow'
          },
          {
            src: '/costume-coordinator/screenshot-2.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@shared': path.resolve(__dirname, './shared')
    }
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'router': ['react-router-dom']
        }
      }
    }
  }
})
