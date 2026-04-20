---
description: Version matrix for Synapse docs mapping the current stable release, archived beta releases, and older stable lines for compatibility and debugging.
---

# Release Matrix

<div className="docPanel docPanel--compact">
  <p>
    Release history here is derived from the maintained changelog and current package metadata.
  </p>
</div>

This site documents versions from repository source history, primarily the maintained `CHANGELOG.md` plus the current package version.

## Active Release Tracks

Synapse maintains two active release tracks to balance stability with rapid innovation:

- `0.3.0-beta.2` (Current Beta — Modern interactive CLI, TUI dashboard, 74 tools)
- `0.1.0` (Current Stable — TypeScript migration, temporal KG, 74 tools)

---

## Documented Release Pages

| Version | Basis | Page |
| --- | --- | --- |
| `0.3.0-beta.2` | current beta package + changelog | [Current Release](./current) |
| `0.1.0` | previous stable package + changelog | [0.1.0](./0.1.0) |
| `0.0.7-beta.2` | archived beta package + changelog | [Beta Release Notes](./0.0.7-beta.2) |
| `0.0.6-beta.1` | archived beta package + changelog | [0.0.6-beta.1](./0.0.6-beta.1) |
| `0.0.5` | previous stable package | [0.0.5](./0.0.5) |
| `0.0.4-beta.9` | archived beta package | [0.0.4-beta.9](./0.0.4-beta.9) |
| `0.0.3` | package version | [0.0.3](./0.0.3) |

Use the per-version pages below for release-specific summaries.

## Fast Navigation

<div className="docGrid docGrid--3">
  <a className="docLinkCard" href="./current">
    <strong>Current Beta</strong>
    <span>Use the current release page for the beta `0.3.0-beta.2` contract — Modern CLI, TUI dashboard.</span>
  </a>
  <a className="docLinkCard" href="./0.1.0">
    <strong>Stable Release</strong>
    <span>Use the 0.1.0 release page for the production-ready baseline.</span>
  </a>
  <a className="docLinkCard" href="./0.0.7-beta.2">
    <strong>Archived beta</strong>
    <span>Use the beta release page for `0.0.7-beta.2` — original temporal KG.</span>
  </a>
</div>

## Reading guidance

- Start with [Version Selection](./version-selection) when you need exact install commands for a specific version.
- Use `current` if you want documentation aligned to the active beta package.
- Use archived version pages when you are debugging or supporting older installs.
