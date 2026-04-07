import type { InteractionDescriptor } from '../contexts/binding.js'

// ─── InteractionResult ────────────────────────────────────────────────────────

/**
 * The computed interaction state for a single binding on a single frame.
 */
export interface InteractionResult {
  /** True while the interaction is active (held or toggled on). */
  isPressed: boolean
  /** True on the first frame the interaction fires. */
  isJustTriggered: boolean
  /** True on the first frame the interaction ends. */
  isJustReleased: boolean
  /** Accumulated seconds the interaction has been active. Resets to 0 when inactive. */
  holdTime: number
}

// ─── Per-interaction state shapes ─────────────────────────────────────────────

interface PressState {
  wasPressed: boolean
  holdTime: number
}

interface ReleaseState {
  wasPressed: boolean
}

interface TapState {
  wasPressed: boolean
  elapsed: number
  cancelled: boolean
  pendingRelease: boolean
}

interface HoldState {
  accumulated: number
  wasTriggered: boolean
}

interface DoubleTapState {
  tapCount: number
  timeSinceLastTap: number
  wasPressed: boolean
  fired: boolean
}

interface ToggleState {
  wasPressed: boolean
  toggledOn: boolean
  holdTime: number
}

interface RepeatState {
  wasPressed: boolean
  delayRemaining: number
  intervalRemaining: number
  started: boolean
}

// ─── InteractionPipeline ─────────────────────────────────────────────────────

/**
 * Stateful interaction runtime for a single binding.
 * Each binding gets one instance, persisting across frames.
 *
 * When no descriptors are provided, `Press()` behaviour is used as the default.
 *
 * @example
 * ```typescript
 * const pipeline = new InteractionPipeline([Hold({ holdTime: 0.5 })])
 * // each frame:
 * const result = pipeline.evaluate(isRawPressed, dt, getActionState)
 * ```
 */
export class InteractionPipeline {
  private readonly descriptors: readonly InteractionDescriptor[]

  // Per-descriptor state arrays — indexed to match descriptors
  private pressStates: PressState[] = []
  private releaseStates: ReleaseState[] = []
  private tapStates: TapState[] = []
  private holdStates: HoldState[] = []
  private doubleTapStates: DoubleTapState[] = []
  private toggleStates: ToggleState[] = []
  private repeatStates: RepeatState[] = []

  constructor(descriptors: readonly InteractionDescriptor[]) {
    this.descriptors = descriptors.length > 0 ? descriptors : [{ _type: 'press' }]
    this.initStates()
  }

  private initStates(): void {
    for (const d of this.descriptors) {
      switch (d._type) {
        case 'press':
          this.pressStates.push({ wasPressed: false, holdTime: 0 })
          break
        case 'release':
          this.releaseStates.push({ wasPressed: false })
          break
        case 'tap':
          this.tapStates.push({ wasPressed: false, elapsed: 0, cancelled: false, pendingRelease: false })
          break
        case 'hold':
          this.holdStates.push({ accumulated: 0, wasTriggered: false })
          break
        case 'doubletap':
          this.doubleTapStates.push({ tapCount: 0, timeSinceLastTap: 0, wasPressed: false, fired: false })
          break
        case 'toggle':
          this.toggleStates.push({ wasPressed: false, toggledOn: false, holdTime: 0 })
          break
        case 'repeat':
          this.repeatStates.push({ wasPressed: false, delayRemaining: 0, intervalRemaining: 0, started: false })
          break
      }
    }
  }

  /**
   * Evaluate the interaction for this frame.
   *
   * Multiple descriptors in the pipeline are evaluated independently; the
   * results are OR-combined so that any firing interaction activates the action.
   *
   * @param rawPressed - Whether the raw binding source is currently pressed/active.
   * @param dt - Delta time in seconds since last frame.
   * @param getActionState - Callback to look up another action's current state (for `ChordedWith`).
   * @returns The computed interaction result for this frame.
   */
  evaluate(
    rawPressed: boolean,
    dt: number,
    getActionState?: (actionId: symbol) => InteractionResult | null,
  ): InteractionResult {
    let isPressed = false
    let isJustTriggered = false
    let isJustReleased = false
    let holdTime = 0

    // Track per-type indices for state arrays
    let pi = 0 // press
    let ri = 0 // release
    let ti = 0 // tap
    let hi = 0 // hold
    let di = 0 // doubletap
    let oi = 0 // toggle
    let ei = 0 // repeat

    // Pre-pass: resolve all ChordedWith conditions before any descriptor runs
    for (const p of this.descriptors) {
      if (p._type === 'chordedwith') {
        const depState = getActionState?.(p.actionId as symbol) ?? null
        const conditionMet = p.condition === 'isPressed'
          ? (depState?.isPressed ?? false)
          : (depState?.isJustTriggered ?? false)
        if (!conditionMet) {
          rawPressed = false
          break
        }
      }
    }

    for (const p of this.descriptors) {
      // ChordedWith: already resolved in pre-pass above
      if (p._type === 'chordedwith') {
        continue
      }

      // AllOf: Phase 5 will wire device access; descriptor only — no-op in pipeline
      if (p._type === 'allof') {
        // TODO(Phase 5): check all keys via device state resolver
        continue
      }

      switch (p._type) {
        // ── Press ──────────────────────────────────────────────────────────
        case 'press': {
          const s = this.pressStates[pi++]
          const triggered = rawPressed && !s.wasPressed
          const released = !rawPressed && s.wasPressed
          s.holdTime = rawPressed ? s.holdTime + dt : 0
          s.wasPressed = rawPressed
          if (triggered) isJustTriggered = true
          if (released) isJustReleased = true
          if (rawPressed) { isPressed = true; holdTime = Math.max(holdTime, s.holdTime) }
          break
        }

        // ── Release ────────────────────────────────────────────────────────
        case 'release': {
          const s = this.releaseStates[ri++]
          const triggered = !rawPressed && s.wasPressed
          const released = rawPressed && !s.wasPressed
          s.wasPressed = rawPressed
          if (triggered) { isJustTriggered = true; isPressed = true }
          if (released) isJustReleased = true
          break
        }

        // ── Tap ────────────────────────────────────────────────────────────
        case 'tap': {
          const s = this.tapStates[ti++]
          const maxDuration = p.maxDuration as number

          // Consume pending release from the previous frame's tap trigger
          if (s.pendingRelease) {
            isJustReleased = true
            s.pendingRelease = false
          }

          const justPressed = rawPressed && !s.wasPressed
          const justReleased = !rawPressed && s.wasPressed

          if (justPressed) {
            s.elapsed = 0
            s.cancelled = false
            s.pendingRelease = false
          }

          if (rawPressed) {
            s.elapsed += dt
            if (s.elapsed > maxDuration) s.cancelled = true
          }

          if (justReleased && !s.cancelled) {
            isJustTriggered = true
            s.pendingRelease = true
          }

          s.wasPressed = rawPressed
          break
        }

        // ── Hold ───────────────────────────────────────────────────────────
        case 'hold': {
          const s = this.holdStates[hi++]
          const requiredTime = p.holdTime as number

          s.accumulated = rawPressed ? s.accumulated + dt : 0
          const triggered = s.accumulated >= requiredTime

          if (triggered && !s.wasTriggered) isJustTriggered = true
          if (s.wasTriggered && !rawPressed) isJustReleased = true

          s.wasTriggered = triggered && rawPressed

          if (triggered && rawPressed) {
            isPressed = true
            holdTime = Math.max(holdTime, s.accumulated - requiredTime)
          }
          break
        }

        // ── DoubleTap ──────────────────────────────────────────────────────
        case 'doubletap': {
          const s = this.doubleTapStates[di++]
          const maxGap = p.maxGap as number
          const justPressed = rawPressed && !s.wasPressed
          const justReleased = !rawPressed && s.wasPressed

          // Advance the inter-tap timer while waiting for the next tap
          if (!rawPressed && s.tapCount > 0) {
            s.timeSinceLastTap += dt
            if (s.timeSinceLastTap > maxGap) {
              // Gap expired — reset
              s.tapCount = 0
              s.timeSinceLastTap = 0
            }
          }

          if (justPressed) {
            s.tapCount++
            s.timeSinceLastTap = 0
          }

          if (justReleased && s.tapCount >= 2) {
            isJustTriggered = true
            isPressed = true
            s.tapCount = 0
            s.timeSinceLastTap = 0
            s.fired = true
          }

          if (s.fired && justPressed) {
            isJustReleased = true
            s.fired = false
          }

          s.wasPressed = rawPressed
          break
        }

        // ── Toggle ─────────────────────────────────────────────────────────
        case 'toggle': {
          const s = this.toggleStates[oi++]
          const justPressed = rawPressed && !s.wasPressed

          if (justPressed) {
            s.toggledOn = !s.toggledOn
            s.holdTime = 0
            if (s.toggledOn) isJustTriggered = true
            else isJustReleased = true
          }

          if (s.toggledOn) {
            s.holdTime += dt
            isPressed = true
            holdTime = Math.max(holdTime, s.holdTime)
          }

          s.wasPressed = rawPressed
          break
        }

        // ── Repeat ────────────────────────────────────────────────────────
        case 'repeat': {
          const s = this.repeatStates[ei++]
          const interval = p.interval as number
          const delay = p.delay as number
          const justPressed = rawPressed && !s.wasPressed
          const justReleased = !rawPressed && s.wasPressed

          if (justPressed) {
            // First trigger immediately
            isJustTriggered = true
            isPressed = true
            s.started = true
            s.delayRemaining = delay
            s.intervalRemaining = interval
          } else if (rawPressed && s.started) {
            isPressed = true
            if (s.delayRemaining > 0) {
              s.delayRemaining -= dt
              if (s.delayRemaining <= 0) {
                // Carry overshoot into the interval timer
                s.intervalRemaining = interval + s.delayRemaining // delayRemaining is negative
                s.delayRemaining = 0
              }
            } else {
              s.intervalRemaining -= dt
              if (s.intervalRemaining <= 0) {
                isJustTriggered = true
                s.intervalRemaining += interval // carry over remainder
              }
            }
          }

          if (justReleased) {
            isJustReleased = true
            s.started = false
            s.delayRemaining = 0
            s.intervalRemaining = 0
          }

          s.wasPressed = rawPressed
          break
        }
      }
    }

    return { isPressed, isJustTriggered, isJustReleased, holdTime }
  }
}
