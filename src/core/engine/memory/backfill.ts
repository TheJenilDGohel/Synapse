/**
 * Filesystem project scanner + backfill for Synapse.
 * Scans a directory tree (up to 2 levels deep) for project markers,
 * and creates seed memory entries for projects with zero existing memories.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Adapter, ProjectBackfillOpts, ProjectBackfillProject, ProjectBackfillResult } from './types/index.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'target',
  '__pycache__', '.venv', '.next', '.cache', 'coverage'
]);

interface MarkerDef {
  file: string;
  language: string;
}

const MARKERS: MarkerDef[] = [
  { file: 'package.json', language: 'ts/js' },
  { file: 'Cargo.toml', language: 'rust' },
  { file: 'go.mod', language: 'go' },
  { file: 'pyproject.toml', language: 'python' },
  { file: 'setup.py', language: 'python' },
  { file: 'requirements.txt', language: 'python' },
  { file: 'pom.xml', language: 'java' },
  { file: 'build.gradle', language: 'java/kotlin' },
  { file: 'build.gradle.kts', language: 'kotlin' }
];

// ---------------------------------------------------------------------------
// Store-like interface (avoids importing MemoryStore to prevent circular deps)
// ---------------------------------------------------------------------------

interface MemoryStoreLike {
  adapter: Adapter | null;
  init(): Promise<unknown>;
  storeEntry(input: Record<string, unknown>): Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface DiscoveredProject {
  dirPath: string;
  name: string;
  language: string;
  marker: string;
}

function detectProject(dirPath: string): DiscoveredProject | null {
  for (const m of MARKERS) {
    if (fs.existsSync(path.join(dirPath, m.file))) {
      return { dirPath, name: path.basename(dirPath), language: m.language, marker: m.file };
    }
  }
  // .git-only fallback
  if (fs.existsSync(path.join(dirPath, '.git'))) {
    return { dirPath, name: path.basename(dirPath), language: 'unknown', marker: '.git' };
  }
  return null;
}

function walkProjects(rootPath: string, maxDepth: number): DiscoveredProject[] {
  const results: DiscoveredProject[] = [];

  function walk(dir: string, depth: number): void {
    if (depth > maxDepth) return;

    // Check current dir
    const proj = detectProject(dir);
    if (proj) {
      results.push(proj);
      return; // Don't recurse into a detected project
    }

    // Recurse into subdirectories
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // Permission error or similar
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (SKIP_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith('.') && entry.name !== '.git') continue;
      walk(path.join(dir, entry.name), depth + 1);
    }
  }

  walk(rootPath, 0);
  return results;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function scanAndBackfillProjects(
  store: MemoryStoreLike,
  opts: ProjectBackfillOpts
): Promise<ProjectBackfillResult> {
  const { rootPath, dryRun = false } = opts;

  if (!fs.existsSync(rootPath)) {
    return {
      root_path: rootPath,
      projects_found: 0,
      projects_backfilled: 0,
      projects_skipped: 0,
      dry_run: dryRun,
      projects: []
    };
  }

  await store.init();
  const adapter = store.adapter!;

  const discovered = walkProjects(rootPath, 2);
  const projects: ProjectBackfillProject[] = [];
  let backfilled = 0;
  let skipped = 0;

  for (const proj of discovered) {
    // Check existing memory count for this nest
    const row = await adapter.get<{ cnt: number }>(
      'SELECT COUNT(*) AS cnt FROM memory_entries WHERE nest = ?',
      [proj.name]
    );
    const count = row?.cnt ?? 0;

    if (count > 0) {
      skipped++;
      projects.push({
        path: proj.dirPath,
        name: proj.name,
        language: proj.language,
        marker: proj.marker,
        status: 'skipped_has_memories'
      });
      continue;
    }

    if (dryRun) {
      projects.push({
        path: proj.dirPath,
        name: proj.name,
        language: proj.language,
        marker: proj.marker,
        status: 'would_backfill'
      });
      continue;
    }

    // Create seed memory
    try {
      await store.storeEntry({
        title: proj.name,
        content: `Project "${proj.name}" (${proj.language}) detected at ${proj.dirPath} via ${proj.marker}.`,
        nest: proj.name,
        branch: 'project-info',
        tags: ['auto:project', `auto:${proj.language}`],
        source_type: 'project_scan',
        importance: 40
      });
      backfilled++;
      projects.push({
        path: proj.dirPath,
        name: proj.name,
        language: proj.language,
        marker: proj.marker,
        status: 'backfilled'
      });
    } catch (err) {
      projects.push({
        path: proj.dirPath,
        name: proj.name,
        language: proj.language,
        marker: proj.marker,
        status: 'error',
        error: (err as Error)?.message || String(err)
      });
    }
  }

  return {
    root_path: rootPath,
    projects_found: discovered.length,
    projects_backfilled: backfilled,
    projects_skipped: skipped,
    dry_run: dryRun,
    projects
  };
}
