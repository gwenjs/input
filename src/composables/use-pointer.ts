import { useMouse } from './use-mouse.js'
// import { useTouch } from './use-touch.js' // TODO Phase 6: re-enable when TouchDevice is implemented

/**
 * Unified pointer state — abstracts mouse and touch into a single interface.
 * On desktop: `position` = mouse position, `isPressed` = left mouse button.
 * On touch: `position` = first touch point, `isPressed` = any touch active.
 */
export interface PointerState {
  readonly position: Readonly<{ x: number; y: number }>
  readonly isPressed: boolean
  readonly isJustPressed: boolean
  readonly isJustReleased: boolean
  readonly type: 'mouse' | 'touch'
  readonly delta: Readonly<{ x: number; y: number }>
}

/**
 * Returns the current unified pointer state (mouse or touch, whichever is active).
 *
 * When any touch point is detected, touch takes priority over mouse.
 * Falls back to mouse when no touch is active.
 *
 * Must be called inside an active engine context (inside `defineSystem()`,
 * `engine.run()`, or a plugin lifecycle hook).
 *
 * @throws {GwenPluginNotFoundError} If InputPlugin is not registered.
 *
 * @example
 * ```typescript
 * const pointer = usePointer()
 * if (pointer.isJustPressed) {
 *   handleTap(pointer.position)
 * }
 * ```
 */
export function usePointer(): PointerState {
  const mouse = useMouse()

  // TODO Phase 6: replace with touch.isTouching() when TouchDevice is implemented
  const isTouching = false

  if (isTouching) {
    return {
      type: 'touch',
      position: { x: 0, y: 0 },
      delta: { x: 0, y: 0 },
      isPressed: isTouching,
      isJustPressed: false,
      isJustReleased: false,
    }
  }

  return {
    type: 'mouse',
    position: { x: mouse.position.x, y: mouse.position.y },
    delta: { x: mouse.delta.x, y: mouse.delta.y },
    isPressed: mouse.isButtonPressed(0),
    isJustPressed: mouse.isButtonJustPressed(0),
    isJustReleased: mouse.isButtonJustReleased(0),
  }
}
