import * as queueService from '../services/queue.service.js';

/**
 * Check a patient into an active OPD Queue
 * POST /api/v1/queues/join
 */
export async function joinQueue(req, res, next) {
  try {
    const hospital_id = req.user.hospital_id; // From verified JWT authGuard
    const { department_id, patient_id, priority } = req.body;

    const entry = await queueService.joinQueue({
      hospital_id,
      department_id,
      patient_id,
      priority,
    });

    res.status(201).json({
      message: 'Joined queue successfully',
      entry,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get active queue details and waiting list
 * GET /api/v1/queues/:id
 */
export async function getQueue(req, res, next) {
  try {
    const hospital_id = req.user.hospital_id;
    const { id } = req.params;

    const data = await queueService.getQueueById(id, hospital_id);

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * Doctor calls the next patient in line using Priority Aging and CAS
 * POST /api/v1/queues/call-next
 */
export async function callNext(req, res, next) {
  try {
    const hospital_id = req.user.hospital_id;
    const doctor_id = req.user.sub || req.user.user_id;
    const { department_id, room_number } = req.body;

    if (!department_id) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'department_id is required' },
      });
    }

    const result = await queueService.callNextPatient({
      department_id,
      hospital_id,
      doctor_id,
      room_number,
    });

    if (!result) {
      return res.status(200).json({
        message: 'No patients waiting in queue',
        called_patient: null,
      });
    }

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Transition patient ticket state (START_CONSULTATION, COMPLETE, NO_SHOW, HOLD)
 * POST /api/v1/queues/entries/:id/transition
 */
export async function transitionStatus(req, res, next) {
  try {
    const doctor_id = req.user.sub || req.user.user_id;
    const { id } = req.params; // entry_id
    const { action } = req.body;

    if (!action) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'action is required' },
      });
    }

    const updatedEntry = await queueService.transitionQueueStatus({
      entry_id: id,
      action,
      doctor_id,
    });

    res.status(200).json({
      message: `Status transitioned successfully to ${updatedEntry.status}`,
      entry: updatedEntry,
    });
  } catch (err) {
    next(err);
  }
}