# Debug Session: proactive-expert-steering-injection

## Symptoms
- **Expected**: Automatic context injection on session start ("wakeup").
- **Actual**: Context only injected on `Edit/Write/Bash` tools; no graph awareness.
- **Goal**: Implement a proactive "Expert Steering" wakeup trigger and graph-aware injection.

## Hypotheses
1. `synapse-pre-tool.cjs` needs a broader matcher (including Read tools).
2. We need a way to detect "Session Start" in the AI client.
3. The hook should call `agent_prime` logic instead of `task-context`.

## ROOT CAUSE FOUND
The context injection was "Reactive" and "Graph-Blind". It only triggered on modification tools and used the old `task-context` logic which ignored the Knowledge Graph.

## FIXES IMPLEMENTED
1. **Upgraded CLI**: Added `synapse memory prime` command that leverages `agent_prime` logic (Graph + Memory).
2. **Upgraded Hook**: Modified `synapse-pre-tool.cjs` to use the new `prime` command and broadened the tool matcher to include `Read` and `Grep`.
3. **SOP Injection**: The hook now injects a mandatory `[SYNAPSE EXPERT STEERING]` header with the SOP instruction.

## VERIFICATION
- Ran `synapse memory prime "modernization" --json` and confirmed it returns the [teach] rule and KG relationships.
- Verified hook matcher now triggers on `Read` tools, ensuring "arrival" context.
