import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.svg',
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'illustrations/*.svg',
        ],
        manifest: {
          name: 'HANU HSK — Học tiếng Trung chuẩn HSK 3.0',
          short_name: 'HANU HSK',
          description:
            'Nền tảng học tiếng Trung HSK 1–9, luyện viết chữ Hán ô Mễ Tự Cách, ôn tập Flashcard SRS ngoại tuyến và quản lý lớp học.',
          theme_color: '#F5F6F8',
          background_color: '#F5F6F8',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/hoc',
          lang: 'vi',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/hanzi-data\//],
          runtimeCaching: [
            {
              // Never cache authenticated or private API endpoints in Service Worker CacheStorage.
              // (Workbox tests a RegExp against the full URL, so match on pathname.)
              urlPattern: ({ url }) =>
                url.origin === self.location.origin &&
                /^\/api\/(?!hanzi\/char\/)/i.test(url.pathname),
              handler: 'NetworkOnly',
            },
            {
              // Stroke data: same-origin route, or the jsDelivr copy used on static hosting
              urlPattern: ({ url }) =>
                (url.origin === self.location.origin &&
                  /^\/(hanzi-data\/.+\.json|api\/hanzi\/char\/.+)$/i.test(url.pathname)) ||
                (url.hostname === 'cdn.jsdelivr.net' &&
                  url.pathname.startsWith('/npm/hanzi-writer-data@')),
              handler: 'CacheFirst',
              options: {
                cacheName: 'hanzi-stroke-data-cache',
                expiration: {
                  maxEntries: 1500,
                  maxAgeSeconds: 60 * 60 * 24 * 90,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: ({ url }) =>
                url.origin === self.location.origin && /^\/illustrations\/.+\.svg$/i.test(url.pathname),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'vocab-illustrations-cache',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 60,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-router',
        'react-router-dom',
        'lucide-react',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'firebase/app-check',
      ],
    },
    build: {
      sourcemap: false,
      rolldownOptions: {
        output: {
          manualChunks(moduleId) {
            if (moduleId.includes('node_modules')) {
              if (
                moduleId.includes('@firebase/firestore') ||
                moduleId.includes('firebase/firestore')
              ) {
                return 'vendor-firebase-firestore';
              }
              if (
                moduleId.includes('firebase') ||
                moduleId.includes('@firebase')
              ) {
                return 'vendor-firebase-core';
              }
              if (moduleId.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (moduleId.includes('react-router')) {
                return 'vendor-router';
              }
              if (
                moduleId.includes('react-dom') ||
                moduleId.includes('/react/') ||
                moduleId.includes('scheduler')
              ) {
                return 'vendor-react';
              }
              return 'vendor-misc';
            }
            if (moduleId.includes('/src/data/chineseData')) {
              return 'hsk-vocab-data';
            }
            if (
              moduleId.includes('/src/utils/chineseEngine') ||
              moduleId.includes('/src/utils/hsk3Engine') ||
              moduleId.includes('/src/utils/hskStudyHelpers')
            ) {
              return 'hsk-engine';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
