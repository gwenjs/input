/**
 * Common interface for all input device adapters.
 * Each device manages its own DOM event listeners and provides
 * a per-frame snapshot of raw input values.
 */
export interface InputDevice {
  /** Attach DOM event listeners to the given target. */
  attach(target: EventTarget): void;
  /** Remove all DOM event listeners. */
  detach(target: EventTarget): void;
  /** Advance to next frame — must be called in `onBeforeUpdate()`. */
  update(): void;
  /** Reset all states to idle/zero — call when window loses focus. */
  reset(): void;
}

export { KeyboardDevice } from "./keyboard.js";
export { MouseDevice } from "./mouse.js";
export { GamepadDevice } from "./gamepad.js";
export { TouchDevice } from "./touch.js";
export { GyroDevice } from "./gyro.js";

export type { KeyState } from "./keyboard.js";
export type { MouseButtonState, MousePosition } from "./mouse.js";
export type { TouchPoint } from "./touch.js";
export type { GyroState, GyroVelocity } from "./gyro.js";
