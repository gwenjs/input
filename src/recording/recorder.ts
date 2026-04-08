import type { ActionRef, ActionType } from "../types.js";
import type { PlayerInput } from "../players/player-input.js";
import type { InputRecordingChangeValue, InputRecordingFrame } from "./types.js";
import { type InputRecording, type InputRecordingState } from "./types.js";

/**
 * Captures per-frame action state from all `PlayerInput` instances and
 * produces a delta-encoded `InputRecording`.
 *
 * Obtain an instance via `useInput().recorder` or `useInputRecorder()`.
 *
 * @remarks `holdTime` is not recorded or replayed. Systems depending on `holdTime`
 * (e.g. Hold interactions checking exact hold duration) will see `holdTime: 0` during playback.
 *
 * @example
 * ```typescript
 * const recorder = useInputRecorder()
 * recorder.start()
 * // … play through the scenario …
 * recorder.stop()
 * const rec = recorder.export()
 * ```
 */
export class InputRecorder {
  private readonly _players: readonly PlayerInput[];
  private readonly _targetFps: number;

  private _state: InputRecordingState = "idle";
  private _frames: InputRecordingFrame[] = [];
  private _frameCount = 0;

  /** Action name ordered list — built on `start()`. */
  private _actionNames: string[] = [];

  /** Ordered action refs matching `_actionNames`. */
  private _actionRefList: ActionRef<ActionType>[] = [];

  /** Previous per-player values: _prevValues[playerIndex][actionIndex] = last recorded value. */
  private _prevValues: Map<number, InputRecordingChangeValue>[] = [];

  /**
   * @param players - All `PlayerInput` instances managed by the plugin.
   * @param targetFps - Frames-per-second the engine targets. Stored in the recording header.
   *   Defaults to `60`.
   */
  constructor(players: readonly PlayerInput[], targetFps = 60) {
    this._players = players;
    this._targetFps = targetFps;
  }

  // ── Public state ────────────────────────────────────────────────────────────

  /**
   * Current recorder state.
   * `'idle'` until `start()` is called; `'recording'` while active.
   */
  get state(): InputRecordingState {
    return this._state;
  }

  /** Number of frames captured so far (updated after each `_captureFrame` call). */
  get frameCount(): number {
    return this._frameCount;
  }

  /**
   * Called by the plugin to emit the `input:recordingState` engine hook.
   * Set during plugin setup.
   * @internal
   */
  _onStateChanged: ((state: "started" | "stopped") => void) | undefined;

  // ── Recording lifecycle ─────────────────────────────────────────────────────

  /**
   * Begins recording. Clears any previously captured data and builds the
   * action-name index from all currently registered contexts.
   *
   * @throws {Error} If a recording is already in progress.
   */
  start(): void {
    if (this._state === "recording") {
      throw new Error("[@gwenjs/input] InputRecorder: already recording — call stop() first");
    }

    this._frames = [];
    this._frameCount = 0;

    // Collect all unique action refs across every player's registered contexts.
    const seen = new Set<symbol>();
    const refs: ActionRef<ActionType>[] = [];

    for (const player of this._players) {
      for (const [, ref] of player._getRegisteredActionRefs()) {
        if (!seen.has(ref.id)) {
          seen.add(ref.id);
          refs.push(ref);
        }
      }
    }

    this._actionRefList = refs;
    this._actionNames = refs.map((r) => r.name);

    // Initialise previous-value maps (empty = "no prior state").
    this._prevValues = this._players.map(() => new Map<number, InputRecordingChangeValue>());

    this._state = "recording";
    this._onStateChanged?.("started");
  }

  /**
   * Stops an active recording.
   * Has no effect if called when not recording.
   */
  stop(): void {
    if (this._state === "recording") {
      this._state = "idle";
      this._onStateChanged?.("stopped");
    }
  }

  /**
   * Returns the completed recording as a JSON-safe `InputRecording` value.
   *
   * @throws {Error} If a recording is still in progress.
   * @throws {Error} If no frames have been captured yet.
   */
  export(): InputRecording {
    if (this._state === "recording") {
      throw new Error("[@gwenjs/input] InputRecorder.export(): call stop() before exporting");
    }
    if (this._frameCount === 0) {
      throw new Error(
        "[@gwenjs/input] InputRecorder.export(): no frames captured — call start() then let at least one frame run",
      );
    }

    return {
      version: 1,
      frameCount: this._frameCount,
      targetFps: this._targetFps,
      playerCount: this._players.length,
      actionNames: [...this._actionNames],
      frames: this._frames.map((f) => ({
        index: f.index,
        changes: f.changes.map((c) => ({ ...c })),
      })),
    };
  }

  // ── Internal frame capture ──────────────────────────────────────────────────

  /**
   * Captures the current frame's action states from all players.
   * Called by the plugin's `onAfterUpdate` pipeline after all players have updated.
   *
   * Only emits a frame entry when at least one action value has changed
   * relative to the previous captured frame (delta encoding).
   *
   * @internal
   * @param _frameIndex - The current absolute frame index (unused; kept for call-site compatibility).
   */
  _captureFrame(_frameIndex: number): void {
    if (this._state !== "recording") return;

    const changes: {
      player: number;
      actionIndex: number;
      value: InputRecordingChangeValue;
    }[] = [];

    for (let pi = 0; pi < this._players.length; pi++) {
      const player = this._players[pi];
      const prevMap = this._prevValues[pi];

      for (let ai = 0; ai < this._actionRefList.length; ai++) {
        const ref = this._actionRefList[ai];

        let value: InputRecordingChangeValue;
        if (ref.type === "button") {
          value = player._getButtonValue(ref.id);
        } else if (ref.type === "axis1d") {
          value = player._getAxis1dValue(ref.id);
        } else {
          value = player._getAxis2dValue(ref.id);
        }

        const prev = prevMap.get(ai);
        if (!_valuesEqual(prev, value)) {
          changes.push({ player: pi, actionIndex: ai, value });
          prevMap.set(ai, value);
        }
      }
    }

    if (changes.length > 0) {
      this._frames.push({ index: this._frameCount, changes: Object.freeze(changes) });
    }

    this._frameCount++;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _valuesEqual(
  a: InputRecordingChangeValue | undefined,
  b: InputRecordingChangeValue,
): boolean {
  if (a === undefined) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a === "boolean" || typeof a === "number") return a === b;
  // axis2d
  const bv = b as { x: number; y: number };
  const av = a as { x: number; y: number };
  return av.x === bv.x && av.y === bv.y;
}
