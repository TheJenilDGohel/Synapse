# 0.0.2-beta.3 Configuration

<div className="docPanel docPanel--compact">
  <p>
    Configuration at this point focused on index schema migration, search parameter growth, and
    making startup more tolerant of missing system dependencies.
  </p>
</div>

## Notable configuration behavior

- SQLite schema version bumped to `2`
- stale v1 index data is auto-cleared on first run after upgrade
- semantic index rebuild is required once after upgrade

## Search-related additions

- `context_lines`
- `use_regex`
- improved glob guidance for content search

## Runtime implications

- `has_ripgrep: false` can appear in server status without blocking startup
- index updates isolate per-file failures instead of rolling back the whole run
