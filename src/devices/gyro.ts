/**
 * GyroDevice — reads device orientation and motion via the W3C DeviceOrientation API.
 *
 * Orientation is sourced from `DeviceOrientationEvent` (alpha/beta/gamma).
 * Velocity is sourced from `DeviceMotionEvent` (rotationRate).
 *
 * A low-pass filter is applied each frame:
 *   `smoothed = smoothed * (1 − smoothing) + raw * smoothing`
 *
 * `isAvailable` becomes `true` after the first `deviceorientation` event fires.
 * Check this before consuming orientation values to avoid reading stale zeros
 * on devices that do not support the API.
 *
 * Both listeners are attached to `window` regardless of the `target` parameter,
 * because `DeviceOrientationEvent` and `DeviceMotionEvent` only fire on `window`.
 */

import type { InputDevice } from './index.js'

export interface GyroState {
  /** Left/right tilt in degrees, -90 to 90. Maps to DeviceOrientationEvent.gamma. */
  roll: number
  /** Front/back tilt in degrees, -180 to 180. Maps to DeviceOrientationEvent.beta. */
  pitch: number
  /** Compass heading in degrees, 0 to 360. Maps to `DeviceOrientationEvent.alpha`. */
  yaw: number
}

export interface GyroVelocity {
  /** Rotation rate around z-axis in deg/s. */
  alpha: number
  /** Rotation rate around x-axis in deg/s. */
  beta: number
  /** Rotation rate around y-axis in deg/s. */
  gamma: number
}

export class GyroDevice implements InputDevice {
  private _orientation: GyroState = { roll: 0, pitch: 0, yaw: 0 }
  private _rawOrientation: GyroState = { roll: 0, pitch: 0, yaw: 0 }
  private _velocity: GyroVelocity = { alpha: 0, beta: 0, gamma: 0 }
  private _isAvailable = false

  private onOrientation = (e: DeviceOrientationEvent): void => {
    this._isAvailable = true
    this._rawOrientation.yaw = e.alpha ?? 0
    this._rawOrientation.pitch = e.beta ?? 0
    this._rawOrientation.roll = e.gamma ?? 0
  }

  private onMotion = (e: DeviceMotionEvent): void => {
    const rate = e.rotationRate
    if (rate) {
      this._velocity.alpha = rate.alpha ?? 0
      this._velocity.beta = rate.beta ?? 0
      this._velocity.gamma = rate.gamma ?? 0
    }
  }

  constructor(
    private smoothing = 0.1,
    private deadZone = 0.02,
  ) {}

  /**
   * Attach `deviceorientation` and `devicemotion` listeners to `window`.
   * The `target` parameter is ignored — these events only fire on `window`.
   */
  attach(_target: EventTarget): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('deviceorientation', this.onOrientation as EventListener)
      window.addEventListener('devicemotion', this.onMotion as EventListener)
    }
  }

  /** Remove `deviceorientation` and `devicemotion` listeners from `window`. */
  detach(_target: EventTarget): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('deviceorientation', this.onOrientation as EventListener)
      window.removeEventListener('devicemotion', this.onMotion as EventListener)
    }
  }

  /** Apply low-pass filter smoothing to orientation. Must be called in `onBeforeUpdate()`. */
  update(): void {
    const s = this.smoothing
    const inv = 1 - s

    const newRoll = this._orientation.roll * inv + this._rawOrientation.roll * s
    const newPitch = this._orientation.pitch * inv + this._rawOrientation.pitch * s
    const newYaw = this._orientation.yaw * inv + this._rawOrientation.yaw * s

    this._orientation.roll = Math.abs(newRoll - this._orientation.roll) > this.deadZone ? newRoll : this._orientation.roll
    this._orientation.pitch = Math.abs(newPitch - this._orientation.pitch) > this.deadZone ? newPitch : this._orientation.pitch
    this._orientation.yaw = Math.abs(newYaw - this._orientation.yaw) > this.deadZone ? newYaw : this._orientation.yaw
  }

  /** Reset orientation and velocity to zero. */
  reset(): void {
    this._orientation = { roll: 0, pitch: 0, yaw: 0 }
    this._rawOrientation = { roll: 0, pitch: 0, yaw: 0 }
    this._velocity = { alpha: 0, beta: 0, gamma: 0 }
    this._isAvailable = false
  }

  /** Current smoothed device orientation. */
  get orientation(): Readonly<GyroState> {
    return this._orientation
  }

  /** Current device rotation rate in degrees per second. */
  get velocity(): Readonly<GyroVelocity> {
    return this._velocity
  }

  /** `true` once the first `deviceorientation` event has fired. Check before reading values. */
  get isAvailable(): boolean {
    return this._isAvailable
  }
}
