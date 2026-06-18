import { Router } from 'express';
import protectRoute from '../middleware/auth.middleware.js';
import {
  getReportByDate,
  saveReport,
  getAccountantStaffList,
  getSubmittedDates
} from '../controllers/accountantReport.controller.js';

const router = Router();

// Apply global authentication check on all accountant report routes
router.use(protectRoute);

router.get('/by-date', getReportByDate);
router.post('/', saveReport);
router.get('/accountant-staff', getAccountantStaffList);
router.get('/submitted-dates', getSubmittedDates);

export default router;
