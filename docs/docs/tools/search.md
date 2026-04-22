# Search

<div className="docPanel docPanel--compact">
  <p>
    Search works best when you move from precise scope to precise evidence: file discovery first,
    then lexical or hybrid search, then bounded file reads.
  </p>
</div>

## `synapse_search_files`

Best first step when looking for a feature or module by name.

<div className="docPanel">
  <h3>Use when</h3>
  <p>Start here for folders, modules, subsystems, acronyms, and other path-oriented discovery tasks.</p>
</div>

## `synapse_search_code`

Use for exact identifiers, imports, symbols, or regex patterns.

Useful parameters:

- `glob`
- `max_results`
- `case_sensitive`
- `context_lines`
- `use_regex`

<div className="docPanel">
  <h3>Use when</h3>
  <p>Choose this tool when you already know the symbol, error text, or pattern you want to match.</p>
</div>

## `synapse_search_hybrid`

Use for concept-level retrieval when exact keywords are not enough.

Useful parameters:

- `project_path`
- `all_roots`
- `min_semantic_score`
- `auto_index`

<div className="docPanel">
  <h3>Use when</h3>
  <p>Use hybrid search after indexing when you need semantic recall, architecture context, or concept-level lookup.</p>
</div>

## `synapse_get_symbol`

Use for definition/export lookup when you know the symbol name but not the file.

## `synapse_find_usages`

Use for import/call-site lookup when tracing symbol usage.

## Recommended flow

<div className="docSteps">
  <div className="docStep">
    <span>1</span>
    <div>
      <strong>Find the likely area</strong>
      <p>Run `synapse_search_files` to narrow the search to a directory, feature, or component.</p>
    </div>
  </div>
  <div className="docStep">
    <span>2</span>
    <div>
      <strong>Search with the right mode</strong>
      <p>Use `synapse_get_symbol`/`synapse_find_usages` for symbol tracing, `synapse_search_code` for exact terms, and `synapse_search_hybrid` for concepts.</p>
    </div>
  </div>
  <div className="docStep">
    <span>3</span>
    <div>
      <strong>Confirm with file reads</strong>
      <p>Validate the result set with `synapse_read_file` before drawing conclusions or editing code.</p>
    </div>
  </div>
</div>

## Fast mode defaults

For lowest latency in daily use:

- Pass `project_path` whenever known.
- Start with `max_results` in the `20-40` range.
- Use `context_lines=2` in `synapse_search_code`.
- Keep `all_roots=false` unless cross-repo search is required.
- Use `synapse_search_hybrid` only when exact lexical search is not enough.
- Keep reranker disabled (`use_reranker=false`) until a final precision pass is needed.
