import type { ActionRef, ActionType, ActionState, ButtonActionState, Axis1DActionState, Axis2DActionState } from '../types.js'
import type { PlayerInput } from '../players/player-input.js'
import type { InputRecording, InputRecordingChangeValue, InputRecordingFrame, InputRecordingState } from './types.js'

/**
 * Drives playback of a captured `InputRecording`, overriding live device
 * input for all `PlayerInput` instances.
 *
 * Obtain an instance via `useInput().playback` or `useInputPlayback()`.
 *
 * @remarks `holdTime` is not recorded or replayed. Systems depending on `holdTime`
 * (e.g. Hold interactions checking exact hold duration) will see `holdTime: 0` during playback.
 *
 * @example
 * ```typescript
 * const playback = useInputPlayback()
 * playback.load(rec)
 * playback.play()
 * ```
 */
export class InputPlayback {
  private readonly _players: readonly PlayerInput[]

  private _recording: InputRecording | null = null
  private _state: InputRecordingState = 'idle'

  /** Fractional frame position, advanced by `_tick`. */
  private _framePosition = 0

  /**
   * Accumulated per-player, per-actionIndex values as of the current playback head.
   * Updated incrementally as frames are crossed.
   */
  private _accumulated: Map<number, InputRecordingChangeValue>[] = []

  /**
   * Per-player, per-actionIndex values from the frame immediately before the
   * current one — used to synthesise `isJustTriggered` / `isJustReleased`.
   */
  private _prevAccumulated: Map<number, InputRecordingChangeValue>[] = []

  private _completeCbs: Set<() => void> = new Set()
  private _frameCbs: Set<(frame: number) => void> = new Set()

  /** Whether playback automatically restarts after reaching the last frame. */
  loop = false

  /** Playback speed multiplier. `1` = real-time, `0.5` = half speed, `2` = double speed. */
  speed = 1

  /** @param players - All `PlayerInput` instances managed by the plugin. */
  constructor(players: readonly PlayerInput[]) {
    this._players = players
  }

  // ── Read-only state ─────────────────────────────────────────────────────────

  /** The current playback state. */
  get state(): InputRecordingState {
    return this._state
  }

  /** `true` while playback is active (not paused and not stopped). */
  get isPlaying(): boolean {
    return this._state === 'playing'
  }

  /** Current playback frame index (integer part of the fractional position). */
  get currentFrame(): number {
    return Math.floor(this._framePosition)
  }

  /** Total frame count of the loaded recording, or `0` if no recording is loaded. */
  get frameCount(): number {
    return this._recording?.frameCount ?? 0
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /**
   * Loads a recording and resets the playback head to frame 0.
   *
   * @param rec - The `InputRecording` to load.
   */
  load(rec: InputRecording): void {
    this._stop(false)
    this._recording = rec
    this._framePosition = 0
    this._resetAccumulated()
    this._state = 'paused'
  }

  /**
   * Starts or resumes playback. Pushes the current accumulated state to all
   * players immediately so the first frame is visible right away.
   *
   * @throws {Error} If no recording has been loaded via `load()`.
   */
  play(): void {
    if (!this._recording) {
      throw new Error('[@gwenjs/input] InputPlayback.play(): no recording loaded — call load() first')
    }
    this._state = 'playing'
    this._pushPlaybackStates()
  }

  /** Pauses playback without resetting the playback head. */
  pause(): void {
    if (this._state === 'playing') {
      this._state = 'paused'
    }
  }

  /**
   * Seeks to the given frame index by replaying all delta frames up to
   * (and including) that frame from the start of the recording.
   *
   * @param frameIndex - Target frame index (clamped to `[0, frameCount - 1]`).
   * @throws {Error} If no recording is loaded.
   */
  seek(frameIndex: number): void {
    if (!this._recording) {
      throw new Error('[@gwenjs/input] InputPlayback.seek(): no recording loaded')
    }

    const clamped = Math.max(0, Math.min(frameIndex, this._recording.frameCount - 1))
    this._framePosition = clamped

    this._resetAccumulated()

    // Replay all delta frames up to clamped to reconstruct state.
    for (const frame of this._recording.frames) {
      if (frame.index > clamped) break
      for (const change of frame.changes) {
        this._accumulated[change.player]?.set(change.actionIndex, change.value)
      }
    }

    // No edge effects after seek.
    for (let pi = 0; pi < this._players.length; pi++) {
      this._prevAccumulated[pi] = new Map(this._accumulated[pi])
    }

    this._pushPlaybackStates()
  }

  /**
   * Stops playback and restores all players to live device input by clearing
   * their `_playbackStates`.
   */
  stop(): void {
    this._stop(true)
  }

  // ── Callbacks ───────────────────────────────────────────────────────────────

  /**
   * Registers a callback invoked when playback reaches the final frame
   * (only when `loop` is `false`).
   *
   * Must be called inside an active engine context (inside `defineSystem()`,
   * `engine.run()`, or a plugin lifecycle hook).
   *
   * @param cb - Callback to invoke on completion.
   * @returns An unsubscribe function — call it to remove the listener.
   */
  onComplete(cb: () => void): () => void {
    this._completeCbs.add(cb)
    return () => { this._completeCbs.delete(cb) }
  }

  /**
   * Registers a callback invoked each time the playback head crosses a frame
   * boundary. The argument is the new integer frame index.
   *
   * Must be called inside an active engine context (inside `defineSystem()`,
   * `engine.run()`, or a plugin lifecycle hook).
   *
   * @param cb - Callback receiving the current frame index.
   * @returns An unsubscribe function — call it to remove the listener.
   */
  onFrame(cb: (frame: number) => void): () => void {
    this._frameCbs.add(cb)
    return () => { this._frameCbs.delete(cb) }
  }

  // ── Internal tick ───────────────────────────────────────────────────────────

  /**
   * Advances the playback position by `dt` seconds and applies any crossed
   * frame changes to each player's `_playbackStates`.
   *
   * Called by the plugin's `onBeforeUpdate` pipeline before player `_updateFrame` calls.
   *
   * @internal
   * @param dt - Frame delta time in seconds.
   */
  _tick(dt: number): void {
    if (this._state !== 'playing' || !this._recording) return

    const rec = this._recording
    const prevFrameInt = Math.floor(this._framePosition)
    this._framePosition += dt * rec.targetFps * this.speed
    const newFrameInt = Math.floor(this._framePosition)

    if (newFrameInt >= rec.frameCount) {
      if (this.loop) {
        this._framePosition = 0
        this._resetAccumulated()
        this._applyFramesUpTo(0)
        // Suppress edge events on first looped frame (same as seek()).
        for (let pi = 0; pi < this._players.length; pi++) {
          this._prevAccumulated[pi] = new Map(this._accumulated[pi])
        }
        this._notifyFrame(0)
        this._pushPlaybackStates()
      } else {
        this._framePosition = rec.frameCount - 1
        this._applyFramesInRange(prevFrameInt + 1, rec.frameCount - 1)
        this._pushPlaybackStates()
        this._notifyFrame(rec.frameCount - 1)
        this._state = 'idle'
        this._clearPlaybackStates()
        this._notifyComplete()
      }
      return
    }

    if (newFrameInt > prevFrameInt) {
      this._applyFramesInRange(prevFrameInt + 1, newFrameInt)
      this._pushPlaybackStates()
      this._notifyFrame(newFrameInt)
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private _stop(clearStates: boolean): void {
    this._state = 'idle'
    this._framePosition = 0
    if (clearStates) {
      this._clearPlaybackStates()
    }
  }

  private _resetAccumulated(): void {
    this._accumulated = this._players.map(() => new Map<number, InputRecordingChangeValue>())
    this._prevAccumulated = this._players.map(() => new Map<number, InputRecordingChangeValue>())
  }

  private _applyFramesInRange(fromInclusive: number, toInclusive: number): void {
    if (!this._recording) return
    for (const frame of this._recording.frames) {
      if (frame.index < fromInclusive) continue
      if (frame.index > toInclusive) break
      this._applyFrame(frame)
    }
  }

  private _applyFramesUpTo(toInclusive: number): void {
    if (!this._recording) return
    for (const frame of this._recording.frames) {
      if (frame.index > toInclusive) break
      this._applyFrame(frame)
    }
  }

  private _applyFrame(frame: InputRecordingFrame): void {
    for (const change of frame.changes) {
      const pi = change.player
      if (!this._accumulated[pi]) continue
      // Save previous value for edge detection before overwriting.
      this._prevAccumulated[pi].set(change.actionIndex, this._accumulated[pi].get(change.actionIndex) ?? _defaultValue(change.value))
      this._accumulated[pi].set(change.actionIndex, change.value)
    }
  }

  private _pushPlaybackStates(): void {
    if (!this._recording) return

    const nameToRef = this._buildNameToRefMap()

    for (let pi = 0; pi < this._players.length; pi++) {
      const player = this._players[pi]
      const stateMap = new Map<symbol, ActionState<ActionType>>()

      for (let ai = 0; ai < this._recording.actionNames.length; ai++) {
        const name = this._recording.actionNames[ai]
        const ref = nameToRef.get(name)
        if (!ref) continue

        const curr = this._accumulated[pi]?.get(ai)
        const prev = this._prevAccumulated[pi]?.get(ai)

        stateMap.set(ref.id, _synthesizeState(ref, curr, prev))
      }

      player._playbackStates = stateMap
    }
  }

  private _clearPlaybackStates(): void {
    for (const player of this._players) {
      player._playbackStates = null
    }
  }

  private _buildNameToRefMap(): Map<string, ActionRef<ActionType>> {
    const map = new Map<string, ActionRef<ActionType>>()
    for (const player of this._players) {
      for (const [, ref] of player._getRegisteredActionRefs()) {
        map.set(ref.name, ref)
      }
    }
    return map
  }

  private _notifyFrame(frame: number): void {
    for (const cb of this._frameCbs) cb(frame)
  }

  private _notifyComplete(): void {
    for (const cb of this._completeCbs) cb()
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _defaultValue(sample: InputRecordingChangeValue): InputRecordingChangeValue {
  if (typeof sample === 'boolean') return false
  if (typeof sample === 'number') return 0
  return { x: 0, y: 0 }
}

function _synthesizeState(
  ref: ActionRef<ActionType>,
  curr: InputRecordingChangeValue | undefined,
  prev: InputRecordingChangeValue | undefined,
): ActionState<ActionType> {
  if (ref.type === 'button') {
    const isPressed = (curr as boolean | undefined) ?? false
    const wasPressed = (prev as boolean | undefined) ?? false
    return {
      type: 'button',
      isPressed,
      isJustTriggered: isPressed && !wasPressed,
      isJustReleased: !isPressed && wasPressed,
      holdTime: 0,
    } satisfies ButtonActionState
  }

  if (ref.type === 'axis1d') {
    const value = (curr as number | undefined) ?? 0
    return {
      type: 'axis1d',
      value,
      rawValue: value,
    } satisfies Axis1DActionState
  }

  // axis2d
  const value = (curr as { x: number; y: number } | undefined) ?? { x: 0, y: 0 }
  return {
    type: 'axis2d',
    value,
    rawValue: value,
    magnitude: Math.sqrt(value.x * value.x + value.y * value.y),
  } satisfies Axis2DActionState
}
