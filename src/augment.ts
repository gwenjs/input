/**
 * Declaration merging — types engine.inject('input') as InputService.
 * Activated as a side-effect when importing from '@gwenjs/input'.
 */

import type { InputService } from './types.js'

declare module '@gwenjs/core' {
  interface GwenProvides {
    input: InputService
  }
}

export {}
