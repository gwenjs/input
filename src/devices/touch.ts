/**
 * TouchDevice — stub for Phase 6.
 *
 * Will implement touch points, virtual joystick, virtual button, and gesture
 * detection when Phase 6 is implemented.
 */

import type { InputDevice } from './index.js'

export class TouchDevice implements InputDevice {
  // TODO Phase 6: touch points, virtual joystick, virtual button, gesture detection

  /** @internal Phase 6 stub — no-op. */
  attach(_target: EventTarget): void {}

  /** @internal Phase 6 stub — no-op. */
  detach(_target: EventTarget): void {}

  /** @internal Phase 6 stub — no-op. */
  update(): void {}

  /** @internal Phase 6 stub — no-op. */
  reset(): void {}
}
