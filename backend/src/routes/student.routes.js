import express from 'express';
import {
  markAttendance,
  getAttendanceByDate
} from '../controllers/student.controller.js';

const router = express.Router();

router.post('/attendance/mark',markAttendance);

router.get('/attendance/student/:date',getAttendanceByDate);

export default router;