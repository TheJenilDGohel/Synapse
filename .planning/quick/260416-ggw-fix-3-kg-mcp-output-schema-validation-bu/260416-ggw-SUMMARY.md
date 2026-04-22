# Quick Task 260416-ggw: Summary

**Task:** Fix KG MCP output schema validation bugs
**Date:** 2026-04-16
**Status:** Complete

## Changes

### `src/mcp/tools/graph-tools.ts`
- Changed `synapse_kg_query` outputSchema from `OUTPUT_TRIPLE_RESULT_SCHEMA` to `OUTPUT_BUNDLE_RESULT_SCHEMA`
- Changed `synapse_kg_as_of` outputSchema from `OUTPUT_TRIPLE_RESULT_SCHEMA` to `OUTPUT_BUNDLE_RESULT_SCHEMA`
- Changed `synapse_kg_timeline` outputSchema from `OUTPUT_TRIPLE_RESULT_SCHEMA` to `OUTPUT_BUNDLE_RESULT_SCHEMA`

### `src/mcp/tools/kg-delete-tools.ts`
- Added `ACK_RESULT_SCHEMA` import
- Changed `synapse_kg_delete_entity` outputSchema from `BATCH_RESULT_SCHEMA` to `ACK_RESULT_SCHEMA`

## Root Cause

The `TRIPLE_RESULT_SCHEMA` expects `{id: string}` (single triple), `[{id}]` (array), or `{items: []}` (paginated). But `queryEntityRelationships`, `getEntityTimeline`, and `queryTriplesAsOf` all return `{entity_id, count, triples: [...]}` — bundle-shaped objects that don't match any union variant.

For `kg_delete_entity`, `BATCH_RESULT_SCHEMA` types `deleted` as `z.number().int()` but the service returns `deleted: boolean`. `ACK_RESULT_SCHEMA` uses `.passthrough()` and accepts the actual response shape.

## Bonus Fix

Discovered and fixed `synapse_kg_as_of` which had the same schema mismatch as `kg_query`/`kg_timeline` but wasn't caught in the initial audit (not tested during that session).

## Verification

- TypeScript build: PASSED (exit code 0)
- Global install updated via `npm install -g .`
- Installed JS files verified to contain fixes
- MCP server restart required for live verification
