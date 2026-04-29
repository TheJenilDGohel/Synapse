import type { Adapter } from './types/index.js';

export const SCHEMA_VERSION = 13;

export async function ensureSchema(adapter: Adapter): Promise<void> {
  await adapter.exec(`
    CREATE TABLE IF NOT EXISTS memory_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memory_entries (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL,
      importance INTEGER NOT NULL DEFAULT 50,
      confidence REAL NOT NULL DEFAULT 0.7,
      scope_root_path TEXT NOT NULL DEFAULT '',
      scope_project_path TEXT NOT NULL DEFAULT '',
      scope_branch_name TEXT NOT NULL DEFAULT '',
      topic TEXT NOT NULL DEFAULT '',
      feature TEXT NOT NULL DEFAULT '',
      nest TEXT NOT NULL DEFAULT '',
      branch TEXT NOT NULL DEFAULT '',
      agent_id TEXT NOT NULL DEFAULT '',
      actor_id TEXT NOT NULL DEFAULT '',
      tags_json TEXT NOT NULL DEFAULT '[]',
      search_terms_json TEXT NOT NULL DEFAULT '[]',
      links_json TEXT NOT NULL DEFAULT '[]',
      source_type TEXT NOT NULL DEFAULT 'manual',
      source_ref TEXT NOT NULL DEFAULT '',
      fingerprint TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_recalled_at TEXT,
      recall_count INTEGER NOT NULL DEFAULT 0,
      embedding_json TEXT
    );

    CREATE TABLE IF NOT EXISTS memory_revisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      memory_id TEXT NOT NULL,
      revision INTEGER NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      tags_json TEXT NOT NULL DEFAULT '[]',
      links_json TEXT NOT NULL DEFAULT '[]',
      change_note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (memory_id) REFERENCES memory_entries(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS memory_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'processed',
      signal_score REAL NOT NULL DEFAULT 0,
      promoted_memory_id TEXT,
      scope_root_path TEXT NOT NULL DEFAULT '',
      scope_project_path TEXT NOT NULL DEFAULT '',
      scope_branch_name TEXT NOT NULL DEFAULT '',
      topic TEXT NOT NULL DEFAULT '',
      feature TEXT NOT NULL DEFAULT '',
      tags_json TEXT NOT NULL DEFAULT '[]',
      links_json TEXT NOT NULL DEFAULT '[]',
      source_ref TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_memory_entries_project ON memory_entries(scope_project_path);
    CREATE INDEX IF NOT EXISTS idx_memory_entries_topic ON memory_entries(topic);
    CREATE INDEX IF NOT EXISTS idx_memory_entries_status ON memory_entries(status);
    CREATE INDEX IF NOT EXISTS idx_memory_entries_updated_at ON memory_entries(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_memory_entries_fingerprint ON memory_entries(fingerprint);
    CREATE INDEX IF NOT EXISTS idx_memory_revisions_memory_id ON memory_revisions(memory_id, revision DESC);
    CREATE INDEX IF NOT EXISTS idx_memory_events_created_at ON memory_events(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_memory_events_project ON memory_events(scope_project_path);

    CREATE TABLE IF NOT EXISTS memory_relations (
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      relation_type TEXT NOT NULL DEFAULT 'related',
      created_at TEXT NOT NULL,
      PRIMARY KEY (source_id, target_id)
    );

    CREATE INDEX IF NOT EXISTS idx_memory_relations_source ON memory_relations(source_id);
    CREATE INDEX IF NOT EXISTS idx_memory_relations_target ON memory_relations(target_id);

    CREATE INDEX IF NOT EXISTS idx_memory_entries_scope_status
      ON memory_entries(scope_project_path, status, importance DESC);
    CREATE INDEX IF NOT EXISTS idx_memory_entries_kind_status
      ON memory_entries(kind, status);

    CREATE TABLE IF NOT EXISTS agent_diary (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      content TEXT NOT NULL,
      topic TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_agent_diary_agent_created
      ON agent_diary(agent_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS conversation_sources (
      id TEXT PRIMARY KEY,
      file_path TEXT NOT NULL,
      file_hash TEXT NOT NULL,
      turn_count INTEGER NOT NULL DEFAULT 0,
      memory_ids_json TEXT NOT NULL DEFAULT '[]',
      ingested_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_conv_sources_path_hash
      ON conversation_sources(file_path, file_hash);
  `);
}
