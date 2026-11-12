import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import { themeRoute } from './server/theme-store.js'
import { pdfRoute } from './server/document-pdf.js'
import { offlineBuild } from './server/offline-build.js'
import { resolve } from 'node:path'
// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@hamtry/library': resolve(import.meta.dirname, 'src/library/index.js'),
    },
  },
  server: { proxy: { '/api/v1': 'http://127.0.0.1:8787', '/api/auth': 'http://127.0.0.1:8787', '/api/liveness': 'http://127.0.0.1:8787' } },
  worker: { format: 'es' },
  build: {
    rolldownOptions: {
      input: {
        app: resolve(import.meta.dirname, 'index.html'),
        explore: resolve(import.meta.dirname, 'explore.html'),
        components: resolve(import.meta.dirname, 'components.html'),
        editor: resolve(import.meta.dirname, 'editor.html'),
      },
    },
  },
  plugins: [
    offlineBuild(),
    {
      name: 'hamtry-shared-theme',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (pdfRoute(req, res)) return
          void themeRoute(req, res).then((handled) => {
            if (!handled) next()
          })
        })
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          if (pdfRoute(req, res)) return
          void themeRoute(req, res).then((handled) => {
            if (!handled) next()
          })
        })
      },
    },
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
})
