# Interactions & Processors

Interactions and processors modify how a binding behaves — interactions control **when** an action triggers, processors transform the **value** before it reaches your system.

Both are passed as arrays in the `bind()` options:

```typescript
bind(Action, Source, {
  interactions: [...],
  processors: [...],
})
```

---

## Interactions

Interactions gate `isJustTriggered` / `isPressed` / `isJustReleased` semantics on a binding.  
By default (no interaction), a button fires `isJustTriggered` on every press.

Multiple interactions can be combined in the array — they are evaluated in order.

### Press *(default)*

Fires `isJustTriggered` on the first frame the button is down. `isPressed` while held.

```typescript
import { Press } from '@gwenjs/input'

bind(Fire, Keys.Space, { interactions: [Press()] })
```

This is the implicit default and rarely needs to be spelled out.

---

### Release

Fires `isJustTriggered` on the frame the button is **released** (not on press).

```typescript
import { Release } from '@gwenjs/input'

bind(Confirm, Keys.Enter, { interactions: [Release()] })
```

---

### Tap

Fires `isJustTriggered` if the button is released within `tapTime` seconds.  
Long presses are ignored.

```typescript
import { Tap } from '@gwenjs/input'

bind(Dash, GamepadButton.South, { interactions: [Tap({ tapTime: 0.2 })] })
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tapTime` | `number` | `0.2` | Max hold duration (seconds) for a tap to register. |

---

### Hold

Fires `isJustTriggered` once the button has been held for `holdTime` seconds.  
`isPressed` remains true until the button is released.

```typescript
import { Hold } from '@gwenjs/input'

bind(Sprint, Keys.ShiftLeft, { interactions: [Hold({ holdTime: 0.3 })] })
bind(OpenMenu, GamepadButton.Options, { interactions: [Hold({ holdTime: 0.5 })] })
```

| Option | Type | Description |
|--------|------|-------------|
| `holdTime` | `number` | Required hold duration in seconds. |

---

### DoubleTap

Fires `isJustTriggered` when two taps occur within `maxGap` seconds of each other.

```typescript
import { DoubleTap } from '@gwenjs/input'

bind(RollDodge, Keys.ArrowLeft, { interactions: [DoubleTap({ maxGap: 0.25 })] })
bind(RollDodge, Keys.ArrowRight, { interactions: [DoubleTap()] }) // default 0.3s
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxGap` | `number` | `0.3` | Max time between the two taps (seconds). |

---

### Toggle

Toggles `isPressed` on each press. First press → on, second press → off.

- `isJustTriggered` fires when toggling **on**.
- `isJustReleased` fires when toggling **off**.

```typescript
import { Toggle } from '@gwenjs/input'

bind(Crouch, Keys.ControlLeft, { interactions: [Toggle()] })
bind(Aim, GamepadButton.LeftTrigger, { interactions: [Toggle()] })
```

---

### Repeat

Fires `isJustTriggered` repeatedly while the button is held, like keyboard auto-repeat.

- First trigger fires immediately on press.
- Waits `delay` seconds, then fires every `interval` seconds.

```typescript
import { Repeat } from '@gwenjs/input'

bind(SelectNext, Keys.ArrowDown, {
  interactions: [Repeat({ interval: 0.1, delay: 0.4 })]
})
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `interval` | `number` | *(required)* | Time between repeated triggers (seconds). |
| `delay` | `number` | same as `interval` | Initial delay before repeating starts. |

---

### AllOf — Key Chords

Fires only when **all specified keys** are simultaneously held.  
Designed for keyboard shortcuts like <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd>.

```typescript
import { AllOf } from '@gwenjs/input'

bind(Undo, Keys.KeyZ, {
  interactions: [AllOf(Keys.ControlLeft, Keys.ShiftLeft)]
})
bind(SelectAll, Keys.KeyA, {
  interactions: [AllOf(Keys.ControlLeft)]
})
```

The bound key (`Keys.KeyZ`) is the main trigger; the keys passed to `AllOf` are the required modifiers.

---

### ChordedWith — Cross-Action Chord

Fires only when another **action** satisfies a condition.  
Useful for gameplay combos without polluting system logic.

```typescript
import { ChordedWith } from '@gwenjs/input'

// Drift only fires while Jump is held
bind(Drift, GamepadStick.LeftX, {
  interactions: [ChordedWith(Jump, 'isPressed')]
})

// Parry fires only on the first frame Sprint triggers
bind(Parry, Keys.KeyP, {
  interactions: [ChordedWith(Sprint, 'isJustTriggered')]
})
```

| Argument | Type | Description |
|----------|------|-------------|
| `actionRef` | `ActionRef` | The action that must satisfy `condition`. |
| `condition` | `'isPressed' \| 'isJustTriggered'` | The required state of that action. |

---

## Processors

Processors transform the **value** of a binding before it is read by systems.  
They apply to axis sources (`axis1d`, `axis2d`) and some also to buttons.

Processors are applied in order — chain them to combine effects:

```typescript
bind(Move, GamepadStick.Left, {
  processors: [DeadZone(0.15), Normalize(), Scale(1.5)]
})
```

---

### DeadZone

Zeroes out values below a threshold. Prevents stick drift.

- `axis1d`: if `|value| < threshold` → `0`
- `axis2d`: circular deadzone on the magnitude

```typescript
import { DeadZone } from '@gwenjs/input'

bind(Move, GamepadStick.Left, { processors: [DeadZone(0.15)] })
```

| Argument | Type | Description |
|----------|------|-------------|
| `threshold` | `number` | Deadzone threshold (0–1). |

---

### Scale

Multiplies the value by a factor.

```typescript
import { Scale } from '@gwenjs/input'

bind(Move, GamepadStick.Left, { processors: [Scale(2)] })    // 2x sensitive
bind(Look, MouseDelta(), { processors: [Scale(0.5)] })        // half speed
```

---

### Invert / InvertX / InvertY

Flips axis direction.

```typescript
import { Invert, InvertX, InvertY } from '@gwenjs/input'

bind(LookY, MouseDelta(), { processors: [InvertY()] })         // inverted flight
bind(Move, GamepadStick.Left, { processors: [InvertX()] })     // invert X only
bind(Throttle, GamepadAxis.LeftTrigger, { processors: [Invert()] }) // axis1d
```

| Function | Applies to | Effect |
|----------|-----------|--------|
| `Invert()` | `axis1d`, `axis2d` | Multiply all axes by `-1` |
| `InvertX()` | `axis2d` only | Multiply X by `-1` |
| `InvertY()` | `axis2d` only | Multiply Y by `-1` |

---

### Clamp

Clamps value to `[min, max]`. For `axis2d`, each axis is clamped independently.

```typescript
import { Clamp } from '@gwenjs/input'

bind(Move, GamepadStick.Left, { processors: [Clamp(-0.8, 0.8)] })
```

---

### Normalize

Normalizes a 2D vector to unit magnitude (length ≤ 1). No effect on `axis1d` or buttons.

```typescript
import { Normalize } from '@gwenjs/input'

bind(Move, GamepadStick.Left, { processors: [Normalize()] })
```

Use after `DeadZone` to re-expand the usable range:

```typescript
processors: [DeadZone(0.15), Normalize()]
```

---

### Smooth

Smooths value changes using a lerp per frame.  
`factor = 1` means instant (no smoothing). Default: `0.1`.

```typescript
import { Smooth } from '@gwenjs/input'

bind(Move, GamepadStick.Left, { processors: [Smooth(0.08)] })
bind(Look, MouseDelta(), { processors: [Smooth(0.15)] })
```

::: info Per-binding state
Each binding maintains its own smooth state — multiple bindings on the same source each get their own smoothed value.
:::

---

### SwizzleXY

Swaps X and Y components of a 2D axis. No effect on `axis1d` or buttons.

```typescript
import { SwizzleXY } from '@gwenjs/input'

bind(Look, GamepadStick.Right, { processors: [SwizzleXY()] })
```

---

## Combining Interactions & Processors

Interactions and processors can be used together on the same binding:

```typescript
// Sprint: hold for 0.3s, with stick smoothed and deadzoned
bind(Sprint, GamepadStick.Left, {
  interactions: [Hold({ holdTime: 0.3 })],
  processors: [DeadZone(0.1), Smooth(0.12)],
})

// Undo: Ctrl+Shift+Z, with auto-repeat
bind(Undo, Keys.KeyZ, {
  interactions: [AllOf(Keys.ControlLeft, Keys.ShiftLeft), Repeat({ interval: 0.15, delay: 0.5 })],
})
```
