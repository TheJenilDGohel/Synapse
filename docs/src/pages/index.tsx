import React from 'react'
import Link from '@docusaurus/Link'
import Layout from '@theme/Layout'

const features = [
  {
    title: 'Hybrid Search',
    description: 'Lexical + semantic search fused with RRF ranking. ripgrep for speed, MiniLM-L6-v2 for meaning.'
  },
  {
    title: 'Knowledge Graph',
    description: 'Temporal subject-predicate-object triples. Query what was true at any point in time.'
  },
  {
    title: 'Multi-Hop Traversal',
    description: 'Walk relationships 2-5 hops deep via recursive CTEs. No other local tool does this.'
  },
  {
    title: 'Agent Memory',
    description: 'Durable, queryable memory that persists across sessions. Per-agent isolation with private diaries.'
  },
  {
    title: 'Semantic Dedup',
    description: 'Embedding similarity gate catches near-duplicates before storage. Your memory stays clean.'
  },
  {
    title: 'Zero Cloud',
    description: 'Pure SQLite. No external databases, no API keys, no subscriptions. Everything stays on your machine.'
  }
]

const guides = [
  {
    title: 'Install',
    href: '/docs/setup/install',
    description: 'Package, skill, MCP config, and doctor checks.'
  },
  {
    title: 'vs Alternatives',
    href: '/docs/comparison',
    description: 'How Synapse compares to Mem0, GitNexus, Graphiti, and more.'
  },
  {
    title: 'Tools Reference',
    href: '/docs/tools/overview',
    description: 'All 74 MCP tools across 11 groups.'
  },
  {
    title: 'Blog',
    href: '/blog',
    description: 'Insights on AI memory, code intelligence, and the MCP ecosystem.'
  }
]

export default function Home(): React.JSX.Element {
  return (
    <Layout
      title="Synapse — Code Intelligence + Knowledge Graph + AI Memory in One MCP Server"
      description="The only MCP server combining semantic code search, temporal knowledge graph, and persistent AI memory. 74 tools, zero cloud. Alternative to Mem0, GitNexus, Graphiti."
    >
      <main className="siteHome">
        <section className="siteHome__hero">
          <p className="siteHome__eyebrow">The only MCP server with all three</p>
          <h1>Code intelligence. Knowledge graph. AI memory.</h1>
          <p>
            74 MCP tools combining semantic code search, temporal knowledge graph, and persistent memory in one local-first package. Zero cloud, pure SQLite.
          </p>
          <div className="siteHome__actions">
            <Link className="button button--primary button--lg" to="/docs">
              Get Started
            </Link>
            <Link className="button button--secondary button--lg" to="https://github.com/wmt-mobile/synapse">
              GitHub
            </Link>
          </div>
        </section>

        <div className="siteHome__install">
          <pre><code>npm install -g synapse{'\n'}synapse setup{'\n'}synapse doctor</code></pre>
        </div>

        <div className="siteHome__stats">
          <div className="siteHome__stat">
            <strong>74</strong>
            <span>MCP Tools</span>
          </div>
          <div className="siteHome__stat">
            <strong>3 Pillars</strong>
            <span>Code + KG + Memory</span>
          </div>
          <div className="siteHome__stat">
            <strong>Zero</strong>
            <span>Cloud deps</span>
          </div>
          <div className="siteHome__stat">
            <strong>v0.3.0</strong>
            <span>Latest</span>
          </div>
        </div>

        <section className="siteHome__section">
          <div className="siteHome__sectionHeader">
            <h2>Features</h2>
          </div>
          <div className="siteHome__features">
            {features.map((feature) => (
              <div key={feature.title} className="siteHome__feature">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="siteHome__section">
          <div className="siteHome__sectionHeader">
            <h2>Documentation</h2>
            <p>Everything you need to get started.</p>
          </div>
          <div className="docGrid docGrid--2">
            {guides.map((guide) => (
              <Link key={guide.href} className="docLinkCard" to={guide.href}>
                <strong>{guide.title}</strong>
                <span>{guide.description}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </Layout>
  )
}
