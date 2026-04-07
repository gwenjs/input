import type { ProcessorDescriptor } from '../contexts/binding.js'

/**
 * Clamps value to [min, max].
 * For axis1d: Math.min(Math.max(value, min), max)
 * For axis2d: clamp each axis independently.
 *
 * @param min - Minimum value.
 * @param max - Maximum value.
 * @returns A processor descriptor with `_type: 'clamp'`.
 *
 * @example
 * ```typescript
 * // Limit analog stick output to [-0.8, 0.8]
 * bind(Move, GamepadStick.Left, { processors: [Clamp(-0.8, 0.8)] })
 * ```
 */
export function Clamp(min: number, max: number): ProcessorDescriptor {
  return {
    _type: 'clamp',
    min,
    max,
  }
}
