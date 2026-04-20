import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { UpdateService, compareVersions } from '../src/services/update/index.js';
import { buildLocalnestPaths } from '../src/runtime/home-layout.js';

function makeTempHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-update-test-'));
}

test('compareVersions handles stable and prerelease ordering', () => {
  assert.equal(compareVersions('0.0.4', '0.0.3'), 1);
  assert.equal(compareVersions('0.0.3', '0.0.3'), 0);
  assert.equal(compareVersions('0.0.3-beta.1', '0.0.3'), -1);
  assert.equal(compareVersions('0.0.3-beta.2', '0.0.3-beta.1'), 1);
  // Regression guard: a future refactor must NOT regress to lexicographic
  // string compare ("0.1.0" < "0.0.3" lexicographically, which is wrong).
  assert.equal(compareVersions('0.1.0', '0.0.3'), 1);
  assert.equal(compareVersions('0.0.3', '0.1.0'), -1);
  assert.equal(compareVersions('0.10.0', '0.2.0'), 1);
});

test('getStatus fetches npm live result and then serves cache while fresh', async () => {
  const home = makeTempHome();
  let calls = 0;
  const service = new UpdateService({
    synapseHome: home,
    packageName: 'synapse-mcp',
    currentVersion: '0.0.3',
    checkIntervalMinutes: 120,
    failureBackoffMinutes: 15,
    commandRunner: () => {
      calls += 1;
      return { status: 0, stdout: '"0.0.5"\n', stderr: '' };
    }
  });

  const live = await service.getStatus({ force: true });
  assert.equal(calls, 1);
  assert.equal(live.latest_version, '0.0.5');
  assert.equal(live.is_outdated, true);
  assert.equal(live.source, 'live');
  assert.equal(live.recommendation, 'update_available');
  assert.equal(live.can_attempt_update, true);
  assert.equal(live.using_cached_data, false);
  assert.ok(live.next_check_at);
  assert.ok(fs.existsSync(buildLocalnestPaths(home).updateStatusPath));

  const cached = await service.getStatus({ force: false });
  assert.equal(calls, 1);
  assert.equal(cached.source, 'cache');
  assert.equal(cached.using_cached_data, true);
});

test('getStatus can check beta channel via npm dist-tags', async () => {
  const home = makeTempHome();
  const calls = [];
  const service = new UpdateService({
    synapseHome: home,
    packageName: 'synapse-mcp',
    currentVersion: '0.0.4-beta.8',
    checkIntervalMinutes: 120,
    failureBackoffMinutes: 15,
    commandRunner: (command, args) => {
      calls.push([command, ...args]);
      return { status: 0, stdout: '"0.0.4-beta.10"\n', stderr: '' };
    }
  });

  const out = await service.getStatus({ force: true, channel: 'beta' });
  assert.equal(out.update_channel, 'beta');
  assert.equal(out.latest_version, '0.0.4-beta.10');
  assert.equal(out.is_outdated, true);
  assert.ok(calls.some((parts) => parts.includes('dist-tags.beta')));
});

test('getStatus falls back to cache on npm failure', async () => {
  const home = makeTempHome();
  const cachePath = buildLocalnestPaths(home).updateStatusPath;
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, `${JSON.stringify({
    package_name: 'synapse-mcp',
    current_version: '0.0.3',
    latest_version: '0.0.4',
    is_outdated: true,
    last_checked_at: '2000-01-01T00:00:00.000Z',
    last_check_ok: true
  }, null, 2)}\n`, 'utf8');

  const service = new UpdateService({
    synapseHome: home,
    packageName: 'synapse-mcp',
    currentVersion: '0.0.3',
    checkIntervalMinutes: 120,
    failureBackoffMinutes: 15,
    commandRunner: () => ({ status: 1, stdout: '', stderr: 'network error' })
  });

  const out = await service.getStatus({ force: true });
  assert.equal(out.source, 'cache-fallback');
  assert.equal(out.is_outdated, true);
  assert.equal(out.last_check_ok, false);
  assert.equal(out.using_cached_data, true);
  assert.equal(out.recommendation, 'update_available');
  assert.match(out.error, /network error/);
});

test('getStatus stays informative when npm fails without cache', async () => {
  const home = makeTempHome();
  const service = new UpdateService({
    synapseHome: home,
    packageName: 'synapse-mcp',
    currentVersion: '0.0.4-beta.6',
    checkIntervalMinutes: 120,
    failureBackoffMinutes: 15,
    commandRunner: () => ({ status: 1, stdout: '', stderr: 'offline' })
  });

  const out = await service.getStatus({ force: true });
  assert.equal(out.source, 'error');
  assert.equal(out.current_version, '0.0.4-beta.6');
  assert.equal(out.latest_version, '0.0.4-beta.6');
  assert.equal(out.is_outdated, false);
  assert.equal(out.can_attempt_update, false);
  assert.equal(out.recommendation, 'retry_later');
  assert.equal(out.using_cached_data, false);
  assert.match(out.error, /offline/);
});

test('getCachedStatus returns informative fallback without npm access', () => {
  const home = makeTempHome();
  const service = new UpdateService({
    synapseHome: home,
    packageName: 'synapse-mcp',
    currentVersion: '0.0.4-beta.6',
    checkIntervalMinutes: 120,
    failureBackoffMinutes: 15,
    commandRunner: () => {
      throw new Error('should not run');
    }
  });

  const out = service.getCachedStatus();
  assert.equal(out.source, 'uninitialized');
  assert.equal(out.current_version, '0.0.4-beta.6');
  assert.equal(out.latest_version, '0.0.4-beta.6');
  assert.equal(out.is_outdated, false);
  assert.equal(out.using_cached_data, false);
  assert.equal(out.recommendation, 'up_to_date');
});

test('getCachedStatus overrides stale cached current_version with installed runtime version', () => {
  const home = makeTempHome();
  const cachePath = buildLocalnestPaths(home).updateStatusPath;
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, `${JSON.stringify({
    package_name: 'synapse-mcp',
    current_version: '0.0.4',
    latest_version: '0.0.3',
    is_outdated: false,
    last_checked_at: '2000-01-01T00:00:00.000Z',
    last_check_ok: true
  }, null, 2)}\n`, 'utf8');

  const service = new UpdateService({
    synapseHome: home,
    packageName: 'synapse-mcp',
    currentVersion: '0.0.4-beta.8',
    checkIntervalMinutes: 120,
    failureBackoffMinutes: 15,
    commandRunner: () => {
      throw new Error('should not run');
    }
  });

  const out = service.getCachedStatus();
  // current_version always reflects the running binary
  assert.equal(out.current_version, '0.0.4-beta.8');
  // Version drift detected -> neutralize stale latest_version to the running
  // binary and flag stale so the next refresh cycle can update it.
  assert.equal(out.latest_version, '0.0.4-beta.8');
  assert.equal(out.is_outdated, false);
  assert.equal(out.stale, true);
});

test('selfUpdate requires explicit approval', async () => {
  const home = makeTempHome();
  const service = new UpdateService({
    synapseHome: home,
    packageName: 'synapse-mcp',
    currentVersion: '0.0.3',
    checkIntervalMinutes: 120,
    failureBackoffMinutes: 15,
    commandRunner: () => ({ status: 0, stdout: '', stderr: '' })
  });

  const out = await service.selfUpdate({ approvedByUser: false });
  assert.equal(out.ok, false);
  assert.equal(out.reason, 'approval_required');
});

test('selfUpdate runs install and skill sync when approved', async () => {
  const home = makeTempHome();
  const calls = [];
  const service = new UpdateService({
    synapseHome: home,
    packageName: 'synapse-mcp',
    currentVersion: '0.0.3',
    checkIntervalMinutes: 120,
    failureBackoffMinutes: 15,
    commandRunner: (command, args) => {
      calls.push([command, ...args].join(' '));
      if (args[0] === 'view') return { status: 0, stdout: '"0.0.6"\n', stderr: '' };
      return { status: 0, stdout: 'ok', stderr: '' };
    }
  });

  const out = await service.selfUpdate({
    approvedByUser: true,
    version: 'latest',
    reinstallSkill: true
  });

  assert.equal(out.ok, true);
  assert.equal(out.restart_required, true);
  assert.ok(calls.some((line) => line.includes('install -g synapse-mcp@latest')));
  // Cross-platform: command binary is `synapse` on POSIX and `synapse.cmd`
  // on Windows (per src/services/update/helpers.ts). Match either.
  assert.ok(calls.some((line) => /\bsynapse(?:\.cmd)? install skills --force\b/.test(line)));
});

test('selfUpdate beta channel installs npm beta tag and refreshes beta status', async () => {
  const home = makeTempHome();
  const calls = [];
  const service = new UpdateService({
    synapseHome: home,
    packageName: 'synapse-mcp',
    currentVersion: '0.0.4-beta.8',
    checkIntervalMinutes: 120,
    failureBackoffMinutes: 15,
    commandRunner: (command, args) => {
      const line = [command, ...args].join(' ');
      calls.push(line);
      if (args[0] === 'view' && args.includes('dist-tags.beta')) return { status: 0, stdout: '"0.0.4-beta.10"\n', stderr: '' };
      return { status: 0, stdout: 'ok', stderr: '' };
    }
  });

  const out = await service.selfUpdate({
    approvedByUser: true,
    version: 'beta',
    reinstallSkill: true
  });

  assert.equal(out.ok, true);
  assert.equal(out.update_status.update_channel, 'beta');
  assert.ok(calls.some((line) => line.includes('install -g synapse-mcp@beta')));
  assert.ok(calls.some((line) => line.includes('view synapse-mcp dist-tags.beta --json')));
});

test('selfUpdate dry-run does not execute commands', async () => {
  const home = makeTempHome();
  const calls = [];
  const service = new UpdateService({
    synapseHome: home,
    packageName: 'synapse-mcp',
    currentVersion: '0.0.3',
    checkIntervalMinutes: 120,
    failureBackoffMinutes: 15,
    commandRunner: (command, args) => {
      calls.push([command, ...args].join(' '));
      return { status: 0, stdout: '', stderr: '' };
    }
  });

  const out = await service.selfUpdate({
    approvedByUser: true,
    dryRun: true
  });

  assert.equal(out.ok, true);
  assert.equal(out.dry_run, true);
  assert.equal(Array.isArray(out.validation?.checks), true);
  assert.equal(out.validation.ok, true);
  assert.ok(Array.isArray(out.planned_commands));
  assert.ok(out.planned_commands.length >= 1);
  // Cross-platform: binary names are `npm`/`synapse` on POSIX and
  // `npm.cmd`/`synapse.cmd` on Windows. Match either.
  assert.ok(calls.some((line) => /\bnpm(?:\.cmd)? --help\b/.test(line)));
  assert.ok(calls.some((line) => /\bsynapse(?:\.cmd)? install skills --help\b/.test(line)));
});

test('selfUpdate dry-run reports validation failures without mutating', async () => {
  const home = makeTempHome();
  const service = new UpdateService({
    synapseHome: home,
    packageName: 'synapse-mcp',
    currentVersion: '0.0.3',
    checkIntervalMinutes: 120,
    failureBackoffMinutes: 15,
    commandRunner: (command) => {
      if (String(command).includes('synapse')) {
        return { status: 1, stdout: '', stderr: 'missing' };
      }
      return { status: 0, stdout: '', stderr: '' };
    }
  });

  const out = await service.selfUpdate({
    approvedByUser: true,
    dryRun: true,
    reinstallSkill: true
  });

  assert.equal(out.ok, false);
  assert.equal(out.dry_run, true);
  assert.equal(out.skipped, true);
  assert.equal(out.validation.ok, false);
  assert.equal(out.validation.checks.length, 2);
  assert.match(out.validation.checks[1].stderr, /missing/);
});

test('selfUpdate reports npm install failure and stops before skill sync', async () => {
  const home = makeTempHome();
  const calls = [];
  const service = new UpdateService({
    synapseHome: home,
    packageName: 'synapse-mcp',
    currentVersion: '0.0.3',
    checkIntervalMinutes: 120,
    failureBackoffMinutes: 15,
    commandRunner: (command, args) => {
      calls.push([command, ...args].join(' '));
      return { status: 1, stdout: '', stderr: 'permission denied' };
    }
  });

  const out = await service.selfUpdate({
    approvedByUser: true,
    version: 'latest',
    reinstallSkill: true
  });

  assert.equal(out.ok, false);
  assert.equal(out.step, 'npm_install');
  assert.equal(calls.length, 1);
  assert.match(out.install.stderr, /permission denied/);
});

test('selfUpdate reports skill sync failure after successful install', async () => {
  const home = makeTempHome();
  const calls = [];
  const service = new UpdateService({
    synapseHome: home,
    packageName: 'synapse-mcp',
    currentVersion: '0.0.3',
    checkIntervalMinutes: 120,
    failureBackoffMinutes: 15,
    commandRunner: (command, args) => {
      const line = [command, ...args].join(' ');
      calls.push(line);
      // Cross-platform: command is 'npm' on POSIX and 'npm.cmd' on Windows.
      if (String(command).startsWith('npm') && args[0] === 'install') {
        return { status: 0, stdout: 'installed', stderr: '' };
      }
      if (String(command).includes('synapse')) {
        return { status: 1, stdout: '', stderr: 'sync failed' };
      }
      return { status: 0, stdout: '"0.0.3"\n', stderr: '' };
    }
  });

  const out = await service.selfUpdate({
    approvedByUser: true,
    version: 'latest',
    reinstallSkill: true
  });

  assert.equal(out.ok, false);
  assert.equal(out.step, 'skill_sync');
  assert.equal(calls.length, 2);
  assert.match(out.skill_sync.stderr, /sync failed/);
});

test('getStatus invalidates cache when current_version advances past cached latest_version', async () => {
  const home = makeTempHome();
  const cachePath = buildLocalnestPaths(home).updateStatusPath;
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  // Simulate: 30 days ago, the user was running 0.0.3 and latest was 0.0.3.
  fs.writeFileSync(cachePath, `${JSON.stringify({
    package_name: 'synapse-mcp',
    current_version: '0.0.3',
    latest_version: '0.0.3',
    update_channel: 'stable',
    is_outdated: false,
    last_checked_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    last_check_ok: true
  }, null, 2)}\n`, 'utf8');

  let npmCalls = 0;
  const service = new UpdateService({
    synapseHome: home,
    packageName: 'synapse-mcp',
    currentVersion: '0.1.0', // user has since upgraded locally
    checkIntervalMinutes: 60,
    failureBackoffMinutes: 15,
    commandRunner: () => {
      npmCalls += 1;
      return { status: 0, stdout: '"0.1.0"\n', stderr: '' };
    }
  });

  // force:false must STILL trigger a refresh because current_version drifted,
  // even though the cache TTL alone would not be enough (cache is 30 days old
  // but the old bug treated age-based staleness as the only signal to refresh).
  const out = await service.getStatus({ force: false });
  assert.equal(npmCalls, 1, 'version drift must force a refresh even when time-fresh');
  assert.equal(out.current_version, '0.1.0');
  assert.equal(out.latest_version, '0.1.0');
  assert.equal(out.is_outdated, false);
  assert.equal(out.source, 'live');
});

test('getCachedStatus neutralizes stale latest_version when current_version drifted', () => {
  const home = makeTempHome();
  const cachePath = buildLocalnestPaths(home).updateStatusPath;
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  // Fresh timestamp so the ONLY stale signal is the current_version drift.
  fs.writeFileSync(cachePath, `${JSON.stringify({
    package_name: 'synapse-mcp',
    current_version: '0.0.3',
    latest_version: '0.0.3',
    update_channel: 'stable',
    is_outdated: false,
    last_checked_at: new Date().toISOString(),
    last_check_ok: true
  }, null, 2)}\n`, 'utf8');

  const service = new UpdateService({
    synapseHome: home,
    packageName: 'synapse-mcp',
    currentVersion: '0.1.0',
    checkIntervalMinutes: 60,
    failureBackoffMinutes: 15,
    commandRunner: () => {
      throw new Error('getCachedStatus must not invoke npm');
    }
  });

  const snapshot = service.getCachedStatus();
  assert.equal(snapshot.current_version, '0.1.0');
  assert.equal(snapshot.latest_version, '0.1.0', 'must not surface pre-upgrade latest_version');
  assert.equal(snapshot.is_outdated, false);
  assert.equal(snapshot.stale, true, 'must flag as stale so warmCheck refreshes');
  assert.equal(snapshot.source, 'cache');
});
