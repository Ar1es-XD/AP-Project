/**
 * Legal bed status transitions.
 * Used by application code and matches the database trigger.
 */
const ALLOWED = {
  AVAILABLE:      ['RESERVED', 'OCCUPIED', 'MAINTENANCE', 'OUT_OF_SERVICE'],
  RESERVED:       ['AVAILABLE', 'OCCUPIED', 'CLEANING'],
  OCCUPIED:       ['CLEANING', 'AVAILABLE'],
  CLEANING:       ['AVAILABLE', 'MAINTENANCE'],
  MAINTENANCE:    ['AVAILABLE', 'OUT_OF_SERVICE'],
  OUT_OF_SERVICE: ['AVAILABLE'],
};

/**
 * Returns true if moving from → to is allowed.
 */
export function canTransition(from, to) {
  return ALLOWED[from]?.includes(to) ?? false;
}