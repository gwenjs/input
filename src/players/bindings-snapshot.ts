// src/players/bindings-snapshot.ts (minimal stub — full implementation in Phase 5)
/**
 * A serializable snapshot of a player's binding overrides.
 * Used for persisting and restoring custom key bindings.
 */
export interface BindingsSnapshot {
  /** Schema version — always 1 in this release. */
  version: 1
  /** Player slot index (0-based). */
  player: number
  /** Array of binding overrides applied on top of context defaults. */
  overrides: Array<{
    /** `ActionRef.name` of the action being overridden. */
    actionId: string
    /** Index into the action's binding array. */
    bindingIndex: number
    /** The new binding source replacing the default. */
    newBinding: import('../contexts/binding.js').BindingSource
  }>
}
