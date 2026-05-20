import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // This creates a virtual bridge to bypass CORS
      '/api': {
        target: 'http://localhost:6379', // ✅ Changed from Render URL to your local backend
        changeOrigin: true,
        secure: false, // Useful if the target has certificate issues
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})