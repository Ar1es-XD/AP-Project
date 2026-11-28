import { Router } from 'express';
import { pool } from '../lib/db.js';
import { authGuard, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authGuard);
router.use(requireRole('HOSPITAL_ADMIN', 'BED_MANAGER'));

// POST /admin/wards
router.post('/wards', async (req, res, next) => {
  try {
    const { name, floor, wardType } = req.body;
    const hospitalId = req.user.hospitalId;

    if (!name) {
      return res.status(400).json({ error: { code: 'Bad_Request', message: 'name is required' } });
    }

    const { rows } = await pool.query(
      `INSERT INTO ward (hospital_id, name, floor, ward_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [hospitalId, name, floor || null, wardType || null]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /admin/beds
router.post('/beds', async (req, res, next) => {
  try {
    const { wardId, bedNumber } = req.body;
    const hospitalId = req.user.hospitalId;

    if (!wardId || !bedNumber) {
      return res.status(400).json({
        error: { code: 'Bad_Request', message: 'wardId and bedNumber are required' },
      });
    }

    const { rows } = await pool.query(
      `INSERT INTO bed (ward_id, hospital_id, bed_number)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [wardId, hospitalId, bedNumber]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;