import type { InteractionDescriptor } from '../contexts/binding.js'

/**
 * Fires `isJustTriggered` on the frame the button is released (not on press).
 *
 * @returns An `InteractionDescriptor` with `_type: 'release'`.
 *
 * @example
 * ```typescript
 * bind(Confirm, Keys.Space, { interactions: [Release()] })
 * ```
 */
export function Release(): InteractionDescriptor {
  return { _type: 'release' }
}
