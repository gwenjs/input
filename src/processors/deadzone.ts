import type { ProcessorDescriptor } from '../contexts/binding.js'

/**
 * Applies a deadzone to axis values.
 * If |value| < threshold → 0. Works on both axis1d and axis2d.
 * For axis2d, applies to the magnitude (circular deadzone).
 *
 * @param threshold - The deadzone threshold (0 to 1).
 * @returns A processor descriptor with `_type: 'deadzone'`.
 *
 * @example
 * ```typescript
 * // Ignore small stick movements below 0.15 magnitude
 * bind(Move, GamepadStick.Left, { processors: [DeadZone(0.15)] })
 * ```
 */
export function DeadZone(threshold: number): ProcessorDescriptor {
  return {
    _type: 'deadzone',
    threshold,
  }
}
