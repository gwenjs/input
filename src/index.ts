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

// Composables
export { useInput } from './composables.js'

// Types
export type * from './types.js'

// module.ts is exported via the './module' sub-path export — not from index to avoid circular deps
