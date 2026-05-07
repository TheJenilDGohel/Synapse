---
title: Contributing
description: Guide for contributing to the Synapse core and documentation.
---
<!-- generated-by: gsd-doc-writer -->

# Contributing to Synapse

We are building the foundational context layer for the next generation of AI agents. Whether you're a systems engineer, an AI researcher, or a documentation expert, your contributions are vital to the evolution of Synapse.

## Development Environment Setup

Synapse requires **Node.js >= 22.6.0** and **TypeScript 6.0+**.

```bash
# Clone the repository
git clone https://github.com/TheJenilDGohel/synapse.git
cd synapse

# Install dependencies
npm install

# Initialize local environment
npm run setup

# Run the health check
npm run doctor
```

## Quality Assurance & Standards

To maintain high architectural integrity, all contributions must pass our rigorous quality suite:

```bash
# Run all tests, linting, and dependency audits
npm run quality
```

### Key Commands:
*   **`npm test`**: Executes the full test suite using the native Node.js test runner.
*   **`npm run lint`**: Enforces strict stylistic consistency via ESLint.
*   **`npm run check`**: Performs static type analysis and syntax validation.

## Architectural Integrity

Before proposing significant changes, please review our **[Architecture Overview](/pillars/architecture)**. We strictly enforce downward-only dependencies:
1.  `interfaces` → `services`
2.  `services` → `core`
3.  `core` → (no internal dependencies)

## How to Contribute

### 1. Bug Reports & Feature Requests
Submit issues via the [GitHub Issue Tracker](https://github.com/TheJenilDGohel/synapse/issues). Use the provided templates to ensure our engineering team has the context needed to triage effectively.

### 2. Pull Requests
*   **Atomic Scope**: Keep PRs focused on a single logical change.
*   **Documentation**: If you're adding a new tool or modifying a service, update the relevant `docs/content/` files and the project's `SKILL.md`.
*   **Tests**: Every new feature or bug fix must include corresponding tests.

## Code of Conduct

All contributors are expected to follow our **[Code of Conduct](https://github.com/TheJenilDGohel/synapse/blob/main/CODE_OF_CONDUCT.md)** to ensure a collaborative and respectful environment.
