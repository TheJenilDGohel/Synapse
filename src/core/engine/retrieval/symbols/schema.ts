export const SYMBOL_INDEX_SCHEMA = `
CREATE TABLE IF NOT EXISTS symbol_index (
  id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  symbol_name TEXT NOT NULL,
  symbol_kind TEXT NOT NULL,
  node_type TEXT,
  line_start INTEGER NOT NULL,
  line_end INTEGER NOT NULL,
  scope_path TEXT DEFAULT '',
  language TEXT NOT NULL,
  is_definition INTEGER DEFAULT 0,
  is_export INTEGER DEFAULT 0,
  context_text TEXT DEFAULT '',
  indexed_at TEXT NOT NULL,
  UNIQUE(file_path, symbol_name, line_start, symbol_kind)
);
CREATE INDEX IF NOT EXISTS idx_symbol_name ON symbol_index(symbol_name);
CREATE INDEX IF NOT EXISTS idx_symbol_file ON symbol_index(file_path);
CREATE INDEX IF NOT EXISTS idx_symbol_kind ON symbol_index(symbol_kind);
CREATE INDEX IF NOT EXISTS idx_symbol_lang ON symbol_index(language);
CREATE INDEX IF NOT EXISTS idx_symbol_def ON symbol_index(symbol_name, is_definition);
`;

export function ensureSymbolIndexTable(db: { exec(sql: string): void }): void {
  for (const stmt of SYMBOL_INDEX_SCHEMA.split(';').filter(s => s.trim())) {
    db.exec(stmt.trim() + ';');
  }
}
