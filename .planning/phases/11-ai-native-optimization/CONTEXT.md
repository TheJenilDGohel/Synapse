# Phase 11: AI-Native Optimization (Token Efficiency)

## Context
The project needs to move from "Human-Beautiful" to "AI-Native". High-token decorative elements and verbose responses are exhausting context windows. This phase focuses on reducing the token footprint of both the CLI and the MCP interface.

## Scouting Findings
1. **MCP Verbosity**: `synapse_agent_prime` and `synapse_task_context` currently lack fine-grained response tiers (verbose/compact/lite). This results in large bundles being sent even when only IDs are needed.
2. **CLI ANSI Bloat**: The `onboard` and `setup` commands use heavy `ora` spinners and `boxen` layouts. In agent environments (e.g. Cursor/Claude terminal), these are captured as raw text/ANSI which wastes input tokens and can confuse parsing.
3. **Redundant Logic**: `src/interfaces/cli/tool-count.ts` and other small utility files could be inlined to reduce file-system lookups during dynamic import.

## Decisions
- [ ] **Global AI_AGENT flag**: Respect `process.env.AI_AGENT` to switch CLI to "Silent Mode".
- [ ] **MCP Response Normalization**: Propagate `item_format` across all retrieval/workflow tools.
- [ ] **Terse Schema**: Audit `src/interfaces/mcp/tools/*.ts` and trim descriptions that exceed 200 characters unless strictly necessary.

## Success Criteria
- [ ] `synapse_agent_prime` supports `item_format='lite'`.
- [ ] `synapse onboard` emits ZERO boxes/lines when `AI_AGENT=true`.
- [ ] MCP tool metadata (captured via `listTools`) is reduced by at least 20% in raw character count.
