#!/usr/bin/env node

import process from 'node:process';
import { SERVER_NAME, SERVER_VERSION } from '../../src/core/runtime/version.js';
import { c, symbol } from '../../src/interfaces/cli/ansi.js';

export { c, symbol };

export function hasHelpFlag(argv = process.argv.slice(2)) {
  return argv.includes('--help') || argv.includes('-h');
}

export function printTaskContextHelp() {
  console.log(c.bold('Loci task-context helper'));
  console.log('');
  console.log(c.bold('Usage:'));
  console.log(`  loci task-context ${c.cyan('--task')} "investigate issue" ${c.cyan('--project-path')} "/abs/project"`);
  console.log(`  loci task-context ${c.cyan('--query')} "search terms" ${c.cyan('--root-path')} "/abs/root"`);
  console.log(`  loci task-context ${c.cyan('--json')} '{"task":"investigate issue"}'`);
  console.log('');
  console.log(c.dim('Compatibility alias (deprecated):'));
  console.log(c.dim('  loci-task-context'));
  console.log('');
  console.log(c.bold('Options:'));
  console.log(`  ${c.cyan('--task')}=<text>            task description`);
  console.log(`  ${c.cyan('--query')}=<text>           recall query`);
  console.log(`  ${c.cyan('--project-path')}=<path>    project scope`);
  console.log(`  ${c.cyan('--root-path')}=<path>       root scope`);
  console.log(`  ${c.cyan('--branch-name')}=<name>     optional branch scope`);
  console.log(`  ${c.cyan('--topic')}=<text>           optional topic scope`);
  console.log(`  ${c.cyan('--feature')}=<text>         optional feature scope`);
  console.log(`  ${c.cyan('--kind')}=<text>            optional memory kind filter`);
  console.log(`  ${c.cyan('--limit')}=<n>              result limit`);
  console.log(`  ${c.cyan('--json')}=<json>            JSON input payload`);
}

export function printCaptureOutcomeHelp() {
  console.log(c.bold('Loci capture-outcome helper'));
  console.log('');
  console.log(c.bold('Usage:'));
  console.log(`  loci capture-outcome ${c.cyan('--task')} "fix issue" ${c.cyan('--status')} completed ${c.cyan('--summary')} "what changed"`);
  console.log(`  loci capture-outcome ${c.cyan('--json')} '{"task":"fix issue","summary":"what changed"}'`);
  console.log('');
  console.log(c.dim('Compatibility alias (deprecated):'));
  console.log(c.dim('  loci-capture-outcome'));
  console.log('');
  console.log(c.bold('Options:'));
  console.log(`  ${c.cyan('--task')}=<text>             task title`);
  console.log(`  ${c.cyan('--title')}=<text>            explicit event title`);
  console.log(`  ${c.cyan('--summary')}=<text>          short summary`);
  console.log(`  ${c.cyan('--details')}=<text>          longer detail text`);
  console.log(`  ${c.cyan('--content')}=<text>          explicit content body`);
  console.log(`  ${c.cyan('--status')}=<text>           task status`);
  console.log(`  ${c.cyan('--event-type')}=<text>       event type override`);
  console.log(`  ${c.cyan('--project-path')}=<path>     project scope`);
  console.log(`  ${c.cyan('--root-path')}=<path>        root scope`);
  console.log(`  ${c.cyan('--branch-name')}=<name>      optional branch scope`);
  console.log(`  ${c.cyan('--topic')}=<text>            optional topic scope`);
  console.log(`  ${c.cyan('--feature')}=<text>          optional feature scope`);
  console.log(`  ${c.cyan('--tags')}=<a,b,c>            tags list`);
  console.log(`  ${c.cyan('--files-changed')}=<n>       files changed count`);
  console.log(`  ${c.cyan('--has-tests')}=<true|false>  whether tests were added/run`);
  console.log(`  ${c.cyan('--json')}=<json>             JSON input payload`);
}

export function parseArg(argv, name) {
  const direct = `--${name}`;
  const prefixed = `${direct}=`;
  const index = argv.indexOf(direct);
  if (index !== -1) {
    return argv[index + 1] || '';
  }
  const item = argv.find((arg) => arg.startsWith(prefixed));
  return item ? item.slice(prefixed.length) : '';
}

export function parseBooleanArg(argv, name, fallback = false) {
  const value = parseArg(argv, name);
  if (!value) return fallback;
  return String(value).toLowerCase() === 'true';
}

export function parseNumberArg(argv, name, fallback = undefined) {
  const value = parseArg(argv, name);
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseCsvArg(argv, name) {
  const value = parseArg(argv, name);
  if (!value) return [];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

export async function readJsonInput(argv) {
  const argJson = parseArg(argv, 'json');
  if (argJson) return JSON.parse(argJson);
  if (process.stdin.isTTY) return {};

  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

function buildRuntimeSummary(runtime) {
  return {
    name: SERVER_NAME,
    version: SERVER_VERSION,
    mode: runtime.mcpMode,
    roots: runtime.roots,
    has_ripgrep: runtime.hasRipgrep,
    memory: {
      enabled: runtime.memoryEnabled,
      auto_capture: runtime.memoryAutoCapture,
      consent_done: runtime.memoryConsentDone
    },
    vector_index: {
      backend: runtime.indexBackend,
      requested_backend: runtime.indexBackend
    }
  };
}

export async function createMemoryWorkflow() {
  const { buildRuntimeConfig, installRuntimeWarningFilter } = await import('../../src/core/runtime/index.js');
  const { MemoryService, MemoryWorkflowService } = await import('../../src/core/engine/index.js');
  installRuntimeWarningFilter();
  const runtime = buildRuntimeConfig(process.env);
  const memory = new MemoryService({
    lociHome: runtime.lociHome,
    enabled: runtime.memoryEnabled,
    backend: runtime.memoryBackend,
    dbPath: runtime.memoryDbPath,
    autoCapture: runtime.memoryAutoCapture,
    consentDone: runtime.memoryConsentDone
  });
  const workflow = new MemoryWorkflowService({
    memory,
    getRuntimeSummary: async () => buildRuntimeSummary(runtime)
  });
  return { runtime, workflow };
}

export function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
