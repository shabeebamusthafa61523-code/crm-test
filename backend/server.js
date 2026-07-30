// server.js
import app from './app.js';
import mongoose from 'mongoose';

const PORT = process.env.PORT || 5000;

process.on('uncaughtException', (err) => {
  console.error('🚨 Non-fatal Uncaught Exception:', err.message, err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('🚨 Non-fatal Unhandled Promise Rejection:', reason);
});

// Listen only when database connection establishes successfully
mongoose.connection.once('open', () => {
  app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`  🚀 Student Attendance Engine is active!`);
    console.log(`  Port: ${PORT}`);
    console.log(`==================================================`);
  });
});
