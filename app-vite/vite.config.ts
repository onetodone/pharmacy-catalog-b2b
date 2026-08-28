import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '')
  const apiProxyTarget = env.VITE_DEV_API_PROXY || 'http://localhost:3300'

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, './src') },
    },
    server: {
      port: 4300,
      proxy: {
        '/api': { target: apiProxyTarget, changeOrigin: true },
        '/uploads': { target: apiProxyTarget, changeOrigin: true },
      },
      host: true,
    },
  }
})
