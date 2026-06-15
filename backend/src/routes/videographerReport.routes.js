import { Router } from 'express';
import protectRoute from '../middleware/auth.middleware.js';
import {
  getReportByDate,
  saveReport,
  getVideographersList,
  getSubmittedDates
} from '../controllers/videographerReport.controller.js';

const router = Router();

// Apply global authentication check on all videographer report routes
router.use(protectRoute);

router.get('/by-date', getReportByDate);
router.post('/', saveReport);
router.get('/videographers', getVideographersList);
router.get('/submitted-dates', getSubmittedDates);

export default router;
