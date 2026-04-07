import { useEngine, GwenPluginNotFoundError } from '@gwenjs/core'
import type { KeyboardDevice } from '../devices/keyboard.js'

/**
 * Returns the raw `KeyboardDevice` instance.
 * Use for escape-hatch access to raw key states.
 * Prefer `useAction()` for game logic.
 *
 * Must be called inside an active engine context (inside `defineSystem()`,
 * `engine.run()`, or a plugin lifecycle hook).
 *
 * @throws {GwenPluginNotFoundError} If InputPlugin is not registered.
 *
 * @example
 * ```typescript
 * const kb = useKeyboard()
 * if (kb.isJustPressed('Space')) { ... }
 * ```
 */
export function useKeyboard(): KeyboardDevice {
  const engine = useEngine()
  const input = engine.tryInject('input')
  if (!input) {
    throw new GwenPluginNotFoundError({
      pluginName: '@gwenjs/input',
      hint: "Add '@gwenjs/input' to modules in gwen.config.ts",
      docsUrl: 'https://gwenengine.dev/modules/input',
    })
  }
  return input.keyboard
}
