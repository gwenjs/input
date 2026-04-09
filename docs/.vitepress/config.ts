import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '@gwenjs/input',
  description: 'Type-safe input plugin for the GWEN game engine.',
  base: '/input/',

  locales: {
    root: {
      label: 'English',
      lang: 'en',
    },
    fr: {
      label: 'Français',
      lang: 'fr',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/fr/guide/getting-started' },
          { text: 'API', link: '/fr/api/' },
        ],
        sidebar: [
          {
            text: 'Guide',
            items: [
              { text: 'Démarrage rapide', link: '/fr/guide/getting-started' },
              { text: 'Actions', link: '/fr/guide/actions' },
              { text: 'Contextes d\'entrée', link: '/fr/guide/contexts' },
              { text: 'Périphériques', link: '/fr/guide/devices' },
              { text: 'Interactions & Processeurs', link: '/fr/guide/interactions' },
              { text: 'Multijoueur', link: '/fr/guide/multiplayer' },
              { text: 'Enregistrement & Lecture', link: '/fr/guide/recording' },
            ],
          },
          {
            text: 'API',
            items: [
              { text: 'useInput()', link: '/fr/api/' },
              { text: 'PlayerInput', link: '/fr/api/player-input' },
              { text: 'InputService', link: '/fr/api/input-service' },
              { text: 'defineAction / bind', link: '/fr/api/define-action' },
              { text: 'Composables', link: '/fr/api/composables' },
            ],
          },
        ],
      },
    },
  },

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Actions', link: '/guide/actions' },
          { text: 'Input Contexts', link: '/guide/contexts' },
          { text: 'Devices', link: '/guide/devices' },
          { text: 'Interactions & Processors', link: '/guide/interactions' },
          { text: 'Multiplayer', link: '/guide/multiplayer' },
          { text: 'Recording & Playback', link: '/guide/recording' },
        ],
      },
      {
        text: 'API',
        items: [
          { text: 'useInput()', link: '/api/' },
          { text: 'PlayerInput', link: '/api/player-input' },
          { text: 'InputService', link: '/api/input-service' },
          { text: 'defineAction / bind', link: '/api/define-action' },
          { text: 'Composables', link: '/api/composables' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/gwenjs/input' },
    ],
  },
})
