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