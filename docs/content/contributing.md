---
title: Contributing
description: Guide for contributing to the Loci core and documentation.
---

# Contributing to Loci

Loci is the transmission layer for AI project context. We welcome contributions that harden our "Biological" engine, optimize our "Power Controllers," or refine our "Neural" documentation.

## Elite Developer Setup

Loci uses cutting-edge Node.js features and TypeScript standards.

```bash
git clone https://github.com/TheJenilDGohel/loci.git
cd loci
npm install
npm run setup
npm run doctor
```

## Engineering Standards

To maintain the high-signal nature of Loci, please follow these core mandates:

### 1. Power Controller Design
We do not add granular tools. Every new capability must be integrated into one of our **Power Controllers** (Manage, Query, Search, etc.).
- **Durable Unions**: Use discriminated unions in JSON schemas to handle multiple actions.
- **Context Efficiency**: Always provide `compact` and `lite` output formats.
- **Gemini Compatibility**: Keep input schemas flat (avoid nested objects where possible).

### 2. Downward Isolation
Strictly respect the layer boundaries:
- `src/interfaces/` → Thin wrappers (CLI/MCP).
- `src/core/interfaces/` → The immutable contracts.
- `src/core/engine/` → The heavy-lifting business logic.
- `src/core/runtime/` → OS and hardware abstractions.

### 3. Verification Rigor
A PR is incomplete without verification:
- **Unit Tests**: Coverage for the logic in `src/core/engine`.
- **E2E Tests**: Live validation of the MCP tool-call in `src/e2e`.
- **Performance Audit**: If changing AST logic, run `npm run stress:loci`.

## Professional Workflow

### Pull Requests
1. **Branching**: Use `feat/` or `fix/` prefixes.
2. **Atomic Commits**: Each commit should represent one logical "thought."
3. **Docs-First**: If the tool call changes, the documentation must change in the *same* PR.

### Behavioral Code of Conduct
We follow the **[Neural Ethos]**: Be precise, be direct, and optimize for intelligence.

---

*Thank you for helping us bridge the signal gap.*
