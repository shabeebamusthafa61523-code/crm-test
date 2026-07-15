import express from 'express';
import checkAuth from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/auth.middleware.js';
import * as attendanceController from '../controllers/attendance.controller.js';
import * as authController from '../controllers/auth.controller.js';

const router = express.Router();

// ==========================================
// Public Authentication Endpoints
// ==========================================
router.post('/auth/student/signup', authController.signup);
router.post('/auth/student/login', authController.login);

// ==========================================
// Attendance Operations 
// ==========================================
// 🚨 CRITICAL ORDER FIX: Move the parameterized wildcard (/:date) below explicit routes
// to prevent Express from treating "check-in" or "check-out" as a date string!
router.post('/attendance/check-in', checkAuth, attendanceController.checkIn);
router.post('/attendance/check-out', checkAuth, attendanceController.checkOut);
router.get('/attendance/:date', checkAuth, attendanceController.getAttendanceByDate);

// ==========================================
// Admin Fallback Endpoints
// ==========================================
router.post('/attendance/admin/check-in', checkAuth, attendanceController.checkIn);
router.post('/attendance/admin/check-out', checkAuth, attendanceController.checkOut);

// Mark absent — Admin/HR/Manager
router.post(
  '/attendance/admin/mark-absent',
  checkAuth,
  requireRole(['admin', 'manager', 'hr']),
  attendanceController.markAbsent
);

export default router;
