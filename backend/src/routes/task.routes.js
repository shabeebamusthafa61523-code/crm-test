// ── src/routes/task.routes.js ──
import { Router } from 'express';

import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import * as taskController from '../controllers/task.controller.js';
import authenticate from '../middleware/auth.middleware.js';

import verifyJWT from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';
import {
  createTask,
  getAllTasks,
  getUserTasks,
  getCurrentUserTasks,
  deleteTask,
  updateTaskStatus,
  updateTask
} from '../controllers/task.controller.js';
import {
  createTaskSchema,
  updateTaskSchema,
  updateStatusQuerySchema,
  taskIdParamsSchema,
  userTasksQuerySchema,
  validateBody,
  validateQuery,
  validateParams
} from '../validators/task.validator.js';


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

// Apply auth middleware globally to all task endpoints
router.use(verifyJWT);


// 2. Dossier Asset Structuring
// Maps to: POST /api/v1/tasks/create
router.post('/create', authenticate, upload.single('file'), taskController.createTask);

// 3. Multi-field Modification Pipeline
// Maps to: PUT /api/v1/tasks/update/:id
router.put('/update/:id', authenticate, upload.single('file'), taskController.updateTask);

// 1. POST /api/v1/tasks/create
router.post(
  '/create',
  upload.single('file'),
  validateBody(createTaskSchema),
  createTask
);

// 2. GET /api/v1/tasks/all
router.get(
  '/all',
  getAllTasks
);


// 3. GET /api/v1/tasks/user/tasks?user_id=
router.get(
  '/user/tasks',
  validateQuery(userTasksQuerySchema),
  getUserTasks
);

// 4. GET /api/v1/tasks/current-user/tasks
router.get(
  '/current-user/tasks',
  getCurrentUserTasks
);

// 5. DELETE /api/v1/tasks/delete/:task_id
router.delete(
  '/delete/:task_id',
  validateParams(taskIdParamsSchema),
  deleteTask
);

// 6. PUT /api/v1/tasks/task-status/:task_id
router.put(
  '/task-status/:task_id',
  validateParams(taskIdParamsSchema),
  validateQuery(updateStatusQuerySchema),
  updateTaskStatus
);

// 7. PUT /api/v1/tasks/update/:task_id
router.put(
  '/update/:task_id',
  validateParams(taskIdParamsSchema),
  upload.single('file'),
  validateBody(updateTaskSchema),
  updateTask
);

export default router;
