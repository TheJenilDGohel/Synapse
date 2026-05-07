# Phase Plan: Phase 2 - UI/UX & Design System Refinement

Enhance the visual identity and documentation-specific UI components to achieve a "Pro Max" documentation experience.

## Goals
- [ ] Implement high-fidelity code blocks with syntax highlighting (Prism.js or similar).
- [ ] Create documentation components: Callouts (Note, Tip, Warning, Caution) and custom Cards.
- [ ] Refine the Sidebar for better responsiveness and active state handling.
- [ ] Implement a mobile-friendly navigation (hamburger menu).
- [ ] Finalize typography and global spacing.

## Proposed Changes

### [DOCS-08] Advanced Code Blocks
- Integrate a syntax highlighting library (e.g., Prism.js) via Jaspr's external scripts.
- Create a `CodeBlock` component in `lib/components/code_block.dart`.
- Features: Language tag, Copy to clipboard button, line highlighting.

### [DOCS-05] Documentation Components
- Create `lib/components/callout.dart`:
  - Support types: `info`, `tip`, `warning`, `danger`.
  - Icon integration (using Lucide or SVG).
- Create `lib/components/card.dart` for landing page and tool listings.

### [DOCS-06] Responsive Sidebar
- Add collapsible state to navigation groups.
- Implement a mobile overlay for the sidebar.
- Add a "Hamburger" toggle in the Header for mobile views.

### [DOCS-05] Visual Polish
- Add scroll-linked animations or subtle transitions.
- Refine glassmorphism effects in Header and Sidebar.
- Optimize typography (Line heights, font weights).

## Verification Plan

### Automated Tests
- None (Visual verification).

### Manual Verification
1. Open the site in a desktop browser and verify code block rendering.
2. Resize to mobile width (e.g., 375px) and verify the hamburger menu and sidebar overlay work.
3. Check all callout variants for consistent styling.
4. Verify active link highlighting in the sidebar as you navigate.
