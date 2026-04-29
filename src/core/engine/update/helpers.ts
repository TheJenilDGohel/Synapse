import { spawnSync } from 'node:child_process';
import type { SpawnSyncReturns } from 'node:child_process';

interface ParsedVersion {
  raw: string;
  core: number[];
  prerelease: (number | string)[];
}

function parseIsoTime(value: string | null | undefined): number {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
}

function parseVersion(version: string): ParsedVersion | null {
  const raw = String(version || '').trim().replace(/^v/i, '');
  const [coreRaw, prereleaseRaw = ''] = raw.split('-', 2);
  const core = coreRaw.split('.').map((part) => Number.parseInt(part, 10));
  if (core.some((n) => !Number.isFinite(n))) return null;
  const prerelease: (number | string)[] = prereleaseRaw
    ? prereleaseRaw.split('.').map((part) => {
      const n = Number.parseInt(part, 10);
      return Number.isFinite(n) ? n : part;
    })
    : [];
  return { raw, core, prerelease };
}

export function compareVersions(a: string, b: string): number {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (!va || !vb) return 0;

  const max = Math.max(va.core.length, vb.core.length);
  for (let i = 0; i < max; i += 1) {
    const da = va.core[i] || 0;
    const db = vb.core[i] || 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }

  if (va.prerelease.length === 0 && vb.prerelease.length > 0) return 1;
  if (va.prerelease.length > 0 && vb.prerelease.length === 0) return -1;
  const maxPre = Math.max(va.prerelease.length, vb.prerelease.length);
  for (let i = 0; i < maxPre; i += 1) {
    const pa = va.prerelease[i];
    const pb = vb.prerelease[i];
    if (pa === undefined && pb !== undefined) return -1;
    if (pa !== undefined && pb === undefined) return 1;
    if (typeof pa === 'number' && typeof pb === 'number') {
      if (pa > pb) return 1;
      if (pa < pb) return -1;
      continue;
    }
    if (typeof pa === 'number' && typeof pb !== 'number') return -1;
    if (typeof pa !== 'number' && typeof pb === 'number') return 1;
    const sa = String(pa);
    const sb = String(pb);
    if (sa > sb) return 1;
    if (sa < sb) return -1;
  }

  return 0;
}

export type CommandRunner = (command: string, args: string[], options?: { timeoutMs?: number }) => SpawnSyncReturns<string>;

export function defaultRunner(command: string, args: string[], options: { timeoutMs?: number } = {}): SpawnSyncReturns<string> {
  return spawnSync(command, args, {
    encoding: 'utf8',
    timeout: options.timeoutMs || 12000,
    maxBuffer: 4 * 1024 * 1024
  });
}

export function parseLatestVersion(stdout: string): string | null {
  const text = String(stdout || '').trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === 'string') return parsed.trim();
    if (Array.isArray(parsed) && parsed.length > 0) {
      const last = parsed[parsed.length - 1];
      if (typeof last === 'string') return last.trim();
    }
  } catch {
    // npm may return a plain string in some environments.
  }
  return text.replace(/^"|"$/g, '').trim() || null;
}

export type UpdateChannel = 'stable' | 'beta';

export function normalizeUpdateChannel(value: string | null | undefined): UpdateChannel | null {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw || raw === 'latest' || raw === 'stable' || raw === 'release') return 'stable';
  if (raw === 'beta') return 'beta';
  return null;
}

export function normalizeInstallTarget(value: string): string {
  const channel = normalizeUpdateChannel(value);
  if (channel === 'stable') return 'latest';
  if (channel === 'beta') return 'beta';
  return String(value || 'latest').trim() || 'latest';
}

export interface InstallCommand {
  command: string;
  args: string[];
}

export function buildInstallCommand(packageName: string, version: string): InstallCommand {
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return {
    command: npmCmd,
    args: ['install', '-g', `${packageName}@${normalizeInstallTarget(version)}`]
  };
}

export function buildSkillSyncCommand(): InstallCommand {
  const binary = process.platform === 'win32' ? 'synapse.cmd' : 'synapse';
  return { command: binary, args: ['install', 'skills', '--force'] };
}

export { parseIsoTime };
