/**
 * Base class for all Loci-specific errors.
 */
export class LociError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: any) {
    super(message);
    this.name = 'LociError';
  }
}

export class DatabaseError extends LociError {
  constructor(message: string, details?: any) {
    super(message, 'DATABASE_ERROR', details);
  }
}

export class ValidationError extends LociError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends LociError {
  constructor(message: string, details?: any) {
    super(message, 'NOT_FOUND', details);
  }
}

export class CapacityError extends LociError {
  constructor(message: string, details?: any) {
    super(message, 'CAPACITY_EXCEEDED', details);
  }
}
