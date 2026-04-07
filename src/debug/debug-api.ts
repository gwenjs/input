/**
 * Debug API for `@gwenjs/input`.
 *
 * Provides point-in-time snapshots, action history, flat binding maps,
 * and event hooks for devtools integration.
 *
 * The entire module is null-guarded in production: `InputService.debug`
 * returns `null` when `import.meta.env.PROD` is true.
 *
 * @module
 */

import type { ActionType } from '../types.js'
import type { PlayerInput } from '../players/player-input.js'
import type { InputService, InputServiceDevices } from '../players/input-service.js'
import type { DeviceAssignment } from '../players/binding-resolver.js'
import type { InputRecordingState } from '../recording/types.js'

// ─── Supporting event types ───────────────────────────────────────────────────

/**
 * A single action trigger or release event, stored in the action history ring.
 */
export interface ActionEvent {
  /** Absolute frame index when the event occurred. */
  frame: number
  /** Wall-clock timestamp (ms) when the event occurred. */
  timestamp: number
  /** Zero-based player slot that triggered the action. */
  player: number
  /** Action name string. */
  actionName: string
  /** Whether this was a trigger or a release. */
  type: 'triggered' | 'released'
}

/**
 * A flat, human-readable description of a single binding entry.
 * Suitable for rendering in a devtools bindings panel.
 */
export interface BindingMapEntry {
  /** Zero-based player slot. */
  player: number
  /** Action name string. */
  actionName: string
  /** Name of the context the binding belongs to. */
  context: string
  /** Human-readable description of the binding source (e.g. `'Keys.Space'`). */
  source: string
  /** Processor type names in order (e.g. `['deadzone', 'smooth']`). */
  processors: string[]
  /** Interaction type names in order (e.g. `['hold']`). */
  interactions: string[]
}

/**
 * Fired each time an action's `isJustTriggered` flag is true during `_tick`.
 */
export interface ActionTriggeredEvent {
  /** Absolute frame index. */
  frame: number
  /** Zero-based player slot. */
  player: number
  /** Action name string. */
  actionName: string
  /** Current action value at the time of triggering. */
  value: boolean | number | { x: number; y: number }
}

/**
 * Fired when a player's active context list changes between frames.
 */
export interface ContextChangedEvent {
  /** Absolute frame index. */
  frame: number
  /** Zero-based player slot. */
  player: number
  /** Full list of active context names after the change. */
  activeContexts: string[]
}

/**
 * Fired when a player's binding overrides change between frames.
 */
export interface BindingChangedEvent {
  /** Absolute frame index. */
  frame: number
  /** Zero-based player slot. */
  player: number
  /** Action name whose binding changed. */
  actionName: string
}

/**
 * Fired when a player's assigned device changes between frames.
 */
export interface DeviceChangedEvent {
  /** Absolute frame index. */
  frame: number
  /** Zero-based player slot. */
  player: number
  /** New device assignment. */
  device: DeviceAssignment
}

/**
 * Fired when the recording/playback state changes between frames.
 */
export interface RecordingStateEvent {
  /** Absolute frame index. */
  frame: number
  /** New recording state. */
  state: InputRecordingState
  /** Current total frame count of the recording or playback. */
  totalFrames: number
}

// ─── InputDebugSnapshot ───────────────────────────────────────────────────────

/**
 * A point-in-time snapshot of the entire input system state.
 * Produced each frame by `InputDebugAPIImpl._tick()`.
 */
export interface InputDebugSnapshot {
  /** Wall-clock timestamp (ms) of the snapshot. */
  timestamp: number
  /** Absolute frame index at the time of the snapshot. */
  frame: number
  /** Per-player state. */
  players: Array<{
    /** Zero-based player slot index. */
    index: number
    /** The player's currently assigned device. */
    device: DeviceAssignment
    /** Names of all currently active input contexts. */
    activeContexts: string[]
    /** All registered actions and their current frame values. */
    actions: Array<{
      /** Action name string. */
      name: string
      /** Action type tag. */
      type: ActionType
      /** Current processed value this frame. */
      value: boolean | number | { x: number; y: number }
      /** True only on the frame the action first becomes active. */
      isJustTriggered: boolean
      /** True only on the frame the action is released. */
      isJustReleased: boolean
      /** For button actions: milliseconds the button has been held. */
      holdTime?: number
    }>
    /** Recording/playback state scoped to this player slot. */
    recording: {
      state: InputRecordingState
      frame: number
      totalFrames: number
    }
  }>
  /** Availability of each raw input device class. */
  devices: {
    /** True if a keyboard is attached (always true in browser context). */
    keyboard: boolean
    /** True if a mouse/pointer is available. */
    mouse: boolean
    /** Gamepad connection status indexed by slot [0..3]. */
    gamepads: boolean[]
    /** True if touch input is available on this platform. */
    touch: boolean
    /** True if gyroscope orientation data is available. */
    gyro: boolean
  }
}

// ─── InputDebugAPI interface ──────────────────────────────────────────────────

/**
 * Public debug interface exposed by `InputService.debug`.
 *
 * **Available in development only.** Returns `null` in production
 * (`import.meta.env.PROD`).
 *
 * @example
 * ```typescript
 * const debug = useInput().debug
 * if (debug) {
 *   const snap = debug.getSnapshot()
 *   console.log(snap.players[0].actions)
 * }
 * ```
 */
export interface InputDebugAPI {
  /**
   * Returns a point-in-time snapshot of the entire input system.
   * Safe to call at any time; reflects the state as of the last `_tick`.
   *
   * @param timestamp - Optional wall-clock timestamp (ms) to embed in the snapshot.
   *   When omitted, `Date.now()` is used. Pass the same value used in `_tick` to
   *   keep timestamps consistent within a single frame.
   */
  getSnapshot(timestamp?: number): InputDebugSnapshot

  /**
   * Returns the last `lastN` trigger/release events for a named action.
   * Events are ordered oldest-first. Returns an empty array if no history exists.
   *
   * @param actionName - Action name to query.
   * @param lastN - Maximum number of events to return.
   */
  getActionHistory(actionName: string, lastN: number): ActionEvent[]

  /**
   * Returns a flat, human-readable map of every binding registered across
   * all players and contexts. Useful for rendering a devtools bindings panel.
   */
  getBindingMap(): BindingMapEntry[]

  /**
   * Subscribes to action-triggered events.
   * @returns Unsubscribe function.
   */
  onActionTriggered(cb: (e: ActionTriggeredEvent) => void): () => void

  /**
   * Subscribes to context-changed events (fires when a player's active
   * context list changes between frames).
   * @returns Unsubscribe function.
   */
  onContextChanged(cb: (e: ContextChangedEvent) => void): () => void

  /**
   * Subscribes to binding-changed events (fires when a player's binding
   * overrides change between frames).
   * @returns Unsubscribe function.
   */
  onBindingChanged(cb: (e: BindingChangedEvent) => void): () => void

  /**
   * Subscribes to device-changed events (fires when a player's assigned
   * device changes between frames).
   * @returns Unsubscribe function.
   */
  onDeviceChanged(cb: (e: DeviceChangedEvent) => void): () => void

  /**
   * Subscribes to recording-state-changed events.
   * @returns Unsubscribe function.
   */
  onRecordingStateChanged(cb: (e: RecordingStateEvent) => void): () => void

  /**
   * Subscribes to per-frame snapshots. The callback receives a fresh
   * `InputDebugSnapshot` immediately after each `_tick`.
   * @returns Unsubscribe function.
   */
  onFrame(cb: (snap: InputDebugSnapshot) => void): () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Maximum number of events retained per action in the history ring. */
const MAX_HISTORY = 100

/** Formats a `BindingSource` as a human-readable string for the binding map. */
function formatSource(source: unknown): string {
  if (typeof source === 'number') {
    return `GamepadButtons[${source}]`
  }
  if (typeof source === 'string') {
    if (source.startsWith('gamepad:stick:left')) return `GamepadStick.Left${source.slice('gamepad:stick:left'.length) || ''}`
    if (source.startsWith('gamepad:stick:right')) return `GamepadStick.Right${source.slice('gamepad:stick:right'.length) || ''}`
    if (source.startsWith('gamepad:')) return source
    if (source.startsWith('gyro:')) {
      const axis = source.slice('gyro:'.length)
      return `GyroAxis.${axis.charAt(0).toUpperCase()}${axis.slice(1)}`
    }
    if (source.startsWith('mouse:delta')) return 'MouseDelta'
    if (source.startsWith('mouse:wheel')) return 'MouseWheel'
    return `Keys.${source}`
  }
  if (typeof source === 'object' && source !== null) {
    const s = source as Record<string, unknown>
    switch (s['_type']) {
      case 'composite2d':
        return `Composite2D(${String(s['up'])},${String(s['down'])},${String(s['left'])},${String(s['right'])})`
      case 'composite1d':
        return `Composite(${String(s['negative'])},${String(s['positive'])})`
      case 'mouse:delta':
        return 'MouseDelta'
      case 'mouse:wheel':
        return 'MouseWheel'
      case 'virtual:joystick':
        return `VirtualJoystick(${String(s['id'])})`
      case 'virtual:button':
        return `VirtualButton(${String(s['id'])})`
      default: {
        const type = String(s['_type'] ?? 'unknown')
        if (type.startsWith('gyro:')) return `GyroAxis.${type.slice('gyro:'.length)}`
        if (type.startsWith('gesture:')) return `Gesture.${type.slice('gesture:'.length)}`
        return type
      }
    }
  }
  return String(source)
}

/** Returns true if two `string[]` values are equal (order-sensitive). */
function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

// ─── InputDebugAPIImpl ────────────────────────────────────────────────────────

/**
 * Concrete implementation of `InputDebugAPI`.
 *
 * Created by the plugin in development mode only. Never instantiated in
 * production (`import.meta.env.PROD`).
 *
 * @internal
 */
export class InputDebugAPIImpl implements InputDebugAPI {
  /** Current absolute frame counter, updated each `_tick`. */
  private _frame = 0

  /** Per-action event ring (keyed by action name). */
  private readonly _actionHistory = new Map<string, ActionEvent[]>()

  /** Listeners for per-frame snapshots. */
  private readonly _frameListeners = new Set<(snap: InputDebugSnapshot) => void>()
  /** Listeners for action-triggered events. */
  private readonly _actionTriggeredListeners = new Set<(e: ActionTriggeredEvent) => void>()
  /** Listeners for context-changed events. */
  private readonly _contextChangedListeners = new Set<(e: ContextChangedEvent) => void>()
  /** Listeners for binding-changed events. */
  private readonly _bindingChangedListeners = new Set<(e: BindingChangedEvent) => void>()
  /** Listeners for device-changed events. */
  private readonly _deviceChangedListeners = new Set<(e: DeviceChangedEvent) => void>()
  /** Listeners for recording-state-changed events. */
  private readonly _recordingStateListeners = new Set<(e: RecordingStateEvent) => void>()

  // ── Previous-frame tracking for change detection ─────────────────────────

  /** Previous active contexts per player, indexed by player index. */
  private readonly _prevContexts: string[][] = []
  /** Previous device assignment per player, indexed by player index. */
  private readonly _prevDevices: (DeviceAssignment | null)[] = []
  /** Previous binding fingerprint per player (JSON of exportBindings). */
  private readonly _prevBindingFingerprints: string[] = []
  /** Previous recording state. */
  private _prevRecordingState: InputRecordingState = 'idle'

  constructor(
    private readonly _players: readonly PlayerInput[],
    private readonly _devices: InputServiceDevices,
    private readonly _service: InputService,
  ) {
    for (let i = 0; i < _players.length; i++) {
      this._prevContexts[i] = []
      this._prevDevices[i] = null
      this._prevBindingFingerprints[i] = ''
    }
  }

  // ── Internal tick ─────────────────────────────────────────────────────────

  /**
   * Called each frame by the plugin's `onAfterUpdate` hook (after
   * `recorder._captureFrame`). Builds the snapshot, fires per-frame
   * listeners, and detects state changes.
   *
   * @param frameIndex - Absolute frame counter from the plugin.
   * @internal
   */
  _tick(frameIndex: number): void {
    this._frame = frameIndex
    const now = Date.now()
    const snap = this.getSnapshot(now)

    // Fire frame listeners
    for (const cb of this._frameListeners) cb(snap)

    for (const playerSnap of snap.players) {
      const playerIdx = playerSnap.index

      // ── Action history + onActionTriggered ────────────────────────────────
      for (const action of playerSnap.actions) {
        if (action.isJustTriggered) {
          const event: ActionEvent = {
            frame: frameIndex,
            timestamp: now,
            player: playerIdx,
            actionName: action.name,
            type: 'triggered',
          }
          this._appendHistory(action.name, event)
          for (const cb of this._actionTriggeredListeners) {
            cb({ frame: frameIndex, player: playerIdx, actionName: action.name, value: action.value })
          }
        }
        if (action.isJustReleased) {
          this._appendHistory(action.name, {
            frame: frameIndex,
            timestamp: now,
            player: playerIdx,
            actionName: action.name,
            type: 'released',
          })
        }
      }

      // ── onContextChanged ─────────────────────────────────────────────────
      const prev = this._prevContexts[playerIdx] ?? []
      if (!arraysEqual(prev, playerSnap.activeContexts)) {
        this._prevContexts[playerIdx] = [...playerSnap.activeContexts]
        for (const cb of this._contextChangedListeners) {
          cb({ frame: frameIndex, player: playerIdx, activeContexts: [...playerSnap.activeContexts] })
        }
      }

      // ── onDeviceChanged ──────────────────────────────────────────────────
      const prevDev = this._prevDevices[playerIdx]
      const currDev = playerSnap.device
      if (prevDev === null || prevDev.type !== currDev.type || prevDev.slot !== currDev.slot) {
        this._prevDevices[playerIdx] = { ...currDev }
        if (prevDev !== null) {
          for (const cb of this._deviceChangedListeners) {
            cb({ frame: frameIndex, player: playerIdx, device: { ...currDev } })
          }
        }
      }

      // ── onBindingChanged ─────────────────────────────────────────────────
      const player = this._players[playerIdx]
      if (player) {
        const fingerprint = JSON.stringify(player.exportBindings().overrides)
        const prevFp = this._prevBindingFingerprints[playerIdx] ?? ''
        if (fingerprint !== prevFp) {
          this._prevBindingFingerprints[playerIdx] = fingerprint
          if (prevFp !== '') {
            // Fire per-action events for each action referenced in the new overrides
            const overrides = player.exportBindings().overrides
            const seen = new Set<string>()
            for (const o of overrides) {
              if (!seen.has(o.actionId)) {
                seen.add(o.actionId)
                for (const cb of this._bindingChangedListeners) {
                  cb({ frame: frameIndex, player: playerIdx, actionName: o.actionId })
                }
              }
            }
          }
        }
      }
    }

    // ── onRecordingStateChanged ─────────────────────────────────────────────
    const recState = this._combinedRecState()
    if (recState !== this._prevRecordingState) {
      this._prevRecordingState = recState
      const totalFrames = recState === 'recording'
        ? this._service.recorder.frameCount
        : this._service.playback.frameCount
      for (const cb of this._recordingStateListeners) {
        cb({ frame: frameIndex, state: recState, totalFrames })
      }
    }
  }

  // ── InputDebugAPI ─────────────────────────────────────────────────────────

  /** {@inheritDoc InputDebugAPI.getSnapshot} */
  getSnapshot(timestamp?: number): InputDebugSnapshot {
    const ts = timestamp ?? Date.now()
    const frame = this._frame

    const recState = this._combinedRecState()
    const recFrame = recState === 'recording'
      ? this._service.recorder.frameCount
      : this._service.playback.currentFrame
    const recTotalFrames = recState === 'recording'
      ? this._service.recorder.frameCount
      : this._service.playback.frameCount

    const players = this._players.map(player => {
      const actionRefs = player._getRegisteredActionRefs()
      const actions: InputDebugSnapshot['players'][number]['actions'] = []

      for (const [, ref] of actionRefs) {
        const state = player.action(ref)

        if (state.type === 'button') {
          actions.push({
            name: ref.name,
            type: ref.type,
            value: state.isPressed,
            isJustTriggered: state.isJustTriggered,
            isJustReleased: state.isJustReleased,
            holdTime: state.holdTime,
          })
        } else if (state.type === 'axis1d') {
          actions.push({
            name: ref.name,
            type: ref.type,
            value: state.value,
            isJustTriggered: false,
            isJustReleased: false,
          })
        } else {
          actions.push({
            name: ref.name,
            type: ref.type,
            value: state.value,
            isJustTriggered: false,
            isJustReleased: false,
          })
        }
      }

      return {
        index: player.index,
        device: player.assignedDevice,
        activeContexts: [...player.activeContexts],
        actions,
        recording: {
          state: recState,
          frame: recFrame,
          totalFrames: recTotalFrames,
        },
      }
    })

    const gamepads = [0, 1, 2, 3].map(i => this._devices.gamepad.isConnected(i))
    const touchAvailable = typeof navigator !== 'undefined' ? navigator.maxTouchPoints > 0 : false

    return {
      timestamp: ts,
      frame,
      players,
      devices: {
        keyboard: typeof window !== 'undefined',
        mouse: typeof window !== 'undefined',
        gamepads,
        touch: touchAvailable,
        gyro: this._devices.gyro.isAvailable,
      },
    }
  }

  /** {@inheritDoc InputDebugAPI.getActionHistory} */
  getActionHistory(actionName: string, lastN: number): ActionEvent[] {
    const history = this._actionHistory.get(actionName)
    if (!history) return []
    return history.slice(-lastN)
  }

  /** {@inheritDoc InputDebugAPI.getBindingMap} */
  getBindingMap(): BindingMapEntry[] {
    const entries: BindingMapEntry[] = []
    for (const player of this._players) {
      const contextBindings = player._getAllContextBindings()
      for (const { contextName, binding } of contextBindings) {
        entries.push({
          player: player.index,
          actionName: binding.action.name,
          context: contextName,
          source: formatSource(binding.source),
          processors: binding.processors.map(p => p._type),
          interactions: binding.interactions.map(i => i._type),
        })
      }
    }
    return entries
  }

  /** {@inheritDoc InputDebugAPI.onActionTriggered} */
  onActionTriggered(cb: (e: ActionTriggeredEvent) => void): () => void {
    this._actionTriggeredListeners.add(cb)
    return () => this._actionTriggeredListeners.delete(cb)
  }

  /** {@inheritDoc InputDebugAPI.onContextChanged} */
  onContextChanged(cb: (e: ContextChangedEvent) => void): () => void {
    this._contextChangedListeners.add(cb)
    return () => this._contextChangedListeners.delete(cb)
  }

  /** {@inheritDoc InputDebugAPI.onBindingChanged} */
  onBindingChanged(cb: (e: BindingChangedEvent) => void): () => void {
    this._bindingChangedListeners.add(cb)
    return () => this._bindingChangedListeners.delete(cb)
  }

  /** {@inheritDoc InputDebugAPI.onDeviceChanged} */
  onDeviceChanged(cb: (e: DeviceChangedEvent) => void): () => void {
    this._deviceChangedListeners.add(cb)
    return () => this._deviceChangedListeners.delete(cb)
  }

  /** {@inheritDoc InputDebugAPI.onRecordingStateChanged} */
  onRecordingStateChanged(cb: (e: RecordingStateEvent) => void): () => void {
    this._recordingStateListeners.add(cb)
    return () => this._recordingStateListeners.delete(cb)
  }

  /** {@inheritDoc InputDebugAPI.onFrame} */
  onFrame(cb: (snap: InputDebugSnapshot) => void): () => void {
    this._frameListeners.add(cb)
    return () => this._frameListeners.delete(cb)
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _appendHistory(actionName: string, event: ActionEvent): void {
    let ring = this._actionHistory.get(actionName)
    if (!ring) {
      ring = []
      this._actionHistory.set(actionName, ring)
    }
    ring.push(event)
    if (ring.length > MAX_HISTORY) ring.shift()
  }

  private _combinedRecState(): InputRecordingState {
    const rs = this._service.recorder.state
    if (rs === 'recording') return 'recording'
    const ps = this._service.playback.state
    if (ps === 'playing' || ps === 'paused') return ps
    return 'idle'
  }
}
