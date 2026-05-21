// server.js
import app from './app.js';
import mongoose from 'mongoose';

const PORT = process.env.PORT || 5000;

// Listen only when database connection establishes successfully
mongoose.connection.once('open', () => {
  app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`  🚀 Student Attendance Engine is active!`);
    console.log(`  Port: ${PORT}`);
    console.log(`==================================================`);
  });
});