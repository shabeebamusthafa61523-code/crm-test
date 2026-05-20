import { Router } from 'express';
import * as taskController from '../controllers/task.controller.js';
import authenticate from '../middleware/auth.middleware.js';

const router = Router();

// 1. Pipeline Read Matrix
// Maps to: GET /api/v1/tasks/all
router.get('/all', authenticate, taskController.getAllTasks);

// 2. Dossier Asset Structuring
// Maps to: POST /api/v1/tasks/create
router.post('/create', authenticate, taskController.createTask);

// 3. Multi-field Modification Pipeline
// Maps to: PUT /api/v1/tasks/update/:id
router.put('/update/:id', authenticate, taskController.updateTask);

// 4. Fast Track Column Drop State Mutation
// Maps to: PUT /api/v1/tasks/task-status/:id
router.put('/task-status/:id', authenticate, taskController.updateTaskStatus);

// 5. Structural Asset Purge
// Maps to: DELETE /api/v1/tasks/delete/:id
router.delete('/delete/:id', authenticate, taskController.deleteTask);

export default router;