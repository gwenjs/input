import { useMouse } from './use-mouse.js'
import { useTouch } from './use-touch.js'

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
  const touch = useTouch()

  // TouchDevice is a Phase 6 stub — guard all touch API calls with optional chaining
  const touchAny = touch as unknown as Record<string, unknown>
  const isTouching =
    typeof touchAny.isTouching === 'function'
      ? (touchAny.isTouching as () => boolean)()
      : (touchAny.pointCount as number | undefined) != null
        ? (touchAny.pointCount as number) > 0
        : false

  if (isTouching) {
    const points = touchAny.points as Map<number, { position: { x: number; y: number }; deltaPosition: { x: number; y: number } }> | undefined
    const firstPoint = points ? [...points.values()][0] : undefined
    return {
      type: 'touch',
      position: firstPoint?.position ?? { x: 0, y: 0 },
      delta: firstPoint?.deltaPosition ?? { x: 0, y: 0 },
      isPressed: ((touchAny.pointCount as number | undefined) ?? 0) > 0,
      // TODO Phase 6: implement isJustPressed / isJustReleased when TouchDevice is fully implemented
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
