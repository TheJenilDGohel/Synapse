# Security Policy

## Supported Versions

We provide security updates for the following versions:

| Version | Supported |
|---------|-----------|
| Latest (npm `latest` tag) | ✅ Yes |
| Beta (npm `beta` tag) | ⚠️ Best effort |
| < 2026.05.1 | ❌ No |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report vulnerabilities privately via [GitHub Security Advisories](https://github.com/TheJenilDGohel/Synapse/security/advisories/new).

### Our Commitment
- **Acknowledgment**: Within 48 hours.
- **Initial Triage**: Within 5 business days.
- **Remediation**: We aim to release a patch within 14 days for confirmed critical vulnerabilities.

### Required Information
- A description of the vulnerability and its potential impact.
- Steps to reproduce or a proof-of-concept (PoC).
- Any suggested fix (optional).

## Security Architecture

Synapse is a **local-first** tool. It holds no credentials and makes no outbound network requests during runtime. 
The primary attack surfaces monitored are:
1. **Path Traversal**: Prevention of access to files outside configured root directories.
2. **Command Injection**: Sanitization of inputs passed to the underlying `ripgrep` binary.
3. **Malicious Content**: Safe handling of untrusted file content during the indexing and AST parsing phases.
