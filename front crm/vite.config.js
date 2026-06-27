// vite.config.js (reloaded)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read dynamic backend port if available
let backendPort = 5000;
try {
  const sharedPortPath = path.resolve(__dirname, '../shared_port.json');
  if (fs.existsSync(sharedPortPath)) {
    const rawData = fs.readFileSync(sharedPortPath, 'utf8');
    const data = JSON.parse(rawData);
    if (data.port) {
      backendPort = data.port;
    }
  }
} catch (e) {
  // Fallback to 5000
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: 'localhost',
    port: 5173,
    hmr: {
      host: 'localhost',
      protocol: 'ws',
    },
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${backendPort}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
