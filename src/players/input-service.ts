import type { ActionRef, ActionType, ActionState } from '../types.js'
import type { PlayerInput } from './player-input.js'
import type { KeyboardDevice } from '../devices/keyboard.js'
import type { MouseDevice } from '../devices/mouse.js'
import type { GamepadDevice } from '../devices/gamepad.js'
import type { TouchDevice } from '../devices/touch.js'
import type { GyroDevice } from '../devices/gyro.js'
import type { VirtualControlsOverlay } from '../virtual/virtual-controls-overlay.js'

export interface InputServiceDevices {
  keyboard: KeyboardDevice
  mouse: MouseDevice
  gamepad: GamepadDevice
  touch: TouchDevice
  gyro: GyroDevice
  /** Optional virtual on-screen controls overlay. Present only if configured. */
  virtualControls?: VirtualControlsOverlay
}

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
  private readonly _devices: InputServiceDevices

  constructor(players: PlayerInput[], devices: InputServiceDevices) {
    this._players = players
    this._devices = devices
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

  /** The keyboard device instance. */
  get keyboard(): KeyboardDevice {
    return this._devices.keyboard
  }

  /** The mouse device instance. */
  get mouse(): MouseDevice {
    return this._devices.mouse
  }

  /** The gamepad device instance. */
  get gamepad(): GamepadDevice {
    return this._devices.gamepad
  }

  /** The touch device instance. */
  get touch(): TouchDevice {
    return this._devices.touch
  }

  /** The gyro device instance. */
  get gyro(): GyroDevice {
    return this._devices.gyro
  }

  /** The virtual controls overlay instance, if configured. */
  get virtualControls(): VirtualControlsOverlay | undefined {
    return this._devices.virtualControls
  }
}
