# Deferred Items — quick-260409-o8i

Out-of-scope issues discovered during execution. Not fixed because they are
unrelated to the plan (Markdown-only frontmatter edits in
`skills/synapse-mcp/commands/`) and pre-existed on HEAD~2.

## Pre-existing ESLint errors (`npm run lint`)

Ran lint during Task 3 verification. Found 6 errors in files outside this
plan's scope — all .js files (not the .md command manifests this plan touches):

- `bin/_shared.js:34:9` — `'script' is assigned a value but never used` (no-unused-vars)
- `dist/cli/commands/mcp.js:171:13` — `The value assigned to 'snippetData' is not used` (no-useless-assignment)
- `dist/cli/commands/onboard.js:264:27` — `'_args' is defined but never used` (no-unused-vars)
- `dist/cli/commands/onboard.js:264:34` — `'_opts' is defined but never used` (no-unused-vars)
- `dist/cli/router.js:9:1` — `Definition for rule '@typescript-eslint/ban-ts-comment' was not found`
- `dist/mcp/common/response-normalizers.js:1:1` — `Definition for rule '@typescript-eslint/no-explicit-any' was not found`

Note: ESLint is also scanning `dist/` (generated output) which is likely a
lint-config oversight — `dist/` should probably be in `.eslintignore`. That
is also out of scope for this plan.

These pre-existed before commit `0ad9ba0` (this plan's first commit) and are
unrelated to the MCP tool pre-approval work. Flag for a future cleanup quick
task.
