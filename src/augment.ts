/**
 * Declaration merging — augments @gwenjs/core with input service and runtime hooks.
 * Activated as a side-effect when importing from '@gwenjs/input'.
 */

import type { InputPluginHooks } from "./plugin/index.js";
import type { InputService } from "./players/input-service.js";
import type { PlayerInput } from "./players/player-input.js";

declare module "@gwenjs/core" {
  interface GwenRuntimeHooks extends InputPluginHooks {}

  interface GwenProvides {
    input: InputService;
    "player:0": PlayerInput;
    "player:1": PlayerInput;
    "player:2": PlayerInput;
    "player:3": PlayerInput;
  }
}

export {};
