import { useEngine, GwenPluginNotFoundError } from '@gwenjs/core'
import type { GyroDevice } from '../devices/gyro.js'

/**
 * Returns the `GyroDevice` for reading orientation and rotation rate.
 * Check `gyro.isAvailable` before using orientation values — it becomes `true`
 * only after the first `deviceorientation` event fires.
 *
 * Must be called inside an active engine context (inside `defineSystem()`,
 * `engine.run()`, or a plugin lifecycle hook).
 *
 * @throws {GwenPluginNotFoundError} If InputPlugin is not registered.
 *
 * @example
 * ```typescript
 * const gyro = useGyro()
 * if (gyro.isAvailable) {
 *   console.log(gyro.orientation.roll)
 * }
 * ```
 */
export function useGyro(): GyroDevice {
  const engine = useEngine()
  const input = engine.tryInject('input')
  if (!input) {
    throw new GwenPluginNotFoundError({
      pluginName: '@gwenjs/input',
      hint: "Add '@gwenjs/input' to modules in gwen.config.ts",
      docsUrl: 'https://gwenengine.dev/modules/input',
    })
  }
  return input.gyro
}
