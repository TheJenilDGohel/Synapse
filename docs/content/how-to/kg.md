---
title: Managing Knowledge
description: How to build and query the Synapse Knowledge Graph for architectural intelligence.
---

# Managing Knowledge

The **Knowledge Graph** pillar provides a structured, temporal way to track relationships and decisions in your project. This guide covers how to manage entities, record facts (triples), and perform time-travel queries.

## Entities and Triples

The graph is composed of **Entities** (the nouns) and **Triples** (the relationships).

- **Entity**: A person, module, service, or concept (e.g., `UserService`, `ADR-001`, `Jenil`).
- **Triple**: A relationship in the form `Subject → Predicate → Object` (e.g., `UserService → depends_on → Database`).

## The Unified Controllers

In Synapse v2026.5.0, all graph mutations and queries are handled by two "Power Tools":

### 1. `synapse_kg_manage`
Use this tool to add or delete entities and triples. It supports batching and markdown ingestion.

**Example: Adding a relationship**
> *"Record that the 'PaymentModule' uses the 'StripeAPI' with high confidence."*

The agent will call `synapse_kg_manage` with the `add_triple` action.

### 2. `synapse_kg_query`
Use this tool to read the graph. It supports multi-hop traversal and temporal filtering.

**Example: Blast Radius Analysis**
> *"Which services depend on the 'AuthService', directly or indirectly?"*

The agent will call `synapse_kg_query` with the `traverse` action to find all downstream dependencies.

## Temporal Awareness (Time-Travel)

Every fact in Synapse is timestamped. You can query the graph as it existed at any point in history using the `as_of` parameter.

- **`synapse_kg_query(action="get_state", as_of="2024-05-01")`**: See the architecture as it was on May 1st.
- **`synapse_kg_query(action="timeline", entity_name="AuthService")`**: See every change ever recorded for that service.

## Use Case: Tracking Decisions (ADRs)

Synapse is the ideal place to store **Architectural Decision Records (ADRs)**.

1. **Store the ADR**: Record the full text of the decision in [Persistent Memory](memory).
2. **Link to the Graph**: Create a triple linking the ADR entity to the affected code modules.
3. **Automatic Recall**: Any time an agent works on an affected module, the ADR is automatically pulled into its context via `agent_prime`.

## Best Practices

- **Use Precise Predicates**: Instead of generic "links to," use "depends_on," "implements," "supersedes," or "conflicts_with."
- **Confidence Scores**: Always include a confidence score (0.0 to 1.0). This helps the AI weight the importance of different facts.
- **Valid-From Dates**: When recording a fact about a historical change, use the `valid_from` field to ensure the timeline is accurate.

---

**Next:** Explore how the graph integrates with **[Code Intelligence](../pillars/intel)**.
