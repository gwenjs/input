import type { InteractionDescriptor } from "../contexts/binding.js";

/**
 * Fires `isJustTriggered` when two taps occur within `maxGap` seconds of each other.
 *
 * @param opts.maxGap - Max time between taps in seconds. Default: `0.3`.
 * @returns An `InteractionDescriptor` with `_type: 'doubletap'`.
 *
 * @example
 * ```typescript
 * bind(Dash, Keys.ArrowRight, { interactions: [DoubleTap({ maxGap: 0.25 })] })
 * ```
 */
export function DoubleTap(opts?: { maxGap?: number }): InteractionDescriptor {
  return { _type: "doubletap", maxGap: opts?.maxGap ?? 0.3 };
}
