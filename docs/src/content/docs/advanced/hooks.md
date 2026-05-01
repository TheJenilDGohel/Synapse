---
title: Hooks & Events
description: Ingesting background events and managing lifecycle callbacks.
---

Synapse provides a powerful hook system to capture background work and integrate with your existing tools.

## Lifecycle Hooks
Monitor the internal state of Synapse:
- **`hooks_stats`**: View active listener counts and event types.
- **`hooks_list_events`**: See all available events (memory store, KG update, etc.).

## Memory Capture Events
Ingest events from external sources (e.g., CI/CD, local git hooks) using `memory_capture_event`.
- **Auto-Promotion**: Meaningful background events are automatically promoted into durable memory.
- **Traceability**: Events are linked to the specific agent and project where they occurred.

## Ingestion Pipelines
Synapse supports importing bulk knowledge:
- **Markdown**: Import conversation exports from any major AI chat platform.
- **JSON**: Programmatic ingestion for custom logging systems.

## Event Subscriptions
Coming soon: Subscribe to Synapse events via Webhooks or internal event buses.
