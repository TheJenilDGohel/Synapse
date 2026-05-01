import React from 'react';
import { BentoGrid, BentoGridItem } from './ui/bento-grid';
import { Search, Database, Brain, Lock } from 'lucide-react';

export function NeuralEngine() {
  return (
    <BentoGrid className="max-w-4xl mx-auto my-12">
      <BentoGridItem
        title="Semantic Code Search"
        description="Hybrid BM25 and Vector search with AST-aware chunking for high-precision retrieval."
        header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-teal-500/20 to-zinc-900 border border-teal-500/10" />}
        icon={<Search className="h-4 w-4 text-teal-400" />}
        className="md:col-span-2"
      />
      <BentoGridItem
        title="Local-First"
        description="Zero telemetry. Total privacy."
        header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-900 border border-white/5" />}
        icon={<Lock className="h-4 w-4 text-zinc-400" />}
      />
      <BentoGridItem
        title="Temporal Graph"
        description="Facts that evolve over time."
        header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-purple-500/20 to-zinc-900 border border-purple-500/10" />}
        icon={<Database className="h-4 w-4 text-purple-400" />}
      />
      <BentoGridItem
        title="Persistent Memory"
        description="Cross-session recall with semantic deduplication."
        header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-blue-500/20 to-zinc-900 border border-blue-500/10" />}
        icon={<Brain className="h-4 w-4 text-blue-400" />}
        className="md:col-span-2"
      />
    </BentoGrid>
  );
}
