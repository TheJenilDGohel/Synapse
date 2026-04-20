/**
 * Dynamic MCP tool count for Synapse CLI displays.
 *
 * Counts registerJsonTool() registrations across all tool modules
 * at build time via static analysis. Falls back to manual count
 * if imports fail.
 *
 * @module src/cli/tool-count
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname: string = dirname(fileURLToPath(import.meta.url));
const TOOLS_DIR: string = join(__dirname, '..', 'mcp', 'tools');

/**
 * Count registerJsonTool() calls across all tool definition files.
 */
function countToolRegistrations(): number {
  try {
    const files = readdirSync(TOOLS_DIR).filter((f: string) => f.endsWith('.js') && f !== 'index.js');
    let total = 0;
    for (const file of files) {
      const src = readFileSync(join(TOOLS_DIR, file), 'utf8');
      const matches = src.match(/registerJsonTool\(/g);
      if (matches) total += matches.length;
    }
    return total || 72; // fallback
  } catch {
    return 72; // safe fallback
  }
}

/** Total number of MCP tools registered by Synapse. */
export const TOOL_COUNT: number = countToolRegistrations();
