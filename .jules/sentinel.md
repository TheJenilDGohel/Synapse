## 2024-05-08 - Ripgrep Command Injection Prevention
**Vulnerability:** Command injection via ripgrep's `--pre` flag in `spawnSync`. A user query like `--pre=echo` could execute arbitrary commands if passed directly into ripgrep's argument array.
**Learning:** Even without an active shell in `spawnSync`, CLI tools often parse flags natively and can execute side-effect commands based on those flags. We cannot rely solely on the lack of `shell: true` to prevent command injection when passing untrusted strings.
**Prevention:** Always use the POSIX `--` delimiter to indicate the end of options before passing any user-controlled input (like search queries and paths) as positional arguments to external tools.
