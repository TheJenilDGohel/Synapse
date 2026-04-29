import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  detectSkillToolFamily,
  getKnownToolSkillDirs,
  getKnownProjectSkillDirs,
  listBundledSkillDirs
} from '../scripts/runtime/install-synapse-skill.mjs';

test('listBundledSkillDirs discovers all bundled skills', () => {
  const fakeMetaUrl = pathToFileURL(
    path.join(process.cwd(), 'scripts', 'runtime', 'install-synapse-skill.mjs')
  ).href;

  const resolved = listBundledSkillDirs(fakeMetaUrl).map((entry) => path.basename(entry));

  assert.ok(resolved.includes('synapse'));
  assert.ok(resolved.includes('synapse-sql-adapter'));
  assert.ok(resolved.includes('synapse-runtime'));
  assert.ok(resolved.includes('synapse-node-compat'));
});

test('bundled skill metadata version matches package version', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const skill = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'skills', 'synapse', '.synapse-skill.json'), 'utf8')
  );

  assert.equal(skill.version, pkg.version);
});

test('known skill install locations include codex and Claude-style skill directories', () => {
  const dirs = getKnownToolSkillDirs('/tmp/synapse-home');

  assert.deepEqual(dirs, [
    path.join('/tmp/synapse-home', '.agents', 'skills'),
    path.join('/tmp/synapse-home', '.codex', 'skills'),
    path.join('/tmp/synapse-home', '.copilot', 'skills'),
    path.join('/tmp/synapse-home', '.claude', 'skills'),
    path.join('/tmp/synapse-home', '.cursor', 'skills'),
    path.join('/tmp/synapse-home', '.codeium', 'windsurf', 'skills'),
    path.join('/tmp/synapse-home', '.opencode', 'skills'),
    path.join('/tmp/synapse-home', '.config', 'opencode', 'skills'),
    path.join('/tmp/synapse-home', '.gemini', 'skills'),
    path.join('/tmp/synapse-home', '.gemini', 'antigravity', 'skills'),
    path.join('/tmp/synapse-home', '.cline', 'skills'),
    path.join('/tmp/synapse-home', '.continue', 'skills'),
    path.join('/tmp/synapse-home', '.kiro', 'skills')
  ]);
});

test('known project skill locations include github and claude layouts', () => {
  const dirs = getKnownProjectSkillDirs('/tmp/project');

  assert.deepEqual(dirs, [
    path.join('/tmp/project', '.github', 'skills'),
    path.join('/tmp/project', '.claude', 'skills'),
    path.join('/tmp/project', '.windsurf', 'skills'),
    path.join('/tmp/project', '.opencode', 'skills')
  ]);
});

test('detectSkillToolFamily resolves supported tool families from target path', () => {
  assert.equal(detectSkillToolFamily('/tmp/home/.codex/skills/synapse'), 'codex');
  assert.equal(detectSkillToolFamily('/tmp/home/.copilot/skills/synapse'), 'copilot');
  assert.equal(detectSkillToolFamily('/tmp/home/.claude/skills/synapse'), 'claude');
  assert.equal(detectSkillToolFamily('/tmp/home/.cursor/skills/synapse'), 'cursor');
  assert.equal(detectSkillToolFamily('/tmp/home/.codeium/windsurf/skills/synapse'), 'windsurf');
  assert.equal(detectSkillToolFamily('/tmp/home/.opencode/skills/synapse'), 'opencode');
  assert.equal(detectSkillToolFamily('/tmp/home/.config/opencode/skills/synapse'), 'opencode');
  assert.equal(detectSkillToolFamily('/tmp/home/.gemini/skills/synapse'), 'gemini');
  assert.equal(detectSkillToolFamily('/tmp/home/.gemini/antigravity/skills/synapse'), 'antigravity');
  assert.equal(detectSkillToolFamily('/tmp/home/.cline/skills/synapse'), 'cline');
  assert.equal(detectSkillToolFamily('/tmp/home/.continue/skills/synapse'), 'continue');
  assert.equal(detectSkillToolFamily('/tmp/home/.agents/skills/synapse'), 'agents');
});

