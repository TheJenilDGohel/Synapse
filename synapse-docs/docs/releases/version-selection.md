---
description: Choose the correct Synapse version line with explicit install commands for the current stable release, beta track, and archived releases.
---

# Version Selection

Use this page to choose a Synapse version track and install it explicitly.

## Multi-Track Offerings

Synapse maintains two active release tracks to balance proven stability with rapid innovation.

- **Stable (v0.2.0)**: Use for production-critical workflows and established tools.
- **Beta (v0.3.0-beta.2)**: Use for the modern interactive CLI, TUI Dashboard, and refactored diagnostics.

## Quick Selection

| Goal | Version | Command |
| --- | --- | --- |
| **Current Beta** | `0.3.0-beta.2` | `npm install -g synapse@beta` |
| **Current Stable** | `0.2.0` | `npm install -g synapse` |
| **Previous Stable** | `0.1.0` | `npm install -g synapse@0.1.0` |
| **Archived Beta** | `0.0.7-beta.2` | `npm install -g synapse@0.0.7-beta.2` |

## Detailed Version Matrix

| Version | Channel | Install Command |
| --- | --- | --- |
| `0.3.0-beta.2` | beta | `npm install -g synapse@0.3.0-beta.2` |
| `0.2.0` | latest stable | `npm install -g synapse@0.2.0` |
| `0.1.0` | previous stable | `npm install -g synapse@0.1.0` |
| `0.0.7-beta.2` | archived beta | `npm install -g synapse@0.0.7-beta.2` |
| `0.0.6-beta.1` | archived beta | `npm install -g synapse@0.0.6-beta.1` |
| `0.0.5` | legacy stable | `npm install -g synapse@0.0.5` |
| `0.0.4-beta.9` | archived beta | `npm install -g synapse@0.0.4-beta.9` |
| `0.0.3` | legacy stable | `npm install -g synapse@0.0.3` |

## Post-Install Command Differences

| Version Line | Primary CLI Command | Dashboard Support |
| --- | --- | --- |
| **0.3.0+** | `synapse` ([Modernized]) | Yes (Interactive TUI) |
| **0.1.0 - 0.2.0** | `synapse` | No (CLI only) |
| **0.0.4 - 0.0.7** | `synapse` | No |
| **< 0.0.4** | `synapse-setup` | No |

## Upgrade / Downgrade Examples

```bash
# Upgrade to beta
synapse upgrade beta

# Pin to current stable
npm install -g synapse@0.2.0

# Revert to previous stable
synapse upgrade 0.1.0
```

---

- `0.3.0-beta.2` introduces the **Modernization Update** with a full visual refactor.
- `0.2.0` is the current stable baseline with full TypeScript and 74 tool support.
- Use [Release Matrix](./history) for the full context and [Current Release](./current) for the active documentation track.
