import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import type { ResourceLink } from './mime.js';

/**
 * Collapses repetitive lines in a text block to save context tokens.
 * Useful for progress bars, redundant log lines, etc.
 */
export function collapseRepetitiveLines(text: string): string {
  const lines = text.split(/\r?\n/);
  if (lines.length < 5) return text;

  const result: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      result.push(line);
      i++;
      continue;
    }

    let count = 1;
    while (i + count < lines.length && lines[i + count] === line) {
      count++;
    }

    if (count > 3) {
      result.push(line);
      result.push(`[... repeated ${count - 1} more times ...]`);
      i += count;
    } else {
      result.push(line);
      i++;
    }
  }
  return result.join('\n');
}

export interface TeeOptions {
  synapseHome: string;
  maxChars?: number;
}

/**
 * Truncates large output and saves the full version to a local log file.
 * Returns a resource link to the full output.
 */
export function teeLargeOutput(
  text: string,
  options: TeeOptions
): { content: string; resourceLink?: ResourceLink } {
  const maxChars = options.maxChars || 12000; // ~4000-6000 tokens default
  
  if (text.length <= maxChars) {
    return { content: text };
  }

  const logDir = path.join(options.synapseHome, 'logs', 'raw-output');
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const hash = crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
    const logFile = `output-${Date.now()}-${hash}.log`;
    const logPath = path.join(logDir, logFile);

    fs.writeFileSync(logPath, text, 'utf8');

    // Keep head and tail
    const headSize = Math.floor(maxChars * 0.4);
    const tailSize = Math.floor(maxChars * 0.4);
    
    const head = text.slice(0, headSize);
    const tail = text.slice(-tailSize);

    const content = `${head}\n\n[... ${text.length - head.length - tail.length} characters truncated ...]\n\n${tail}`;

    return {
      content,
      resourceLink: {
        type: 'resource_link',
        uri: pathToFileURL(logPath).href,
        name: logFile,
        description: 'Full raw output'
      }
    };
  } catch (err) {
    console.error('Failed to tee large output:', err);
    // Fallback to simple truncation without resource link
    const head = text.slice(0, Math.floor(maxChars / 2));
    const tail = text.slice(-Math.floor(maxChars / 2));
    return {
      content: `${head}\n\n[... truncated due to size and tee failure ...]\n\n${tail}`
    };
  }
}
