import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import { themeRoute } from './server/theme-store.js'
import { resolve } from 'node:path'
// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@hamtry/library': resolve(import.meta.dirname, 'src/library/index.js'),
    },
  },
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
    {
      name: 'hamtry-shared-theme',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          void themeRoute(req, res).then((handled) => {
            if (!handled) next()
          })
        })
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
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
