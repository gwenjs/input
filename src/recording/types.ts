/**
 * Recording / playback types for `@gwenjs/input`.
 *
 * @module
 */

// ─── Change value ────────────────────────────────────────────────────────────

/** The serialisable value of a single recorded action state. */
export type InputRecordingChangeValue = boolean | number | { x: number; y: number }

// ─── InputRecordingChange ────────────────────────────────────────────────────

/**
 * A single per-player, per-action value change in a recording frame.
 * `actionIndex` is a zero-based index into `InputRecording.actionNames`.
 */
export interface InputRecordingChange {
  /** Zero-based player slot index. */
  readonly player: number
  /** Index into `InputRecording.actionNames`. */
  readonly actionIndex: number
  /** Recorded action value — `boolean` for buttons, `number` for axis1d, `{x,y}` for axis2d. */
  readonly value: InputRecordingChangeValue
}

// ─── InputRecordingFrame ─────────────────────────────────────────────────────

/**
 * A single delta-encoded frame in a recording.
 * Only frames that contain at least one changed action value are stored.
 */
export interface InputRecordingFrame {
  /** Absolute frame index within the full recording. */
  readonly index: number
  /** All action-value changes for this frame. */
  readonly changes: ReadonlyArray<InputRecordingChange>
}

// ─── InputRecording ──────────────────────────────────────────────────────────

/**
 * A complete, serialisable delta-encoded input recording.
 *
 * @example
 * ```typescript
 * const json = InputRecording.toJSON(recorder.export())
 * const rec  = InputRecording.fromJSON(JSON.parse(json))
 * playback.load(rec)
 * playback.play()
 * ```
 */
export interface InputRecording {
  /** Format version — always `1`. */
  readonly version: 1
  /** Total number of frames captured (including frames with no changes). */
  readonly frameCount: number
  /** The frames-per-second rate at which the recording was captured. */
  readonly targetFps: number
  /** Number of player slots captured. */
  readonly playerCount: number
  /**
   * Ordered list of all action names captured.
   * `InputRecordingChange.actionIndex` is an index into this array.
   */
  readonly actionNames: string[]
  /**
   * Delta-encoded frames — only frames with at least one changed value are stored.
   * Sorted ascending by `index`.
   */
  readonly frames: ReadonlyArray<InputRecordingFrame>
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace InputRecording {
  /**
   * Validates and parses a raw (unknown) value into an `InputRecording`.
   *
   * @param raw - Value to validate — typically the result of `JSON.parse(...)`.
   * @returns A validated `InputRecording`.
   * @throws {Error} If `raw` does not match the expected structure.
   */
  export function fromJSON(raw: unknown): InputRecording {
    if (typeof raw !== 'object' || raw === null) {
      throw new Error('[@gwenjs/input] InputRecording.fromJSON: expected an object')
    }

    const r = raw as Record<string, unknown>

    if (r['version'] !== 1) {
      throw new Error(
        `[@gwenjs/input] InputRecording.fromJSON: unsupported version "${String(r['version'])}" (expected 1)`,
      )
    }
    if (typeof r['frameCount'] !== 'number' || r['frameCount'] < 0) {
      throw new Error('[@gwenjs/input] InputRecording.fromJSON: invalid frameCount')
    }
    if (typeof r['targetFps'] !== 'number' || r['targetFps'] <= 0) {
      throw new Error('[@gwenjs/input] InputRecording.fromJSON: invalid targetFps')
    }
    if (typeof r['playerCount'] !== 'number' || r['playerCount'] < 1) {
      throw new Error('[@gwenjs/input] InputRecording.fromJSON: invalid playerCount')
    }
    if (!Array.isArray(r['actionNames']) || r['actionNames'].some(n => typeof n !== 'string')) {
      throw new Error('[@gwenjs/input] InputRecording.fromJSON: actionNames must be a string[]')
    }
    if (!Array.isArray(r['frames'])) {
      throw new Error('[@gwenjs/input] InputRecording.fromJSON: frames must be an array')
    }

    const actionCount = (r['actionNames'] as string[]).length

    const frames: InputRecordingFrame[] = (r['frames'] as unknown[]).map((f, fi) => {
      if (typeof f !== 'object' || f === null) {
        throw new Error(`[@gwenjs/input] InputRecording.fromJSON: frame[${fi}] must be an object`)
      }
      const fr = f as Record<string, unknown>
      if (typeof fr['index'] !== 'number') {
        throw new Error(`[@gwenjs/input] InputRecording.fromJSON: frame[${fi}].index must be a number`)
      }
      if (!Array.isArray(fr['changes'])) {
        throw new Error(`[@gwenjs/input] InputRecording.fromJSON: frame[${fi}].changes must be an array`)
      }
      const changes: InputRecordingChange[] = (fr['changes'] as unknown[]).map((c, ci) => {
        if (typeof c !== 'object' || c === null) {
          throw new Error(`[@gwenjs/input] InputRecording.fromJSON: frame[${fi}].changes[${ci}] must be an object`)
        }
        const ch = c as Record<string, unknown>
        if (typeof ch['player'] !== 'number') {
          throw new Error(`[@gwenjs/input] InputRecording.fromJSON: changes[${ci}].player must be a number`)
        }
        if (typeof ch['actionIndex'] !== 'number' || ch['actionIndex'] < 0 || ch['actionIndex'] >= actionCount) {
          throw new Error(
            `[@gwenjs/input] InputRecording.fromJSON: changes[${ci}].actionIndex out of range`,
          )
        }
        const v = ch['value']
        if (
          typeof v !== 'boolean' &&
          typeof v !== 'number' &&
          !(typeof v === 'object' && v !== null && typeof (v as Record<string, unknown>)['x'] === 'number' && typeof (v as Record<string, unknown>)['y'] === 'number')
        ) {
          throw new Error(
            `[@gwenjs/input] InputRecording.fromJSON: changes[${ci}].value must be boolean | number | {x,y}`,
          )
        }
        return {
          player: ch['player'] as number,
          actionIndex: ch['actionIndex'] as number,
          value: v as InputRecordingChangeValue,
        }
      })
      return { index: fr['index'] as number, changes }
    })

    return {
      version: 1,
      frameCount: r['frameCount'] as number,
      targetFps: r['targetFps'] as number,
      playerCount: r['playerCount'] as number,
      actionNames: r['actionNames'] as string[],
      frames,
    }
  }

  /**
   * Serialises an `InputRecording` to a JSON string.
   *
   * @param rec - The recording to serialise.
   * @returns A JSON string suitable for storage or transmission.
   */
  export function toJSON(rec: InputRecording): string {
    return JSON.stringify(rec)
  }
}

// ─── InputRecordingState ─────────────────────────────────────────────────────

/**
 * The state of the input recording / playback system.
 *
 * - `'idle'`      — no recording or playback in progress
 * - `'recording'` — actively capturing input frames
 * - `'playing'`   — playing back a loaded recording
 * - `'paused'`    — playback is loaded but paused
 */
export type InputRecordingState = 'idle' | 'recording' | 'playing' | 'paused'
