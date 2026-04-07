import { useEngine, GwenPluginNotFoundError } from '@gwenjs/core'
import type { ActionRef, ActionType, ActionState } from '../types.js'

/**
 * Returns the current per-frame state of an action for a given player.
 *
 * @param ref - The action reference (from `defineAction` or `defineInputSchema`).
 * @param playerIndex - Player slot (0-based). Default: 0.
 * @returns The typed `ActionState` for this action.
 * Must be called inside an active engine context (inside `defineSystem()`,
 * `engine.run()`, or a plugin lifecycle hook).
 *
 * @throws {GwenPluginNotFoundError} If InputPlugin is not registered.
 *
 * @example
 * ```typescript
 * const jump = useAction(Jump)               // ButtonActionState for player 0
 * const move = useAction(Move, 1)            // Axis2DActionState for player 1
 * ```
 */
export function useAction<T extends ActionType>(
  ref: ActionRef<T>,
  playerIndex = 0,
): ActionState<T> {
  const engine = useEngine()
  const input = engine.tryInject('input')
  if (!input) {
    throw new GwenPluginNotFoundError({
      pluginName: '@gwenjs/input',
      hint: "Add '@gwenjs/input' to modules in gwen.config.ts",
      docsUrl: 'https://gwenengine.dev/modules/input',
    })
  }
  return input.player(playerIndex).action(ref)
}
