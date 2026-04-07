import type { InteractionDescriptor } from "../contexts/binding.js";
import type { ActionRef, ActionType } from "../types.js";

/**
 * Fires only when the given `actionRef` satisfies the given `condition`.
 * Allows binding-level cross-action conditioning without polluting system logic.
 *
 * @param actionRef - The action that must satisfy `condition`.
 * @param condition - `'isPressed'` or `'isJustTriggered'`.
 * @returns An `InteractionDescriptor` with `_type: 'chordedwith'`.
 *
 * @example
 * ```typescript
 * // Drift fires only while Jump is held
 * bind(Drift, GamepadStick.LeftX, {
 *   interactions: [ChordedWith(Jump, 'isPressed')]
 * })
 * ```
 */
export function ChordedWith(
  actionRef: ActionRef<ActionType>,
  condition: "isPressed" | "isJustTriggered",
): InteractionDescriptor {
  return { _type: "chordedwith", actionId: actionRef.id, condition };
}
