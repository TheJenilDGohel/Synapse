# Phase 44: Backup & Restore - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning
**Mode:** Smart discuss (accept-recommended)

<domain>
## Phase Boundary

Two MCP tools (`synapse_backup`, `synapse_restore`) and a CLI subcommand
group (`synapse backup create/restore/list`) provide point-in-time SQLite
backup and restore of the memory database. Backup uses SQLite's `VACUUM INTO`
SQL command — works on the open DB, produces a clean compacted copy with no WAL
baggage. Restore verifies backup integrity, copies the backup file over the
current DB path, and returns `restart_required: true` (the running MCP process
uses the old file handle until restart).

Out of scope: hot-reload after restore, vector index backup, symbols index
backup, automated scheduled backups, backup encryption, incremental backups,
multi-DB bundled backup, WAL checkpoint before VACUUM (VACUUM INTO implicitly
checkpoints), compressing backups, backup rotation policy.

</domain>

<decisions>
## Implementation Decisions

### Shared Backup Logic (Accepted)
- Create `src/services/memory/backup.ts` (~60 lines) exporting:
  ```ts
  export interface BackupResult {
    path: string;
    size_bytes: number;
    created_at: string;
    integrity: string; // 'ok' or error message
  }
  export interface RestoreResult {
    restored_from: string;
    db_path: string;
    restart_required: true;
    integrity: string;
  }
  export async function backupDatabase(adapter: Adapter, destPath: string): Promise<BackupResult>
  export async function restoreDatabase(sourcePath: string, destDbPath: string): Promise<RestoreResult>
  ```
- `backupDatabase`: calls `adapter.exec(\`VACUUM INTO '${destPath}';\`)`, then
  opens a temporary `DatabaseSync` connection on `destPath` to run
  `PRAGMA integrity_check` and close immediately. Returns size via `fs.statSync`.
- `restoreDatabase`: opens a temporary `DatabaseSync` on `sourcePath`, runs
  `PRAGMA integrity_check`, throws if not 'ok'. Then `fs.copyFileSync(sourcePath, destDbPath)`.
  Returns `{ restored_from, db_path, restart_required: true, integrity }`.
- BOTH functions sanitize destPath/sourcePath: resolve to absolute path, assert
  `path.extname(destPath) === '.db'` (or just warn), reject paths outside of safe
  boundaries — no traversal beyond what `path.resolve()` provides.
- Import `Adapter` from `./types.js` (same module as store.ts).

### Default Backup Destination (Accepted)
- When MCP `synapse_backup` is called without `destination`, default to
  `{memoryDbDir}/backups/{YYYY-MM-DDTHH-MM-SS}.db` where `memoryDbDir =
  path.dirname(memoryDbPath)`. This keeps backups co-located with the DB.
- The `backups/` subdirectory is created with `fs.mkdirSync({recursive:true})`
  before VACUUM.
- CLI `synapse backup create [dest]` uses the same default when `[dest]` is
  omitted.

### MCP Tools (Accepted)
- Create `src/mcp/tools/backup-tools.ts` (~80 lines) registering 2 tools:

  **synapse_backup** (IDEMPOTENT_WRITE_ANNOTATIONS, ACK_RESULT_SCHEMA):
  ```ts
  inputSchema: { destination: z.string().optional() }
  ```
  Calls `backupDatabase(memoryAdapter, resolvedDest)`. Returns
  `{ ok: true, message, backup_path, size_bytes, created_at, integrity }`.
  If the memory store is not initialized, returns error message.

  **synapse_restore** (DESTRUCTIVE_ANNOTATIONS, ACK_RESULT_SCHEMA):
  ```ts
  inputSchema: { source: z.string() }
  ```
  Calls `restoreDatabase(source, memoryDbPath)`. Returns
  `{ ok: true, message: 'Backup restored. Restart the MCP server to apply changes.', ... }`.
  If `source` does not exist, returns an error.

- `registerBackupTools` options:
  ```ts
  interface RegisterBackupToolsOptions {
    registerJsonTool: RegisterJsonToolFn;
    getMemoryAdapter: () => Adapter | null;
    memoryDbPath: string;
  }
  ```
  The `getMemoryAdapter` is a lazy getter that returns `memory.store.adapter` (or
  null if not initialized). `memoryDbPath` is passed directly from `runtime.memoryDbPath`.

- Wire in `src/app/register-tools.ts`: add `registerBackupTools` import + call.
- Wire in `src/mcp/tools/index.ts`: export `registerBackupTools`.

### CLI Subcommand (Accepted)
- Create `src/cli/commands/backup.ts` (~80 lines) with noun `backup`:
  - verb `create [dest]` — calls backupDatabase, prints result JSON
  - verb `restore <src>` — calls restoreDatabase, prints result JSON with warning
  - verb `list` — lists files in `{memoryDbDir}/backups/` sorted newest-first
- The CLI directly bootstraps a `MemoryStore` and calls `init()` to get the
  adapter, then calls `backupDatabase`/`restoreDatabase` directly (no MCP
  transport layer).
- Add to `src/cli/router.ts` NOUN_MODULES: `['backup', '../src/cli/commands/backup.js']`.

### MemoryService Adapter Exposure (Accepted)
- `MemoryService` already exposes `store` (a `MemoryStore` instance). 
  `MemoryStore` has `adapter` property (typed `Adapter | null`). Access via
  `memory.store?.adapter ?? null` in the MCP tool options builder.
- Check `src/services/memory/service.ts` for `store` accessor. If not public,
  add a getter `getAdapter(): Adapter | null { return this.store?.adapter ?? null; }`.

### Annotation + Schema Assignment (Accepted)
- `synapse_backup`: `IDEMPOTENT_WRITE_ANNOTATIONS` — creates a file but doesn't
  modify the primary DB; same destination is idempotent (overwrites).
- `synapse_restore`: `DESTRUCTIVE_ANNOTATIONS` — replaces the live DB file.
- Both: `ACK_RESULT_SCHEMA` (returns `{ ok, message }` plus extra fields).

### Test Strategy (Accepted)
- New `test/backup-restore.test.js` (~150 lines):
  1. `backupDatabase` creates backup file at destination, file exists, integrity === 'ok'
  2. `backupDatabase` twice to same dest — second overwrites without error (idempotent)
  3. `restoreDatabase` from valid backup — returns `restart_required: true`, integrity === 'ok'
  4. `restoreDatabase` from non-existent file — throws
  5. `synapse_backup` MCP handler — happy path, backup_path exists in result
  6. `synapse_restore` MCP handler — happy path, restart_required true in result
- Use `fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-backup-test-'))` for isolation.

### Claude's Discretion
- Whether to export `BackupResult`/`RestoreResult` types from the barrel or keep
  them internal. Keep internal — callers only need the return value shape.
- Whether to validate that `source` is a valid SQLite file (magic bytes check).
  Skip — `PRAGMA integrity_check` on the opened DB catches corrupt files.
- Whether to store backup metadata in a JSON sidecar. Skip — YAGNI for v0.3.0.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Adapter` interface at `src/services/memory/types.ts` (or `adapter.ts`) exposes
  `exec(sql: string): Promise<void>`.
- `MemoryStore` at `src/services/memory/store.ts:87` has `adapter: Adapter | null`
  (set after `init()` succeeds).
- `MemoryService` at `src/services/memory/service.ts` wraps `MemoryStore` as
  `this.store`; `this.store.adapter` is the live adapter.
- `VACUUM INTO` confirmed working with `node:sqlite` DatabaseSync in Node.js 22.16.
- `DatabaseSync` has no native `.backup()` method — `VACUUM INTO` is the only
  option without closing the DB.
- `src/runtime/home-layout.ts` already defines `dirs.backups` directory; it is
  created by `migrateLocalnestHomeLayout()` at startup. The `memoryDbPath` and
  `synapseHome` are both in `runtime` object at `registerAppTools` time.

### Established Patterns
- Tool registration: `src/mcp/tools/audit-tools.ts` is the simplest example —
  single-tool file, passes a service interface, `BUNDLE_RESULT_SCHEMA`.
- CLI noun-verb commands: `src/cli/commands/kg.ts` pattern — VERBS array,
  `printSubcommandHelp`, `parseFlags`, `createMemoryService()` bootstrap.
- Test isolation: `fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-...'))` with
  `fs.rmSync(root, {recursive:true,force:true})` cleanup.

### Integration Points
- `src/app/register-tools.ts`: pass `getMemoryAdapter: () => services.memory.getAdapter?.() ?? null`
  and `memoryDbPath: runtime.memoryDbPath`.
- `src/mcp/tools/index.ts`: add `export { registerBackupTools } from './backup-tools.js'`.
- `src/cli/router.ts`: add one entry to NOUN_MODULES.
- Tool count: 72 currently; adding 2 → 74.

</code_context>

<specifics>
## Specific Ideas

- `VACUUM INTO` sanitization: the destination path is interpolated into a SQL
  string. Use a parameterized approach if possible, OR validate that the path
  contains no single quotes before interpolating. SQLite does NOT support bound
  parameters for `VACUUM INTO`. Escape single quotes in the path by doubling:
  `destPath.replace(/'/g, "''")`.
- The `restoreDatabase` function should NOT attempt the copy if `PRAGMA integrity_check`
  returns anything other than 'ok' — fail early with a clear error message.
- `ACK_RESULT_SCHEMA` for both tools. The response envelope has `ok: boolean` and
  `message: string` as minimum fields. Extra fields (`backup_path`, `size_bytes`,
  `restart_required`) are allowable additions.
- The tool count update (72 → 74) must be reflected in the README tool count and
  the `TOOL_COUNT` constant in `src/cli/tool-count.ts` (or wherever that is).

</specifics>

<deferred>
## Deferred Ideas

- Vector index DB backup (`sqliteDbPath`) — deferred. Main value is the memory DB.
- Symbols index DB backup — deferred. It can be rebuilt from source files.
- Hot-reload after restore (close + reinitialize MemoryStore inline) — deferred.
  Too risky for v0.3.0; restart is safe.
- Backup rotation / auto-prune (keep last N backups) — deferred. YAGNI.
- Bundled backup (memory + vec + symbols in one archive) — deferred.
- Backup encryption — deferred.
- Incremental / WAL-segment backups — deferred. `VACUUM INTO` is good enough.
- Scheduled / automated backups via hooks — deferred to a later phase.
- `synapse backup restore` dry-run mode — deferred.

</deferred>
