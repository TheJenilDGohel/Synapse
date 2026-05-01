// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [starlight({
      title: 'Synapse',
      description: 'The Unified Context Layer for AI Agents',
      logo: {
          alt: 'Synapse Logo',
          src: './src/assets/logo.svg',
      },
      social: [
          { icon: 'github', label: 'GitHub', href: 'https://github.com/j-d-gohel/synapse' },
      ],
      sidebar: [
          {
              label: 'Fundamentals',
              items: [
                  { label: 'Introduction', slug: 'fundamentals/introduction' },
                  { label: 'Quick Start', slug: 'fundamentals/quick-start' },
                  { label: 'Comparison', slug: 'fundamentals/comparison' },
              ],
          },
          {
              label: 'Core Pillars',
              items: [
                  { label: 'Code Intelligence', slug: 'pillars/code-intelligence' },
                  { label: 'Knowledge Graph', slug: 'pillars/knowledge-graph' },
                  { label: 'Persistent AI Memory', slug: 'pillars/ai-memory' },
              ],
          },
          {
              label: 'Tool Reference',
              autogenerate: { directory: 'reference' },
          },
          {
              label: 'Advanced',
              items: [
                  { label: 'Custom Skills', slug: 'advanced/custom-skills' },
                  { label: 'Hooks & Events', slug: 'advanced/hooks' },
                  { label: 'Security & Privacy', slug: 'advanced/security' },
              ],
          },
      ],
      customCss: ['./src/styles/custom.css'],
  }), react()],

  vite: {
    plugins: [tailwindcss()],
  },
});