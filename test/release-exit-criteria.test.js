import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('release-exit-criteria CLI parser supports flags', async () => {
  const mod = await import('../scripts/release/release-exit-criteria.mjs');
  const args = mod.__test_parseCliArgs([
    '--version-label', '0.0.4-beta.6',
    '--report-path', '/tmp/report.json',
    '--json'
  ]);

  assert.equal(args['version-label'], '0.0.4-beta.6');
  assert.equal(args['report-path'], '/tmp/report.json');
  assert.equal(args.json, 'true');
});

test('buildOutputPaths parameterizes exit criteria report paths by version label', async () => {
  const mod = await import('../scripts/release/release-exit-criteria.mjs');
  const out = mod.__test_buildOutputPaths({ versionLabel: '0.0.4-beta.6' });

  assert.match(out.markdownPath, /synapse-0-0-4-beta-6-exit-criteria\.md$/);
  assert.match(out.jsonPath, /synapse-0-0-4-beta-6-exit-criteria\.json$/);
});

test('verifySupportedClientTargets detects configured and missing real-style client configs', async () => {
  const mod = await import('../scripts/release/release-exit-criteria.mjs');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-exit-home-'));
  fs.mkdirSync(path.join(home, '.codex'), { recursive: true });
  fs.writeFileSync(path.join(home, '.codex', 'config.toml'), '[mcp_servers.synapse]\ncommand = "synapse"\n', 'utf8');
  fs.mkdirSync(path.join(home, '.cursor'), { recursive: true });
  fs.writeFileSync(path.join(home, '.cursor', 'mcp.json'), '{"mcpServers":{}}', 'utf8');

  const result = mod.__test_verifySupportedClientTargets({ homeDir: home });

  assert.equal(result.presentCount, 2);
  assert.equal(result.configuredCount, 1);
  assert.equal(result.allConfigured, false);
  assert.equal(result.items.find((item) => item.toolId === 'codex')?.configured, true);
  assert.equal(result.items.find((item) => item.toolId === 'cursor')?.configured, false);
});

test('evaluateExitCriteria reports blockers when report or supported client coverage is missing', async () => {
  const mod = await import('../scripts/release/release-exit-criteria.mjs');
  const supportedClients = {
    presentCount: 2,
    configuredCount: 1,
    allConfigured: false,
    items: []
  };
  const result = mod.__test_evaluateExitCriteria({
    report: null,
    reportPath: '/tmp/missing-report.json',
    supportedClients
  });

  assert.equal(result.ok, false);
  assert.equal(result.criteria.find((item) => item.id === 'installed_runtime_sweep')?.passed, false);
  assert.equal(result.criteria.find((item) => item.id === 'supported_client_auto_install')?.passed, false);
  assert.equal(result.criteria.find((item) => item.id === 'update_self_coverage')?.passed, true);
});
