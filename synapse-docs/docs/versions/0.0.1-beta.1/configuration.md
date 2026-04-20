# 0.0.1-beta.1 Configuration

<div className="docPanel docPanel--compact">
  <p>
    The first beta establishes the configuration and backend split, but several operational defaults
    are still harsher than later releases, especially around ripgrep startup behavior.
  </p>
</div>

## Important characteristics

- automatic config migration with backup creation
- pluggable index backend architecture
- `sqlite-vec` default with JSON fallback

## Notable limitation

This release still treated missing ripgrep as a fatal startup issue.

## Index behavior

- setup persisted index backend choices into generated config
- semantic indexing existed, but later performance and resilience improvements were not present yet
