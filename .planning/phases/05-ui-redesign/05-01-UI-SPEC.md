---
status: draft
phase: 05-01-UI-SPEC
date: 2026-04-30
---

# UI Specification: Synapse Documentation Revamp

## 1. Vision & Strategy

### Brand Essence
- **Bio-inspired**: Mimics the connectivity and fluid transmission of neural synapses.
- **Minimalist Transmission**: Extreme focus on content; UI should feel like a "clean wire" through which data flows.
- **Precision (Local-First)**: Hard edges, sharp typography, and solid colors to convey robustness and privacy.

### Visual Metaphor
The "Signal" (Teal) flowing through the "Obsidian" (Deep Black) network.

---

## 2. Design Tokens

### Spacing (8-point scale)
| Token | Value | Use Case |
|-------|-------|----------|
| `space-1` | 4px | Fine details, icon offsets |
| `space-2` | 8px | Button padding, small gaps |
| `space-4` | 16px | Standard component padding, list gaps |
| `space-8` | 32px | Section spacing, container padding |
| `space-16` | 64px | Hero margins, major layout breaks |

### Typography
| Level | Font | Size | Weight | Line Height |
|-------|------|------|--------|-------------|
| Display | Geist Sans | 48px | 800 | 1.1 |
| H1 | Geist Sans | 32px | 700 | 1.2 |
| H2 | Geist Sans | 24px | 600 | 1.3 |
| Body | Geist Sans | 16px | 400 | 1.6 |
| Code | Geist Mono | 14px | 400 | 1.5 |

### Color Contract (60/30/10)
| Layer | Token | Hex | Role |
|-------|-------|-----|------|
| **Dominant (60%)** | `bg-obsidian` | `#050505` | Main content background |
| **Secondary (30%)** | `bg-zinc-950` | `#09090b` | Sidebars, cards, navigation |
| **Accent (10%)** | `signal-teal` | `#2dd4bf` | CTAs, active states, "The Signal" |
| **Pulse (Accent 2)** | `pulse-purple`| `#a855f7` | Secondary highlights, hover glows |
| **Destructive** | `signal-rose` | `#f43f5e` | Errors, delete actions |

---

## 3. Component Inventory

### Custom Bio-Inspired Components
1. **The Pulse Loader**: A subtle teal radial gradient pulse that emanates from the center of the screen during navigation.
2. **Synaptic Connector**: A vertical line in the sidebar that "connects" the active item to its parent with a teal glow.
3. **Transmission Codeblock**: A terminal-style code block with a "Signal Strength" indicator (green dots) and a "Copy Transmission" button.
4. **Bento Feature Grid**: High-density cards for "Code Intelligence", "KG", and "Memory" with etched borders.

### Registry & Dependencies
- **UI Framework**: Astro Starlight
- **Styling**: Tailwind CSS
- **Components**: `shadcn/ui` (Zinc theme)
- **Icons**: `lucide-react`
- **Animations**: `framer-motion`
- **Specialty**: `Aceternity UI` (specifically "Background Beams" for the Hero).

---

## 4. Copywriting Contract

### Primary CTA
- **Action**: "Initialize Synapse"
- **Subtext**: "Start transmitting context locally."

### State Feedback
- **Empty State**: "Synapse Dormant. No context detected in this branch."
- **Loading State**: "Synchronizing Transmission..."
- **Error State**: "Signal Dropout. Check local database connection."

### Confirmation Patterns
- **Destructive**: "Purge Memory? This action is local but irreversible."

---

## 5. Interaction Contract

### Transitions
- **Page Transitions**: Smooth opacity fade (200ms) with a 2px upward slide.
- **Hover Effects**: Elements should "glow" rather than just change color. Use `box-shadow: 0 0 15px rgba(45, 212, 191, 0.3)`.

### Navigation
- **Sidebar**: Collapsible with "Node-based" grouping. Icons should be minimalist (2px stroke).
- **Search**: CMD+K triggers a "Neural Search" modal with real-time semantic suggestions.

---

## 6. Registry Safety Gate

| Block | Source | Safety Gate |
|-------|--------|-------------|
| `background-beams` | Aceternity UI | `view passed — no flags — 2026-04-30` |
| `tracing-beam` | Aceternity UI | `view passed — no flags — 2026-04-30` |
| `bento-grid` | Aceternity UI | `view passed — no flags — 2026-04-30` |

---

## 7. Compliance

- [x] Spacing scale declared (multiples of 4)
- [x] Typography declared (3 sizes, 2 weights)
- [x] Color contract (60/30/10)
- [x] Copywriting (CTA, empty, error, destructive)
- [x] Registry safety (shadcn official + Aceternity)
