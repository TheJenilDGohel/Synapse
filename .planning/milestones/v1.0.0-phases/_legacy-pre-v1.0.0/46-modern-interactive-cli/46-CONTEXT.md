# Phase 46: Modern Interactive CLI - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Upgrade all Synapse CLI scripts (setup, doctor, upgrade, task-context, capture-outcome) from plain `console.log()` text output to a modern, interactive terminal experience. This phase delivers a shared ANSI utility module and applies consistent visual styling — spinners, colored status indicators, structured summary boxes, and health bars — across every user-facing CLI entry point.
</domain>

<decisions>
## Implementation Decisions

### Visual Style & ANSI Layer
- Color depth: 16-color ANSI (safe across all terminals, widest compatibility)
- Spinner implementation: Use existing `ora` dep (already in package.json, zero new deps)
- Box-drawing characters: Unicode box-drawing (─, │, ╔, ╗) with TTY guard (falls back to plain ASCII in non-TTY/pipe)
- Color theme: Green=OK, Red=FAIL, Yellow=WARN, Cyan=info — consistent across all scripts

### `synapse setup` UX
- Progress feedback: `ora` spinner per major step (configuring roots, writing config, warming up models)
- Success output: Structured summary box with results table (roots configured, backend, client installs)
- Error presentation: Styled error box with red border + actionable "fix:" line
- Verbosity: Normal by default; `--verbose` flag for full detail output

### `synapse doctor` UX
- Check output style: Colored `✓` (green) / `✗` (red) with inline fix hint under each failed check
- Overall health: Summary bar (`████░ 7/8 checks passed`) at end of output
- Fix suggestions: Bold fix text printed inline immediately under each failed check
- `--json` mode: Unchanged — machine-readable JSON output stays identical (no breaking changes)

### Shared Infrastructure
- Shared ANSI module: Create `src/cli/ansi.ts` — colors, symbols, boxes, spinner helpers — imported by all scripts
- Scope: All 5 scripts upgraded (setup, doctor, upgrade, task-context, capture-outcome)
- `NO_COLOR` / CI: Honor `NO_COLOR` env var and automatically fall back to plain when stdout is not a TTY
- New runtime deps: None — `ora` already in package.json; no `chalk`, `cli-boxes`, or other additions

### the agent's Discretion
- Internal ANSI escape code implementation vs thin wrapper around `ora` — agent decides cleanest abstraction
- Exact box width and padding values
- Whether to export named color functions or a `colors` object from `ansi.ts`
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ora` — already a runtime dep (v9.3.0), used nowhere yet; ready to use
- `scripts/runtime/setup-synapse.mjs` — 685 lines, plain `console.log()` throughout, `printSuccess()` and `printText()` functions are the main output targets
- `scripts/runtime/doctor-synapse.mjs` — 387 lines, `printText()` formats `[OK]`/`[FAIL]` output
- `scripts/memory/memory-workflow-cli-utils.mjs` — shared memory CLI utilities, also uses plain output
- `bin/_boot.cjs` — dispatcher entry point, minimal output

### Established Patterns
- All scripts import from `../../src/runtime/index.js` and `../../src/services/...` — follow same relative import pattern
- Scripts are `.mjs` ES modules; `src/` is TypeScript compiled to `dist/` — new shared module should live in `src/cli/ansi.ts`
- No existing ANSI or color utility anywhere in the codebase
- `--json` flag pattern established in `doctor-synapse.mjs` — preserve this for machine consumers

### Integration Points
- `src/cli/ansi.ts` → compiled to `dist/cli/ansi.js` → imported as `../../src/cli/ansi.js` from scripts
- All `printText()` / `printSuccess()` / `console.log()` call sites in the 5 scripts become the refactor targets
- TTY detection: `process.stdout.isTTY` — already available in all scripts via Node.js
</code_context>

<specifics>
## Specific Ideas

- User wants "modern, easy to use yet powerful" — prioritize first-impression wow factor on `setup` and `doctor` as the most-visible scripts
- Standards-first: follow the `NO_COLOR` spec (https://no-color.org), honor CI environments automatically
- No new runtime deps — keep the bundle lean (explicit user preference via standards approach)
</specifics>

<deferred>
## Deferred Ideas

- Interactive `synapse setup` wizard (prompted root selection via arrow keys) — separate phase, requires `inquirer` or similar
- `synapse logs` live tail command — out of scope for this phase
- Full TUI dashboard — deferred, would require new framework dep
</deferred>
