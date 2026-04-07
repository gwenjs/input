import type { InteractionDescriptor } from '../contexts/binding.js'

/**
 * Fires `isJustTriggered` repeatedly while held, like a keyboard auto-repeat.
 * First trigger fires immediately on press. Then waits `delay` seconds before
 * repeating every `interval` seconds.
 *
 * @param opts.interval - Time between repeated triggers in seconds.
 * @param opts.delay - Initial delay before repeating starts. Default: same as `interval`.
 * @returns An `InteractionDescriptor` with `_type: 'repeat'`.
 *
 * @example
 * ```typescript
 * bind(SelectNext, Keys.ArrowDown, {
 *   interactions: [Repeat({ interval: 0.1, delay: 0.4 })]
 * })
 * ```
 */
export function Repeat(opts: { interval: number; delay?: number }): InteractionDescriptor {
  return { _type: 'repeat', interval: opts.interval, delay: opts.delay ?? opts.interval }
}
