import { useEngine, GwenPluginNotFoundError } from '@gwenjs/core'
import type { InputService } from './players/input-service.js'
import './augment.js'

/**
 * Returns the Input service registered by InputPlugin.
 *
 * @throws {GwenPluginNotFoundError} If InputPlugin is not registered.
 */
export function useInput(): InputService {
  const engine = useEngine()
  const input = engine.tryInject('input')
  if (input) return input
  throw new GwenPluginNotFoundError({
    pluginName: '@gwenjs/input',
    hint: "Add '@gwenjs/input' to modules in gwen.config.ts",
  })
}
