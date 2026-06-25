// server.js
import app from './app.js';
import mongoose from 'mongoose';

const PORT = process.env.PORT || 5000;

// ─── Start HTTP server only after DB is open ──────────────────────────────────
mongoose.connection.once('open', () => {
  const server = app.listen(PORT, () => {
    console.log('==================================================');
    console.log('  🚀 CRM Backend Server is active!');
    console.log(`  Port    : ${PORT}`);
    console.log(`  Env     : ${process.env.NODE_ENV || 'development'}`);
    console.log('==================================================');
  });

  // ─── Handle port conflict (EADDRINUSE) ─────────────────────────────────────
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error('\n❌ ERROR: Port ' + PORT + ' is already in use!');
      console.error('━'.repeat(52));
      console.error('💡 Fix it with one of these options:\n');
      console.error('  1️⃣  Kill the blocking process (PowerShell Admin):');
      console.error('     netstat -ano | findstr :' + PORT);
      console.error('     taskkill /PID <PID> /F\n');
      console.error('  2️⃣  Use a different port:');
      console.error('     $env:PORT=' + (PORT + 1) + '; npm run dev\n');
      console.error('  3️⃣  Wait 30 s and retry — Windows may still be releasing the port.');
      console.error('━'.repeat(52));
    } else {
      console.error('❌ Server error:', err.message);
    }
    process.exit(1);
  });

  // ─── Graceful shutdown — Ctrl+C ────────────────────────────────────────────
  const shutdown = (signal) => {
    console.log(`\n⏹  ${signal} received — shutting down gracefully…`);
    server.close(() => {
      console.log('✅ HTTP server closed.');
      mongoose.connection.close(false, () => {
        console.log('✅ MongoDB connection closed.');
        console.log('👋 Goodbye!');
        process.exit(0);
      });
    });

    // Force-exit after 10 s if shutdown hangs
    setTimeout(() => {
      console.error('❌ Forced exit (shutdown timeout).');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
});

// ─── Global safety nets ───────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  process.exit(1);
});