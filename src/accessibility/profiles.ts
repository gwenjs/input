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
 * These are empty baseline snapshots — no overrides are applied by default.
 * Games should extend them with action-specific remappings that suit their
 * control scheme.
 *
 * @remarks
 * Built-in profiles do not know your game's actions, so they carry no
 * overrides. Combine them with your own `overrides` entries when registering.
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
