import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildLocalnestServerConfig,
  detectAiToolTargets,
  installLocalnestIntoDetectedClients
} from '../src/setup/client-installer.js';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-client-installer-test-'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

test('detectAiToolTargets reports supported and unsupported local tools', () => {
  const homeDir = makeTempDir();
  fs.mkdirSync(path.join(homeDir, '.codex'), { recursive: true });
  fs.mkdirSync(path.join(homeDir, '.cursor'), { recursive: true });
  fs.mkdirSync(path.join(homeDir, '.gemini', 'antigravity'), { recursive: true });
  fs.mkdirSync(path.join(homeDir, '.kiro', 'settings'), { recursive: true });
  fs.mkdirSync(path.join(homeDir, '.claude'), { recursive: true });

  const detected = detectAiToolTargets({ homeDir });

  assert.deepEqual(
    detected.supported.map((item) => item.id).sort(),
    ['codex', 'cursor', 'gemini', 'kiro']
  );
  assert.deepEqual(
    detected.unsupported.map((item) => item.id).sort(),
    ['claude']
  );

  fs.rmSync(homeDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('installLocalnestIntoDetectedClients updates json and toml configs', () => {
  const homeDir = makeTempDir();
  const backupDir = path.join(homeDir, '.synapse', 'backups');

  writeJson(path.join(homeDir, '.cursor', 'mcp.json'), {
    mcpServers: {
      existing: { command: 'foo' }
    }
  });
  writeJson(path.join(homeDir, '.gemini', 'settings.json'), {
    ui: { theme: 'Dracula' }
  });
  writeJson(path.join(homeDir, '.kiro', 'settings', 'mcp.json'), {
    mcpServers: {
      fetch: {
        command: 'uvx',
        args: ['mcp-server-fetch']
      }
    }
  });
  writeJson(path.join(homeDir, '.codeium', 'windsurf', 'mcp_config.json'), {
    mcpServers: {}
  });
  fs.mkdirSync(path.join(homeDir, '.windsurf'), { recursive: true });
  fs.mkdirSync(path.join(homeDir, '.codex'), { recursive: true });
  fs.writeFileSync(
    path.join(homeDir, '.codex', 'config.toml'),
    'model = "gpt-5"\n\n[mcp_servers.old]\ncommand = "foo"\n',
    'utf8'
  );

  const serverConfig = buildLocalnestServerConfig({
    command: 'synapse-mcp',
    env: {
      MCP_MODE: 'stdio',
      SYNAPSE_CONFIG: '/tmp/synapse.config.json'
    }
  });

  const result = installLocalnestIntoDetectedClients({
    homeDir,
    serverConfig,
    backupDir
  });

  assert.equal(result.installed.length, 6);
  assert.equal(result.unsupported.length, 0);

  const cursor = JSON.parse(fs.readFileSync(path.join(homeDir, '.cursor', 'mcp.json'), 'utf8'));
  assert.equal(cursor.mcpServers.existing.command, 'foo');
  assert.equal(cursor.mcpServers.synapse.command, 'synapse-mcp');

  const gemini = JSON.parse(fs.readFileSync(path.join(homeDir, '.gemini', 'settings.json'), 'utf8'));
  assert.equal(gemini.ui.theme, 'Dracula');
  assert.equal(gemini.mcpServers.synapse.env.MCP_MODE, 'stdio');

  const kiro = JSON.parse(fs.readFileSync(path.join(homeDir, '.kiro', 'settings', 'mcp.json'), 'utf8'));
  assert.equal(kiro.mcpServers.fetch.command, 'uvx');
  assert.equal(kiro.mcpServers.synapse.command, 'synapse-mcp');

  const windsurf = JSON.parse(fs.readFileSync(path.join(homeDir, '.windsurf', 'mcp.json'), 'utf8'));
  assert.equal(windsurf.mcpServers.synapse.command, 'synapse-mcp');

  const codeiumWindsurf = JSON.parse(fs.readFileSync(path.join(homeDir, '.codeium', 'windsurf', 'mcp_config.json'), 'utf8'));
  assert.equal(codeiumWindsurf.mcpServers.synapse.command, 'synapse-mcp');

  const codex = fs.readFileSync(path.join(homeDir, '.codex', 'config.toml'), 'utf8');
  assert.match(codex, /\[mcp_servers\.synapse\]/);
  assert.match(codex, /command = "synapse-mcp"/);
  assert.match(codex, /\[mcp_servers\.synapse\.env\]/);
  assert.match(codex, /SYNAPSE_CONFIG = "\/tmp\/synapse\.config\.json"/);

  assert.equal(fs.existsSync(backupDir), true);
  assert.ok(fs.readdirSync(backupDir).length >= 4);

  fs.rmSync(homeDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

test('detectAiToolTargets prefers current Gemini settings file', () => {
  const homeDir = makeTempDir();
  fs.mkdirSync(path.join(homeDir, '.gemini', 'antigravity'), { recursive: true });
  writeJson(path.join(homeDir, '.gemini', 'settings.json'), { ui: { theme: 'Dracula' } });

  const detected = detectAiToolTargets({ homeDir });
  const gemini = detected.supported.find((item) => item.id === 'gemini');

  assert.equal(gemini?.configPath, path.join(homeDir, '.gemini', 'settings.json'));

  fs.rmSync(homeDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});
