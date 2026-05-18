# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest (npm `latest` tag) | Yes |
| beta (npm `beta` tag) | Best effort |
| older | No |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report vulnerabilities privately via [GitHub Security Advisories](https://github.com/TheJenilDGohel/loci/security/advisories/new).

Include:
- A description of the vulnerability and its potential impact
- Steps to reproduce
- Any suggested fix (optional)

You will receive a response within 7 days. If the issue is confirmed, a fix will be released as soon as possible and you will be credited in the release notes (unless you prefer to remain anonymous).

## Scope

Loci MCP is a **read-only** local tool — it does not transmit data externally and holds no credentials. The primary attack surface is:

- Path traversal outside configured roots
- Command injection via search parameters passed to ripgrep
- Unsafe handling of untrusted file content during indexing
