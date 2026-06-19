import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envPrefix: ['VITE_'],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // Proxy Supabase auth requests to avoid CORS during local development
  server: {
    proxy: {
      '/auth/v1': {
        target: process.env.VITE_SUPABASE_URL,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
