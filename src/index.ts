// Side-effect: augment engine types
import './augment.js'

// Plugin
export { InputPlugin } from './plugin/index.js'
export type { InputPluginConfig, InputPluginHooks, VirtualJoystickConfig, VirtualButtonConfig, DevOverlayConfig } from './plugin/index.js'

// DX APIs
export * from './actions/index.js'
export * from './contexts/index.js'
export * from './constants/index.js'
export * from './devices/index.js'
export * from './processors/index.js'
export * from './interactions/index.js'

// Virtual controls
export { VirtualControlsOverlay } from './virtual/index.js'

// Composables
export { useInput, usePlayer, useInputRecorder, useInputPlayback } from './composables.js'
export * from './composables/index.js'

// Players
export * from './players/index.js'

// Recording / playback
export * from './recording/index.js'

// Debug API
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
} from './debug/index.js'

// Types
export type * from './types.js'

// module.ts is exported via the './module' sub-path export — not from index to avoid circular deps
