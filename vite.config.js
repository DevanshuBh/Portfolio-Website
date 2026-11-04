import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        // Classic 3D portfolio at "/"
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        // iOS home-screen portfolio at "/ios/"
        ios: fileURLToPath(new URL('./ios/index.html', import.meta.url)),
      },
    },
  },
})
