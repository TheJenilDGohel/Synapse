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

Contributor references:
- [`synapse-docs/docs/guides/architecture.md`](./synapse-docs/docs/guides/architecture.md) — module layout and design decisions
- [`synapse-docs/docs/guides/future-retrieval-roadmap.md`](./synapse-docs/docs/guides/future-retrieval-roadmap.md) — planned retrieval improvements
- [`synapse-docs/docs/architecture.md`](./synapse-docs/docs/architecture.md) — public-facing architecture overview

## Making Changes

### Adding or modifying a tool

Tools are registered in `src/mcp/tools/*.ts` using `registerJsonTool`. Each tool needs:
- A canonical name (`synapse_*`)
- Zod input schema
- `readOnlyHint` / `destructiveHint` annotations
- Handler returning plain data (serialization is handled by `toolResult`)

### Updating the skill

The skill at `skills/synapse/SKILL.md` is the source of truth. After editing it, sync to the installed location:
```bash
npm run install:skill
```

### Index backends

- `VectorIndexService` (`src/services/retrieval/vector-index/service.ts`) — JSON backend, works on all Node versions
- `SqliteVecIndexService` (`src/services/retrieval/sqlite-vec/service.ts`) — sqlite-vec backend, requires Node 22+; uses `term_index` inverted index for fast semantic lookup

The server auto-falls back to JSON if sqlite-vec is unavailable. Both implement the same interface and share the tokenizer from `src/services/retrieval/core/tokenizer.ts`.

Changing the tokenizer requires a `SCHEMA_VERSION` bump in `src/services/retrieval/sqlite-vec/schema.ts` and a corresponding migration branch that clears stale index data.

## Pull Request Guidelines

- Keep PRs focused — one concern per PR
- Run `npm run quality` before opening a PR
- Update `skills/synapse/SKILL.md` if you add or change any tool
- Do not bump the version — maintainers handle releases

## Reporting Issues

Open an issue with:
- Node.js version (`node --version`)
- Platform (macOS/Linux/Windows)
- Output of `synapse doctor --verbose`
- Steps to reproduce

## Publishing (Maintainers Only)

Synapse auto-publishes to npm via GitHub Actions when `package.json` version changes on `main` or `release/*`. See `.github/workflows/release.yml` for the full pipeline.

**To trigger a release:**
1. Bump version in `package.json` and `src/runtime/version.ts`
2. Bump skill metadata in `skills/*/.synapse-skill.json`
3. Update `CHANGELOG.md` with the new version section
4. Commit, push to `main` (stable) or `release/*` (prerelease)
5. The release workflow runs the full quality pipeline, publishes to npm with provenance, then creates a GitHub release

**Manual release commands (if workflow is unavailable):**
```bash
npm run check
npm test
npm publish --access public              # stable
npm publish --access public --tag beta   # prerelease
```

**Dry-run pack validation:**
```bash
npm pack --dry-run
```
