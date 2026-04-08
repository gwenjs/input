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

import type { InputDevice } from "./index.js";

export interface GyroState {
  /** Left/right tilt in degrees, -90 to 90. Maps to DeviceOrientationEvent.gamma. */
  roll: number;
  /** Front/back tilt in degrees, -180 to 180. Maps to DeviceOrientationEvent.beta. */
  pitch: number;
  /** Compass heading in degrees, 0 to 360. Maps to `DeviceOrientationEvent.alpha`. */
  yaw: number;
}

export interface GyroVelocity {
  /** Rotation rate around z-axis in deg/s. */
  alpha: number;
  /** Rotation rate around x-axis in deg/s. */
  beta: number;
  /** Rotation rate around y-axis in deg/s. */
  gamma: number;
}

export class GyroDevice implements InputDevice {
  private _orientation: GyroState = { roll: 0, pitch: 0, yaw: 0 };
  private _rawOrientation: GyroState = { roll: 0, pitch: 0, yaw: 0 };
  private _calibration: GyroState | null = null;
  private _rotationRate: GyroVelocity = { alpha: 0, beta: 0, gamma: 0 };
  private _acceleration: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private _isAvailable = false;
  private _isPermitted = false;

  private onOrientation = (e: DeviceOrientationEvent): void => {
    this._isAvailable = true;
    this._isPermitted = true;
    this._rawOrientation.yaw = e.alpha ?? 0;
    this._rawOrientation.pitch = e.beta ?? 0;
    this._rawOrientation.roll = e.gamma ?? 0;
  };

  private onMotion = (e: DeviceMotionEvent): void => {
    const rate = e.rotationRate;
    if (rate) {
      this._rotationRate.alpha = rate.alpha ?? 0;
      this._rotationRate.beta = rate.beta ?? 0;
      this._rotationRate.gamma = rate.gamma ?? 0;
    }
    const accel = e.accelerationIncludingGravity;
    if (accel) {
      this._acceleration.x = accel.x ?? 0;
      this._acceleration.y = accel.y ?? 0;
      this._acceleration.z = accel.z ?? 0;
    }
  };

  constructor(
    private smoothing = 0.1,
    private deadZone = 0.02,
  ) {}

  /**
   * Attach `deviceorientation` and `devicemotion` listeners to `window`.
   * The `target` parameter is ignored — these events only fire on `window`.
   */
  attach(_target: EventTarget): void {
    if (typeof window !== "undefined") {
      window.addEventListener("deviceorientation", this.onOrientation as EventListener);
      window.addEventListener("devicemotion", this.onMotion as EventListener);
    }
  }

  /** Remove `deviceorientation` and `devicemotion` listeners from `window`. */
  detach(_target: EventTarget): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("deviceorientation", this.onOrientation as EventListener);
      window.removeEventListener("devicemotion", this.onMotion as EventListener);
    }
  }

  /** Apply low-pass filter smoothing to orientation. Must be called in `onBeforeUpdate()`. */
  update(): void {
    const s = this.smoothing;
    const inv = 1 - s;

    // Apply calibration offset to raw orientation.
    const rawRoll = this._rawOrientation.roll - (this._calibration?.roll ?? 0);
    const rawPitch = this._rawOrientation.pitch - (this._calibration?.pitch ?? 0);
    const rawYaw = this._rawOrientation.yaw - (this._calibration?.yaw ?? 0);

    const newRoll = this._orientation.roll * inv + rawRoll * s;
    const newPitch = this._orientation.pitch * inv + rawPitch * s;
    const newYaw = this._orientation.yaw * inv + rawYaw * s;

    this._orientation.roll =
      Math.abs(newRoll - this._orientation.roll) > this.deadZone ? newRoll : this._orientation.roll;
    this._orientation.pitch =
      Math.abs(newPitch - this._orientation.pitch) > this.deadZone
        ? newPitch
        : this._orientation.pitch;
    this._orientation.yaw =
      Math.abs(newYaw - this._orientation.yaw) > this.deadZone ? newYaw : this._orientation.yaw;
  }

  /** Reset orientation and velocity to zero. */
  reset(): void {
    this._orientation = { roll: 0, pitch: 0, yaw: 0 };
    this._rawOrientation = { roll: 0, pitch: 0, yaw: 0 };
    this._rotationRate = { alpha: 0, beta: 0, gamma: 0 };
    this._acceleration = { x: 0, y: 0, z: 0 };
    this._calibration = null;
    this._isAvailable = false;
  }

  /**
   * Snapshots the current raw orientation as the "zero" reference.
   * Subsequent `orientation` readings will be relative to this baseline.
   * Call this after the device settles in the neutral position.
   */
  calibrate(): void {
    this._calibration = { ...this._rawOrientation };
  }

  /**
   * Clears the calibration reference so `orientation` returns raw device angles.
   */
  resetCalibration(): void {
    this._calibration = null;
  }

  /** Current smoothed device orientation, relative to calibration baseline if set. */
  get orientation(): Readonly<GyroState> {
    return this._orientation;
  }

  /**
   * Current device rotation rate in degrees per second.
   * Sourced from `DeviceMotionEvent.rotationRate`.
   */
  get rotationRate(): Readonly<GyroVelocity> {
    return this._rotationRate;
  }

  /**
   * Current device acceleration including gravity, in m/s².
   * Sourced from `DeviceMotionEvent.accelerationIncludingGravity`.
   */
  get acceleration(): Readonly<{ x: number; y: number; z: number }> {
    return this._acceleration;
  }

  /** `true` once the first `deviceorientation` event has fired. Check before reading values. */
  get isAvailable(): boolean {
    return this._isAvailable;
  }

  /**
   * `true` after the user has granted motion permission (iOS 13+).
   * Always `true` on platforms that do not require an explicit permission grant.
   */
  get isPermitted(): boolean {
    return this._isPermitted;
  }
}
