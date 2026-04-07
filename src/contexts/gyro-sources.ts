import type { GestureSource } from "./binding.js";

/**
 * Motion gesture binding sources for gyroscope/accelerometer input.
 */
export const MotionGesture = {
  /**
   * A device shake gesture → `button` source.
   *
   * Fires `isJustTriggered` when acceleration exceeds the threshold.
   * Useful for "shake to undo", "shake to randomize", etc.
   *
   * @param options - Shake configuration.
   * @param options.threshold - Acceleration threshold in m/s² (default: 15).
   *
   * @example
   * ```typescript
   * bind(Undo, MotionGesture.Shake({ threshold: 15 }))
   * ```
   */
  Shake(options: { threshold?: number } = {}): GestureSource {
    return { _type: "motion:shake", threshold: options.threshold ?? 15 };
  },

  /**
   * A sustained device tilt past a threshold → `button` source.
   *
   * @param options - Tilt configuration.
   * @param options.axis - Which tilt axis to monitor.
   * @param options.degrees - Tilt angle threshold in degrees.
   *
   * @example
   * ```typescript
   * bind(LeanLeft, MotionGesture.Tilt({ axis: 'roll', degrees: 30 }))
   * ```
   */
  Tilt(options: { axis: "roll" | "pitch"; degrees: number }): GestureSource {
    return { _type: "motion:tilt", axis: options.axis, degrees: options.degrees };
  },
} as const;
