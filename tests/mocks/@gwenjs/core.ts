import { vi } from 'vitest'

export class GwenPluginNotFoundError extends Error {
  constructor(public readonly opts: { pluginName: string; hint?: string; docsUrl?: string }) {
    super(`Plugin not found: ${opts.pluginName}`)
    this.name = 'GwenPluginNotFoundError'
  }
}

export function useEngine() {
  return mockEngine
}

export const mockEngine = {
  logger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }))
  },
  tryInject: vi.fn(),
  provide: vi.fn(),
  hooks: {
    callHook: vi.fn(),
  }
}
