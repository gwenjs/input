/**
 * Standard Gamepad button indices (W3C Gamepad API standard layout).
 * Corresponds to `Gamepad.buttons[index]`.
 *
 * @example
 * ```typescript
 * bind(Jump, GamepadButtons.South)     // A on Xbox, Cross on PlayStation
 * bind(Confirm, GamepadButtons.South)
 * bind(Cancel, GamepadButtons.East)    // B on Xbox, Circle on PlayStation
 * ```
 */
export const GamepadButtons = {
  South: 0,    // A (Xbox), Cross (PS)
  East: 1,     // B (Xbox), Circle (PS)
  West: 2,     // X (Xbox), Square (PS)
  North: 3,    // Y (Xbox), Triangle (PS)
  LeftBump: 4,   // LB / L1
  RightBump: 5,  // RB / R1
  LeftTrigger: 6,   // LT / L2
  RightTrigger: 7,  // RT / R2
  Select: 8,     // Back / Select / Share
  Start: 9,      // Start / Options / Menu
  LeftThumb: 10,   // L3 — left stick click
  RightThumb: 11,  // R3 — right stick click
  DPadUp: 12,
  DPadDown: 13,
  DPadLeft: 14,
  DPadRight: 15,
  Home: 16,    // Xbox / PS button
} as const

/** A standard gamepad button index. */
export type GamepadButtonId = typeof GamepadButtons[keyof typeof GamepadButtons]

/**
 * Gamepad stick sources for 2D axis bindings.
 * Maps to the W3C axes array indices.
 *
 * @example
 * ```typescript
 * bind(Move, GamepadStick.Left)                              // full 2D stick
 * bind(LookX, GamepadStick.RightX, { processors: [Scale(2)] })  // single axis
 * ```
 */
export const GamepadStick = {
  /** Left stick — full axis2d (axes[0] = X, axes[1] = Y). */
  Left: 'gamepad:stick:left' as const,
  /** Right stick — full axis2d (axes[2] = X, axes[3] = Y). */
  Right: 'gamepad:stick:right' as const,
  /** Left stick X axis only — axis1d. */
  LeftX: 'gamepad:stick:left:x' as const,
  /** Left stick Y axis only — axis1d. */
  LeftY: 'gamepad:stick:left:y' as const,
  /** Right stick X axis only — axis1d. */
  RightX: 'gamepad:stick:right:x' as const,
  /** Right stick Y axis only — axis1d. */
  RightY: 'gamepad:stick:right:y' as const,
} as const

/** A gamepad stick source identifier. */
export type GamepadStickId = typeof GamepadStick[keyof typeof GamepadStick]

/**
 * Gyroscope axis sources for 1D/2D axis bindings.
 *
 * @example
 * ```typescript
 * bind(Steer, GyroAxis.Roll, { processors: [DeadZone(3, 'degrees'), Scale(1/45), Clamp(-1, 1)] })
 * bind(AimCamera, GyroAxis.RotationRate, { processors: [Scale(0.004)] })
 * ```
 */
export const GyroAxis = {
  /** Device beta angle — tilt forward/back → axis1d (degrees, -180 to 180). */
  Roll: 'gyro:roll' as const,
  /** Device gamma angle — tilt left/right → axis1d (degrees, -90 to 90). */
  Pitch: 'gyro:pitch' as const,
  /** Device alpha angle — compass rotation → axis1d (degrees, 0 to 360). */
  Yaw: 'gyro:yaw' as const,
  /** Angular velocity (beta+gamma rates) → axis2d in deg/s. Ideal for gyro aiming. */
  RotationRate: 'gyro:rotation-rate' as const,
} as const

/** A gyroscope axis source identifier. */
export type GyroAxisId = typeof GyroAxis[keyof typeof GyroAxis]
