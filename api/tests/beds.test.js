import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canTransition } from '../src/lib/bedStateMachine.js';

describe('Bed State Machine Validation (Person A)', () => {
  it('allows valid transitions from AVAILABLE', () => {
    assert.equal(canTransition('AVAILABLE', 'RESERVED'), true);
    assert.equal(canTransition('AVAILABLE', 'OCCUPIED'), true);
    assert.equal(canTransition('AVAILABLE', 'MAINTENANCE'), true);
    assert.equal(canTransition('AVAILABLE', 'OUT_OF_SERVICE'), true);
  });

  it('rejects invalid transitions from AVAILABLE to CLEANING', () => {
    assert.equal(canTransition('AVAILABLE', 'CLEANING'), false);
  });

  it('allows OCCUPIED to transition to CLEANING upon discharge', () => {
    assert.equal(canTransition('OCCUPIED', 'CLEANING'), true);
    assert.equal(canTransition('OCCUPIED', 'RESERVED'), false);
  });

  it('allows CLEANING to transition to AVAILABLE upon housekeeping completion', () => {
    assert.equal(canTransition('CLEANING', 'AVAILABLE'), true);
    assert.equal(canTransition('CLEANING', 'OCCUPIED'), false);
  });

  it('allows RESERVED to transition to OCCUPIED or back to AVAILABLE on sweeper expiry', () => {
    assert.equal(canTransition('RESERVED', 'OCCUPIED'), true);
    assert.equal(canTransition('RESERVED', 'AVAILABLE'), true);
  });
});
