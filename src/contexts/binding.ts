import type { ActionRef, ActionType } from "../types.js";

// ─── Processor / Interaction markers ─────────────────────────────────────────

/**
 * An opaque processor descriptor created by processor factories (DeadZone, Scale, etc.).
 * The runtime plugin reads the `_type` tag and dispatches to the correct processor.
 */
export interface ProcessorDescriptor {
  readonly _type: string;
  readonly [key: string]: unknown;
}

/**
 * An opaque interaction descriptor created by interaction factories (Hold, Tap, etc.).
 * The runtime plugin reads the `_type` tag and dispatches to the correct interaction.
 */
export interface InteractionDescriptor {
  readonly _type: string;
  readonly [key: string]: unknown;
}

// ─── Binding source ───────────────────────────────────────────────────────────

/**
 * Any valid raw binding source — a keyboard key code, gamepad button index,
 * gamepad stick identifier, touch gesture, virtual control, gyro axis, or
 * composite source.
 *
 * Primitive sources (strings and numbers) are bare constants from `Keys`,
 * `GamepadButtons`, `GamepadStick`, `GyroAxis`, etc. Composite and gesture
 * sources are objects created by factory functions.
 */
export type BindingSource =
  | string
  | number
  | CompositeSource
  | GestureSource
  | VirtualSource
  | GyroSource
  | MouseDeltaSource
  | MouseWheelSource;

/** A composite 2D source (4 keys → axis2d). Created by `Composite2D()`. */
export interface CompositeSource {
  readonly _type: "composite2d";
  readonly up: string;
  readonly down: string;
  readonly left: string;
  readonly right: string;
}

/** A composite 1D source (2 keys → axis1d). Created by `Composite()`. */
export interface Composite1DSource {
  readonly _type: "composite1d";
  readonly negative: string;
  readonly positive: string;
}

/** Mouse movement delta → axis2d source. Created by `MouseDelta()`. */
export interface MouseDeltaSource {
  readonly _type: "mouse:delta";
}

/** Mouse wheel → axis1d source. Created by `MouseWheel()`. */
export interface MouseWheelSource {
  readonly _type: "mouse:wheel";
}

/** Touch gesture source (Tap, Swipe, Pinch, Rotate). Created by `TouchGesture.*`. */
export interface GestureSource {
  readonly _type: string; // 'gesture:tap' | 'gesture:swipe' | 'gesture:pinch' | 'gesture:rotate'
  readonly [key: string]: unknown;
}

/** Virtual control source (on-screen joystick or button). */
export interface VirtualSource {
  readonly _type: "virtual:joystick" | "virtual:button";
  readonly id: string;
}

/** Gyroscope axis source. Created by referencing `GyroAxis.*` or `MotionGesture.*`. */
export interface GyroSource {
  readonly _type: string; // 'gyro:roll' | 'gyro:pitch' | etc.
}

// ─── Binding entry ────────────────────────────────────────────────────────────

/**
 * A fully-specified binding entry: a source with optional processors and interactions.
 * Created by `bind()`.
 */
export interface BindingEntry {
  /** The action this binding is for. */
  readonly action: ActionRef<ActionType>;
  /** The raw input source (key, button, stick, gesture, etc.). */
  readonly source: BindingSource;
  /** Processors applied in order to the raw value before it reaches ActionState. */
  readonly processors: ProcessorDescriptor[];
  /** Interactions that control when isJustTriggered / isJustReleased fire. */
  readonly interactions: InteractionDescriptor[];
}

/** Options for a binding entry (processors and interactions). */
export interface BindingOptions {
  processors?: ProcessorDescriptor[];
  interactions?: InteractionDescriptor[];
}

// ─── bind() ──────────────────────────────────────────────────────────────────

/**
 * Creates a binding entry linking an action to a raw input source.
 *
 * Bindings are collected into an `InputContextDef` via `defineInputContext()`
 * or `defineInputSchema()` and evaluated each frame by the input plugin.
 *
 * @param action - The action reference to bind to (created by `defineAction()` or `defineInputSchema()`).
 * @param source - The raw input source: a key code, gamepad button, stick, composite, gesture, etc.
 * @param options - Optional processors and interactions to apply.
 * @returns A `BindingEntry` to pass to `defineInputContext()`.
 *
 * @example
 * ```typescript
 * const GameplayContext = defineInputContext('gameplay', {
 *   priority: 0,
 *   bindings: [
 *     bind(Jump, Keys.Space),
 *     bind(Jump, GamepadButtons.South),
 *     bind(Move, Composite2D({ up: Keys.W, down: Keys.S, left: Keys.A, right: Keys.D })),
 *     bind(Move, GamepadStick.Left, { processors: [DeadZone(0.15), Smooth(0.08)] }),
 *     bind(Sprint, Keys.ShiftLeft, { interactions: [Hold({ holdTime: 0.1 })] }),
 *   ],
 * })
 * ```
 */
export function bind<T extends ActionType>(
  action: ActionRef<T>,
  source: BindingSource,
  options: BindingOptions = {},
): BindingEntry {
  return {
    action,
    source,
    processors: options.processors ?? [],
    interactions: options.interactions ?? [],
  };
}
