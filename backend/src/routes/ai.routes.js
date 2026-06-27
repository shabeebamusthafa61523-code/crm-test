import express from 'express';
import { getDailyReport, getMonthlyReport, chatWithAi } from '../controllers/ai.controller.js';
import protectRoute from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protectRoute);

router.get('/daily', getDailyReport);
router.get('/monthly', getMonthlyReport);
router.post('/chat', chatWithAi);

export default router;
