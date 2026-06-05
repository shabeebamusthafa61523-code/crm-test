import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import taskRoutes from './task.routes.js';
import attendanceRoutes from './attendance.routes.js';
import departmentRoutes from '../modules/departments/department.routes.js';
import designationRoutes from './designation.routes.js';
import leadRoutes from './lead.routes.js';
import analyticsRoutes from './analytics.routes.js';

const router = Router();

// Mount all available route packages
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tasks', taskRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/departments', departmentRoutes);
router.use('/designations', designationRoutes);
router.use('/leads', leadRoutes);
router.use('/analytics', analyticsRoutes);

export default router;

