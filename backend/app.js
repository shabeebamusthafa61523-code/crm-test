// app.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './src/routes/auth.routes.js';
import attendanceRoutes from './src/routes/attendance.routes.js';
import apiRoutes from './src/routes/api.js'; 

import apiRoutes from './src/routes/api.js';
import crmRoutes from './src/routes/index.js';
import taskRoutes from './src/routes/task.routes.js';


dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Mount dedicated routers
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes); // Handles check-in, check-out, and dates cleanly

// 2. Legacy/Catch-all router fallback
app.use('/api', apiRoutes); 


// CRM routes: auth, users, tasks, attendance, approvals
app.use('/api/v1', crmRoutes);
app.use('/api/v1/tasks', taskRoutes);
// Database connection

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/student_attendance_db';

// app.js - Database Connection Section
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log(' ✅ Successfully connected to MongoDB.');
  })
  .catch((error) => {
    console.error(' ❌ CRITICAL DATABASE CONNECTION ERROR:', error.message);
    process.exit(1); // Stop the server entirely if the DB is missing!
  });
export default app;
