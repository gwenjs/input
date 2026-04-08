/**
 * Creates one instance per player by calling `factory(playerIndex)` for each
 * index in `[0, count)`.
 *
 * Useful for registering a parameterised system once per local player without
 * duplicating logic.
 *
 * @param count   - Number of players. Must match `InputPlugin({ players: N })`.
 * @param factory - A function that takes a zero-based player index and returns `T`.
 * @returns An array of `T` values, one per player index.
 *
 * @example
 * ```typescript
 * import { forPlayers } from '@gwenjs/input'
 *
 * // Register a movement system for each of 2 players
 * defineConfig({
 *   systems: [
 *     ...forPlayers(2, movementSystem),
 *     ...forPlayers(2, cameraSystem),
 *   ],
 * })
 * ```
 */
export function forPlayers<T>(count: number, factory: (playerIndex: number) => T): T[] {
  return Array.from({ length: count }, (_, i) => factory(i));
}
