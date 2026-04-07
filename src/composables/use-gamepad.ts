import { useEngine, GwenPluginNotFoundError } from "@gwenjs/core";
import type { GamepadDevice } from "../devices/gamepad.js";

/**
 * Returns the raw `GamepadDevice` instance.
 * Use for escape-hatch access to raw gamepad states.
 * Prefer `useAction()` for game logic.
 *
 * Must be called inside an active engine context (inside `defineSystem()`,
 * `engine.run()`, or a plugin lifecycle hook).
 *
 * @param _slot - Gamepad slot index. Currently unused — all gamepads share one `GamepadDevice`
 *   instance; pass the pad index directly to each method (e.g. `isButtonPressed(0, btn)`).
 *   Reserved for future per-slot device isolation. Default: 0.
 * @throws {GwenPluginNotFoundError} If InputPlugin is not registered.
 *
 * @example
 * ```typescript
 * const gp = useGamepad()
 * if (gp.isButtonJustPressed(0, 0)) { ... } // pad 0, button 0
 * ```
 */
export function useGamepad(_slot = 0): GamepadDevice {
  const engine = useEngine();
  const input = engine.tryInject("input");
  if (!input) {
    throw new GwenPluginNotFoundError({
      pluginName: "@gwenjs/input",
      hint: "Add '@gwenjs/input' to modules in gwen.config.ts",
      docsUrl: "https://gwenengine.dev/modules/input",
    });
  }
  return input.gamepad;
}
