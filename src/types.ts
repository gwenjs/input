/** The three fundamental action value shapes. */
export type ActionType = "button" | "axis1d" | "axis2d";

/**
 * A typed reference to a registered action.
 * Created by `defineAction()` or `defineInputSchema()`.
 * @template T - The action value type ('button' | 'axis1d' | 'axis2d')
 */
export interface ActionRef<T extends ActionType> {
  /** Unique symbol identifier — prevents name collisions across packages. */
  readonly id: symbol;
  /** Human-readable name used in serialization and debug output. */
  readonly name: string;
  /** The action's value type — preserved as a literal by defineAction/defineInputSchema. */
  readonly type: T;
}

/**
 * The per-frame state of a button action.
 * Read via `useAction(ref)` or `player.action(ref)`.
 */
export interface ButtonActionState {
  readonly type: "button";
  /** True while the binding is held (isJustTriggered OR actively held). */
  readonly isPressed: boolean;
  /** True on the first frame the binding activates (respects Interaction semantics). */
  readonly isJustTriggered: boolean;
  /** True on the first frame the binding deactivates. */
  readonly isJustReleased: boolean;
  /** Seconds the binding has been held continuously. Resets to 0 on release. */
  readonly holdTime: number;
}

/**
 * The per-frame state of a 1D axis action (e.g. a trigger, scroll wheel, single stick axis).
 */
export interface Axis1DActionState {
  readonly type: "axis1d";
  /** Processed value in the range [-1, 1] after all processors are applied. */
  readonly value: number;
  /** Raw value before any processors. */
  readonly rawValue: number;
}

/**
 * The per-frame state of a 2D axis action (e.g. a stick, mouse delta, virtual joystick).
 */
export interface Axis2DActionState {
  readonly type: "axis2d";
  /** Processed {x, y} value after all processors. Each axis in range [-1, 1]. */
  readonly value: Readonly<{ x: number; y: number }>;
  /** Raw {x, y} before any processors. */
  readonly rawValue: Readonly<{ x: number; y: number }>;
  /** Magnitude of `value` (Euclidean length). Capped at 1 after Normalize processor. */
  readonly magnitude: number;
}

/**
 * Maps an ActionType literal to its corresponding ActionState interface.
 * Used to infer the return type of `useAction()` and `player.action()`.
 *
 * @example
 * ```typescript
 * // useAction(Jump) returns ButtonActionState — not unknown
 * const state: ActionState<'button'> = useAction(Jump)
 * ```
 */
export type ActionState<T extends ActionType> = T extends "button"
  ? ButtonActionState
  : T extends "axis1d"
    ? Axis1DActionState
    : Axis2DActionState;

// ─── defineInputSchema types ───────────────────────────────────────────────

/**
 * A single action entry within a schema map.
 * `type` must be an inline string literal for TypeScript to infer `ActionRef<T>` correctly.
 */
export interface ActionSchemaEntry {
  /** Action value type — MUST be an inline literal ('button', 'axis1d', 'axis2d'). */
  type: ActionType;
  /**
   * Default bindings for this action.
   * Each entry is a BindingSource or a { source, processors?, interactions? } object.
   * (BindingEntry is defined in contexts/binding.ts — typed as unknown here to avoid circular deps.)
   */
  bindings: unknown[];
}

/**
 * A record of action schema entries, keyed by action name.
 * Used as the generic parameter for `defineInputSchema`.
 */
export type ActionSchemaMap = Record<string, ActionSchemaEntry>;

/**
 * Maps each key of a schema to its corresponding `ActionRef<T>` with the correct type literal.
 * Requires `const S extends ActionSchemaMap` (TypeScript 5.0+ const generic) to preserve literals.
 *
 * @example
 * ```typescript
 * type S = { Jump: { type: 'button'; bindings: [] }; Move: { type: 'axis2d'; bindings: [] } }
 * type Refs = RefsFromSchema<S>
 * // { Jump: ActionRef<'button'>; Move: ActionRef<'axis2d'> }
 * ```
 */
export type RefsFromSchema<S extends ActionSchemaMap> = {
  [K in keyof S]: ActionRef<S[K]["type"]>;
};
