/**
 * Self-test CLI command for Synapse.
 *
 *   synapse selftest [--json]
 *
 * Runs end-to-end validation of the full pipeline:
 *   Runtime, Memory, Knowledge Graph, Taxonomy, Dedup,
 *   Embeddings, File search, Skills, Hooks.
 *
 * @module src/cli/commands/selftest
 */

import { EmbeddingService, MemoryService } from '../../../core/engine/index.js';
import { SERVER_VERSION } from '../../../core/runtime/version.js';
import { c, symbol, boxTop, boxBottom, boxLine, separator } from '../ansi.js';
import { startSpinner } from '../spinner.js';
import type { Ora } from 'ora';
import type { GlobalOptions } from '../options.js';
import {
  type CheckResult,
  formatLine,
  createServices,
  checkRuntime,
  checkMemoryBackend,
  checkMemoryCrud,
  checkKnowledgeGraph,
  checkTaxonomy,
  checkDedup,
  checkEmbeddings,
  checkAstChunking,
  checkFileSearch,
  checkSkills,
  checkHooks,
} from './selftest-checks.js';

export async function run(args: string[], opts: GlobalOptions): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write('Synapse Self-Test - End-to-end system validation\n\n');
    process.stdout.write('Usage:\n');
    process.stdout.write('  synapse selftest [options]\n\n');
    process.stdout.write('Options:\n');
    process.stdout.write('  --json      output results as JSON\n');
    process.stdout.write('  --help, -h  show this help\n');
    return;
  }

  const jsonOutput = opts.json || args.includes('--json');

  const results: CheckResult[] = [];
  const useSpinners = !jsonOutput;

  // 1. Runtime
  let sp: Ora | null = useSpinners ? startSpinner('Checking runtime config...') : null;
  const runtimeResult = await checkRuntime();
  results.push(runtimeResult);
  if (sp) { runtimeResult.status === 'pass' ? sp.succeed('Runtime config') : sp.fail('Runtime config'); }

  const runtime = runtimeResult.runtime;
  let memoryService: MemoryService | null = null;
  let embeddingService: EmbeddingService | null = null;

  if (runtime) {
    try {
      const svcs = createServices(runtime);
      memoryService = svcs.memoryService;
      embeddingService = svcs.embeddingService;
    } catch { /* services unavailable */ }
  }

  // 2. Memory backend
  sp = useSpinners ? startSpinner('Checking memory backend...') : null;
  if (memoryService) {
    results.push(await checkMemoryBackend(memoryService));
  } else {
    results.push({ name: 'Memory backend', status: 'fail', detail: 'runtime config failed' });
  }
  if (sp) { results[1].status === 'pass' ? sp.succeed('Memory backend') : sp.fail('Memory backend'); }

  // 3. Memory CRUD
  sp = useSpinners ? startSpinner('Testing memory CRUD...') : null;
  if (memoryService && results[1].status === 'pass') {
    results.push(await checkMemoryCrud(memoryService));
  } else {
    results.push({ name: 'Memory CRUD', status: 'fail', detail: 'database not available' });
  }
  if (sp) { results[2].status === 'pass' ? sp.succeed('Memory CRUD') : sp.fail('Memory CRUD'); }

  // 4. Knowledge Graph
  sp = useSpinners ? startSpinner('Testing knowledge graph...') : null;
  if (memoryService && results[1].status === 'pass') {
    results.push(await checkKnowledgeGraph(memoryService));
  } else {
    results.push({ name: 'Knowledge Graph', status: 'fail', detail: 'database not available' });
  }
  if (sp) { results[3].status === 'pass' ? sp.succeed('Knowledge Graph') : sp.fail('Knowledge Graph'); }

  // 5. Taxonomy
  sp = useSpinners ? startSpinner('Testing taxonomy...') : null;
  if (memoryService && results[1].status === 'pass') {
    results.push(await checkTaxonomy(memoryService));
  } else {
    results.push({ name: 'Taxonomy', status: 'fail', detail: 'database not available' });
  }
  if (sp) { results[4].status === 'pass' ? sp.succeed('Taxonomy') : sp.fail('Taxonomy'); }

  // 6. Dedup
  sp = useSpinners ? startSpinner('Testing deduplication...') : null;
  if (memoryService && results[1].status === 'pass') {
    results.push(await checkDedup(memoryService));
  } else {
    results.push({ name: 'Dedup', status: 'fail', detail: 'database not available' });
  }
  if (sp) { results[5].status === 'pass' ? sp.succeed('Dedup') : (results[5].status === 'warn' ? sp.warn('Dedup') : sp.fail('Dedup')); }

  // 7. Embeddings
  sp = useSpinners ? startSpinner('Testing embeddings...') : null;
  if (embeddingService) {
    results.push(await checkEmbeddings(embeddingService));
  } else {
    results.push({ name: 'Embeddings', status: 'warn', detail: 'embedding service not available' });
  }
  if (sp) { results[6].status === 'pass' ? sp.succeed('Embeddings') : sp.warn('Embeddings'); }

  // 8. AST chunking
  sp = useSpinners ? startSpinner('Checking AST chunking...') : null;
  results.push(await checkAstChunking());
  if (sp) { results[7].status === 'pass' ? sp.succeed('AST chunking') : sp.warn('AST chunking'); }

  // 9. File search
  sp = useSpinners ? startSpinner('Checking file search...') : null;
  results.push(checkFileSearch());
  if (sp) { results[8].status === 'pass' ? sp.succeed('File search') : sp.warn('File search'); }

  // 10. Skills
  sp = useSpinners ? startSpinner('Checking skills...') : null;
  results.push(checkSkills());
  if (sp) { results[9].status === 'pass' ? sp.succeed('Skills') : sp.warn('Skills'); }

  // 11. Hooks
  sp = useSpinners ? startSpinner('Checking hooks...') : null;
  results.push(checkHooks());
  if (sp) { results[10].status === 'pass' ? sp.succeed('Hooks') : sp.fail('Hooks'); }

  // -- Output --
  if (jsonOutput) {
    const passed = results.filter(r => r.status === 'pass').length;
    const warnings = results.filter(r => r.status === 'warn').length;
    const failed = results.filter(r => r.status === 'fail').length;
    process.stdout.write(JSON.stringify({
      version: SERVER_VERSION,
      total: results.length,
      passed,
      warnings,
      failed,
      checks: results.map(r => ({ name: r.name, status: r.status, detail: r.detail })),
    }, null, 2) + '\n');
    return;
  }

  const lines: string[] = [];

  process.stdout.write(`\n  ${c.bold('Synapse Self-Check')}  ${c.gray(`v${SERVER_VERSION}`)}\n`);
  process.stdout.write(`  ${c.dim('Running system diagnostics and integration tests...')}\n\n`);

  for (const r of results) {
    lines.push(formatLine(r));
  }

  process.stdout.write(lines.join('\n') + '\n\n');
  process.stdout.write(separator() + '\n');

  const passed = results.filter(r => r.status === 'pass').length;
  const warned = results.filter(r => r.status === 'warn').length;
  const failed = results.filter(r => r.status === 'fail').length;

  process.stdout.write(`  ${c.bold('Summary')}\n`);
  process.stdout.write(`  ${c.green(`${passed} passed`)}, ${c.red(`${failed} failed`)}, ${c.yellow(`${warned} warnings`)}\n\n`);

  if (failed > 0) {
    process.stdout.write(`  ${c.red('FAILED')}: Self-check encountered critical issues.\n\n`);
  } else if (warned > 0) {
    process.stdout.write(`  ${c.yellow('PASSED WITH WARNINGS')}: System is operational but needs attention.\n\n`);
  } else {
    process.stdout.write(`  ${c.green('PASSED')}: System is healthy.\n\n`);
  }
}
