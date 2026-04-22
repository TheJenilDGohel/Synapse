# Synapse Docs

This is a Docusaurus site for Synapse MCP.

## Development

```bash
cd synapse-docs
npm install
npm run start
```

## Production build

```bash
cd synapse-docs
npm run build
npm run serve
```

## Deployment

This site is configured for GitHub Pages deployment on the `wmt-mobile/synapse` repository.

Automatic deploy:
- GitHub Actions workflow: `.github/workflows/docs.yml`
- Trigger: push to `main` when files under `synapse-docs/` change
- Target URL: `https://wmt-mobile.github.io/synapse/`

Repository setting required:
- In GitHub, set `Settings -> Pages -> Source` to `GitHub Actions`

Manual deploy option:

```bash
cd synapse-docs
npm run deploy
```

Adjust `url` and `baseUrl` in `docusaurus.config.ts` if you deploy somewhere else.
