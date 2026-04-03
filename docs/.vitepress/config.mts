import { defineConfig } from 'vitepress'
import { version } from '../../package.json'

export default defineConfig({
  base: '/fetch-smartly/',
  title: 'fetch-smartly',
  description: 'Zero-dependency, isomorphic HTTP client with intelligent retry, circuit breaker, and offline queue for Node.js and browsers',
  head: [
    ['meta', { name: 'keywords', content: 'fetch, http client, retry, exponential backoff, circuit breaker, rate limit, timeout, abort, isomorphic, node-fetch, typescript, offline queue, request deduplication, zero dependency, resilient http' }],
    ['meta', { property: 'og:title', content: 'fetch-smartly — Intelligent HTTP Client for Node.js & Browsers' }],
    ['meta', { property: 'og:description', content: 'Production-grade fetch wrapper with retry, circuit breaker, deduplication, and offline queue. Zero dependencies, full TypeScript.' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'fetch-smartly — Intelligent HTTP Client for Node.js & Browsers' }],
    ['meta', { name: 'twitter:description', content: 'Production-grade fetch wrapper with retry, circuit breaker, deduplication, and offline queue. Zero dependencies, full TypeScript.' }],
    ['script', { type: 'application/ld+json' }, JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'fetch-smartly',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Node.js',
      description: 'Zero-dependency, isomorphic HTTP client with intelligent retry, circuit breaker, and offline queue for Node.js and browsers',
      url: 'https://Ali-Raza-Arain.github.io/fetch-smartly/',
      downloadUrl: 'https://www.npmjs.com/package/fetch-smartly',
      license: 'https://opensource.org/licenses/MIT',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      programmingLanguage: 'TypeScript',
    })],
  ],
  sitemap: {
    hostname: 'https://Ali-Raza-Arain.github.io/fetch-smartly/',
  },
  themeConfig: {
    nav: [
      { text: `v${version}`, link: 'https://github.com/Ali-Raza-Arain/fetch-smartly/releases' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/guide/api-reference' },
      { text: 'npm', link: 'https://www.npmjs.com/package/fetch-smartly' },
      { text: 'GitHub', link: 'https://github.com/Ali-Raza-Arain/fetch-smartly' },
      { text: 'Sponsor', link: 'https://buymeacoffee.com/alirazaarain' },
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Why fetch-smartly?', link: '/guide/why' },
          { text: 'Getting Started', link: '/guide/getting-started' },
        ],
      },
      {
        text: 'Core Features',
        items: [
          { text: 'Retry & Backoff', link: '/guide/retry' },
          { text: 'Circuit Breaker', link: '/guide/circuit-breaker' },
          { text: 'Request Deduplication', link: '/guide/deduplication' },
          { text: 'Offline Queue', link: '/guide/offline-queue' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'API Reference', link: '/guide/api-reference' },
          { text: 'Error Handling', link: '/guide/error-handling' },
          { text: 'Comparison', link: '/guide/comparison' },
        ],
      },
      {
        text: 'About',
        items: [
          { text: 'Roadmap', link: '/guide/roadmap' },
          { text: 'Credits & Sponsor', link: '/guide/credits' },
        ],
      },
    ],
    search: {
      provider: 'local',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Ali-Raza-Arain/fetch-smartly' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Made by <a href="https://github.com/Ali-Raza-Arain">Ali Raza</a>',
    },
  },
})
