import { Router } from 'express';
import protectRoute from '../middleware/auth.middleware.js';
import {
  getReportByDate,
  saveReport,
  getDesignersList,
  getSubmittedDates
} from '../controllers/graphicDesignerReport.controller.js';

const router = Router();

// Apply global authentication check on all graphic designer report routes
router.use(protectRoute);

router.get('/by-date', getReportByDate);
router.post('/', saveReport);
router.get('/designers', getDesignersList);
router.get('/submitted-dates', getSubmittedDates);

export default router;
