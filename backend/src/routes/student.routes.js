import { Router } from 'express';
import checkAuth from '../middleware/auth.middleware.js';
import * as attendanceController from '../controllers/attendance.controller.js';

const router = Router();

// Public Access Endpoints
router.post('/auth/student/signup', attendanceController.studentSignup);

// Authenticated/Administrative Routes
router.get('/student/list', checkAuth, attendanceController.getStudentList);
router.get('/attendance/:date', checkAuth, attendanceController.getAttendanceByDate);
router.post('/attendance/admin/check-in', checkAuth, attendanceController.markPresent);
router.post('/attendance/admin/mark-absent', checkAuth, attendanceController.markAbsent);
router.post('/attendance/admin/check-out', checkAuth, attendanceController.checkOut);

export default router;