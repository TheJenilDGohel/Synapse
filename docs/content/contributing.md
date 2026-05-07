---
title: Contributing
description: Guide for contributing to the Synapse core and documentation.
---

# Contributing to Synapse

We are building a local-first MCP context server for code intelligence, persistent memory, and knowledge graph search. Whether you work on systems code, documentation, tests, or client integrations, contributions are welcome.

## Development Environment Setup

Synapse requires **Node.js >= 22.6.0** and **TypeScript 6.0+**.

```bash
git clone https://github.com/TheJenilDGohel/synapse.git
cd synapse
npm install
npm run setup
npm run doctor
```

## Quality Checks

Before opening a pull request, run the project quality checks:

```bash
npm run quality
```

Key commands:

- **`npm test`**: Executes the test suite using the native Node.js test runner.
- **`npm run lint`**: Enforces ESLint rules.
- **`npm run check`**: Performs static type analysis and syntax validation.

## Architecture Rules

Before proposing significant changes, review the **[Architecture Overview](pillars/architecture)**. The codebase follows downward-only dependencies:

1. `interfaces` depends on `core` and application assembly code.
2. `core` owns runtime, engine, memory, retrieval, and update logic.
3. MCP tools should stay thin and delegate behavior to core services.

## How to Contribute

### Bug Reports & Feature Requests

Submit issues via the [GitHub issue tracker](https://github.com/TheJenilDGohel/synapse/issues). Include reproduction steps, expected behavior, actual behavior, and environment details.

### Pull Requests

- **Atomic scope**: Keep PRs focused on one logical change.
- **Documentation**: Update `docs/content/` when adding or changing user-facing behavior.
- **Tests**: Include focused tests for new features and bug fixes.

## Code of Conduct

All contributors are expected to follow the [Code of Conduct](https://github.com/TheJenilDGohel/synapse/blob/main/CODE_OF_CONDUCT.md).
