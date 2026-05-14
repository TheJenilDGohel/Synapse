import { z } from 'zod';
import { createToolResponse, READ_ONLY_ANNOTATIONS } from '../../common/tool-utils.js';
import type { RegisterJsonToolFn } from '../../common/tool-utils.js';
import { BUNDLE_RESULT_SCHEMA } from '../../common/schemas.js';
import type { IWorkspaceService } from '../../../../core/interfaces/services.js';
import { McpResponseMapper } from '../../utils/response-mapper.js';
import { generatePageIndexTree } from './generator.js';
import fs from 'node:fs';

export interface RegisterPageIndexToolsOptions {
  registerJsonTool: RegisterJsonToolFn;
  workspace: IWorkspaceService;
}

export function registerPageIndexTools({
  registerJsonTool,
  workspace
}: RegisterPageIndexToolsOptions): void {
  registerJsonTool(
    'synapse_pageindex_tree',
    {
      title: 'PageIndex Tree',
      description: 'Generates a hierarchical TOC-style semantic tree (PageIndex) for a given text or markdown file, allowing LLMs to reason about the document structure before reading specific chunks. Returns the tree with node IDs and summaries.',
      inputSchema: {
        file_path: z.string(),
        max_depth: z.number().int().min(1).max(6).default(3)
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: BUNDLE_RESULT_SCHEMA
    },
    async ({ file_path, max_depth }: Record<string, unknown>) => {
      const absPath = workspace.normalizeTarget(file_path as string);
      const text = workspace.safeReadText(absPath);

      const tree = generatePageIndexTree(text, max_depth as number);

      return McpResponseMapper.standardizeResponse({
        type: 'bundle',
        bundle_type: 'pageindex_tree',
        tree,
        metadata: {
          file_path: absPath,
          total_nodes: calculateNodes(tree)
        }
      });
    }
  );

  registerJsonTool(
    'synapse_pageindex_read_node',
    {
      title: 'PageIndex Read Node',
      description: 'Reads the specific content of a node from the generated PageIndex tree using the node_id.',
      inputSchema: {
        file_path: z.string(),
        node_id: z.string()
      },
      annotations: READ_ONLY_ANNOTATIONS,
      outputSchema: BUNDLE_RESULT_SCHEMA
    },
    async ({ file_path, node_id }: Record<string, unknown>) => {
      const absPath = workspace.normalizeTarget(file_path as string);
      const text = workspace.safeReadText(absPath);

      // We regenerate the tree to find the node's line offsets
      // (In a production system, this tree would be cached/persisted)
      const tree = generatePageIndexTree(text, 6);
      const node = findNodeById(tree, node_id as string);

      if (!node) {
         throw new Error(`Node ID ${node_id} not found in ${file_path}`);
      }

      const chunk = await workspace.readFileChunk(absPath, node.start_line, node.end_line, 2000, 'lines');

      return McpResponseMapper.standardizeResponse({
        type: 'bundle',
        bundle_type: 'pageindex_node',
        node_info: {
          id: node.node_id,
          title: node.title,
          start_line: node.start_line,
          end_line: node.end_line
        },
        content: chunk
      });
    }
  );
}

function calculateNodes(nodes: any[]): number {
  let count = 0;
  for (const node of nodes) {
    count++;
    if (node.nodes && node.nodes.length > 0) {
      count += calculateNodes(node.nodes);
    }
  }
  return count;
}

function findNodeById(nodes: any[], id: string): any | null {
  for (const node of nodes) {
    if (node.node_id === id) return node;
    if (node.nodes && node.nodes.length > 0) {
      const found = findNodeById(node.nodes, id);
      if (found) return found;
    }
  }
  return null;
}
