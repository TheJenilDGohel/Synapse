# Synapse Has Been Discontinued

**Date of Discontinuation:** June 3, 2025

---

## What Synapse Was

Synapse was a local-first MCP server that gave AI coding agents persistent memory, temporal knowledge graphs, and hybrid code intelligence — all powered by a single SQLite engine with zero cloud dependencies. It was built for developers who wanted their AI to remember decisions, understand code semantically, and never lose context between sessions.

## Why Development Stopped

Honestly? The landscape moved faster than a solo maintainer could keep up with. The MCP ecosystem exploded, and the problem space Synapse was solving started getting addressed by better-funded teams with more resources. Rather than ship increasingly half-baked updates, I decided it was better to stop cleanly than to let the project slowly rot. There's no drama here — just a recognition that this particular chapter is done.

## What Still Works

- **Installation and basic usage** — `npm install -g synapse-cortex` still works, and the existing feature set is functional.
- **Memory and Knowledge Graph** — Storing and querying memories, entities, and relationships all work as documented.
- **Hybrid Code Search** — BM25 + vector search over AST chunks still functions if dependencies install correctly.
- **Lite Mode** — Falls back gracefully when native dependencies aren't available.

## What Doesn't

- **No security patches** — Vulnerabilities in dependencies will not be addressed.
- **No compatibility updates** — Future Node.js versions, MCP SDK changes, or breaking dependency updates won't be fixed.
- **No new features** — The roadmap is permanently frozen.
- **No issue triage or PR reviews** — The issue tracker and pull requests are closed.

## Forks Welcome

If Synapse solved a problem for you and you want to keep it alive — please fork it. The MIT license means you're free to take it anywhere. No need to ask permission. If you build something great on top of it, I'd genuinely love to hear about it.

## Further Reading

For the full story behind this decision, read the Medium article:
→ [https://medium.com/@thejenildgohel](https://medium.com/@thejenildgohel)

---

Thank you to everyone who tried Synapse, filed issues, or even just starred the repo. Building this was a meaningful experience, and I learned more from it than any course or tutorial could have taught me.

— Jenil
