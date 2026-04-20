---
description: Current release notes for synapse-mcp, including the modern interactive CLI, TUI dashboard, and improved diagnostics. Current release is 0.3.0-beta.2.
---

# Current Release

Current package documentation for `synapse-mcp@0.3.0-beta.2`, covering the modernization update, interactive TUI dashboard, refactored CLI infrastructure, and the active canonical `synapse_*` tool contract.

<div className="docGrid docGrid--3">
  <div className="docPanel">
    <span className="docEyebrow">Channel</span>
    <h3>Beta release track</h3>
    <p>Use this page when you need docs that match the modernizing Synapse experience.</p>
  </div>
  <div className="docPanel">
    <span className="docEyebrow">Package</span>
    <h3>Beta package</h3>
    <p>Use this page for the interactive TUI and refactored CLI contracts.</p>
  </div>
  <div className="docPanel">
    <span className="docEyebrow">Current</span>
    <h3>0.3.0-beta.2 — The Modernization Update</h3>
    <p>Full visual overhaul with a premium ANSI styling engine, interactive TUI dashboard, and structured diagnostics.</p>
  </div>
</div>

<div className="docGrid docGrid--3">
  <a className="docLinkCard" href="/docs/setup/install">
    <strong>Install Beta</strong>
    <span>Install using `npm install -g synapse-mcp@beta` to get the modernization update.</span>
  </a>
  <a className="docLinkCard" href="/docs/setup/configuration">
    <strong>Configure MCP</strong>
    <span>Use the generated MCP block, supported client setup, and startup timeout guidance.</span>
  </a>
  <a className="docLinkCard" href="./0.1.0">
    <strong>Stable: 0.1.0</strong>
    <span>See the archived 0.1.0 release notes for the production-ready stable track.</span>
  </a>
</div>

## What it includes

- **Modern Interactive CLI** with a premium design language
- **Interactive TUI Dashboard** for real-time monitoring
- **74 MCP tools** across KG, nests, traversal, diary, ingest, dedup, and hooks
- lexical, semantic, and hybrid retrieval
- temporal knowledge graph with multi-hop traversal
- nest/branch hierarchy for organized memory
- agent-scoped memory with private diary entries
- semantic dedup and conversation ingestion
- hooks system for pre/post operation callbacks
- opt-in local memory tools plus high-level task-context and capture-outcome workflow
- setup-time memory consent and config migration
- `synapse` top-level CLI command path (`dashboard`, `setup`, `doctor`, `upgrade`)

## What changed in `0.3.0-beta.2`

- **Visual Overhaul**: Replaced hardcoded escape sequences with a centralized ANSI styling utility.
- **TUI Dashboard**: Added a real-time terminal interface to monitor the Synapse state.
- **Structured Help**: Refactored all help renderers to use premium box-drawing and badges.
- **Diagnostic Upgrade**: Redesigned `synapse doctor` with categorized checks and status symbols.
- **Automation Ready**: Standardized `--json` and `--quiet` flags across the entire CLI.

## Upgrade Snapshot

<div className="docGrid docGrid--2">
  <div className="docPanel">
    <span className="docEyebrow">If you are upgrading from 0.1.0</span>
    <h3>Expected user-facing changes</h3>
    <p>The CLI output is now much cleaner and more structured. Tool names and API contracts are fully preserved. Config is automatically migrated.</p>
  </div>
  <div className="docPanel">
    <span className="docEyebrow">If you are validating a fresh install</span>
    <h3>Fastest verification path</h3>
    <p>Run <code>synapse dashboard</code> to see the state of your nest, or <code>synapse doctor --verbose</code> for a full health scan.</p>
  </div>
</div>

## How to use this page

- Treat this page as the source of truth for the current beta track behavior.
- Use the [Release Matrix](./history) when you need to see exactly when a feature was introduced.
- Use archived release pages when you need a frozen contract for debugging older installs.

## Need a Different Release View?

- Use [Version Selection](./version-selection) when you need exact install commands.
- Use [Release Matrix](./history) when you need the full release-to-page mapping.
- Use [0.1.0](./0.1.0) for the initial TypeScript migration.
- Use [0.0.7-beta.2](./0.0.7-beta.2) for the archived beta with knowledge graph and traversal.

## Version Source

This page is based on the current beta package version and maintained changelog in the repository.

- package version: `0.3.0-beta.2`
- release date: `2026-04-13`
- changelog sections document the changes shipped in this beta package
- production-ready stable published release docs remain archived under `0.1.0`
