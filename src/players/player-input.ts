import type { InputContext } from "../contexts/input-context.js";
import type { BindingEntry, BindingSource } from "../contexts/binding.js";
import type {
  ActionRef,
  ActionType,
  ActionState,
  ButtonActionState,
  Axis1DActionState,
  Axis2DActionState,
} from "../types.js";
import { ProcessorPipeline } from "../processors/pipeline.js";
import { InteractionPipeline, type InteractionResult } from "../interactions/pipeline.js";
import {
  resolveSource,
  type DeviceSet,
  type DeviceAssignment,
  type DeviceType,
} from "./binding-resolver.js";
import type { BindingsSnapshot } from "./bindings-snapshot.js";

// ─── Logger ───────────────────────────────────────────────────────────────────

/**
 * Minimal logger interface used by `PlayerInput` and `InputService`.
 * Provided by the GWEN engine via `engine.logger.child()`.
 * @internal
 */
export interface InputLogger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  debug(msg: string, meta?: Record<string, unknown>): void;
}

// ─── Internal state shapes ────────────────────────────────────────────────────

interface Axis1DState {
  value: number;
  rawValue: number;
}

interface Axis2DState {
  value: { x: number; y: number };
  rawValue: { x: number; y: number };
}

// ─── Accessibility types ──────────────────────────────────────────────────────

/**
 * A single remappable action, as returned by `PlayerInput.getRemappableActions()`.
 * Suitable for populating an accessibility or settings rebinding UI.
 */
export interface RemappableAction {
  /** Human-readable action name (from `ActionRef.name`). */
  name: string;
  /** Action type: `'button'`, `'axis1d'`, or `'axis2d'`. */
  type: ActionType;
  /** All bindings for this action, in evaluation order. */
  bindings: Array<{
    /** Zero-based index into the binding list for this action. */
    index: number;
    /** The raw input source (current effective source, override or default). */
    source: BindingSource;
    /** Human-readable label for the source, e.g. `"Space"`, `"A (Gamepad)"`. */
    displayName: string;
    /** `true` if the user has overridden this binding from its default. */
    isOverridden: boolean;
  }>;
}

// ─── PlayerInput ─────────────────────────────────────────────────────────────

/**
 * Per-player input state manager.
 *
 * Manages a context stack, device assignment, per-frame action evaluation,
 * runtime rebinding, and binding snapshot import/export.
 *
 * @example
 * ```typescript
 * const p1 = usePlayer(0)
 * const jumpState = p1.action(Jump)  // ButtonActionState
 * ```
 */
export class PlayerInput {
  /** Zero-based player slot index. */
  readonly index: number;

  private readonly _context: InputContext;
  private _deviceAssignment: DeviceAssignment;
  private readonly _devices: DeviceSet;

  /** Per-BindingEntry processor pipelines (GC-friendly: entries removed on rebind). */
  private readonly _processorPipelines = new WeakMap<BindingEntry, ProcessorPipeline>();
  /** Per-BindingEntry interaction pipelines. */
  private readonly _interactionPipelines = new WeakMap<BindingEntry, InteractionPipeline>();

  /** Binding overrides: action.id → (bindingIndex → replacement BindingEntry). */
  private readonly _bindingOverrides = new Map<symbol, Map<number, BindingEntry>>();

  /** Latest button action results keyed by ActionRef.id. */
  private readonly _currentStates = new Map<symbol, InteractionResult>();

  /** Latest axis1d values keyed by ActionRef.id. */
  private readonly _axis1dStates = new Map<symbol, Axis1DState>();

  /** Latest axis2d values keyed by ActionRef.id. */
  private readonly _axis2dStates = new Map<symbol, Axis2DState>();

  /**
   * When `InputPlayback` is active this map overrides live device states.
   * `action()` reads from here first; null means live input is used.
   * @internal
   */
  _playbackStates: Map<symbol, ActionState<ActionType>> | null = null;

  /** Optional callback fired after any binding change. */
  private readonly _onBindingsChanged: ((snapshot: BindingsSnapshot) => void) | undefined;

  /**
   * Named accessibility profiles (BindingsSnapshot presets) available to this player.
   * Set by the plugin on construction.
   * @internal
   */
  _accessibilityProfiles: Record<string, BindingsSnapshot> = {};

  /**
   * Called by the plugin to emit the `input:contextActivated` engine hook.
   * @internal
   */
  _onHookContextActivated: ((name: string, priority: number) => void) | undefined;

  /**
   * Called by the plugin to emit the `input:contextDeactivated` engine hook.
   * @internal
   */
  _onHookContextDeactivated: ((name: string) => void) | undefined;

  /**
   * Called by the plugin to emit the `input:bindingChanged` engine hook.
   * @internal
   */
  _onHookBindingChanged: ((action: string, bindingIndex: number) => void) | undefined;

  /** Resolve function for an in-progress `captureNextInput` call. */
  private _captureResolve: ((source: BindingSource | null) => void) | null = null;
  /** Remaining milliseconds until `captureNextInput` times out. */
  private _captureTimeoutMs: number | null = null;

  /**
   * Logger instance provided by the plugin. No-op when not set.
   * @internal
   */
  _log: InputLogger | null = null;

  constructor(
    index: number,
    context: InputContext,
    devices: DeviceSet,
    assignment: DeviceAssignment,
    onBindingsChanged?: (snapshot: BindingsSnapshot) => void,
  ) {
    this.index = index;
    this._context = context;
    this._devices = devices;
    this._deviceAssignment = assignment;
    this._onBindingsChanged = onBindingsChanged;
  }

  // ── Context management ──────────────────────────────────────────────────────

  /**
   * Activates a registered input context by name for this player.
   * @throws {Error} If the context was never registered.
   */
  activateContext(name: string): void {
    try {
      this._context.activate(name);
      this._onHookContextActivated?.(name, this._context.getPriorityOf(name) ?? 0);
    } catch (err) {
      this._log?.warn(`[@gwenjs/input] player ${this.index}: cannot activate context "${name}"`, {
        error: String(err),
      });
      throw err;
    }
  }

  /**
   * Deactivates an input context by name. No-op if not active.
   */
  deactivateContext(name: string): void {
    this._context.deactivate(name);
    this._onHookContextDeactivated?.(name);
  }

  /**
   * Names of all currently active contexts in priority order (highest first).
   */
  get activeContexts(): readonly string[] {
    return this._context.activeContextNames;
  }

  // ── Device assignment ───────────────────────────────────────────────────────

  /**
   * Reassigns the player's input device.
   *
   * @param type - Device type to assign.
   * @param slot - Gamepad slot (0–3). Ignored for keyboard+mouse and touch.
   */
  assignDevice(type: DeviceType, slot = 0): void {
    this._deviceAssignment = { type, slot };
  }

  /**
   * The player's currently assigned input device.
   */
  get assignedDevice(): DeviceAssignment {
    return this._deviceAssignment;
  }

  // ── Frame update ────────────────────────────────────────────────────────────

  /**
   * Evaluates all action bindings for this frame.
   * Called by the plugin in `onBeforeUpdate`, after all device `update()` calls.
   *
   * @param dt - Delta time in seconds since the last frame.
   * @internal
   */
  _updateFrame(dt: number): void {
    // Tick captureNextInput timeout and scan for first just-pressed input
    if (this._captureResolve !== null) {
      // Scan keyboard
      const justPressedKeys = this._devices.keyboard.getJustPressedKeys();
      if (justPressedKeys.length > 0) {
        const resolve = this._captureResolve;
        this._captureResolve = null;
        this._captureTimeoutMs = null;
        resolve(justPressedKeys[0]);
        return;
      }

      // Scan mouse buttons
      const justPressedBtns = this._devices.mouse.getJustPressedButtons();
      if (justPressedBtns.length > 0) {
        const resolve = this._captureResolve;
        this._captureResolve = null;
        this._captureTimeoutMs = null;
        resolve(justPressedBtns[0]);
        return;
      }

      // Scan gamepad buttons on the assigned slot
      const slot = this._deviceAssignment.slot;
      const btnCount = this._devices.gamepad.getButtonCount(slot);
      for (let b = 0; b < btnCount; b++) {
        if (this._devices.gamepad.isButtonJustPressed(slot, b)) {
          const resolve = this._captureResolve;
          this._captureResolve = null;
          this._captureTimeoutMs = null;
          resolve(b);
          return;
        }
      }

      // Tick timeout
      if (this._captureTimeoutMs !== null) {
        this._captureTimeoutMs -= dt * 1000;
        if (this._captureTimeoutMs <= 0) {
          const resolve = this._captureResolve;
          this._captureResolve = null;
          this._captureTimeoutMs = null;
          resolve(null);
          return;
        }
      }
    }

    // Collect all unique action refs from every registered context so actions
    // defined in currently-inactive contexts resolve to safe defaults.
    // Note: inactive context bindings are NOT evaluated — their pipeline state
    // freezes until the context is reactivated.
    const allActions = new Map<symbol, ActionRef<ActionType>>();
    for (const ctx of this._context.getAllRegistered()) {
      for (const entry of ctx.bindings) {
        allActions.set(entry.action.id, entry.action);
      }
    }

    // Clear previous frame results
    this._currentStates.clear();
    this._axis1dStates.clear();
    this._axis2dStates.clear();

    const slot = this._deviceAssignment.slot;

    const evaluateAction = (ref: ActionRef<ActionType>, bindings: BindingEntry[]): void => {
      if (ref.type === "button") {
        this._evaluateButtonBindings(ref, bindings, dt, slot);
      } else if (ref.type === "axis1d") {
        this._evaluateAxis1DBindings(ref, bindings, slot);
      } else {
        this._evaluateAxis2DBindings(ref, bindings, slot);
      }
    };

    // First pass: non-chording actions (safe to evaluate immediately)
    for (const [, ref] of allActions) {
      const bindings = this._getActiveBindings(ref);
      const hasChordedWith = bindings.some((b) =>
        b.interactions.some((i) => i._type === "chordedwith"),
      );
      if (!hasChordedWith) evaluateAction(ref, bindings);
    }

    // Second pass: chording actions (depend on first-pass states being set)
    for (const [, ref] of allActions) {
      const bindings = this._getActiveBindings(ref);
      const hasChordedWith = bindings.some((b) =>
        b.interactions.some((i) => i._type === "chordedwith"),
      );
      if (hasChordedWith) evaluateAction(ref, bindings);
    }
  }

  /**
   * Returns the current per-frame state for an action.
   * Must call `_updateFrame()` before reading action states each frame.
   *
   * @example
   * ```typescript
   * const { isJustTriggered } = player.action(Jump)
   * ```
   */
  action<T extends ActionType>(ref: ActionRef<T>): ActionState<T> {
    // Playback takes precedence over live device state.
    if (this._playbackStates !== null) {
      const ps = this._playbackStates.get(ref.id);
      if (ps !== undefined) return ps as ActionState<T>;
    }

    if (ref.type === "button") {
      const r = this._currentStates.get(ref.id);
      return {
        type: "button",
        isPressed: r?.isPressed ?? false,
        isJustTriggered: r?.isJustTriggered ?? false,
        isJustReleased: r?.isJustReleased ?? false,
        holdTime: r?.holdTime ?? 0,
      } as ButtonActionState as ActionState<T>;
    }

    if (ref.type === "axis1d") {
      const s = this._axis1dStates.get(ref.id);
      return {
        type: "axis1d",
        value: s?.value ?? 0,
        rawValue: s?.rawValue ?? 0,
      } as Axis1DActionState as ActionState<T>;
    }

    // axis2d
    const s = this._axis2dStates.get(ref.id);
    const value = s?.value ?? { x: 0, y: 0 };
    const rawValue = s?.rawValue ?? { x: 0, y: 0 };
    return {
      type: "axis2d",
      value,
      rawValue,
      magnitude: Math.sqrt(value.x ** 2 + value.y ** 2),
    } as Axis2DActionState as ActionState<T>;
  }

  // ── Rebinding ───────────────────────────────────────────────────────────────

  /**
   * Overrides a single binding for an action.
   *
   * The `bindingIndex` is the zero-based index into the ordered list of
   * bindings returned by the context for that action.
   *
   * @param action - The action to rebind.
   * @param bindingIndex - Which binding to replace.
   * @param newSource - The new raw input source.
   */
  rebind(action: ActionRef<ActionType>, bindingIndex: number, newSource: BindingSource): void {
    const bindings = this._context.getBindingsForAction(action);
    const original = bindings[bindingIndex];
    if (!original) return;

    const newEntry: BindingEntry = { ...original, source: newSource };
    this._setOverride(action.id, bindingIndex, newEntry);
    this._notifyBindingsChanged(action.name, bindingIndex);
  }

  /**
   * Removes a single binding override, restoring the default source.
   *
   * @param action - The action whose override to remove.
   * @param bindingIndex - Which binding override to remove.
   */
  resetBinding(action: ActionRef<ActionType>, bindingIndex: number): void {
    const overrides = this._bindingOverrides.get(action.id);
    if (!overrides) return;
    overrides.delete(bindingIndex);
    if (overrides.size === 0) this._bindingOverrides.delete(action.id);
    this._notifyBindingsChanged(action.name, bindingIndex);
  }

  /**
   * Removes all binding overrides for this player, restoring all defaults.
   */
  resetBindings(): void {
    this._bindingOverrides.clear();
    this._notifyBindingsChanged();
  }

  // ── Input capture ───────────────────────────────────────────────────────────

  /**
   * Waits for the next input and returns its `BindingSource`.
   *
   * Scans keyboard, mouse buttons, and the assigned gamepad slot each frame.
   * Resolves with the first just-pressed source detected.
   * Resolves `null` if the timeout elapses without input.
   *
   * Useful for "press a button to rebind" UX flows.
   *
   * @param options.timeout - Milliseconds to wait. Default: 5000.
   *
   * @example
   * ```typescript
   * const source = await player.captureNextInput({ timeout: 3000 })
   * if (source !== null) player.rebind(Jump, 0, source)
   * ```
   */
  captureNextInput(options?: { timeout?: number }): Promise<BindingSource | null> {
    return new Promise((resolve) => {
      // If already capturing, cancel the previous request
      if (this._captureResolve) {
        this._log?.debug(
          `[@gwenjs/input] player ${this.index}: captureNextInput called while already capturing — cancelling previous`,
        );
        this._captureResolve(null);
      }
      this._captureResolve = resolve;
      this._captureTimeoutMs = options?.timeout ?? 5000;
    });
  }

  // ── Snapshot ────────────────────────────────────────────────────────────────

  /**
   * Returns a serializable snapshot of all current binding overrides.
   * Persist and pass back to `importBindings()` to restore later.
   */
  exportBindings(): BindingsSnapshot {
    const overrides: BindingsSnapshot["overrides"] = [];
    for (const indexMap of this._bindingOverrides.values()) {
      for (const [bindingIndex, entry] of indexMap) {
        overrides.push({
          actionId: entry.action.name,
          bindingIndex,
          newBinding: entry.source,
        });
      }
    }
    return { version: 1, player: this.index, overrides };
  }

  /**
   * Applies a previously exported `BindingsSnapshot`, replacing all current overrides.
   * Unknown action names or out-of-range indices are silently ignored.
   *
   * @param snapshot - The snapshot to restore.
   * @remarks Action names must be unique across all registered contexts.
   * If two actions share the same `.name` string, only the first-registered action will be matched.
   */
  importBindings(snapshot: BindingsSnapshot): void {
    this._bindingOverrides.clear();

    // Build a name→ActionRef lookup from all registered contexts
    const actionsByName = new Map<string, ActionRef<ActionType>>();
    for (const ctx of this._context.getAllRegistered()) {
      for (const entry of ctx.bindings) {
        if (!actionsByName.has(entry.action.name)) {
          actionsByName.set(entry.action.name, entry.action);
        }
      }
    }

    for (const { actionId, bindingIndex, newBinding } of snapshot.overrides) {
      const actionRef = actionsByName.get(actionId);
      if (!actionRef) {
        this._log?.warn(
          `[@gwenjs/input] player ${this.index}: importBindings — unknown action "${actionId}", skipping`,
        );
        continue;
      }

      const bindings = this._context.getBindingsForAction(actionRef);
      const original = bindings[bindingIndex];
      if (!original) continue;

      const newEntry: BindingEntry = {
        ...original,
        source: newBinding as BindingSource,
      };
      this._setOverride(actionRef.id, bindingIndex, newEntry);
    }

    this._notifyBindingsChanged();
  }

  // ── Accessibility ───────────────────────────────────────────────────────────

  /**
   * Returns all actions registered across the player's contexts, with their
   * current binding sources and display names.
   *
   * Use this to populate a settings or accessibility remapping UI.
   *
   * @returns An array of remappable actions in registration order.
   */
  getRemappableActions(): RemappableAction[] {
    const seen = new Set<symbol>();
    const result: RemappableAction[] = [];

    for (const ctx of this._context.getAllRegistered()) {
      for (const entry of ctx.bindings) {
        if (seen.has(entry.action.id)) continue;
        seen.add(entry.action.id);

        const allBindings = this._context.getBindingsForAction(entry.action);
        const overrides = this._bindingOverrides.get(entry.action.id);

        result.push({
          name: entry.action.name,
          type: entry.action.type,
          bindings: allBindings.map((b, idx) => ({
            index: idx,
            source: (overrides?.get(idx) ?? b).source,
            displayName: _getSourceDisplayName((overrides?.get(idx) ?? b).source),
            isOverridden: overrides?.has(idx) ?? false,
          })),
        });
      }
    }

    return result;
  }

  /**
   * Applies a named accessibility profile to this player by calling `importBindings()`
   * with the profile's `BindingsSnapshot`.
   *
   * Profiles are registered via `InputPlugin({ accessibilityProfiles: { ... } })`.
   *
   * @param name - The profile name as registered in the plugin configuration.
   * @throws {Error} If the named profile is not registered.
   */
  activateAccessibilityProfile(name: string): void {
    const profile = this._accessibilityProfiles[name];
    if (!profile) {
      const msg =
        `[@gwenjs/input] Accessibility profile "${name}" is not registered. ` +
        `Add it to InputPlugin({ accessibilityProfiles: { "${name}": ... } }).`;
      this._log?.error(msg);
      throw new Error(msg);
    }
    this.importBindings(profile);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /** Returns the active bindings for an action with overrides applied. */
  private _getActiveBindings(ref: ActionRef<ActionType>): BindingEntry[] {
    const bindings = this._context.getBindingsForAction(ref);
    const overrides = this._bindingOverrides.get(ref.id);
    if (!overrides) return bindings;
    return bindings.map((entry, idx) => overrides.get(idx) ?? entry);
  }

  private _setOverride(actionId: symbol, bindingIndex: number, entry: BindingEntry): void {
    let map = this._bindingOverrides.get(actionId);
    if (!map) {
      map = new Map();
      this._bindingOverrides.set(actionId, map);
    }
    map.set(bindingIndex, entry);
  }

  private _getOrCreatePP(entry: BindingEntry): ProcessorPipeline {
    let pp = this._processorPipelines.get(entry);
    if (!pp) {
      pp = new ProcessorPipeline();
      this._processorPipelines.set(entry, pp);
    }
    return pp;
  }

  private _getOrCreateIP(entry: BindingEntry): InteractionPipeline {
    let ip = this._interactionPipelines.get(entry);
    if (!ip) {
      ip = new InteractionPipeline(entry.interactions);
      this._interactionPipelines.set(entry, ip);
    }
    return ip;
  }

  private _evaluateButtonBindings(
    ref: ActionRef<ActionType>,
    bindings: BindingEntry[],
    dt: number,
    slot: number,
  ): void {
    let bestResult: InteractionResult | null = null;

    for (const entry of bindings) {
      const pp = this._getOrCreatePP(entry);
      const ip = this._getOrCreateIP(entry);

      const rawValue = resolveSource(entry.source, this._devices, slot);
      const processed = pp.process(rawValue, entry.processors);

      let rawPressed: boolean;
      if (typeof processed === "boolean") rawPressed = processed;
      else if (typeof processed === "number") rawPressed = processed !== 0;
      else rawPressed = Math.sqrt(processed.x ** 2 + processed.y ** 2) > 0;

      // AllOf: all specified keys must be held simultaneously
      for (const interaction of entry.interactions) {
        if (interaction._type === "allof") {
          const keys = interaction.keys as Array<string | number>;
          const allPressed = keys.every((k) =>
            typeof k === "number"
              ? this._devices.gamepad.isButtonPressed(slot, k)
              : this._devices.keyboard.isPressed(k),
          );
          if (!allPressed) {
            rawPressed = false;
            break;
          }
        }
      }

      const result = ip.evaluate(rawPressed, dt, (id) => this._currentStates.get(id) ?? null);

      // Take the first active result; keep evaluating all to maintain pipeline state
      if (
        bestResult === null ||
        (!bestResult.isPressed &&
          !bestResult.isJustTriggered &&
          !bestResult.isJustReleased &&
          (result.isPressed || result.isJustTriggered || result.isJustReleased))
      ) {
        bestResult = result;
      }
    }

    if (bestResult !== null) {
      this._currentStates.set(ref.id, bestResult);
    }
  }

  private _evaluateAxis1DBindings(
    ref: ActionRef<ActionType>,
    bindings: BindingEntry[],
    slot: number,
  ): void {
    let sumValue = 0;
    let sumRaw = 0;

    for (const entry of bindings) {
      const pp = this._getOrCreatePP(entry);
      const rawValue = resolveSource(entry.source, this._devices, slot);
      const processed = pp.process(rawValue, entry.processors);

      if (typeof rawValue === "number") sumRaw += rawValue;
      else if (typeof rawValue === "boolean") sumRaw += rawValue ? 1 : 0;

      if (typeof processed === "number") sumValue += processed;
      else if (typeof processed === "boolean") sumValue += processed ? 1 : 0;
    }

    this._axis1dStates.set(ref.id, { value: sumValue, rawValue: sumRaw });
  }

  private _evaluateAxis2DBindings(
    ref: ActionRef<ActionType>,
    bindings: BindingEntry[],
    slot: number,
  ): void {
    let sumX = 0;
    let sumY = 0;
    let sumRawX = 0;
    let sumRawY = 0;

    for (const entry of bindings) {
      const pp = this._getOrCreatePP(entry);
      const rawValue = resolveSource(entry.source, this._devices, slot);
      const processed = pp.process(rawValue, entry.processors);

      if (typeof rawValue === "object" && "x" in rawValue) {
        sumRawX += rawValue.x;
        sumRawY += rawValue.y;
      }
      if (typeof processed === "object" && "x" in processed) {
        sumX += processed.x;
        sumY += processed.y;
      }
    }

    this._axis2dStates.set(ref.id, {
      value: { x: sumX, y: sumY },
      rawValue: { x: sumRawX, y: sumRawY },
    });
  }

  private _notifyBindingsChanged(actionName?: string, bindingIndex?: number): void {
    this._onBindingsChanged?.(this.exportBindings());
    if (actionName !== undefined && bindingIndex !== undefined) {
      this._onHookBindingChanged?.(actionName, bindingIndex);
    }
  }

  // ── Recording / playback internals ──────────────────────────────────────────

  /**
   * Returns all binding entries across all registered contexts for this player.
   * @internal
   */
  _getAllContextBindings(): Array<{ contextName: string; binding: BindingEntry }> {
    const result: Array<{ contextName: string; binding: BindingEntry }> = [];
    for (const ctx of this._context.getAllRegistered()) {
      for (const entry of ctx.bindings) {
        result.push({ contextName: ctx.name, binding: entry });
      }
    }
    return result;
  }

  /**
   * Returns all action refs currently registered across all of this player's
   * input contexts, keyed by `ActionRef.id`.
   *
   * Used by `InputRecorder` and `InputPlayback` to enumerate actions without
   * accessing private context internals directly.
   *
   * @internal
   */
  _getRegisteredActionRefs(): Map<symbol, ActionRef<ActionType>> {
    const map = new Map<symbol, ActionRef<ActionType>>();
    for (const ctx of this._context.getAllRegistered()) {
      for (const entry of ctx.bindings) {
        map.set(entry.action.id, entry.action);
      }
    }
    return map;
  }

  /**
   * Returns the current pressed state for a button action. `false` if unknown.
   * @internal
   */
  _getButtonValue(id: symbol): boolean {
    return this._currentStates.get(id)?.isPressed ?? false;
  }

  /**
   * Returns the current processed value for an axis1d action. `0` if unknown.
   * @internal
   */
  _getAxis1dValue(id: symbol): number {
    return this._axis1dStates.get(id)?.value ?? 0;
  }

  /**
   * Returns the current processed value for an axis2d action. `{x:0,y:0}` if unknown.
   * @internal
   */
  _getAxis2dValue(id: symbol): { x: number; y: number } {
    return this._axis2dStates.get(id)?.value ?? { x: 0, y: 0 };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns a human-readable display name for a raw `BindingSource`.
 * Used by `getRemappableActions()` to populate UI labels.
 *
 * @param source - The raw binding source value.
 * @returns A short label string, e.g. `"Space"`, `"Button 0 (Gamepad)"`, `"Tap (Touch)"`.
 */
function _getSourceDisplayName(source: BindingSource): string {
  if (typeof source === "string") return source;
  if (typeof source === "number") return `Button ${source} (Gamepad)`;
  if (source && typeof source === "object") {
    const s = source as Record<string, unknown>;
    const type = String(s["_type"] ?? "");
    switch (type) {
      case "mouse:delta":
        return "Mouse Delta";
      case "mouse:wheel":
        return "Mouse Wheel";
      case "composite2d":
        return "Composite 2D";
      case "composite1d":
        return "Composite";
      case "gesture:tap":
        return `Tap (Touch, ${String(s["fingers"] ?? 1)}F)`;
      case "gesture:swipe":
        return `Swipe ${String(s["direction"] ?? "")} (Touch)`;
      case "gesture:pinch":
        return "Pinch (Touch)";
      case "gesture:rotate":
        return "Rotate (Touch)";
      case "virtual:joystick":
        return `Virtual Joystick (${String(s["id"])})`;
      case "virtual:button":
        return `Virtual Button (${String(s["id"])})`;
      case "gyro:roll":
        return "Gyro Roll";
      case "gyro:pitch":
        return "Gyro Pitch";
      case "gyro:yaw":
        return "Gyro Yaw";
      case "gyro:rotationRate":
        return "Gyro Rotation Rate";
      case "motion:shake":
        return "Shake";
      case "motion:tilt":
        return `Tilt ${String(s["axis"] ?? "")} ${String(s["degrees"] ?? "")}°`;
      default:
        return type || String(source);
    }
  }
  return String(source);
}
