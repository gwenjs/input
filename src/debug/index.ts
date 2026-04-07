/**
 * Debug API barrel for `@gwenjs/input`.
 *
 * Re-exports all public debug types and the `InputDebugAPIImpl` implementation.
 *
 * @module
 */

export type {
  InputDebugAPI,
  InputDebugSnapshot,
  ActionEvent,
  BindingMapEntry,
  ActionTriggeredEvent,
  ContextChangedEvent,
  BindingChangedEvent,
  DeviceChangedEvent,
  RecordingStateEvent,
} from "./debug-api.js";

export { InputDebugAPIImpl } from "./debug-api.js";
export { DevOverlay } from "./dev-overlay.js";
