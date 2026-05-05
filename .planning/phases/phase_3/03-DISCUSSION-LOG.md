# Phase 3: Content Pipeline & Porting - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 3-content-pipeline
**Areas discussed:** Tools data loading approach, Code block syntax highlighting, Content organization structure

---

## Tools Data Loading Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Import as Dart asset | Use rootBundle.loadString() or build-time code generation to embed tools.json as static data | ✓ |
| HTTP request | Load tools.json via HTTP at runtime (fails in static builds) | |
| Build-time generation | Generate Dart code from tools.json during build process | |

**User's choice:** Import as Dart asset (auto-selected)
**Notes:** Current implementation uses HTTP request which fails in static builds. Importing as Dart asset is the recommended approach for static sites.

---

## Code Block Syntax Highlighting

| Option | Description | Selected |
|--------|-------------|----------|
| Keep Prism.js CDN | Continue using Prism.js via CDN with theme and language support | ✓ |
| Switch to highlight.js | Alternative syntax highlighting library | |
| Dart-based highlighting | Use Dart package for syntax highlighting | |

**User's choice:** Keep Prism.js CDN (auto-selected)
**Notes:** Prism.js is already configured in main.server.dart with theme and language support. Lightweight and works well in static builds.

---

## Content Organization Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Keep current structure | Flat structure with pillars/ subdirectory for organized content | ✓ |
| Reorganize by feature | Group content by feature rather than type | |
| Use nested categories | Deep nesting with multiple levels of organization | |

**User's choice:** Keep current structure (auto-selected)
**Notes:** Current structure is already implemented and provides logical grouping with pillars/ subdirectory.

---

## Claude's Discretion

- Choose between `rootBundle.loadString()` vs build-time code generation for tools data loading
- Determine optimal code block styling and copy-to-clipboard UX
- Decide on additional content sections beyond core README porting

## Deferred Ideas

None — discussion stayed within phase scope
