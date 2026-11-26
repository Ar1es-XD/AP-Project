import { Router } from 'express';
import { authGuard, requireRole } from '../middleware/auth.js';
import { validateBody, joinQueueSchema } from '../middleware/queueValidation.js';
import * as queueController from '../controllers/queue.controller.js';

export const queueRouter = Router();

// Protect all queue routes with JWT auth
queueRouter.use(authGuard);

// POST /api/v1/queues/join: Front desk, nurses, and doctors can issue a token
queueRouter.post(
  '/join',
  requireRole('FRONT_DESK', 'NURSE', 'DOCTOR', 'HOSPITAL_ADMIN'),
  validateBody(joinQueueSchema),
  queueController.joinQueue
);

// GET /api/v1/queues/:id: View active queue details and waiting list
queueRouter.get(
  '/:id',
  queueController.getQueue
);