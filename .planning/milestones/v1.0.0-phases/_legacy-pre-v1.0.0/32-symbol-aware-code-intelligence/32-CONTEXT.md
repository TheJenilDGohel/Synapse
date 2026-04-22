# Phase 32: Symbol-Aware Code Intelligence - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning
**Mode:** Manual (highest-risk phase in v0.2.0 -- explicit design)

<domain>
## Phase Boundary

Agents can perform precise symbol queries -- find callers, find definitions, find implementations, rename preview -- across indexed repos using tree-sitter AST parsing. Queries must complete in under 500ms on a 1000-file repo. Supports TypeScript, JavaScript, Python, Go, and Rust at minimum.

**In scope (REQ-IDs from REQUIREMENTS.md):**
- SYM-01: `synapse_find_callers(symbol)` returns every call site of a function or method across indexed files
- SYM-02: `synapse_find_definition(symbol)` returns the declaration location(s) of a symbol
- SYM-03: `synapse_find_implementations(interface)` returns every implementor of an interface or protocol
- SYM-04: `synapse_rename_preview(old, new)` returns every location that would change if the symbol were renamed
- SYM-05: Tree-sitter AST parsing supports TypeScript, JavaScript, Python, Go, and Rust
- SYM-06: Symbol queries complete in under 500ms on a 1000-file repo

**Out of scope:**
- Unified search `find` (Phase 31)
- Agent surface slim-down (Phase 34)
- Cross-project bridges (Phase 35)
- Incremental re-indexing on file change (future -- full re-parse per query or cached ASTs)

</domain>

<decisions>
## Implementation Decisions

### Phased risk mitigation: regex-first, tree-sitter-enhanced

This is the highest-risk phase in v0.2.0 (new runtime dep, 5 grammars, 500ms perf target). The plan uses a 3-task phased approach:

1. **Task 1 (Plan 01):** Build the symbol index SQLite table + regex-based symbol extraction pipeline. This delivers immediate value using existing `ripgrep` + regex patterns (already proven in `symbol-search.ts` and `lexical-search.ts`). Indexes symbol locations into a `symbol_index` table for fast lookup.

2. **Task 2 (Plan 01):** Layer tree-sitter AST parsing as an optional enhancer on top of the regex index. Tree-sitter already exists in the codebase for chunking (see `chunker/service.ts`); this task reuses the `AstChunker` infrastructure to extract precise AST node types. When tree-sitter is available, symbols get richer metadata (node type, scope path, parameter info). When unavailable, regex results are still functional.

3. **Task 3 (Plan 01):** Register four new MCP tools (`synapse_find_callers`, `synapse_find_definition`, `synapse_find_implementations`, `synapse_rename_preview`) that query the symbol index.

### Architecture: Symbol Index Table

A new SQLite table `symbol_index` stores extracted symbols per-file:

```sql
CREATE TABLE IF NOT EXISTS symbol_index (
  id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  symbol_name TEXT NOT NULL,
  symbol_kind TEXT NOT NULL,        -- 'function' | 'class' | 'interface' | 'type' | 'method' | 'variable' | 'struct' | 'trait' | 'enum' | 'module'
  node_type TEXT,                   -- tree-sitter node type (null for regex-only)
  line_start INTEGER NOT NULL,
  line_end INTEGER NOT NULL,
  scope_path TEXT DEFAULT '',       -- 'ClassName > methodName' hierarchy
  language TEXT NOT NULL,           -- 'typescript' | 'javascript' | 'python' | 'go' | 'rust'
  is_definition INTEGER DEFAULT 0, -- 1 if this is the declaration site
  is_export INTEGER DEFAULT 0,     -- 1 if exported/public
  context_text TEXT DEFAULT '',     -- surrounding code snippet (trimmed, max 200 chars)
  indexed_at TEXT NOT NULL,
  UNIQUE(file_path, symbol_name, line_start, symbol_kind)
);
CREATE INDEX IF NOT EXISTS idx_symbol_name ON symbol_index(symbol_name);
CREATE INDEX IF NOT EXISTS idx_symbol_file ON symbol_index(file_path);
CREATE INDEX IF NOT EXISTS idx_symbol_kind ON symbol_index(symbol_kind);
CREATE INDEX IF NOT EXISTS idx_symbol_lang ON symbol_index(language);
```

### Language support

Tree-sitter grammars already in package.json (optional deps):
- `tree-sitter` (core): ^0.25.0
- `tree-sitter-javascript`: ^0.25.0 (covers JS -- TS reuses JS grammar + TSX variants)
- `tree-sitter-python`: ^0.25.0
- `tree-sitter-go`: ^0.25.0

Missing grammars to add:
- `tree-sitter-typescript`: needed for TS/TSX-specific nodes (interface_declaration, type_alias_declaration)
- `tree-sitter-rust`: needed for Rust (struct_item, impl_item, trait_item, fn_item)

The existing `LANGUAGE_LOADERS` in `chunker/languages.ts` will be extended with typescript, tsx, and rust entries. The `DECL_TYPES_BY_LANG` map already has entries for all 5 target languages.

### Performance strategy for 500ms target

- **Index once, query many:** Symbol extraction runs during `synapse_index_project` or lazily on first symbol query. Results cached in `symbol_index` table. Subsequent queries are pure SQLite lookups.
- **Batch file processing:** Process files in parallel batches during indexing using `Promise.all` with concurrency limits.
- **Query-time optimization:** All four MCP tools resolve to parameterized `SELECT` queries on `symbol_index` -- O(log N) via B-tree indexes. No AST parsing at query time.
- **Staleness check:** Use file mtime comparison with `indexed_at` to detect stale entries. Re-parse only changed files.

### find_callers (SYM-01)

Query: `SELECT * FROM symbol_index WHERE symbol_name = ? AND is_definition = 0 AND symbol_kind IN ('call', 'reference')` plus context from the file. Enriched with the regex `classifySymbolLine` to confirm `call` classification at query time.

### find_definition (SYM-02)

Query: `SELECT * FROM symbol_index WHERE symbol_name = ? AND is_definition = 1`. Falls back to regex `buildDefinitionPattern` search if no indexed results found.

### find_implementations (SYM-03)

Two-step: (1) find the interface/trait/protocol declaration, (2) find all classes/structs that reference it in their declaration. For TypeScript: `class X implements Y`; Python: `class X(Y)`; Go: implicit interface satisfaction (check method signatures); Rust: `impl Trait for Struct`. Regex fallback for Go interface satisfaction is approximate.

### rename_preview (SYM-04)

Query: `SELECT * FROM symbol_index WHERE symbol_name = ?` returns all occurrences. Group by file, sort by line number. Response includes a diff-like preview of what would change. No files are modified -- read-only preview.

### Tree-sitter as optional enhancer (not hard requirement)

Critical design choice: all four tools MUST work with regex-only extraction when tree-sitter is unavailable. Tree-sitter provides better precision (fewer false positives) and richer metadata (scope paths, exact node types) but is not required for basic functionality.

### New runtime dependencies

Explicitly allowed for this phase:
- `tree-sitter-typescript` (optional)
- `tree-sitter-rust` (optional)

Both are optional peer deps -- Synapse degrades gracefully without them (regex-only mode).

### File organization

```
src/services/retrieval/symbols/
  index.ts         -- SymbolIndexService: orchestrates extraction + DB writes
  extractor.ts     -- extractSymbols(): regex-first + tree-sitter-enhanced extraction
  queries.ts       -- findCallers, findDefinition, findImplementations, renamePreview
  types.ts         -- SymbolEntry, SymbolQuery*, SymbolResult* interfaces
  schema.sql.ts    -- symbol_index CREATE TABLE + indexes
```

All new files. No modification to existing retrieval modules except:
- `src/services/retrieval/search/service.ts`: add findCallers, findDefinition, findImplementations, renamePreview methods that delegate to symbol queries
- `src/services/retrieval/chunker/languages.ts`: add typescript, tsx, rust to LANGUAGE_LOADERS + LANGUAGE_PACKAGES
- `src/mcp/tools/retrieval.ts`: register 4 new MCP tools
- `src/app/create-services.ts`: wire SymbolIndexService into the service graph

</decisions>

<code_context>
## Existing Code Insights

### Tree-sitter infrastructure (already in codebase)

`src/services/retrieval/chunker/service.ts` (`AstChunker` class):
- Already loads tree-sitter dynamically via `import('tree-sitter')`, handles missing dep gracefully
- Caches parser instances per language in `parserByLanguage` Map
- `getParser(languageId)` returns a ready parser or null
- `collectCandidateNodes(root, languageId)` walks AST collecting declaration nodes
- Currently used for semantic chunking only -- no symbol index output

`src/services/retrieval/chunker/languages.ts`:
- `LANG_BY_EXT`: maps file extensions to language IDs (covers JS, TS, TSX, Python, Go, Rust, and more)
- `DECL_TYPES_BY_LANG`: maps language IDs to Sets of tree-sitter node types that represent declarations. Already has entries for typescript, python, go, rust.
- `LANGUAGE_LOADERS`: dynamic import functions for grammar packages. Currently has: javascript, python, go, bash, lua, dart. Missing: typescript, tsx, rust.
- `LANGUAGE_PACKAGES`: package name mapping. Same gaps as LANGUAGE_LOADERS.

`src/services/retrieval/chunker/ast-utils.ts`:
- `getNodeName(node)`: extracts identifier name from an AST node
- `buildScopePath(node, languageId)`: walks parent chain to build `Class > method` scope paths
- `TreeSitterNode` interface: type, text, parent, namedChildren, startPosition, endPosition, childForFieldName

### Regex-based symbol search (already in codebase)

`src/services/retrieval/core/symbol-search.ts`:
- `buildDefinitionPattern(symbol)`: regex matching function/class/interface/type/const/let/var/def/func/fn/struct/trait/impl declarations
- `classifySymbolLine(line, symbol)`: returns 'import' | 'call' | 'definition' | 'reference'
- `buildSymbolWordPattern(symbol)`: `\bsymbol\b` word-boundary match
- Already supports multi-language patterns

`src/services/retrieval/search/service.ts` (`SearchService`):
- `getSymbol()`: uses `buildDefinitionPattern` + regex search to find definitions/exports
- `findUsages()`: uses `buildSymbolWordPattern` + regex search to find call sites and imports
- Both delegate to `searchCode()` which uses ripgrep when available
- These are the existing V1 versions of what Phase 32 enhances

### MCP tool registration (existing pattern)

`src/mcp/tools/retrieval.ts`:
- Already registers `synapse_get_symbol` and `synapse_find_usages`
- Uses `registerJsonTool` with zod input schemas
- Delegates to `SearchService` methods
- Response normalizers in `response-normalizers.ts` (normalizeSymbolResult, normalizeUsageResult)

### Database layer

SQLite tables managed via `src/services/memory/schema.ts` with migration versioning. The symbol_index table will be created by the SymbolIndexService on first use (not via the memory schema migration system -- it belongs to the retrieval domain).

### Service wiring

`src/app/create-services.ts`:
- Creates `AstChunker`, `SearchService`, `VectorIndexService`
- Wires them into MCP tool registration
- This is where `SymbolIndexService` will be instantiated and passed to `registerRetrievalTools`

</code_context>

<specifics>
## Specific Ideas

- Reuse `AstChunker.getParser()` for tree-sitter parser instances rather than creating a separate parser cache
- The `symbol_index` table lives in the same SQLite database as the vector index (retrieval DB), not the memory DB
- During `synapse_index_project`, after chunking completes, run symbol extraction on the same file set
- For `find_implementations`: in Go, interface satisfaction is structural (duck typing) -- regex fallback checks if a struct has methods matching the interface's method set. This is approximate but useful.
- `rename_preview` should group results by file and include line numbers + a preview of the line with the old name highlighted and the new name shown as replacement
- Context text in symbol_index should be 1 line for definitions, 0 for references (keeps table size manageable)

</specifics>

<deferred>
## Deferred Ideas

- Incremental re-indexing on file change (watch mode) -- future phase
- Cross-file type inference (e.g., tracking that `const x: Foo` means `x` is of type `Foo`) -- requires type checker, not just AST
- Call graph visualization -- future tooling phase
- Support for additional languages beyond the 5 required (Java, C#, Ruby, etc.) -- the architecture supports it but not required for SYM-05
- Symbol index persistence across server restarts (currently rebuild on first query after startup) -- may add later with version hashing

</deferred>
