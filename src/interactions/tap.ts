import type { InteractionDescriptor } from '../contexts/binding.js'

/**
 * Fires `isJustTriggered` on release, only if the total hold time was ≤ `maxDuration`.
 * If the button is held longer than `maxDuration`, the tap is cancelled.
 *
 * @param opts.maxDuration - Max hold duration in seconds. Default: `0.3`.
 * @returns An `InteractionDescriptor` with `_type: 'tap'`.
 *
 * @example
 * ```typescript
 * bind(Dodge, Keys.Space, { interactions: [Tap({ maxDuration: 0.2 })] })
 * ```
 */
export function Tap(opts?: { maxDuration?: number }): InteractionDescriptor {
  return { _type: 'tap', maxDuration: opts?.maxDuration ?? 0.3 }
}
