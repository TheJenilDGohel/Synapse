/**
 * Thin ora spinner wrapper for Synapse CLI.
 *
 * Auto-disables in non-TTY environments and when NO_COLOR is set.
 * Returns an ora instance with .succeed(), .fail(), .stop() etc.
 *
 * @module src/cli/spinner
 */

import ora from 'ora';
import type { Ora } from 'ora';
import { useColor } from './ansi.js';

/**
 * Start an ora spinner with the given text.
 * Automatically disables when stdout is not a TTY or NO_COLOR is set.
 */
export function startSpinner(text: string): Ora {
  const isTTY = process.stdout.isTTY === true;
  const colorEnabled = useColor();

  return ora({
    text,
    color: 'cyan',
    isEnabled: isTTY && colorEnabled && process.env.AI_AGENT !== 'true',
    stream: process.stdout,
  }).start();
}
