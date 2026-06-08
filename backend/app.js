import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Route Imports
import authRoutes from './src/routes/auth.routes.js';
import userRoutes from './src/routes/user.routes.js';
import attendanceRoutes from './src/routes/attendance.routes.js';
import taskRoutes from './src/routes/task.routes.js';
import studentRoutes from './src/routes/student.routes.js';
import crmRoutes from './src/routes/index.js';
import apiRoutes from './src/routes/api.js';

dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['https://crm-test.vercel.app', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    // Support wildcard '*' in ALLOWED_ORIGINS env
    if (allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Dynamically allow common hosting platforms (Vercel, Netlify, Render) and localhost variants
    const isAllowedDynamic =
      /\.vercel\.app$/.test(origin) ||
      /\.netlify\.app$/.test(origin) ||
      /\.onrender\.com$/.test(origin) ||
      /^http:\/\/localhost(:\d+)?$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);

    if (isAllowedDynamic) {
      return callback(null, true);
    }

    console.log(`❌ Blocked CORS request from: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.options('*', cors());

// 2. Parsers Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Specific/Dedicated API Routers
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes); 
app.use('/api/user', userRoutes); 
app.use('/api/tasks', taskRoutes);

// 4. Broad, Versioned, & Catch-all Fallbacks (Broadest matching paths go lower)
app.use('/api/v1', crmRoutes);
app.use('/api', studentRoutes); 
app.use('/api', apiRoutes);      // Legacy base fallback route handler

// 5. Global 404 Route Catch-All
// Prevents missing endpoints from crashing headers or responding with standard Express HTML
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route Not Found: ${req.method} ${req.originalUrl}`
  });
});

// 6. Global 500 Error Catch-All
// Intercepts unhandled synchronous crashes, preserving correct headers and standard JSON feedback
app.use((err, req, res, next) => {
  console.error('🚨 Global Server Exception Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error Fallback'
  });
});

// 7. Database Connection Section
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/student_attendance_db';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log(' ✅ Successfully connected to MongoDB.');
  })
  .catch((error) => {
    console.error(' ❌ CRITICAL DATABASE CONNECTION ERROR:', error.message);
    process.exit(1); 
  });

export default app;