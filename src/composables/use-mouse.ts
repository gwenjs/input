import { useEngine, GwenPluginNotFoundError } from "@gwenjs/core";
import type { MouseDevice } from "../devices/mouse.js";

/**
 * Returns the raw `MouseDevice` instance.
 * Use for escape-hatch access to raw mouse states.
 * Prefer `useAction()` for game logic, or `usePointer()` for unified pointer input.
 *
 * Must be called inside an active engine context (inside `defineSystem()`,
 * `engine.run()`, or a plugin lifecycle hook).
 *
 * @throws {GwenPluginNotFoundError} If InputPlugin is not registered.
 *
 * @example
 * ```typescript
 * const mouse = useMouse()
 * console.log(mouse.position.x, mouse.position.y)
 * ```
 */
export function useMouse(): MouseDevice {
  const engine = useEngine();
  const input = engine.tryInject("input");
  if (!input) {
    throw new GwenPluginNotFoundError({
      pluginName: "@gwenjs/input",
      hint: "Add '@gwenjs/input' to modules in gwen.config.ts",
      docsUrl: "https://gwenengine.dev/modules/input",
    });
  }
  return input.mouse;
}
