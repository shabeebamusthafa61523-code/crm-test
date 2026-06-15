import { Router } from 'express';
import protectRoute from '../middleware/auth.middleware.js';
import {
  getReportByDate,
  saveReport,
  getMarketingStaffList,
  getSubmittedDates
} from '../controllers/marketingReport.controller.js';

const router = Router();

// Apply global authentication check on all marketing report routes
router.use(protectRoute);

router.get('/by-date', getReportByDate);
router.post('/', saveReport);
router.get('/marketing-staff', getMarketingStaffList);
router.get('/submitted-dates', getSubmittedDates);

export default router;
