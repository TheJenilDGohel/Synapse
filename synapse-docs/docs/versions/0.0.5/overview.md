# 0.0.5 Overview

<div className="docPanel docPanel--compact">
  <p>
    Stable release promoting 0.0.4-beta.9 runtime and packaging fixes. First fully stable line
    with reliable installed-runtime validation and release-sweep coverage.
  </p>
</div>

## Key changes from 0.0.4

- Promoted 0.0.4-beta.9 runtime into stable 0.0.5 line
- Fixed installed-runtime release harness to derive paths from active user home
- Hardened installed-runtime validation with MCP stdio handshake regression test
- Switched upgrade skill-sync flow to primary `synapse install skills --force` command

## Tools

33 MCP tools covering workspace discovery, search, indexing, memory, and updates.

## Requirements

- **Node.js** 18+ (search and file tools), 22.13+ (memory features)
- **ripgrep** recommended for fast lexical search
