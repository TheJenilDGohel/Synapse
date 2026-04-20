import type {
  SymbolMatch,
  SymbolKind,
  FindCallersResult,
  FindDefinitionResult,
  FindImplementationsResult,
  RenamePreviewEntry,
  RenamePreviewResult,
  SymbolQueryOptions
} from './types.js';

interface DbLike {
  prepare(sql: string): {
    all(...params: unknown[]): Record<string, unknown>[];
  };
}

function rowToMatch(row: Record<string, unknown>): SymbolMatch {
  return {
    file: String(row.file_path || ''),
    line_start: Number(row.line_start) || 0,
    line_end: Number(row.line_end) || 0,
    text: String(row.context_text || ''),
    kind: (row.symbol_kind || 'reference') as SymbolKind,
    scope_path: String(row.scope_path || ''),
    language: String(row.language || ''),
    is_export: Boolean(row.is_export)
  };
}

function buildWhereClause(opts: SymbolQueryOptions): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts.projectPath) {
    conditions.push('file_path LIKE ?');
    params.push(opts.projectPath + '%');
  }
  if (opts.language) {
    conditions.push('language = ?');
    params.push(opts.language);
  }

  return {
    clause: conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '',
    params
  };
}

export function findCallers(
  db: DbLike,
  symbol: string,
  opts: SymbolQueryOptions = {}
): FindCallersResult {
  const maxResults = opts.maxResults ?? 100;
  const where = buildWhereClause(opts);

  const sql = `
    SELECT file_path, symbol_name, symbol_kind, line_start, line_end,
           context_text, scope_path, language, is_export
    FROM symbol_index
    WHERE symbol_name = ? AND is_definition = 0
    ${where.clause}
    ORDER BY file_path, line_start
    LIMIT ?
  `;

  const rows = db.prepare(sql).all(symbol, ...where.params, maxResults);
  const callers = rows.map(rowToMatch);

  return {
    symbol,
    count: callers.length,
    callers
  };
}

export function findDefinition(
  db: DbLike,
  symbol: string,
  opts: SymbolQueryOptions = {}
): FindDefinitionResult {
  const maxResults = opts.maxResults ?? 50;
  const where = buildWhereClause(opts);

  const sql = `
    SELECT file_path, symbol_name, symbol_kind, line_start, line_end,
           context_text, scope_path, language, is_export
    FROM symbol_index
    WHERE symbol_name = ? AND is_definition = 1
    ${where.clause}
    ORDER BY is_export DESC, file_path, line_start
    LIMIT ?
  `;

  const rows = db.prepare(sql).all(symbol, ...where.params, maxResults);
  const definitions = rows.map(rowToMatch);

  return {
    symbol,
    count: definitions.length,
    definitions
  };
}

export function findImplementations(
  db: DbLike,
  interfaceName: string,
  opts: SymbolQueryOptions = {}
): FindImplementationsResult {
  const maxResults = opts.maxResults ?? 100;
  const where = buildWhereClause(opts);

  // Heuristic: find classes/structs whose context_text references the interface.
  // Covers:
  //   - TS/JS: `class Foo implements Bar`
  //   - Python: `class Foo(Bar)`
  //   - Rust: `impl Bar for Foo`
  //   - Go: implicit (struct has methods matching interface) -- context_text won't help here,
  //         but we still match class/struct declarations that mention the interface name.
  const sql = `
    SELECT file_path, symbol_name, symbol_kind, line_start, line_end,
           context_text, scope_path, language, is_export
    FROM symbol_index
    WHERE is_definition = 1
      AND symbol_kind IN ('class', 'struct')
      AND (
        context_text LIKE '%implements ' || ? || '%'
        OR context_text LIKE '%implements ' || ? || ',%'
        OR context_text LIKE '%(' || ? || ')%'
        OR context_text LIKE '%(' || ? || ',%'
        OR context_text LIKE '%impl ' || ? || ' for%'
        OR context_text LIKE '%, ' || ? || '%'
      )
    ${where.clause}
    ORDER BY file_path, line_start
    LIMIT ?
  `;

  const rows = db.prepare(sql).all(
    interfaceName, interfaceName, interfaceName,
    interfaceName, interfaceName, interfaceName,
    ...where.params, maxResults
  );
  const implementations = rows.map(rowToMatch);

  return {
    symbol: interfaceName,
    count: implementations.length,
    implementations
  };
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function renamePreview(
  db: DbLike,
  oldName: string,
  newName: string,
  opts: SymbolQueryOptions = {}
): RenamePreviewResult {
  const maxResults = opts.maxResults ?? 500;
  const where = buildWhereClause(opts);

  const sql = `
    SELECT file_path, symbol_name, symbol_kind, line_start, line_end,
           context_text, scope_path, language, is_export
    FROM symbol_index
    WHERE symbol_name = ?
    ${where.clause}
    ORDER BY file_path, line_start
    LIMIT ?
  `;

  const rows = db.prepare(sql).all(oldName, ...where.params, maxResults);
  const replaceRe = new RegExp(`\\b${escapeRegex(oldName)}\\b`, 'g');
  const filesSet = new Set<string>();
  const changes: RenamePreviewEntry[] = [];

  for (const row of rows) {
    const filePath = String(row.file_path || '');
    const originalText = String(row.context_text || '');
    const previewText = originalText.replace(replaceRe, newName);

    filesSet.add(filePath);
    changes.push({
      file: filePath,
      line: Number(row.line_start) || 0,
      original_text: originalText,
      preview_text: previewText,
      kind: (row.symbol_kind || 'reference') as SymbolKind
    });
  }

  return {
    old_name: oldName,
    new_name: newName,
    total_changes: changes.length,
    files_affected: filesSet.size,
    changes
  };
}
