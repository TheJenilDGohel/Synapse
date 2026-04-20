# 0.0.7-beta.3 Overview

<div className="docPanel docPanel--compact">
  <p>
    Reliability and DX release. KG validation fixes for nullable fields, skill installer
    improvements, redundant index cleanup, and 11 new agentic orchestration commands.
  </p>
</div>

## Key changes from 0.0.7-beta.2

### Fixes
- `kg_add_triple` and `kg_invalidate` now accept `null` for `valid_from`, `valid_to`, `source_memory_id` (was rejecting with validation error)
- Redundant schema indexes removed (already created by migrations)
- Skill installer syncs slash commands even when skill is up-to-date
- Skill installer auto-installs Claude Code hooks for memory retrieval/capture
- Duplicate log message in skill installer removed

### Agentic Orchestration
- 11 new `nest:*` slash commands: `flow`, `research`, `implement`, `test`, `review`, `docs`, `release`, `cicd`, `hotfix`, `skill-sync`, `help`
- `nest:flow` orchestrator routes feature requests through the full research-implement-test-review-release pipeline
- Each command maps to a specialized agent role with scoped responsibilities

## Tools

52 MCP tools (unchanged from 0.0.7-beta.2). No new MCP tools in this release.

## Requirements

- **Node.js** 18+ (search and file tools), 22.13+ (memory and KG features)
- **ripgrep** recommended for fast lexical search
- **Zero new runtime dependencies** added
