---
name: loci:selftest
description: Run end-to-end pipeline validation to check if Loci is working correctly
allowed-tools:
  - Bash
---

<objective>
Run a comprehensive self-test that validates every Loci subsystem: runtime, memory CRUD, knowledge graph, taxonomy, dedup, embeddings, search, skills, and hooks.
</objective>

<process>
1. Run `loci selftest` via Bash tool.
2. Review the results — each check shows pass (✓), warning (⚠), or fail (✗).
3. If any checks fail, suggest fixes:
   - Memory failures → run `loci setup` or check Node version (22+ needed)
   - Hooks not installed → run `loci hooks install`
   - Skills missing → run `loci skill install`
   - Embeddings unavailable → first run downloads the model (~30MB)
4. For machine-readable output, use `loci selftest --json`.
</process>
