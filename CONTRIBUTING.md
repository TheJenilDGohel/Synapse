# Contributing to Synapse

Thank you for your interest in contributing to Synapse! This guide will help you get started with local development and our contribution workflow.

## 🚀 Getting Started

1. **Clone the repo:**
   ```bash
   git clone https://github.com/TheJenilDGohel/Synapse.git
   cd synapse
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Initialize local environment:**
   ```bash
   npm run setup
   npm run doctor
   ```

## 🛠️ Development Workflow

### Useful Commands

| Command | Description |
|:---|:---|
| `npm start` | Start the MCP server locally (via `tsx`) |
| `npm run check` | Run TypeScript type-checking |
| `npm run quality` | Full suite: Lint, Coverage, Cycles, Deps, Package check |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end integration tests |
| `npm run install:skill` | Sync the `synapse` skill to your local AI clients |

### Branching Policy

Always create a branch for your work:
- `feat/description` for new features.
- `fix/description` for bug fixes.
- `docs/description` for documentation only.
- `chore/description` for build/CI/tooling updates.

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat: add hybrid search capability`
- `fix: resolve crash in AST parser`
- `docs: update quickstart instructions`
- `chore: bump dependencies`

## 📬 Pull Request Process

1. **Self-Check**: Ensure `npm run quality` passes locally.
2. **Atomic Commits**: Keep changes focused and commits descriptive.
3. **Update Docs**: If you change a tool or behavior, update the relevant `.md` files in `docs/` and the skill in `skills/synapse/SKILL.md`.
4. **Open PR**: Fill out the PR template completely.
5. **Review**: At least one maintainer must approve the PR.
6. **Merge**: Once CI passes and approval is granted, the PR will be squash-merged into `main`.

## ⚖️ Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).
