import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function backupFile(filePath: string, backupDir: string, toolId: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  ensureDir(backupDir);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `${toolId}-${stamp}-${path.basename(filePath)}.bak`);
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function serializeTomlString(value: unknown): string {
  return JSON.stringify(String(value));
}

function serializeTomlArray(values: unknown[]): string {
  return `[${values.map((value) => serializeTomlString(value)).join(', ')}]`;
}

function resolveConfigPath(homeDir: string, candidates: string[][]): string {
  for (const relativePath of candidates) {
    const absolutePath = path.join(homeDir, ...relativePath);
    if (fs.existsSync(absolutePath)) return absolutePath;
  }
  const preferred = candidates[0];
  return path.join(homeDir, ...preferred);
}

export interface ServerConfig {
  command: string;
  args?: string[];
  startup_timeout_sec?: number;
  env?: Record<string, string>;
}

interface InstallTarget {
  id: string;
  label: string;
  kind: string;
  configPath: string;
  present: boolean;
  reason?: string;
}

interface InstallResult {
  tool: string;
  toolId: string;
  configPath: string;
  status: 'installed' | 'updated' | 'unchanged';
  backupPath: string | null;
}

function buildCodexSynapseBlock(serverConfig: ServerConfig): string {
  const lines: string[] = [
    '[mcp_servers.synapse]',
    `command = ${serializeTomlString(serverConfig.command)}`
  ];

  if (Array.isArray(serverConfig.args) && serverConfig.args.length > 0) {
    lines.push(`args = ${serializeTomlArray(serverConfig.args)}`);
  }
  if (typeof serverConfig.startup_timeout_sec === 'number') {
    lines.push(`startup_timeout_sec = ${serverConfig.startup_timeout_sec}`);
  }

  const env = isPlainObject(serverConfig.env) ? serverConfig.env : {};
  if (Object.keys(env).length > 0) {
    lines.push('');
    lines.push('[mcp_servers.synapse.env]');
    for (const key of Object.keys(env).sort()) {
      lines.push(`${key} = ${serializeTomlString(env[key])}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function upsertCodexSynapseBlock(rawText: string, block: string): string {
  const lines = rawText.split(/\r?\n/);
  const kept: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\[mcp_servers\.synapse(?:\.[^\]]+)?\]\s*$/.test(line)) {
      i += 1;
      while (i < lines.length && !/^\[/.test(lines[i])) {
        i += 1;
      }
      i -= 1;
      continue;
    }
    kept.push(line);
  }

  const trimmed = kept.join('\n').replace(/\s+$/, '');
  if (!trimmed) return block;
  return `${trimmed}\n\n${block}`;
}

function installIntoJsonTarget(target: InstallTarget, serverConfig: ServerConfig, backupDir: string): InstallResult {
  ensureDir(path.dirname(target.configPath));
  const existed = fs.existsSync(target.configPath);
  const backupPath = backupFile(target.configPath, backupDir, target.id);

  let parsed: Record<string, unknown> = {};
  if (existed) {
    parsed = JSON.parse(fs.readFileSync(target.configPath, 'utf8'));
    if (!isPlainObject(parsed)) {
      throw new Error(`Expected JSON object in ${target.configPath}`);
    }
  }

  const mcpServers = isPlainObject(parsed.mcpServers) ? parsed.mcpServers : {};
  const previous = (mcpServers as Record<string, unknown>).synapse;
  const changed = JSON.stringify(previous) !== JSON.stringify(serverConfig);
  const next = {
    ...parsed,
    mcpServers: {
      ...(mcpServers as Record<string, unknown>),
      synapse: serverConfig
    }
  };

  fs.writeFileSync(target.configPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return {
    tool: target.label,
    toolId: target.id,
    configPath: target.configPath,
    status: existed && previous ? (changed ? 'updated' : 'unchanged') : 'installed',
    backupPath
  };
}

function installIntoCodexTarget(target: InstallTarget, serverConfig: ServerConfig, backupDir: string): InstallResult {
  ensureDir(path.dirname(target.configPath));
  const existed = fs.existsSync(target.configPath);
  const backupPath = backupFile(target.configPath, backupDir, target.id);
  const rawText = existed ? fs.readFileSync(target.configPath, 'utf8') : '';
  const block = buildCodexSynapseBlock(serverConfig);
  const nextText = upsertCodexSynapseBlock(rawText, block);
  const changed = rawText !== nextText;

  fs.writeFileSync(target.configPath, nextText, 'utf8');
  return {
    tool: target.label,
    toolId: target.id,
    configPath: target.configPath,
    status: existed && rawText
      ? (changed ? 'updated' : 'unchanged')
      : 'installed',
    backupPath
  };
}

export function buildSynapseServerConfig({ command, args, env }: { command: string; args?: string[]; env?: Record<string, string> }): ServerConfig {
  const config: ServerConfig = {
    command,
    startup_timeout_sec: 30,
    env: { ...env }
  };
  if (Array.isArray(args) && args.length > 0) {
    config.args = [...args];
  }
  return config;
}

export interface DetectionResult {
  supported: InstallTarget[];
  unsupported: InstallTarget[];
}

export function detectAiToolTargets({ homeDir = os.homedir() }: { homeDir?: string } = {}): DetectionResult {
  const candidates: InstallTarget[] = [
    {
      id: 'codex',
      label: 'Codex',
      kind: 'toml',
      configPath: path.join(homeDir, '.codex', 'config.toml'),
      present: fs.existsSync(path.join(homeDir, '.codex'))
    },
    {
      id: 'cursor',
      label: 'Cursor',
      kind: 'json',
      configPath: path.join(homeDir, '.cursor', 'mcp.json'),
      present: fs.existsSync(path.join(homeDir, '.cursor'))
    },
    {
      id: 'windsurf',
      label: 'Windsurf',
      kind: 'json',
      configPath: path.join(homeDir, '.windsurf', 'mcp.json'),
      present: fs.existsSync(path.join(homeDir, '.windsurf'))
    },
    {
      id: 'windsurf-codeium',
      label: 'Windsurf (Codeium)',
      kind: 'json',
      configPath: path.join(homeDir, '.codeium', 'windsurf', 'mcp_config.json'),
      present: fs.existsSync(path.join(homeDir, '.codeium', 'windsurf'))
    },
    {
      id: 'gemini',
      label: 'Gemini CLI',
      kind: 'json',
      configPath: resolveConfigPath(homeDir, [
        ['.gemini', 'settings.json'],
        ['.gemini', 'antigravity', 'mcp_config.json']
      ]),
      present: fs.existsSync(path.join(homeDir, '.gemini'))
    },
    {
      id: 'kiro',
      label: 'Kiro',
      kind: 'json',
      configPath: path.join(homeDir, '.kiro', 'settings', 'mcp.json'),
      present: fs.existsSync(path.join(homeDir, '.kiro'))
    },
    {
      id: 'claude',
      label: 'Claude Code',
      kind: 'unsupported',
      configPath: '',
      present: fs.existsSync(path.join(homeDir, '.claude')) || fs.existsSync(path.join(homeDir, '.claude.json')),
      reason: 'No stable standalone MCP config file was detected for safe automatic edits.'
    },
    {
      id: 'continue',
      label: 'Continue',
      kind: 'unsupported',
      configPath: '',
      present: fs.existsSync(path.join(homeDir, '.continue')),
      reason: 'No MCP config file was detected; only the skills directory is present.'
    },
    {
      id: 'cline',
      label: 'Cline',
      kind: 'unsupported',
      configPath: '',
      present: fs.existsSync(path.join(homeDir, '.cline')),
      reason: 'No MCP config file was detected; only the skills directory is present.'
    },
    {
      id: 'roo',
      label: 'Roo',
      kind: 'unsupported',
      configPath: '',
      present: fs.existsSync(path.join(homeDir, '.roo')),
      reason: 'No MCP config file was detected for this installation.'
    },
    {
      id: 'opencode',
      label: 'OpenCode',
      kind: 'unsupported',
      configPath: '',
      present: fs.existsSync(path.join(homeDir, '.opencode')),
      reason: 'No MCP config file was detected for this installation.'
    }
  ];

  return {
    supported: candidates.filter((item) => item.present && item.kind !== 'unsupported'),
    unsupported: candidates.filter((item) => item.present && item.kind === 'unsupported')
  };
}

export interface InstallSynapseResult {
  installed: InstallResult[];
  unsupported: InstallTarget[];
}

export function installSynapseIntoDetectedClients({
  homeDir = os.homedir(),
  serverConfig,
  backupDir
}: {
  homeDir?: string;
  serverConfig: ServerConfig;
  backupDir: string;
}): InstallSynapseResult {
  const detection = detectAiToolTargets({ homeDir });
  const results: InstallResult[] = [];

  for (const target of detection.supported) {
    if (target.kind === 'json') {
      results.push(installIntoJsonTarget(target, serverConfig, backupDir));
      continue;
    }
    if (target.kind === 'toml') {
      results.push(installIntoCodexTarget(target, serverConfig, backupDir));
    }
  }

  return {
    installed: results,
    unsupported: detection.unsupported
  };
}
