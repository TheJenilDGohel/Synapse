/**
 * Consistent output helpers for Loci CLI commands.
 *
 * Provides writeJson, writeError, writeSuccess, and writeStatus for
 * uniform machine-readable and human-friendly output.
 *
 * @module src/cli/output
 */

import { c, symbol } from './ansi.js';

/**
 * Write JSON data to stdout with pretty-print.
 */
export function writeJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

/**
 * Write an error message to stderr.
 */
export function writeError(msg: string): void {
  process.stderr.write(`${c.red('Error:')} ${msg}\n`);
}

/**
 * Write a success message to stdout.
 */
export function writeSuccess(msg: string): void {
  process.stdout.write(`${symbol.success()} ${msg}\n`);
}

/**
 * Write a status line (label + pass/fail indicator).
 */
export function writeStatus(label: string, ok: boolean): void {
  const icon = ok ? symbol.success() : symbol.error();
  const status = ok ? c.green('OK') : c.red('FAIL');
  process.stdout.write(`  ${icon} ${c.bold(label)}  ${c.dim(status)}\n`);
}
