// src/cli/ansi.ts
// Shared ANSI terminal utility for Synapse CLI scripts.
// All color/symbol/box output is guarded by NO_COLOR env var and TTY detection.
// NO new runtime deps — uses built-in ANSI escape codes only.

/**
 * Returns true only when output is an interactive TTY AND NO_COLOR is not set.
 * Per https://no-color.org: any presence of NO_COLOR (even empty string) disables color.
 */
export function isColorEnabled(): boolean {
  return process.stdout.isTTY === true && process.env.NO_COLOR === undefined;
}

/** Legacy alias for backward compatibility */
export const useColor = () => isColorEnabled();

const isTTY = () => process.stdout.isTTY === true;

const esc = (code: number, s: string): string =>
  isColorEnabled() ? `\x1b[${code}m${s}\x1b[0m` : s;

/** Individual color exports for backward compatibility */
export const red     = (s: string) => esc(31, s);
export const green   = (s: string) => esc(32, s);
export const yellow  = (s: string) => esc(33, s);
export const blue    = (s: string) => esc(34, s);
export const magenta = (s: string) => esc(35, s);
export const cyan    = (s: string) => esc(36, s);
export const white   = (s: string) => esc(37, s);
export const gray    = (s: string) => esc(90, s);

export const bold    = (s: string) => esc(1,  s);
export const dim     = (s: string) => esc(2,  s);
export const italic  = (s: string) => esc(3,  s);
export const inverse = (s: string) => esc(7,  s);

/** 
 * Box Drawing Characters and Symbols 
 * Grouped in B for both new and legacy code.
 */
export const B = {
  // Symbols
  check:  '✓',
  circle: '○',
  cross:  '✗',
  arrow:  '→',
  dot:    '•',
  
  // Box paths (Unicode if TTY, ASCII if not)
  get v()  { return isTTY() ? '║' : '|'; },
  get h()  { return isTTY() ? '═' : '-'; },
  get tl() { return isTTY() ? '╔' : '+'; },
  get tr() { return isTTY() ? '╗' : '+'; },
  get bl() { return isTTY() ? '╚' : '+'; },
  get br() { return isTTY() ? '╝' : '+'; },
  get m()  { return isTTY() ? '╟' : '|'; },
  get r()  { return isTTY() ? '╢' : '|'; },
  get d()  { return isTTY() ? '─' : '-'; },
};

/** High-level badge helper */
export const badge = (s: string) => isColorEnabled() ? `\x1b[7m ${s} \x1b[0m` : `[${s}]`;

/** Modern color API (grouped) */
export const c = {
  red, green, yellow, blue, magenta, cyan, white, gray,
  bold, dim, italic, badge,
  inverse: (s: string) => isColorEnabled() ? `\x1b[7m${s}\x1b[27m` : s,
  B: B,
};

/** Status symbols — colored unicode in TTY, plain ASCII fallback. */
export const symbol = {
  ok:      () => isColorEnabled() ? green('✓') : 'OK',
  fail:    () => isColorEnabled() ? red('✗')   : 'FAIL',
  success: () => isColorEnabled() ? green('✓') : 'PASS',
  error:   () => isColorEnabled() ? red('✗')   : 'FAIL',
  warn:    () => isColorEnabled() ? yellow('⚠') : 'WARN',
  info:    () => isColorEnabled() ? cyan('ℹ')   : 'INFO',
};

/** Legacy Box Drawing Functions */
export const boxTop    = (w = 62) => `${B.tl}${B.h.repeat(w)}${B.tr}`;
export const boxBottom = (w = 62) => `${B.bl}${B.h.repeat(w)}${B.br}`;
export const boxEmpty  = (w = 62) => `${B.v}${' '.repeat(w)}${B.v}`;
export const separator = (w = 62) => `${B.m}${B.d.repeat(w)}${B.r}`;

export const boxLine = (text = '', w = 62) => {
  const inner = w - 2; // 2 spaces padding
  const plainText = text.replace(/\x1b\[[0-9;]*m/g, ''); // strip potential ANSI for length calc
  const pad = Math.max(0, inner - plainText.length);
  return `${B.v}  ${text}${' '.repeat(pad)}${B.v}`;
};

/**
 * High-level box drawing helper.
 * Wraps multiple lines in a styled box.
 */
export function box(lines: string[], options: { padding?: number; width?: number; color?: (s: string) => string } = {}): string[] {
  const { padding = 0, width, color = (s: string) => s } = options;
  const W = width || Math.max(...lines.map(l => l.replace(/\x1b\[[0-9;]*m/g, '').length)) + (padding * 2) + 4;
  
  const result: string[] = [];
  result.push(color(boxTop(W)));
  
  for (let i = 0; i < padding; i++) result.push(color(boxEmpty(W)));
  
  for (const line of lines) {
    result.push(color(boxLine(line, W)));
  }
  
  for (let i = 0; i < padding; i++) result.push(color(boxEmpty(W)));
  
  result.push(color(boxBottom(W)));
  return result;
}

// Attach helpers to box function for individual parts
Object.assign(box, {
  top: boxTop,
  bottom: boxBottom,
  row: (text: string, w?: number) => boxLine(text, w),
  empty: boxEmpty,
  divider: separator,
});

/** UI Utilities used by Dashboard */

export function truncate(s: string, w: number): string {
  if (s.length <= w) return s;
  return s.slice(0, w - 1) + '…';
}

export function padRight(s: string, w: number): string {
  const plainText = s.replace(/\x1b\[[0-9;]*m/g, '');
  const pad = Math.max(0, w - plainText.length);
  return s + ' '.repeat(pad);
}

export function panel(title: string, content: string[], width: number, colorFn = gray): string[] {
  const innerW = width - 4;
  const lines: string[] = [];
  lines.push(`  ${colorFn(B.tl + ' ' + title + ' ' + B.h.repeat(Math.max(0, width - title.length - 4)) + B.tr)}`);
  for (const line of content) {
    lines.push(`  ${colorFn(B.v)} ${padRight(line, innerW)} ${colorFn(B.v)}`);
  }
  lines.push(`  ${colorFn(B.bl + B.h.repeat(width - 2) + B.br)}`);
  return lines;
}

export function progressBar(ratio: number, width = 20): string {
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * width);
  if (isTTY()) {
    return `${green('█'.repeat(pct))}${gray('░'.repeat(width - pct))}`;
  }
  return `[${'#'.repeat(pct)}${'.'.repeat(width - pct)}]`;
}

/** Progress/health bar for new Phase 46 code (shorter name, unified style) */
export function bar(filled: number, total: number, width = 20): string {
  return progressBar(filled / (total || 1), width) + ` ${filled}/${total}`;
}

/** Horizontal rule with optional centered label. */
export function rule(text?: string, width = 55): string {
  const dash = B.d;
  if (!text) return dash.repeat(width);
  const label = ` ${text} `;
  const sides = Math.max(0, width - label.length);
  const left = Math.floor(sides / 2);
  const right = sides - left;
  return `${dash.repeat(left)}${label}${dash.repeat(right)}`;
}
