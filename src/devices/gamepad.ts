/**
 * GamepadDevice — wraps the Web Gamepad API with per-frame snapshotting.
 *
 * Snapshot strategy: `navigator.getGamepads()` is called once per frame in
 * `update()`. Button states are copied as `boolean[][]` primitives to avoid
 * relying on live `Gamepad` object mutability (W3C spec §6.4).
 *
 * `isButtonJustPressed` / `isButtonJustReleased` compare the current frame
 * snapshot against the previous frame snapshot (rising/falling edge detection).
 *
 * Fires `onConnect` / `onDisconnect` callbacks when a gamepad connects or
 * disconnects.
 */

import type { InputDevice } from './index.js'

export class GamepadDevice implements InputDevice {
  /** Called when a gamepad connects. Receives the gamepad slot index. */
  onConnect?: (padIndex: number) => void
  /** Called when a gamepad disconnects. Receives the gamepad slot index. */
  onDisconnect?: (padIndex: number) => void

  /** Raw Gamepad refs — used for axis/value reading only. */
  private snapshot: (Gamepad | null)[] = []
  /** Button pressed states this frame. */
  private currButtonStates: boolean[][] = []
  /** Button pressed states last frame — used for edge detection. */
  private prevButtonStates: boolean[][] = []

  private onGamepadConnected = (e: GamepadEvent): void => {
    this.onConnect?.(e.gamepad.index)
  }

  private onGamepadDisconnected = (e: GamepadEvent): void => {
    this.onDisconnect?.(e.gamepad.index)
  }

  constructor(private deadzone = 0.15) {}

  /**
   * Attach `gamepadconnected` / `gamepaddisconnected` listeners to `window`.
   * The `target` parameter is ignored — the Gamepad API always fires on `window`.
   */
  attach(_target: EventTarget): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('gamepadconnected', this.onGamepadConnected as EventListener)
      window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected as EventListener)
    }
  }

  /** Remove gamepad connection listeners from `window`. */
  detach(_target: EventTarget): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('gamepadconnected', this.onGamepadConnected as EventListener)
      window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected as EventListener)
    }
  }

  /**
   * Snapshot gamepad state for this frame. Must be called in `onBeforeUpdate()`.
   * Calls `navigator.getGamepads()` once and copies button states to primitives.
   */
  update(): void {
    this.prevButtonStates = this.currButtonStates

    const pads =
      typeof navigator !== 'undefined' && navigator.getGamepads
        ? Array.from(navigator.getGamepads())
        : []

    this.snapshot = pads
    this.currButtonStates = pads.map((gp) =>
      gp ? Array.from(gp.buttons, (b) => b.pressed) : [],
    )
  }

  /** Reset all snapshots to empty. */
  reset(): void {
    this.snapshot = []
    this.currButtonStates = []
    this.prevButtonStates = []
  }

  /**
   * Returns `true` if the button is currently held (`justPressed` or `held`).
   * @param padIndex Gamepad slot index
   * @param btnIndex Button index
   */
  isButtonPressed(padIndex: number, btnIndex: number): boolean {
    return this.currButtonStates[padIndex]?.[btnIndex] ?? false
  }

  /**
   * Returns `true` only on the first frame the button transitions to pressed (rising edge).
   * @param padIndex Gamepad slot index
   * @param btnIndex Button index
   */
  isButtonJustPressed(padIndex: number, btnIndex: number): boolean {
    const curr = this.currButtonStates[padIndex]?.[btnIndex] ?? false
    const prev = this.prevButtonStates[padIndex]?.[btnIndex] ?? false
    return curr && !prev
  }

  /**
   * Returns `true` only on the first frame after the button is released (falling edge).
   * @param padIndex Gamepad slot index
   * @param btnIndex Button index
   */
  isButtonJustReleased(padIndex: number, btnIndex: number): boolean {
    const curr = this.currButtonStates[padIndex]?.[btnIndex] ?? false
    const prev = this.prevButtonStates[padIndex]?.[btnIndex] ?? false
    return !curr && prev
  }

  /**
   * Analog button / trigger value in the range 0–1.
   * @param padIndex Gamepad slot index
   * @param btnIndex Button index
   */
  getButtonValue(padIndex: number, btnIndex: number): number {
    return this.snapshot[padIndex]?.buttons[btnIndex]?.value ?? 0
  }

  /**
   * Axis value with deadzone applied. Returns 0 when `|raw| ≤ deadzone`.
   * @param padIndex Gamepad slot index
   * @param axisIndex Axis index
   */
  getAxis(padIndex: number, axisIndex: number): number {
    const raw = this.snapshot[padIndex]?.axes[axisIndex] ?? 0
    return Math.abs(raw) > this.deadzone ? raw : 0
  }

  /**
   * Left analog stick (axes 0, 1) with deadzone applied.
   * @param padIndex Gamepad slot index
   */
  getLeftStick(padIndex: number): { x: number; y: number } {
    return {
      x: this.getAxis(padIndex, 0),
      y: this.getAxis(padIndex, 1),
    }
  }

  /**
   * Right analog stick (axes 2, 3) with deadzone applied.
   * @param padIndex Gamepad slot index
   */
  getRightStick(padIndex: number): { x: number; y: number } {
    return {
      x: this.getAxis(padIndex, 2),
      y: this.getAxis(padIndex, 3),
    }
  }

  /** Total number of currently connected gamepads. */
  connectedCount(): number {
    return this.snapshot.filter(Boolean).length
  }

  /** Array of slot indices for all currently connected gamepads. */
  getConnectedIndices(): number[] {
    return this.snapshot.reduce<number[]>((acc, gp, i) => {
      if (gp) acc.push(i)
      return acc
    }, [])
  }

  /**
   * Returns `true` if a gamepad is connected in the given slot.
   * @param padIndex Gamepad slot index
   */
  isConnected(padIndex: number): boolean {
    return this.snapshot[padIndex] != null
  }
}
