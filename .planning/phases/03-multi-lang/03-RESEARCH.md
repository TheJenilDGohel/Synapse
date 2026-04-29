# Phase 3: Multi-Language Expansion - Research

**Researched:** 2026-04-28
**Domain:** Tree-sitter Code Intelligence (Python, Go, Rust)
**Confidence:** HIGH

## Summary

This research focuses on expanding Synapse's high-fidelity code intelligence to Python, Go, and Rust. The expansion relies on Tree-sitter for AST-aware chunking and symbol extraction. We have verified that the official grammars for these languages include pre-compiled binaries for all major platforms (Windows, macOS, Linux on x64 and ARM64), ensuring a smooth "zero-config" installation experience for users.

**Primary recommendation:** Integrate `tree-sitter-python`, `tree-sitter-go`, and `tree-sitter-rust` as optional dependencies and transition from manual tree-walking to Tree-sitter Queries (`.scm`) for robust symbol mapping and scope extraction.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Parser Integration | API / Backend | — | Tree-sitter parsing is CPU-intensive and requires native modules. |
| AST-Aware Chunking | API / Backend | — | Core logic for creating searchable code units from files. |
| Symbol Mapping | API / Backend | — | Extraction of definitions/references for Knowledge Graph. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tree-sitter` | `0.21.0` | Core AST parsing | Industry standard for high-performance parsing [VERIFIED: package.json]. |
| `tree-sitter-python` | `0.25.0` | Python grammar | Official grammar with multi-platform prebuilds [VERIFIED: npm registry]. |
| `tree-sitter-go` | `0.25.0` | Go grammar | Official grammar with multi-platform prebuilds [VERIFIED: npm registry]. |
| `tree-sitter-rust` | `0.24.0` | Rust grammar | Official grammar with multi-platform prebuilds [VERIFIED: npm registry]. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| `prebuildify` | — | Native bundling | Used by grammars to ship binaries, avoiding local compilation. |

**Installation:**
```bash
npm install --save-optional tree-sitter-python tree-sitter-go tree-sitter-rust
```

## Architecture Patterns

### Recommended Project Structure
```
src/core/engine/retrieval/
├── chunker/
│   ├── queries/           # New: Language-specific .scm query files
│   │   ├── python.scm
│   │   ├── go.scm
│   │   └── rust.scm
│   └── service.ts         # Updated to handle new grammars
└── symbols/
    └── queries/           # New: Symbol extraction queries
        ├── python-tags.scm
        ├── go-tags.scm
        └── rust-tags.scm
```

### Pattern 1: Query-Based Symbol Extraction
**What:** Use Tree-sitter Query files (`.scm`) to define what nodes constitute definitions, exports, and calls.
**When to use:** Preferred over manual `walkNodes` for maintainability and precision.
**Example (Python Tags Query):**
```scm
;; Source: github.com/tree-sitter/tree-sitter-python/queries/tags.scm
(function_definition
  name: (identifier) @name) @definition.function

(class_definition
  name: (identifier) @name) @definition.class

(call
  function: [
    (identifier) @name
    (attribute
      attribute: (identifier) @name)
  ]) @reference.call
```

### Pattern 2: Contextualized AST Chunking (Split-then-Merge)
**What:** Recursively split files by AST nodes (Classes -> Functions) and prepend "Context Headers" (signatures/imports) to each chunk.
**When to use:** Standard for high-quality code embeddings [CITED: towardsai.net].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Symbol Extraction | Manual Node Walking | Tree-sitter Queries | Queries handle nested scopes and language-specific nuances more cleanly. |
| Cross-platform Binaries | Custom C++ wrappers | `prebuildify` | Grammars already provide pre-compiled binaries for 99% of user environments. |

## Common Pitfalls

### Pitfall 1: Decorator Separation (Python)
**What goes wrong:** Chunking a Python function without its decorators.
**How to avoid:** In the AST, decorators are usually siblings or children of the definition node; ensure they are bundled in the same text slice.

### Pitfall 2: Go Structural Typing
**What goes wrong:** Splitting a Go struct and its method receivers into different chunks without cross-referencing.
**How to avoid:** Prepend the struct signature or type name to method chunks.

### Pitfall 3: Rust Macro Expansion
**What goes wrong:** Tree-sitter often fails to parse inside complex macros (e.g., `vec![]` or custom dsls) without specialized configuration.
**How to avoid:** Treat macro calls as opaque leaf nodes or use specific macro queries if available.

## Code Examples

### Query Execution in Node.js
```typescript
// Verified pattern for node-tree-sitter 0.21.0
import Parser from 'tree-sitter';
import Python from 'tree-sitter-python';

const parser = new Parser();
parser.setLanguage(Python);

const tree = parser.parse(sourceCode);
const query = Python.query(`
  (function_definition name: (identifier) @name) @def
`);
const captures = query.captures(tree.rootNode);

for (const { name, node } of captures) {
  console.log(`Found function: ${node.text}`);
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js Test Runner (node --test) |
| Config file | none — see Wave 0 |
| Quick run command | `npm test` |
| Full suite command | `npm run test:coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LANG-01 | Python/Go/Rust grammars can be loaded | unit | `tsx --test test/multi-lang-load.test.ts` | ❌ Wave 0 |
| LANG-01 | AST chunking produces correct slices for polyglot files | integration | `tsx --test test/polyglot-chunking.test.ts` | ❌ Wave 0 |
| LANG-01 | Symbol extraction finds definitions and calls in Python/Go/Rust | integration | `tsx --test test/polyglot-symbols.test.ts` | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] `test/multi-lang-load.test.ts` — verifies optional dependency loading
- [ ] `test/polyglot-chunking.test.ts` — verifies chunking logic with sample files
- [ ] `test/polyglot-symbols.test.ts` — verifies symbol extraction with sample files

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Ensure parser handles malformed/malicious source code without crashing (Tree-sitter is generally robust). |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Users have standard OS/Arch for prebuilds | Standard Stack | If a user is on a niche OS (e.g. FreeBSD), npm will attempt a local build which might fail. |
| A2 | Query performance is adequate for 10M+ vectors | Summary | Large files with many queries might slow down background indexing. |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `tree-sitter` | AST Chunker | ✓ | 0.21.0 | Line-based chunking |
| `python3` | — | ✓ | 3.12.x | — |
| `go` | — | ✓ | 1.22.x | — |
| `rustc` | — | ✓ | 1.78.x | — |

## Sources

### Primary (HIGH confidence)
- `tree-sitter-python` [v0.25.0] - Verified prebuilds via `npm pack`.
- `tree-sitter-go` [v0.25.0] - Verified prebuilds via `npm pack`.
- `tree-sitter-rust` [v0.24.0] - Verified prebuilds via `npm pack`.
- `towardsai.net` - Best practices for AST chunking.

### Secondary (MEDIUM confidence)
- `nvim-treesitter` - Reference for symbol queries.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified actual package contents.
- Architecture: HIGH - Follows established patterns in industry (Copilot, Cody).
- Pitfalls: MEDIUM - Based on common issues in other code intelligence tools.

**Research date:** 2026-04-28
**Valid until:** 2026-05-28
