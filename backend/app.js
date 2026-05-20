import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './src/routes/api.js';
import crmRoutes from './src/routes/index.js';

dotenv.config();
const app = express();

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers so the server can read incoming JSON data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Legacy attendance/student routes
app.use('/api', apiRoutes);

// CRM routes: auth, users, tasks, attendance, approvals
// CRM routes: auth, users, tasks, attendance, approvals
app.use('/api/v1', crmRoutes);
// Database connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/student_attendance_db';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB.'))
  .catch((error) => console.error('Database connection failed:', error));

export default app;