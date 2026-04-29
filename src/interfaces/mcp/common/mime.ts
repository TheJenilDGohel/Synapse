// Phase 41 (RLINK-01..03) — MCP resource_link helpers.
// Per MCP 2025-06-18 spec: tools MAY return resource_link content blocks
// alongside text content so clients can dereference files via file:// URIs.
// See ResourceLinkSchema at @modelcontextprotocol/sdk types.d.ts:2007-2033.

import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Canonical resource_link content block — strict subset of the MCP SDK
 * ResourceLinkSchema. We intentionally omit size, icons, annotations, _meta,
 * and title; they add zero Phase 41 value and bloat the wire format.
 */
export interface ResourceLink {
  type: 'resource_link';
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * Extension -> MIME type lookup. Covers the 16 extensions enumerated in
 * 41-CONTEXT.md decisions. Unknown extensions return undefined so the caller
 * can omit the optional mimeType field per spec.
 */
const EXT_TO_MIME: Readonly<Record<string, string>> = Object.freeze({
  '.ts':   'text/typescript',
  '.tsx':  'text/typescript',
  '.js':   'text/javascript',
  '.jsx':  'text/javascript',
  '.mjs':  'text/javascript',
  '.cjs':  'text/javascript',
  '.json': 'application/json',
  '.md':   'text/markdown',
  '.yaml': 'text/yaml',
  '.yml':  'text/yaml',
  '.toml': 'text/toml',
  '.py':   'text/x-python',
  '.go':   'text/x-go',
  '.rs':   'text/x-rust',
  '.html': 'text/html',
  '.css':  'text/css',
  '.txt':  'text/plain'
});

/**
 * Map a file path to its MIME type by extension. Returns undefined when the
 * extension is not in the lookup table; callers should omit the mimeType
 * field on the resource_link in that case.
 */
export function getMimeTypeFromPath(absPath: string): string | undefined {
  if (!absPath || typeof absPath !== 'string') return undefined;
  const ext = path.extname(absPath).toLowerCase();
  if (!ext) return undefined;
  return EXT_TO_MIME[ext];
}

/**
 * Build a single resource_link content block from an absolute file path.
 * path.resolve guarantees absolute form. RLINK-01 per MCP 2025-06-18 spec —
 * emitted alongside text content so clients without resource-link support
 * keep working (RLINK-03 fallback).
 *
 * URI note: We use `pathToFileURL` so Windows paths are converted to the
 * RFC 8089-compliant form (`file:///C:/tmp/...`) instead of the prior
 * `file://C:\...` which VS Code tolerates but other MCP clients reject.
 * On POSIX the output is identical to the old `file://${resolved}` form.
 */
export function buildResourceLink(absPath: string, description?: string): ResourceLink {
  const resolved = path.resolve(absPath);
  const link: ResourceLink = {
    type: 'resource_link',
    uri: pathToFileURL(resolved).href,
    name: path.basename(resolved)
  };
  if (description) link.description = description;
  const mimeType = getMimeTypeFromPath(resolved);
  if (mimeType) link.mimeType = mimeType;
  return link;
}
