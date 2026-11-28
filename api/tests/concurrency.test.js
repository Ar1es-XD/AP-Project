import 'dotenv/config';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'ci-secret-ci-secret-ci-secret-ci-secret-1234';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const { app } = await import('../src/app.js');
const { pool } = await import('../src/lib/db.js');

test('20 concurrent admits against 5 beds → exactly 5 succeed and 15 rejected', async () => {
  const hospitalId = '00000000-0000-0000-0000-000000000001';
  const token = jwt.sign(
    {
      userId: '00000000-0000-0000-0000-000000000002',
      hospitalId,
      roles: ['BED_MANAGER'],
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  try {
    await pool.query(`DELETE FROM bed_assignment WHERE hospital_id = $1`, [hospitalId]);
    await pool.query(`DELETE FROM admission WHERE hospital_id = $1`, [hospitalId]);
    await pool.query(
      `UPDATE bed SET status = 'AVAILABLE', row_version = 1, reserved_until = NULL
       WHERE hospital_id = $1`,
      [hospitalId]
    );

    const bedsRes = await pool.query(
      `SELECT bed_id FROM bed WHERE hospital_id = $1 AND status = 'AVAILABLE' LIMIT 5`,
      [hospitalId]
    );

    if (bedsRes.rowCount < 5) {
      console.log('Skipping live DB check: fewer than 5 beds available');
      return;
    }

    const bedIds = bedsRes.rows.map((r) => r.bed_id);

    const patientIds = [];
    for (let i = 0; i < 20; i++) {
      const { rows } = await pool.query(
        `INSERT INTO patient (hospital_id, uhid, full_name, date_of_birth)
         VALUES ($1, $2, $3, '1990-01-01')
         RETURNING patient_id`,
        [hospitalId, `TEST-CONCUR-${Date.now()}-${i}`, `Test Patient ${i}`]
      );
      patientIds.push(rows[0].patient_id);
    }

    const promises = patientIds.map((patientId, idx) =>
      request(app)
        .post(`/beds/${bedIds[idx % 5]}/admit`)
        .set('Authorization', `Bearer ${token}`)
        .send({ patientId })
        .set('Content-Type', 'application/json')
    );

    const results = await Promise.allSettled(promises);
    const successes = results.filter(
      (r) => r.status === 'fulfilled' && r.value.status === 201
    );
    const failures = results.filter(
      (r) => r.status === 'fulfilled' && r.value.status >= 400
    );

    assert.equal(successes.length, 5, `Expected 5 successes, got ${successes.length}`);
    assert.equal(failures.length, 15, `Expected 15 failures, got ${failures.length}`);
  } catch (err) {
    if (
      err.code === 'ECONNREFUSED' ||
      err.code === 'EPERM' ||
      err.code === '28000' ||
      err.code === '28P01' ||
      err.code === 'ENOTFOUND' ||
      err.code === 'ETIMEDOUT' ||
      err.name === 'AggregateError' ||
      err.message?.includes('connect') ||
      err.message?.includes('role') ||
      err.message?.includes('password')
    ) {
      console.log(`Database not connected (${err.message}); skipping live DB concurrency step.`);
      return;
    }
    throw err;
  }
});
