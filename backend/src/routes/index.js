import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import taskRoutes from './task.routes.js';
import attendanceRoutes from './attendance.routes.js';
import departmentRoutes from '../modules/departments/department.routes.js';
import designationRoutes from './designation.routes.js';
import leadRoutes from './lead.routes.js';
import analyticsRoutes from './analytics.routes.js';
import developerReportRoutes from './developerReport.routes.js';
import hrReportRoutes from './hrReport.routes.js';
import opsReportRoutes from './opsReport.routes.js';
import accountantReportRoutes from './accountantReport.routes.js';
import marketingReportRoutes from './marketingReport.routes.js';
import hodRdReportRoutes from './hodRdReport.routes.js';
import graphicDesignerReportRoutes from './graphicDesignerReport.routes.js';
import academicCounselorReportRoutes from './academicCounselorReport.routes.js';
import videographerReportRoutes from './videographerReport.routes.js';
import employeeReportPDFRoutes from './employeeReportPDF.routes.js';





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
router.use('/developer-reports', developerReportRoutes);
router.use('/hr-reports', hrReportRoutes);
router.use('/ops-reports', opsReportRoutes);
router.use('/accountant-reports', accountantReportRoutes);
router.use('/marketing-reports', marketingReportRoutes);
router.use('/hod-rd-reports', hodRdReportRoutes);
router.use('/graphic-designer-reports', graphicDesignerReportRoutes);
router.use('/academic-counselor-reports', academicCounselorReportRoutes);
router.use('/videographer-reports', videographerReportRoutes);
router.use('/employee-reports', employeeReportPDFRoutes);

export default router;
