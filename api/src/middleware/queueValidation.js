import { z } from 'zod';

// Allowed triage priority levels matching queue_priority enum
export const PriorityEnum = z.enum(['EMERGENCY', 'URGENT', 'ROUTINE']);

// Zod Schema for joining an OPD queue
export const joinQueueSchema = z.object({
  patient_id: z.string().uuid({ message: 'patient_id must be a valid UUID' }),
  department_id: z.string().uuid({ message: 'department_id must be a valid UUID' }),
  priority: PriorityEnum.default('ROUTINE'),
});

// Middleware factory that validates request body against a Zod schema
export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: result.error.issues.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }
  // Replace req.body with the sanitized/validated data
  req.body = result.data;
  next();
};
