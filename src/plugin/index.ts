/// <reference types="vite/client" />

// @ts-expect-error — workspace dep not yet installed; resolves in monorepo
import { definePlugin } from '@gwenjs/kit/plugin'
import type { GwenEngine } from '@gwenjs/core'
import type { NormalizedInputConfig } from './config.js'
import { normalizeConfig } from './config.js'
import type { InputPluginConfig } from './config.js'

export type { InputPluginConfig } from './config.js'

/**
 * Runtime hooks added to `GwenRuntimeHooks` by `@gwenjs/input`.
 * Imported by `augment.ts` to extend the engine's hook bus types.
 *
 * @example
 * ```typescript
 * engine.hooks.hook('input:contextActivated', (name, priority) => {
 *   console.log(`Context "${name}" activated at priority ${priority}`)
 * })
 * ```
 */
export interface InputPluginHooks {
  /**
   * Fired when a player activates an input context.
   * @param name - Context name.
   * @param priority - Context priority level.
   */
  'input:contextActivated': (name: string, priority: number) => void
  /**
   * Fired when a player deactivates an input context.
   * @param name - Context name.
   */
  'input:contextDeactivated': (name: string) => void
  /**
   * Fired when a device connects or disconnects.
   * @param type - Device type.
   * @param event - 'connected' or 'disconnected'.
   * @param index - Gamepad slot index (0 for keyboard/touch/gyro).
   */
  'input:deviceChanged': (type: 'gamepad' | 'touch' | 'gyro', event: 'connected' | 'disconnected', index: number) => void
  /**
   * Fired when a player's binding for an action changes (via rebind/reset).
   * @param playerId - Player slot index.
   * @param action - Action name (ActionRef.name).
   * @param index - Binding index that changed.
   */
  'input:bindingChanged': (playerId: number, action: string, index: number) => void
  /**
   * Fired when the recording/playback state changes.
   * @param state - New recording state.
   */
  'input:recordingState': (state: 'started' | 'stopped' | 'playing' | 'paused') => void
}

/**
 * The GWEN input plugin.
 *
 * Registers keyboard, mouse, gamepad, touch, and gyroscope device listeners,
 * provides the `InputService` and per-player `PlayerInput` instances via
 * `engine.provide()`, and drives the input pipeline each frame.
 *
 * ### Usage — module system (recommended)
 * ```typescript
 * // gwen.config.ts
 * export default defineConfig({
 *   modules: [['@gwenjs/input', { players: 2 }]],
 * })
 * ```
 *
 * ### Usage — direct
 * ```typescript
 * import { InputPlugin } from '@gwenjs/input'
 * import '@gwenjs/input/augment'
 *
 * await engine.use(InputPlugin({ players: 1 }))
 * ```
 */
export const InputPlugin = definePlugin((opts: InputPluginConfig = {}) => {
  let cfg: NormalizedInputConfig
  let log: ReturnType<GwenEngine['logger']['child']>

  return {
    name: '@gwenjs/input',

    setup(engine: GwenEngine) {
      cfg = normalizeConfig(opts)
      log = engine.logger.child('@gwenjs/input')

      // TODO Phase 2: attach device listeners (keyboard, mouse, gamepad, touch, gyro)
      // TODO Phase 5: create PlayerInput instances, engine.provide('player:N', ...)
      // TODO Phase 7: engine.provide('input', inputService)

      log.info('initialized', { players: cfg.players })
    },

    onBeforeUpdate(_dt: number) {
      // TODO Phase 2: flush all device snapshots
      // keyboard.update(), mouse.update(), gamepad.update(), touch?.update(), gyro?.update()
    },

    onAfterUpdate() {
      // TODO Phase 8: flush recording/playback frame buffer
      // recorder?.flushFrame()
    },

    teardown() {
      // TODO Phase 2: detach all event listeners
      // keyboard.detach(), mouse.detach(), gyro?.detach(), touch?.detach()
      log.info('torn down')
    },

    onError(error: unknown, context: { phase: string; recover: () => void }) {
      // Input errors must NEVER crash the game.
      // A missing gamepad or failed gesture should not propagate to the engine crash handler.
      log.warn('input error — recovering', {
        phase: context.phase,
        error: String(error),
      })
      context.recover()
    },
  }
})
