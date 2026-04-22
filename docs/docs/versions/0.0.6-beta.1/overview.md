# 0.0.6-beta.1 Overview

<div className="docPanel docPanel--compact">
  <p>
    CLI canonicalization release. Introduced canonical <code>synapse</code> commands and
    soft-deprecated legacy <code>synapse-*</code> helper binaries.
  </p>
</div>

## Key changes from 0.0.5

- Added canonical `synapse task-context` and `synapse capture-outcome` commands
- Soft-deprecated legacy helper binaries with warning-forwarding compatibility wrappers
- Kept `synapse` server binary unchanged for existing client configs
- Updated CLI help and README to prefer canonical commands

## Tools

33 MCP tools (unchanged from 0.0.5). CLI surface expanded with canonical commands.

## Requirements

- **Node.js** 18+ (search and file tools), 22.13+ (memory features)
- **ripgrep** recommended for fast lexical search
