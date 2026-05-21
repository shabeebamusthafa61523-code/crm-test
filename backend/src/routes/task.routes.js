import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import * as taskController from '../controllers/task.controller.js';
import authenticate from '../middleware/auth.middleware.js';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${randomUUID()}${ext}`);
    }
  })
});

// 1. Pipeline Read Matrix
// Maps to: GET /api/v1/tasks/all
router.get('/all', authenticate, taskController.getAllTasks);

// 2. Dossier Asset Structuring
// Maps to: POST /api/v1/tasks/create
router.post('/create', authenticate, upload.single('file'), taskController.createTask);

// 3. Multi-field Modification Pipeline
// Maps to: PUT /api/v1/tasks/update/:id
router.put('/update/:id', authenticate, upload.single('file'), taskController.updateTask);

// 4. Fast Track Column Drop State Mutation
// Maps to: PUT /api/v1/tasks/task-status/:id
router.put('/task-status/:id', authenticate, taskController.updateTaskStatus);

// 5. Structural Asset Purge
// Maps to: DELETE /api/v1/tasks/delete/:id
router.delete('/delete/:id', authenticate, taskController.deleteTask);

export default router;
