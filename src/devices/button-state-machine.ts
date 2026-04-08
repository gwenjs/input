/**
 * Shared 4-state button/key state machine used by `KeyboardDevice` and `MouseDevice`.
 *
 * State transitions per frame:
 *   idle → justPressed → held → justReleased → idle
 *
 * Rules:
 *  - `justPressed`: only on the first frame a key/button goes down
 *  - `held`: all subsequent frames while held
 *  - `justReleased`: only on the first frame after release
 *  - `idle`: not pressed
 */

export type ButtonState = "idle" | "justPressed" | "held" | "justReleased";

export class ButtonStateMachine<TKey extends string | number> {
  private states = new Map<TKey, ButtonState>();
  private pendingDown = new Set<TKey>();
  private pendingUp = new Set<TKey>();

  /** Schedule a key/button as pressed for the next `update()`. */
  press(key: TKey): void {
    const current = this.states.get(key);
    if (!current || current === "idle" || current === "justReleased") {
      this.pendingDown.add(key);
    }
  }

  /** Schedule a key/button as released for the next `update()`. */
  release(key: TKey): void {
    this.pendingUp.add(key);
  }

  /** Advance all states by one frame. Must be called once per frame. */
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

  /** Reset all states to idle. Call when focus is lost. */
  reset(): void {
    for (const key of this.states.keys()) {
      this.states.set(key, "idle");
    }
    this.pendingDown.clear();
    this.pendingUp.clear();
  }

  /** Get the current state for a key/button. Returns `"idle"` if never seen. */
  getState(key: TKey): ButtonState {
    return this.states.get(key) ?? "idle";
  }

  /** Returns all keys/buttons in `justPressed` state this frame. */
  getJustPressed(): TKey[] {
    const result: TKey[] = [];
    for (const [key, state] of this.states) {
      if (state === "justPressed") result.push(key);
    }
    return result;
  }
}
