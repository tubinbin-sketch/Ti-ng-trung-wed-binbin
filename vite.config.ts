import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
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
        'react-router-dom',
        'lucide-react',
      ],
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                debugName: 'hanu-bundle-split',
                name(moduleId) {
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
                    if (
                      moduleId.includes('react-dom') ||
                      moduleId.includes('react-router') ||
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
                  return null;
                },
              },
            ],
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
