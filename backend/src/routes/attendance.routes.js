import { Router } from 'express';
import { getAttendanceByDate, checkIn, checkOut } from '../controllers/attendance.controller.js';
import authenticate from '../middleware/auth.middleware.js';

const router = Router();

// Secure all attendance tracking actions behind authorization tokens
router.get('/:date', authenticate, getAttendanceByDate);
router.post('/check-in', authenticate, checkIn);
router.post('/check-out', authenticate, checkOut);

export default router;