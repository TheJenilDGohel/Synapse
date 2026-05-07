# Phase Plan: Phase 3 - Content Pipeline & Porting

Integrate `jaspr_content` to manage documentation via Markdown files and port existing core documentation.

## Goals
- [ ] Integrate `jaspr_content` package for Markdown processing.
- [ ] Create a content-driven routing system for documentation pages.
- [ ] Port existing README content to Markdown files in the `content/` directory.
- [ ] Map Markdown elements to custom "Pro Max" components (CodeBlock, Callout).
- [ ] Implement a dynamic tool listing page from data (YAML/JSON).

## Proposed Changes

### [DOCS-03] Content Pipeline
- Add `jaspr_content` dependency to `pubspec.yaml`.
- Create `docs/content/` directory.
- Move static page content from `lib/pages/` to `docs/content/`.
  - `docs/content/intro.md`
  - `docs/content/install.md`
  - `docs/content/quickstart.md`
- Configure `jaspr_content` in `lib/main.server.dart` to discover and parse these files.

### [DOCS-10, DOCS-11] Porting Core Docs
- Extract technical details from the main Synapse README.
- Create organized markdown files for "Temporal Memory", "Code Intelligence", and "GSD Workflow".

### [DOCS-12] Tool Documentation
- Create a data file (e.g., `content/tools.yaml`) listing all 70+ MCP tools.
- Implement a `ToolsPage` component that renders this data into a searchable grid of cards.

### Custom Markdown Rendering
- Configure `jaspr_content` to use custom components for:
  - Code blocks (`CodeBlock`)
  - Alerts/Callouts (using custom syntax like `:::tip`)

## Verification Plan

### Automated Tests
- None.

### Manual Verification
1. Verify that navigating to `/intro` renders the content from `content/intro.md`.
2. Check that code blocks in Markdown use the `CodeBlock` component with syntax highlighting.
3. Verify that the `Tools` page correctly displays all tools from the data file.
