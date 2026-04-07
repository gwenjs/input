import type { BindingSource, CompositeSource, Composite1DSource, GestureSource, VirtualSource } from '../contexts/binding.js'
import type { KeyboardDevice } from '../devices/keyboard.js'
import type { MouseDevice } from '../devices/mouse.js'
import type { GamepadDevice } from '../devices/gamepad.js'
import type { TouchDevice } from '../devices/touch.js'
import type { GyroDevice } from '../devices/gyro.js'
import type { VirtualControlsOverlay } from '../virtual/virtual-controls-overlay.js'

/** The device type category for a player's assigned input method. */
export type DeviceType = 'keyboard+mouse' | 'gamepad' | 'touch'

/**
 * The assigned input device for a player slot.
 * `slot` is only meaningful for gamepad assignments.
 */
export interface DeviceAssignment {
  type: DeviceType
  /** Gamepad slot index (0–3). Ignored for keyboard+mouse and touch. */
  slot: number
}

/** All device instances available to a single player. */
export interface DeviceSet {
  keyboard: KeyboardDevice
  mouse: MouseDevice
  gamepad: GamepadDevice
  touch: TouchDevice
  gyro: GyroDevice
  /** Optional virtual on-screen controls overlay. Present only if configured in `InputPluginConfig.touch`. */
  virtualControls?: VirtualControlsOverlay
}

/**
 * Resolves a `BindingSource` to a raw value from the given device set.
 *
 * Return types by source kind:
 * - **Button / key**: `boolean`
 * - **Axis 1D**: `number`
 * - **Axis 2D**: `{ x: number; y: number }`
 *
 * @param source - The binding source from a `BindingEntry`.
 * @param devices - The device instances for this player.
 * @param gamepadSlot - Gamepad slot index (0–3) assigned to this player.
 */
export function resolveSource(
  source: BindingSource,
  devices: DeviceSet,
  gamepadSlot: number,
): boolean | number | { x: number; y: number } {
  // ── String sources ─────────────────────────────────────────────────────────
  if (typeof source === 'string') {
    switch (source) {
      // Gamepad sticks (2D)
      case 'gamepad:stick:left':
        return devices.gamepad.getLeftStick(gamepadSlot)
      case 'gamepad:stick:right':
        return devices.gamepad.getRightStick(gamepadSlot)

      // Gamepad single axes (1D)
      case 'gamepad:stick:left:x':
        return devices.gamepad.getAxis(gamepadSlot, 0)
      case 'gamepad:stick:left:y':
        return devices.gamepad.getAxis(gamepadSlot, 1)
      case 'gamepad:stick:right:x':
        return devices.gamepad.getAxis(gamepadSlot, 2)
      case 'gamepad:stick:right:y':
        return devices.gamepad.getAxis(gamepadSlot, 3)

      // Gyro orientation (1D)
      case 'gyro:roll':
        return devices.gyro.orientation.roll
      case 'gyro:pitch':
        return devices.gyro.orientation.pitch
      case 'gyro:yaw':
        return devices.gyro.orientation.yaw

      // Gyro rotation rate (2D — beta = forward/back tilt rate, gamma = left/right)
      case 'gyro:rotation-rate':
        return { x: devices.gyro.velocity.beta, y: devices.gyro.velocity.gamma }

      // Everything else: treat as a keyboard key code
      default:
        return devices.keyboard.isPressed(source)
    }
  }

  // ── Number source — gamepad button index ───────────────────────────────────
  if (typeof source === 'number') {
    return devices.gamepad.isButtonPressed(gamepadSlot, source)
  }

  // ── Object sources ─────────────────────────────────────────────────────────
  if (source && typeof source === 'object' && '_type' in source) {
    switch ((source as { _type: string })._type) {
      case 'composite2d': {
        const s = source as CompositeSource
        return {
          x: (devices.keyboard.isPressed(s.right) ? 1 : 0) - (devices.keyboard.isPressed(s.left) ? 1 : 0),
          y: (devices.keyboard.isPressed(s.down) ? 1 : 0) - (devices.keyboard.isPressed(s.up) ? 1 : 0),
        }
      }

      case 'composite1d': {
        const s = source as Composite1DSource
        return (
          (devices.keyboard.isPressed(s.positive) ? 1 : 0) -
          (devices.keyboard.isPressed(s.negative) ? 1 : 0)
        )
      }

      case 'mouse:delta':
        return devices.mouse.delta

      case 'mouse:wheel':
        return devices.mouse.wheel

      // Gyro sources expressed as objects (GyroSource)
      case 'gyro:roll':
        return devices.gyro.orientation.roll
      case 'gyro:pitch':
        return devices.gyro.orientation.pitch
      case 'gyro:yaw':
        return devices.gyro.orientation.yaw
      case 'gyro:rotation-rate':
        return { x: devices.gyro.velocity.beta, y: devices.gyro.velocity.gamma }

      // Touch gesture sources
      case 'gesture:tap':
      case 'gesture:swipe':
      case 'gesture:pinch':
      case 'gesture:rotate': {
        const gs = source as GestureSource
        return devices.touch.isGestureActive(gs)
          ? devices.touch.getGestureValue(gs)
          : false
      }

      // Virtual control sources
      case 'virtual:joystick':
        return devices.virtualControls?.getJoystickValue((source as VirtualSource).id) ?? { x: 0, y: 0 }

      case 'virtual:button':
        return devices.virtualControls?.isButtonPressed((source as VirtualSource).id) ?? false
    }
  }

  return false
}
