/**
 * Build-time module for @gwenjs/input.
 *
 * Add to gwen.config.ts:
 *   modules: ['@gwenjs/input']
 *
 * IMPORTANT: This file must never import from './index.js'.
 * Always import from './plugin.js' or './types.js' directly.
 */

import { defineGwenModule, definePluginTypes } from '@gwenjs/kit'
import type { InputPluginConfig } from './plugin/config.js'

export default defineGwenModule<InputPluginConfig>({
  meta: { name: '@gwenjs/input' },
  defaults: {},
  async setup(options, kit) {
    // Direct import from plugin.ts — never from index.ts
    const { InputPlugin } = await import('./plugin/index.js')

    kit.addPlugin(InputPlugin(options))

    kit.addAutoImports([
      { name: 'useInput', from: '@gwenjs/input' },
    ])

    kit.addTypeTemplate({
      filename: 'input.d.ts',
      getContents: () =>
        definePluginTypes({
          imports: ["import type { InputService } from '@gwenjs/input'"],
          provides: { input: 'InputService' },
        }),
    })
  },
})
