import type { ActionRef, ActionType, ActionState } from "../types.js";
import type { PlayerInput } from "./player-input.js";
import type { InputLogger } from "./player-input.js";
import type { KeyboardDevice } from "../devices/keyboard.js";
import type { MouseDevice } from "../devices/mouse.js";
import type { GamepadDevice } from "../devices/gamepad.js";
import type { TouchDevice } from "../devices/touch.js";
import type { GyroDevice } from "../devices/gyro.js";
import type { VirtualControlsOverlay } from "../virtual/virtual-controls-overlay.js";
import type { InputRecorder } from "../recording/recorder.js";
import type { InputPlayback } from "../recording/playback.js";
import type { InputDebugAPI } from "../debug/debug-api.js";
import type { BindingsSnapshot } from "./bindings-snapshot.js";

export interface InputServiceDevices {
  keyboard: KeyboardDevice;
  mouse: MouseDevice;
  gamepad: GamepadDevice;
  touch: TouchDevice;
  gyro: GyroDevice;
  /** Optional virtual on-screen controls overlay. Present only if configured. */
  virtualControls?: VirtualControlsOverlay;
}

/**
 * Global input service — provides access to all `PlayerInput` instances.
 *
 * Retrieved via the `useInput()` composable or `engine.inject('input')`.
 *
 * @example
 * ```typescript
 * const input = useInput()
 * const p1 = input.player(0)
 * const jump = p1.action(Jump)
 * ```
 */
export class InputService {
  private readonly _players: PlayerInput[];
  private readonly _devices: InputServiceDevices;
  private readonly _recorder: InputRecorder;
  private readonly _playback: InputPlayback;
  /** Named accessibility profiles available to all players. Set by the plugin. */
  _accessibilityProfiles: Record<string, BindingsSnapshot> = {};
  /** Set by the plugin in development mode; null in production. */
  _debug: InputDebugAPI | null = null;
  /**
   * Logger instance provided by the plugin. No-op when not set.
   * @internal
   */
  _log: InputLogger | null = null;

  constructor(
    players: PlayerInput[],
    devices: InputServiceDevices,
    recorder: InputRecorder,
    playback: InputPlayback,
  ) {
    this._players = players;
    this._devices = devices;
    this._recorder = recorder;
    this._playback = playback;
  }

  /**
   * Returns the `PlayerInput` for the given zero-based player slot.
   *
   * @throws {RangeError} If `index` is out of bounds.
   */
  player(index: number): PlayerInput {
    if (index < 0 || index >= this._players.length) {
      const msg = `[@gwenjs/input] Player index ${index} is out of bounds (${this._players.length} player(s) configured).`;
      this._log?.warn(msg);
      throw new RangeError(msg);
    }
    return this._players[index];
  }

  /**
   * All active `PlayerInput` instances.
   * Length matches the `players` count passed to `InputPlugin`.
   */
  get players(): readonly PlayerInput[] {
    return this._players;
  }

  /**
   * Convenience shorthand: reads an action for player 0.
   * Equivalent to `input.player(0).action(ref)`.
   */
  action<T extends ActionType>(ref: ActionRef<T>): ActionState<T> {
    return this._players[0].action(ref);
  }

  /** The keyboard device instance. */
  get keyboard(): KeyboardDevice {
    return this._devices.keyboard;
  }

  /** The mouse device instance. */
  get mouse(): MouseDevice {
    return this._devices.mouse;
  }

  /** The gamepad device instance. */
  get gamepad(): GamepadDevice {
    return this._devices.gamepad;
  }

  /** The touch device instance. */
  get touch(): TouchDevice {
    return this._devices.touch;
  }

  /** The gyro device instance. */
  get gyro(): GyroDevice {
    return this._devices.gyro;
  }

  /** The virtual controls overlay instance, if configured. */
  get virtualControls(): VirtualControlsOverlay | undefined {
    return this._devices.virtualControls;
  }

  /**
   * The `InputRecorder` instance for this plugin.
   * Use to start/stop recording and export recordings.
   */
  get recorder(): InputRecorder {
    return this._recorder;
  }

  /**
   * The `InputPlayback` instance for this plugin.
   * Use to load, play, seek, and stop recorded sessions.
   */
  get playback(): InputPlayback {
    return this._playback;
  }

  /**
   * The debug API instance.
   *
   * Returns `null` in production (`import.meta.env.PROD`) or before the
   * plugin has finished setup. Use this to build devtools integrations,
   * debug overlays, or automated input testing harnesses.
   *
   * @example
   * ```typescript
   * const debug = useInput().debug
   * if (debug) {
   *   debug.onFrame(snap => console.log(snap.players[0].actions))
   * }
   * ```
   */
  get debug(): InputDebugAPI | null {
    return this._debug;
  }

  /**
   * Returns the names of all registered accessibility profiles.
   *
   * Profiles are registered via `InputPlugin({ accessibilityProfiles: { ... } })`.
   * Activate a profile for a player via `player.activateAccessibilityProfile(name)`.
   *
   * @returns An array of profile name strings.
   */
  getAccessibilityProfiles(): string[] {
    return Object.keys(this._accessibilityProfiles);
  }

  /**
   * Requests iOS 13+ motion permission for the gyroscope.
   *
   * Must be called from a user gesture handler (e.g. a button click).
   * Calling from `onUpdate()` or autostart will fail silently on iOS.
   *
   * On platforms that do not require an explicit permission grant, this
   * resolves immediately with `'granted'`.
   *
   * @returns `'granted'` | `'denied'` | `'unavailable'`
   *
   * @example
   * ```typescript
   * button.onclick = async () => {
   *   const result = await useInput().requestMotionPermission()
   *   if (result === 'granted') enableGyroAim()
   * }
   * ```
   */
  async requestMotionPermission(): Promise<"granted" | "denied" | "unavailable"> {
    // Access via window to avoid ReferenceError in environments where the API doesn't exist.
    // DeviceOrientationEvent.requestPermission is iOS 13+ only.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doe = (typeof window !== "undefined" ? (window as any).DeviceOrientationEvent : undefined) as any;
    if (typeof doe?.requestPermission === "function") {
      try {
        const result: string = await doe.requestPermission();
        if (result === "granted") {
          this._devices.gyro.attach(window);
          this._log?.info("[@gwenjs/input] motion permission granted (iOS)");
          return "granted";
        }
        this._log?.warn("[@gwenjs/input] motion permission denied (iOS)");
        return "denied";
      } catch (err) {
        this._log?.warn("[@gwenjs/input] motion permission request threw", {
          error: String(err),
        });
        return "denied";
      }
    }
    // Non-iOS or API not present — permission not required.
    if (typeof window !== "undefined" && "DeviceOrientationEvent" in window) {
      this._log?.info("[@gwenjs/input] motion permission not required on this platform");
      return "granted";
    }
    this._log?.warn("[@gwenjs/input] DeviceOrientationEvent not available");
    return "unavailable";
  }
}
