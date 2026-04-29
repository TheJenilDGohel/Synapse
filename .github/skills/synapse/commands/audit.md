---
name: synapse:audit
description: Run memory health audit — coverage, density, orphans, stale entries
allowed-tools:
  - mcp__synapse__synapse_audit
---

<objective>
Run a self-audit of memory health and present a scored dashboard with actionable suggestions.
</objective>

<process>
1. Call `synapse_audit()` to run the health check.
2. Present the health score (0-100) and per-section results.
3. Highlight any suggestions for improvement.
</process>
