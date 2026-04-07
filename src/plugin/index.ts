/// <reference types="vite/client" />

// @ts-expect-error — workspace dep not yet installed; resolves in monorepo
import { definePlugin } from '@gwenjs/kit/plugin'
import type { GwenEngine } from '@gwenjs/core'
import { normalizeConfig } from './config.js'
import type { InputPluginConfig } from './config.js'
import type { InputService } from '../types.js'
import { KeyboardDevice } from '../devices/keyboard.js'
import { MouseDevice } from '../devices/mouse.js'
import { GamepadDevice } from '../devices/gamepad.js'
import { TouchDevice } from '../devices/touch.js'
import { GyroDevice } from '../devices/gyro.js'

export type { InputPluginConfig, VirtualJoystickConfig, VirtualButtonConfig, DevOverlayConfig } from './config.js'

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
  const cfg = normalizeConfig(opts)
  let log: ReturnType<GwenEngine['logger']['child']>

  let keyboard: KeyboardDevice
  let mouse: MouseDevice
  let gamepad: GamepadDevice
  let touch: TouchDevice
  let gyro: GyroDevice

  return {
    name: '@gwenjs/input',
    provides: { input: {} as InputService },
    providesHooks: {} as InputPluginHooks,

    setup(engine: GwenEngine) {
      log = engine.logger.child('@gwenjs/input')

      keyboard = new KeyboardDevice()
      mouse = new MouseDevice()
      gamepad = new GamepadDevice()
      touch = new TouchDevice()
      gyro = new GyroDevice(cfg.gyro.smoothing, cfg.gyro.deadZone)

      if (typeof window !== 'undefined') {
        keyboard.attach(cfg.eventTarget)
        mouse.attach(cfg.eventTarget, cfg.canvas ?? undefined)
        gamepad.attach(window)
        touch.attach(cfg.eventTarget)
        gyro.attach(window)

        gamepad.onConnect = (padIndex) => {
          engine.hooks.callHook('input:deviceChanged', 'gamepad', 'connected', padIndex)
        }
        gamepad.onDisconnect = (padIndex) => {
          engine.hooks.callHook('input:deviceChanged', 'gamepad', 'disconnected', padIndex)
        }
      }

      // TODO Phase 5: create PlayerInput instances, engine.provide('player:N', ...)
      // TODO Phase 7: engine.provide('input', inputService)

      log.info('initialized', { players: cfg.players })
    },

    onBeforeUpdate(_dt: number) {
      if (typeof window !== 'undefined') {
        keyboard.update()
        mouse.update()
        gamepad.update()
        touch.update()
        gyro.update()
      }
    },

    onAfterUpdate() {
      // TODO Phase 8: flush recording/playback frame buffer
      // recorder?.flushFrame()
    },

    teardown() {
      if (typeof window !== 'undefined') {
        keyboard.detach(cfg.eventTarget)
        mouse.detach(cfg.eventTarget)
        gamepad.detach(window)
        touch.detach(cfg.eventTarget)
        gyro.detach(window)
      }
      log?.info('torn down')
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
