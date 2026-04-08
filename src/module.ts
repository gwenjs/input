/**
 * Build-time module for @gwenjs/input.
 *
 * Add to gwen.config.ts:
 *   modules: ['@gwenjs/input']
 *
 * IMPORTANT: This file must never import from './index.js'.
 * Always import from './plugin.js' or './types.js' directly.
 */

import { defineGwenModule } from "@gwenjs/kit/module";
import { definePluginTypes } from "@gwenjs/kit/plugin";
import type { InputPluginConfig } from "./plugin/config.js";

export default defineGwenModule<InputPluginConfig>({
  meta: { name: "@gwenjs/input" },
  defaults: { players: 1, devOverlay: false },
  async setup(options: InputPluginConfig, kit: any) {
    // Direct import from plugin.ts — never from index.ts
    const { InputPlugin } = await import("./plugin/index.js");

    kit.addPlugin(InputPlugin(options));

    kit.addAutoImports([
      { name: "defineAction",      from: "@gwenjs/input" },
      { name: "defineInputSchema", from: "@gwenjs/input" },
      { name: "defineInputContext",from: "@gwenjs/input" },
      { name: "bind",              from: "@gwenjs/input" },
      { name: "useInput",          from: "@gwenjs/input" },
      { name: "useAction",         from: "@gwenjs/input" },
      { name: "usePlayer",         from: "@gwenjs/input" },
      { name: "useKeyboard",       from: "@gwenjs/input" },
      { name: "useMouse",          from: "@gwenjs/input" },
      { name: "useGamepad",        from: "@gwenjs/input" },
      { name: "useTouch",          from: "@gwenjs/input" },
      { name: "useGyroscope",      from: "@gwenjs/input" },
      { name: "usePointer",        from: "@gwenjs/input" },
      { name: "useInputRecorder",  from: "@gwenjs/input" },
      { name: "useInputPlayback",  from: "@gwenjs/input" },
      { name: "forPlayers",        from: "@gwenjs/input" },
    ]);

    kit.addTypeTemplate({
      filename: "input.d.ts",
      getContents: () =>
        definePluginTypes({
          imports: [
            "import type { InputService, PlayerInput } from '@gwenjs/input'",
          ],
          provides: {
            input:      "InputService",
            "player:0": "PlayerInput",
            "player:1": "PlayerInput",
            "player:2": "PlayerInput",
            "player:3": "PlayerInput",
          },
          hooks: {
            "input:contextActivated":   "(name: string, priority: number) => void",
            "input:contextDeactivated": "(name: string) => void",
            "input:deviceChanged":      "(type: 'gamepad' | 'touch' | 'gyro', event: 'connected' | 'disconnected', index: number) => void",
            "input:bindingChanged":     "(playerId: number, action: string, index: number) => void",
            "input:recordingState":     "(state: 'started' | 'stopped' | 'playing' | 'paused') => void",
          },
        }),
    });
  },
});
