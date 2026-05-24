import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DiagnosticService } from '../../../core/runtime/diagnostics.js';
import { c, symbol } from '../ansi.js';
import { SERVER_VERSION } from '../../../core/runtime/version.js';
import type { GlobalOptions } from '../options.js';

export async function run(args: string[], opts: GlobalOptions): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write('Synapse Status - Show server & database status\n\n');
    process.stdout.write('Usage:\n');
    process.stdout.write('  synapse status\n\n');
    process.stdout.write('Options:\n');
    process.stdout.write('  --help, -h  show this help\n');
    return;
  }

  const diag = new DiagnosticService();
  const doctor = await diag.runAll();
  const schemaCheck = doctor.checks.find(c => c.id === 'schema_version');
  const dbPathMatch = schemaCheck?.detail.match(/\((Database: (.*))\)/);
  const dbPath = dbPathMatch ? dbPathMatch[2] : 'unknown';

  let dbSize = 'unknown';
  if (dbPath !== 'unknown' && fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    dbSize = (stats.size / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // Try to get actual counts if possible
  try {
    const { DatabaseSync } = await import('node:sqlite');
    if (fs.existsSync(dbPath)) {
      const db = new DatabaseSync(dbPath);
      const entryRow = db.prepare('SELECT COUNT(*) AS c FROM memory_entries').get() as { c: number };
      const invRow = db.prepare("SELECT COUNT(*) AS c FROM memory_entries WHERE status = 'invalidated'").get() as { c: number };
      const kgNodes = db.prepare('SELECT COUNT(*) AS c FROM kg_entities').get() as { c: number };
      const kgEdges = db.prepare('SELECT COUNT(*) AS c FROM kg_triples').get() as { c: number };
      
      console.log(`
${c.bold('Synapse Status')}
${c.gray('──────────────────────────────────────────────────────')}
  ${c.bold('Version:')}    ${SERVER_VERSION}
  ${c.bold('Platform:')}   ${os.type()} ${os.arch()}
  ${c.bold('Database:')}   ${dbPath} (${dbSize})
  ${c.bold('Schema:')}     ${schemaCheck?.detail.split(' (')[0].replace('Schema version: ', '') || 'unknown'}

  ${c.bold('Memory:')}     ${entryRow?.c || 0} entries (${invRow?.c || 0} invalidated)
  ${c.bold('KG Nodes:')}   ${kgNodes?.c || 0}
  ${c.bold('KG Edges:')}   ${kgEdges?.c || 0}
${c.gray('──────────────────────────────────────────────────────')}
`);
      db.close();
    } else {
      console.log(`\n  ${symbol.info()} ${c.yellow('Database not yet initialized.')} Run 'synapse setup' or start a session.\n`);
    }
  } catch (err: any) {
    console.log(`\n  ${c.red('Error reading status:')} ${err?.message || err}\n`);
  }
}
