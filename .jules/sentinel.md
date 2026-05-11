## 2024-05-24 - [CRITICAL] Command Injection Risk via ripgrep Arguments
**Vulnerability:** In `lexical-search.ts`, `spawnSync` was used to execute `ripgrep` (`rg`) with user-provided arguments (`query`, `base`) directly as trailing positional arguments without a `--` separator. If a user provided a query or path starting with `-`, `ripgrep` would interpret it as an executable flag instead of a search pattern/path.
**Learning:** Even well-known tools like `ripgrep` are vulnerable to command injection/flag hijacking if the distinction between options and positional arguments isn't strictly enforced when spawning shell processes with user inputs.
**Prevention:** Always prepend a double dash (`--`) before any user-controlled input array passed to CLI tools in `spawn`/`spawnSync` that could potentially be interpreted as options or flags.

## 2026-05-10 - [CRITICAL] Ripgrep Command Argument Injection
**Vulnerability:** Found a critical command argument injection vulnerability where user-controlled inputs (`query` and `base`) were passed directly to `spawnSync` executing ripgrep (`rg`) without a `--` separator. This allows attackers to execute arbitrary commands or manipulate ripgrep behavior by injecting flags like `--pre`.
**Learning:** Even when using `spawnSync` instead of shell execution, argument injection is still possible if user inputs can be interpreted as flags by the underlying tool. This is particularly dangerous for tools that support executing other programs (like ripgrep's `--pre` flag).
**Prevention:** Always prepend user-controlled arguments with the `--` delimiter when using `spawn` or `spawnSync` with CLI tools to ensure they are strictly treated as positional arguments and not as executable flags.
