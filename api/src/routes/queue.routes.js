import { Router } from 'express';
import { authGuard, requireRole } from '../middleware/auth.js';
import { validateBody, joinQueueSchema } from '../middleware/queueValidation.js';
import * as queueController from '../controllers/queue.controller.js';

export const queueRouter = Router();

// Protect all queue routes with JWT auth
queueRouter.use(authGuard);

// 1. Join queue: Receptionists, Nurses, Doctors
queueRouter.post(
  '/join',
  requireRole('FRONT_DESK', 'NURSE', 'DOCTOR', 'HOSPITAL_ADMIN'),
  validateBody(joinQueueSchema),
  queueController.joinQueue
);

// 2. Call next patient: Doctor only (with Priority Aging and CAS)
queueRouter.post(
  '/call-next',
  requireRole('DOCTOR', 'HOSPITAL_ADMIN'),
  queueController.callNext
);

// 3. Clinical state transitions: START_CONSULTATION, COMPLETE, NO_SHOW, HOLD
queueRouter.post(
  '/entries/:id/transition',
  requireRole('DOCTOR', 'NURSE', 'HOSPITAL_ADMIN'),
  queueController.transitionStatus
);

// 4. View active queue status by ID
queueRouter.get(
  '/:id',
  queueController.getQueue
);