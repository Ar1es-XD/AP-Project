import { pool } from '../lib/db.js';

/**
 * Service to handle OPD Queue business logic and atomic token generation.
 */

/**
 * Atomic Token Increment and Queue Entry creation.
 * Uses an explicit PostgreSQL transaction with row-level locks on queue_counter.
 */
export async function joinQueue({ hospital_id, department_id, patient_id, priority = 'ROUTINE' }) {
  const client = await pool.connect();
  const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

  try {
    await client.query('BEGIN');

    // 1. Fetch or create the OPD Queue session for today
    let queueRes = await client.query(
      `SELECT queue_id, status FROM opd_queue 
       WHERE department_id = $1 AND queue_date = $2`,
      [department_id, today]
    );

    let queueId;
    if (queueRes.rows.length === 0) {
      // Create new queue for today if not already open
      const newQueue = await client.query(
        `INSERT INTO opd_queue (hospital_id, department_id, queue_date, status)
         VALUES ($1, $2, $3, 'OPEN')
         RETURNING queue_id, status`,
        [hospital_id, department_id, today]
      );
      queueId = newQueue.rows[0].queue_id;
    } else {
      if (queueRes.rows[0].status === 'CLOSED') {
        const error = new Error('Queue is currently closed for new registrations today');
        error.statusCode = 400;
        throw error;
      }
      queueId = queueRes.rows[0].queue_id;
    }

    // 2. Atomic Token Counter Increment
    // Uses ON CONFLICT to initialize counter if it is the first patient of the day
    const counterRes = await client.query(
      `INSERT INTO queue_counter (department_id, queue_date, current_token, last_updated_at)
       VALUES ($1, $2, 1, now())
       ON CONFLICT (department_id, queue_date)
       DO UPDATE SET 
         current_token = queue_counter.current_token + 1,
         last_updated_at = now()
       RETURNING current_token`,
      [department_id, today]
    );

    const tokenNumber = counterRes.rows[0].current_token;

    // 3. Fetch Department name for human-friendly token display (e.g. CARD-001)
    const deptRes = await client.query(
      `SELECT name FROM department WHERE department_id = $1`,
      [department_id]
    );
    const deptPrefix = deptRes.rows[0]?.name ? deptRes.rows[0].name.substring(0, 4).toUpperCase() : 'OPD';
    const tokenDisplay = `${deptPrefix}-${String(tokenNumber).padStart(3, '0')}`;

    // 4. Insert Queue Entry
    const entryRes = await client.query(
      `INSERT INTO queue_entry (
         queue_id, patient_id, hospital_id, department_id,
         token_number, token_display, priority, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'WAITING')
       RETURNING *`,
      [queueId, patient_id, hospital_id, department_id, tokenNumber, tokenDisplay, priority]
    );

    await client.query('COMMIT');
    return entryRes.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get active queue details and waiting list by queue_id
 */
export async function getQueueById(queueId, hospitalId) {
  const queueRes = await pool.query(
    `SELECT q.*, d.name as department_name
     FROM opd_queue q
     JOIN department d ON q.department_id = d.department_id
     WHERE q.queue_id = $1 AND q.hospital_id = $2`,
    [queueId, hospitalId]
  );

  if (queueRes.rows.length === 0) {
    const error = new Error('Queue not found');
    error.statusCode = 404;
    throw error;
  }

  // Fetch waiting patients sorted by priority and arrival time
  const entriesRes = await pool.query(
    `SELECT entry_id, token_number, token_display, priority, status, joined_at
     FROM queue_entry
     WHERE queue_id = $1 AND status = 'WAITING'
     ORDER BY 
       CASE priority
         WHEN 'EMERGENCY' THEN 1
         WHEN 'URGENT' THEN 2
         WHEN 'ROUTINE' THEN 3
         ELSE 4
       END ASC,
       joined_at ASC`,
    [queueId]
  );

  return {
    queue: queueRes.rows[0],
    waiting_count: entriesRes.rows.length,
    waiting_patients: entriesRes.rows,
  };
}



/**
 * Call the next patient in line using Dynamic Priority Aging and Compare-and-Swap (CAS).
 * Prevents starvation of routine patients and eliminates double-calling race conditions.
 */
export async function callNextPatient({ department_id, hospital_id, doctor_id, room_number }) {
  const client = await pool.connect();
  const today = new Date().toISOString().split('T')[0];

  try {
    // 1. Ensure the doctor has an active session in doctor_session
    await client.query(
      `INSERT INTO doctor_session (doctor_id, hospital_id, department_id, room_number, status, started_at)
       VALUES ($1, $2, $3, $4, 'ACTIVE', now())
       ON CONFLICT DO NOTHING`,
      [doctor_id, hospital_id, department_id, room_number || 'Room 1']
    );

    // 2. Fetch active queue for today
    const queueRes = await client.query(
      `SELECT queue_id FROM opd_queue 
       WHERE department_id = $1 AND hospital_id = $2 AND queue_date = $3 AND status != 'CLOSED'`,
      [department_id, hospital_id, today]
    );

    if (queueRes.rows.length === 0) {
      const error = new Error('No open queue session found for this department today');
      error.statusCode = 404;
      throw error;
    }

    const queueId = queueRes.rows[0].queue_id;

    // 3. Query waiting candidates ordered by Priority Aging Score:
    // Effective Score = Base Weight - (Wait Minutes * Aging Factor) - (Bump Count * 30)
    const candidatesRes = await client.query(
      `SELECT entry_id, token_number, token_display, priority, joined_at, priority_bump_count,
              (
                CASE priority
                  WHEN 'EMERGENCY' THEN 0
                  WHEN 'URGENT'    THEN 60
                  WHEN 'ROUTINE'   THEN 120
                END
                - (EXTRACT(EPOCH FROM (now() - joined_at)) / 60.0) * 1.0
                - (priority_bump_count * 30.0)
              ) AS priority_score
       FROM queue_entry
       WHERE queue_id = $1 AND status = 'WAITING'
       ORDER BY priority_score ASC, joined_at ASC
       LIMIT 10`,
      [queueId]
    );

    if (candidatesRes.rows.length === 0) {
      return null; // Queue is empty, no patients waiting
    }

    // 4. Compare-and-Swap (CAS): Attempt to claim a candidate
    let calledPatient = null;
    for (const candidate of candidatesRes.rows) {
      const updateRes = await client.query(
        `UPDATE queue_entry
         SET status = 'CALLED',
             called_at = now()
         WHERE entry_id = $1 AND status = 'WAITING'
         RETURNING *`,
        [candidate.entry_id]
      );

      if (updateRes.rows.length === 1) {
        calledPatient = updateRes.rows[0];
        break; // Successfully claimed patient!
      }
      // If 0 rows updated, another doctor claimed this patient at the exact same millisecond;
      // loop continues to candidate 2.
    }

    if (!calledPatient) {
      // All top candidates were claimed by other concurrent doctors simultaneously
      const error = new Error('Concurrent contention: Patients were claimed by other doctors. Please retry.');
      error.statusCode = 409;
      throw error;
    }

    return {
      message: 'Patient called successfully',
      called_patient: calledPatient,
      room_number: room_number || 'Room 1',
    };
  } finally {
    client.release();
  }
}

/**
 * Transition a patient ticket through the clinical state machine:
 * - START_CONSULTATION: status -> 'IN_CONSULTATION', consultation_start_at = now()
 * - COMPLETE: status -> 'COMPLETED', consultation_end_at = now(), writes consultation_log
 * - NO_SHOW: status -> 'NO_SHOW'
 * - HOLD: status -> 'HOLD'
 */
export async function transitionQueueStatus({ entry_id, action, doctor_id }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch current ticket state
    const currentRes = await client.query(
      `SELECT * FROM queue_entry WHERE entry_id = $1`,
      [entry_id]
    );

    if (currentRes.rows.length === 0) {
      const error = new Error('Queue entry not found');
      error.statusCode = 404;
      throw error;
    }

    const entry = currentRes.rows[0];
    let updatedEntry = null;

    switch (action) {
      case 'START_CONSULTATION': {
        // Can only start consultation if patient was CALLED or on HOLD
        if (entry.status !== 'CALLED' && entry.status !== 'HOLD') {
          const error = new Error(`Cannot start consultation from status: ${entry.status}. Must be CALLED or HOLD.`);
          error.statusCode = 400;
          throw error;
        }

        const res = await client.query(
          `UPDATE queue_entry
           SET status = 'IN_CONSULTATION',
               consultation_start_at = COALESCE(consultation_start_at, now())
           WHERE entry_id = $1
           RETURNING *`,
          [entry_id]
        );
        updatedEntry = res.rows[0];
        break;
      }

      case 'COMPLETE': {
        // Can only complete if currently IN_CONSULTATION
        if (entry.status !== 'IN_CONSULTATION') {
          const error = new Error(`Cannot complete consultation from status: ${entry.status}. Must be IN_CONSULTATION.`);
          error.statusCode = 400;
          throw error;
        }

        const endTime = new Date();
        const startTime = entry.consultation_start_at ? new Date(entry.consultation_start_at) : endTime;
        const durationSeconds = Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / 1000));

        // Update ticket to COMPLETED
        const res = await client.query(
          `UPDATE queue_entry
           SET status = 'COMPLETED',
               consultation_end_at = now()
           WHERE entry_id = $1
           RETURNING *`,
          [entry_id]
        );
        updatedEntry = res.rows[0];

        // Clinical Retention: Write completed visit to consultation_log
        await client.query(
          `INSERT INTO consultation_log (entry_id, doctor_id, started_at, ended_at, duration_seconds, created_at)
           VALUES ($1, $2, $3, now(), $4, now())`,
          [entry_id, doctor_id, startTime, durationSeconds]
        );
        break;
      }

      case 'NO_SHOW': {
        // Can only mark no-show if patient was CALLED
        if (entry.status !== 'CALLED') {
          const error = new Error(`Cannot mark NO_SHOW from status: ${entry.status}. Patient must be CALLED first.`);
          error.statusCode = 400;
          throw error;
        }

        const res = await client.query(
          `UPDATE queue_entry
           SET status = 'NO_SHOW'
           WHERE entry_id = $1
           RETURNING *`,
          [entry_id]
        );
        updatedEntry = res.rows[0];
        break;
      }

      case 'HOLD': {
        // Can put on hold if CALLED or IN_CONSULTATION (e.g. sent for X-ray/labs)
        if (entry.status !== 'CALLED' && entry.status !== 'IN_CONSULTATION') {
          const error = new Error(`Cannot put on HOLD from status: ${entry.status}.`);
          error.statusCode = 400;
          throw error;
        }

        const res = await client.query(
          `UPDATE queue_entry
           SET status = 'HOLD'
           WHERE entry_id = $1
           RETURNING *`,
          [entry_id]
        );
        updatedEntry = res.rows[0];
        break;
      }

      default: {
        const error = new Error(`Invalid transition action: ${action}. Expected START_CONSULTATION, COMPLETE, NO_SHOW, or HOLD.`);
        error.statusCode = 400;
        throw error;
      }
    }

    await client.query('COMMIT');
    return updatedEntry;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}