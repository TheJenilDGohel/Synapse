## RESEARCH COMPLETE

## ora v9 API Reference

`ora` v9.3.0 (already in package.json) — elegant terminal spinner with zero additional deps needed.

**Key API:**
```js
import ora from 'ora';
const spinner = ora('Loading…').start();
spinner.succeed('Done!');      // green ✔ + message
spinner.fail('Failed!');       // red ✖ + message
spinner.warn('Warning!');      // yellow ⚠ + message
spinner.info('Info');          // blue ℹ + message
spinner.stop();                // stop without persistence
spinner.text = 'New message';  // update text while spinning
```

**Auto-behavior:**
- `ora` automatically disables animations when `process.stdout.isTTY` is false (piped/CI output)
- Uses `yoctocolors` internally which honors `NO_COLOR` env var automatically
- In non-TTY mode, `spinner.succeed()` still prints the final message (no animation)
- `ora({ isEnabled: false })` fully disables it programmatically

**Constructor options:**
```ts
ora({
  text: 'Starting...',
  prefixText: '',       // text before spinner
  spinner: 'dots',      // animation style (dots, line, arc, etc.)
  color: 'cyan',        // spinner color
  indent: 2,            // indent spaces
  stream: process.stderr  // default stderr
})
```

## ANSI Color Escape Codes (16-color)

Standard 16-color codes — zero deps, maximum terminal compatibility.

```
Format: \x1b[{code}m{text}\x1b[0m

Foreground colors:
  30 = Black     90 = Bright Black (gray)
  31 = Red       91 = Bright Red
  32 = Green     92 = Bright Green
  33 = Yellow    93 = Bright Yellow
  34 = Blue      94 = Bright Blue
  35 = Magenta   95 = Bright Magenta
  36 = Cyan      96 = Bright Cyan
  37 = White     97 = Bright White

Styles:
   0 = Reset
   1 = Bold
   2 = Dim
   4 = Underline

Examples:
  \x1b[32m✓ OK\x1b[0m       → green check
  \x1b[31m✗ FAIL\x1b[0m     → red fail
  \x1b[33m⚠ WARN\x1b[0m     → yellow warning
  \x1b[36mℹ info\x1b[0m     → cyan info
  \x1b[1mBold\x1b[0m         → bold text
  \x1b[2mDim\x1b[0m          → dimmed text
```

## NO_COLOR Spec Implementation

**Spec:** https://no-color.org — "When set, callers should not add ANSI color escape codes to output."

**Rules:**
1. Check `process.env.NO_COLOR` — if it exists (even as empty string), disable color
2. Also disable when `process.stdout.isTTY` is falsy (piped, redirected, CI without TTY)
3. `ora` + `yoctocolors` handle this automatically for spinner output

**Implementation pattern for `src/cli/ansi.ts`:**
```typescript
const isColorEnabled = (): boolean =>
  process.stdout.isTTY === true &&
  process.env.NO_COLOR === undefined;
```

**Note:** The spec says presence of `NO_COLOR` (any value including empty string) means no color. However, convention is empty string is also treated as no-color. Implementation: `NO_COLOR !== undefined` is the strictest correct check.

## TTY Detection

```typescript
// Interactive terminal
const isTTY = process.stdout.isTTY === true;

// What to do in non-TTY:
// - Skip spinners (ora handles this automatically)
// - Use ASCII instead of Unicode box-drawing
// - Skip ANSI escape codes (handled by isColorEnabled())
// - Plain text output only

// ASCII fallback map:
// ─ → -    │ → |    ╔ → +    ╗ → +    ╚ → +    ╝ → +
// ✓ → OK   ✗ → FAIL  ⚠ → WARN  ℹ → INFO  ◆ → *
```

## TypeScript Module Architecture

**Location:** `src/cli/ansi.ts` → compiled to `dist/cli/ansi.js`
**Import in scripts:** `import { c, box, symbol, bar } from '../../src/cli/ansi.js'`

**Recommended structure:**
```typescript
// src/cli/ansi.ts

const enabled = (): boolean =>
  process.stdout.isTTY === true && process.env.NO_COLOR === undefined;

// Color functions — return plain string when disabled
export const c = {
  green:  (s: string) => enabled() ? `\x1b[32m${s}\x1b[0m` : s,
  red:    (s: string) => enabled() ? `\x1b[31m${s}\x1b[0m` : s,
  yellow: (s: string) => enabled() ? `\x1b[33m${s}\x1b[0m` : s,
  cyan:   (s: string) => enabled() ? `\x1b[36m${s}\x1b[0m` : s,
  bold:   (s: string) => enabled() ? `\x1b[1m${s}\x1b[0m` : s,
  dim:    (s: string) => enabled() ? `\x1b[2m${s}\x1b[0m` : s,
  gray:   (s: string) => enabled() ? `\x1b[90m${s}\x1b[0m` : s,
};

// Status symbols
export const symbol = {
  ok:   () => enabled() ? c.green('✓') : 'OK',
  fail: () => enabled() ? c.red('✗')  : 'FAIL',
  warn: () => enabled() ? c.yellow('⚠') : 'WARN',
  info: () => enabled() ? c.cyan('ℹ')  : 'INFO',
};

// Box drawing for summary panels
export const box = {
  top:    (w = 62) => enabled() ? `╔${'═'.repeat(w)}╗` : `+${'-'.repeat(w)}+`,
  bottom: (w = 62) => enabled() ? `╚${'═'.repeat(w)}╝` : `+${'-'.repeat(w)}+`,
  row:    (text: string, w = 62) => {
    const pad = w - text.length;
    return enabled()
      ? `║  ${text}${' '.repeat(Math.max(0, pad - 2))}║`
      : `|  ${text}${' '.repeat(Math.max(0, pad - 2))}|`;
  },
  divider: (w = 62) => enabled() ? `║${'─'.repeat(w)}║` : `|${'-'.repeat(w)}|`,
};

// Progress/health bar
export const bar = (filled: number, total: number, width = 20): string => {
  const pct = Math.round((filled / total) * width);
  if (enabled()) {
    return `${'█'.repeat(pct)}${'░'.repeat(width - pct)} ${filled}/${total}`;
  }
  return `[${'#'.repeat(pct)}${'.'.repeat(width - pct)}] ${filled}/${total}`;
};
```

## Script Refactor Map

### `scripts/runtime/setup-synapse.mjs` (685 lines)

**Target functions to refactor:**
- `runPreflightChecks()` → wrap with spinner, show errors in styled box
- `printSuccess()` → replace 15+ `console.log` calls with structured summary box
- `warmupModels()` → wrap each model warmup with `ora` spinner
- `main()` → add top-level spinner for overall progress

**Key changes:**
```js
// Before
console.log(`Saved root config: ${configPath}`);
// After
console.log(`  ${symbol.ok()} Root config: ${c.dim(configPath)}`);

// Before (errors)
console.error(`[preflight:error] ${err}`);
// After
console.log(box.top()); console.log(box.row(c.red('Setup Failed'))); /* ... */
```

**--verbose flag:** Hide model download paths and SDK details by default; show with `--verbose`.

### `scripts/runtime/doctor-synapse.mjs` (387 lines)

**Target functions:**
- `printText(results)` → replace `[OK]`/`[FAIL]` with colored `✓`/`✗`
- Add `bar()` health summary at end

**Key changes:**
```js
// Before
const mark = r.ok ? 'OK' : 'FAIL';
console.log(`[${mark}] ${r.id}: ${r.detail}`);
// After
const mark = r.ok ? symbol.ok() : symbol.fail();
console.log(`${mark} ${c.bold(r.id)}: ${r.detail}`);
if (!r.ok && r.fix) console.log(`   ${c.yellow('→')} ${r.fix}`);
```

**JSON mode:** `if (asJson)` branch stays completely unchanged — no color codes in JSON output.

### `scripts/runtime/upgrade-synapse.mjs`

- Add `ora` spinner during npm update check
- Style upgrade available/not-available messages with colors

### `scripts/memory/task-context-synapse.mjs`

- Style header output with box
- Color key info (project path, branch, etc.)

### `scripts/memory/capture-outcome-synapse.mjs`

- Style success/error output with symbols and color

## Test Strategy

**Unit tests for `src/cli/ansi.ts`:**
```typescript
// test/cli/ansi.test.ts
describe('when NO_COLOR is set', () => {
  it('returns plain text without escape codes', () => {
    process.env.NO_COLOR = '1';
    expect(c.green('hello')).toBe('hello');
    delete process.env.NO_COLOR;
  });
});
describe('when not TTY', () => {
  it('symbol.ok() returns "OK" not unicode', () => {
    // mock process.stdout.isTTY = undefined
    expect(symbol.ok()).toBe('OK');
  });
});
```

**Integration approach:**
- Manual visual check: `node scripts/runtime/doctor-synapse.mjs` in terminal
- Pipe test: `node scripts/runtime/doctor-synapse.mjs | cat` — verify no escape codes
- CI: `NO_COLOR=1 node scripts/runtime/doctor-synapse.mjs` — verify plain output
- JSON unchanged: `node scripts/runtime/doctor-synapse.mjs --json | jq .ok`

## Implementation Guidance

**Key decisions for planner:**

1. **Plan 1: `src/cli/ansi.ts`** — Create the shared module with `c`, `symbol`, `box`, `bar` exports. Add unit tests. This is the foundation everything else depends on.

2. **Plan 2: Refactor scripts** — Upgrade all 5 scripts to use `ansi.ts`. Doctor gets health bar. Setup gets spinners + summary box. All get colored symbols.

3. **Single wave is fine** — Plan 1 (foundation) must precede Plan 2 (consumers). Two sequential plans, not parallel.

4. **Import path:** Scripts use `../../src/cli/ansi.js` (compiled JS, not TS directly). The TypeScript source in `src/cli/ansi.ts` is compiled by `tsc` to `dist/cli/ansi.js`. But scripts import from `src/` not `dist/` — check existing import patterns in scripts (they import from `../../src/runtime/index.js`). Follow same pattern.

5. **GEMINI.md / CLAUDE.md check required** — Read project-level instructions before writing any code.
