import type { Config } from '@docusaurus/types'
import type * as Preset from '@docusaurus/preset-classic'

const VERSION = '0.3.0-beta.2'
const STABLE_VERSION = '0.2.0'
const TOOL_COUNT = '74'

const config: Config = {
  title: 'Synapse',
  tagline: `Code intelligence + knowledge graph + AI memory — the only MCP server with all three. ${TOOL_COUNT} tools, zero cloud.`,
  favicon: 'img/logo-mark.svg',
  url: 'https://wmt-mobile.github.io',
  baseUrl: '/synapse/',
  organizationName: 'wmt-mobile',
  projectName: 'synapse',
  trailingSlash: false,
  onBrokenLinks: 'warn',
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn'
    }
  },
  themes: [
    '@docusaurus/theme-mermaid',
    ['@easyops-cn/docusaurus-search-local', {
      hashed: true,
      indexBlog: false,
      docsRouteBasePath: '/docs',
      highlightSearchTermsOnTargetPage: true,
      searchBarShortcutHint: true,
    }],
  ],
  plugins: [
    ['docusaurus-plugin-llms', {
      generateLLMsTxt: true,
      generateLLMsFullTxt: true,
    }],
  ],
  headTags: [
    {
      tagName: 'meta',
      attributes: {
        name: 'description',
        content: `Synapse is the only MCP server combining semantic code search, temporal knowledge graph, and persistent AI memory in one local-first package. ${TOOL_COUNT} tools, zero cloud dependencies. Alternative to Mem0, Graphiti, GitNexus, and codebase-memory-mcp.`
      }
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'keywords',
        content: 'MCP server, MCP memory server, MCP code search, local AI tools, knowledge graph, AI memory, semantic code search, offline AI, local-first development, TUI dashboard, agent memory, private AI context, Mem0 alternative, Graphiti alternative, GitNexus alternative, codebase-memory-mcp alternative, claude-context alternative, Basic Memory alternative, best MCP server, MCP server comparison'
      }
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:image',
        content: 'https://wmt-mobile.github.io/synapse/img/tui-dashboard.png'
      }
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:description',
        content: `The only MCP server combining code intelligence, knowledge graph, and AI memory. ${TOOL_COUNT} tools, zero cloud. Alternative to Mem0, GitNexus, and Graphiti.`
      }
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:type',
        content: 'website'
      }
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'twitter:card',
        content: 'summary_large_image'
      }
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'twitter:image',
        content: 'https://wmt-mobile.github.io/synapse/img/tui-dashboard.png'
      }
    },
    {
      tagName: 'script',
      attributes: {
        type: 'application/ld+json'
      },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            name: 'Synapse Docs',
            url: 'https://wmt-mobile.github.io/synapse/',
            description: `Documentation for Synapse — the only MCP server combining semantic code search, temporal knowledge graph, and persistent AI memory. ${TOOL_COUNT} tools, zero cloud. Alternative to Mem0, Graphiti, GitNexus.`,
            inLanguage: 'en',
            publisher: {
              '@type': 'Organization',
              name: 'Synapse'
            }
          },
          {
            '@type': 'SoftwareApplication',
            name: 'Synapse MCP',
            applicationCategory: 'DeveloperApplication',
            operatingSystem: 'macOS, Linux, Windows',
            softwareVersion: VERSION,
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD'
            },
            url: 'https://www.npmjs.com/package/synapse',
            description: `The only MCP server combining code intelligence, knowledge graph, and AI memory in one local-first package. ${TOOL_COUNT} tools for AI coding agents. Zero cloud dependencies.`
          },
          {
            '@type': 'Organization',
            name: 'Synapse',
            url: 'https://github.com/wmt-mobile/synapse'
          }
        ]
      })
    }
  ],
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/docs',
          editUrl: 'https://github.com/wmt-mobile/synapse/edit/main/synapse-docs/',
          showLastUpdateAuthor: false,
          showLastUpdateTime: true,
          sidebarCollapsible: true,
          sidebarCollapsed: false
        },
        blog: {
          showReadingTime: true,
          blogTitle: 'Synapse Blog',
          blogDescription: 'Insights on AI memory, code intelligence, knowledge graphs, and the MCP ecosystem from the Synapse team.',
          blogSidebarTitle: 'Recent posts',
          blogSidebarCount: 5,
          postsPerPage: 10,
          feedOptions: {
            type: ['rss', 'atom'],
            title: 'Synapse Blog',
            description: 'AI memory, code intelligence, and MCP server insights',
            copyright: `Copyright ${new Date().getFullYear()} Synapse`,
          },
        },
        sitemap: {
          lastmod: 'date',
          changefreq: 'weekly',
          priority: 0.5,
        },
        theme: {
          customCss: './src/css/custom.css'
        }
      } satisfies Preset.Options
    ]
  ],
  themeConfig: {
    image: 'img/social-card.svg',
    metadata: [
      { name: 'og:title', content: 'Synapse — Code Intelligence + Knowledge Graph + AI Memory in One MCP Server' },
      { name: 'og:site_name', content: 'Synapse Docs' },
    ],
    navbar: {
      title: 'Synapse',
      logo: {
        alt: 'Synapse',
        src: 'img/logo-mark.svg'
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs'
        },
        {
          to: '/blog',
          label: 'Blog',
          position: 'left'
        },
        {
          to: '/docs/releases/current',
          label: 'Release Notes',
          position: 'left'
        },
        {
          href: 'https://github.com/wmt-mobile/synapse',
          label: 'GitHub',
          position: 'right'
        },
        {
          href: 'https://www.npmjs.com/package/synapse',
          label: 'v0.3.0-beta.2',
          position: 'right'
        }
      ]
    },
    footer: {
      style: 'light',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/docs' },
            { label: 'Install', to: '/docs/setup/install' },
            { label: 'Tools', to: '/docs/tools/overview' },
            { label: 'Architecture', to: '/docs/architecture' }
          ]
        },
        {
          title: 'Releases',
          items: [
            { label: 'Current (0.3.0-beta.2)', to: '/docs/releases/current' },
            { label: 'Release History', to: '/docs/releases/history' }
          ]
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub', href: 'https://github.com/wmt-mobile/synapse' },
            { label: 'npm', href: 'https://www.npmjs.com/package/synapse' },
            { label: 'Issues', href: 'https://github.com/wmt-mobile/synapse/issues' }
          ]
        }
      ],
      copyright: `Copyright ${new Date().getFullYear()} Synapse. MIT License.`
    },
    prism: {
      additionalLanguages: ['bash', 'json', 'typescript', 'python', 'diff', 'sql', 'yaml', 'toml'],
      theme: {
        plain: {
          color: '#e5e5e5',
          backgroundColor: '#0a0a0a'
        },
        styles: []
      },
      darkTheme: {
        plain: {
          color: '#e5e5e5',
          backgroundColor: '#0a0a0a'
        },
        styles: []
      }
    },
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true
    }
  } satisfies Preset.ThemeConfig
}

export default config
