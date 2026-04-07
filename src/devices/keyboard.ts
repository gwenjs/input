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

export type KeyState = "idle" | "justPressed" | "held" | "justReleased";

export class KeyboardDevice implements InputDevice {
  private states = new Map<string, KeyState>();
  private pendingDown = new Set<string>();
  private pendingUp = new Set<string>();

  private onKeyDown = (e: KeyboardEvent): void => {
    const key = e.code;
    const current = this.states.get(key);
    if (!current || current === "idle" || current === "justReleased") {
      this.pendingDown.add(key);
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.pendingUp.add(e.code);
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
    for (const [key, state] of this.states) {
      if (state === "justReleased") {
        this.states.set(key, "idle");
      } else if (state === "justPressed" || state === "held") {
        if (!this.pendingUp.has(key)) {
          this.states.set(key, "held");
        }
      }
    }

    for (const key of this.pendingDown) {
      this.states.set(key, "justPressed");
    }
    this.pendingDown.clear();

    for (const key of this.pendingUp) {
      const current = this.states.get(key);
      if (current === "justPressed" || current === "held") {
        this.states.set(key, "justReleased");
      } else {
        this.states.set(key, "idle");
      }
    }
    this.pendingUp.clear();
  }

  /** Reset all key states to idle. Call when the window loses focus. */
  reset(): void {
    for (const key of this.states.keys()) {
      this.states.set(key, "idle");
    }
    this.pendingDown.clear();
    this.pendingUp.clear();
  }

  /**
   * Get the current 4-state value for a key.
   * @param key Key code (e.g. `'Space'`, `'KeyW'`, `'ArrowUp'`)
   */
  getState(key: string): KeyState {
    return this.states.get(key) ?? "idle";
  }

  /**
   * Returns `true` only on the first frame the key transitions to pressed.
   * @param key Key code
   */
  isJustPressed(key: string): boolean {
    return this.states.get(key) === "justPressed";
  }

  /**
   * Returns `true` on every frame the key is down (`justPressed` or `held`).
   * @param key Key code
   */
  isPressed(key: string): boolean {
    const s = this.states.get(key);
    return s === "justPressed" || s === "held";
  }

  /**
   * Returns `true` when the key has been held for more than one frame.
   * @param key Key code
   */
  isHeld(key: string): boolean {
    return this.states.get(key) === "held";
  }

  /**
   * Returns `true` only on the first frame after the key is released.
   * @param key Key code
   */
  isJustReleased(key: string): boolean {
    return this.states.get(key) === "justReleased";
  }
}
