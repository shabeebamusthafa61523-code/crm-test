import { Router } from 'express';
import protectRoute from '../middleware/auth.middleware.js';
import {
  getReportByDate,
  saveReport,
  getDevelopersList,
  getSubmittedDates
} from '../controllers/developerReport.controller.js';

const router = Router();

// Apply global authentication check on all developer report routes
router.use(protectRoute);

router.get('/by-date', getReportByDate);
router.post('/', saveReport);
router.get('/developers', getDevelopersList);
router.get('/submitted-dates', getSubmittedDates);

export default router;
