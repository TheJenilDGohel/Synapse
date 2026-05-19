/**
 * Synapse Setup CLI command.
 * 
 * Bridges to the setup script for backward compatibility while 
 * completing the CLI unification.
 * 
 * @module src/cli/commands/setup
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import type { GlobalOptions } from '../options.js';

export async function run(args: string[], _opts: GlobalOptions): Promise<void> {
  const thisFile = fileURLToPath(import.meta.url);
  const projectRoot = path.resolve(path.dirname(thisFile), '..', '..', '..', '..');
  const scriptPath = path.join(projectRoot, 'scripts', 'runtime', 'setup-synapse.mjs');

  // Forward arguments by updating process.argv
  // Usage: synapse setup --paths="/abs/path"
  // process.argv becomes [node, bin/synapse.js, setup, --paths="/abs/path"]
  // But we want the script to see its own name or a consistent argv structure.
  
  // Actually, we can just import it.
  await import(pathToFileURL(scriptPath).href);
}
