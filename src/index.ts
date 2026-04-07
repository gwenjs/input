// Side-effect: activates typed engine.inject('input') in manual mode
import './augment.js'

// Plugin factory — for manual registration in plugins: []
export { InputPlugin } from './plugin/index.js'
export type { InputPluginConfig, InputPluginHooks } from './plugin/index.js'

// Composables — useInput() for runtime access
export { useInput } from './composables.js'

// The build-time module is exported via the './module' package export.
// Do NOT re-export it here — that would create a circular dependency.
