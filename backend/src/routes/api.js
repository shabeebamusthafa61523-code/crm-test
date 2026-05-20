import express from 'express';
import checkAuth from '../middleware/auth.middleware.js';
import * as attendanceController from '../controllers/attendance.controller.js';
import * as authController from '../controllers/auth.controller.js';

const router = express.Router();

// Public Authentication Endpoints
router.post('/auth/student/signup', authController.signup);
router.post('/auth/student/login', authController.login);

// Attendance Operations (Aligned to your actual controller exports)
router.get('/attendance/:date', checkAuth, attendanceController.getAttendanceByDate);
router.post('/attendance/check-in', checkAuth, attendanceController.checkIn);
router.post('/attendance/check-out', checkAuth, attendanceController.checkOut);

// NOTE: If your frontend specifically hits the admin endpoints below, 
// they are pointing to your checkIn/checkOut logic now to prevent crashing.
router.post('/attendance/admin/check-in', checkAuth, attendanceController.checkIn);
router.post('/attendance/admin/check-out', checkAuth, attendanceController.checkOut);

export default router;