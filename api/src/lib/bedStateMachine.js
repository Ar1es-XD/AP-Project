const ALLOWED = {
  AVAILABLE:      ['RESERVED', 'OCCUPIED', 'MAINTENANCE', 'OUT_OF_SERVICE'],
  RESERVED:       ['AVAILABLE', 'OCCUPIED', 'CLEANING'],
  OCCUPIED:       ['CLEANING', 'AVAILABLE'],
  CLEANING:       ['AVAILABLE', 'MAINTENANCE'],
  MAINTENANCE:    ['AVAILABLE', 'OUT_OF_SERVICE'],
  OUT_OF_SERVICE: ['AVAILABLE'],
};

export function canTransition(from, to) {
  return ALLOWED[from]?.includes(to) ?? false;
}
