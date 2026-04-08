import type { InputContextDef } from "./define-input-context.js";
import type { BindingEntry } from "./binding.js";
import type { ActionRef, ActionType } from "../types.js";

/**
 * Runtime context manager for a single player.
 *
 * Maintains an ordered stack of active `InputContextDef` instances,
 * sorted by priority (descending), then activation order (most recent first).
 *
 * The plugin queries `getBindingsForAction()` each frame to resolve which
 * bindings apply for a given action.
 */
export class InputContext {
  private readonly registered = new Map<string, InputContextDef>();
  private readonly active: InputContextDef[] = [];

  /**
   * Registers a context definition. Must be called before `activate()`.
   * Idempotent — registering the same context twice is a no-op.
   */
  register(def: InputContextDef): void {
    if (!this.registered.has(def.name)) {
      this.registered.set(def.name, def);
    }
  }

  /**
   * Activates a previously registered context by name.
   * If already active, moves it to the top of same-priority group.
   *
   * @throws {Error} If the context name was never registered.
   */
  activate(name: string): void {
    const def = this.registered.get(name);
    if (!def) {
      throw new Error(
        `[@gwenjs/input] Cannot activate unregistered context "${name}". ` +
          `Call registerContext() or pass contexts to InputPlugin({ contexts: [...] }) first.`,
      );
    }
    // Remove if already active (will re-insert at correct priority position)
    this.deactivate(name);
    // Insert sorted by priority descending, preserving insertion order for ties
    const insertIdx = this.active.findIndex((c) => c.priority < def.priority);
    if (insertIdx === -1) {
      this.active.push(def);
    } else {
      this.active.splice(insertIdx, 0, def);
    }
  }

  /**
   * Deactivates a context by name. No-op if not currently active.
   */
  deactivate(name: string): void {
    const idx = this.active.findIndex((c) => c.name === name);
    if (idx !== -1) this.active.splice(idx, 1);
  }

  /**
   * Returns the names of all currently active contexts, in priority order (highest first).
   */
  get activeContextNames(): readonly string[] {
    return this.active.map((c) => c.name);
  }

  /**
   * Returns all binding entries for the given action across all active contexts.
   *
   * Bindings from higher-priority contexts appear first. The plugin evaluates
   * them in order and uses the first matching source that produces a non-zero value.
   */
  getBindingsForAction<T extends ActionType>(ref: ActionRef<T>): BindingEntry[] {
    const result: BindingEntry[] = [];
    for (const ctx of this.active) {
      for (const entry of ctx.bindings) {
        if (entry.action.id === ref.id) {
          result.push(entry);
        }
      }
    }
    return result;
  }

  /**
   * Returns the priority of a registered context by name, or `undefined` if not registered.
   *
   * @param name - Context name.
   */
  getPriorityOf(name: string): number | undefined {
    return this.registered.get(name)?.priority;
  }

  /**
   * Returns all registered context definitions (active or not).
   */
  getAllRegistered(): InputContextDef[] {
    return [...this.registered.values()];
  }
}
