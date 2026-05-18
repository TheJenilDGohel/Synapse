#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'loci-publint-'));
const npmCache = path.join(os.tmpdir(), '.npm-cache');
const isWindows = process.platform === 'win32';
const NPM_BIN = isWindows ? 'npm.cmd' : 'npm';

const pack = spawnSync(
  NPM_BIN,
  ['pack', '--pack-destination', tmpRoot, '--ignore-scripts', '--silent'],
  {
    encoding: 'utf8',
    // Windows: `.cmd` shims must be launched through a shell or spawn fails
    // silently with ENOENT/EINVAL. `shell: true` uses cmd.exe which knows
    // how to invoke the .cmd wrapper.
    shell: isWindows,
    env: {
      ...process.env,
      npm_config_cache: npmCache
    }
  }
);

if (pack.status !== 0 || pack.error) {
  if (pack.error) process.stderr.write(`[quality:package] npm pack spawn error: ${pack.error.message}\n`);
  if (pack.stdout?.trim()) process.stdout.write(pack.stdout);
  if (pack.stderr?.trim()) process.stderr.write(pack.stderr);
  process.exit(pack.status || 1);
}

const files = fs.readdirSync(tmpRoot).filter((f) => f.endsWith('.tgz'));
if (files.length === 0) {
  console.error(`[quality:package] no tarball generated under ${tmpRoot}`);
  process.exit(1);
}

const tarballPath = path.join(tmpRoot, files[0]);
const publintCmd = isWindows ? 'npx.cmd' : 'npx';
const lint = spawnSync(
  publintCmd,
  ['--no-install', 'publint', 'run', tarballPath, '--strict'],
  {
    encoding: 'utf8',
    shell: isWindows
  }
);

if (lint.stdout?.trim()) process.stdout.write(lint.stdout);
if (lint.stderr?.trim()) process.stderr.write(lint.stderr);
process.exit(lint.status || 0);
