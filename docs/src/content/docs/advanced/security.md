---
title: Security & Privacy
description: Local-first security model.
---

Synapse is built on a **Zero-Cloud** philosophy. Your data belongs to you, and it never leaves your machine.

## Privacy Mandates
1. **Local-First**: All data is stored in a local SQLite database (`~/.synapse/`).
2. **Zero Telemetry**: We do not collect usage data, search queries, or code snippets.
3. **No External APIs**: Retrieval and indexing run entirely using local models (e.g., `sentence-transformers`).

## Attack Surface & Protections
We proactively mitigate common vulnerabilities:
- **Path Traversal**: Synapse strictly enforces root boundaries. You cannot read or index files outside of your configured projects.
- **Command Injection**: Search parameters are safely escaped before being passed to underlying tools like `ripgrep`.
- **OIDC Provenance**: Our official npm releases are signed and verified using GitHub Actions trusted publishing.

## Reporting a Vulnerability
Please do **not** open a public issue. Report vulnerabilities privately via [GitHub Security Advisories](https://github.com/j-d-gohel/synapse/security/advisories/new).
