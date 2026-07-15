import { Router } from 'express';
import { employeeReportPDFController } from '../controllers/employeeReportPDF.controller.js';
import checkAuth from '../middleware/auth.middleware.js';
import upload, { validateUploadedFile } from '../middleware/upload.middleware.js';

const router = Router();

// Secure all routes with authentication
router.use(checkAuth);

router.post('/upload', upload.single('pdfFile'), validateUploadedFile, employeeReportPDFController.uploadPDFReport);
router.get('/generate-pdf', employeeReportPDFController.generatePDFReport);
router.get('/list', employeeReportPDFController.getPDFReportsByUser);
router.get('/stream/:reportId', employeeReportPDFController.streamSavedPDFReport);

export default router;
