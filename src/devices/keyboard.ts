/**
 * KeyboardDevice — tracks key states per frame using a 4-state machine.
 *
 * Key states:
 *   Idle → JustPressed → Held → JustReleased → Idle
 *
 * Rules:
 *  - JustPressed: only on the FIRST frame a key is down
 *  - Held: all subsequent frames while the key is held
 *  - JustReleased: only on the FIRST frame after a key is released
 *  - Idle: key is not pressed
 *
 * Registers a `blur` listener on `window` to reset all states when the
 * page loses focus, preventing stuck keys.
 */

import type { InputDevice } from "./index.js";
import { ButtonStateMachine } from "./button-state-machine.js";

export type KeyState = "idle" | "justPressed" | "held" | "justReleased";

export class KeyboardDevice implements InputDevice {
  private machine = new ButtonStateMachine<string>();

  private onKeyDown = (e: KeyboardEvent): void => {
    this.machine.press(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.machine.release(e.code);
  };

  private onBlur = (): void => {
    this.reset();
  };

  /** Attach `keydown`, `keyup` listeners to `target` and `blur` on `window`. */
  attach(target: EventTarget): void {
    target.addEventListener("keydown", this.onKeyDown as EventListener);
    target.addEventListener("keyup", this.onKeyUp as EventListener);
    if (typeof window !== "undefined") {
      window.addEventListener("blur", this.onBlur);
    }
  }

  /** Remove all event listeners. */
  detach(target: EventTarget): void {
    target.removeEventListener("keydown", this.onKeyDown as EventListener);
    target.removeEventListener("keyup", this.onKeyUp as EventListener);
    if (typeof window !== "undefined") {
      window.removeEventListener("blur", this.onBlur);
    }
  }

  /** Advance key states to the next frame. Must be called in `onBeforeUpdate()`. */
  update(): void {
    this.machine.update();
  }

  /** Reset all key states to idle. Call when the window loses focus. */
  reset(): void {
    this.machine.reset();
  }

  /**
   * Get the current 4-state value for a key.
   * @param key Key code (e.g. `'Space'`, `'KeyW'`, `'ArrowUp'`)
   */
  getState(key: string): KeyState {
    return this.machine.getState(key);
  }

  /**
   * Returns `true` only on the first frame the key transitions to pressed.
   * @param key Key code
   */
  isJustPressed(key: string): boolean {
    return this.machine.getState(key) === "justPressed";
  }

  /**
   * Returns `true` on every frame the key is down (`justPressed` or `held`).
   * @param key Key code
   */
  isPressed(key: string): boolean {
    const s = this.machine.getState(key);
    return s === "justPressed" || s === "held";
  }

  /**
   * Returns `true` when the key has been held for more than one frame.
   * @param key Key code
   */
  isHeld(key: string): boolean {
    return this.machine.getState(key) === "held";
  }

  /**
   * Returns `true` only on the first frame after the key is released.
   * @param key Key code
   */
  isJustReleased(key: string): boolean {
    return this.machine.getState(key) === "justReleased";
  }

  /**
   * Returns all key codes that transitioned to pressed this frame.
   * Used by `captureNextInput` to detect the first key press.
   */
  getJustPressedKeys(): string[] {
    return this.machine.getJustPressed();
  }
}
