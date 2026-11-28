import { pool } from '../lib/db.js';

/**
 * Releases beds whose reservation has expired.
 * Runs periodically in the background.
 */

export async function runReservationSweeper() {
  try {
    const { rowCount } = await pool.query(`
      UPDATE bed
      SET status = 'AVAILABLE',
          reserved_until = NULL,
          row_version = row_version + 1,
          updated_at = now()
      WHERE status = 'RESERVED'
        AND reserved_until IS NOT NULL
        AND reserved_until < now()
    `);

    if (rowCount > 0) {
      console.log(`[sweeper] Released ${rowCount} expired reservation(s)`);
    }
  } catch (err) {
    console.error('[sweeper] Error:', err.message);
  }
}

// Start the interval only when this file is imported in a running server
let intervalId = null;

export function startReservationSweeper(intervalMs = 60_000) {
  if (intervalId) return; // already running
  console.log('[sweeper] Starting reservation expiry job');
  // Run once immediately, then every minute
  runReservationSweeper();
  intervalId = setInterval(runReservationSweeper, intervalMs);
}

export function stopReservationSweeper() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[sweeper] Stopped reservation expiry job');
  }
}
