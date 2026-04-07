import { useEngine, GwenPluginNotFoundError } from '@gwenjs/core'
import type { InputService } from './players/input-service.js'
import type { PlayerInput } from './players/player-input.js'
import './augment.js'

/**
 * Returns the Input service registered by InputPlugin.
 *
 * Must be called inside an active engine context (inside `defineSystem()`,
 * `engine.run()`, or a plugin lifecycle hook).
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
    docsUrl: 'https://gwenengine.dev/modules/input',
  })
}

/**
 * Returns the PlayerInput for the given player slot.
 *
 * Must be called inside an active engine context (inside `defineSystem()`,
 * `engine.run()`, or a plugin lifecycle hook).
 *
 * @param index - Player slot index (0-based).
 * @throws {GwenPluginNotFoundError} If InputPlugin is not registered.
 * @throws {RangeError} If index is out of bounds.
 *
 * @example
 * ```typescript
 * const p2 = usePlayer(1)
 * const jumpState = p2.action(Jump)
 * ```
 */
export function usePlayer(index = 0): PlayerInput {
  return useInput().player(index)
}
