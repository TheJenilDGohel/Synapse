# Phase 2: Local Enrichment - Research

**Researched:** April 2026
**Domain:** Local LLM Integration & Metadata Enrichment
**Confidence:** HIGH

## Summary

This phase focuses on improving retrieval relevance by enriching raw code with AI-generated metadata using local LLMs. Research confirms that **Transformers.js v4** provides a viable, high-performance, in-process path for running **Qwen2.5-Coder-1.5B** with **WebGPU** acceleration in Node.js. By utilizing **Worker Threads**, we can ensure that enrichment processing remains non-blocking, maintaining the responsiveness of the MCP server.

**Primary recommendation:** Use `@huggingface/transformers@4.x` with the `onnx-community/Qwen2.5-Coder-1.5B-Instruct` model (q4 quantization) running inside a Node.js Worker Thread with WebGPU enabled.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Model Inference | API (Worker Thread) | GPU | transformers.js v4 + WebGPU provides native acceleration. |
| Enrichment Logic | API (Worker Thread) | — | Prompting and orchestration of enrichment pipeline. |
| Metadata Storage | Database (SQLite) | — | Persistent storage of summaries and tags in SQLite. |
| Hybrid Retrieval | API | Database | Fusing vector similarity with lexical and tag-based filters. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@huggingface/transformers` | ^4.2.0 | LLM Inference | Native WebGPU support in Node.js, zero-config deployment. [VERIFIED: npm registry] |
| `onnxruntime-node` | ^1.20.0 | Inference Engine | Backend for transformers.js v4 on Node.js. [CITED: transformers.js docs] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:worker_threads` | Built-in | Background Processing | To run inference without blocking the main event loop. [VERIFIED: Node.js docs] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Transformers.js | Ollama / llama.cpp | Higher setup complexity (external binary); IPC overhead vs. in-process memory. |
| In-process | Sidecar Process | Better resource isolation but breaks the "zero-config" local-first goal. |

**Installation:**
```bash
# Transformers.js v4 (WebGPU support)
npm install @huggingface/transformers
```

## Architecture Patterns

### Background Indexing Flow
1. **Queue:** File changes trigger an enrichment task in a persistent queue.
2. **Worker:** A dedicated Worker Thread pulls tasks to avoid blocking the MCP server.
3. **Inference:** Worker uses Transformers.js + WebGPU to generate metadata.
4. **Storage:** Results are written back to the SQLite Knowledge Graph as attributes.

### Recommended Project Structure
```
src/
├── core/
│   └── engine/
│       └── enrichment/
│           ├── worker.ts       # Inference logic (Worker Thread)
│           ├── pool.ts         # Worker pool management
│           └── pipeline.ts     # Orchestration and prompting
```

### Pattern: Non-blocking Worker Pool
```typescript
// src/core/engine/enrichment/worker.ts
import { parentPort } from 'node:worker_threads';
import { pipeline } from '@huggingface/transformers';

const generator = await pipeline('text-generation', 'onnx-community/Qwen2.5-Coder-1.5B-Instruct', {
    device: 'webgpu',
    dtype: 'q4', 
});

parentPort?.on('message', async (task) => {
    const output = await generator(task.prompt, { max_new_tokens: 512 });
    parentPort?.postMessage(output);
});
```

## Enrichment Logic

| Metadata Category | Item | Description | Retrieval Use Case |
|-------------------|------|-------------|--------------------|
| **Functional** | Intent Summary | 1-2 sentence "why" behind the code. | Semantic search on natural language. |
| **Taxonomic** | Conceptual Tags | Keywords like `#auth`, `#retry`, `#api`. | Metadata filtering (Hybrid search). |
| **Structural** | Dependency Map | Local/External imports used. | Context expansion during RAG. |
| **Technical** | Semantic Facts | Inputs, outputs, and exception types. | Direct technical question answering. |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Model Quantization | Custom scripts | `onnx-community` | Pre-quantized models available on Hugging Face Hub. |
| GPU Management | Custom C++ addons | Transformers.js v4 | native WebGPU integration via ONNX Runtime. |
| Job Queue | Complex Redis-based | Simple SQLite table | Maintain local-first, zero-external-dependency requirement. |

## Common Pitfalls

### Pitfall 1: Event Loop Blocking
**What goes wrong:** Calling `pipeline()` or `generator()` in the main thread freezes the MCP server for 500ms-2s.
**How to avoid:** Always wrap inference in a `Worker Thread`.

### Pitfall 2: VRAM Exhaustion
**What goes wrong:** Large models or multiple workers exceed GPU memory.
**How to avoid:** Use 4-bit quantization (`q4`) and limit the worker pool size to 1-2 threads for 1.5B models.

### Pitfall 3: Shader Compilation Latency
**What goes wrong:** The first enrichment task takes 10x longer due to GPU shader compilation.
**How to avoid:** Run a "warm-up" inference during server initialization.

## Code Examples

### Enrichment Prompt
```json
{
  "role": "system",
  "content": "Analyze the following code. Return JSON with: 'summary', 'tags' (list), 'dependencies' (list), and 'intent' (why search for this)."
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| sidecar binary | In-process WebGPU | Feb 2026 | Transformers.js v4 allows native GPU speeds in Node. |
| WASM/CPU | WebGPU | 2025 | 4x-10x speedup for inference on consumer hardware. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Qwen2.5-Coder-1.5B fits in mid-range GPU VRAM (q4) | Pitfalls | Low-end hardware may still struggle. |
| A2 | Node.js 22.x WebGPU is stable enough for production | Summary | Possible driver incompatibilities on Linux. |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | v24.12.0 | — |
| WebGPU | Acceleration | ✓ | (System) | WASM (CPU) |
| SQLite | Storage | ✓ | 3.45+ | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | tsx --test (Node.js built-in) |
| Config file | package.json |
| Quick run command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ENR-01 | Model loads in Worker | Integration | `npm test test/enrichment-load.test.js` | ❌ Wave 0 |
| ENR-02 | Metadata written to DB | Integration | `npm test test/enrichment-storage.test.js` | ❌ Wave 0 |

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Validate LLM JSON output with Zod before storage. |

### Known Threat Patterns for AI/LLM

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Prompt Injection | Spoofing | Treat LLM output as untrusted; validate structure. |
| Resource Exhaustion | Denial of Service | Rate-limit enrichment; cap worker pool memory. |

## Sources

### Primary (HIGH confidence)
- Transformers.js v4 Announcement - WebGPU support details.
- Hugging Face Model Hub - `onnx-community/Qwen2.5-Coder-1.5B-Instruct` specs.
- Node.js Documentation - Worker Threads and SharedArrayBuffer.

### Secondary (MEDIUM confidence)
- Community benchmarks for Qwen2.5-Coder on WebGPU.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - v4 is current and documented.
- Architecture: HIGH - Worker Threads are standard for CPU/GPU offloading.
- Pitfalls: MEDIUM - Real-world VRAM behavior varies by GPU vendor.

**Research date:** 2026-04-28
**Valid until:** 2026-05-28
