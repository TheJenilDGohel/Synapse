# Vector Search Best Practices

Efficiently managing `sqlite-vec` virtual tables in Synapse.

## Indexing Strategy
- **Batching**: Always use `synapse-mcp-ingest` for bulk files to avoid opening/closing the DB for every file.
- **Normalization**: Text is normalized (TRIM, lowercase) before embedding.
- **Dimensions**: Ensure your embedding model (default: `all-MiniLM-L6-v2`) matches the `vec0` dimensions (384).

## Query Patterns
- **RRF (Reciprocal Rank Fusion)**: Synapse combines lexical (FTS5) and semantic (vector) results for maximum recall.
- **Min Semantic Score**: Use `0.75` for high-precision matches, `0.6` for broad exploration.
