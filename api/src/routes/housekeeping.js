import { Router } from 'express';
import { pool, withTransaction } from '../lib/db.js';
import { authGuard, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authGuard);

// GET /housekeeping
router.get('/', requireRole('HOUSEKEEPING', 'BED_MANAGER', 'HOSPITAL_ADMIN'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT h.task_id, h.status, h.created_at, h.notes,
              b.bed_id, b.bed_number,
              w.name AS ward_name
       FROM housekeeping_task h
       JOIN bed b ON b.bed_id = h.bed_id
       JOIN ward w ON w.ward_id = b.ward_id
       WHERE h.hospital_id = $1 AND h.status != 'DONE'
       ORDER BY h.created_at ASC`,
      [req.user.hospitalId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /housekeeping/:taskId/complete
router.post('/:taskId/complete', requireRole('HOUSEKEEPING', 'BED_MANAGER'), async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { userId, hospitalId } = req.user;

    await withTransaction(async (client) => {
      const taskRes = await client.query(
        `UPDATE housekeeping_task
         SET status = 'DONE', completed_at = now(), assigned_to = $1
         WHERE task_id = $2 AND hospital_id = $3 AND status != 'DONE'
         RETURNING bed_id`,
        [userId, taskId, hospitalId]
      );

      if (taskRes.rowCount === 0) {
        const err = new Error('Task not found or already completed');
        err.status = 404;
        throw err;
      }

      // Free the bed
      await client.query(
        `UPDATE bed
         SET status = 'AVAILABLE', row_version = row_version + 1, updated_at = now()
         WHERE bed_id = $1`,
        [taskRes.rows[0].bed_id]
      );
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;