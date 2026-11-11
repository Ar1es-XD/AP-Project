import { Router } from 'express';
import { pool } from '../lib/db.js';
import { authGuard, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authGuard);

// GET /waitlist
router.get('/', requireRole('BED_MANAGER', 'NURSE', 'FRONT_DESK', 'HOSPITAL_ADMIN'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT w.waitlist_id, w.priority, w.status, w.requested_at, w.notes,
              p.patient_id, p.full_name, p.uhid
       FROM waitlist w
       JOIN patient p ON p.patient_id = w.patient_id
       WHERE w.hospital_id = $1 AND w.status = 'WAITING'
       ORDER BY w.priority DESC, w.requested_at ASC`,
      [req.user.hospitalId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /waitlist
router.post('/', requireRole('BED_MANAGER', 'NURSE', 'FRONT_DESK'), async (req, res, next) => {
  try {
    const { patientId, preferredWardId, priority = 0, notes } = req.body;
    const { userId, hospitalId } = req.user;

    if (!patientId) {
      return res.status(400).json({ error: { code: 'Bad_Request', message: 'patientId is required' } });
    }

    const { rows } = await pool.query(
      `INSERT INTO waitlist
         (hospital_id, patient_id, preferred_ward_id, priority, requested_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [hospitalId, patientId, preferredWardId || null, priority, userId, notes || null]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;