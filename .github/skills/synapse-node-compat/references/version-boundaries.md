# Version Boundaries

Synapse tracks API availability across Node.js versions to ensure stable behavior.

| Feature | Min Node | Module/Dependency |
|---|---|---|
| Core CLI | 18.x | Standard built-ins |
| Semantic Search | 18.x | `sqlite-vec` (native) |
| Persistent Memory | 22.5 | `node:sqlite` (built-in) |
| Temporal KG | 22.5 | `node:sqlite` (built-in) |

## Detection Logic
The `doctor` command uses `process.versions.node` and `import.meta.resolve` to verify these boundaries before enabling high-version features.
