# Phase Summary: MCP Server Decoupling

## Overview
Rebuilt the `src/mcp/` directories so that MCP tools only handle parameter transformation, JSON validation utilizing Zod, and response marshalling. All data manipulation is farmed to `src/engine/`.

## Completed Tasks
- Purged all SQL queries from MCP handlers.
- Refactored tool handlers to import and use abstract `src/engine/` classes.
- Standardized tool definitions against Zod schemas.

## Implementation Details
- MCP routing strictly handles MCP standard messaging parameters and formats responses.
- Engine handles heavy lifting.

## Decisions Made
- Use Zod explicitly for all inbound tool parameter validation.
- All MCP handlers are pure translator shims.
