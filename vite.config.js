import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        // iOS-style portfolio at "/"
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        // Previous 3D portfolio, kept at "/classic/" (not linked from the site)
        classic: fileURLToPath(new URL('./classic/index.html', import.meta.url)),
      },
    },
  },
})
