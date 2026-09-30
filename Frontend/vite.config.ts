import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:3000'
  const devPort = Number(env.VITE_PORT) || 5173
  const apiPrefix = env.VITE_API_BASE_URL || '/api'

  return {
    plugins: [vue()],
    server: {
      port: devPort,
      proxy: {
        [apiPrefix]: {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  }
})
