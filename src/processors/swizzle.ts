import type { ProcessorDescriptor } from '../contexts/binding.js'

/**
 * Swaps x and y components of a 2D axis value.
 * No effect on axis1d or button values.
 *
 * @returns A processor descriptor with `_type: 'swizzlexy'`.
 *
 * @example
 * ```typescript
 * // Swap X and Y of right stick (rotate 90°)
 * bind(Look, GamepadStick.Right, { processors: [SwizzleXY()] })
 * ```
 */
export function SwizzleXY(): ProcessorDescriptor {
  return {
    _type: 'swizzlexy',
  }
}
