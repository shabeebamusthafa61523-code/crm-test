import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'https://crm-test-yy77.onrender.com/api', // Points directly to your Express backend server
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
