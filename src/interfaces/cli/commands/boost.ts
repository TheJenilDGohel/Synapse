/**
 * command: synapse boost
 *
 * Re-generates or updates .cursorrules and .clauderules in the current directory
 * to ensure AI agents prioritize Synapse for context retrieval.
 */

import fs from 'node:fs';
import path from 'node:path';
import { c, symbol } from '../ansi.js';
import type { GlobalOptions } from '../options.js';

export async function run(_args: string[], _opts: GlobalOptions): Promise<void> {
  const cwd = process.cwd();
  const rules = [
    { name: '.cursorrules', label: 'Cursor Rules' },
    { name: '.clauderules', label: 'Claude Rules' },
  ];

  const directive = `
# Synapse Priority Directive

Synapse is your primary context and memory layer.
- Before starting a task, ALWAYS recall relevant memories using \`/synapse:recall\`.
- If you learn something significant, ALWAYS use \`/synapse:remember\`.
- Maintain the architectural integrity described in the project's knowledge base.
`.trim();

  process.stdout.write(`\n  ${c.bold('Synapse Priority Boost')}\n`);
  process.stdout.write(`  ${c.gray('----------------------')}\n\n`);

  let created = 0;
  for (const rule of rules) {
    const filePath = path.join(cwd, rule.name);
    try {
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, `${directive}\n`, 'utf8');
        process.stdout.write(`  ${c.green(c.B.check)} Created ${c.cyan(rule.name)}\n`);
        created += 1;
      } else {
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.includes('Synapse Priority Directive')) {
          fs.appendFileSync(filePath, `\n${directive}\n`, 'utf8');
          process.stdout.write(`  ${c.green(c.B.check)} Updated ${c.cyan(rule.name)} with priority directive\n`);
          created += 1;
        } else {
          process.stdout.write(`  ${c.gray(c.B.circle)} ${c.cyan(rule.name)} already has priority directive\n`);
        }
      }
    } catch (err) {
      process.stderr.write(`  ${c.red(c.B.cross)} Failed to write ${rule.name}: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  process.stdout.write(`\n  ${c.green('Done!')} Your AI agents are now boosted for this project.\n\n`);
}
