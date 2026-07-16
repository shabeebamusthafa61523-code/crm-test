// src/routes/attendance.routes.js

import { Router } from 'express';
import protectRoute, { requireRole } from '../middleware/auth.middleware.js';
import {
  checkIn,
  checkOut,
  startBreak,
  endBreak,
  markAbsent,
  adminOverride,
  getAttendanceByDate,
  getAllAttendanceByDate,
  getMyHistory,
  getAllByDateRange,
  getMonthlyReport
} from '../controllers/attendance.controller.js';

const router = Router();

// All endpoints require authentication
router.use(protectRoute);

// ──────────────────────────────────────────────────────────────────────────────
// SELF — Employee / Student / All Roles
// ──────────────────────────────────────────────────────────────────────────────

// Check-in / Check-out
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);

// Break tracking
router.post('/break/start', startBreak);
router.post('/break/end', endBreak);

// Own record for today or a specific date
router.get('/my/today', getAttendanceByDate);
router.get('/my/history', getMyHistory);
router.get('/my/:date', getAttendanceByDate);

// Monthly report for self (also usable by Admin for any user via query param)
router.get('/report/monthly', getMonthlyReport);

// ──────────────────────────────────────────────────────────────────────────────
// MANAGER / HR / ADMIN — Protected by role
// ──────────────────────────────────────────────────────────────────────────────

// All staff attendance by date — Admin/HR/Manager
router.get(
  '/all/:date',
  requireRole(['admin', 'manager', 'hr']),
  getAllAttendanceByDate
);

// All staff attendance by date range — Admin/HR/Manager
router.get(
  '/range',
  requireRole(['admin', 'manager', 'hr']),
  getAllByDateRange
);

// Mark a user absent — Admin/HR/Manager
router.post(
  '/mark-absent',
  requireRole(['admin', 'manager', 'hr']),
  markAbsent
);

// ──────────────────────────────────────────────────────────────────────────────
// ADMIN ONLY — Correction / Override
// ──────────────────────────────────────────────────────────────────────────────

// Correct an existing record (admin override)
router.put(
  '/admin-override/:id',
  requireRole(['admin']),
  adminOverride
);

// ──────────────────────────────────────────────────────────────────────────────
// LEGACY — Keep existing date param at bottom to avoid route conflicts
// ──────────────────────────────────────────────────────────────────────────────
router.get('/:date', getAttendanceByDate);

export default router;
