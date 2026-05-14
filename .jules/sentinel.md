## 2024-05-24 - [CRITICAL] Command Injection Risk via ripgrep Arguments
**Vulnerability:** In `lexical-search.ts`, `spawnSync` was used to execute `ripgrep` (`rg`) with user-provided arguments (`query`, `base`) directly as trailing positional arguments without a `--` separator. If a user provided a query or path starting with `-`, `ripgrep` would interpret it as an executable flag instead of a search pattern/path.
**Learning:** Even well-known tools like `ripgrep` are vulnerable to command injection/flag hijacking if the distinction between options and positional arguments isn't strictly enforced when spawning shell processes with user inputs.
**Prevention:** Always prepend a double dash (`--`) before any user-controlled input array passed to CLI tools in `spawn`/`spawnSync` that could potentially be interpreted as options or flags.

## 2026-05-10 - [CRITICAL] Ripgrep Command Argument Injection
**Vulnerability:** Found a critical command argument injection vulnerability where user-controlled inputs (`query` and `base`) were passed directly to `spawnSync` executing ripgrep (`rg`) without a `--` separator. This allows attackers to execute arbitrary commands or manipulate ripgrep behavior by injecting flags like `--pre`.
**Learning:** Even when using `spawnSync` instead of shell execution, argument injection is still possible if user inputs can be interpreted as flags by the underlying tool. This is particularly dangerous for tools that support executing other programs (like ripgrep's `--pre` flag).
**Prevention:** Always prepend user-controlled arguments with the `--` delimiter when using `spawn` or `spawnSync` with CLI tools to ensure they are strictly treated as positional arguments and not as executable flags.

## 2024-05-24 - [CRITICAL] Command Injection Risk via Shell Execution
**Vulnerability:** The Claude Code hooks (`scripts/hooks/synapse-pre-tool.cjs` and `scripts/hooks/synapse-post-tool.cjs`) passed user-provided data directly to `spawnSync` executing `synapse.cmd` with `shell: true` (via `shell: IS_WINDOWS`) on Windows. This allowed command injection if user input contained shell metacharacters like `&` or `|`.
**Learning:** `spawnSync` with `.cmd` files on Windows requires a shell by default, but passing user input to a shell command makes it vulnerable to injection. To fix this without breaking `.cmd` execution, we must resolve the path to the original JavaScript file and execute it with `process.execPath` (Node) with `shell: false`.
**Prevention:** Never use `shell: true` or `shell: IS_WINDOWS` with `spawn` or `spawnSync` when user input is present. Always resolve the path to the JS entry point and execute via `process.execPath` instead of relying on `.cmd` shims.
