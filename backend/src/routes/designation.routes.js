import { Router } from 'express';
import checkAuth from '../middleware/auth.middleware.js';
import { designationController } from '../controllers/designation.controller.js';

const router = Router();

router.use(checkAuth);

router.get('/', designationController.getDesignations);
router.post('/', designationController.createDesignation);
router.put('/:designation_id', designationController.updateDesignation);
router.delete('/:designation_id', designationController.deleteDesignation);

export default router;
