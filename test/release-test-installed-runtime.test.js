import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

test('release-test-installed-runtime CLI parser supports dashed flags and boolean switches', async () => {
  const mod = await import('../scripts/release/release-test-installed-runtime.mjs');
  const args = mod.__test_parseCliArgs([
    '--version-label', '0.0.4-beta.6',
    '--runtime-label', 'installed runtime',
    '--json-report-path', '/tmp/out.json',
    '--flag-only'
  ]);

  assert.equal(args['version-label'], '0.0.4-beta.6');
  assert.equal(args['runtime-label'], 'installed runtime');
  assert.equal(args['json-report-path'], '/tmp/out.json');
  assert.equal(args['flag-only'], 'true');
});

test('release-test-installed-runtime default config parameterizes report paths by version label', async () => {
  const mod = await import('../scripts/release/release-test-installed-runtime.mjs');
  const config = mod.__test_buildDefaultConfig({ versionLabel: '0.0.4-beta.6' });

  assert.match(config.markdownReportPath, /0-0-4-beta-6-release-test-report\.md$/);
  assert.match(config.jsonReportPath, /0-0-4-beta-6-release-test-report\.json$/);
  assert.equal(config.versionLabel, '0.0.4-beta.6');
  assert.equal(config.configPath, path.join(os.homedir(), '.synapse', 'config', 'synapse.config.json'));
});
