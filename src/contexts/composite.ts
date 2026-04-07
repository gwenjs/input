import type { CompositeSource, Composite1DSource } from './binding.js'

/**
 * Creates a 4-key composite source that emits an `axis2d` value.
 *
 * The four keys are sampled each frame: `up` contributes +Y, `down` -Y,
 * `right` +X, `left` -X. The resulting vector is normalized if both axes
 * are active simultaneously (diagonal).
 *
 * @param keys - The four key codes for each cardinal direction.
 * @returns A `CompositeSource` to use as a binding source.
 *
 * @example
 * ```typescript
 * bind(Move, Composite2D({ up: Keys.W, down: Keys.S, left: Keys.A, right: Keys.D }))
 * bind(Move, Composite2D({ up: Keys.ArrowUp, down: Keys.ArrowDown, left: Keys.ArrowLeft, right: Keys.ArrowRight }))
 * ```
 */
export function Composite2D(keys: {
  up: string
  down: string
  left: string
  right: string
}): CompositeSource {
  return { _type: 'composite2d', ...keys }
}

/**
 * Creates a 2-key composite source that emits an `axis1d` value.
 *
 * The negative key contributes -1, the positive key +1. If both are held,
 * they cancel out to 0.
 *
 * @param keys - The two key codes for negative and positive directions.
 * @returns A `Composite1DSource` to use as a binding source.
 *
 * @example
 * ```typescript
 * bind(Drift, Composite({ negative: Keys.ArrowLeft, positive: Keys.ArrowRight }))
 * ```
 */
export function Composite(keys: { negative: string; positive: string }): Composite1DSource {
  return { _type: 'composite1d', ...keys }
}
