import app from './app.js'; 
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;
import mongoose from 'mongoose';

// Load variables from your .env file

// Connect directly to Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("📡 MongoDB Atlas Connected Successfully!"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));
const server = app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  Student Attendance Engine is running smoothly!`);
  console.log(`  Port: ${PORT}`);
  console.log(`==================================================`);
});

process.on('unhandledRejection', (err) => {
  console.error(`Logged Critical Error: ${err.message}`);
  server.close(() => process.exit(1));
});