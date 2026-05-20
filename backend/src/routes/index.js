import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import taskRoutes from './task.routes.js';
import attendanceRoutes from './attendance.routes.js';

const router = Router();

// Mount all available route packages
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tasks', taskRoutes);
router.use('/attendance', attendanceRoutes);

export default router;
