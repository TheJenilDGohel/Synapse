# Phase 47 User Setup Guide

The following external services require configuration before Phase 47 features will work.

## npm

**Why:** OIDC trusted publishing for npm

### Dashboard Configuration
Follow these steps in the service dashboard:

- [ ] **Configure trusted publisher for synapse-mcp package**
  - Location: `https://www.npmjs.com/package/synapse-mcp/access -> Trusted Publishers -> Add -> org=wmt-mobile, repo=synapse, workflow=release.yml`

This setup is required for the automated release workflow to push packages securely.
