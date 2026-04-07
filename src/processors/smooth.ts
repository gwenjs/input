import type { ProcessorDescriptor } from '../contexts/binding.js'

/**
 * Lerps the current value toward the target per frame.
 * smoothed = smoothed * (1 - factor) + target * factor
 * factor = 1 means instant (no smoothing). Default: 0.1.
 * Works on axis1d and axis2d. No effect on button.
 *
 * **Note:** Smooth is STATEFUL — each binding instance needs its own SmoothProcessor instance.
 * The pipeline runner maintains per-binding state for Smooth.
 *
 * @param factor - Smoothing factor (0 to 1, default 0.1).
 * @returns A processor descriptor with `_type: 'smooth'`.
 *
 * @example
 * ```typescript
 * // Smooth analog stick movement (factor 0.08)
 * bind(Move, GamepadStick.Left, { processors: [Smooth(0.08)] })
 * ```
 */
export function Smooth(factor: number = 0.1): ProcessorDescriptor {
  return {
    _type: 'smooth',
    factor,
  }
}
