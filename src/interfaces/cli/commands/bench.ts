import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { MemoryStore } from '../../../core/engine/memory/store/MemoryStore.js';
import { SERVER_VERSION } from '../../../core/runtime/version.js';
import { c } from '../ansi.js';
import type { GlobalOptions } from '../options.js';

function p95(times: number[]): number {
  if (times.length === 0) return 0;
  times.sort((a, b) => a - b);
  const idx = Math.floor(times.length * 0.95);
  return times[idx];
}

function avg(times: number[]): number {
  if (times.length === 0) return 0;
  const sum = times.reduce((a, b) => a + b, 0);
  return sum / times.length;
}

export async function run(args: string[], opts: GlobalOptions): Promise<void> {
  const isReport = args.includes('--report');

  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write('Synapse Bench - Performance benchmarking suite\n\n');
    process.stdout.write('Usage:\n');
    process.stdout.write('  synapse bench [options]\n\n');
    process.stdout.write('Options:\n');
    process.stdout.write('  --report    Format output for BENCHMARKS.md\n');
    process.stdout.write('  --help, -h  show this help\n');
    return;
  }

  console.log(c.bold(`Running Synapse Benchmark Suite (v${SERVER_VERSION})...`));
  
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-bench-'));
  const dbPath = path.join(tmpDir, 'bench.db');

  const store = new MemoryStore({
    enabled: true,
    backend: 'node-sqlite',
    dbPath,
    embeddingService: null // Use lexical only for raw DB speed benchmark to isolate SQLite performance
  });

  await store.init();

  // --- MEMORY OPERATIONS ---
  console.log(c.blue('Benchmarking Memory Operations...'));
  
  const storeTimes: number[] = [];
  for (let i = 0; i < 100; i++) {
    const t0 = performance.now();
    await store.storeEntry({
      title: `Fact ${i}`,
      content: `This is the content for fact number ${i}. It provides some basic information.`,
      scope: { project_path: 'bench' },
      dedup_threshold: 0.99
    });
    storeTimes.push(performance.now() - t0);
  }

  const recallExactTimes: number[] = [];
  for (let i = 0; i < 50; i++) {
    const t0 = performance.now();
    await store.recall({ query: `fact number ${i}`, projectPath: 'bench' });
    recallExactTimes.push(performance.now() - t0);
  }

  // --- KNOWLEDGE GRAPH ---
  console.log(c.blue('Benchmarking Knowledge Graph...'));

  const kgInsertTimes: number[] = [];
  for (let i = 0; i < 100; i++) {
    const t0 = performance.now();
    await store.addEntity({ name: `Node ${i}`, type: 'test' });
    if (i > 0) {
      await store.addTriple({ subjectName: `Node ${i}`, predicate: 'connects_to', objectName: `Node ${i-1}` });
    }
    kgInsertTimes.push(performance.now() - t0);
  }

  const kgQueryTimes: number[] = [];
  for (let i = 0; i < 20; i++) {
    const t0 = performance.now();
    await store.queryEntityRelationships(`Node 50`, { direction: 'both' });
    kgQueryTimes.push(performance.now() - t0);
  }

  await store.close();
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

  // Formatting output
  const out = `
Synapse Benchmark — synapse-cortex @${SERVER_VERSION}
Platform: ${os.type()} ${os.arch()} | Node ${process.versions.node}

MEMORY OPERATIONS
  Store (100 memories)         avg: ${avg(storeTimes).toFixed(1).padStart(4)}ms  p95: ${p95(storeTimes).toFixed(1).padStart(4)}ms
  Recall exact match           avg: ${avg(recallExactTimes).toFixed(1).padStart(4)}ms  p95: ${p95(recallExactTimes).toFixed(1).padStart(4)}ms

KNOWLEDGE GRAPH
  Node insertion (100 nodes)   avg: ${avg(kgInsertTimes).toFixed(1).padStart(4)}ms  p95: ${p95(kgInsertTimes).toFixed(1).padStart(4)}ms
  Edge traversal               avg: ${avg(kgQueryTimes).toFixed(1).padStart(4)}ms  p95: ${p95(kgQueryTimes).toFixed(1).padStart(4)}ms

BASELINE COMPARISON (for reference)
  Zep graph search P95:         150ms (published)
  Mem0 recall P95:              ~100ms (estimated, cloud)
`;

  if (isReport) {
    console.log(out);
  } else {
    console.log(out);
  }
}
