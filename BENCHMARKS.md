# Synapse Benchmark Report

**Version:** 2026.05.4
**Platform:** Windows_NT x64 | Node 24.12.0

## Memory Operations
| Operation | Average | P95 |
| :--- | :--- | :--- |
| Store (100 memories) | 61.2ms | 73.3ms |
| Recall (exact match) | 2.8ms | 4.0ms |

## Knowledge Graph
| Operation | Average | P95 |
| :--- | :--- | :--- |
| Node Insertion (100 nodes) | 0.4ms | 0.6ms |
| Edge Traversal (depth 1) | 0.2ms | 1.0ms |

## Baseline Comparison (For Reference)
- **Zep graph search P95:** 150ms (published)
- **Mem0 recall P95:** ~100ms (estimated, cloud)

*Synapse achieves ultra-low latency by keeping all memory and graph representations inside a local SQLite process, eliminating network hops and serialization overhead.*