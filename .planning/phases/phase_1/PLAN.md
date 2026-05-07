# Phase Plan: Phase 1 - Foundation & Layout

Establish the core structure and navigation for the Jaspr documentation site.

## Goals
- [x] Implement multi-page routing using `jaspr_router`.
- [x] Create a responsive layout with Header and Sidebar.
- [x] Set up the global design tokens (CSS variables).
- [x] Create skeleton pages for the initial documentation sections.

## Proposed Changes

### [DOCS-01, DOCS-02] Routing & App Structure
- Modify `lib/app.dart` to define the main `Router` component.
- Routes:
  - `/`: Home (Landing)
  - `/intro`: Introduction
  - `/install`: Installation
  - `/usage`: Basic Usage

### [DOCS-04] Core Layout Component
- Create `lib/components/layout.dart`:
  - `Header`: Project name, GitHub link, Search trigger (placeholder).
  - `Sidebar`: Navigation links grouped by category.
  - `ContentArea`: Slot for the current route's content.

### [DOCS-05] Foundation Styling
- Update `web/styles.css` (or `lib/styles.css` if using Jaspr styling):
  - Import Google Fonts (Outfit for headings, Inter for body).
  - Define color palette:
    - Background: `#0f172a` (slate-900)
    - Foreground: `#f8fafc` (slate-50)
    - Primary: `#38bdf8` (sky-400)
  - Glassmorphism utility classes.

### Initial Pages
- Create placeholder components in `lib/pages/`:
  - `home_page.dart`
  - `intro_page.dart`
  - `install_page.dart`

## Verification Plan

### Automated Tests
- None for this phase (manual verification preferred for layout).

### Manual Verification
1. Run `jaspr serve` from the `docs` directory.
2. Navigate to `http://localhost:8080`.
3. Click through the Sidebar links and verify the URL and content update.
4. Verify the layout persists across pages.
