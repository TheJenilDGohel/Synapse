# [BUG] Phase 7: Unicode and huge payloads bypass validations but cause validation errors rather than clean rejections

## Environment
- OS: Linux
- Node: v22.22.1
- npm: 11.11.0
- synapse-cortex version: 2026.05.5-beta.0
- AI Client: Stdio MCP client
- ripgrep available: yes

## Steps to Reproduce
1. Send a 50,000 character string or an empty string to synapse_memory_manage store action.

## Expected Behavior
The system should gracefully handle or truncate large payloads and reject empty strings with a friendly error.

## Actual Behavior
Empty strings and massive payloads fail schema validation (e.g. String must contain at least 1 character(s)), returning a raw validation stack trace to the AI rather than a clean domain-specific error.

## Severity
- [ ] Crash / data loss
- [ ] Silent wrong behavior
- [x] Poor error message
- [ ] Performance
- [ ] Documentation gap

## Reproduction Rate
- [x] Always
- [ ] Sometimes
- [ ] Once
