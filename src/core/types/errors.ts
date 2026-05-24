/**
 * Error message quality standard (Phase 6.2).
 * 
 * Template:
 * [synapse:component] What happened
 *   Why: The most likely reason
 *   Fix: The exact command or action to resolve it
 *   Docs: URL to relevant documentation
 */

export class SynapseError extends Error {
  public component: string;
  public why: string;
  public fix: string;
  public docs?: string;

  constructor(opts: {
    component: string;
    message: string;
    why: string;
    fix: string;
    docs?: string;
  }) {
    super(opts.message);
    this.name = 'SynapseError';
    this.component = opts.component;
    this.why = opts.why;
    this.fix = opts.fix;
    this.docs = opts.docs;
  }

  /**
   * Format error message for human consumption in CLI.
   */
  public format(): string {
    let out = `[synapse:${this.component}] ${this.message}\n`;
    out += `  Why: ${this.why}\n`;
    out += `  Fix: ${this.fix}`;
    if (this.docs) {
      out += `\n  Docs: ${this.docs}`;
    }
    return out;
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
