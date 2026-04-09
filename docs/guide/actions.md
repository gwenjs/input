# Actions

Actions are the central abstraction in `@gwenjs/input`. Instead of checking raw key codes in your game logic, you define named actions and map them to input sources in contexts. This decouples game logic from physical controls and enables runtime rebinding.

## defineAction

```ts
function defineAction<T extends ActionType>(
  name: string,
  config: { type: T }
): ActionRef<T>
```

Creates a typed action reference with a stable symbol identity.

```ts
import { defineAction } from '@gwenjs/input'

export const Jump    = defineAction('Jump',    { type: 'button' })
export const Throttle = defineAction('Throttle', { type: 'axis1d' })
export const Move    = defineAction('Move',    { type: 'axis2d' })
```

### ActionType

| Type      | Value shape                          | Use case                          |
|-----------|--------------------------------------|-----------------------------------|
| `button`  | `ButtonActionState`                  | Jump, shoot, confirm, cancel      |
| `axis1d`  | `Axis1DActionState` — `value: number` | Throttle, brake, scroll wheel     |
| `axis2d`  | `Axis2DActionState` — `value: {x,y}` | Move, aim, camera, joystick       |

### ActionRef

Each call to `defineAction` returns an `ActionRef<T>`:

```ts
interface ActionRef<T extends ActionType> {
  readonly id: symbol     // unique identity — no name collisions
  readonly name: string   // used in debug output and serialization
  readonly type: T        // literal type preserved for full TS inference
}
```

Export `ActionRef` objects from a shared module. Do not call `defineAction` more than once for the same logical action — the `id` symbol must be stable.

## bind

```ts
function bind<T extends ActionType>(
  action: ActionRef<T>,
  source: BindingSource,
  options?: BindingOptions
): BindingEntry
```

Creates a binding entry that maps an action to an input source, optionally with processors and interactions.

```ts
import { bind } from '@gwenjs/input'
import { Keys, GamepadButtons, GamepadStick } from '@gwenjs/input/constants'
import { DeadZone, Smooth } from '@gwenjs/input/processors'
import { Hold } from '@gwenjs/input/interactions'

bind(Jump, Keys.Space)
bind(Jump, GamepadButtons.South)
bind(Move, GamepadStick.Left, { processors: [DeadZone(0.15), Smooth(0.08)] })
bind(Sprint, Keys.ShiftLeft, { interactions: [Hold({ holdTime: 0.1 })] })
```

### BindingSource types

| Source | Type | Example |
|--------|------|---------|
| Keyboard key | `string` | `Keys.Space`, `'KeyW'`, `'ArrowUp'` |
| Mouse button | `number` | `0` (left), `1` (middle), `2` (right) |
| Gamepad button | `number` | `GamepadButtons.South` (0), `GamepadButtons.East` (1) |
| Gamepad axis | `string` | `GamepadStick.Left`, `GamepadStick.Right` |
| Composite 2D | `CompositeSource` | `Composite2D({ up, down, left, right })` |
| Composite 1D | `Composite1DSource` | `Composite({ negative, positive })` |
| Mouse delta | `MouseDeltaSource` | `MouseDelta()` |
| Mouse wheel | `MouseWheelSource` | `MouseWheel()` |
| Touch gesture | `GestureSource` | `TouchGesture.Tap()`, `TouchGesture.Swipe()` |
| Virtual control | `VirtualSource` | `VirtualJoystick('id')`, `VirtualButton('id')` |
| Gyro axis | `GyroSource` | `GyroAxis.Roll`, `GyroAxis.Pitch` |

### BindingOptions

| Option | Type | Description |
|--------|------|-------------|
| `processors` | `ProcessorDescriptor[]` | Transform the raw value before it reaches the action state. E.g. `DeadZone(0.15)`, `Smooth(0.1)`, `Invert()`, `Scale(2)`, `Clamp(-1, 1)`, `Normalize()`. |
| `interactions` | `InteractionDescriptor[]` | Control when `isJustTriggered`/`isJustReleased` fire. E.g. `Hold({ holdTime: 0.3 })`, `Tap({ tapTime: 0.2 })`, `DoubleTap()`, `Toggle()`, `Repeat({ interval: 0.1 })`. |

## defineInputSchema (recommended)

For most games, co-locate action definitions with their bindings using `defineInputSchema`:

```ts
import { defineInputSchema, Composite2D } from '@gwenjs/input'
import { Keys, GamepadButtons, GamepadStick } from '@gwenjs/input/constants'
import { DeadZone, Smooth } from '@gwenjs/input/processors'

export const { actions, context: GameplayContext } = defineInputSchema('gameplay', {
  priority: 0,
  actions: {
    Jump: {
      type: 'button',
      bindings: [Keys.Space, GamepadButtons.South],
    },
    Move: {
      type: 'axis2d',
      bindings: [
        Composite2D({ up: Keys.W, down: Keys.S, left: Keys.A, right: Keys.D }),
        { source: GamepadStick.Left, processors: [DeadZone(0.15), Smooth(0.08)] },
      ],
    },
    Sprint: {
      type: 'button',
      bindings: [{ source: Keys.ShiftLeft, interactions: [Hold({ holdTime: 0.1 })] }],
    },
  },
})

// actions.Jump : ActionRef<'button'>  ✅
// actions.Move : ActionRef<'axis2d'>  ✅
```

The returned `actions` object contains fully typed `ActionRef<T>` — the literal type is preserved through TypeScript's const generic inference. Pass `context` to `InputPlugin({ contexts: [...] })`.

## Reading action state

```ts
import { useAction } from '@gwenjs/input'
import { actions } from './actions'

onUpdate(() => {
  const jump = useAction(actions.Jump) // ButtonActionState
  const move = useAction(actions.Move) // Axis2DActionState

  if (jump.isJustTriggered) { /* first frame the jump activates */ }
  if (jump.isPressed)        { /* every frame while held */ }
  if (jump.isJustReleased)   { /* first frame after release */ }
  console.log(jump.holdTime)  // seconds held

  console.log(move.value.x, move.value.y) // processed [-1, 1]
  console.log(move.rawValue)              // before processors
  console.log(move.magnitude)             // Euclidean length
})
```
