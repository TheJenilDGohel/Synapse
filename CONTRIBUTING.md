# Contributing to Synapse MCP

## Getting Started

```bash
git clone https://github.com/TheJenilDGohel/synapse.git
cd synapse
npm install
npm run setup
npm run doctor
```

## Development

Synapse is written in TypeScript. The runtime uses `tsx` for development execution and `tsc` for type checking and builds.

**Type-check all source files:**
```bash
npm run check
```

**Build TypeScript to JavaScript:**
```bash
npm run build
```

**Run tests:**
```bash
npm test
```

**Run full code quality pipeline (lint, coverage, cycles, deps, package, audit):**
```bash
npm run quality
```

**Start the MCP server locally (uses tsx):**
```bash
npm start
```

**Install/update the bundled skill locally:**
```bash
npm run install:skill
```

## Project Structure

Synapse follows a strictly decoupled, layered architecture:

- **Core (`src/core/`)**: System fundamentals, runtime constraints, database adapters, and migration logic.
- **Services (`src/services/`)**: Bounded business logic contexts.
  - `/memory`: Intelligent persistent knowledge graph and AI memory logic.
  - `/retrieval`: Code search, text embeddings, and vector similarity querying.
  - `/workspace`: Directory lifecycle and project boundary management.
- **Interfaces (`src/interfaces/`)**: External boundaries (CLI, MCP, App) that orchestrate services.

For a detailed breakdown, see the [Architecture Overview](./ARCHITECTURE.md).

## Making Changes

### Adding or modifying a tool

Tools are registered in `src/interfaces/mcp/tools/*.ts`. Each tool needs:
- A canonical name (`synapse_*`)
- Zod input schema
- Handler returning plain data

### Updating the skill

The skill at `skills/synapse/SKILL.md` is the source of truth for AI agent behavior. After editing it, sync to your local installation:
```bash
npm run install:skill
```

## Pull Request Guidelines

- Keep PRs focused — one concern per PR.
- Run `npm run quality` before opening a PR.
- Update `skills/synapse/SKILL.md` if you add or change any tool.
- Maintainers handle versioning; do not bump the version in your PR.

## Reporting Issues

Open an issue with:
- Node.js version (`node --version`)
- Platform (macOS/Linux/Windows)
- Output of `synapse doctor`
- Clear steps to reproduce

## Publishing (Maintainers Only)

Synapse auto-publishes to npm via GitHub Actions when the version in `package.json` is updated on the main branch.

**Manual release commands:**
```bash
npm run check
npm test
npm publish --access public              # stable
npm publish --access public --tag beta   # prerelease
```
