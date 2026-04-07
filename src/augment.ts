/**
 * Declaration merging — augments @gwenjs/core with input service and runtime hooks.
 * Activated as a side-effect when importing from '@gwenjs/input'.
 */

import type { InputPluginHooks } from './plugin/index.js'
import type { InputService } from './types.js'

declare module '@gwenjs/core' {
  interface GwenRuntimeHooks extends InputPluginHooks {}

  interface GwenProvides {
    input: InputService
  }
}

export {}
