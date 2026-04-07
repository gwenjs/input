import type { ProcessorDescriptor } from "../contexts/binding.js";

/**
 * Normalizes a 2D vector to unit magnitude (length <= 1).
 * No effect on axis1d or button values.
 * If magnitude > 1: divide x and y by magnitude.
 * If magnitude == 0: return {x:0, y:0} (avoid divide by zero).
 *
 * @returns A processor descriptor with `_type: 'normalize'`.
 *
 * @example
 * ```typescript
 * // Ensure 2D stick movement never exceeds unit circle
 * bind(Move, GamepadStick.Left, { processors: [Normalize()] })
 * ```
 */
export function Normalize(): ProcessorDescriptor {
  return {
    _type: "normalize",
  };
}
