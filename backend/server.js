// server.js (reloaded)
import http from 'http';
import app from './app.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '5000', 10);

// ─── Start HTTP server only after DB is open ───────────────────────────────────
mongoose.connection.once('open', () => {

  // Create raw http server so we can set SO_REUSEADDR before binding
  const server = http.createServer(app);
  let currentPort = PORT;

  const startServer = (port) => {
    server.listen({ port, host: '0.0.0.0', exclusive: false });
  };

  server.on('listening', () => {
    const boundAddress = server.address();
    const boundPort = typeof boundAddress === 'string' ? boundAddress : boundAddress.port;

    // Write dynamic port registry for reverse proxy sync
    try {
      const sharedPortPath = path.resolve(__dirname, '../shared_port.json');
      fs.writeFileSync(sharedPortPath, JSON.stringify({ port: boundPort }, null, 2));
      console.log(`💾 Dynamic port registry written to shared_port.json: ${boundPort}`);
    } catch (e) {
      console.warn('⚠️  Failed to write dynamic port registry:', e.message);
    }

    console.log('==================================================');
    console.log('  🚀 CRM Backend Server is active!');
    console.log(`  Port    : ${boundPort}`);
    console.log(`  URL     : http://localhost:${boundPort}`);
    console.log(`  Env     : ${process.env.NODE_ENV || 'development'}`);
    console.log('==================================================');
  });

  // ─── Handle port conflict (EADDRINUSE) ───────────────────────────────────────
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`\n⚠️  Port ${currentPort} is in use by another process.`);
      currentPort++;
      console.log(`🔄 Retrying binding on next port: ${currentPort}...`);
      startServer(currentPort);
    } else {
      console.error('❌ Server error:', err.message);
      process.exit(1);
    }
  });

  // ─── Graceful shutdown — Ctrl+C ──────────────────────────────────────────────
  const shutdown = (signal) => {
    console.log(`\n⏹  ${signal} — shutting down…`);

    // Clean up shared_port.json registry file on exit
    try {
      const sharedPortPath = path.resolve(__dirname, '../shared_port.json');
      if (fs.existsSync(sharedPortPath)) {
        fs.unlinkSync(sharedPortPath);
        console.log('🗑️  Cleaned up dynamic port registry file.');
      }
    } catch (e) {
      // Ignore
    }

    server.close(() => {
      console.log('✅ Server closed. Goodbye!');
      mongoose.connection.close(false, () => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  
  startServer(currentPort);
});

// ─── Global safety nets ────────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});