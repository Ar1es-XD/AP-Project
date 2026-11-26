import * as queueService from '../services/queue.service.js';

export async function joinQueue(req, res, next) {
  try {
    const hospital_id = req.user.hospital_id; // Extracted from verified JWT authGuard
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