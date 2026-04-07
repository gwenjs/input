import type { InteractionDescriptor } from '../contexts/binding.js'

/**
 * Fires only when ALL specified keys are simultaneously held.
 * Used for keyboard shortcuts like Ctrl+Shift+Z.
 * The binding's own action fires only when all keys in the chord are active.
 *
 * > **Note:** Full evaluation requires device access wired in Phase 5.
 * > The descriptor is produced here; the pipeline resolver handles it.
 *
 * @param keys - Key codes that must all be pressed simultaneously.
 * @returns An `InteractionDescriptor` with `_type: 'allof'`.
 *
 * @example
 * ```typescript
 * bind(Undo, Keys.Z, { interactions: [AllOf(Keys.ControlLeft, Keys.ShiftLeft)] })
 * ```
 */
export function AllOf(...keys: string[]): InteractionDescriptor {
  return { _type: 'allof', keys }
}
