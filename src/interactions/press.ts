import type { InteractionDescriptor } from "../contexts/binding.js";

/**
 * Default interaction — fires `isJustTriggered` on the first frame the button is pressed.
 * `isJustReleased` fires on the first frame after release.
 * This is the default when no interaction is specified.
 *
 * @returns An `InteractionDescriptor` with `_type: 'press'`.
 *
 * @example
 * ```typescript
 * bind(Jump, Keys.Space, { interactions: [Press()] })
 * ```
 */
export function Press(): InteractionDescriptor {
  return { _type: "press" };
}
