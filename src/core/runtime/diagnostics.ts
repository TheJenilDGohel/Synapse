import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  buildSynapsePaths,
  resolveSynapseHome,
  resolveWritableModelCacheDir,
  resolveConfigPath as resolveDefaultConfigPath,
} from './home-layout.js';
import { findSqliteVecExtensionPath } from './sqlite-vec-extension.js';

export interface DoctorCheckResult {
  id: string;
  ok: boolean;
  detail: string;
  fix?: string;
  metadata?: any;
}

export interface DoctorReport {
  ok: boolean;
  checks: DoctorCheckResult[];
}

export class DiagnosticService {
  private safeEnv: Record<string, string>;

  constructor(env: Record<string, string | undefined> = process.env) {
    this.safeEnv = {
      HOME: env.HOME || '',
      SYNAPSE_HOME: env.SYNAPSE_HOME || '',
      SYNAPSE_CONFIG: env.SYNAPSE_CONFIG || '',
      SYNAPSE_INDEX_BACKEND: env.SYNAPSE_INDEX_BACKEND || '',
      SYNAPSE_SQLITE_VEC_EXTENSION: env.SYNAPSE_SQLITE_VEC_EXTENSION || '',
      SYNAPSE_SQLITE_VEC_SEARCH_DIRS: env.SYNAPSE_SQLITE_VEC_SEARCH_DIRS || '',
      SYNAPSE_EMBED_CACHE_DIR: env.SYNAPSE_EMBED_CACHE_DIR || '',
      SYNAPSE_RERANKER_CACHE_DIR: env.SYNAPSE_RERANKER_CACHE_DIR || '',
      SYNAPSE_DOCTOR_STRICT: env.SYNAPSE_DOCTOR_STRICT || '',
      USER: env.USER || '',
      USERNAME: env.USERNAME || '',
    };
  }

  private commandExists(cmd: string, args: string[] = ['--version']): boolean {
    const isWindows = process.platform === 'win32';
    try {
      const result = spawnSync(cmd, args, { 
        stdio: 'ignore',
        shell: isWindows 
      });
      return result.status === 0;
    } catch {
      return false;
    }
  }

  private getNpxCommand(): string {
    return process.platform === 'win32' ? 'npx.cmd' : 'npx';
  }

  private resolveConfigPath(): string {
    return resolveDefaultConfigPath({
      env: this.safeEnv,
      synapseHome: resolveSynapseHome(this.safeEnv)
    });
  }

  private resolveIndexBackend(): string {
    const byEnv = (this.safeEnv.SYNAPSE_INDEX_BACKEND || '').trim();
    if (byEnv) return byEnv;

    const cfgPath = this.resolveConfigPath();
    try {
      if (!fs.existsSync(cfgPath)) return 'sqlite-vec';
      const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      return parsed?.index?.backend || 'sqlite-vec';
    } catch {
      return 'sqlite-vec';
    }
  }

  public checkNodeVersion(): DoctorCheckResult {
    const major = Number.parseInt(process.versions.node.split('.')[0] || '0', 10);
    if (Number.isFinite(major) && major >= 18) {
      return { id: 'node_version', ok: true, detail: `Node.js ${process.versions.node}` };
    }
    return {
      id: 'node_version',
      ok: false,
      detail: `Node.js >=18 required. Current: ${process.versions.node}`,
      fix: 'Install Node.js 18+ and re-run doctor.'
    };
  }

  public checkNpmNpx(): DoctorCheckResult {
    const npmOk = this.commandExists('npm', ['--version']);
    const npxCmd = this.getNpxCommand();
    const npxOk = this.commandExists(npxCmd, ['--version']);

    if (npmOk && npxOk) {
      return { id: 'npm_npx', ok: true, detail: `npm and ${npxCmd} available` };
    }

    return {
      id: 'npm_npx',
      ok: false,
      detail: `Missing npm or ${npxCmd}`,
      fix: 'Install/reinstall Node.js with npm, then re-run doctor.'
    };
  }

  public checkRipgrep(): DoctorCheckResult {
    const ok = this.commandExists('rg');
    if (ok) {
      return { id: 'ripgrep', ok: true, detail: 'ripgrep available' };
    }

    let fix;
    if (process.platform === 'win32') {
      fix = 'Install ripgrep: winget install BurntSushi.ripgrep.MSVC';
    } else if (process.platform === 'darwin') {
      fix = 'Install ripgrep: brew install ripgrep';
    } else {
      fix = 'Install ripgrep: sudo apt-get install ripgrep';
    }

    return { id: 'ripgrep', ok: false, detail: 'ripgrep (rg) missing', fix };
  }

  public async checkSdkImport(): Promise<DoctorCheckResult> {
    try {
      // @ts-ignore
      await import('@modelcontextprotocol/sdk/server/mcp.js');
      // @ts-ignore
      await import('@modelcontextprotocol/sdk/server/stdio.js');
      return { id: 'sdk_import', ok: true, detail: 'MCP SDK imports resolved' };
    } catch (error: any) {
      return {
        id: 'sdk_import',
        ok: false,
        detail: `MCP SDK import failed: ${error?.code || error?.message || 'unknown error'}`,
        fix: 'If running from source, run npm install. If using npx package, reinstall and retry.'
      };
    }
  }

  public async checkSqliteBackend(): Promise<DoctorCheckResult> {
    if (this.resolveIndexBackend() !== 'sqlite-vec') {
      return { id: 'sqlite_backend', ok: true, detail: 'sqlite-vec backend not selected' };
    }

    try {
      await import('node:sqlite');
      return { id: 'sqlite_backend', ok: true, detail: 'node:sqlite available for sqlite-vec backend' };
    } catch {
      return {
        id: 'sqlite_backend',
        ok: false,
        detail: 'node:sqlite unavailable for sqlite-vec backend',
        fix: 'Use Node.js 22+ or switch backend to json in setup.'
      };
    }
  }

  public checkConfigFile(): DoctorCheckResult {
    const configPath = this.resolveConfigPath();
    if (!fs.existsSync(configPath)) {
      return {
        id: 'config_file',
        ok: false,
        detail: `Config not found: ${configPath}`,
        fix: 'Run synapse setup to create config.'
      };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
      return {
        id: 'config_file',
        ok: false,
        detail: `Invalid JSON config: ${configPath}`,
        fix: 'Fix JSON syntax in synapse.config.json.'
      };
    }

    if (!parsed || !Array.isArray(parsed.roots) || parsed.roots.length === 0) {
      return {
        id: 'config_file',
        ok: false,
        detail: 'Config has no roots[]',
        fix: 'Add at least one valid root path in synapse.config.json.'
      };
    }

    const missing = [];
    for (const root of parsed.roots) {
      if (!root || typeof root.path !== 'string') {
        missing.push('<invalid-root-entry>');
        continue;
      }
      const resolved = path.resolve(root.path);
      if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
        missing.push(resolved);
      }
    }

    if (missing.length > 0) {
      return {
        id: 'config_file',
        ok: false,
        detail: `Some configured roots are missing: ${missing.join(', ')}`,
        fix: 'Update synapse.config.json with existing directories.'
      };
    }

    return {
      id: 'config_file',
      ok: true,
      detail: `Config OK (${configPath}) with ${parsed.roots.length} root(s)`
    };
  }

  public checkSqliteVecExtension(): DoctorCheckResult {
    if (this.resolveIndexBackend() !== 'sqlite-vec') {
      return { id: 'sqlite_vec_extension', ok: true, detail: 'sqlite-vec native extension not required for current backend' };
    }

    const configured = (this.safeEnv.SYNAPSE_SQLITE_VEC_EXTENSION || '').trim();
    const synapseHome = resolveSynapseHome(this.safeEnv);
    const configuredPath = configured ? path.resolve(configured) : '';
    const detected = configuredPath
      ? (fs.existsSync(configuredPath) ? { path: configuredPath, source: 'configured' } : null)
      : findSqliteVecExtensionPath({
        synapseHome,
        env: this.safeEnv
      });

    if (detected?.path) {
      return {
        id: 'sqlite_vec_extension',
        ok: true,
        detail: `sqlite-vec native extension ready (${detected.path})`
      };
    }

    return {
      id: 'sqlite_vec_extension',
      ok: false,
      detail: configuredPath
        ? `sqlite-vec backend selected but configured vec0 path is missing: ${configuredPath}`
        : 'sqlite-vec backend selected but vec0 native extension is not configured',
      fix: 'Run synapse setup again so Synapse can install/configure sqlite-vec, or set SYNAPSE_SQLITE_VEC_EXTENSION to the vec0 shared library path.'
    };
  }

  public checkModelCacheWritable(): DoctorCheckResult {
    const synapseHome = resolveSynapseHome(this.safeEnv);
    const defaultCache = buildSynapsePaths(synapseHome).dirs.cache;
    
    // Minimalistic parsing to avoid dependency on complex config service here
    let configEmbeddingCache = '';
    let configRerankerCache = '';
    try {
      const cfgPath = this.resolveConfigPath();
      if (fs.existsSync(cfgPath)) {
        const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        configEmbeddingCache = parsed?.index?.embeddingCacheDir || '';
        configRerankerCache = parsed?.index?.rerankerCacheDir || '';
      }
    } catch { /* ignore */ }

    const embedPreferred = path.resolve(
      (this.safeEnv.SYNAPSE_EMBED_CACHE_DIR || '').trim() ||
      configEmbeddingCache ||
      defaultCache
    );
    const rerankerPreferred = path.resolve(
      (this.safeEnv.SYNAPSE_RERANKER_CACHE_DIR || '').trim() ||
      configRerankerCache ||
      defaultCache
    );
    const embedResolved = resolveWritableModelCacheDir({
      preferredDir: embedPreferred,
      synapseHome,
      env: this.safeEnv
    });
    const rerankerResolved = resolveWritableModelCacheDir({
      preferredDir: rerankerPreferred,
      synapseHome,
      env: this.safeEnv
    });

    if (!embedResolved.writable || !rerankerResolved.writable) {
      return {
        id: 'model_cache',
        ok: false,
        detail: 'Model cache not writable for configured or fallback locations',
        fix: 'Set SYNAPSE_EMBED_CACHE_DIR/SYNAPSE_RERANKER_CACHE_DIR to a writable path, then re-run synapse setup.'
      };
    }

    const fallbackUsed = embedResolved.fallbackUsed || rerankerResolved.fallbackUsed;
    return {
      id: 'model_cache',
      ok: true,
      detail: fallbackUsed
        ? 'Model cache writable (fallback location active)'
        : 'Model cache writable'
    };
  }

  public checkGlobalInstallStaleTempDirs(fix: boolean = false): DoctorCheckResult {
    let nodeModulesDir: string | undefined;
    try {
      const isWindows = process.platform === 'win32';
      const npmBin = isWindows ? 'npm.cmd' : 'npm';
      nodeModulesDir = spawnSync(npmBin, ['root', '-g'], { encoding: 'utf8', shell: isWindows }).stdout.trim();
    } catch { /* ignore */ }
    
    if (!nodeModulesDir || !fs.existsSync(nodeModulesDir)) {
      return { id: 'global_stale_temp', ok: true, detail: 'Could not locate global node_modules (skipped)' };
    }

    const entries = fs.readdirSync(nodeModulesDir);
    const stalePrefix = '.synapse-mcp-';
    const stale = entries.filter((e) => e.startsWith(stalePrefix));

    if (stale.length === 0) {
      return { id: 'global_stale_temp', ok: true, detail: 'No stale npm temp dirs found' };
    }

    if (fix) {
      let removed = 0;
      for (const entry of stale) {
        try {
          fs.rmSync(path.join(nodeModulesDir, entry), { recursive: true, force: true });
          removed++;
        } catch { /* best-effort */ }
      }
      if (removed === stale.length) {
        return { id: 'global_stale_temp', ok: true, detail: `Cleaned ${removed} stale npm temp dir(s)` };
      }
      return {
        id: 'global_stale_temp',
        ok: false,
        detail: `Partially cleaned: ${removed}/${stale.length} temp dirs removed`,
        fix: 'Manually remove remaining dirs or run with sudo.'
      };
    }

    return {
      id: 'global_stale_temp',
      ok: false,
      detail: `${stale.length} stale npm temp dir(s) found (blocks global reinstall)`,
      fix: 'Run: synapse doctor --fix'
    };
  }

  public isStrict(): boolean {
    const value = this.safeEnv.SYNAPSE_DOCTOR_STRICT;
    if (value === undefined || value === null || value === '') return true;
    return String(value).toLowerCase() === 'true';
  }

  public async runAll(options: { fix?: boolean } = {}): Promise<DoctorReport> {
    const checks = [
      this.checkNodeVersion(),
      this.checkNpmNpx(),
      this.checkRipgrep(),
      await this.checkSdkImport(),
      await this.checkSqliteBackend(),
      this.checkSqliteVecExtension(),
      this.checkConfigFile(),
      this.checkModelCacheWritable(),
      this.checkGlobalInstallStaleTempDirs(options.fix)
    ];

    return {
      ok: checks.every((c) => c.ok),
      checks
    };
  }
}
