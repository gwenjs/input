import type { InteractionDescriptor } from '../contexts/binding.js'

/**
 * Toggles `isPressed` on each press. First press → on, second press → off.
 * `isJustTriggered` fires when toggling on; `isJustReleased` fires when toggling off.
 *
 * @returns An `InteractionDescriptor` with `_type: 'toggle'`.
 *
 * @example
 * ```typescript
 * bind(Crouch, Keys.ControlLeft, { interactions: [Toggle()] })
 * ```
 */
export function Toggle(): InteractionDescriptor {
  return { _type: 'toggle' }
}
