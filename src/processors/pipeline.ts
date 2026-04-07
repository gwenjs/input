import type { ProcessorDescriptor } from '../contexts/binding.js'

// ─── Raw value types ──────────────────────────────────────────────────────────

type RawValue1D = number
type RawValue2D = { x: number; y: number }
type RawButton = boolean
type RawValue = RawValue1D | RawValue2D | RawButton

// ─── Pure processor functions (not exported) ──────────────────────────────────

/**
 * Apply deadzone: if magnitude < threshold, return 0 (or {x:0,y:0}).
 */
function applyDeadzone(value: RawValue, threshold: number): RawValue {
  if (typeof value === 'boolean') return value

  if (typeof value === 'number') {
    return Math.abs(value) < threshold ? 0 : value
  }

  // 2D case: circular deadzone by magnitude
  const magnitude = Math.sqrt(value.x * value.x + value.y * value.y)
  return magnitude < threshold ? { x: 0, y: 0 } : value
}

/**
 * Apply scale: multiply by factor.
 */
function applyScale(value: RawValue, factor: number): RawValue {
  if (typeof value === 'boolean') return value

  if (typeof value === 'number') {
    return value * factor
  }

  return { x: value.x * factor, y: value.y * factor }
}

/**
 * Apply invert: multiply by -1.
 */
function applyInvert(value: RawValue): RawValue {
  if (typeof value === 'boolean') return value

  if (typeof value === 'number') {
    return -value
  }

  return { x: -value.x, y: -value.y }
}

/**
 * Apply invertX: multiply X by -1.
 */
function applyInvertX(value: RawValue): RawValue {
  if (typeof value === 'boolean' || typeof value === 'number') return value

  return { x: -value.x, y: value.y }
}

/**
 * Apply invertY: multiply Y by -1.
 */
function applyInvertY(value: RawValue): RawValue {
  if (typeof value === 'boolean' || typeof value === 'number') return value

  return { x: value.x, y: -value.y }
}

/**
 * Apply clamp: constrain to [min, max].
 */
function applyClamp(value: RawValue, min: number, max: number): RawValue {
  if (typeof value === 'boolean') return value

  if (typeof value === 'number') {
    return Math.min(Math.max(value, min), max)
  }

  return {
    x: Math.min(Math.max(value.x, min), max),
    y: Math.min(Math.max(value.y, min), max),
  }
}

/**
 * Apply normalize: ensure 2D magnitude <= 1.
 */
function applyNormalize(value: RawValue): RawValue {
  if (typeof value === 'boolean' || typeof value === 'number') return value

  const magnitude = Math.sqrt(value.x * value.x + value.y * value.y)
  if (magnitude === 0 || magnitude <= 1) return value

  return {
    x: value.x / magnitude,
    y: value.y / magnitude,
  }
}

/**
 * Apply smooth: lerp toward target.
 */
function applySmooth(value: RawValue, prev: RawValue, factor: number): RawValue {
  if (typeof value === 'boolean') return value

  if (typeof value === 'number' && typeof prev === 'number') {
    return prev * (1 - factor) + value * factor
  }

  if (
    typeof value === 'object' &&
    typeof prev === 'object' &&
    'x' in value &&
    'x' in prev
  ) {
    return {
      x: prev.x * (1 - factor) + value.x * factor,
      y: prev.y * (1 - factor) + value.y * factor,
    }
  }

  return value
}

/**
 * Apply swizzleXY: swap x and y.
 */
function applySwizzleXY(value: RawValue): RawValue {
  if (typeof value === 'boolean' || typeof value === 'number') return value

  return { x: value.y, y: value.x }
}

// ─── ProcessorPipeline ────────────────────────────────────────────────────────

/**
 * Stateful processor runtime for a single binding.
 * Created once per BindingEntry, persists across frames.
 * Required because Smooth() maintains per-binding lerp state.
 *
 * @example
 * ```typescript
 * const pipeline = new ProcessorPipeline()
 * const processed = pipeline.process(0.5, [Smooth(0.1), Clamp(-1, 1)])
 * ```
 */
export class ProcessorPipeline {
  private smoothStates: Map<number, RawValue> = new Map()

  /**
   * Apply all processors in order to a raw value.
   *
   * @param value - Raw value from device (boolean, number, or {x,y}).
   * @param processors - The processor descriptors from BindingEntry.
   * @returns Processed value (same type as input).
   *
   * @example
   * ```typescript
   * const pipeline = new ProcessorPipeline()
   * const result = pipeline.process(
   *   { x: 0.1, y: 0.05 },
   *   [DeadZone(0.15), Smooth(0.08), Normalize()]
   * )
   * ```
   */
  process(
    value: RawValue,
    processors: readonly ProcessorDescriptor[],
  ): RawValue {
    // Skip processing for button values
    if (typeof value === 'boolean') {
      return value
    }

    // Apply each processor in sequence
    for (let i = 0; i < processors.length; i++) {
      const p = processors[i]

      switch (p._type) {
        case 'deadzone':
          value = applyDeadzone(value, p.threshold as number)
          break
        case 'scale':
          value = applyScale(value, p.factor as number)
          break
        case 'invert':
          value = applyInvert(value)
          break
        case 'invertx':
          value = applyInvertX(value)
          break
        case 'inverty':
          value = applyInvertY(value)
          break
        case 'clamp':
          value = applyClamp(value, p.min as number, p.max as number)
          break
        case 'normalize':
          value = applyNormalize(value)
          break
        case 'smooth': {
          const factor = p.factor as number
          const prev = this.smoothStates.get(i) ?? (typeof value === 'number' ? 0 : { x: 0, y: 0 })
          const next = applySmooth(value, prev, factor)
          this.smoothStates.set(i, next)
          value = next
          break
        }
        case 'swizzlexy':
          value = applySwizzleXY(value)
          break
      }
    }

    return value
  }
}
