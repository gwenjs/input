import type { BindingsSnapshot } from "../players/bindings-snapshot.js";

/**
 * An accessibility profile — a named `BindingsSnapshot` preset that remaps
 * actions for assistive input needs.
 *
 * Pass profiles to `InputPlugin({ accessibilityProfiles: { ... } })`.
 * Activate them at runtime via `player.activateAccessibilityProfile(name)`.
 *
 * @example
 * ```typescript
 * import { builtInProfiles } from '@gwenjs/input'
 *
 * InputPlugin({
 *   accessibilityProfiles: {
 *     'one-handed-left': builtInProfiles.oneHandedLeft,
 *     'custom': myCustomProfile,
 *   }
 * })
 * ```
 */
export type AccessibilityProfile = BindingsSnapshot;

/**
 * Built-in accessibility profile presets shipped with `@gwenjs/input`.
 *
 * These are **empty baseline templates** — they contain no overrides by default
 * because `@gwenjs/input` does not know your game's actions. You must extend
 * them with your own `overrides` entries when registering:
 *
 * ```typescript
 * import { builtInProfiles } from '@gwenjs/input'
 *
 * InputPlugin({
 *   accessibilityProfiles: {
 *     'one-handed-left': {
 *       ...builtInProfiles.oneHandedLeft,
 *       overrides: [
 *         { actionId: 'Jump', bindingIndex: 0, newBinding: 'KeyQ' },
 *         // ... your game-specific remappings
 *       ],
 *     },
 *   },
 * })
 * ```
 *
 * @remarks
 * The name `builtInProfiles` refers to the profile shape being built-in,
 * not to pre-filled action remappings. Think of these as typed templates.
 */
export const builtInProfiles = {
  /**
   * One-handed left profile — baseline for remapping to left-hand-only controls.
   * Extend with game-specific overrides before registering.
   */
  oneHandedLeft: {
    version: 1,
    player: 0,
    overrides: [],
  } satisfies AccessibilityProfile,

  /**
   * One-handed right profile — baseline for remapping to right-hand-only controls.
   * Extend with game-specific overrides before registering.
   */
  oneHandedRight: {
    version: 1,
    player: 0,
    overrides: [],
  } satisfies AccessibilityProfile,
} as const;
