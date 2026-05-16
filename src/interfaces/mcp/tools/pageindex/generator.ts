// A simplified generator that mimics PageIndex by using Markdown headers
// For a production system, this could use an LLM or AST to structure non-markdown files.

export interface PageIndexNode {
  title: string;
  node_id: string;
  start_line: number;
  end_line: number;
  summary?: string;
  nodes: PageIndexNode[];
}

export function generatePageIndexTree(text: string, maxDepth: number): PageIndexNode[] {
  const lines = text.split(/\r?\n/);

  // Minimal Markdown header parser
  const rootNodes: PageIndexNode[] = [];
  const stack: { level: number; node: PageIndexNode }[] = [];

  let nodeIdCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.*)$/);
    if (match) {
      const level = match[1].length;
      if (level > maxDepth) continue;

      const title = match[2].trim();
      const node: PageIndexNode = {
        title,
        node_id: String(nodeIdCounter++).padStart(4, '0'),
        start_line: i + 1,
        end_line: i + 1, // Will be updated
        nodes: []
      };

      // Close previous node's end_line
      if (stack.length > 0) {
          // Update the immediate previous node (which might be parent or sibling)
          // We'll just update all nodes in the stack up to root
          for(const s of stack) {
             s.node.end_line = i;
          }
      }

      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      if (stack.length === 0) {
        rootNodes.push(node);
      } else {
        stack[stack.length - 1].node.nodes.push(node);
      }

      stack.push({ level, node });
    }
  }

  // Close final end_lines
  for(const s of stack) {
     s.node.end_line = lines.length;
  }

  // Generate simplistic summaries (first non-empty line after header)
  const summarize = (node: PageIndexNode) => {
      let summary = "";
      for (let j = node.start_line; j < Math.min(node.start_line + 5, node.end_line); j++) {
          const l = lines[j]?.trim();
          if (l && !l.startsWith('#')) {
              summary = l.substring(0, 100) + (l.length > 100 ? "..." : "");
              break;
          }
      }
      node.summary = summary || "(No summary available)";
      node.nodes.forEach(summarize);
  };

  rootNodes.forEach(summarize);

  return rootNodes;
}
