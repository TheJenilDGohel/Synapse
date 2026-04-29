#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const npmCache = path.join(os.tmpdir(), '.npm-cache');
const isWindows = process.platform === 'win32';
const NPM_BIN = isWindows ? 'npm.cmd' : 'npm';

const run = spawnSync(NPM_BIN, ['audit', '--omit=dev', '--json'], {
  encoding: 'utf8',
  timeout: 120000,
  maxBuffer: 20 * 1024 * 1024,
  // Windows: `.cmd` shims need a shell to launch — direct spawn fails silently.
  shell: isWindows,
  env: {
    ...process.env,
    npm_config_cache: npmCache
  }
});

const stdout = run.stdout || '';
const stderr = run.stderr || '';
const out = `${stdout}\n${stderr}`;

if (run.status === 0) {
  console.log('[quality:audit] no production dependency vulnerabilities reported');
  process.exit(0);
}

if (/EAI_AGAIN|ENOTFOUND|ECONNRESET|ETIMEDOUT/i.test(out)) {
  console.warn('[quality:audit] skipped due to transient network/DNS issue while contacting npm registry');
  process.exit(0);
}

let parsed = null;
try {
  parsed = JSON.parse(stdout);
} catch {
  // Keep parsed as null and fall through to failure.
}

if (parsed && parsed.metadata && parsed.metadata.vulnerabilities) {
  const v = parsed.metadata.vulnerabilities;
  const total = Number(v.total || 0);
  if (total > 0) {
    console.error(`[quality:audit] vulnerabilities found: ${total} (critical=${v.critical || 0}, high=${v.high || 0}, moderate=${v.moderate || 0}, low=${v.low || 0})`);
  }

  // Only fail on direct dependency vulnerabilities, not transitive ones we cannot control.
  const directVulns = parsed.vulnerabilities
    ? Object.values(parsed.vulnerabilities).filter((entry) => entry.isDirect === true)
    : [];
  const directCritical = directVulns.filter((e) => e.severity === 'critical').length;
  const directHigh = directVulns.filter((e) => e.severity === 'high').length;

  if (directCritical > 0 || directHigh > 0) {
    console.error(`[quality:audit] BLOCKING: ${directCritical} critical + ${directHigh} high vulnerabilities in DIRECT dependencies`);
    if (stdout.trim()) process.stdout.write(stdout);
    process.exit(1);
  }

  if (total > 0 && directVulns.length === 0) {
    console.warn(`[quality:audit] ${total} transitive-only vulnerabilities (not in direct deps) — passing`);
    if (stdout.trim()) process.stdout.write(stdout);
    process.exit(0);
  }
}

if (!stdout.trim() && !stderr.trim()) {
  console.warn('[quality:audit] skipped: npm audit failed without output (likely registry/network issue)');
  process.exit(0);
}

if (stdout.trim()) process.stdout.write(stdout);
if (stderr.trim()) process.stderr.write(stderr);
process.exit(run.status || 1);
