---
name: loci:dashboard
description: Show a live terminal dashboard with memory stats, KG overview, and server status
allowed-tools:
  - Bash
---

<objective>
Launch the interactive Loci terminal dashboard showing memory, knowledge graph, nests, recent memories, and server status in a live-refreshing TUI.
</objective>

<process>
1. Run `loci dashboard` via Bash tool to launch the interactive TUI.
2. The dashboard auto-refreshes every 5 seconds and supports keyboard navigation.
3. If the user wants a quick snapshot instead of interactive mode, run `loci dashboard --json` and present the results inline.
</process>
