import fs from 'node:fs';
import { stableJson } from './utils/formatting.js';
import { buildSearchTerms } from './utils/search-scoring.js';
import type { MigrationSpec, MigrationContext, Adapter } from './types/index.js';
import { SCHEMA_VERSION } from './schema.js';

export async function runMigrations({ adapter, getMeta, dbPath }: MigrationContext): Promise<void> {
  const currentVersion = Number.parseInt(await getMeta('schema_version') || '0', 10) || 0;

  if (currentVersion >= SCHEMA_VERSION) {
    return;
  }

  interface MigrationRow {
    id: string;
    title: string;
    summary: string;
    content: string;
    scope_root_path: string;
    scope_project_path: string;
    scope_branch_name: string;
    topic: string;
    feature: string;
    tags_json: string;
    links_json: string;
    source_ref: string;
  }

  const migrations: MigrationSpec[] = [
    {
      version: 2,
      migrate: async (ad: Adapter) => {
        try {
          await ad.exec(`ALTER TABLE memory_entries ADD COLUMN search_terms_json TEXT NOT NULL DEFAULT '[]'`);
        } catch {
          // Column may already exist on a fresh schema or partially migrated db.
        }

        const rows = await ad.all<MigrationRow>(
          `SELECT id, title, summary, content, scope_root_path, scope_project_path, scope_branch_name,
                  topic, feature, tags_json, links_json, source_ref
             FROM memory_entries`
        );

        for (const row of rows) {
          const searchTerms = buildSearchTerms({
            title: row.title,
            summary: row.summary,
            content: row.content,
            scope: {
              root_path: row.scope_root_path,
              project_path: row.scope_project_path,
              branch_name: row.scope_branch_name,
              topic: row.topic,
              feature: row.feature
            },
            tags: JSON.parse(row.tags_json || '[]'),
            links: JSON.parse(row.links_json || '[]'),
            sourceRef: row.source_ref
          });
          await ad.run(
            'UPDATE memory_entries SET search_terms_json = ? WHERE id = ?',
            [stableJson(searchTerms), row.id]
          );
        }
      }
    },
    {
      version: 3,
      migrate: async () => {
        // memory_relations table created via CREATE TABLE IF NOT EXISTS in ensureSchema.
      }
    },
    {
      version: 4,
      migrate: async (ad) => {
        try {
          await ad.exec(`ALTER TABLE memory_entries ADD COLUMN embedding_json TEXT`);
        } catch {
          // Column already exists on fresh schema.
        }
      }
    },
    {
      version: 5,
      migrate: async (ad) => {
        await ad.exec(`
          CREATE INDEX IF NOT EXISTS idx_memory_entries_scope_status
            ON memory_entries(scope_project_path, status, importance DESC);
          CREATE INDEX IF NOT EXISTS idx_memory_entries_kind_status
            ON memory_entries(kind, status);
        `);
      }
    },
    {
      version: 6,
      migrate: async (ad) => {
        await ad.exec(`
          CREATE TABLE IF NOT EXISTS kg_entities (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            entity_type TEXT NOT NULL DEFAULT 'concept',
            properties_json TEXT NOT NULL DEFAULT '{}',
            memory_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )
        `);

        await ad.exec(`
          CREATE TABLE IF NOT EXISTS kg_triples (
            id TEXT PRIMARY KEY,
            subject_id TEXT NOT NULL,
            predicate TEXT NOT NULL,
            object_id TEXT NOT NULL,
            valid_from TEXT,
            valid_to TEXT,
            confidence REAL NOT NULL DEFAULT 1.0,
            source_memory_id TEXT,
            source_type TEXT NOT NULL DEFAULT 'manual',
            created_at TEXT NOT NULL,
            FOREIGN KEY (subject_id) REFERENCES kg_entities(id),
            FOREIGN KEY (object_id) REFERENCES kg_entities(id)
          )
        `);

        await ad.exec(`CREATE INDEX IF NOT EXISTS idx_kg_entities_type ON kg_entities(entity_type)`);
        await ad.exec(`CREATE INDEX IF NOT EXISTS idx_kg_entities_memory ON kg_entities(memory_id)`);
        await ad.exec(`CREATE INDEX IF NOT EXISTS idx_kg_triples_subject ON kg_triples(subject_id)`);
        await ad.exec(`CREATE INDEX IF NOT EXISTS idx_kg_triples_object ON kg_triples(object_id)`);
        await ad.exec(`CREATE INDEX IF NOT EXISTS idx_kg_triples_predicate ON kg_triples(predicate)`);
        await ad.exec(`CREATE INDEX IF NOT EXISTS idx_kg_triples_valid ON kg_triples(valid_from, valid_to)`);
        await ad.exec(`CREATE INDEX IF NOT EXISTS idx_kg_triples_source ON kg_triples(source_memory_id)`);
      }
    },
    {
      version: 7,
      migrate: async (ad) => {
        try {
          await ad.exec(`ALTER TABLE memory_entries ADD COLUMN nest TEXT NOT NULL DEFAULT ''`);
        } catch {
          // Column may already exist on fresh schema
        }
        try {
          await ad.exec(`ALTER TABLE memory_entries ADD COLUMN branch TEXT NOT NULL DEFAULT ''`);
        } catch {
          // Column may already exist on fresh schema
        }
        await ad.exec(`CREATE INDEX IF NOT EXISTS idx_memory_entries_nest_branch ON memory_entries(nest, branch)`);
      }
    },
    {
      version: 8,
      migrate: async (ad) => {
        try {
          await ad.exec(`ALTER TABLE memory_entries ADD COLUMN agent_id TEXT NOT NULL DEFAULT ''`);
        } catch {
          // Column may already exist on fresh schema
        }
        await ad.exec(`CREATE INDEX IF NOT EXISTS idx_memory_entries_agent_id ON memory_entries(agent_id)`);
        await ad.exec(`
          CREATE TABLE IF NOT EXISTS agent_diary (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            content TEXT NOT NULL,
            topic TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL
          )
        `);
        await ad.exec(`CREATE INDEX IF NOT EXISTS idx_agent_diary_agent_created ON agent_diary(agent_id, created_at DESC)`);
      }
    },
    {
      version: 9,
      migrate: async (ad) => {
        await ad.exec(`
          CREATE TABLE IF NOT EXISTS conversation_sources (
            id TEXT PRIMARY KEY,
            file_path TEXT NOT NULL,
            file_hash TEXT NOT NULL,
            turn_count INTEGER NOT NULL DEFAULT 0,
            memory_ids_json TEXT NOT NULL DEFAULT '[]',
            ingested_at TEXT NOT NULL
          )
        `);
        await ad.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_sources_path_hash ON conversation_sources(file_path, file_hash)`);
      }
    },
    {
      version: 10,
      migrate: async (ad) => {
        // Composite indexes for performance quick wins
        await ad.exec(`CREATE INDEX IF NOT EXISTS idx_kg_triples_subject_valid ON kg_triples(subject_id, valid_to, object_id)`);
        await ad.exec(`CREATE INDEX IF NOT EXISTS idx_memory_entries_status_embedding ON memory_entries(status) WHERE embedding_json IS NOT NULL`);
        await ad.exec(`CREATE INDEX IF NOT EXISTS idx_kg_triples_pred_subject ON kg_triples(predicate, subject_id)`);
      }
    },
    {
      version: 11,
      migrate: async (ad) => {
        // Additive: create the predicate cardinality override table.
        // Empty by default -- all rules come from the hardcoded FUNCTIONAL_PREDICATES
        // set in knowledge-graph/kg.ts unless users add rows here.
        // Fixes false-positive contradiction detection for multi-valued predicates.
        await ad.exec(`
          CREATE TABLE IF NOT EXISTS kg_predicate_cardinality (
            predicate TEXT PRIMARY KEY,
            cardinality TEXT NOT NULL CHECK(cardinality IN ('functional','multi')),
            updated_at TEXT NOT NULL
          )
        `);
      }
    },
    {
      version: 12,
      migrate: async (ad) => {
        // BITEMP-01: add recorded_at transaction-time column to kg_triples.
        // Existing rows are backfilled from created_at so historical data has
        // a non-empty recorded_at value. recorded_at becomes the canonical
        // transaction-time axis; created_at stays as row metadata for
        // backwards compat.
        try {
          await ad.exec(`ALTER TABLE kg_triples ADD COLUMN recorded_at TEXT NOT NULL DEFAULT ''`);
        } catch {
          // Column may already exist on a fresh schema or partially migrated db.
        }
        await ad.exec(`UPDATE kg_triples SET recorded_at = created_at WHERE recorded_at = ''`);
        await ad.exec(`CREATE INDEX IF NOT EXISTS idx_kg_triples_recorded_at ON kg_triples(recorded_at)`);
      }
    },
    {
      version: 13,
      migrate: async (ad) => {
        // ACTOR-01: add actor attribution column to memory_entries.
        // actor_id = who created this memory (user, agent, tool).
        // Separate from agent_id which is the visibility-scoping axis.
        try {
          await ad.exec(`ALTER TABLE memory_entries ADD COLUMN actor_id TEXT NOT NULL DEFAULT ''`);
        } catch {
          // Column already exists on fresh schema — idempotent.
        }
        await ad.exec(`CREATE INDEX IF NOT EXISTS idx_memory_entries_actor_id ON memory_entries(actor_id)`);
      }
    },
    {
      version: 14,
      migrate: async (ad) => {
        // Feature 1 - Dead Reckoning Context Engine
        await ad.exec(`
          CREATE TABLE IF NOT EXISTS file_cooccurrence (
            file_a         TEXT NOT NULL,
            file_b         TEXT NOT NULL,
            session_count  INTEGER DEFAULT 1,
            last_seen      INTEGER NOT NULL,
            PRIMARY KEY (file_a, file_b)
          );
        `);
        await ad.exec(`
          CREATE TABLE IF NOT EXISTS session_patterns (
            id             TEXT PRIMARY KEY,
            files_touched  TEXT NOT NULL,
            tools_called   TEXT NOT NULL,
            session_date   INTEGER NOT NULL,
            duration_ms    INTEGER
          );
        `);
        await ad.exec(`CREATE INDEX IF NOT EXISTS idx_cooccurrence_file_a ON file_cooccurrence(file_a);`);
        await ad.exec(`CREATE INDEX IF NOT EXISTS idx_cooccurrence_last_seen ON file_cooccurrence(last_seen);`);
      }
    },
    {
      version: 15,
      migrate: async (ad) => {
        // Feature 2 - Immune System
        await ad.exec(`
          CREATE TABLE IF NOT EXISTS mistake_patterns (
            id               TEXT PRIMARY KEY,
            category         TEXT NOT NULL,
            title            TEXT NOT NULL,
            description      TEXT NOT NULL,
            code_signature   TEXT NOT NULL,
            languages        TEXT NOT NULL,
            triggered_by     TEXT NOT NULL,
            resolution       TEXT NOT NULL,
            first_encountered INTEGER NOT NULL,
            times_triggered  INTEGER DEFAULT 0,
            source_file      TEXT,
            severity         TEXT NOT NULL DEFAULT 'medium',
            embedding        BLOB,
            dismissed        INTEGER DEFAULT 0,
            dismissed_reason TEXT
          );
        `);
        await ad.exec(`
          CREATE TABLE IF NOT EXISTS immune_warnings_log (
            id           TEXT PRIMARY KEY,
            pattern_id   TEXT NOT NULL,
            fired_at     INTEGER NOT NULL,
            file_path    TEXT NOT NULL,
            confidence   REAL NOT NULL,
            dismissed    INTEGER DEFAULT 0,
            FOREIGN KEY (pattern_id) REFERENCES mistake_patterns(id)
          );
        `);
        await ad.exec(`
          CREATE VIRTUAL TABLE IF NOT EXISTS mistake_patterns_fts 
          USING fts5(title, description, code_signature, resolution);
        `);
      }
    },
    {
      version: 16,
      migrate: async (ad) => {
        // Feature 3 - Pre-Mortem Engine
        await ad.exec(`
          CREATE TABLE IF NOT EXISTS failure_pattern_library (
            id           TEXT PRIMARY KEY,
            technology   TEXT,
            pattern      TEXT,
            title        TEXT NOT NULL,
            description  TEXT NOT NULL,
            likelihood   TEXT NOT NULL,
            severity     TEXT NOT NULL,
            mitigation   TEXT NOT NULL,
            source_url   TEXT,
            embedding    BLOB,
            created_at   INTEGER NOT NULL,
            is_builtin   INTEGER DEFAULT 0
          );
        `);
        await ad.exec(`
          CREATE TABLE IF NOT EXISTS premortem_reports (
            id             TEXT PRIMARY KEY,
            proposal_json  TEXT NOT NULL,
            report_json    TEXT NOT NULL,
            created_at     INTEGER NOT NULL,
            outcome        TEXT,
            outcome_notes  TEXT
          );
        `);
        await ad.exec(`CREATE INDEX IF NOT EXISTS idx_fpl_technology ON failure_pattern_library(technology);`);
        await ad.exec(`CREATE INDEX IF NOT EXISTS idx_fpl_pattern ON failure_pattern_library(pattern);`);
      }
    },
    {
      version: 17,
      migrate: async (ad) => {
        // Memory Conflict Resolution (Phase 2)
        try {
          await ad.exec(`ALTER TABLE memory_entries ADD COLUMN invalidated_at TEXT`);
        } catch {
          // Column already exists on fresh schema
        }
      }
    }
  ];

  let migrated = false;
  for (const { version, migrate } of migrations) {
    if (currentVersion >= version) {
      continue;
    }
    migrated = true;
    
    // Backup before migrating
    let backupPath: string | null = null;
    if (dbPath && fs.existsSync(dbPath)) {
      backupPath = `${dbPath}.v${currentVersion}.backup`;
      fs.copyFileSync(dbPath, backupPath);
    }
    
    try {
      await adapter.transaction(async (ad: Adapter) => {
        await migrate(ad);
        await ad.run(
          "INSERT OR REPLACE INTO memory_meta(key, value) VALUES ('schema_version', ?)",
          [String(version)]
        );
      });
    } catch (error) {
      // Restore from backup on failure
      if (backupPath && fs.existsSync(backupPath)) {
        try {
          fs.copyFileSync(backupPath, dbPath!);
        } catch { /* best-effort restore */ }
      }
      throw new Error(`Migration to version ${version} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Update SQLite query planner statistics after schema changes
  if (migrated) {
    try {
      await adapter.exec('PRAGMA optimize');
    } catch {
      // PRAGMA optimize may not be supported on all SQLite builds
    }
  }
}
