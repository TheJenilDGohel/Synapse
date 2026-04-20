---
description: Overview of Synapse v0.0.2-beta.3 with retrieval improvements, semantic indexing updates, and search reliability fixes.
---

# 0.0.2-beta.3 Overview

<div className="docPanel docPanel--compact">
  <p>
    This beta is the important transition point before the stable release line. It introduced the
    retrieval and resilience improvements that shaped later docs and runtime behavior.
  </p>
</div>

This beta introduced the retrieval improvements that shaped the later stable release.

## Major additions

- shared tokenizer
- inverted semantic term index
- `use_regex` on `synapse_search_code`
- `context_lines` on `synapse_search_code`
- `failed_files` from `synapse_index_project`
- `semantic_score_raw` on hybrid results

## Important fixes

- ripgrep no longer required for startup
- unreadable files no longer abort the entire indexing run
