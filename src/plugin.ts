import { definePlugin } from '@gwenjs/kit'
import type { GwenEngine } from '@gwenjs/core'
import type { InputConfig, InputService } from './types.js'

export const InputPlugin = definePlugin((config: InputConfig = {}) => {
  let service: InputService | null = null

  return {
    name: '@gwenjs/input',

    setup(engine: GwenEngine) {
      // TODO: implement your service
      service = {} as InputService
      engine.provide('input', service)
    },

    teardown() {
      service = null
    },
  }
})
