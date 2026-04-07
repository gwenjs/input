import type {
  ActionType,
  ActionRef,
  ActionSchemaMap,
  RefsFromSchema,
} from '../types.js'
import { defineAction } from './define-action.js'

// Minimal forward declaration to avoid circular import
// Full implementation is in src/contexts/define-input-context.ts
export interface InputContextDef {
  name: string
  priority: number
  bindings: unknown[]
}

/** The return type of `defineInputSchema`. */
export interface InputSchemaResult<S extends ActionSchemaMap> {
  /**
   * Typed action references — one per key in the schema, with the correct
   * `ActionRef<T>` literal type preserved.
   */
  actions: RefsFromSchema<S>
  /**
   * The input context definition, ready to pass to `InputPlugin({ contexts: [...] })`
   * or to register via `player.registerContext()`.
   */
  context: InputContextDef
}

/**
 * Defines actions and their default bindings in a single declaration.
 *
 * Returns typed `ActionRef<T>` references (one per action key) and an
 * `InputContextDef` containing all the default bindings. This is the
 * **recommended pattern** for most games — it co-locates action definitions
 * with their default bindings, reducing boilerplate and keeping the action
 * type literal (enabling full TypeScript inference on `useAction()`).
 *
 * ### TypeScript inference
 *
 * The `const S` generic (TypeScript 5.0+ const generic) prevents string literal
 * widening inside the schema, so `actions.Jump` is inferred as `ActionRef<'button'>`,
 * not `ActionRef<ActionType>`. This flows through to `useAction(actions.Jump)` returning
 * `ButtonActionState` without any casts.
 *
 * **Important:** The `type` field in each action entry MUST be an inline string literal.
 * Assigning it via a variable typed as `ActionType` loses the literal and degrades inference.
 *
 * @param name - Context name (used for activate/deactivate at runtime).
 * @param config - Schema configuration with priority and action entries.
 * @returns `{ actions, context }` — typed refs + the context definition.
 *
 * @example
 * ```typescript
 * import { defineInputSchema, Keys, GamepadButtons, GamepadStick,
 *          Composite2D, DeadZone, Smooth } from '@gwenjs/input'
 *
 * export const { actions, context: GameplayContext } = defineInputSchema('gameplay', {
 *   priority: 0,
 *   actions: {
 *     Jump: { type: 'button', bindings: [Keys.Space, GamepadButtons.South] },
 *     Move: {
 *       type: 'axis2d',
 *       bindings: [
 *         Composite2D({ up: Keys.W, down: Keys.S, left: Keys.A, right: Keys.D }),
 *         { source: GamepadStick.Left, processors: [DeadZone(0.15), Smooth(0.08)] },
 *       ],
 *     },
 *   },
 * })
 *
 * // actions.Jump : ActionRef<'button'>  ✅
 * // actions.Move : ActionRef<'axis2d'>  ✅
 *
 * // In a system:
 * const jump = useAction(actions.Jump)  // ButtonActionState
 * const move = useAction(actions.Move)  // Axis2DActionState
 * ```
 */
export function defineInputSchema<const S extends ActionSchemaMap>(
  name: string,
  config: {
    priority: number
    actions: S
  },
): InputSchemaResult<S> {
  const actions = {} as RefsFromSchema<S>
  const bindings: unknown[] = []

  for (const [key, entry] of Object.entries(config.actions)) {
    const ref = defineAction(key, { type: entry.type as ActionType })
    ;(actions as Record<string, ActionRef<ActionType>>)[key] = ref

    for (const binding of entry.bindings) {
      bindings.push({ action: ref, binding })
    }
  }

  const context: InputContextDef = {
    name,
    priority: config.priority,
    bindings,
  }

  return { actions, context }
}
