---
name: localnest:whats-new
description: See what changed since your last session — memories, triples, files, commits
argument-hint: "[since timestamp or 'last_session']"
allowed-tools:
  - mcp__localnest__localnest_whats_new
---

<objective>
Show a cross-session delta of what changed since a given timestamp or the last session.
</objective>

<process>
1. If $ARGUMENTS is provided, use it as the `since` parameter.
2. If no arguments, default to "last_session".
3. Call `localnest_whats_new({ since: $ARGUMENTS || "last_session" })`.
4. Present the summary: new memories, new triples, files changed, recent commits.
</process>
