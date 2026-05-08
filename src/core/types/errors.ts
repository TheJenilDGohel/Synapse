/**
 * Base class for all Synapse-specific errors.
 */
export class SynapseError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: any) {
    super(message);
    this.name = 'SynapseError';
  }
}

export class DatabaseError extends SynapseError {
  constructor(message: string, details?: any) {
    super(message, 'DATABASE_ERROR', details);
  }
}

export class ValidationError extends SynapseError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends SynapseError {
  constructor(message: string, details?: any) {
    super(message, 'NOT_FOUND', details);
  }
}

export class CapacityError extends SynapseError {
  constructor(message: string, details?: any) {
    super(message, 'CAPACITY_EXCEEDED', details);
  }
}
