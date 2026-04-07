import type { GestureSource, VirtualSource } from './binding.js'

/**
 * Touch gesture binding sources.
 *
 * All gesture sources feed into the action system as standard button or axis bindings.
 * They work identically to physical device bindings — processors and interactions apply normally.
 */
export const TouchGesture = {
  /**
   * A finger tap gesture → `button` source.
   *
   * `isJustTriggered` fires when the gesture completes (finger lifts within `maxDuration`).
   *
   * @param options - Tap configuration.
   * @param options.fingers - Number of fingers required (default: 1).
   * @param options.maxDuration - Documentation hint only. Tap detection uses a global 200ms / 10px
   *   threshold. Per-binding threshold configuration is not yet supported.
   *
   * @example
   * ```typescript
   * bind(Jump, TouchGesture.Tap({ fingers: 1 }))
   * bind(Dodge, TouchGesture.Tap({ fingers: 2 }))
   * ```
   */
  Tap(options: { fingers?: number; maxDuration?: number } = {}): GestureSource {
    return { _type: 'gesture:tap', fingers: options.fingers ?? 1, maxDuration: options.maxDuration ?? 0.3 }
  },

  /**
   * A directional swipe gesture → `button` source.
   *
   * @param options - Swipe configuration.
   * @param options.direction - Required swipe direction.
   * @param options.minDistance - Documentation hint only. Swipe detection uses a global 50px
   *   minimum distance and 0.3 px/ms minimum velocity threshold.
   *   Per-binding threshold configuration is not yet supported.
   *
   * @example
   * ```typescript
   * bind(Roll, TouchGesture.Swipe({ direction: 'right' }))
   * ```
   */
  Swipe(options: { direction: 'up' | 'down' | 'left' | 'right'; minDistance?: number }): GestureSource {
    return { _type: 'gesture:swipe', direction: options.direction, minDistance: options.minDistance ?? 50 }
  },

  /**
   * A two-finger pinch gesture → `axis1d` source.
   *
   * Emits a scale delta: positive = spreading apart (zoom in), negative = pinching together (zoom out).
   *
   * @example
   * ```typescript
   * bind(Zoom, TouchGesture.Pinch(), { processors: [Scale(0.01)] })
   * ```
   */
  Pinch(): GestureSource {
    return { _type: 'gesture:pinch' }
  },

  /**
   * A two-finger rotation gesture → `axis1d` source.
   *
   * Emits rotation delta in radians per frame.
   *
   * @example
   * ```typescript
   * bind(RotateObject, TouchGesture.Rotate(), { processors: [Scale(2)] })
   * ```
   */
  Rotate(): GestureSource {
    return { _type: 'gesture:rotate' }
  },
} as const

/**
 * Creates a virtual on-screen joystick source → `axis2d`.
 *
 * The joystick must be declared in `InputPluginConfig.touch.virtualJoysticks`
 * with a matching `id`. Virtual joysticks auto-show on touch devices and
 * auto-hide on desktop.
 *
 * @param id - The joystick ID declared in `InputPluginConfig.touch.virtualJoysticks`.
 *
 * @example
 * ```typescript
 * // In plugin config:
 * InputPlugin({ touch: { virtualJoysticks: [{ id: 'move-stick', side: 'left', size: 120 }] } })
 *
 * // In binding:
 * bind(Move, VirtualJoystick('move-stick'))
 * ```
 */
export function VirtualJoystick(id: string): VirtualSource {
  return { _type: 'virtual:joystick', id }
}

/**
 * Creates a virtual on-screen button source → `button`.
 *
 * The button must be declared in `InputPluginConfig.touch.virtualButtons`
 * with a matching `id`.
 *
 * @param id - The button ID declared in `InputPluginConfig.touch.virtualButtons`.
 *
 * @example
 * ```typescript
 * bind(Jump, VirtualButton('jump-btn'))
 * ```
 */
export function VirtualButton(id: string): VirtualSource {
  return { _type: 'virtual:button', id }
}
