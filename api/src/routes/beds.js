import { Router } from 'express';
import { pool, withTransaction } from '../lib/db.js';
import { writeAudit } from '../lib/audit.js';
import { authGuard, requireRole } from '../middleware/auth.js';
import { canTransition } from '../lib/bedStateMachine.js';

const router = Router();

// All bed routes require a logged-in user
router.use(authGuard);

// --------------------------------------------------
// GET /beds
// List beds (optionally filter by status or ward)
// --------------------------------------------------
router.get('/', requireRole('BED_MANAGER', 'NURSE', 'HOSPITAL_ADMIN', 'FRONT_DESK'), async (req, res, next) => {
  try {
    const hospitalId = req.user.hospitalId;
    const { status, wardId } = req.query;

    let sql = `
      SELECT b.bed_id, b.bed_number, b.status, b.reserved_until, b.row_version,
             w.ward_id, w.name AS ward_name, w.floor, w.ward_type
      FROM bed b
      JOIN ward w ON w.ward_id = b.ward_id
      WHERE b.hospital_id = $1
    `;
    const params = [hospitalId];
    let idx = 2;

    if (status) {
      sql += ` AND b.status = $${idx++}`;
      params.push(status);
    }
    if (wardId) {
      sql += ` AND b.ward_id = $${idx++}`;
      params.push(wardId);
    }

    sql += ' ORDER BY w.name, b.bed_number';

    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// --------------------------------------------------
// POST /beds/:bedId/admit
// --------------------------------------------------
router.post('/:bedId/admit', requireRole('BED_MANAGER', 'NURSE', 'FRONT_DESK'), async (req, res, next) => {
  try {
    const { bedId } = req.params;
    const { patientId, notes } = req.body;
    const { userId, hospitalId } = req.user;

    if (!patientId) {
      return res.status(400).json({ error: { code: 'Bad_Request', message: 'patientId is required' } });
    }

    const result = await withTransaction(async (client) => {
      // 1. Lock the bed row
      const bedRes = await client.query(
        `SELECT bed_id, status, row_version
         FROM bed
         WHERE bed_id = $1 AND hospital_id = $2
         FOR UPDATE SKIP LOCKED`,
        [bedId, hospitalId]
      );

      if (bedRes.rowCount === 0) {
        const err = new Error('Bed not available or already locked by another request');
        err.status = 409;
        throw err;
      }

      const bed = bedRes.rows[0];
      if (bed.status !== 'AVAILABLE' && bed.status !== 'RESERVED') {
        const err = new Error(`Bed is currently ${bed.status}`);
        err.status = 409;
        throw err;
      }

      // 2. Create admission
      const admRes = await client.query(
        `INSERT INTO admission (hospital_id, patient_id, admitted_by, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING admission_id`,
        [hospitalId, patientId, userId, notes || null]
      );
      const admissionId = admRes.rows[0].admission_id;

      // 3. Create bed assignment
      await client.query(
        `INSERT INTO bed_assignment (bed_id, admission_id, hospital_id, assigned_by)
         VALUES ($1, $2, $3, $4)`,
        [bedId, admissionId, hospitalId, userId]
      );

      // 4. Mark bed as OCCUPIED
      const updateRes = await client.query(
        `UPDATE bed
         SET status = 'OCCUPIED', row_version = row_version + 1, updated_at = now()
         WHERE bed_id = $1 AND row_version = $2`,
        [bedId, bed.row_version]
      );

      if (updateRes.rowCount === 0) {
        const err = new Error('Bed was modified by another request');
        err.status = 409;
        throw err;
      }

      // 5. Audit
      await writeAudit(client, {
        actorId: userId,
        hospitalId,
        action: 'ADMIT',
        entityType: 'admission',
        entityId: admissionId,
        after: { bedId, patientId },
      });

      return { admissionId, bedId };
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// --------------------------------------------------
// POST /beds/:bedId/discharge
// --------------------------------------------------
router.post('/:bedId/discharge', requireRole('BED_MANAGER', 'NURSE', 'FRONT_DESK'), async (req, res, next) => {
  try {
    const { bedId } = req.params;
    const { userId, hospitalId } = req.user;

    await withTransaction(async (client) => {
      // Lock bed
      const bedRes = await client.query(
        `SELECT bed_id, status, row_version
         FROM bed
         WHERE bed_id = $1 AND hospital_id = $2
         FOR UPDATE SKIP LOCKED`,
        [bedId, hospitalId]
      );

      if (bedRes.rowCount === 0) {
        const err = new Error('Bed not found or locked');
        err.status = 409;
        throw err;
      }

      if (bedRes.rows[0].status !== 'OCCUPIED') {
        const err = new Error('Bed is not occupied');
        err.status = 409;
        throw err;
      }

      // Close the active assignment
      const assignRes = await client.query(
        `UPDATE bed_assignment
         SET released_at = now(), released_by = $1
         WHERE bed_id = $2 AND released_at IS NULL
         RETURNING admission_id`,
        [userId, bedId]
      );

      if (assignRes.rowCount === 0) {
        const err = new Error('No active assignment found for this bed');
        err.status = 409;
        throw err;
      }

      const admissionId = assignRes.rows[0].admission_id;

      // Close the admission
      await client.query(
        `UPDATE admission
         SET status = 'DISCHARGED',
             discharged_at = now(),
             discharged_by = $1,
             updated_at = now()
         WHERE admission_id = $2`,
        [userId, admissionId]
      );

      // Move bed to CLEANING
      await client.query(
        `UPDATE bed
         SET status = 'CLEANING', row_version = row_version + 1, updated_at = now()
         WHERE bed_id = $1`,
        [bedId]
      );

      // Automatically create a housekeeping task
      await client.query(
        `INSERT INTO housekeeping_task (hospital_id, bed_id, status)
         VALUES ($1, $2, 'PENDING')`,
        [hospitalId, bedId]
      );

      await writeAudit(client, {
        actorId: userId,
        hospitalId,
        action: 'DISCHARGE',
        entityType: 'admission',
        entityId: admissionId,
      });
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --------------------------------------------------
// POST /beds/:bedId/transfer
// Body: { newBedId, notes }
// --------------------------------------------------
router.post('/:bedId/transfer', requireRole('BED_MANAGER', 'NURSE'), async (req, res, next) => {
  try {
    const { bedId } = req.params;
    const { newBedId, notes } = req.body;
    const { userId, hospitalId } = req.user;

    if (!newBedId) {
      return res.status(400).json({ error: { code: 'Bad_Request', message: 'newBedId is required' } });
    }

    await withTransaction(async (client) => {
      // Lock BOTH beds at once
      const bedsRes = await client.query(
        `SELECT bed_id, status, row_version
         FROM bed
         WHERE bed_id IN ($1, $2) AND hospital_id = $3
         FOR UPDATE SKIP LOCKED`,
        [bedId, newBedId, hospitalId]
      );

      if (bedsRes.rowCount !== 2) {
        const err = new Error('One or both beds are unavailable or locked');
        err.status = 409;
        throw err;
      }

      const fromBed = bedsRes.rows.find(b => b.bed_id === bedId);
      const toBed   = bedsRes.rows.find(b => b.bed_id === newBedId);

      if (fromBed.status !== 'OCCUPIED') {
        const err = new Error('Source bed is not occupied');
        err.status = 409;
        throw err;
      }
      if (toBed.status !== 'AVAILABLE' && toBed.status !== 'RESERVED') {
        const err = new Error('Target bed is not free');
        err.status = 409;
        throw err;
      }

      // Close old assignment
      const oldAssign = await client.query(
        `UPDATE bed_assignment
         SET released_at = now(), released_by = $1
         WHERE bed_id = $2 AND released_at IS NULL
         RETURNING admission_id`,
        [userId, bedId]
      );

      if (oldAssign.rowCount === 0) {
        const err = new Error('No active assignment on source bed');
        err.status = 409;
        throw err;
      }

      const admissionId = oldAssign.rows[0].admission_id;

      // Create new assignment
      await client.query(
        `INSERT INTO bed_assignment (bed_id, admission_id, hospital_id, assigned_by, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [newBedId, admissionId, hospitalId, userId, notes || null]
      );

      // Update both bed statuses
      await client.query(
        `UPDATE bed SET status = 'CLEANING', row_version = row_version + 1, updated_at = now()
         WHERE bed_id = $1`,
        [bedId]
      );
      await client.query(
        `UPDATE bed SET status = 'OCCUPIED', row_version = row_version + 1, updated_at = now()
         WHERE bed_id = $1`,
        [newBedId]
      );

      // Create a housekeeping task for the released source bed
      await client.query(
        `INSERT INTO housekeeping_task (hospital_id, bed_id, status, notes)
         VALUES ($1, $2, 'PENDING', $3)`,
        [hospitalId, bedId, `Released after patient transfer to bed ${newBedId}`]
      );

      await writeAudit(client, {
        actorId: userId,
        hospitalId,
        action: 'TRANSFER',
        entityType: 'admission',
        entityId: admissionId,
        after: { fromBedId: bedId, toBedId: newBedId },
      });
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;