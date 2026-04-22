import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'index',
    { type: 'doc', id: 'comparison', label: 'vs Alternatives' },
    {
      type: 'category',
      label: 'Setup',
      items: [
        { type: 'doc', id: 'setup/install', label: 'Install' },
        { type: 'doc', id: 'setup/configuration', label: 'Configuration' }
      ]
    },
    {
      type: 'category',
      label: 'Learn',
      items: [
        { type: 'doc', id: 'overview', label: 'Overview' },
        { type: 'doc', id: 'architecture', label: 'Architecture' }
      ]
    },
    {
      type: 'category',
      label: 'Tools',
      items: [
        { type: 'doc', id: 'tools/overview', label: 'All Tools (74)' },
        { type: 'doc', id: 'tools/search', label: 'Search' },
        { type: 'doc', id: 'tools/indexing', label: 'Indexing' },
        { type: 'doc', id: 'tools/memory', label: 'Memory' },
        { type: 'doc', id: 'tools/knowledge-graph', label: 'Knowledge Graph' },
        { type: 'doc', id: 'tools/organization', label: 'Nests & Agents' },
        { type: 'doc', id: 'tools/hooks', label: 'Hooks' },
        { type: 'doc', id: 'tools/cli', label: 'CLI' },
        { type: 'doc', id: 'tools/updates', label: 'Updates' }
      ]
    },
    {
      type: 'category',
      label: 'Releases',
      collapsed: true,
      items: [
        { type: 'doc', id: 'releases/current', label: 'Current (0.3.0-beta.2)' },
        { type: 'doc', id: 'releases/version-selection', label: 'Version Selection' },
        { type: 'doc', id: 'releases/history', label: 'Release History' }
      ]
    }
  ]
}

export default sidebars
