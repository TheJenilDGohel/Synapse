import React from 'react';
import { BentoGrid, BentoGridItem } from './ui/bento-grid';
import { Search, Database, Brain, Lock, Code, Cpu, Network, History, FileCode, Zap } from 'lucide-react';

export function CodeIntelligenceHighlights() {
  return (
    <BentoGrid className="my-8">
      <BentoGridItem
        title="Hybrid Search"
        description="Fused BM25 and Vector search for identifying symbols by name or concept."
        header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-teal-500/10 to-zinc-900" />}
        icon={<Search className="h-4 w-4 text-teal-400" />}
      />
      <BentoGridItem
        title="AST-Aware"
        description="Native Tree-sitter integration for structure-aware code chunking."
        header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-blue-500/10 to-zinc-900" />}
        icon={<Code className="h-4 w-4 text-blue-400" />}
      />
      <BentoGridItem
        title="Symbol Navigation"
        description="High-fidelity definition, usage, and caller tracking across your workspace."
        header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-900" />}
        icon={<FileCode className="h-4 w-4 text-zinc-400" />}
      />
    </BentoGrid>
  );
}

export function KnowledgeGraphHighlights() {
  return (
    <BentoGrid className="my-8">
      <BentoGridItem
        title="Temporal Triples"
        description="Versioned facts that track architectural decisions over time."
        header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-purple-500/10 to-zinc-900" />}
        icon={<History className="h-4 w-4 text-purple-400" />}
      />
      <BentoGridItem
        title="Multi-Hop Traversal"
        description="Discover hidden relationships and cross-cutting dependencies."
        header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-900" />}
        icon={<Network className="h-4 w-4 text-zinc-400" />}
      />
      <BentoGridItem
        title="Time-Travel Queries"
        description="Query the state of your project knowledge at any point in history."
        header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-teal-500/10 to-zinc-900" />}
        icon={<Zap className="h-4 w-4 text-teal-400" />}
      />
    </BentoGrid>
  );
}

export function AiMemoryHighlights() {
  return (
    <BentoGrid className="my-8">
      <BentoGridItem
        title="Cross-Session Recall"
        description="Agents remember past successes and failures across sessions."
        header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-blue-500/10 to-zinc-900" />}
        icon={<Brain className="h-4 w-4 text-blue-400" />}
      />
      <BentoGridItem
        title="Semantic Dedup"
        description="Smart merging of redundant information to keep the context window lean."
        header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-900" />}
        icon={<Cpu className="h-4 w-4 text-zinc-400" />}
      />
      <BentoGridItem
        title="Nest Isolation"
        description="Keep memories scoped to specific projects, teams, or agents."
        header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-purple-500/10 to-zinc-900" />}
        icon={<Lock className="h-4 w-4 text-purple-400" />}
      />
    </BentoGrid>
  );
}
