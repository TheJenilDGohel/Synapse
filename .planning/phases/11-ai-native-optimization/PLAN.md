# Phase 11 Plan: AI-Native Optimization

## Objective
Reduce the context-window usage of Synapse by 20-50% through response tiering and CLI silencing.

## Wave 1: MCP Response Tiers
1. [ ] Update `src/interfaces/mcp/tools/memory-workflow.ts`:
   - Add `item_format: z.enum(['verbose', 'compact', 'lite']).default('verbose')` to `synapse_agent_prime`.
   - Add same to `synapse_task_context`.
   - Wire these to `normalizeAgentPrimeResult` and `normalizeTaskContextResult`.
2. [ ] Update `src/interfaces/mcp/common/response-normalizers.ts` to implement the tiering logic for bundles.

## Wave 2: CLI Silencing
1. [ ] Update `src/interfaces/cli/spinner.ts`:
   - If `process.env.AI_AGENT === 'true'`, return a mock spinner that does nothing.
2. [ ] Update `src/interfaces/cli/commands/onboard.ts`:
   - Surround `boxen` and decorative `writeLines` with `!process.env.AI_AGENT` checks.
   - Emit compact summary text only.

## Wave 3: Metadata Pruning
1. [ ] Audit `src/interfaces/mcp/tools/` for overly descriptive tool notes.
2. [ ] Consolidate `src/interfaces/cli/tool-count.ts` into a core constant if possible.

## Verification
1. [ ] Manually call a tool with `item_format='lite'` and verify token reduction.
2. [ ] Run `AI_AGENT=true synapse onboard` and verify lean output.
3. [ ] Ensure no functionality is lost.
