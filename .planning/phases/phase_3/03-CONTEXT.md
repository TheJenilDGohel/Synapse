# Phase 3: Content Pipeline & Porting - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Integrate documentation content into Jaspr components using jaspr_content for Markdown processing, port existing README content, and implement tool documentation with static-compatible data loading.

</domain>

<decisions>
## Implementation Decisions

### Tools Data Loading
- **D-01:** Import tools data as a Dart asset (not HTTP request) - Use `rootBundle.loadString()` or build-time code generation to embed tools.json as static data
- **D-02:** Fix ToolsList component - Change from `StatefulWidget` to `StatefulComponent` (Jaspr API)

### Code Block Syntax Highlighting
- **D-03:** Keep Prism.js CDN approach - Already configured in main.server.dart with theme and language support
- **D-04:** Maintain CodeBlock component - Custom component wraps Prism.js highlighting with copy-to-clipboard functionality

### Content Organization
- **D-05:** Keep current content/ structure - Flat structure with pillars/ subdirectory for organized content
- **D-06:** Maintain frontmatter format - YAML frontmatter for title/description metadata

### Claude's Discretion
- Choose between `rootBundle.loadString()` vs build-time code generation for tools data loading
- Determine optimal code block styling and copy-to-clipboard UX
- Decide on additional content sections beyond core README porting

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Specifications
- `.planning/M006-ROADMAP.md` — Phase 3 requirements and success criteria
- `.planning/phases/phase_3/PLAN.md` — Detailed implementation plan

### Existing Code
- `docs/lib/main.server.dart` — jaspr_content configuration with custom components
- `docs/lib/components/tools_list.dart` — ToolsList component (needs fixing)
- `docs/lib/components/code_block.dart` — CodeBlock component
- `docs/lib/components/callout.dart` — Callout component
- `docs/content/` — Existing markdown content files
- `docs/web/assets/data/tools.json` — Tools data source

### Requirements
- `.planning/REQUIREMENTS.md` — DOCS-03, DOCS-08, DOCS-10, DOCS-11 requirements

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **jaspr_content**: Already configured with MarkdownParser and custom components
- **CodeBlock component**: Wraps Prism.js with syntax highlighting
- **Callout component**: Renders tip/info/warning callouts
- **DocsLayout**: Shared layout for documentation pages

### Established Patterns
- Custom component registration in main.server.dart using `CustomComponent`
- Markdown files with YAML frontmatter for metadata
- Static asset loading via web/ directory structure

### Integration Points
- main.server.dart: ContentApp configuration with parsers, layouts, and components
- docs/content/: Markdown files that get parsed by jaspr_content
- docs/lib/components/: Custom components for markdown rendering

### Known Issues
- ToolsList uses `StatefulWidget` (Flutter) instead of `StatefulComponent` (Jaspr)
- Tools data loading uses HTTP request which fails in static builds

</code_context>

<specifics>
## Specific Ideas

- Fix ToolsList component to use Jaspr's StatefulComponent API
- Load tools.json as a Dart asset using `rootBundle.loadString()` or build-time generation
- Ensure all 70+ MCP tools are documented in tools.json
- Port core README sections: Introduction, Installation, Quick Start, Core Pillars
- Maintain existing content structure with pillars/ subdirectory

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---
*Phase: 03-content-pipeline*
*Context gathered: 2026-05-05*
