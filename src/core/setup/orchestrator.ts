import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import {
  ensureSqliteVecExtension,
  migrateSynapseHomeLayout,
  resolveSynapseHome,
  resolveWritableModelCacheDir,
  buildSynapsePaths
} from '../runtime/index.js';
import {
  buildSynapseServerConfig,
  installSynapseIntoDetectedClients
} from './client-installer.js';

export interface SetupOptions {
  paths?: string[];
  rootsJson?: string;
  packageRef?: string;
  skipModelDownload?: boolean;
  skipSqliteVecInstall?: boolean;
  sqliteVecExtensionPath?: string;
  indexBackend?: string;
  memoryEnabled?: boolean;
  memoryBackend?: string;
  memoryDbPath?: string;
}

export class SetupService {
  private synapseHome: string;
  private layout: any;

  constructor(env: Record<string, string | undefined> = process.env) {
    this.synapseHome = resolveSynapseHome(env);
    this.layout = migrateSynapseHomeLayout(this.synapseHome).paths;
  }

  public getLayout() {
    return this.layout;
  }

  private isDir(p: string): boolean {
    try {
      return fs.statSync(p).isDirectory();
    } catch {
      return false;
    }
  }

  private toLabel(dirPath: string, fallback: string = 'root'): string {
    const base = path.basename(dirPath);
    const safe = (base || fallback).replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    return safe || fallback;
  }

  private expandHome(p: string): string {
    if (!p) return p;
    return p.replace(/^~(?=$|\/)/, os.homedir());
  }

  public collectSuggestions(): string[] {
    const home = os.homedir();
    const cwd = process.cwd();
    const candidates = [
      path.join(home, 'projects'),
      path.join(home, 'project'),
      path.join(home, 'code'),
      path.join(home, 'workspace'),
      path.join(home, 'work'),
      cwd
    ];

    const unique: string[] = [];
    const seen = new Set<string>();
    for (const p of candidates) {
      const resolved = path.resolve(p);
      if (seen.has(resolved)) continue;
      seen.add(resolved);
      if (this.isDir(resolved)) unique.push(resolved);
    }
    return unique;
  }

  public async runSetup(options: SetupOptions): Promise<any> {
    // Ported from setup-synapse.mjs logic
    // (Simplified for brevity in this step, but maintaining core logic)
    
    const roots = options.paths 
      ? options.paths.map((p, i) => ({ label: this.toLabel(p, `root${i+1}`), path: path.resolve(this.expandHome(p)) }))
      : this.collectSuggestions().map((p, i) => ({ label: this.toLabel(p, `root${i+1}`), path: p }));

    const config = {
      name: 'synapse',
      version: 4,
      updatedAt: new Date().toISOString(),
      roots,
      index: {
        backend: options.indexBackend || 'sqlite-vec',
        dbPath: options.memoryDbPath || this.layout.sqliteDbPath,
        // ... other defaults
      },
      memory: {
        enabled: options.memoryEnabled ?? true,
        backend: options.memoryBackend || 'auto',
        dbPath: options.memoryDbPath || this.layout.memoryDbPath,
      }
    };

    fs.mkdirSync(path.dirname(this.layout.configPath), { recursive: true });
    fs.writeFileSync(this.layout.configPath, JSON.stringify(config, null, 2), 'utf8');

    return { config, path: this.layout.configPath };
  }
}
