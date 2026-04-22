---
title: Hooks System
description: Pre/post operation hooks for memory, knowledge graph, traversal, and ingestion
sidebar_label: Hooks
sidebar_position: 7
---

# Hooks System

Register callbacks on any memory or knowledge graph operation. Hooks fire before and after operations, with support for cancellation, payload transformation, and error handling.

## Available Events

### Memory Lifecycle
- `before:store` / `after:store`
- `before:update` / `after:update`
- `before:delete` / `after:delete`
- `before:recall` / `after:recall`

### Knowledge Graph
- `before:kg:addEntity` / `after:kg:addEntity`
- `before:kg:addTriple` / `after:kg:addTriple`
- `before:kg:invalidate` / `after:kg:invalidate`

### Graph Traversal
- `before:graph:traverse` / `after:graph:traverse`
- `before:graph:bridges` / `after:graph:bridges`

### Agent Diary
- `before:diary:write` / `after:diary:write`

### Ingestion and Dedup
- `before:ingest` / `after:ingest`
- `before:dedup` / `after:dedup`
- `before:nest:list` / `after:nest:list`

### Special
- `before:&#42;` / `after:&#42;` — catch-all wildcards
- `error` — fired when a hook listener throws

## MCP Tools

| Tool | What it does |
|------|-------------|
| `synapse_hooks_stats` | Check enabled state, listener counts, active events |
| `synapse_hooks_list_events` | Get all valid event names |

## Programmatic Usage

```javascript
// Register a hook
hooks.on('after:store', async (entry, ctx) => {
  console.log('Stored memory', entry.id);
});

// Cancel an operation
hooks.on('before:store', async (entry) => {
  if (entry.content.includes('SECRET')) {
    return { cancel: true, reason: 'blocked sensitive content' };
  }
});

// One-time hook
hooks.once('after:kg:addTriple', async (triple) => {
  console.log('First triple added:', triple);
});
```

## Hook Behavior

- **before:** hooks can cancel operations by returning `{ cancel: true }`
- **before:** hooks can transform payloads by returning `{ payload: newPayload }`
- **after:** hooks are informational — they cannot cancel or transform
- **error:** hooks fire when any listener throws, preventing cascading failures
- Hooks are disabled by default and can be toggled via `hooks.setEnabled(bool)`
