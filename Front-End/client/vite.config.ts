import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import { themeRoute } from './theme-store.ts'

// https://vite.dev/config/
export default defineConfig({
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
