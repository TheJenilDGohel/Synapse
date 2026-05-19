# Synapse Docs Reconstruction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use gsd-executor to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely recreate the Jaspr documentation site style and branding for Synapse, including content migration, "On this page" navigation, and layout refinement.

**Architecture:** Use Jaspr's component-based architecture to implement a three-column layout. Enhance the existing `DocsLayout` with a right sidebar and a dynamic TOC component.

**Tech Stack:** Jaspr (Dart), CSS, Markdown.

---

### Task 1: Global Brand Migration (Content)

**Files:**
- Modify: `docs/content/**/*.md` (All content files)

- [ ] **Step 1: Replace "Loci" with "Synapse" in all markdown files**

Run a batch replacement across the `docs/content/` directory.

- [ ] **Step 2: Update "The Synaptic Principle" tip in `intro.md`**
Ensure the wording matches the new "Synapse" branding correctly.

- [ ] **Step 3: Commit**
```bash
git add docs/content/
git commit -m "docs: migrate content branding from Loci to Synapse"
```

### Task 2: Layout Enhancement - Three Column Structure

**Files:**
- Modify: `docs/lib/layouts/docs_layout.dart`
- Modify: `docs/web/styles.css`

- [ ] **Step 1: Update `DocsLayoutWrapper` to include a placeholder for the right sidebar**

```dart
// docs/lib/layouts/docs_layout.dart
// ... inside DocsLayoutWrapper.build
main_(classes: 'layout-content', [
  div(classes: 'content-inner', [
    child,
  ]),
  const TableOfContents(), // New component to be created
]),
```

- [ ] **Step 2: Update CSS for the three-column layout**

```css
/* docs/web/styles.css */
.layout-content {
  display: grid;
  grid-template-columns: 1fr 240px; /* Main content + TOC */
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.content-inner {
  min-width: 0;
}

@media (max-width: 1280px) {
  .layout-content {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Commit**
```bash
git add docs/lib/layouts/docs_layout.dart docs/web/styles.css
git commit -m "style: implement three-column layout structure"
```

### Task 3: Implementation of "On this page" TOC Component

**Files:**
- Create: `docs/lib/components/toc.dart`
- Modify: `docs/web/styles.css`

- [ ] **Step 1: Create the `TableOfContents` component**

```dart
import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

class TableOfContents extends StatelessComponent {
  const TableOfContents({super.key});

  @override
  Component build(BuildContext context) {
    return aside(classes: 'toc-sidebar', [
      h3([text('On this page')]),
      ul([
        // This will eventually be dynamic via JS or page metadata
        li([a(href: '#', [text('Overview')])]),
      ]),
    ]);
  }
}
```

- [ ] **Step 2: Add TOC styling**

```css
.toc-sidebar {
  position: sticky;
  top: calc(var(--header-height) + 2rem);
  height: fit-content;
  padding-left: 1rem;
  border-left: 1px solid var(--border-color);
}

.toc-sidebar h3 {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-top: 0;
}

.toc-sidebar ul {
  list-style: none;
  padding: 0;
  font-size: 0.875rem;
}

.toc-sidebar li {
  margin-bottom: 0.5rem;
}

.toc-sidebar a {
  color: var(--text-muted);
}

.toc-sidebar a:hover {
  color: var(--primary-color);
  text-decoration: none;
}
```

- [ ] **Step 3: Commit**
```bash
git add docs/lib/components/toc.dart docs/web/styles.css
git commit -m "feat: add Table of Contents component"
```

### Task 4: Footer & Final Polish

**Files:**
- Modify: `docs/lib/layouts/docs_layout.dart`
- Modify: `docs/web/styles.css`

- [ ] **Step 1: Add the footer to the layout**

```dart
// docs/lib/layouts/docs_layout.dart
footer(classes: 'docs-footer', [
  text('Powered by '),
  a(href: 'https://docs.page', [text('docs.page')]),
  text(' | Built with '),
  a(href: 'https://jaspr.site', [text('Jaspr')],
]),
```

- [ ] **Step 2: Style the footer**

```css
.docs-footer {
  margin-top: 4rem;
  padding: 2rem 0;
  border-top: 1px solid var(--border-color);
  font-size: 0.875rem;
  color: var(--text-muted);
  text-align: center;
}
```

- [ ] **Step 3: Final Build & Verify**

Run: `npm run docs:build`
Expected: SUCCESS

- [ ] **Step 4: Commit**
```bash
git add docs/lib/layouts/docs_layout.dart docs/web/styles.css
git commit -m "feat: add documentation footer and final layout polish"
```
