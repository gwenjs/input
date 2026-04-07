import type { ActionRef, ActionType, ActionState } from '../types.js'
import type { PlayerInput } from './player-input.js'

/**
 * Global input service — provides access to all `PlayerInput` instances.
 *
 * Retrieved via the `useInput()` composable or `engine.inject('input')`.
 *
 * @example
 * ```typescript
 * const input = useInput()
 * const p1 = input.player(0)
 * const jump = p1.action(Jump)
 * ```
 */
export class InputService {
  private readonly _players: PlayerInput[]

  constructor(players: PlayerInput[]) {
    this._players = players
  }

  /**
   * Returns the `PlayerInput` for the given zero-based player slot.
   *
   * @throws {RangeError} If `index` is out of bounds.
   */
  player(index: number): PlayerInput {
    if (index < 0 || index >= this._players.length) {
      throw new RangeError(
        `[@gwenjs/input] Player index ${index} is out of bounds (${this._players.length} player(s) configured).`,
      )
    }
    return this._players[index]
  }

  /**
   * All active `PlayerInput` instances.
   * Length matches the `players` count passed to `InputPlugin`.
   */
  get players(): readonly PlayerInput[] {
    return this._players
  }

  /**
   * Convenience shorthand: reads an action for player 0.
   * Equivalent to `input.player(0).action(ref)`.
   */
  action<T extends ActionType>(ref: ActionRef<T>): ActionState<T> {
    return this._players[0].action(ref)
  }
}
