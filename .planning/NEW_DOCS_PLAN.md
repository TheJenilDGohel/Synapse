# Synapse: New Documentation Strategy (Firebase Optimized)

## 1. Objective
Build a high-performance, developer-centric documentation site for Synapse that is optimized for **Firebase Hosting** (free tier). The goal is to provide a seamless "getting started" experience while thoroughly documenting the 74+ tools and three core pillars (Code Intelligence, Knowledge Graph, AI Memory).

## 2. Selected Stack: Astro Starlight
**Astro Starlight** is the recommended tool for this reconstruction.
- **Performance:** Ships zero JavaScript by default, making it incredibly fast.
- **Developer Experience:** MDX support allows for interactive components within documentation.
- **Built-in Search:** High-quality local search (Pagefind) that works perfectly on static hosting.
- **Internationalization:** Ready for multi-language support from day one.
- **Firebase Compatibility:** Produces a purely static output (`dist/`) that fits perfectly within Firebase Hosting's free tier limits.

## 3. Site Structure
The documentation will be organized into logical tracks:

### A. The Fundamentals
- **Introduction:** What is Synapse? (Philosophy, value proposition)
- **Quick Start:** Installation (`npm install -g synapse`) and first setup.
- **Comparison:** Deep dive into how Synapse compares to Mem0, GitNexus, and others.

### B. Core Pillars
- **Code Intelligence:** BM25+Vector search, AST-aware chunking, and symbol finding.
- **Knowledge Graph:** Temporal triples, entities, and "as-of" time-travel queries.
- **Persistent AI Memory:** Cross-session recall, semantic dedup, and agent isolation.

### C. Tool Reference
- **Comprehensive API Docs:** Automated or semi-automated documentation for all 74 tools.
- **Categories:** Workspace, Search, Memory, KG, Organization, Ingestion, Agent Context, and System.

### D. Advanced Usage
- **Custom Skills:** How to extend Synapse with domain-specific knowledge.
- **Hooks & Events:** Ingesting conversations and managing lifecycle callbacks.
- **Enterprise Reliability:** Security, OIDC, and local-first privacy.

## 4. Required Tools
1. **Astro + Starlight:** `npm create astro@latest -- --template starlight`
2. **Firebase CLI:** `npm install -g firebase-tools`
3. **Markdown/MDX:** Content authoring.
4. **Sharp:** Image optimization.

## 5. Firebase Hosting Implementation

### Initial Setup
1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
2. Run `firebase init hosting`:
   - Public directory: `dist`
   - Configure as single-page app: `Yes` (or `No` depending on routing preference, `No` is better for SEO).
   - Set up GitHub Actions: `Yes` (highly recommended for automated deployments).

### Build & Deploy Workflow
Add these scripts to the root `package.json`:
```json
{
  "scripts": {
    "docs:dev": "astro dev",
    "docs:build": "astro build",
    "docs:preview": "astro preview",
    "docs:deploy": "npm run docs:build && firebase deploy --only hosting"
  }
}
```

### GitHub Actions (CI/CD)
Create `.github/workflows/deploy-docs.yml`:
- **Trigger:** On push to `main` branch or when changes occur in `src/docs/` (if colocated).
- **Steps:** Checkout code, Install dependencies, Build (`npm run docs:build`), Deploy to Firebase via `FirebaseExtended/action-hosting-deploy`.

## 6. Migration Steps
1. **Content Extraction:** Pull existing technical details from `README.md`, `PROJECT.md`, and the previously removed `docs/` content.
2. **Scaffolding:** Initialize the Astro project in a fresh `docs/` folder.
3. **Theming:** Apply Synapse branding (Blue/Bio-inspired theme).
4. **Deployment:** Verify the first build on Firebase Hosting.

---
*Created by Gemini CLI Agent*
