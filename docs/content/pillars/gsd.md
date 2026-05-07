---
title: GSD Workflow
description: The disciplined methodology for autonomous agentic execution.
---
<!-- generated-by: gsd-doc-writer -->

# GSD Workflow (Get Stuff Done)

The **GSD (Get Stuff Done)** workflow is more than a toolset; it is a rigorous engineering methodology for building software with AI agents. It replaces the "prompt and pray" approach with a disciplined, three-phase cycle that ensures architectural integrity, minimizes hallucinations, and guarantees high-quality output.

## The Engineering Cycle

Every task managed by Synapse follows a strict **Discuss → Plan → Execute** pipeline. This structure enforces clarity and verification at every stage of the development lifecycle.

### Phase 1: Discuss (`/gsd-discuss`)
The objective of the Discussion phase is to eliminate ambiguity. Before any implementation begins, the agent:
*   Asks clarifying questions to surface hidden requirements.
*   Identifies potential edge cases.
*   Maps existing patterns within the codebase to ensure stylistic consistency.

### Phase 2: Plan (`/gsd-plan`)
Once the "What" is understood, the agent generates a comprehensive `PLAN.md`. A GSD-compliant plan must include:
*   **Atomic Steps**: A sequence of small, manageable implementation steps.
*   **Verification Criteria**: Explicit tests or checks for each step.
*   **Risk Mitigation**: Identification of potential side effects and architectural impacts.

### Phase 3: Execute (`/gsd-execute`)
Execution is performed in waves. For each step in the plan:
1.  **Code Transformation**: The agent applies the planned changes.
2.  **Verification**: The agent runs the predefined verification criteria.
3.  **Outcome Capture**: The results (success or failure) are captured into the **[Temporal Graph](/pillars/temporal)** to preserve context for future tasks.

## Why GSD is Mandatory for Pro Agents

*   **Hallucination Prevention**: By forcing a planning phase, agents are prevented from diving into code with incorrect assumptions.
*   **Atomic Rollbacks**: If a step fails verification, the workflow can halt and roll back to the last known stable state.
*   **Knowledge Persistence**: Every successful execution cycle feeds back into the project's memory, making the agent "smarter" for the next task.
*   **Local Governance**: All plans, discussions, and execution logs are stored locally in your workspace, ensuring full auditability.

## The GSD Toolbelt

Synapse provides specialized commands to orchestrate this workflow:

| Command | Purpose |
| :--- | :--- |
| `synapse task-context` | Initializes a new task and rehydrates relevant memory from the graph. |
| `synapse capture-outcome` | Logs the result of an execution phase back into the project memory. |
| `synapse-task-context` | (Global Bin) Quick access to start new development cycles. |

:::tip
For complex refactors or new feature development, always start with a `task-context` initialization to ensure your agent is operating with maximum semantic alignment.
:::
