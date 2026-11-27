import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { joinQueueSchema } from '../src/middleware/queueValidation.js';

describe('OPD Queue Unit Tests (Person B - Day 3)', () => {

  // Test 1: Zod Schema Validation
  describe('Queue Input Validation', () => {
    // Valid RFC 4122 UUIDs (version 4)
    const validDeptId = 'c7a8b9e0-3d21-4f56-8a90-123456789abc';
    const validPatientId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

    it('should validate a correct queue join payload', () => {
      const validPayload = {
        department_id: validDeptId,
        patient_id: validPatientId,
        priority: 'URGENT',
      };

      const result = joinQueueSchema.safeParse(validPayload);
      assert.equal(result.success, true);
      assert.equal(result.data.priority, 'URGENT');
    });

    it('should default priority to ROUTINE when omitted', () => {
      const payloadWithoutPriority = {
        department_id: validDeptId,
        patient_id: validPatientId,
      };

      const result = joinQueueSchema.safeParse(payloadWithoutPriority);
      assert.equal(result.success, true);
      assert.equal(result.data.priority, 'ROUTINE');
    });

    it('should reject non-UUID department_id or patient_id', () => {
      const invalidPayload = {
        department_id: 'not-a-valid-uuid',
        patient_id: '12345',
        priority: 'ROUTINE',
      };

      const result = joinQueueSchema.safeParse(invalidPayload);
      assert.equal(result.success, false);
      const issues = result.error.issues || result.error.errors;
      assert.equal(issues.length >= 2, true);
    });

    it('should reject invalid priority values', () => {
      const invalidPriorityPayload = {
        department_id: validDeptId,
        patient_id: validPatientId,
        priority: 'SUPER_HIGH', // Invalid priority enum
      };

      const result = joinQueueSchema.safeParse(invalidPriorityPayload);
      assert.equal(result.success, false);
    });
  });

  // Test 2: Priority Aging Logic Verification
  describe('Priority Aging Formula Calculation', () => {
    function computePriorityScore(priority, waitMinutes, bumpCount = 0) {
      let baseWeight;
      switch (priority) {
        case 'EMERGENCY': baseWeight = 0; break;
        case 'URGENT': baseWeight = 60; break;
        case 'ROUTINE': baseWeight = 120; break;
        default: baseWeight = 120;
      }
      return baseWeight - (waitMinutes * 1.0) - (bumpCount * 30.0);
    }

    it('should prioritize newly arrived EMERGENCY over newly arrived ROUTINE', () => {
      const emergencyScore = computePriorityScore('EMERGENCY', 0); // 0
      const routineScore = computePriorityScore('ROUTINE', 0);     // 120

      // Lower score = higher priority
      assert.equal(emergencyScore < routineScore, true);
    });

    it('should prioritize an aged ROUTINE patient over a newly arrived URGENT patient', () => {
      // Routine patient waiting 80 minutes: 120 - 80 = 40
      const agedRoutineScore = computePriorityScore('ROUTINE', 80);

      // Urgent patient just walked in: 60 - 0 = 60
      const newUrgentScore = computePriorityScore('URGENT', 0);

      // The routine patient's score (40) is lower than new urgent (60), preventing starvation!
      assert.equal(agedRoutineScore < newUrgentScore, true);
    });

    it('should accelerate priority when Symptoms Worse escalation is clicked', () => {
      // Routine patient waiting 20 minutes without bump: 120 - 20 = 100
      const normalScore = computePriorityScore('ROUTINE', 20, 0);

      // Routine patient waiting 20 minutes WITH 2 symptom bumps: 120 - 20 - (2 * 30) = 40
      const escalatedScore = computePriorityScore('ROUTINE', 20, 2);

      assert.equal(escalatedScore < normalScore, true);
      assert.equal(escalatedScore, 40);
    });
  });

  // Test 3: Clinical State Machine Allowed Transitions
  describe('Clinical State Transition Guards', () => {
    const validTransitions = {
      WAITING: ['CALLED'],
      CALLED: ['IN_CONSULTATION', 'NO_SHOW', 'HOLD'],
      IN_CONSULTATION: ['COMPLETED', 'HOLD'],
      HOLD: ['IN_CONSULTATION'],
      COMPLETED: [],
      NO_SHOW: [],
    };

    function isValidTransition(fromStatus, toStatus) {
      return validTransitions[fromStatus]?.includes(toStatus) ?? false;
    }

    it('should allow WAITING -> CALLED', () => {
      assert.equal(isValidTransition('WAITING', 'CALLED'), true);
    });

    it('should allow CALLED -> IN_CONSULTATION and CALLED -> NO_SHOW', () => {
      assert.equal(isValidTransition('CALLED', 'IN_CONSULTATION'), true);
      assert.equal(isValidTransition('CALLED', 'NO_SHOW'), true);
    });

    it('should REJECT illegal transition WAITING -> COMPLETED directly', () => {
      assert.equal(isValidTransition('WAITING', 'COMPLETED'), false);
    });

    it('should REJECT transition from terminal state COMPLETED', () => {
      assert.equal(isValidTransition('COMPLETED', 'WAITING'), false);
    });
  });

});