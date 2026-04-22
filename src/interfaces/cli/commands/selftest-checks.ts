/**
 * Individual check functions for the selftest command.
 * @module src/cli/commands/selftest-checks
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { RG_BIN } from '../../../core/runtime/platform.js';
import { buildRuntimeConfig } from '../../../core/runtime/config.js';
import {
  EmbeddingService,
  AstChunker,
  MemoryService,
  SCHEMA_VERSION
} from '../../../core/engine/index.js';
import { c, symbol } from '../ansi.js';

/* ------------------------------------------------------------------ */
/*  Result tracking                                                    */
/* ------------------------------------------------------------------ */

export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface CheckResult {
  name: string;
  status: CheckStatus;
  detail: string;
  runtime?: any;
}

const ICON: Record<CheckStatus, string> = {
  pass: '\u2713',
  warn: '\u26A0',
  fail: '\u2717',
};

export function statusIcon(status: CheckStatus): string {
  switch (status) {
    case 'pass': return c.green(symbol.success());
    case 'warn': return c.yellow(symbol.warn());
    case 'fail': return c.red(symbol.error());
    default: return ' ';
  }
}

export function formatLine(result: CheckResult): string {
  const icon = statusIcon(result.status);
  const nameCol = result.name.padEnd(24);
  const detailCol = c.dim(result.detail);
  return `  ${icon} ${nameCol} ${detailCol}`;
}

/* ------------------------------------------------------------------ */
/*  Service bootstrap                                                  */
/* ------------------------------------------------------------------ */

export function createServices(runtime: any): { embeddingService: EmbeddingService; memoryService: MemoryService } {
  const embeddingService = new EmbeddingService({
    provider: runtime.embeddingProvider,
    model: runtime.embeddingModel,
    cacheDir: runtime.embeddingCacheDir,
  });
  const memoryService = new MemoryService({
    synapseHome: runtime.synapseHome,
    enabled: true,
    backend: runtime.memoryBackend,
    dbPath: runtime.memoryDbPath,
    autoCapture: runtime.memoryAutoCapture,
    consentDone: runtime.memoryConsentDone,
    embeddingService: embeddingService as any,
  });
  return { embeddingService, memoryService };
}

/* ------------------------------------------------------------------ */
/*  Memory / runtime checks                                            */
/* ------------------------------------------------------------------ */

export async function checkRuntime(): Promise<CheckResult> {
  try {
    const runtime = buildRuntimeConfig();
    const nodeVer = process.version;
    let sqliteAvail = false;
    try {
      const mod = await import('node:sqlite');
      sqliteAvail = Boolean((mod as any)?.DatabaseSync);
    } catch { /* not available */ }

    if (!sqliteAvail) {
      return {
        name: 'Runtime config',
        status: 'warn',
        detail: `Node ${nodeVer}, sqlite NOT available`,
        runtime,
      };
    }

    return {
      name: 'Runtime config',
      status: 'pass',
      detail: `Node ${nodeVer}, sqlite available`,
      runtime,
    };
  } catch (err: unknown) {
    return {
      name: 'Runtime config',
      status: 'fail',
      detail: (err as Error).message || String(err),
      runtime: null,
    };
  }
}

export async function checkMemoryBackend(memoryService: MemoryService): Promise<CheckResult> {
  try {
    const backendInfo: any = await memoryService.detectBackend();
    if (!backendInfo.available) {
      return {
        name: 'Memory backend',
        status: 'fail',
        detail: backendInfo.reason || 'no backend available',
      };
    }
    return {
      name: 'Memory backend',
      status: 'pass',
      detail: `Schema v${SCHEMA_VERSION}, ${backendInfo.selected} backend`,
    };
  } catch (err: unknown) {
    return {
      name: 'Memory backend',
      status: 'fail',
      detail: (err as Error).message || String(err),
    };
  }
}

export async function checkMemoryCrud(memoryService: MemoryService): Promise<CheckResult> {
  const testId = `__selftest_${Date.now()}`;
  try {
    const storeResult: any = await memoryService.storeEntry({
      content: `selftest entry ${testId}`,
      kind: 'knowledge',
      importance: 10,
      title: testId,
      nest: 'selftest_nest',
    });
    const id = storeResult?.memory?.id;
    if (!id) throw new Error('store returned no id');

    const recalled = await memoryService.getEntry(id);
    if (!recalled) throw new Error('recall returned nothing');

    await memoryService.updateEntry(id, { importance: 20 });
    await memoryService.deleteEntry(id);

    return {
      name: 'Memory CRUD',
      status: 'pass',
      detail: 'store \u2192 recall \u2192 update \u2192 delete',
    };
  } catch (err: unknown) {
    try {
      const entries: any = await memoryService.listEntries({ limit: 50 });
      for (const e of entries?.items || []) {
        if (e.title === testId) await memoryService.deleteEntry(e.id);
      }
    } catch { /* ignore cleanup errors */ }

    return {
      name: 'Memory CRUD',
      status: 'fail',
      detail: (err as Error).message || String(err),
    };
  }
}

export async function checkKnowledgeGraph(memoryService: MemoryService): Promise<CheckResult> {
  const entityName = `__selftest_entity_${Date.now()}`;
  const createdIds = new Set<string>();
  try {
    const entity: any = await memoryService.addEntity({
      name: entityName,
      type: 'test',
    });
    const entityId = entity?.id || entity?.entity?.id;
    if (!entityId) throw new Error('addEntity returned no id');
    createdIds.add(entityId);

    const triple: any = await memoryService.addTriple({
      subjectId: entityId,
      predicate: 'tested_by',
      objectName: 'selftest',
    } as any);
    const tripleId = triple?.id || triple?.triple?.id;
    createdIds.add('selftest');

    const rels = await memoryService.queryEntityRelationships(entityId);
    if (!rels) throw new Error('queryEntityRelationships returned nothing');

    if (tripleId) {
      await memoryService.invalidateTriple(tripleId, new Date().toISOString());
    }

    // Clean up test entities (and their triples) to avoid orphan accumulation
    await memoryService.deleteEntity(entityId).catch(() => {});
    await memoryService.deleteEntity('selftest').catch(() => {});

    return {
      name: 'Knowledge Graph',
      status: 'pass',
      detail: 'entity + triple + query + invalidate + cleanup',
    };
  } catch (err: unknown) {
    for (const id of createdIds) {
      await memoryService.deleteEntity(id).catch(() => {});
    }
    return {
      name: 'Knowledge Graph',
      status: 'fail',
      detail: (err as Error).message || String(err),
    };
  }
}

export async function checkTaxonomy(memoryService: MemoryService): Promise<CheckResult> {
  try {
    const nests = await memoryService.listNests();
    // Only test listBranches if we have at least one nest
    if (nests.nests.length > 0) {
      await memoryService.listBranches(nests.nests[0].nest);
    }

    return {
      name: 'Taxonomy',
      status: 'pass',
      detail: 'nests and branches working',
    };
  } catch (err: unknown) {
    return {
      name: 'Taxonomy',
      status: 'fail',
      detail: (err as Error).message || String(err),
    };
  }
}

export async function checkDedup(memoryService: MemoryService): Promise<CheckResult> {
  const testContent = `selftest dedup content ${Date.now()}`;
  let firstId: string | null = null;
  try {
    const first: any = await memoryService.storeEntry({
      content: testContent,
      kind: 'knowledge',
      importance: 10,
      title: '__selftest_dedup',
    });
    firstId = first?.memory?.id;

    const second: any = await memoryService.storeEntry({
      content: testContent,
      kind: 'knowledge',
      importance: 10,
      title: '__selftest_dedup_2',
    });

    const isDup = second?.duplicate === true;

    if (firstId) await memoryService.deleteEntry(firstId);
    if (second?.memory?.id && second.memory.id !== firstId) {
      await memoryService.deleteEntry(second.memory.id);
    }

    if (isDup) {
      return {
        name: 'Dedup',
        status: 'pass',
        detail: 'duplicate detection active (0.92 threshold)',
      };
    }

    return {
      name: 'Dedup',
      status: 'warn',
      detail: 'stored but duplicate not caught (embeddings may not be loaded)',
    };
  } catch (err: unknown) {
    if (firstId) {
      try { await memoryService.deleteEntry(firstId); } catch { /* ignore */ }
    }
    return {
      name: 'Dedup',
      status: 'fail',
      detail: (err as Error).message || String(err),
    };
  }
}

export async function checkEmbeddings(embeddingService: EmbeddingService): Promise<CheckResult> {
  try {
    if (!embeddingService.isEnabled()) {
      return {
        name: 'Embeddings',
        status: 'warn',
        detail: 'embedding provider disabled',
      };
    }

    const vec = await embeddingService.embed('selftest embedding probe');
    if (!Array.isArray(vec) || vec.length === 0) {
      return {
        name: 'Embeddings',
        status: 'warn',
        detail: 'model not loaded (first use downloads ~30MB)',
      };
    }

    return {
      name: 'Embeddings',
      status: 'pass',
      detail: `${(embeddingService as any).model}, ${vec.length}d vectors`,
    };
  } catch {
    return {
      name: 'Embeddings',
      status: 'warn',
      detail: 'model not loaded (first use downloads ~30MB)',
    };
  }
}

export async function checkAstChunking(): Promise<CheckResult> {
  try {
    const chunker = new AstChunker();
    const status = chunker.getStatus();
    const probeLanguages = ['javascript', 'typescript', 'python'];
    const verified: string[] = [];

    for (const language of probeLanguages) {
      const parser = await chunker.getParser(language);
      if (parser) verified.push(language);
    }

    const refreshed = chunker.getStatus();
    if (refreshed.missing_dependencies.length > 0) {
      return {
        name: 'AST chunking',
        status: 'warn',
        detail: `missing parsers: ${refreshed.missing_dependencies.join(', ')}`
      };
    }

    if (verified.length === 0 && refreshed.supported_languages.length > 0) {
      return {
        name: 'AST chunking',
        status: 'warn',
        detail: 'no AST parsers loaded; line-based fallback remains active'
      };
    }

    return {
      name: 'AST chunking',
      status: 'pass',
      detail: `verified parsers: ${verified.join(', ') || status.supported_languages.slice(0, 3).join(', ')}`
    };
  } catch (err: unknown) {
    return {
      name: 'AST chunking',
      status: 'warn',
      detail: (err as Error).message || String(err)
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Environment checks                                                 */
/* ------------------------------------------------------------------ */

export function checkFileSearch(): CheckResult {
  try {
    const result = spawnSync(RG_BIN, ['--version'], { stdio: 'pipe', encoding: 'utf8' });
    if (result.status === 0) {
      const ver = (result.stdout || '').split('\n')[0] || 'available';
      return {
        name: 'File search',
        status: 'pass',
        detail: `ripgrep ${ver.replace('ripgrep ', '').trim()}`,
      };
    }
    return {
      name: 'File search',
      status: 'warn',
      detail: 'ripgrep not found (file search will use fallback)',
    };
  } catch {
    return {
      name: 'File search',
      status: 'warn',
      detail: 'ripgrep not found (file search will use fallback)',
    };
  }
}

export function checkSkills(): CheckResult {
  try {
    const homeDir = os.homedir();
    const SKILL_META = '.synapse-skill.json';

    const knownDirs = [
      path.join(homeDir, '.agents', 'skills'),
      path.join(homeDir, '.codex', 'skills'),
      path.join(homeDir, '.copilot', 'skills'),
      path.join(homeDir, '.claude', 'skills'),
      path.join(homeDir, '.cursor', 'skills'),
      path.join(homeDir, '.codeium', 'windsurf', 'skills'),
      path.join(homeDir, '.opencode', 'skills'),
      path.join(homeDir, '.config', 'opencode', 'skills'),
      path.join(homeDir, '.gemini', 'skills'),
      path.join(homeDir, '.gemini', 'antigravity', 'skills'),
      path.join(homeDir, '.cline', 'skills'),
      path.join(homeDir, '.continue', 'skills'),
      path.join(homeDir, '.kiro', 'skills'),
    ];

    const clientsWithSkills = new Set<string>();

    for (const skillsDir of knownDirs) {
      if (!fs.existsSync(skillsDir)) continue;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(skillsDir, { withFileTypes: true });
      } catch { continue; }

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const metaPath = path.join(skillsDir, entry.name, SKILL_META);
        if (fs.existsSync(metaPath)) {
          const relative = skillsDir.replace(homeDir, '');
          const clientName = relative.split(path.sep).filter(Boolean)[0] || 'unknown';
          clientsWithSkills.add(clientName.replace(/^\./, ''));
          break;
        }
      }
    }

    if (clientsWithSkills.size === 0) {
      return {
        name: 'Skills',
        status: 'warn',
        detail: 'not installed (run: synapse skill install)',
      };
    }

    return {
      name: 'Skills',
      status: 'pass',
      detail: `installed in ${clientsWithSkills.size} AI client${clientsWithSkills.size === 1 ? '' : 's'}`,
    };
  } catch (err: unknown) {
    return {
      name: 'Skills',
      status: 'fail',
      detail: (err as Error).message || String(err),
    };
  }
}

export function checkHooks(): CheckResult {
  try {
    const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
    if (!fs.existsSync(settingsPath)) {
      return {
        name: 'Hooks',
        status: 'fail',
        detail: 'not installed (run: synapse hooks install)',
      };
    }

    const settings: any = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const hooks = settings.hooks || {};
    const preHooks = (hooks.PreToolUse || []).filter(
      (e: any) => e.hooks?.some((h: any) => h.command?.includes('synapse'))
    );
    const postHooks = (hooks.PostToolUse || []).filter(
      (e: any) => e.hooks?.some((h: any) => h.command?.includes('synapse'))
    );

    const count = preHooks.length + postHooks.length;
    if (count === 0) {
      return {
        name: 'Hooks',
        status: 'fail',
        detail: 'not installed (run: synapse hooks install)',
      };
    }

    return {
      name: 'Hooks',
      status: 'pass',
      detail: `${count} hook${count === 1 ? '' : 's'} active (pre: ${preHooks.length}, post: ${postHooks.length})`,
    };
  } catch {
    return {
      name: 'Hooks',
      status: 'fail',
      detail: 'not installed (run: synapse hooks install)',
    };
  }
}
