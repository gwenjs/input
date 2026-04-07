import type { InputContextDef } from "../contexts/define-input-context.js";
import type { BindingsSnapshot } from "../players/bindings-snapshot.js";
import type { InputRecording } from "../recording/types.js";

// Forward declarations for types defined in later phases
// (real implementations in Phase 5+)
export interface VirtualJoystickConfig {
  /** Unique identifier, referenced by `VirtualJoystick('id')` binding source. */
  id: string;
  /** Screen side for auto-positioning. Use 'custom' with `position` for manual placement. */
  side: "left" | "right" | "custom";
  /** Joystick diameter in pixels. */
  size: number;
  /** Used when `side` is 'custom'. Percentage of viewport (0–100). */
  position?: { x: number; y: number };
  /** Overlay opacity (0–1). Default: 0.5. */
  opacity?: number;
  /** Inner deadzone as a fraction of the joystick radius (0–1). Default: 0.1. */
  deadzone?: number;
}

export interface VirtualButtonConfig {
  /** Unique identifier, referenced by `VirtualButton('id')` binding source. */
  id: string;
  /** Button label text. */
  label: string;
  /** Position as percentage of viewport (0–100). */
  position: { x: number; y: number };
  /** Button diameter in pixels. Default: 60. */
  size?: number;
  /** Overlay opacity (0–1). Default: 0.7. */
  opacity?: number;
}

/** Dev overlay configuration. */
export interface DevOverlayConfig {
  /** Overlay screen position. Default: `'bottom-right'`. */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Show connected/disconnected status for each device class. Default: `true`. */
  showDevices?: boolean;
  /** Show the active context list for the configured player. Default: `true`. */
  showContexts?: boolean;
  /** Show non-zero action values for the configured player. Default: `true`. */
  showActions?: boolean;
  /** Show recording/playback state and frame counter. Default: `true`. */
  showRecording?: boolean;
  /** Overlay opacity (0–1). Default: `0.85`. */
  opacity?: number;
  /** Which player slot to display. Default: `0`. */
  player?: number;
}

/**
 * Fully-resolved dev overlay config — all fields are required.
 * Produced by `normalizeConfig()` from a `DevOverlayConfig` or `true`.
 */
export interface NormalizedDevOverlayConfig {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  showDevices: boolean;
  showContexts: boolean;
  showActions: boolean;
  showRecording: boolean;
  opacity: number;
  player: number;
}

/** Accessibility profile — a named BindingsSnapshot preset. */
export type AccessibilityProfile = BindingsSnapshot;

/**
 * Configuration for `InputPlugin()`.
 *
 * All fields are optional. Pass only what you need — `normalizeConfig()`
 * provides sensible defaults for everything.
 */
export interface InputPluginConfig {
  /** Number of local players (1–4). Default: 1. */
  players?: number;
  /** Input contexts to register globally on plugin setup. */
  contexts?: InputContextDef[];
  /** Context names to activate by default for player 0. Default: all registered contexts. */
  defaultActiveContexts?: string[];
  /** Canvas element for mouse/touch coordinate offset calculations. */
  canvas?: HTMLCanvasElement;
  /** Event target for keyboard/mouse DOM listeners. Default: window. */
  eventTarget?: EventTarget;
  /** Touch and virtual controls configuration. */
  touch?: {
    /** Enable touch input. Default: true. */
    enabled?: boolean;
    /** Force virtual controls on/off, overriding auto-detection. */
    forceVirtualControls?: boolean;
    /** Virtual on-screen joystick configurations. */
    virtualJoysticks?: VirtualJoystickConfig[];
    /** Virtual on-screen button configurations. */
    virtualButtons?: VirtualButtonConfig[];
  };
  /**
   * Gyroscope configuration.
   * Gyroscope is treated as a first-class device (not a sub-feature of touch).
   * Enabled automatically on iOS/Android when the user grants motion permission.
   */
  gyro?: {
    /** Enable gyroscope input. Default: auto-detect based on DeviceOrientationEvent support. */
    enabled?: boolean;
    /** Low-pass filter strength for orientation smoothing (0–1). Default: 0.1. */
    smoothing?: number;
    /** Minimum orientation change (degrees) before emitting a value. Default: 0.02. */
    deadZone?: number;
  };
  /**
   * Dev overlay configuration.
   * When `true`, shows a DOM debug panel. Automatically enabled in development mode.
   * The overlay is tree-shaken from production builds.
   */
  devOverlay?: boolean | DevOverlayConfig;
  /** Input recording/playback. Pass a recording to auto-play on engine boot. */
  recording?: InputRecording;
  /**
   * Named accessibility profiles (BindingsSnapshot presets).
   * Activate via `input.player(0).activateAccessibilityProfile('one-handed-left')`.
   */
  accessibilityProfiles?: Record<string, AccessibilityProfile>;
  /**
   * Called whenever a player's bindings change.
   * Use this to persist bindings (e.g. to localStorage).
   *
   * @example
   * ```typescript
   * onBindingsChanged(playerIndex, snapshot) {
   *   localStorage.setItem(`bindings-p${playerIndex}`, JSON.stringify(snapshot))
   * }
   * ```
   */
  onBindingsChanged?: (playerIndex: number, snapshot: BindingsSnapshot) => void;
  /**
   * Initial bindings to restore per player on plugin setup.
   * Index corresponds to player slot. Pass `null` to skip a slot.
   *
   * @example
   * ```typescript
   * initialBindings: [
   *   JSON.parse(localStorage.getItem('bindings-p0') ?? 'null'),
   * ]
   * ```
   */
  initialBindings?: (BindingsSnapshot | null)[];
  /**
   * Called when a gamepad disconnects mid-session.
   * Default behavior: the player keeps their context stack and falls back to
   * keyboard+mouse if no other gamepad is available.
   */
  onGamepadDisconnected?: (playerIndex: number) => void;
}

/**
 * Normalized internal configuration — all optional fields resolved to their defaults.
 * Produced by `normalizeConfig()` and consumed by the plugin internals.
 */
export interface NormalizedInputConfig {
  players: number;
  contexts: InputContextDef[];
  defaultActiveContexts: string[] | null;
  canvas: HTMLCanvasElement | null;
  eventTarget: EventTarget;
  touch: {
    enabled: boolean;
    forceVirtualControls: boolean | null;
    virtualJoysticks: VirtualJoystickConfig[];
    virtualButtons: VirtualButtonConfig[];
  };
  gyro: {
    enabled: boolean | null; // null = auto-detect
    smoothing: number;
    deadZone: number;
  };
  devOverlay: false | NormalizedDevOverlayConfig;
  recording: InputRecording | null;
  accessibilityProfiles: Record<string, AccessibilityProfile>;
  onBindingsChanged: ((playerIndex: number, snapshot: BindingsSnapshot) => void) | null;
  initialBindings: (BindingsSnapshot | null)[];
  onGamepadDisconnected: ((playerIndex: number) => void) | null;
}

/**
 * Validates and normalizes user-provided `InputPluginConfig` into `NormalizedInputConfig`.
 *
 * This is the single source of truth for all default values. Both the module system
 * path (via `defineGwenModule`) and the direct `engine.use(InputPlugin(...))` path
 * pass through this function.
 *
 * @param config - Raw user config (may be empty `{}`).
 * @returns Fully resolved `NormalizedInputConfig`.
 * @throws {Error} If `players` is not an integer between 1 and 4.
 */
export function normalizeConfig(config: InputPluginConfig): NormalizedInputConfig {
  const players = config.players ?? 1;
  if (players < 1 || players > 4 || !Number.isInteger(players)) {
    throw new Error(
      `[@gwenjs/input] Invalid players count: ${players}. Must be an integer between 1 and 4.`,
    );
  }

  let devOverlay: false | NormalizedDevOverlayConfig = false;
  if (config.devOverlay === true) {
    devOverlay = {
      position: "bottom-right",
      showDevices: true,
      showContexts: true,
      showActions: true,
      showRecording: true,
      opacity: 0.85,
      player: 0,
    };
  } else if (config.devOverlay && typeof config.devOverlay === "object") {
    devOverlay = {
      position: config.devOverlay.position ?? "bottom-right",
      showDevices: config.devOverlay.showDevices ?? true,
      showContexts: config.devOverlay.showContexts ?? true,
      showActions: config.devOverlay.showActions ?? true,
      showRecording: config.devOverlay.showRecording ?? true,
      opacity: config.devOverlay.opacity ?? 0.85,
      player: config.devOverlay.player ?? 0,
    };
  }

  return {
    players,
    contexts: config.contexts ?? [],
    defaultActiveContexts: config.defaultActiveContexts ?? null,
    canvas: config.canvas ?? null,
    eventTarget:
      config.eventTarget ??
      (typeof window !== "undefined"
        ? window
        : (() => {
            throw new Error(
              "[@gwenjs/input] No EventTarget available. Pass `eventTarget` explicitly in SSR/Node environments.",
            );
          })()),
    touch: {
      enabled: config.touch?.enabled ?? true,
      forceVirtualControls: config.touch?.forceVirtualControls ?? null,
      virtualJoysticks: config.touch?.virtualJoysticks ?? [],
      virtualButtons: config.touch?.virtualButtons ?? [],
    },
    gyro: {
      enabled: config.gyro?.enabled ?? null,
      smoothing: config.gyro?.smoothing ?? 0.1,
      deadZone: config.gyro?.deadZone ?? 0.02,
    },
    devOverlay,
    recording: config.recording ?? null,
    accessibilityProfiles: config.accessibilityProfiles ?? {},
    onBindingsChanged: config.onBindingsChanged ?? null,
    initialBindings: config.initialBindings ?? [],
    onGamepadDisconnected: config.onGamepadDisconnected ?? null,
  };
}
