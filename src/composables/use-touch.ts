import { useEngine, GwenPluginNotFoundError } from '@gwenjs/core'
import type { TouchDevice } from '../devices/touch.js'

/**
 * Returns the `TouchDevice` for reading touch points and virtual control state.
 *
 * Must be called inside an active engine context (inside `defineSystem()`,
 * `engine.run()`, or a plugin lifecycle hook).
 *
 * Note: `TouchDevice` is a stub in Phase 6 — most properties are not yet implemented.
 * Check `usePointer()` for a stable unified pointer abstraction.
 *
 * @throws {GwenPluginNotFoundError} If InputPlugin is not registered.
 *
 * @example
 * ```typescript
 * const touch = useTouch()
 * ```
 */
export function useTouch(): TouchDevice {
  const engine = useEngine()
  const input = engine.tryInject('input')
  if (!input) {
    throw new GwenPluginNotFoundError({
      pluginName: '@gwenjs/input',
      hint: "Add '@gwenjs/input' to modules in gwen.config.ts",
      docsUrl: 'https://gwenengine.dev/modules/input',
    })
  }
  return input.touch
}
