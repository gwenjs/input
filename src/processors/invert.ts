import type { ProcessorDescriptor } from '../contexts/binding.js'

/**
 * Multiplies axis value(s) by -1.
 * Invert() works on axis1d and both axes of axis2d.
 * InvertX() / InvertY() only on the named axis (axis2d only).
 *
 * @returns A processor descriptor with `_type: 'invert'`.
 *
 * @example
 * ```typescript
 * // Invert mouse Y (for inverted flight controls)
 * bind(LookY, MouseDelta(), { processors: [InvertY()] })
 * ```
 */
export function Invert(): ProcessorDescriptor {
  return {
    _type: 'invert',
  }
}

/**
 * Multiplies the X axis by -1 (axis2d only).
 *
 * @returns A processor descriptor with `_type: 'invertx'`.
 *
 * @example
 * ```typescript
 * // Invert only X axis of stick
 * bind(Move, GamepadStick.Right, { processors: [InvertX()] })
 * ```
 */
export function InvertX(): ProcessorDescriptor {
  return {
    _type: 'invertx',
  }
}

/**
 * Multiplies the Y axis by -1 (axis2d only).
 *
 * @returns A processor descriptor with `_type: 'inverty'`.
 *
 * @example
 * ```typescript
 * // Invert only Y axis of stick
 * bind(Move, GamepadStick.Left, { processors: [InvertY()] })
 * ```
 */
export function InvertY(): ProcessorDescriptor {
  return {
    _type: 'inverty',
  }
}
