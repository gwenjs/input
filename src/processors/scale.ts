import type { ProcessorDescriptor } from '../contexts/binding.js'

/**
 * Multiplies the value by factor.
 * For axis1d: value * factor
 * For axis2d: { x: x * factor, y: y * factor }
 * No effect on button values.
 *
 * @param factor - The scaling factor (e.g., 2 to double, 0.5 to halve).
 * @returns A processor descriptor with `_type: 'scale'`.
 *
 * @example
 * ```typescript
 * // Make analog stick 2x more sensitive
 * bind(Move, GamepadStick.Left, { processors: [Scale(2)] })
 * ```
 */
export function Scale(factor: number): ProcessorDescriptor {
  return {
    _type: 'scale',
    factor,
  }
}
