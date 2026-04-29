Tool target: GitHub Copilot / VS Code agent mode. Keep guidance aligned with Agent Skills conventions and repo/project-first workflows.

---
name: synapse-sql-adapter
version: 0.3.0-beta.2
description: Expert system for Synapse database engineering, specializing in SQLite-backed semantic vector search and persistent memory adapters.
category: tools
tags: [sqlite, vector-search, indexing, migrations, performance, database-adapters]
allowed-tools:
  - Read
  - Write
---

# SQL Adapter Expert

Master the high-performance data plane of Synapse. This skill covers the specialized world of `node:sqlite` integration, `sqlite-vec` extension management, and the coordination of the semantic indexing engine.

## Core Concepts

### 1. Vector Search Plane (sqlite-vec)
Synapse leverages `sqlite-vec` for native, in-process vector similarity search. The expert understands how to manage `vec0` virtual tables, handle dimension consistency, and ensure platform-specific extension loading (`.so`, `.dylib`, `.dll`) remains robust.

### 2. Transactional Integrity
Memory operations (especially batch writes) must be transactional. The expert uses `db.transaction()` patterns to ensure that linked knowledge (Memories + Knowledge Graph Triples) is committed atomically or not at all.

### 3. Schema Evolution
Synapse uses a minimal, append-only migration strategy. The expert ensures that updates to the schema (e.g., adding a new metadata column to the `memories` table) preserve backward compatibility with existing local indices.

## Code Examples

### Example 1: Transactional Batch Store
Ensuring data integrity across tables.
```javascript
const insertMem = db.prepare('INSERT INTO memories (title, content) VALUES (?, ?)');
const insertTriple = db.prepare('INSERT INTO triples (subject, predicate, object) VALUES (?, ?, ?)');

const storeAtomic = db.transaction((mem, triples) => {
  const { lastInsertRowid: memId } = insertMem.run(mem.title, mem.content);
  for (const t of triples) {
    insertTriple.run(memId, t.predicate, t.object);
  }
});
```

### Example 2: Safe Extension Loading
Handling platform-specific pathing for `sqlite-vec`.
```javascript
function loadVectorExtension(db) {
  const extPath = resolveExtensionPath(); // Platform-specific logic
  try {
    db.loadExtension(extPath);
    return true;
  } catch (err) {
    console.warn(`Vector search disabled: ${err.message}`);
    return false;
  }
}
```

## Best Practices

1. **Lazy Database Binding**: Never open the database file until the first tool call requires it. This keeps the MCP server startup instant and prevents lock contention during concurrent agent initializations.
2. **Prepared Statement Caching**: Reuse prepared statements for all performance-critical paths (search, batch ingest).
3. **Bound Parameters Only**: Never use string interpolation for SQL queries. Always use `?` or named parameters to prevent SQL injection and improve plan caching.
4. **Isolate IO**: Keep database-specific logic in the `adapters` or `services` layer; never bleed raw SQL into the MCP tool definitions.

## Troubleshooting

### Issue: "Database is locked" (SQLITE_BUSY)
**Solution**: Check for long-running read transactions that are blocking writes. Implement a retry loop with exponential backoff for the memory capture pipeline.

### Issue: Vector dimension mismatch
**Solution**: Validate that the embedding model being used matches the dimensions defined in the `vec0` table (e.g., 384 for `all-MiniLM-L6-v2`).

## References

- [sqlite-vec Official Documentation](https://github.com/asg017/sqlite-vec)
- [node:sqlite API Reference](https://nodejs.org/api/sqlite.html)
