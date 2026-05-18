/**
 * Loci Upgrade CLI command.
 * 
 * Bridges to the upgrade script for backward compatibility.
 * 
 * @module src/cli/commands/upgrade
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import type { GlobalOptions } from '../options.js';

export async function run(args: string[], _opts: GlobalOptions): Promise<void> {
  const thisFile = fileURLToPath(import.meta.url);
  const projectRoot = path.resolve(path.dirname(thisFile), '..', '..', '..', '..');
  const scriptPath = path.join(projectRoot, 'scripts', 'runtime', 'upgrade-loci.mjs');

  await import(pathToFileURL(scriptPath).href);
}
