/**
 * Keyboard key code constants, mapped to browser `KeyboardEvent.code` values.
 *
 * Use these as binding sources in `bind()`, `Composite2D()`, `AllOf()`, etc.
 *
 * @example
 * ```typescript
 * bind(Jump, Keys.Space)
 * bind(Move, Composite2D({ up: Keys.W, down: Keys.S, left: Keys.A, right: Keys.D }))
 * ```
 */
export const Keys = {
  // Letters
  A: 'KeyA', B: 'KeyB', C: 'KeyC', D: 'KeyD', E: 'KeyE', F: 'KeyF',
  G: 'KeyG', H: 'KeyH', I: 'KeyI', J: 'KeyJ', K: 'KeyK', L: 'KeyL',
  M: 'KeyM', N: 'KeyN', O: 'KeyO', P: 'KeyP', Q: 'KeyQ', R: 'KeyR',
  S: 'KeyS', T: 'KeyT', U: 'KeyU', V: 'KeyV', W: 'KeyW', X: 'KeyX',
  Y: 'KeyY', Z: 'KeyZ',
  // Digits
  Digit0: 'Digit0', Digit1: 'Digit1', Digit2: 'Digit2', Digit3: 'Digit3',
  Digit4: 'Digit4', Digit5: 'Digit5', Digit6: 'Digit6', Digit7: 'Digit7',
  Digit8: 'Digit8', Digit9: 'Digit9',
  // Arrows
  ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight',
  // Control keys
  Space: 'Space', Enter: 'Enter', Escape: 'Escape', Backspace: 'Backspace',
  Tab: 'Tab', Delete: 'Delete', Insert: 'Insert', Home: 'Home', End: 'End',
  PageUp: 'PageUp', PageDown: 'PageDown',
  // Modifiers
  ShiftLeft: 'ShiftLeft', ShiftRight: 'ShiftRight',
  ControlLeft: 'ControlLeft', ControlRight: 'ControlRight',
  AltLeft: 'AltLeft', AltRight: 'AltRight',
  MetaLeft: 'MetaLeft', MetaRight: 'MetaRight',
  // Function keys
  F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4', F5: 'F5', F6: 'F6',
  F7: 'F7', F8: 'F8', F9: 'F9', F10: 'F10', F11: 'F11', F12: 'F12',
  // Numpad
  Numpad0: 'Numpad0', Numpad1: 'Numpad1', Numpad2: 'Numpad2', Numpad3: 'Numpad3',
  Numpad4: 'Numpad4', Numpad5: 'Numpad5', Numpad6: 'Numpad6', Numpad7: 'Numpad7',
  Numpad8: 'Numpad8', Numpad9: 'Numpad9',
  NumpadAdd: 'NumpadAdd', NumpadSubtract: 'NumpadSubtract',
  NumpadMultiply: 'NumpadMultiply', NumpadDivide: 'NumpadDivide',
  NumpadEnter: 'NumpadEnter', NumpadDecimal: 'NumpadDecimal',
  // Punctuation
  Semicolon: 'Semicolon', Quote: 'Quote', Backquote: 'Backquote',
  BracketLeft: 'BracketLeft', BracketRight: 'BracketRight',
  Backslash: 'Backslash', Comma: 'Comma', Period: 'Period', Slash: 'Slash',
  Minus: 'Minus', Equal: 'Equal',
  // Locks
  CapsLock: 'CapsLock', NumLock: 'NumLock', ScrollLock: 'ScrollLock',
} as const

/** A valid keyboard key code string. */
export type KeyCode = typeof Keys[keyof typeof Keys]
