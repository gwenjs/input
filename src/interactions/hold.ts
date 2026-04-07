import type { InteractionDescriptor } from '../contexts/binding.js'

/**
 * Fires `isJustTriggered` once the button has been held for `holdTime` seconds.
 * Continues firing (`isPressed: true`) until the button is released.
 *
 * @param opts.holdTime - Required hold duration in seconds.
 * @returns An `InteractionDescriptor` with `_type: 'hold'`.
 *
 * @example
 * ```typescript
 * bind(Sprint, Keys.ShiftLeft, { interactions: [Hold({ holdTime: 0.1 })] })
 * ```
 */
export function Hold(opts: { holdTime: number }): InteractionDescriptor {
  return { _type: 'hold', holdTime: opts.holdTime }
}
