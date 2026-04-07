import type { MouseDeltaSource, MouseWheelSource } from "./binding.js";

/** Mouse button indices. */
export const MouseButton = {
  Left: 0,
  Middle: 1,
  Right: 2,
  Back: 3,
  Forward: 4,
} as const;

/**
 * Creates a mouse movement delta source → `axis2d`.
 *
 * Emits the mouse movement delta since the last frame, in canvas pixels.
 * Combine with `Scale()` to convert to a sensitivity-adjusted value.
 *
 * @example
 * ```typescript
 * bind(Camera, MouseDelta(), { processors: [Scale(0.003)] })
 * ```
 */
export function MouseDelta(): MouseDeltaSource {
  return { _type: "mouse:delta" };
}

/**
 * Creates a mouse wheel scroll source → `axis1d`.
 *
 * Emits the wheel delta this frame (positive = scroll up, negative = scroll down).
 *
 * @example
 * ```typescript
 * bind(Zoom, MouseWheel(), { processors: [Scale(0.1)] })
 * ```
 */
export function MouseWheel(): MouseWheelSource {
  return { _type: "mouse:wheel" };
}
