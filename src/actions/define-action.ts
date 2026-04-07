import type { ActionType, ActionRef } from '../types.js'

/**
 * Creates a typed action reference with a stable identity.
 *
 * The generic parameter `T` is inferred directly from the `type` literal in `config`,
 * so the return type is `ActionRef<'button'>`, `ActionRef<'axis1d'>`, or
 * `ActionRef<'axis2d'>` — never widened to `ActionRef<ActionType>`.
 *
 * Use `defineAction` when an action must be shared across multiple input contexts
 * (defined separately from its bindings). For the common case of co-locating
 * actions with their bindings, prefer `defineInputSchema`.
 *
 * @param name - Human-readable name, used in serialization and debug output.
 *   Must be unique within the game — collisions produce silent runtime bugs.
 * @param config - Configuration object containing the action's value type.
 * @returns A typed `ActionRef<T>` with a unique symbol identity.
 *
 * @example
 * ```typescript
 * // Actions defined once, used in multiple contexts
 * export const Jump    = defineAction('Jump',    { type: 'button' })
 * export const Move    = defineAction('Move',    { type: 'axis2d' })
 * export const Confirm = defineAction('Confirm', { type: 'button' })
 * ```
 */
export function defineAction<T extends ActionType>(
  name: string,
  config: { type: T },
): ActionRef<T> {
  return {
    id: Symbol(name),
    name,
    type: config.type,
  }
}
