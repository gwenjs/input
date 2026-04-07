import type { BindingEntry } from "./binding.js";

/**
 * An immutable definition of an input context.
 *
 * Created by `defineInputContext()` or returned by `defineInputSchema()`.
 * Pass instances to `InputPlugin({ contexts: [...] })` or register them
 * at runtime via `player.registerContext()`.
 *
 * Input contexts are prioritized stacks: when multiple contexts are active,
 * the one with the highest `priority` value resolves the action bindings first.
 * On ties, the most recently activated context wins.
 */
export interface InputContextDef {
  /** Unique context name — used to activate/deactivate at runtime. */
  readonly name: string;
  /**
   * Context priority. Higher values take precedence over lower values.
   * A menu context (priority 10) overrides a gameplay context (priority 0).
   */
  readonly priority: number;
  /**
   * All binding entries in this context.
   * Created via `bind(action, source, { processors?, interactions? })`.
   */
  readonly bindings: BindingEntry[];
}

/**
 * Configuration for `defineInputContext()`.
 */
export interface InputContextConfig {
  /**
   * Context priority. Higher values take precedence over lower values.
   * Typically: gameplay = 0, in-vehicle = 1, menu = 10, cutscene = 20.
   */
  priority: number;
  /**
   * All binding entries for this context.
   * Use `bind(action, source, options?)` to create entries.
   */
  bindings: BindingEntry[];
}

/**
 * Defines an input context — a named, prioritized set of action bindings.
 *
 * Contexts can be activated and deactivated at runtime per player, enabling
 * seamless input switching between game states (gameplay, menus, vehicles,
 * cutscenes, etc.) without modifying systems.
 *
 * For most games, prefer `defineInputSchema()` which co-locates action
 * definitions with their context. Use `defineInputContext()` when you need
 * to bind existing actions (defined via `defineAction()`) to a new context.
 *
 * @param name - Unique context name. Used with `player.activateContext(name)`.
 * @param config - Context configuration (priority + binding entries).
 * @returns An immutable `InputContextDef` to register with the plugin.
 *
 * @example
 * ```typescript
 * import { defineInputContext, bind } from '@gwenjs/input'
 * import { Jump, Move } from '../actions'
 * import { Keys, GamepadButtons } from '@gwenjs/input/constants'
 *
 * export const GameplayContext = defineInputContext('gameplay', {
 *   priority: 0,
 *   bindings: [
 *     bind(Jump, Keys.Space),
 *     bind(Jump, GamepadButtons.South),
 *   ],
 * })
 *
 * export const MenuContext = defineInputContext('menu', {
 *   priority: 10,  // overrides gameplay
 *   bindings: [
 *     bind(Confirm, Keys.Enter),
 *     bind(Back, Keys.Escape),
 *   ],
 * })
 * ```
 */
export function defineInputContext(name: string, config: InputContextConfig): InputContextDef {
  return {
    name,
    priority: config.priority,
    bindings: config.bindings,
  };
}
