import { z } from 'zod';

export enum ToolLevel {
  CORE = 0,      // Always loaded
  ADVANCED = 1,  // Loaded on demand / Discovery
}

export interface ToolRegistryEntry {
  name: string;
  definition: any;
  handler: any;
  level: ToolLevel;
  category: string;
}

class ToolRegistry {
  private entries: Map<string, ToolRegistryEntry> = new Map();
  private activeTools: Set<string> = new Set();

  register(entry: ToolRegistryEntry) {
    this.entries.set(entry.name, entry);
  }

  getEntry(name: string) {
    return this.entries.get(name);
  }

  getAllEntries() {
    return Array.from(this.entries.values());
  }

  activate(name: string) {
    this.activeTools.add(name);
  }

  isActive(name: string) {
    return this.activeTools.has(name);
  }

  getCoreTools() {
    return this.getAllEntries().filter(e => e.level === ToolLevel.CORE);
  }
}

export const toolRegistry = new ToolRegistry();
