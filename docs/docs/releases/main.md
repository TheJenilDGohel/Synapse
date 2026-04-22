---
description: Main branch release notes for unreleased Synapse behavior, including update tooling and source-only documentation changes.
---

# Main Branch

<div className="docPanel docPanel--compact">
  <p>
    This page tracks unreleased repository behavior on `main`. Use it for source-level documentation,
    not as the default reference for published npm installs.
  </p>
</div>

This page is for unreleased branch behavior merged on GitHub `main`.

Use it when you are documenting features present in source but not yet part of the current npm release.

Current main-branch differences include update-oriented tooling, expanded agent guidance, and the TypeScript migration shipped in `0.1.0`.

## Current Main Additions

<div className="docGrid docGrid--2">
  <div className="docPanel">
    <h3>New tools</h3>
    <ul>
      <li>`synapse_update_status`</li>
      <li>`synapse_update_self`</li>
    </ul>
  </div>
  <div className="docPanel">
    <h3>Behavior changes</h3>
    <ul>
      <li>`updates` metadata in `synapse_server_status`</li>
      <li>stronger usage guidance around `search_files` and evidence-first retrieval</li>
      <li>canonical `synapse task-context` / `synapse capture-outcome` commands with deprecated compatibility wrappers for older helper binaries</li>
    </ul>
  </div>
</div>
