// Side-effect: activates typed engine.inject('input') in manual mode
import './augment.js'

// Plugin factory — for manual registration in plugins: []
export { InputPlugin } from './plugin.js'

// Composables — useInput() for runtime access
export { useInput } from './composables.js'

// Public types
export type { InputConfig, InputService } from './types.js'

// The build-time module is exported via the './module' package export.
// Do NOT re-export it here — that would create a circular dependency.
