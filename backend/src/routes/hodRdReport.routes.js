import { Router } from 'express';
import protectRoute from '../middleware/auth.middleware.js';
import {
  getReportByDate,
  saveReport,
  getHodsList,
  getSubmittedDates
} from '../controllers/hodRdReport.controller.js';

const router = Router();

// Apply global authentication check on all HOD R&D report routes
router.use(protectRoute);

router.get('/by-date', getReportByDate);
router.post('/', saveReport);
router.get('/hods', getHodsList);
router.get('/submitted-dates', getSubmittedDates);

export default router;
