// src/routes/attendance.routes.js
import { Router } from 'express';
import protectRoute from '../middleware/auth.middleware.js'; 
import { checkIn, checkOut, getAttendanceByDate } from '../controllers/attendance.controller.js';

const router = Router();

// Secure all endpoints below this line
router.use(protectRoute);

// Place explicit paths BEFORE dynamic parameters (:date)
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/:date', getAttendanceByDate);

export default router;
