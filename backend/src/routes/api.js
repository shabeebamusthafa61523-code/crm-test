import express from 'express';
import checkAuth from '../middleware/auth.middleware.js';
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

// 🚨 THE CRITICAL CRASH FIX: 
// Temporarily stubbing 'markAbsent' using an inline handler since it isn't exported 
// in your attendanceController. This keeps the route active without crashing the engine.
router.post('/attendance/admin/mark-absent', checkAuth, (req, res) => {
  return res.status(501).json({ 
    detail: "The administrative mark-absent feature has not been initialized in the controller yet." 
  });
});

export default router;
