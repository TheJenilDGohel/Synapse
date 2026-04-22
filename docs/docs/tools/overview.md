# Tools Overview (74 Tools)

<div className="docPanel docPanel--compact">
  <p>
    Synapse provides a comprehensive suite of <strong>74 MCP tools</strong> designed for local-first AI engineering. Use them in layers: start with <strong>Agent Prime</strong> for unified context, use <strong>Fused Search</strong> to find information across domains, and leverage <strong>Batch Operations</strong> for high-performance memory management.
  </p>
</div>

## 🏗️ Core Toolsets

<div className="docGrid docGrid--2">
  <div className="docPanel">
    <h3>🚀 Agentic Workflow (NEW)</h3>
    <p>Unified context and proactive guidance.</p>
    <ul>
      <li>`synapse_agent_prime` — Context in 1 call</li>
      <li>`synapse_find` — Fused cross-domain search</li>
      <li>`synapse_whats_new` — Session deltas</li>
      <li>`synapse_help` — Task-scoped guidance</li>
      <li>`synapse_teach` — Behavior modifiers</li>
      <li>`synapse_audit` — Health dashboard</li>
      <li>`synapse_file_changed` — Proactive hints</li>
    </ul>
  </div>
  <div className="docPanel">
    <h3>🔍 Code Intelligence</h3>
    <p>Symbol-aware analysis and navigation.</p>
    <ul>
      <li>`synapse_find_callers`</li>
      <li>`synapse_find_definition`</li>
      <li>`synapse_find_implementations`</li>
      <li>`synapse_rename_preview`</li>
      <li>`synapse_get_symbol`</li>
      <li>`synapse_find_usages`</li>
    </ul>
  </div>
  <div className="docPanel">
    <h3>📦 Batch Operations</h3>
    <p>High-performance bulk writes (500/call).</p>
    <ul>
      <li>`synapse_kg_add_entities_batch`</li>
      <li>`synapse_kg_add_triples_batch`</li>
      <li>`synapse_memory_store_batch`</li>
      <li>`synapse_memory_delete_batch`</li>
      <li>`synapse_kg_delete_entities_batch`</li>
      <li>`synapse_kg_delete_triples_batch`</li>
    </ul>
  </div>
  <div className="docPanel">
    <h3>🧠 Persistent Memory</h3>
    <p>Durable knowledge base for AI agents.</p>
    <ul>
      <li>`synapse_task_context`</li>
      <li>`synapse_memory_recall`</li>
      <li>`synapse_memory_get` / `list`</li>
      <li>`synapse_memory_store` / `update`</li>
      <li>`synapse_capture_outcome`</li>
      <li>`synapse_memory_related`</li>
      <li>`synapse_memory_suggest_relations`</li>
    </ul>
  </div>
  <div className="docPanel">
    <h3>🕸️ Knowledge Graph</h3>
    <p>Temporal facts and multi-hop relationships.</p>
    <ul>
      <li>`synapse_kg_add_entity`</li>
      <li>`synapse_kg_add_triple`</li>
      <li>`synapse_kg_query` / `timeline`</li>
      <li>`synapse_kg_invalidate`</li>
      <li>`synapse_kg_as_of`</li>
      <li>`synapse_graph_traverse`</li>
      <li>`synapse_graph_bridges`</li>
    </ul>
  </div>
  <div className="docPanel">
    <h3>📂 Workspace & Discovery</h3>
    <p>File system and project awareness.</p>
    <ul>
      <li>`synapse_list_roots`</li>
      <li>`synapse_list_projects`</li>
      <li>`synapse_project_tree`</li>
      <li>`synapse_read_file`</li>
      <li>`synapse_summarize_project`</li>
      <li>`synapse_project_backfill`</li>
    </ul>
  </div>
</div>

---

## 🚦 Choosing the Right Tool

| Goal | Primary Tool | Advantage |
| --- | --- | --- |
| **Start a task** | `synapse_agent_prime` | Returns memories, entities, files, and actions in one call. |
| **Search everything** | `synapse_find` | Fused RRF ranking across memory, code, and KG. |
| **Navigate code** | `synapse_find_definition` | Jumps straight to the source of any symbol. |
| **Set a preference** | `synapse_teach` | Stores a behavior modifier that surfaces in future tasks. |
| **Bulk migration** | `synapse_kg_add_triples_batch` | Processes up to 500 facts in a single transaction. |
| **Check health** | `synapse_audit` | Comprehensive visual score of your AI's knowledge base. |

---

## 🛠️ Typical Agentic Workflow

1.  **Context Rehydration**: Use `synapse_agent_prime` to get up to speed on the current task.
2.  **Discovery**: Use `synapse_find` to locate relevant modules or memories.
3.  **Deep Dive**: Use `synapse_find_callers` or `synapse_read_file` for implementation details.
4.  **Action**: Perform the task (edit files, fix bugs).
5.  **Documentation**: Use `synapse_capture_outcome` to persist what was learned.
6.  **Refinement**: Use `synapse_teach` to store new behavioral rules for next time.

---

:::tip Maintainer Note
This list is a summary. For the full technical specification of all 74 tools, including input schemas and return types, please refer to the individual tool documentation pages.
:::
